from django.conf.urls import patterns, include, url
from django.views.generic.base import RedirectView
from django.conf import settings

from django.contrib import admin
admin.autodiscover()

from . import views
from projects.views import screenshot

urlpatterns = patterns('',
    # Examples:
    # url(r'^blog/', include('blog.urls')),

    url(r'^$', 'narcis.views.home', name='home'),
    url(r'^admin/', include(admin.site.urls)),
    url(r'^favicon\.ico$', RedirectView.as_view(url='/static/favicon.ico')),
    url(r'^projects/', include('projects.urls')),

    # Access controlled screenshot images
    url(r'^{0}(?P<id>[0-9a-f\-]+)'.format(settings.PRIVATE_SCREENSHOT_URL.lstrip('/')), screenshot),
)
