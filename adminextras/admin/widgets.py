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
import simplejson
from django.conf import settings


USE_COMPRESSED_JQUERY_UI = hasattr(settings, 'USE_COMPRESSED_JQUERY_UI') and settings.USE_COMPRESSED_JQUERY_UI
USE_SPARSE_UI = not USE_COMPRESSED_JQUERY_UI

class AdminAutoCompleteFKInputWidget(TextInput):
    '''
    Un widget para autocompletado que trabaja en conjunto con la
    administración.
    '''
    def __init__(self, queryset = None, url = None,  *largs, **kwargs):
        TextInput.__init__(self, *largs, **kwargs)
        self.url = url
        self.qs = queryset
        
    def render(self, name, value, attrs=None):
        '''
        Generación del HTML del widget
        '''
        obj = ''
        if value:
            try:
                obj = self.qs.get(pk = value)
            except Exception: # No existe
                pass
        
        
        container = '<span class="autocomplete" url="%s">%s</span>'
        hidden_input = '<input type="hidden" name="%s" value="%s" id="id_%s">' % (name, value or '', name)
        autocomp_input = '<input type="text" value="%s" onfocus="adminextras.autocomplete.check(this)" size="52" id="%s">' % (unicode(obj), 'autocomplete_'+name)
        #autocomp_input += '<a href="javascript:void(0);" onclick="adminautocomp.clear(this)" class="clear_autocomp">Borrar</a>'
        
        if hasattr(self, 'help_text'):
            help_text = "<p class='helptext'>%s</p>" % self.help_text
        else:
            help_text = ''
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
    


from patsubst import MediaSubstitutionMetaclass
import re
#===============================================================================
# CamelCase to Python fmt 
#===============================================================================
decamelize = lambda s: re.sub('((?=[A-Z][a-z])|(?<=[a-z])(?=[A-Z]))', '_', s).lower()

class DatePickerInputWidget(DateInput):
    '''
    jQuery UI datepicker adapter for django widgets
    
    '''
    __metaclass__ = MediaSubstitutionMetaclass
    
    JS_PARAMS = ['disabled','altField','altFormat','appendText','autoSize',
                 'buttonImage','buttonImageOnly','buttonText','changeMonth',
                 'changeYear','closeText','constrainInput','currentText','dateFormat',
                 'dayNames','dayNamesMin','dayNamesShort','defaultDate','duration',
                 'gotoCurrent','hideIfNoPrevNext','isRTL','maxDate','minDate','monthNames',
                 'monthNamesShort','navigationAsDateFormat','nextText','numberOfMonths',
                 'prevText','selectOtherMonths','shortYearCutoff','showAnim',
                 'showButtonPanel','showCurrentAtPos','showMonthAfterYear','showOn',
                 'showOptions','showOtherMonths','showWeek','stepMonths','weekHeader',
                 'yearRange','yearSuffix']

    PARAMS = dict([ (decamelize(n), n) for n in JS_PARAMS ])
    
    class Media:
        js = (
              settings.STATIC_URL + "js/jquery-ui/js/jquery.min.js",) + (
              USE_SPARSE_UI and (
              settings.STATIC_URL + "js/jquery-ui/development-bundle/ui/jquery.ui.core.js", 
              settings.STATIC_URL + "js/jquery-ui/development-bundle/ui/jquery.ui.widget.js", 
              settings.STATIC_URL + "js/jquery-ui/development-bundle/ui/jquery.ui.datepicker.js",
              ) or (
              settings.STATIC_URL + 'js/jquery-ui/js/jquery-ui.min.js',
              )) + (
              settings.STATIC_URL + 'js/jquery-ui/development-bundle/ui/i18n/jquery.ui.datepicker-${settings.LANGUAGE_CODE:split("-"):[0]}.js',
              settings.STATIC_URL + 'js/adminextras/datepicker.js',
              )
        css = {
               'all': (settings.STATIC_URL + 'css/adminextras/calendar.css',)
               }

    def __init__(self, attrs={}, format=None, **opts):
            
        super(DatePickerInputWidget, self).__init__(attrs={'class': 'jquery_datepicker', 
                                                           'size': '10'}, format=format)
        opts.setdefault('button_image', settings.STATIC_URL + 'img/adminextras/famfamfam/calendar_view_month.png')
        self.js_params = self.build_params(opts)
        
    def build_params(self, opts):
        d = {}
        for name, value in opts.iteritems():
            if not name in self.PARAMS:
                c = type(self).__name__
                msg = "%s does not accept %s as param." % (c, name)
                if name in self.JS_PARAMS:
                    msg += " You should use %s instead" % decamelize(name)
                raise Exception(msg)
            
            d[self.PARAMS[name]] = value
        return simplejson.dumps(d)
            
    # TODO: Utilizar get_format('DATE_INPUTS_FORMATS')[0] en js/adminextras/datepicker.js
    def render(self, name, value, attrs=None):
        '''
        Stores options in a hidden input
        '''
        original_html = super(DatePickerInputWidget, self).render(name, value, attrs)
        new_html = """<span class="datepicker">
            %s
            <a href="" onclick="return adminextras.datepicker.today(this);">&nbsp;&laquo;<b>Hoy</b></a>
            <input type='hidden' id='datepicker_opts_%s' value='%s'>
        </span>""" % (original_html, attrs.get('id'), self.js_params)
        
        return mark_safe( new_html )    


