#!/usr/bin/env python
#-*- encoding: utf-8 -*-
# Created: 08/04/2010 by defo


from datetime import datetime, timedelta
from piston.handler import BaseHandler, AnonymousBaseHandler
from piston.utils import rc, require_mime, require_extended
from adminextras.extjs import emitters
from piston.handler import HandlerMetaClass
import simplejson
from django.conf import settings
from django.utils.datastructures import MergeDict
from django.utils.encoding import force_unicode



class ExtGridHandlerMetaClass(HandlerMetaClass):
    """
    Metaclass that keeps a registry of class -> handler
    mappings.
    """
    def __new__(cls, name, bases, attrs):
        
        model = attrs.get('model')
        if model:
            pk_name = model._meta.pk.name
            #excludes = attrs.get('excludes', [])
            #if not 'fields' in attrs:
                #print "no tiene fields %s" % name
            #fields = filter( lambda f: f not in excludes, attrs.get('fields', []))
            #print "*" * 40
            #print fields
            #print "*" * 40
            fields = attrs.get('fields')
            if fields and not pk_name in fields:
                fields = fields + (pk_name, )
                attrs['fields'] = fields
            print "%s [%s]" % (name, attrs.get('fields', None))
        new_cls = type.__new__(cls, name, bases, attrs)
#        if hasattr(new_cls, 'model'):
#            typemapper[new_cls] = (new_cls.model, new_cls.is_anonymous)
        
        return new_cls

class ExtGridHandler(BaseHandler):
    '''
    Clase base para conectividad con extjs, define simplemente alugnas cuestiones
    vinculadas con los campos que se pasan al template tag extjs.resource_fields.
    En field_attrs se definen los campos extras que se quieran pasar a los atributos.
    Campos:
        - fields
        - form
        - formset
        - exclude
    '''
    
    __metaclass__ = ExtGridHandlerMetaClass
    exclude = ()
    # Para el formulario
    form = None
    formset = None
    
#    def read(self, request, *args, **kwargs):
#        print "Read"
#        return BaseHandler.read(self, request, *args, **kwargs)
    
    def get_data_from_request(self, request):
        '''
        Piston Decoding is not woriking  :(
        '''
        # JSON?
        try:
            return simplejson.loads(request._get_raw_post_data())
        except ValueError, _e:
            return request.REQUEST
    
    def errordict_to_list(self, errors):
        '''
        Genera la lista de errores manejable por ExtJS ErrorReader
        {'codigo' : 'No conincide' } ->
        [{'name': 'codigo', 'msg': 'No coincide}]
        '''
        errors_list = []
        if not errors:
            return errors_list
        for field, error_list in errors.iteritems():
            errors_list.append({
                               'name': field,
                               'msg': u",".join(map(force_unicode, error_list)) 
                               })
        return errors_list 
    
    def create(self, request, *args, **kwargs):
        # TODO: Unificar los mensajes para ser caputrados en el cliente
        '''
        Crear un form
        '''
        try:
            instance = None
            errors = {}
            #from ipdb import set_trace; set_trace()
            data = self.get_data_from_request(request)
            
            if not self.form:
                return dict(success=False, error = "Form not provided in handler")
            form = self.form(data)
            if form.is_valid():
                instance = form.save()
            else:
                errors = form.errors
            if instance and self.formset:
                import ipdb; ipdb.set_trace()
                formset = self.formset(data, instance = instance)
                
                #http://stackoverflow.com/questions/2452131/django-formset-doesnt-validate
                if not any(formset.errors):
                #if formset.is_valid():
                    try:
                        formset.save()
                    except:
                        pass
                else:
                    for n, errordict in enumerate(formset.errors):
                        for field_name, error_list in errordict.iteritems():
                            field_label = "%s-%d-%s" % (formset.prefix, n, field_name)
                            error_value = error_list 
                            errors[field_label] = error_value
                
            return dict(success = not errors,
                        errors = self.errordict_to_list(errors), 
                        instance_pk = instance and instance.pk
                        )
            
        except Exception, e:
            
            d = {'success': False, 'error': unicode(e)}
            if settings.DEBUG:
                import traceback
                traceback_str = traceback.format_exc()
                d['message'] = unicode(traceback_str)
            return d
            
    
    def update(self, request, *args, **kwargs):
        return {'success': False}
    
    def delete(self, request, *args, **kwargs):
        data = self.get_data_from_request(request)
        if not self.has_model():
            raise NotImplementedError

        try:
            inst = self.model.objects.filter(**data)
            if not inst.count():
                return dict(
                            success = False,
                            message = "El objeto que desea borrar no existe"
                            )
            inst.delete()
            return {"success": True}
            #return rc.DELETED
        #except self.model.MultipleObjectsReturned:
        #    return rc.DUPLICATE_ENTRY
        except self.model.DoesNotExist:
            return {"success": False, "message": "Modelo no existe"}
            #return rc.NOT_HERE
        #return BaseHandler.delete(self, request, *args, **kwargs)
        
        
