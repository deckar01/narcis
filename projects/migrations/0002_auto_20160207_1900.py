# -*- coding: utf-8 -*-
# Generated by Django 1.9.1 on 2016-02-07 19:00
from __future__ import unicode_literals

import autoslug.fields
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Branch',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('name_slug', autoslug.fields.AutoSlugField(editable=False, populate_from='name')),
                ('created_date', models.DateTimeField(auto_now_add=True)),
                ('updated_date', models.DateTimeField(auto_now=True, null=True)),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='projects.Project')),
            ],
        ),
        migrations.CreateModel(
            name='Build',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('name_slug', autoslug.fields.AutoSlugField(editable=False, populate_from='name')),
                ('created_date', models.DateTimeField(auto_now_add=True)),
                ('updated_date', models.DateTimeField(auto_now=True, null=True)),
                ('branch', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='projects.Branch')),
            ],
        ),
        migrations.AddField(
            model_name='screenshot',
            name='build',
            field=models.ForeignKey(default=0, on_delete=django.db.models.deletion.CASCADE, to='projects.Build'),
            preserve_default=False,
        ),
        migrations.AlterUniqueTogether(
            name='build',
            unique_together=set([('name_slug', 'branch')]),
        ),
        migrations.AlterUniqueTogether(
            name='branch',
            unique_together=set([('name_slug', 'project')]),
        ),
    ]
