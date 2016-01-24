from __future__ import unicode_literals

from django.db import models
from django.contrib.auth.models import User

# Create your models here.
class Project(models.Model):
  name = models.CharField(max_length=200)
  user = models.ForeignKey(User, on_delete=models.CASCADE)
  creation_date = models.DateTimeField(auto_now_add=True)

# Create your models here.
class Page(models.Model):
  name = models.CharField(max_length=200)
  url = models.CharField(max_length=2083)
  project = models.ForeignKey(Project, on_delete=models.CASCADE)
  creation_date = models.DateTimeField(auto_now_add=True)
