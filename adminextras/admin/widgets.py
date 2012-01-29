# encoding: utf-8
'''
Widgets para la administración
'''
from django.forms.widgets import TextInput, CheckboxInput, Select, DateInput,\
    MediaDefiningClass, Widget, Media
from django.utils.safestring import mark_safe
from django.conf import settings
from django.utils.encoding import force_unicode
from django.utils.html import conditional_escape, escape
from django.core.management import setup_environ
from django.forms.util import flatatt
from django.forms.models import ModelChoiceIterator
from django.forms.widgets import CheckboxSelectMultiple, SelectMultiple
from itertools import chain
from django.template.loader import render_to_string
from django.template.base import Template
from django.template.context import Context
try:
    from simplejson import dumps
except ImportError:
    from json import dumps
from django.conf import settings
from re import compile
from django.db.models import exceptions
#from admin.utils import compose


USE_COMPRESSED_JQUERY_UI = hasattr(settings, 'USE_COMPRESSED_JQUERY_UI') and settings.USE_COMPRESSED_JQUERY_UI
USE_SPARSE_UI = not USE_COMPRESSED_JQUERY_UI

class AdminAutoCompleteFKInputWidget(TextInput):
    '''
    Un widget para autocompletado que trabaja en conjunto con la
    administración.
    '''
    
    def __init__(self, url = None, filter_fields = None, extra_fields = None, *largs, **kwargs):
        '''
        Autocomplete 
        '''
        TextInput.__init__(self, *largs, **kwargs)
        self.filter_fields = filter_fields
    
    #===========================================================================
    # Properties needed for correct behavior, must be set either in the view
    # or through ModelAdmin
    #===========================================================================
    __field_queryset = None
    @property
    def field_queryset(self):
        return self.__field_queryset
    
    @field_queryset.setter
    def field_queryset(self, value):
        self.__field_queryset = value
    
    __autocomplete_url = None
    @property
    def autocomplete_url(self):
        return self.__autocomplete_url
    
    @autocomplete_url.setter
    def autocomplete_url(self, value):
        self.__autocomplete_url = value
    
    
    
    def render(self, name, value, attrs=None):
        '''
        Generación del HTML del widget
        '''
        assert self.field_queryset is not None, "Falta inicializar el queryset del field en el get_form"
        assert self.autocomplete_url is not None, "Falta inicializar la URL"
        obj = ''
        if value: # Render current value
            try:
                obj = self.qs.get(pk = value)
            except exceptions.ObjectDoesNotExist: # No existe
                pass
        
        
        container = '<span class="autocomplete" url="%s">%s</span>'
        hidden_input = '<input type="hidden" name="%s" value="%s" id="id_%s">' % (name, value or '', name)
        autocomp_input = '<input type="text" value="%s" onfocus="adminextras.autocomplete.check(this)" size="52" id="%s">' % (unicode(obj), 'autocomplete_'+name)
        #autocomp_input += '<a href="javascript:void(0);" onclick="adminautocomp.clear(this)" class="clear_autocomp">Borrar</a>'
        
        
        help_text = hasattr(self, 'help_text') and "<p class='helptext'>%s</p>" % self.help_text or ''
        
        inner_widgets = '\n'.join([hidden_input, autocomp_input, help_text, ]) + '\n'
        return mark_safe(container % (self.url, inner_widgets))
    
    class Media:
        # Utiliza jQuery
        js = (
                # Base para todos los widgets
                settings.STATIC_URL + "js/jquery-ui/js/jquery.min.js",) +\
                (USE_SPARSE_UI and (            
                settings.STATIC_URL + "js/jquery-ui/development-bundle/ui/jquery.ui.core.js",
                settings.STATIC_URL + "js/jquery-ui/development-bundle/ui/jquery.ui.widget.js",
                settings.STATIC_URL + "js/jquery-ui/development-bundle/ui/jquery.ui.position.js",
                settings.STATIC_URL + "js/jquery-ui/development-bundle/ui/jquery.ui.autocomplete.js",
                ) or (
                settings.STATIC_URL + 'js/jquery-ui/js/jquery-ui.min.js',
                )) + (
                settings.STATIC_URL + "js/adminextras/autocomplete.js",
                )
             
        css = {
               'all': (settings.STATIC_URL + 'css/adminextras/autocomplete.css', 
                       settings.STATIC_URL + 'js/jquery-ui/development-bundle/themes/base/jquery.ui.all.css')
        }
    
    MAX_AUTOCOMPLETE_HITS = 50
    
    def generate_view_data(self, queryset = None, 
                           filter_fields = None, 
                           max_hists = MAX_AUTOCOMPLETE_HITS, 
                           extra_fields = None, 
                           filter_mode = 'icontains'):
        ''' Generate data to send it back to the view, used in AJAX requests. 
        This method generates the python json-convertable data which should be sent
        back  
        '''
        data = dict(
                    error = None,
                    data = None,
                    )
#===============================================================================
# Some widgets which only render part
#===============================================================================


class EmptySelectMultiple(SelectMultiple):
    '''
    Allows the widget to render only those options 
    which are values
    '''
    def __init__(self, attrs=None, choices = ()):
        super(Select, self).__init__(attrs)
        self.choices = choices  # Evitamos que se converta en lista
                                # para que no se evalue todo el queryset
    
    def render_options(self, choices, selected_choices):
        # Normalize to strings.
        selected_choices = set([force_unicode(v) for v in selected_choices])
        output = []
        self.choices.queryset = self.choices.queryset.filter(pk__in = selected_choices)
        
        for option_value, option_label in chain(self.choices, choices):
            if isinstance(option_label, (list, tuple)):
                output.append(u'<optgroup label="%s">' % escape(force_unicode(option_value)))
                for option in option_label:
                    output.append(self.render_option(selected_choices, *option))
                output.append(u'</optgroup>')
            else:
                output.append(self.render_option(selected_choices, option_value, option_label))
        return u'\n'.join(output)

class EmptyCheckboxSelectMultiple(CheckboxSelectMultiple):
    '''
    
    '''
    def __init__(self, attrs=None, choices = ()):
        super(Select, self).__init__(attrs)
        self.choices = choices  # Evitamos que se converta en lista
                                # para que no se evalue todo el queryset
    
    def render(self, name, value, attrs=None, choices=()):
        '''
        Renderizar el HTML
        '''
        #print "Choices para %s son %s " % (name, list(self.choices))
        if value is None: value = []
        has_id = attrs and 'id' in attrs
        final_attrs = self.build_attrs(attrs, name=name)
        output = [u'<ul>']
        # Normalize to strings
        str_values = set([force_unicode(v) for v in value])
        for i, (option_value, option_label) in enumerate(chain(self.choices, choices)):
            
            # If an ID attribute was given, add a numeric index as a suffix,
            # so that the checkboxes don't all have the same ID attribute.
            if has_id:
                final_attrs = dict(final_attrs, id='%s_%s' % (attrs['id'], i))
                label_for = u' for="%s"' % final_attrs['id']
            else:
                label_for = ''

            cb = CheckboxInput(final_attrs, check_test=lambda value: value in str_values)
            option_value = force_unicode(option_value)
            rendered_cb = cb.render(name, option_value)
            option_label = conditional_escape(force_unicode(option_label))
            output.append(u'<li><label%s>%s %s</label></li>' % (label_for, rendered_cb, option_label))
        output.append(u'</ul>')
        return mark_safe(u'\n'.join(output))
    


 
    

