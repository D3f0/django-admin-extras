#!/usr/bin/env python
#-*- encoding: utf-8 -*-
# Created: 03/07/2010 by defo
'''
En este módulo configuramos la Administración de django,
los elementos mas importantes son el tratado de fechas,
los foreignkeys con autocompletado.
Se define un tipo de sitio de administración CustomAdminSite y un CustomModelAdmin
'''

from django.contrib.admin import ModelAdmin
from django.contrib.admin.sites import AdminSite

from django.conf.urls.defaults import patterns
from django.contrib.admin.options import BaseModelAdmin, TabularInline
from django import forms
from django.conf import settings

from django.core.exceptions import ImproperlyConfigured
from django.contrib.admin import widgets as admin_widgets
from excel import to_excel_admin_action
from utils import SimpleJsonResponse
import simplejson
from django.db.models.query_utils import Q
from django.db.models.fields import CharField
from django.utils.safestring import mark_safe
#from dfuelerp.apps.core.fields import MontoField, ComprobanteLegalField
import string
from django.utils.encoding import smart_unicode, force_unicode
from django.template import Template
from django.template.context import Context
from django.http import HttpResponse

FORMATO_FECHA = settings.DATE_INPUT_FORMATS[0]
from django.core import urlresolvers

from widgets import *


def override_foreignkeys(model_admin, db_field, request=None, **kwargs):
    '''
    Genera los widgets personalizados agregando información extra. Es 
    llamado desde formfield_for_foreignkey desde el modelofrom como de los 
    inlines que se hallan definido.
    '''
    admin_site = model_admin.admin_site
    target_model = db_field.rel.to
    name = db_field.name
    rel_modeladmin = admin_site._registry.get(target_model)
    
    f_orig = BaseModelAdmin.formfield_for_foreignkey(model_admin, db_field, request, **kwargs)
    
    if hasattr(rel_modeladmin, 'autocomplete_fields'):
        if len(rel_modeladmin.autocomplete_fields) == 0:
            return f_orig
         
    else:
        print "No tiene «%s» campo autocomplete_fields" % name
        return f_orig
    
    if name.endswith('_ptr'):
        print "«%s» es un puntero de clase" % name
        return f_orig
    if name == 'id':
        print "«%s» es id" % name
        return f_orig
    
    if name == model_admin.model._meta.pk.name:
        print "«%s» es clave" % name
        return f_orig
    
    
    #print "*"* 35
    #print "Nombre de campo, id en el modelo", name, model_admin.model._meta.pk.name
    #print "*"* 35
    #print related_db_field
    #urlresolvers.reverse(viewname, urlconf, args, kwargs, prefix, current_app)
    autocomp_url = '/'.join([admin_site.name, 
                             target_model._meta.app_label,
                             target_model._meta.module_name, 
                             'autocomplete'])
    autocomp_url = '/%s/' % autocomp_url 
    try:
        qs = rel_modeladmin.queryset(request)
    except:
        qs = target_model.objects.all()
        
    widget = AdminAutoCompleteFKInputWidget( queryset = qs, url=autocomp_url, )
    f = forms.ModelChoiceField(qs, cache_choices = False, 
                               widget = widget, label = f_orig.label, 
                               **kwargs)
    #f.label = f_orig.label # Copiar la etiqueta
    
    f.widget.choices = ()
    return f

        

from django.db import models

