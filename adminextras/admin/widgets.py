# encoding: utf-8
'''
Widgets para la administración
'''
from django.forms.widgets import TextInput
from django.utils.safestring import mark_safe
from django.conf import settings

class AdminAutoCompleteFKInputWidget(TextInput):
    '''
    Un widget para autocompletado que trabaja en conjunto con la
    administración.
    '''
    def __init__(self, url = None, queryset = None, *largs, **kwargs):
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
                settings.STATIC_URL + 'js/adminextras/autocomplete.js',
             )
        css = {
               'all': ('css/adminextras/autocomplete.css', )
               
        }
        
    

