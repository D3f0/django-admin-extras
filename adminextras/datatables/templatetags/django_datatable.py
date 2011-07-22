# encoding: 
from django import template
from django.template.loader import render_to_string

register = template.Library()
from django.conf import settings

@register.simple_tag
def datatable_includes():
    data = {
            "STATIC_URL": settings.STATIC_URL}
    return render_to_string('datatables/templatetags/includes.html', 
                            data)
