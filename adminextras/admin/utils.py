# encoding: utf-8
from django.db.models import get_app, get_apps
from django.core.exceptions import ImproperlyConfigured

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

# Taken from 
# http://en.wikipedia.org/wiki/Function_composition_%28computer_science%29
def compose(*funcs, **kfuncs):
        """Compose a group of functions (f(g(h(..)))) into (fogoh...)(...)"""
        return reduce(lambda f, g: lambda *args, **kaargs: f(g(*args, **kaargs)), funcs)