#!/usr/bin/env python
#-*- encoding: utf-8 -*-
# Created: 27/04/2010 by defo
from django.http import HttpResponseForbidden, HttpResponse,\
    HttpResponseBadRequest
from django import forms
from django.core.exceptions import ImproperlyConfigured
from django.db.models.loading import get_apps, get_app
from django.db.models import fields
from django.shortcuts import render_to_response
from django.template.context import RequestContext
from django.conf import settings
from django.forms.widgets import HiddenInput
from django.forms.models import InlineForeignKeyHiddenInput
import simplejson
from pprint import pprint, pformat
from dfuelerp.apps.api.emitters import SimpleJsonResponse
from django.db.models.loading import get_model

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


DUMP_REGISTRY = {}
class field_dump(object):
    def __init__(self, _class_or_name):
        pass
    def __class__(self, f):
        def wrapped(*largs, **kwargs):
            pass

class FieldToJsDumper(object):
    '''
    Genera la configuración para el constructor del field equivalente en Json
    '''
    def dump(self, field, is_formset = None, **args):
        
        if isinstance(field.widget, HiddenInput):
            d = {'xtype': 'hidden'}
            return d
        else:
            d = {
                 'allowBlank': not field.required,
                 'fieldLabel': field.label or args.get('name')
                 }
        d.update(args)
        
        classname = field.__class__.__name__
        method = getattr(self, 'dump_%s' % classname, None)
        # Si el método no está lo buscamos en la clase base...
        if not method:
            classname = field.__class__.__base__.__name__
            method = getattr(self, 'dump_%s' % classname, None)
            
        if method:
            d.update(method(field, is_formset))
        else:
            raise NotImplementedError("No puedo dumpear %s" % field)
        if hasattr(field, 'extjs_widget_cfg'):
            # Copiar la configuración de Ext
            d.update(field['extjs_widget_cfg'])
        return d
    
    def dump_CharField(self, f, is_formset):
        d = {'xtype': 'textfield'}
        if f.min_length: d['minLength'] = f.min_length
        if f.max_length: d['maxLength'] = f.max_length
        return d
    
    def dump_TextField(self, f, is_formset):
        d = self.dump_CharField(f)
        d['xtype'] = 'textarea'
        return d

    def dump_DateField(self, f, is_formset):
        d = {'xtype': 'datefield'}
    
        return d

    def dump_DecimalField(self, f, is_formset):
        d = {'xtype': 'numberfield'}
        
        return d
    
    def dump_IntegerField(self, f, is_formset):
        d = {'xtype': 'numberfield',
             'allowDecimals': 'false',
             }
        
        return d
    
    def dump_EmailField(self, f, is_formset):
        d = {'xtype': 'textfield',
             'vtype': 'email',
             }
        return d
    
    def dump_ModelChoiceField(self, f, is_formset):
        model_meta = f.queryset.model._meta
        d = {'xtype': 'combo', 
             'model': "%s__%s" % (model_meta.app_label, model_meta.object_name)} 
        
        try:
            # Needed?
            d['storeId'] = f.queryset.model._meta.module_name
        except:
            pass
        return d
    
    def dump_InlineForeignKeyField(self, f, is_formset):
        ''' Campo ID de un Formset '''
        
        d = {'xtype': "textfield", "hidden": True, }
        return d
                
    
    def dump_FloatField(self, f, is_formset):
        d = {'xtype': 'numberfield'}
        
        return d
    
    def dump_BooleanField(self, f, is_formset):
        d = {'xtype': 'checkbox', 
             'margin': 4}
        
        return d

field_dumper = FieldToJsDumper()

def get_field_defs(form, is_formset = True):
    '''
    Genera la definición del JSON para el diccionario
    @param form: Formulario
    @param is_formset: Indica si es un formset
    '''
    
    fields = []
    
    initial = getattr(form, 'initial') or {}
    prefix = getattr(form, 'prefix') or u''
    
    for name, field in form.fields.iteritems():
        # Si tiene prefijo
        d = {}
        if initial.has_key(name): d['value'] = initial.get(name)
        if field.initial is not None: d['value'] = field.initial
        if field.help_text: d['toolTip'] = field.help_text
        
        name = prefix and "%s-%s" % (prefix, name) or name
        d.update(field_dumper.dump(field, is_formset), name = name)
        
        fields.append(d)
    
    return fields

