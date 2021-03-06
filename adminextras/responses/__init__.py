#coding: utf-8
'''
Created on 22/02/2011

@author: defo
'''
from django.http import HttpResponse
from cStringIO import StringIO
try:
    from simplejson import dumps as json_dumps
except ImportError:
    from json import dumps as json_dumps
from django.utils.encoding import smart_str, force_unicode
import decimal
from django.core.serializers.json import DateTimeAwareJSONEncoder
from django.utils.functional import Promise
from django.db.models.query import QuerySet, ValuesQuerySet
import datetime
from django.db import models
from django.core import serializers
from decorator import decorator
from django.conf import settings
from traceback import format_exc

JsonSerializer = serializers.get_serializer('json')

class ExcelResponse(HttpResponse):
    def __init__(self, planilla, nombre):
        f = StringIO()
        planilla.save(f)
        f.seek(0)
        super(ExcelResponse, self).__init__(f.getvalue(),  mimetype="application/ms-excel")
        self['Content-Disposition'] = 'attachment; filename=%s' % smart_str(nombre)
        

#class JsonResponse(HttpResponse):
#    '''
#    Serializa de manera automática un QuerySet o un objeto Python
#    generando una respuesta con Content-Type application/json
#    '''
#    def __init__(self, data_or_queryset = None, **kwargs):
#        if not data_or_queryset and len(kwargs):
#            data_or_queryset = kwargs
#        
#        HttpResponse.__init__(self, json_dumps(data_or_queryset), 
#                              content_type = 'application/json')

        
class JsonEncoder(DateTimeAwareJSONEncoder):
    ''' Tryies to make JSON dump from anything '''
    
    __date_format = None
    @property
    def date_fromat(self):
        if not self.__date_format:
            from django.conf import settings
            self.__date_format = getattr(settings, 'DATE_FORMAT', '%d/%m/%Y')
        return self.__date_format
    
    def default(self, o):
        
        if isinstance(o, Promise):
            return force_unicode(o)
        elif isinstance(o, ValuesQuerySet):
            return list(o)
        
        elif isinstance(o, QuerySet):
            return map(self.default, o)
        
        elif isinstance(o, datetime.date):
            return o.strftime(self.date_fromat)
        elif isinstance(o, models.Model):
            field_names = map(lambda f: f.name, o._meta.fields)
            # Búsqueda de campos extra
            extra_json_fields = getattr(o, 'extra_json_fields', None)
            if extra_json_fields:
                field_names.extend(extra_json_fields)
            
            data = dict(map(lambda name: (name, getattr(o, name)), field_names))
            data['__unicode__'] = unicode(o)
            
            return data
        elif isinstance(o, decimal.Decimal):
            return str(o)
#        elif isinstance(o, datetime.datetime):
#            d = datetime_safe.new_datetime(o)
#            return d.strftime("%s %s" % (self.DATE_FORMAT, self.TIME_FORMAT))
        return DateTimeAwareJSONEncoder.default(self, o)



class SimpleJsonResponse(HttpResponse):
    '''
    Serializa un modelo o un queryset. Si tiene definido como atributo el 
    campo extra_json_fields se serializan esos atirbutos si son encontrados.
    '''
    def __init__(self, data = None, status = 200):
        if not data:
            data = {}

        content = json_dumps(data, cls=JsonEncoder, ensure_ascii=False, indent=4)
        HttpResponse.__init__(self, content, mimetype = "application/json", status = status)
        


@decorator
def json_response(f, *args, **kwargs):
    try:
        status_code = 200
        response = {
            'status': True,
            'data': f(*args, **kwargs)
        }
    except Exception, e:
        status_code = 400
        response = {
            'status': False,
            'message': '%s: %s' % (e.__class__.__name__, str(e))
        }
        
        if settings.DEBUG:
            response.update(traceback = format_exc())

#    if 'callback' in args[0].GET:
#        body = '%s(%s)' % (args[0].GET['callback'], body)

    return SimpleJsonResponse(response, status=status_code)