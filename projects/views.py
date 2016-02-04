import json

from django.http import HttpResponse
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

        try:
            target_platform = TargetPlatform.objects.get(name_slug=slugify(data['targetPlatform']))
        except (ObjectDoesNotExist, ValueError):
            # TODO: Create new platforms
            return HttpResponse('Target Platform not found: ({0})'.format(data['targetPlatform']), status=404)

        for page_name, screenshot_data in data['screenshots'].iteritems():
            saveScreenshot(project.id, target_platform.id, data['version'], page_name, screenshot_data)

        return HttpResponse('{"status": "success"}');

    except (ObjectDoesNotExist, ValueError):
        return HttpResponse('Project not found', status=404)

def saveScreenshot(project_id, target_platform_id, version, page_name, screenshot_data):
    try:
        page = Page.objects.get(name_slug=slugify(page_name), project_id=project_id)
    except (ObjectDoesNotExist, ValueError):
        page = Page(name=page_name, project_id=project_id)
        page.save()

    # TODO: Detect image type
    image_data = b64decode(screenshot_data)
    image = ContentFile(image_data, 'temp.png')
    screenshot = Screenshot(target_platform_id=target_platform_id, page_id=page.id, version=version, name=page.name, image=image)
    screenshot.save()