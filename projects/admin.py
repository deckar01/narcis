from django.contrib import admin
from .models import *


class ProjectAdmin(admin.ModelAdmin):
  filter_horizontal = ('target_platforms',)

class PageAdmin(admin.ModelAdmin):
  list_display = ('__str__', 'project', 'url',)

admin.site.register(Project, ProjectAdmin)
admin.site.register(Browser)
admin.site.register(Device)
admin.site.register(OperatingSystem)
admin.site.register(TargetPlatform)
admin.site.register(Page, PageAdmin)

