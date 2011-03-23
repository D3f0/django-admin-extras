#!/usr/bin/env python
#-*- encoding: utf-8 -*-
# Created: 21/06/2010 by defo


from django.core.management.base import BaseCommand, CommandError
from django.core import management 
from django.db import connection
from django.conf import settings 
import re
from optparse import make_option
from django.db.models.loading import get_apps, get_models

class Command(BaseCommand):
    '''
    Reconsturcción de tablas
    '''
    
    args = '<tabla tabla tabla>'
    help = 'Elimina las tablas'
    
    option_list = BaseCommand.option_list + (
        make_option('-s', '--simulate',
            action='store_true',
            dest='simulate',
            default=False,
            help='Simula la eliminacion'),
        make_option('-m', '--use-models', 
                    action = 'store_true',
                    default = False,
                    help = "Usa los modelos y sus relaciones para generar el orden")
        )
    
    keep = [ re.compile(exp) for exp in (r'auth_user', r'auth_session') ]
    
    def __init__(self, *largs, **kwargs):
        BaseCommand.__init__(self, *largs, **kwargs)
        from django.conf import settings
        self.cascade = False
        if settings.DATABASE_ENGINE:
            self.cascade = settings.DATABASE_ENGINE.find('postgresql') >= 0
        elif settings.DATABASES:
            db_settings = settings.DATABASES.get('default')
            self.cascade = db_settings.get('ENGINE').find('postgresql') >= 0
    
    def get_models(self, *model_names):
        models = []
        for app in get_apps():
            for model in get_models(app):
                models.append(model)
        
    
    def handle(self, *tables,  **options):
        if options.get('use_models'):
            self.get_models(tables)
        self.cursor = connection.cursor()
        current_tables = connection.introspection.table_names()
        dropable_tables = filter(lambda t: self.needs_drop(t), current_tables)
        
        
        
        
        if tables:
            if options.get('simulate'): 
                print('\n'.join([t for t in dropable_tables if t in tables]))
                return
            for table in tables:
                if table in dropable_tables:
                    self.drop(table)
        else:
            # Ya tenemos las tablas, ahora vamos a ver si neceistamos SQL de Postgres
            if options.get('simulate'): 
                print('\n'.join(dropable_tables))
                return
            for table in dropable_tables:
                self.drop(table)
                
        management.call_command('syncdb')
        
        print("OK")
        
    def drop(self, name):
        '''
        Drop a table
        '''
        try:
            sql = "DROP TABLE %s %s" % (name, self.cascade and 'CASCADE' or '')
            print("SQL:\n\t%s" % sql)
            self.cursor.execute(sql) 
        except Exception,e:
            raise e
    
    
    
    def needs_drop(self, name):
        for expr in self.keep:
            # Es una expresion regular
            if hasattr(expr, 'search'):
                if expr.search(name):
                    return False
            # Es la misma cadena
            elif expr == name:
                return False
        return True
    