from django.contrib import admin
from .models import *


class PageAdmin(admin.ModelAdmin):
  list_display = ('__str__', 'project', 'url',)

admin.site.register(Project)
admin.site.register(Browser)
admin.site.register(Device)
admin.site.register(OperatingSystem)
admin.site.register(TargetPlatform)
admin.site.register(Page, PageAdmin)

