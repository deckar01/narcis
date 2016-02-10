import json

from django.http import HttpResponse
from django.template.loader import get_template
from django.template import Context
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from django.core.files.base import ContentFile
from django.utils.text import slugify
from base64 import b64decode
from .models import *

# Load configured private media server
from private_media.views import get_class
ServerClass = get_class(settings.PRIVATE_MEDIA_SERVER)
server = ServerClass(**getattr(settings, 'PRIVATE_MEDIA_SERVER_OPTIONS', {}))

# Create your views here.
def index(request):
    return HttpResponse("Hello, world. You're at the projects index.")

# Request a screenshot image by id
def screenshot(request, id):
    try:
        screenshot = Screenshot.objects.get(id=id)
        if screenshot.has_read_permission(request.user):
            return server.serve(request, path=screenshot.image.url.lstrip('/'))
        else:
            return HttpResponse('Screenshot not yours', status=403)
    except (ObjectDoesNotExist, ValueError):
        return HttpResponse('Screenshot not found: ({0})'.format(id), status=404)

def diff(request, before_id, after_id):
    before = getScreenshot(request, before_id)
    if type(before) is HttpResponse:
        return before

    after = getScreenshot(request, after_id)
    if type(after) is HttpResponse:
        return after

    template = get_template('diff.html')
    context = Context({
        'before': before,
        'after': after
    })

    html = template.render(context)
    return HttpResponse(html)

# TODO: Add the platform to the url
def diffPage(request, username, project, branch, page, build, new_build):
    try:
        project_user = User.objects.get(username=username)
        if not project_user.is_active:
            raise ObjectDoesNotExist

        project = Project.objects.get(name_slug=project, user_id=project_user.id)
    except (ObjectDoesNotExist, ValueError):
        return HttpResponse('Project not found: ({0})'.format(project), status=404)

    try:
        branch = Branch.objects.get(name_slug=branch, project_id=project.id)
    except (ObjectDoesNotExist, ValueError):
        return HttpResponse('Branch not found: ({0})'.format(branch), status=404)

    try:
        page = Page.objects.get(name_slug=page, project_id=project.id)
    except (ObjectDoesNotExist, ValueError):
        return HttpResponse('Page not found: ({0})'.format(page), status=404)

    try:
        build_before = Build.objects.get(name_slug=build, branch_id=branch.id)
        before = Screenshot.objects.get(page_id=page.id, build_id=build_before)
    except (ObjectDoesNotExist, ValueError):
        return HttpResponse('Build not found: ({0})'.format(build), status=404)

    try:
        build_after = Build.objects.get(name_slug=new_build, branch_id=branch.id)
        after = Screenshot.objects.get(page_id=page.id, build_id=build_after)
    except (ObjectDoesNotExist, ValueError):
        return HttpResponse('Build not found: ({0})'.format(new_build), status=404)

    return diff(request, before.id, after.id)

def getScreenshot(request, id):
    try:
        screenshot = Screenshot.objects.get(id=id)
        if screenshot.has_read_permission(request.user):
            return screenshot
        else:
            return HttpResponse('Screenshot not yours', status=403)
    except (ObjectDoesNotExist, ValueError):
        return HttpResponse('Screenshot not found: ({0})'.format(id), status=404)

# Upload a set of screenshots for a project version
@csrf_exempt
def upload(request, username, project):
    data = json.loads(request.body)
    user = authenticate(username=data['username'], password=data['password'])
    if user is None:
        return HttpResponse('Invalid username or password', status=401)
    if not user.is_active:
        return HttpResponse('Inactive username', status=403)

    try:

        project_user = User.objects.get(username=username)
        if not project_user.is_active:
            raise ObjectDoesNotExist

        project = Project.objects.get(name_slug=project, user_id=project_user.id)

        device = data['platform'].get('device', '')
        platform = getPlatform(device, data['platform']['os'], data['platform']['browser'], project.id)

        branch = getBranch(data['branch'], project.id)
        build = getBuild(data['build'], branch.id)

        for page_name, screenshot_data in data['screenshots'].iteritems():
            saveScreenshot(project.id, build.id, platform.id, page_name, screenshot_data)

        return HttpResponse('{"status": "success"}');

    except (ObjectDoesNotExist, ValueError):
        return HttpResponse('Project not found', status=404)

def saveScreenshot(project_id, build_id, platform_id, page_name, screenshot_data):
    page = getPage(page_name, project_id)

    # TODO: Detect image type
    image_data = b64decode(screenshot_data)
    image = ContentFile(image_data, 'temp.png')
    screenshot = Screenshot(platform_id=platform_id, build_id=build_id, page_id=page.id, name=page.name, image=image)
    screenshot.save()

def getPage(name, project_id):
    try:
        page = Page.objects.get(name_slug=slugify(name), project_id=project_id)
    except (ObjectDoesNotExist, ValueError):
        page = Page(name=name, project_id=project_id)
        page.save()
    return page

def getBranch(name, project_id):
    try:
        branch = Branch.objects.get(name_slug=slugify(name), project_id=project_id)
    except (ObjectDoesNotExist, ValueError):
        branch = Branch(name=name, project_id=project_id)
        branch.save()
    return branch

def getBuild(name, branch_id):
    try:
        build = Build.objects.get(name_slug=slugify(name), branch_id=branch_id)
    except (ObjectDoesNotExist, ValueError):
        build = Build(name=name, branch_id=branch_id)
        build.save()
    return build

def getPlatform(device, os, browser, project_id):
    platform_name = "{0} {1} {2}".format(device, os, browser)

    try:
        platform = Platform.objects.get(name_slug=slugify(platform_name), project_id=project_id)
    except (ObjectDoesNotExist, ValueError):
        platform = Platform(name=platform_name, device=getDevice(device), os=getOperatingSystem(os), browser=getBrowser(browser), project_id=project_id)
        platform.save()
    return platform

def getDevice(name):
    if not name:
        return None

    try:
        device = Device.objects.get(name_slug=slugify(name))
    except (ObjectDoesNotExist, ValueError):
        device = Device(name=name)
        device.save()
    return device

def getOperatingSystem(name):
    try:
        os = OperatingSystem.objects.get(name_slug=slugify(name))
    except (ObjectDoesNotExist, ValueError):
        os = OperatingSystem(name=name)
        os.save()
    return os

def getBrowser(name):
    try:
        browser = Browser.objects.get(name_slug=slugify(name))
    except (ObjectDoesNotExist, ValueError):
        browser = Browser(name=name)
        browser.save()
    return browser