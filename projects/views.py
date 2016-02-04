from django.http import HttpResponse
from django.conf import settings
from .models import Screenshot

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
