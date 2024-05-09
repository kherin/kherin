from django.db import models

from wagtail.models import Page
from wagtail.fields import RichTextField
from wagtail.admin.panels import FieldPanel


class BlogPage(Page):
    post_date = models.DateField("Post Date")
    heading = models.CharField(max_length=100)
    excerpt = models.CharField(max_length=50)
    body = RichTextField()
    banner_image = models.ForeignKey(
        'wagtailimages.Image',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='+'
    )

    thumbnail_image = models.ForeignKey(
        'wagtailimages.Image',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='+'
    )

    content_panels = Page.content_panels + [
        FieldPanel('post_date'),
        FieldPanel('heading'),
        FieldPanel('excerpt'),
        FieldPanel('thumbnail_image'),
        FieldPanel('body'),
        FieldPanel('banner_image'),
    ]
