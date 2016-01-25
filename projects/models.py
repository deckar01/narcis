from __future__ import unicode_literals
from datetime import datetime
import uuid
import os

from django.db import models
from django.contrib.auth.models import User
from private_media.storages import PrivateMediaStorage

class BaseModel(models.Model):
  name = models.CharField(max_length=200)
  created_date = models.DateTimeField(auto_now_add=True)
  updated_date = models.DateTimeField(auto_now=True, null=True)

  def __str__(self):
    return self.name

  class Meta:
    abstract = True

class VersionModel(BaseModel):
  version = models.CharField(max_length=200, default='0.0.0', null=True, blank=True)

  def __str__(self):
    text = super(VersionModel, self).__str__()

    if(self.version):
      text += ' ' + self.version

    return text

  class Meta:
    abstract = True

class OperatingSystem(VersionModel):
  pass

class Browser(VersionModel):
  pass

class Device(VersionModel):
  screen_width = models.IntegerField()
  screen_height = models.IntegerField()

  def __str__(self):
    text = super(Device, self).__str__()

    if(not self.version):
      text += ' ({0} x {1})'.format(str(self.screen_width), str(self.screen_height))
    
    return text

class TargetPlatform(BaseModel):
  device = models.ForeignKey(Device)
  operating_system = models.ForeignKey(OperatingSystem)
  browser = models.ForeignKey(Browser)

  def __str__(self):
    text = super(TargetPlatform, self).__str__()
    return '{0} {1} {2} {3}'.format(text, self.device, self.operating_system, self.browser)

class Project(VersionModel):
  url = models.CharField(max_length=2083, null=True, blank=True)
  user = models.ForeignKey(User, on_delete=models.CASCADE)
  target_platforms = models.ManyToManyField(TargetPlatform)

  class Meta:
    unique_together = (('name', 'user'),)

class Page(BaseModel):
  path = models.CharField(max_length=2083, null=True, blank=True)
  project = models.ForeignKey(Project, on_delete=models.CASCADE)

  def url(self):
    return self.project.url + self.path

  class Meta:
    unique_together = (('name', 'project'),)

def screenshot_upload_to(self, filename):
  return 'projects/{0}/{1}/{2}/{3}{4}'.format(
    self.page.project.id,
    self.target_platform.id,
    self.page.id,
    self.id,
    self.extension()
  )

class Screenshot(BaseModel):
  id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
  image = models.ImageField(storage=PrivateMediaStorage(), upload_to=screenshot_upload_to)
  page = models.ForeignKey(Page, on_delete=models.CASCADE)
  target_platform = models.ForeignKey(TargetPlatform, on_delete=models.CASCADE)

  def extension(self):
    name, extension = os.path.splitext(self.image.name)
    return extension
