# encoding: utf-8
from django.db.models import get_app, get_apps
from django.core.exceptions import ImproperlyConfigured
from django.http import HttpResponse
import simplejson
from django.core.serializers.json import DateTimeAwareJSONEncoder
from django.utils.functional import Promise
from django.utils.encoding import force_unicode
from django.db import models
from django.db.models.query import QuerySet, ValuesQuerySet
from django.conf import settings
import decimal
import datetime

def get_form_from_app(app, form_name):
    name = app.__name__
    app_path, _name = name.rsplit('.', 1)
    form_module = '.'.join([app_path, 'forms'])
    try:
        module = __import__(form_module, globals(), locals(), [form_name])
    except ImportError:
        return
    
    return getattr(module, form_name, None)
    
def get_form(form_name):    
    if form_name.count('.'):
        app_name, form_name = form_name.split('.')
        try:
            app = get_app(app_name)
        except ImproperlyConfigured:
            return
        return get_form_from_app(app, form_name)
        
    else:
        for app in get_apps():
            form = get_form_from_app(app, form_name)
            if form:
                return form

from django.core import serializers
JsonSerializer = serializers.get_serializer('json')
        
class JsonEncoder(DateTimeAwareJSONEncoder):
    def default(self, o):
        if isinstance(o, Promise):
            return force_unicode(o)
        elif isinstance(o, QuerySet):
            return map(self.default, o)
        elif isinstance(o, datetime.date):
            return o.strftime(settings.DATE_FORMAT)
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
    def __init__(self, d = None, **args):
        if isinstance(d, dict):
            args = d.update(args)
        content = simplejson.dumps(args, cls=JsonEncoder, ensure_ascii=False, indent=4)
        HttpResponse.__init__(self, content, mimetype = "application/json")
        
# Taken from 
# http://en.wikipedia.org/wiki/Function_composition_%28computer_science%29
def compose(*funcs, **kfuncs):
        """Compose a group of functions (f(g(h(..)))) into (fogoh...)(...)"""
        return reduce(lambda f, g: lambda *args, **kaargs: f(g(*args, **kaargs)), funcs)