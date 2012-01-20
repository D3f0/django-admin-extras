# coding: utf-8

from django.db import models
from django.conf import settings
from adminextras.responses import SimpleJsonResponse

def build_autocomplete_query(model_admin, value):
    '''
    Genera la query de búsqueda.
    La búsqueda es por campos que comiencen con value y sin distinción
    de mayúsculas y minúsculas.
    '''
    if not value:
        return models.query.Q()
    d = {} # Unico dict
    model_meta = model_admin.model._meta
    if not model_admin.autocomplete_fields:
        # Buscar el primer campo de texto
        for f in model_meta.fields:
            if isinstance(f, models.CharField):
                d['%s__%s' % (f.name, model_admin.autocomplete_filter_mode)] = value
    else:
        for f_name in model_admin.autocomplete_fields:
            d['%s__%s' % (f_name, model_admin.autocomplete_filter_mode)] = value
    return models.query.Q(**d)

def modeladmin_autocomplete(modeladmin, request, value):
    '''
    @return: Python data to be sent back as Json
    '''
    #import time; time.sleep(2) # Simular el dealy
    
    log = {}
    data = []
    qs = modeladmin.queryset(request)
    query = build_autocomplete_query(modeladmin, value)
    qs = qs.filter(query)
    qs = qs[:modeladmin.autocomplete_hits]
    try:
        cant = qs.count()
    except Exception, e:
        cant = -1 # Error
        if settings.DEBUG:
            log = {'error': unicode(e)}
    else:
        for obj in qs:
            data.append({'value': unicode(obj), 'label': unicode(obj), 'pk': obj.pk})
            for attr_name in modeladmin.autocomplete_extra_values:
                f = getattr(obj, attr_name, '')
                if callable(f):
                    f = f()
                data.append({attr_name: f})
    finally:
        if cant < 1:
            data = [{'value': 'Sin resultados', 'label': 'Sin resultados', 'pk': ''}]
            cant = 0
    return dict(success = True, data = data, cant = cant, log = log)
