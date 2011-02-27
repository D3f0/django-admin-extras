#coding: utf-8
'''
Created on 22/02/2011

@author: defo
'''
from django.http import HttpResponse
from cStringIO import StringIO
import simplejson
from django.utils.encoding import smart_str

class ExcelResponse(HttpResponse):
    def __init__(self, planilla, nombre):
        f = StringIO()
        planilla.save(f)
        f.seek(0)
        super(ExcelResponse, self).__init__(f.getvalue(),  mimetype="application/ms-excel")
        self['Content-Disposition'] = 'attachment; filename=%s' % smart_str(nombre)
        

class JsonResponse(HttpResponse):
    '''
    Serializa de manera automática un QuerySet o un objeto Python
    generando una respuesta con Content-Type application/json
    '''
    def __init__(self, data_or_queryset = None, **kwargs):
        if not data_or_queryset and len(kwargs):
            data_or_queryset = kwargs
        
        HttpResponse.__init__(self, simplejson.dumps(data_or_queryset), 
                              content_type = 'application/json')