class CustomModelAdmin(ModelAdmin):
    '''
    Un ModelAdmin personzlizado que trabaja en conjunto con un AdminSite personalizado.
    Este model admin prvee las facilidades para la exportación a Excel y
    algunos widgets para la internacionalización.
    Además prvee un sistema de autocompletado para los foreignkeys que requieran
    trabajen con un queryset muy extenso que podría elevar excesivamente el consumo
    de memoria de la aplicación.
    '''
    
    instances = {}
    #field_type_attrs.setdefault(k)
    field_type_attrs = dict(
                        TextField = {'autocomplete': 'off'},
                        DateField =  {'autocomplete': 'off'},
                        AutoField =  {'autocomplete': 'off'},
    )

    def formfield_for_dbfield(self, db_field, **kwargs):
        field = BaseModelAdmin.formfield_for_dbfield(self, db_field, **kwargs)
        #import ipdb; ipdb.set_trace()
        custom_widget = self.admin_site.widget_mapping.get(type(db_field), None)
        if custom_widget:
            field.widget = custom_widget()
        # Actualizar los valores
        attrs = CustomModelAdmin.field_type_attrs.get(type(field), {})
        if hasattr(field, 'widget'):
            if hasattr(field.widget, 'attrs'):
                field.widget.attrs.update(**attrs)
            else:
                field.widget.attrs = attrs
        return field
    
    @classmethod
    def register_attr_for_field(cls, field_type, **opts):
        '''
        Registrar atributos extras para ciertos widgets
        '''
        assert issubclass(field_type, models.Model)
        if not cls.field_type_attrs.has_key(field_type):
            cls.field_type_attrs[field_type] = opts
        else:
            cls.field_type_attrs[field_type].update(opts)

    
    formfield_overrides = {
        # Fecha localizada 
        models.DateField: {'widget': admin_widgets.AdminDateWidget(format = FORMATO_FECHA)},
        #models.CharField: {'widget': admin_widgets.AdminTextareaWidget }
    }
    
    #===============================================================================
    # Autocompletado 
    #===============================================================================
    autocomplete_fields = []
    autocomplete_extra_values = [] # + Pk, __unicode__
    autocomplete_hits = 20
    # Ejemplo: 'icontains', 'istartswith', 'iendswith'
    autocomplete_filter_mode = 'istartswith'
    
    
    def formfield_for_foreignkey(self, db_field, request=None, **kwargs):
        '''
        Para las calves foraneas, checkear si el queryset es muy grande
        '''
        return override_foreignkeys(self, db_field, request, **kwargs)

    
    #===========================================================================
    # Exportación a Excel
    #===========================================================================
    excel_fields = ()
    excel_exclude = ()
    actions = ModelAdmin.actions + [to_excel_admin_action, ]
    
    def get_urls(self):
        '''
        Cargar las urls
        '''
        urls = super(CustomModelAdmin, self).get_urls()
        my_urls = patterns('',
            (r'^excel/$', self.admin_site.admin_view(self.exportar_excel)),
            (r'^autocomplete/$', self.admin_site.admin_view(self.autocomplete)),
            (r'^autocomplete/(?P<value>.{0,60})/$', self.admin_site.admin_view(self.autocomplete)),
            (r'^json_dump/?$', self.admin_site.admin_view(self.query_dump)),
            (r'^json_dump/(?P<pk>[\d\w\.\s]+)?$', self.admin_site.admin_view(self.json_dump)),
            (r'^quickview/(?P<pk>[\d\w\.\s]+)?$', self.admin_site.admin_view(self.quickview)),
        )
        return my_urls + urls
    
    
    def exportar_excel(self, request):
        '''
        Vista de la administración que genera una planilla excel.
        '''
        queryset = self.queryset(request)
        return to_excel_admin_action(self, request, queryset)
    
    
    def _build_autocomplete_query(self, value):
        '''
        Genera la query de búsqueda.
        La búsqueda es por campos que comiencen con value y sin distinción
        de mayúsculas y minúsculas.
        '''
        if not value:
            return Q()
        d = {} # Unico dict
        model_meta = self.model._meta
        if not self.autocomplete_fields:
            # Buscar el primer campo de texto
            for f in model_meta.fields:
                if isinstance(f, CharField):
                    d['%s__%s' % (f.name, self.autocomplete_filter_mode)] = value
        else:
            for f_name in self.autocomplete_fields:
                d['%s__%s' % (f_name, self.autocomplete_filter_mode)] = value
        return Q(**d)
                
    def autocomplete(self, request, value = None):
        '''
        Vista que devuelve la autocompleción
        '''
        data = []
        qs = self.queryset(request)
        query = self._build_autocomplete_query(value)
        #print "La query es ", query
        qs = qs.filter(query)
        qs = qs[:self.autocomplete_hits]
        cant = qs.count()
        for obj in qs:
            data.append({'value': unicode(obj), 'label': unicode(obj), 'pk': obj.pk})
            for attr_name in self.autocomplete_extra_values:
                f = getattr(obj, attr_name, '')
                if callable(f):
                    f = f()
                data.append({attr_name: f})
        return SimpleJsonResponse(success = True, data = data, cant = cant)
    
    def json_dump(self, request, pk = None ):
        if pk:
            obj = self.queryset(request).get(pk = pk)
        else:
            obj = self.queryset(request)[:10]
        return SimpleJsonResponse(success = True, data = obj)
    
    def query_dump(self, request):
        '''
        Dump en JSON de una consulta
        '''
        try:
            start = request.REQUEST.get('start', 0)
            start = int(start)
        except ValueError:
            start = 0
        try:
            top = request.REQUEST.get('top', 100)
        except ValueError:
            top = 0
        query = request.REQUEST.get('query', '{}')
        #print query
        try:
            consulta = simplejson.loads(query)
            #print consulta
            qs = self.queryset(request).filter(**consulta)[start:top]
            #print qs
            return SimpleJsonResponse(success = True, data = qs, count = qs.count())
        except Exception, e:
            return SimpleJsonResponse(success = False, error = unicode(e))
    
    def quickview(self, request, pk):
        '''
        Generar la vista rápida de un objeto
        '''
        self.queryset(request).get(pk = pk)
        return HttpResponse('hola')
    

#===============================================================================
# Inlines
#===============================================================================
class CustomTabularInline(TabularInline):

    def formfield_for_dbfield(self, db_field, **kwargs):
        return BaseModelAdmin.formfield_for_dbfield(self, db_field, **kwargs)

    
    # Usar los mismos overrides
    formfield_overrides = CustomModelAdmin.formfield_overrides
    
    def formfield_for_foreignkey(self, db_field, request=None, **kwargs):
        '''
        Para las calves foraneas, checkear si el queryset es muy grande
        '''
        return override_foreignkeys(self, db_field, request, **kwargs)
    

