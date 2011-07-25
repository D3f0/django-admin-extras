#!/usr/bin/env python
#-*- encoding: utf-8 -*-
# Created: 03/07/2010 by defo
'''
En este módulo configuramos la Administración de django,
los elementos mas importantes son el tratado de fechas,
los foreignkeys con autocompletado.
Se define un tipo de sitio de administración CustomAdminSite y un CustomModelAdmin
'''

from django.contrib.admin import ModelAdmin, helpers
from django.contrib.admin.sites import AdminSite

from django.conf.urls.defaults import patterns
from django.contrib.admin.options import BaseModelAdmin, TabularInline,\
    csrf_protect_m, IncorrectLookupParameters
from django import forms, template
from django.conf import settings

from django.core.exceptions import ImproperlyConfigured, PermissionDenied
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
from django.template.context import Context, RequestContext
from django.http import HttpResponse, HttpResponseRedirect, Http404
from adminextras.admin.debugtools import debugargs
from django.shortcuts import render_to_response
from django.template.defaultfilters import capfirst
from django.views.decorators.cache import never_cache
from django.utils.translation import ugettext_lazy, ugettext as _, ungettext
from django.forms.formsets import all_valid
from django.contrib.admin.util import unquote

FORMATO_FECHA = settings.DATE_INPUT_FORMATS[0]
from django.core import urlresolvers

from widgets import *

@debugargs
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

        

from django.db import models, transaction

