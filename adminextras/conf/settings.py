from django.conf import settings


USE_SPARSE_UI = getattr(settings, 'USE_SPARSE_UI', False)
STATIC_URL = getattr(settings, 'STATIC_URL')