def get_fromset_labels(formset):
    '''
    '''
    labels = []
    form = formset.forms[0]
    for name, field in form.fields.items():
        if field.widget.is_hidden:
            continue
        labels.append(field.label)
        pprint("-"* 10)
    return labels

def get_form_defs(request):
    '''
    Retorna la definición de un formulario
    '''
    success = True
    error = ''
    
    form_name = request.REQUEST.get('form')
    formset_name = request.REQUEST.get('formset')
    
    fields = []
    formset_forms = []
    formset_management = []
    formset_form_labels = []
    formset_field_length = 0
    try:
        
        form = get_form(form_name)() # Crear una instancia del form
        fields += get_field_defs(form)
        
        if formset_name:
            formset_class = get_form(formset_name)
            formset = formset_class() # Instanciar
            formset_management = get_field_defs(formset.management_form)
            formset_form_labels = get_fromset_labels(formset)
            for n, form in enumerate(formset.forms):
                formset_forms.append(get_field_defs(form, is_formset = True))
                # Caluclamos una vez cuantos campos tiene el formulario
                if not n:
                    formset_field_length = len(formset_forms)
         
    except Exception, _e:
        
        if settings.DEBUG:
            import traceback
            error = traceback.format_exc()
            print error
        else:
            error = "Error retrieving form"
            #error = unicode(e)
        success = False
    
    return SimpleJsonResponse(
                              success = success,
                              error = error, 
                              fields = fields,
                              formset = {
                                         'forms': formset_forms,
                                         'management': formset_management,
                                         'labels': formset_form_labels,
                                         'length': formset_field_length
                              }
                              )


def get_form_field_queryset(form_name, field_name):
    form_class = get_form(form_name)
    form_instance = form_class()
    field = form_instance.fields.get(field_name)
    #model_meta = form_instance._meta.model._meta
    #data = []
    return field.queryset


def dump_queryset(request, resource):
    '''
    Una vista para generar los querysets de los stores
    '''
    data = []
    try:
        # Primero tratamos de buscar un campo de formulario
        form_or_model_name, field_name = resource.split('__')
        qs = get_form_field_queryset(form_or_model_name, field_name)
        #model_meta = qs.model._meta
        
        # Si no buscamos un modelo
    except Exception, e:
        print e
        app_label, model_name = form_or_model_name, field_name
        model = get_model(app_label, model_name)
        qs = model.objects.all()
        #model_meta = model._meta
        
    for obj in qs:
        data.append({'pk': obj.pk, 'str': unicode(obj)})
            
    return SimpleJsonResponse(total= len(data),
                              data = data,
                              success = True
                              )
    
    
def generic_create_update(request, form_name, pk = None):
    '''
    El nomrbe del formulario puede contener el nombre de la aplicación separado
    por un punto. En tal caso se busca en el modulo form de esa aplicación, en
    caso contrario se busca en el de todo los módulos forms de todas las 
    aplicaciones.
    
    Retorna el formulario como p: form.as_p()
    '''
    # Recuperar el formulario
    
    form_class = get_form(form_name)
    if not form_class:
        return HttpResponseForbidden("No existe el fomulario")
    
    instance, saved_inst = None, None
    if pk:
        model = form_class._meta.model
        instance = model.objects.get(pk = pk)
    if request.method == "GET":
        form = form_class(instance = instance)
    elif request.method == "POST":
        form = form_class(request.POST, instance = instance)
        #from ipdb import set_trace; set_trace()
        if form.is_valid():
            saved_inst = form.save()
            return SimpleJsonResponse(status = 'ok')
            
    data = {'form': form, 
            'instance': instance or saved_inst, 
            'pk': pk}
    return render_to_response("ext-async-form.html", data, 
                              context_instance=RequestContext(request))
