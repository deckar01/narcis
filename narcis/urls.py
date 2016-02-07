from django.conf.urls import include, url
from django.views.generic.base import RedirectView
from django.conf import settings

from django.contrib import admin
admin.autodiscover()

from . import views
from projects.views import screenshot, upload

urlpatterns = [

    url(r'^$', views.home),
    url(r'^admin/', include(admin.site.urls)),
    url(r'^favicon\.ico$', RedirectView.as_view(url='/static/favicon.ico')),
    url(r'^projects/', include('projects.urls')),

    # Access controlled screenshot images
    url(r'^{0}[0-9]+/[0-9]+/[0-9]+/(?P<id>[0-9a-f\-]+)'.format(settings.PRIVATE_SCREENSHOT_URL.lstrip('/')), screenshot),
    url(r'^{0}(?P<id>[0-9a-f\-]+)'.format(settings.PRIVATE_SCREENSHOT_URL.lstrip('/')), screenshot),

    # Authenticated screenshot uploads
    url(r'^(?P<username>[^/]+)/(?P<project>[^/]+)', upload),
]
