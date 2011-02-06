# encoding: utf-8
'''
Widgets para la administración
'''
from django.forms.widgets import TextInput, CheckboxInput, Select, DateInput,\
    MediaDefiningClass
from django.utils.safestring import mark_safe
from django.conf import settings
from django.utils.encoding import force_unicode
from django.utils.html import conditional_escape, escape
from django.core.management import setup_environ
from django.forms.util import flatatt
from django.forms.models import ModelChoiceIterator
from django.forms.widgets import CheckboxSelectMultiple, SelectMultiple
from itertools import chain

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
        autocomp_input = '<input type="text" value="%s" onfocus="django.adminautocomp.check(this)" size="52" id="%s">' % (unicode(obj), 'aoutocomplete_'+name)
        #autocomp_input += '<a href="javascript:void(0);" onclick="django.adminautocomp.clear(this)" class="clear_autocomp">Borrar</a>'
        
        if hasattr(self, 'help_text'):
            help_text = "<p class='helptext'>%s</p>" % self.help_text
        else:
            help_text = ''
        inner_widgets = '\n'.join([hidden_input, autocomp_input, help_text, ]) + '\n'
        return mark_safe(container % (self.url, inner_widgets))
    
    class Media:
        # Utiliza jQuery
        js = (
                'js/adminextras/autocomplete.js',
             )
        css = {
               'all': ('css/adminextras/autocomplete.css', )
               
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
        print "Choices para %s son %s " % (name, list(self.choices))
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
    


#from django.contrib.admin.widgets import AdminDateWidget
import re
MEDIA_PATTERN = re.compile('''
(:?\$\{
    [\w\d\.\:\[\]\(\)\"\'\,\-\_]+
\})
''', re.VERBOSE)

MEDIA_SUBST_PATTERN = re.compile(
    '''(:?
        \$\{(?P<value>[\w\.\d]+)
        (:?(?P<filters>.*))?\}
        )''',
    re.VERBOSE | re.MULTILINE
)

def get_value(s):
    '''
    Gets a value from a path, for example settings.ADMIN_MEDIA_PREFIX,
    it  imports modules and gets values from them 
    '''
    dots = s.count('.')
    if dots == 0:
        return getattr(settings, s)
    else:
        mod_pathname, attr = s.rsplit('.', 1)
        #print "Modulo, pathname", mod_pathname
        mod = __import__(mod_pathname, {}, {}, '*')
        #print "Modulo importado", mod
        return getattr(mod, attr)

class MediaSubstitutionException(Exception):
    pass

SUBINDEX = re.compile('\[(?P<index>\d+)\]')
METHOD = re.compile('(?P<name>[\d\w\_]+)\((?P<args>.*)\)')
def apply_filters(value, filters):
    '''
    Applies a set of filters to a value
    '''
    
    filters = filters.split(':')
    for filter in filters:
        subindex_match = SUBINDEX.search(filter)
        if subindex_match:
            index = int(subindex_match.group('index'))
            value = value[index]
            continue
        method_match = METHOD.search(filter)
        if method_match:
            method_name = method_match.group('name')
            method_args = method_match.group('args')
            method = getattr(value, method_name)
            args = eval(method_args, {})
            value = method(*args)
            continue
        raise MediaSubstitutionException("In %s could not parse %s" % (filters, filter))
        
        
             
    return value

#TODO: Manage complex subsitutions
def subst(source):
    '''
    Substitute patterns in URLs like
    ${settings.CONFIG_VALUE:split('-'):[0]}
    '''
    dest = ''
    last_end = 0
    for ptrn in MEDIA_SUBST_PATTERN.finditer(source):
        #import ipdb; ipdb.set_trace()
        dest += source[last_end:ptrn.start()]
        value_name = ptrn.group('value')
        filters = ptrn.group('filters') or ''
        value = get_value(value_name)
        value = apply_filters(value, filters)
        print value_name, filters, value
        dest += value 
        last_end = ptrn.end()
        
    dest += source[last_end:]
    print "---->", dest
    return dest

class MediaSubstitutionMetaclass(MediaDefiningClass):
    "Metaclass for classes that can have media definitions"
    def __new__(cls, name, bases, attrs):
        # Get class media
        Media = attrs.get('Media', None)
        if Media:
            Media.js = map(subst, Media.js)
        new_class = super(MediaSubstitutionMetaclass, cls).__new__(cls, name, bases,
                                                           attrs)
        return new_class


class DatePickerInputWidget(DateInput):
    
    '''
    jQuery UI datepicker adapter for django widgets
    '''
    __metaclass__ = MediaSubstitutionMetaclass
    class Media:
        js = (
              #"../../ui/i18n/jquery.ui.datepicker-${settings.LANGUAGE_CODE:split('-', 0)}.js"
              '../../ui/i18n/jquery.ui.datepicker-${settings.LANGUAGE_CODE:split("-"):[0]}.js',
              "js/adminextras/datepicker.js",
              )

    def __init__(self, attrs={}, format=None):
        super(DatePickerInputWidget, self).__init__(attrs={'class': 'jquery_datepicker', 
                                                           'size': '10'}, format=format)
        
    def _render(self, name, value, attrs=None):
        '''
        
        '''
        safe_html = super(DatePickerInputWidget, self).render(name, value, attrs)
        print self.id_for_label
        script = '''
            <script type="text/javascri
        
        '''
        return mark_safe(safe_html + script)    
