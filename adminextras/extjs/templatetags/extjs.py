#!/usr/bin/env python
#-*- encoding: utf-8 -*-
# Created: 12/04/2010 by defo

from django import template
import sys
import simplejson
from django.db.models.fields import FieldDoesNotExist
from django.utils.encoding import smart_unicode, force_unicode
from django.utils.safestring import mark_safe
from django.conf import settings
from adminextras.extjs.handlers import ExtGridHandler
import inspect

register = template.Library()


def debug_func(f):
    def wrapper(*largs, **kwargs):
        print f.func_name,
        ret = f(*largs, **kwargs)
        print largs, kwargs,
        print "->", ret
        return ret
    return wrapper

def is_sortable(model_class, field_name):
    '''
    Determina si un campo es ordenable
    '''
    if field_name.count('__'):
        # Se supone que las claves foreanas existentes deben ser posibles
        # de usar como campo para el ORDER BY
        return True
    try:
        model_class._meta.get_field(field_name)
        return True
    except FieldDoesNotExist:
        return False

def get_field_header(model_class, field_name):
    '''
    Encabezado
    '''
    if field_name.count('__'):
        name, field = field_name.split('__', 1)
        try:
            m_c = model_class._meta.get_field(name).rel.to
            return get_field_header(m_c, field)
        except AttributeError:
            raise Exception("%s no es un FK" % field_name)
    else:
        
        try:
            name = model_class._meta.get_field(field_name).verbose_name
            return unicode(name).title()
        except FieldDoesNotExist:
            field = getattr(model_class, field_name, None)
            if field and inspect.ismethod(field):
                header = getattr(field, 'header', None)
                if header:
                    return header
            return field_name.replace('_', ' ').title()

def flatten_fields(f, current_model = None):
    '''
    Aplana la definción de fields de Piston a relaciones tipo Django.
    ('x', ) -> ['x']
    ( ('x', ('x', 'y')), 'z') -> ['x__x', 'x__y', 'z']
    '''
    if isinstance(f, basestring):
        if current_model:
            return '%s__%s' % (current_model, f) 
        else:
            return [ f ]
    elif isinstance(f, (list, tuple)):
        assert len(f) == 2, "Error de definicion del campo %s" % f[0]
        return map(lambda s: flatten_fields(s, f[0]), f[1])
    else:
        raise Exception("Tipo no soprtado: %s" % f)

def get_fields(handler):
    fields = []
    if hasattr(handler, 'fields') and handler.fields:
        defined_fields = list(handler.fields)
        
        for f in defined_fields:
            flattened = flatten_fields(f)
            fields.extend(flattened)
        return fields
    else:
        fields = handler.model._meta.fields
        return map(lambda f: f.name, fields)

'''
 Ordenamiento
 - string
 - list
 - boolean
 - numeric
 - date
'''
from django.db.models import fields
FIELD_SORTING = {
    fields.CharField: 'string',
    fields.TextField: 'string',
    fields.IntegerField: 'numeric',
    fields.AutoField: 'numeric',
    fields.DecimalField: 'numeric',
    fields.FloatField: 'numeric',
    fields.BooleanField: 'boolean',
    fields.DateField: 'date',
}

#@debug_func
def get_filter_config(model_class, field_name):
    filter = None
    try:
        field = model_class._meta.get_field(field_name)
        
        field_type = type(field)
        for class_type, class_filter in FIELD_SORTING.iteritems():
            if issubclass(field_type, class_type):
                filter = class_filter
                break
        
        if filter:
            return {'type': filter} 
    except:
        return None


HANDLER_MODULES = getattr(settings, 'HANDLER_MODULES', [])
if isinstance(HANDLER_MODULES, basestring):
    HANDLER_MODULES = (HANDLER_MODULES, )

def get_handler(handler_name):
    
    def import_class(path, enforce_base = None):
        '''
        
        @param path: Ej: dfuelerp.xxx.handler.YYYYHandler
        @param enforce_base: MyBaseClass
        '''
        # Full import path
        import_path, class_name = path.rsplit('.', 1)
        # Emulamos el from
        #from pprint import pprint
        #pprint(locals())
        module = __import__(import_path, fromlist = [str(class_name)])
        handler = getattr(module, class_name)
        if enforce_base:
            assert issubclass(handler, enforce_base)
            return handler
    
    if handler_name.count('.') == 0:
        for mod_pth in HANDLER_MODULES:
            full_path = '.'.join([mod_pth, handler_name])
            #from ipdb import set_trace; set_trace()
            handler = import_class(full_path, enforce_base = ExtGridHandler)
            if handler:
                return handler
        raise Exception("Could not find %s in settings.HANDLER_MODULES" % handler_name)
    else:
        return import_class(handler_name, enforce_base = ExtGridHandler)

