# Generated by Django 5.0.4 on 2024-05-09 11:46

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('blog', '0001_initial'),
        ('wagtailimages', '0026_delete_uploadedimage'),
    ]

    operations = [
        migrations.AddField(
            model_name='blogpage',
            name='excerpt',
            field=models.CharField(default='Excerpt', max_length=50),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='blogpage',
            name='thumbnail_image',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to='wagtailimages.image'),
        ),
    ]