class CustomModelAdmin(ModelAdmin):
    '''
    Un ModelAdmin personzlizado que trabaja en conjunto con un AdminSite personalizado.
    Este model admin prvee las facilidades para la exportación a Excel y
    algunos widgets para la internacionalización.
    Además prvee un sistema de autocompletado para los foreignkeys que requieran
    trabajen con un queryset muy extenso que podría elevar excesivamente el consumo
    de memoria de la aplicación.
    '''
    add_form_template = 'adminextras/admin/custom_change_form.html'
    change_form_template = 'adminextras/admin/custom_change_form.html'
    
    instances = {}
    #field_type_attrs.setdefault(k)
    field_type_attrs = dict(
                        TextField = {'autocomplete': 'off'},
                        DateField =  {'autocomplete': 'off'},
                        AutoField =  {'autocomplete': 'off'},
    )
    
    def has_add_permission(self, request):
        """
        Returns True if the given request has permission to add an object.
        Can be overriden by the user in subclasses.
        """
        opts = self.opts
        permission_str = opts.app_label + '.' + opts.get_add_permission()
        print "Buscando permiso por ", permission_str
        return request.user.has_perm(permission_str)
    
    def has_view_permission(self, request, obj=None):
        """
        Returns True if the given request has permission to change or view
        the given Django model instance.
    
        If `obj` is None, this should return True if the given request has
        permission to change *any* object of the given type.
        """
        #def get_view_permission(self):
        #return 'view_%s' % self.object_name.lower()
        opts = self.opts
        view_permission = "view_%s" % self.model._meta.object_name.lower()
        view_permission = opts.app_label + '.' + view_permission
        print "View permission", view_permission
        return self.has_change_permission(request, obj) or \
            request.user.has_perm(view_permission)

    
    def get_model_perms(self, request):
        """
        Returns a dict of all perms for this model. This dict has the keys
        ``add``, ``change``, and ``delete`` mapping to the True/False for each
        of those actions.
        """
        print "GET_MODEL_PERMS"
        return {
            'add': self.has_add_permission(request),
            'change': self.has_change_permission(request),
            'delete': self.has_delete_permission(request),
            'view': self.has_view_permission(request),
        }
        
    # Paso 4 de http://stackoverflow.com/questions/1336382/how-can-i-modify-django-to-create-view-permission
    @csrf_protect_m
    def changelist_view(self, request, extra_context=None):
        "The 'change list' admin view for this model."
        from django.contrib.admin.views.main import ERROR_FLAG
        opts = self.model._meta
        app_label = opts.app_label
        print "Buscando permisos para ", request.user, " de vista", self.has_view_permission(request, None)
        if not self.has_change_permission(request, None) and not self.has_view_permission(request, None):
            raise PermissionDenied

        # Check actions to see if any are available on this changelist
        actions = self.get_actions(request)

        # Remove action checkboxes if there aren't any actions available.
        list_display = list(self.list_display)
        if not actions:
            try:
                list_display.remove('action_checkbox')
            except ValueError:
                pass

        ChangeList = self.get_changelist(request)
        try:
            cl = ChangeList(request, self.model, list_display, self.list_display_links, self.list_filter,
                self.date_hierarchy, self.search_fields, self.list_select_related, self.list_per_page, self.list_editable, self)
        except IncorrectLookupParameters:
            # Wacky lookup parameters were given, so redirect to the main
            # changelist page, without parameters, and pass an 'invalid=1'
            # parameter via the query string. If wacky parameters were given
            # and the 'invalid=1' parameter was already in the query string,
            # something is screwed up with the database, so display an error
            # page.
            if ERROR_FLAG in request.GET.keys():
                return render_to_response('admin/invalid_setup.html', {'title': _('Database error')})
            return HttpResponseRedirect(request.path + '?' + ERROR_FLAG + '=1')

        # If the request was POSTed, this might be a bulk action or a bulk
        # edit. Try to look up an action or confirmation first, but if this
        # isn't an action the POST will fall through to the bulk edit check,
        # below.
        action_failed = False
        selected = request.POST.getlist(helpers.ACTION_CHECKBOX_NAME)

        # Actions with no confirmation
        if (actions and request.method == 'POST' and
                'index' in request.POST and '_save' not in request.POST):
            if selected:
                response = self.response_action(request, queryset=cl.get_query_set())
                if response:
                    return response
                else:
                    action_failed = True
            else:
                msg = _("Items must be selected in order to perform "
                        "actions on them. No items have been changed.")
                self.message_user(request, msg)
                action_failed = True

        # Actions with confirmation
        if (actions and request.method == 'POST' and
                helpers.ACTION_CHECKBOX_NAME in request.POST and
                'index' not in request.POST and '_save' not in request.POST):
            if selected:
                response = self.response_action(request, queryset=cl.get_query_set())
                if response:
                    return response
                else:
                    action_failed = True

        # If we're allowing changelist editing, we need to construct a formset
        # for the changelist given all the fields to be edited. Then we'll
        # use the formset to validate/process POSTed data.
        formset = cl.formset = None

        # Handle POSTed bulk-edit data.
        if (request.method == "POST" and self.list_editable and
                '_save' in request.POST and not action_failed):
            FormSet = self.get_changelist_formset(request)
            formset = cl.formset = FormSet(request.POST, request.FILES, queryset=cl.result_list)
            if formset.is_valid():
                changecount = 0
                for form in formset.forms:
                    if form.has_changed():
                        obj = self.save_form(request, form, change=True)
                        self.save_model(request, obj, form, change=True)
                        form.save_m2m()
                        change_msg = self.construct_change_message(request, form, None)
                        self.log_change(request, obj, change_msg)
                        changecount += 1

                if changecount:
                    if changecount == 1:
                        name = force_unicode(opts.verbose_name)
                    else:
                        name = force_unicode(opts.verbose_name_plural)
                    msg = ungettext("%(count)s %(name)s was changed successfully.",
                                    "%(count)s %(name)s were changed successfully.",
                                    changecount) % {'count': changecount,
                                                    'name': name,
                                                    'obj': force_unicode(obj)}
                    self.message_user(request, msg)

                return HttpResponseRedirect(request.get_full_path())

        # Handle GET -- construct a formset for display.
        elif self.list_editable:
            FormSet = self.get_changelist_formset(request)
            formset = cl.formset = FormSet(queryset=cl.result_list)

        # Build the list of media to be used by the formset.
        if formset:
            media = self.media + formset.media
        else:
            media = self.media

        # Build the action form and populate it with available actions.
        if actions:
            action_form = self.action_form(auto_id=None)
            action_form.fields['action'].choices = self.get_action_choices(request)
        else:
            action_form = None

        selection_note_all = ungettext('%(total_count)s selected',
            'All %(total_count)s selected', cl.result_count)

        context = {
            'module_name': force_unicode(opts.verbose_name_plural),
            'selection_note': _('0 of %(cnt)s selected') % {'cnt': len(cl.result_list)},
            'selection_note_all': selection_note_all % {'total_count': cl.result_count},
            'title': cl.title,
            'is_popup': cl.is_popup,
            'cl': cl,
            'media': media,
            'has_add_permission': self.has_add_permission(request),
            'root_path': self.admin_site.root_path,
            'app_label': app_label,
            'action_form': action_form,
            'actions_on_top': self.actions_on_top,
            'actions_on_bottom': self.actions_on_bottom,
            'actions_selection_counter': self.actions_selection_counter,
        }
        context.update(extra_context or {})
        context_instance = template.RequestContext(request, current_app=self.admin_site.name)
        return render_to_response(self.change_list_template or [
            'admin/%s/%s/change_list.html' % (app_label, opts.object_name.lower()),
            'admin/%s/change_list.html' % app_label,
            'admin/change_list.html'
        ], context, context_instance=context_instance)
        
    @csrf_protect_m
    @transaction.commit_on_success
    def change_view(self, request, object_id, extra_context=None):
        "The 'change' admin view for this model."
        model = self.model
        opts = model._meta

        obj = self.get_object(request, unquote(object_id))
        
        read_only_form = not self.has_change_permission(request, obj) and self.has_view_permission(request,)
        
        if not self.has_change_permission(request, obj) and not self.has_view_permission(request,):
            raise PermissionDenied

        if obj is None:
            raise Http404(_('%(name)s object with primary key %(key)r does not exist.') % {'name': force_unicode(opts.verbose_name), 'key': escape(object_id)})

        if request.method == 'POST' and request.POST.has_key("_saveasnew"):
            return self.add_view(request, form_url='../add/')

        ModelForm = self.get_form(request, obj)
        formsets = []
        if request.method == 'POST':
            if read_only_form:
                raise PermissionDenied
            form = ModelForm(request.POST, request.FILES, instance=obj)
            if form.is_valid():
                form_validated = True
                new_object = self.save_form(request, form, change=True)
            else:
                form_validated = False
                new_object = obj
            prefixes = {}
            for FormSet, inline in zip(self.get_formsets(request, new_object),
                                       self.inline_instances):
                prefix = FormSet.get_default_prefix()
                prefixes[prefix] = prefixes.get(prefix, 0) + 1
                if prefixes[prefix] != 1:
                    prefix = "%s-%s" % (prefix, prefixes[prefix])
                formset = FormSet(request.POST, request.FILES,
                                  instance=new_object, prefix=prefix,
                                  queryset=inline.queryset(request))

                formsets.append(formset)

            if all_valid(formsets) and form_validated:
                self.save_model(request, new_object, form, change=True)
                form.save_m2m()
                for formset in formsets:
                    self.save_formset(request, form, formset, change=True)

                change_message = self.construct_change_message(request, form, formsets)
                self.log_change(request, new_object, change_message)
                return self.response_change(request, new_object)

        else:
            form = ModelForm(instance=obj)
            prefixes = {}
            for FormSet, inline in zip(self.get_formsets(request, obj), self.inline_instances):
                prefix = FormSet.get_default_prefix()
                prefixes[prefix] = prefixes.get(prefix, 0) + 1
                if prefixes[prefix] != 1:
                    prefix = "%s-%s" % (prefix, prefixes[prefix])
                formset = FormSet(instance=obj, prefix=prefix,
                                  queryset=inline.queryset(request))
                formsets.append(formset)

        adminForm = helpers.AdminForm(form, self.get_fieldsets(request, obj),
            self.prepopulated_fields, self.get_readonly_fields(request, obj),
            model_admin=self)
        media = self.media + adminForm.media

        inline_admin_formsets = []
        for inline, formset in zip(self.inline_instances, formsets):
            fieldsets = list(inline.get_fieldsets(request, obj))
            readonly = list(inline.get_readonly_fields(request, obj))
            inline_admin_formset = helpers.InlineAdminFormSet(inline, formset,
                fieldsets, readonly, model_admin=self)
            inline_admin_formsets.append(inline_admin_formset)
            media = media + inline_admin_formset.media
        
        
        if read_only_form:
            # TODO: Localization
            title = _('Visualizar %s') % force_unicode(opts.verbose_name)
        else:
            title = _('Change %s') % force_unicode(opts.verbose_name)
            
        context = {
            'title': title,
            'adminform': adminForm,
            'object_id': object_id,
            'original': obj,
            'read_only_form': read_only_form,
            'is_popup': request.REQUEST.has_key('_popup'),
            'media': mark_safe(media),
            'inline_admin_formsets': inline_admin_formsets,
            'errors': helpers.AdminErrorList(form, formsets),
            'root_path': self.admin_site.root_path,
            'app_label': opts.app_label,
        }
        #import ipdb; ipdb.set_trace()
        context.update(extra_context or {})
        return self.render_change_form(request, context, change=True, obj=obj)

    
    def formfield_for_dbfield(self, db_field, **kwargs):
        custom_widget = self.admin_site.widget_mapping.get(type(db_field), None)
        
        
        field = BaseModelAdmin.formfield_for_dbfield(self, db_field, **kwargs)
        if custom_widget:
            widget = custom_widget()
            field.widget =  widget
        #if type(db_field) == models.DateField:
        #    import ipdb; ipdb.set_trace()
            
        
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
            (r'^list_objects/?$', self.admin_site.admin_view(self.list_objects)),
        )
        full_url = my_urls + urls
