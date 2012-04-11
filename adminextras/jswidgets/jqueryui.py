# coding: utf-8

__all__ = ('DatePickerInputWidget', 
           'ButtonWidget', 
           'DialogMedia', 
           'jQueryUIMultiSelect',
           )
import re
from json import dumps
from django.forms import widgets
from utils import MediaSubstitutionMetaclass, build_params
from django.utils.safestring import mark_safe
from django.forms.util import flatatt
# from django.conf import settings
from adminextras.conf import settings #@UnresolvedImport

#===============================================================================
# CamelCase to Python fmt 
#===============================================================================
decamelize = lambda s: re.sub('((?=[A-Z][a-z])|(?<=[a-z])(?=[A-Z]))', '_', s).lower()

class DatePickerInputWidget(widgets.DateInput):
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
              settings.USE_SPARSE_UI and (
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
        return dumps(d)
            
    # TODO: Utilizar get_format('DATE_INPUTS_FORMATS')[0] en js/adminextras/datepicker.js
    def render(self, name, value, attrs=None):
        '''
        Stores options in a hidden input
        '''
        original_html = super(DatePickerInputWidget, self).render(name, value, attrs)
        new_html = """<span class="datepicker">
            %s
            <!-- <a href="" onclick="return adminextras.datepicker.today(this);" style="text-decoration: none;">&nbsp;&laquo;<b>Hoy</b></a> -->
            <input type='hidden' id='datepicker_opts_%s' value='%s' onfocus="alert(this);">
        </span>""" % (original_html, attrs.get('id'), self.js_params)
        
        return mark_safe( new_html )    


make_label = lambda s: (' '.join(s.split('_'))).title()

class ButtonWidget(widgets.Widget):
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
        attrs['button_params'] = dumps({'onclick': self.js_onclick,
                                                   'label': self.js_label or make_label(name)}) 
        final_attrs = self.build_attrs(attrs, type=self.input_type, name=name)
        id = final_attrs['id']
        html = mark_safe(u'<input%s />' % flatatt(final_attrs))
        #print html
        return html
    
    class Media:
        js = (settings.USE_SPARSE_UI and (
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

class DialogMedia(widgets.Media):
    ''' Medios para el diálgo de jQuery '''
    js =  (
          settings.STATIC_URL + "js/jquery-ui/js/jquery.min.js",
          ) + (settings.USE_SPARSE_UI and (
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


class jQueryUIMultiSelect(widgets.SelectMultiple):
    # http://www.erichynds.com/jquery/jquery-ui-multiselect-widget/
    JS_ATTRS = dict(
                header = True,
                height = 175,
                minWidth = 225,
                checkAllText = "Check all",
                uncheckAllText = "Uncheck All",
                noneSelectedText = "Select options",
                selectedText = "# selected",
                selectedList = False,
                show = "empty string",
                hide = "empty string",
                autoOpen = False,
                multiple = True,
                classes = "empty string",
                position = "empty object",
    )
    
    JS_PLUGIN_FILTER_ATTRS = dict(
                                  label = "Filter",
                                  width = "100px",
                                  placeholder = "Enter keywords",
                                  )
    
    def __init__(self, filter = False, *largs, **kwargs):
        '''
        @parm filter: bool enables filter plugin
        '''
        self.js_multiselect_params = build_params(kwargs, self.JS_ATTRS)
        self.filter = filter
        if self.filter:
            self.js_filter_plugin_attrs = build_params(kwargs, self.JS_PLUGIN_FILTER_ATTRS)
        super(jQueryUIMultiSelect, self).__init__(*largs, **kwargs)
    
    class Media:
        js = (
              settings.STATIC_URL + "js/jquery-ui/js/jquery.min.js",    # jQuery
              settings.STATIC_URL + 'js/jquery-ui/js/jquery-ui.min.js', # jQueryUi
              settings.STATIC_URL + 'js/multiselect/src/jquery.multiselect.min.js',
              settings.STATIC_URL + 'js/multiselect/src/jquery.multiselect.filter.min.js',
              settings.STATIC_URL + 'js/multiselect/i18n/jquery.multiselect.es.js',
              #settings.STATIC_URL + "js/adminextras/multiselect.js",
              )
        css = {
               'all': (
                       settings.STATIC_URL + 'js/jquery-ui/development-bundle/themes/base/jquery.ui.all.css',
                       settings.STATIC_URL + 'js/multiselect/jquery.multiselect.css',
                       settings.STATIC_URL + 'js/multiselect/jquery.multiselect.filter.css',
                       )
               
               }
    
    def render(self, name, value, attrs={}):
        if not attrs.has_key('class') or not attrs.get('class') == 'jqueryuimultiselect':
            #raise Exception("Can't render field, mutliselect.js won't accept them")
            attrs.setdefault('class', {})
            attrs['class'] = 'jqueryuimultiselect'
            
        attrs.update(multiselect_attrs = self.js_multiselect_params)
        if self.filter:
            attrs.update(filter_attrs = self.js_filter_plugin_attrs)
            #import ipdb; ipdb.set_trace()
        html = super(jQueryUIMultiSelect, self).render(name, value, attrs)
        #print "MULTISELECT MARKUP:", html
        return html
   