@register.simple_tag
def resource_fields(handler_name):
    '''
    Genera la configuración de campos de la calse Ext.ux.ModelList en función
    de el handler.
    '''
    handler = get_handler(handler_name)
    fields = get_fields(handler)
    model = handler.model
    pk_fieldname = model._meta.pk.name
    #print "%s %s " % (model, pk_fieldname)
    #pk_hidden = not pk_fieldname in handler.fields
    try:
        pk_hidden = handler.fields.index(pk_fieldname) == (len(handler.fields) -1)
    except:
        pk_hidden = True
    
    l = []
    # Se necesita la clave para las eliminaciones
    if pk_fieldname not in fields:
        fields.insert(0, pk_fieldname)
        
    for name in fields:
        field_config = {
            'name': name,
            'header': get_field_header(model, name),
            'sortable': is_sortable(model, name),
        }
        
        filter_args = get_filter_config(model, name)
        if filter_args:
            field_config['filter'] = filter_args
        if name == pk_fieldname and pk_hidden:
            field_config['hidden'] = True
            #field_config['isPk'] = True
        if name.count('__'):
            mapping = name.replace('__', '.')
            field_config['mapping'] = mapping
            
        # Configuración extra
#        if name in handler.fields_attrs:
#            extra_config = handler.fields_attrs[name]
#            if not isinstance(extra_config, dict):
#                raise Exception("Error en la field_attrs de %s" % handler)
#            field_config.update(extra_config)
            #from pprint import pprint; pprint (field_config)
            
            
            
        l.append(field_config)
        
    return smart_unicode(simplejson.dumps(l, encoding='utf-8').replace(', ', ',\n'))


def inner_json(data):
    '''
    Quitar las llavaes de Json
    '''
    return simplejson.dumps(data)[1:-1].replace(', ', ',\n\t')

def fq_class_name(cls):
    '''
    Full qualified object name
    ''' 
    return '.'.join([cls.__module__, cls.__name__])

def form_name(form):
    pass

@register.simple_tag
def form_config(handler_name):
    '''
    Establece el nombre del form.
    '''
    handler = get_handler(handler_name)
    config = {}
    form = handler.form
    model = handler.model
    formset = handler.formset
    
    # Pasar el nombre del campo que lleva el ID para las bajas y ediciones
    config['storeIdProperty'] = model._meta.pk.name 
    if form:
        config['formClass'] = form.__name__ 
    else:
        config['formClass'] = None 
    
    if formset:
        config['formsetClass'] = formset.__name__
    else:
        config['formsetClass'] = None
        
    # Esto es necesario para que los forms puedan actualizar
    config['storeId'] = handler.model._meta.module_name
    
    config['verboseName'] = handler.model._meta.verbose_name
    try:
        config['verboseNamePlural'] = smart_unicode(unicode(handler.model._meta.verbose_name_plural))
    except:
        #print "PRoblemas con ", handler
        config['verboseNamePlural'] = ''
    
    return inner_json(config)

#===============================================================================
# Ext 4 support code
#===============================================================================

def split_lines(func):
    '''
    Improves  readability of generated template code
    '''
    def wrapped(*largs, **kwargs):
        retval = func(*largs, **kwargs)
        return mark_safe(retval.replace(', ', ',\n'))
    return wrapped

from django.db import models
DJANGO_ORM_EXTJS_TYPES = {
    models.AutoField: 'int',
    models.CharField: 'string',
    models.TextField: 'string',
    models.IntegerField: 'int',
    models.FloatField: 'float',
    models.ForeignKey: 'string',
}


def get_extjs_type(field):
    try:
        return DJANGO_ORM_EXTJS_TYPES[type(field)]
    except KeyError:
        raise Exception("%s is not supported. Add it to %s" % (field, __file__))

def get_handler_fields(handler_name):
    handler = get_handler(handler_name)
    model = handler.model
    
    fields = []
    for f in model._meta.fields:
        fields.append({
                       'name': f.name,
                       'type': get_extjs_type(f)
                       })
    return fields
@register.simple_tag
def handler_fields(handler_name):
    ''' Handler fields for Ext.regModel '''
    return simplejson.dumps(get_handler_fields(handler_name))


def get_handler_headers(handler_name):
    handler = get_handler(handler_name)
    model = handler.model
    fields = []
    for f in model._meta.fields:
        name = f.name
        fields.append({
                       'dataIndex': name,
                       'text': get_field_header(model, name)
                       })
    return fields

@register.simple_tag
def handler_headers(handler_name):
    return simplejson.dumps(get_handler_headers(handler_name)) 


@register.simple_tag
def handler_gird_config(handler_name, model_name):
    
    handler = get_handler(handler_name)
    model = handler.model
    cfg = {
           'headers': get_handler_headers(handler_name),
           'store': {
                     'model': model_name,
                     'proxy': {
                               'type': 'ajax',
                               'url': '/api/%s/' % model._meta.module_name,
                               'reader': {
                                          'type': 'json',
                                          'root': 'data',
                                          }
                      },
                      'autoload': True
            },
            
    }
    return mark_safe(simplejson.dumps(cfg).replace(', ', ',\n\t'))
    