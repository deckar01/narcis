from django.contrib import admin
from .models import *


class PageAdmin(admin.ModelAdmin):
  list_display = ('__str__', 'project', 'url',)

class ScreenshotAdmin(admin.ModelAdmin):
  list_display = ('image_thumb', 'page', 'platform')

admin.site.register(Project)
admin.site.register(Browser)
admin.site.register(Device)
admin.site.register(OperatingSystem)
admin.site.register(Platform)
admin.site.register(Page, PageAdmin)
admin.site.register(Screenshot, ScreenshotAdmin)
admin.site.register(Branch)
admin.site.register(Build)

