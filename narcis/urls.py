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
    url(r'^screenshot/[0-9]+/[0-9]+/[0-9]+/(?P<id>[0-9a-f\-]+)', screenshot),
    url(r'^screenshot/(?P<id>[0-9a-f\-]+)', screenshot),

    # Authenticated screenshot uploads
    url(r'^(?P<username>[^/]+)/(?P<project>[^/]+)', upload),
]