make_label = lambda s: (' '.join(s.split('_'))).title()

class ButtonWidget(Widget):
    '''
    jQuery button widget
    '''
    input_type = 'button'
    
    def __init__(self, onclick = None, label = None, *largs, **kwargs):
        super(ButtonWidget, self).__init__(*largs, **kwargs)
        self.js_onclick = onclick
        self.js_label = label
        
    def render(self, name, value, attrs={}):
        
        if not attrs.has_key('class'):
            attrs['class'] = 'form_button'
        attrs['button_params'] = simplejson.dumps({'onclick': self.js_onclick,
                                                   'label': self.js_label or make_label(name)}) 
        final_attrs = self.build_attrs(attrs, type=self.input_type, name=name)
        id = final_attrs['id']
        html = mark_safe(u'<input%s />' % flatatt(final_attrs))
        #print html
        return html
    
    class Media:
        js = (USE_SPARSE_UI and (
              settings.STATIC_URL + "js/jquery-ui/development-bundle/ui/jquery.ui.core.js", 
              settings.STATIC_URL + "js/jquery-ui/development-bundle/ui/jquery.ui.widget.js",
              settings.STATIC_URL + "js/jquery-ui/development-bundle/ui/jquery.ui.button.js",
              ) or (
              settings.STATIC_URL + 'js/jquery-ui/js/jquery-ui.min.js',
              )) + (
              settings.STATIC_URL + "js/adminextras/button.js", 
              )
        css = {
            'all': ( ),
        }

class DialogMedia(Media):
    ''' Medios para el diálgo de jQuery '''
    js =  (
          settings.STATIC_URL + "js/jquery-ui/js/jquery.min.js",
          ) + (USE_SPARSE_UI and (
          settings.STATIC_URL + "js/jquery-ui/development-bundle//external/jquery.bgiframe-2.1.2.js",
          settings.STATIC_URL + "js/jquery-ui/development-bundle/ui/jquery.ui.core.js", 
          settings.STATIC_URL + "js/jquery-ui/development-bundle/ui/jquery.ui.widget.js", 
          settings.STATIC_URL + "js/jquery-ui/development-bundle/ui/jquery.ui.mouse.js", 
          settings.STATIC_URL + "js/jquery-ui/development-bundle/ui/jquery.ui.draggable.js", 
          settings.STATIC_URL + "js/jquery-ui/development-bundle/ui/jquery.ui.position.js", 
          settings.STATIC_URL + "js/jquery-ui/development-bundle/ui/jquery.ui.resizable.js", 
          settings.STATIC_URL + "js/jquery-ui/development-bundle/ui/jquery.ui.dialog.js",
          ) or (
          settings.STATIC_URL + 'js/jquery-ui/js/jquery-ui.min.js',
          ))
    css = {
           'all': (
                   settings.STATIC_URL + 'js/jquery-ui/development-bundle/themes/base/jquery.ui.all.css',
                   )
           }