#        for url in full_url:
#            print "*", url 
        
        return full_url
    
    
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
        #import time; time.sleep(2) # Simular el dealy
        log = {}
        data = []
        qs = self.queryset(request)
        query = self._build_autocomplete_query(value)
        qs = qs.filter(query)
        qs = qs[:self.autocomplete_hits]
        try:
            cant = qs.count()
        except Exception, e:
            cant = -1 # Error
            if settings.DEBUG:
                log = {'error': unicode(e)}
        else:
            for obj in qs:
                data.append({'value': unicode(obj), 'label': unicode(obj), 'pk': obj.pk})
                for attr_name in self.autocomplete_extra_values:
                    f = getattr(obj, attr_name, '')
                    if callable(f):
                        f = f()
                    data.append({attr_name: f})
        finally:
            if cant < 1:
                data = [{'value': 'Sin resultados', 'label': 'Sin resultados', 'pk': ''}]
                cant = 0
        return SimpleJsonResponse(success = True, data = data, cant = cant, log = log)
    
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
    
    def list_objects(self, request):
        objetos = self.queryset(request)
        #/home/defo/workspace/python/django/django-admin-extras/adminextras/templates/
        #adminextras/admin/list_objects.html
        return render_to_response('adminextras/admin/list_objects.html', {'objetos': objetos}, 
                                  context_instance = RequestContext(request))
        #return render_to_response('admin/change_list.html', {}, 
        #                          context_instance = RequestContext(request))

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
    