class CustomAdminSite(AdminSite):
    '''
    Sitio de administración. Utiliza por defecto la clase CustomAdminSite
    '''
    instances = {}
    widget_mapping = {}
    
    def __init__(self, name, *largs, **kwargs):
        super(CustomAdminSite, self).__init__(name, *largs, **kwargs)
        CustomAdminSite.instances[name] = self
        #print self.instances
    
    
    def register_custom_widget(self, db_field_type, widget):
        '''
        Sitewide widget override
        '''
        assert issubclass(db_field_type, models.Field)
        assert issubclass(widget, forms.Widget)
        self.widget_mapping[db_field_type] = widget
      
    def register(self, model_or_iterable, admin_class=None, **options):
        if not admin_class:
            admin_class = CustomModelAdmin
        elif issubclass(admin_class, CustomModelAdmin) and admin_class.inlines:
            # OK
            for inline in admin_class.inlines:
                if not issubclass(inline, (CustomTabularInline, )):
                    raise ImproperlyConfigured("El inline no es subclase de CustomTabularInline")
        #=======================================================================
        # Agregar los campos localtime_<nombre_metodo>
        #=======================================================================
        
        if issubclass(model_or_iterable, models.Model):
            model = model_or_iterable
            
            campos_fecha = filter(lambda f: isinstance(f, models.DateField), 
                              model._meta.fields)
            for campo in campos_fecha:
                print "Campo fecha: %s" % campo.name
                def wrapped(self):
                    nombre_campo = campo.name
                    d = getattr(self, nombre_campo)
                    if not d:
                        return ''
                    return d.strftime(FORMATO_FECHA)
                    
                
                wrapped.allow_tags = True
                wrapped.short_description = campo.verbose_name
                wrapped.admin_order_field = campo.name
                
                nombre_metodo = 'localdate_%s' % campo.name
                print "nombre del método: %s" % nombre_metodo
                setattr(model, nombre_metodo, wrapped)
                
        
        return AdminSite.register(self, model_or_iterable, admin_class, **options)
    
    # ------------------------------------------------------------------------
    # Definiciones para un menú lateral
    # ------------------------------------------------------------------------
    
    SIDEBAR_MENU_TITLE_TMPL = '''
                                <h3>{{ title }}</h3>
                                <div><ul>{{ items_html }}</ul></div>'''
    
    SIDEBAR_MENU_ITEM_TMPL = '''
                            <li><a {% if image %}style="background-image: url('{{ image }}')" {% endif %}
                            href="{{ href }}">{{ name }}</a></li>'''
    
    def get_navigation_menu(self):
        '''
        Genera la estrucutra del menú lateral, 
        <h3>App Name</h3>
        <div>
            <ul><a href="...">Model</ul>
            <ul><a href="...">Model</ul>
            <ul><a href="...">Model</ul>
        </div>
        Ver SIDEBAR_MENU_TITLE_TMPL y SIDEBAR_MENU_TITLE_TMPL de esta clase.
        '''
        
        # Create the templates
        title_templ = Template(self.SIDEBAR_MENU_TITLE_TMPL.replace('\n', ' '))
        items_templ = Template(self.SIDEBAR_MENU_ITEM_TMPL.replace('\n', ' '))
        
        html = u''
        apps = {}
        # Primero ordenar por aplicación
        for modelo, admin in self._registry.iteritems():
            app_label = modelo._meta.app_label
            if not app_label in apps:
                apps[app_label] = [(modelo, admin) ]
            else:
                apps[app_label].append((modelo, admin) )
        
        # Generar el menú
        for app, mode_admin_tuples in apps.iteritems():
            # For each application contents points to its registered models
            #html = u'%s<h3>%s</h3>\n<div><ul>' % (html, app.title())
            def compare_verbose_name(a, b):
                return cmp(smart_unicode(a[0]._meta.verbose_name), smart_unicode(b[0]._meta.verbose_name))
            # Order models by their names
            mode_admin_tuples = sorted(mode_admin_tuples, cmp = compare_verbose_name)
            items_html = ''
            
            for model, admin in mode_admin_tuples:
                # Name
                name = model._meta.verbose_name_plural
                module_name = model._meta.module_name
                
                if name[0] not in string.uppercase:
                    name = name.title()
                name = force_unicode(name)
                # Image
                if module_name in settings.MODEL_ICONS:
                    image_url = settings.MEDIA_URL + 'img/icons/' + settings.MODEL_ICONS[module_name]
                else:
                    image_url = ''
                
                href = '/' + '/'.join([self.name, app, module_name])
                
                item_html = items_templ.render(Context(dict(
                                                            image = image_url,
                                                            href = href,
                                                            name = name
                                                            )))
                items_html = ''.join([items_html, item_html])
                
            menu_html = title_templ.render(Context(dict(
                                                        title = app.title(),
                                                        items_html = mark_safe(items_html)
                                                   )))
            #print menu_html
            html = u''.join([html, menu_html])    
            
        
        return mark_safe(html)