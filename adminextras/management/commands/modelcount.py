# coding: utf-8
from django.core.management.base import BaseCommand, CommandError, LabelCommand
from django.core.exceptions import ImproperlyConfigured
from django.db.utils import DatabaseError
#===============================================================================
# Some aliases
#===============================================================================
model_name = lambda model: ".".join([model._meta.app_label, model._meta.object_name])
model_count = lambda model: model._default_manager.count()

model_name_and_count = lambda m: (model_name(m), model_count(m))



class Command(BaseCommand):
    '''
    Returns the count for models
    '''
    def handle(self, *apps_or_model_labels, **kwargs):
        
        
        if apps_or_model_labels:
            self.header()
            for label in apps_or_model_labels:
                self.handle_label(label)
            self.footer()
        else:
            self.header()
            for name, models in self.get_app_models():
                self.print_line(name)
                for model in models:
                    try:
                        self.print_count_model_instances(model)
                    except DatabaseError:
                        pass
                    
            self.footer()
        
    def handle_label(self, label):
        from django.db.models.loading import get_model, get_app
        dots = label.count('.')
        if dots == 1:
            app_name, model_name = label.split('.') 
            model = get_model(app_name, model_name)
            self.print_line(label)
            self.print_count_model_instances(model)
        elif dots == 0:
            try:
                app = get_app(label)
            except ImproperlyConfigured:
                raise CommandError("%s no es una aplicación del proyecto" % label)
            
            for name, models in self.get_app_models(label):
                self.print_line(name)
                for model in models:
                    try:
                        self.print_count_model_instances(model)
                    except DatabaseError:
                        pass
        else:
            raise CommandError("%s no es un modelo ni una aplicacion" % label)
    
    def print_count_model_instances(self, model):
        print self.fmt_line % model_name_and_count(model) 
    
    def print_line(self, line):
        self._print_line()
        print self.fmt_line_full % line
        self._print_line()
        
    def get_app_models(self, *apps):
        from django.db.models.loading import get_apps, get_app
        if not apps:
            apps = get_apps()
        else:
            apps = map(get_app, apps)
            
        for app in apps:
            e = self.handle_app(app)
            if e:
                yield e
            
    def handle_app(self, app):
        from django.db import models
        import inspect
        name = app.__name__
        model_classes = []
        for element_name in dir(app):
            element = getattr(app, element_name)
            if not inspect.isclass(element) or element is models.Model:
                continue
            if issubclass(element, models.Model):
                model_classes.append(element)
        if model_classes:
            return name, model_classes
    #===========================================================================
    # Formating stuff
    #===========================================================================
    
    fmt_line = "|%-30s|%-30s|"
    fmt_space = "*%-30s*%-30s*"
    fmt_line_full = '|%-61s|'
    
    def _print_line(self):
        print self.fmt_space % ('-'*30, '-'*30)
        
    def _print_header(self):
        print self.fmt_line % (' Model', ' Rows/Count')
    
    def header(self):
        self._print_line()
        self._print_header()
        self._print_line()
    footer = _print_line
    