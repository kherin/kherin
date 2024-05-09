from django.db import models

from wagtail.models import Page
from wagtail.fields import RichTextField
from wagtail.admin.panels import FieldPanel


class HomePage(Page):
    max_count = 1
    welcome_message = RichTextField(null=False, blank=False)
    profile_image = models.ForeignKey(
        'wagtailimages.Image',
        null=True,
        blank=False,
        on_delete=models.SET_NULL,
        related_name="+"
    )

    intro = RichTextField(null=False, blank=False)

    resume_link = models.URLField(blank=False)

    content_panels = Page.content_panels + [
        FieldPanel('profile_image'),
        FieldPanel('welcome_message'),
        FieldPanel('intro'),
        FieldPanel('resume_link')
    ]
