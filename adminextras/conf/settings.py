from django.conf import settings

JQUERY_UI_THEME = getattr(settings, 'JQUERY_UI_THEME', 'cupertino')
STATIC_URL = getattr(settings, 'STATIC_URL')