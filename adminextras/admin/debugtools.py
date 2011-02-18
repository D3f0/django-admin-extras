# coding: utf-8
'''
Created on 17/02/2011

@author: defo
'''

from django.conf import settings
import time
from atom.http_core import HttpRequest

DEBUG_ENABLED = hasattr(settings, 'DEBUG') and settings.DEBUG #and\
                #hasattr(settings, 'HOSTS_DESARROLLO') and 

#lambda r: 

#def format_args(*largs, **kwargs):
#   
import sys


def sanitize_arg_repr(arg):
    if isinstance(arg, HttpRequest):
        return object.__str__(arg)
    return unicode(arg)
        

class DebugDecorator(object):
    '''
    A callable for debuging purposes
    '''
    def __init__(self, debug_func = lambda s: sys.stdout.write(s), timeit = False):
        self.timeit = timeit
        self.time0 = None
        self.time1 = None
        self.total_time = None
        self.debug_func = debug_func
        
    def __call__(self, func):
        def wrapped(*largs, **kwargs):
            if self.timeit:
                self.time0 = time.time()  
            retval = func(largs, kwargs)
            if self.timeit:
                self.time1 = time.time()
                self.total_time = self.time1 - self.time0
            if callable(self.debug_func):
                self.debug_func(self.build_string(func, largs, kwargs))
            return retval
        return wrapped
    
    def build_string(self, func, largs, kwargs):
        s = ("La función %s "
             " con los argumentos %s %s"
             "%s.") % (func, largs, kwargs, self.build_time())
        return s
    
    def build_time(self):
        if  not self.timeit:
            return ''
        return ' tomó %.5f segundos' % self.total_time
    
def debugargs(func):
    '''
    Decorador para imprimir los argumentos con los que se ejecuta una función
    '''
    def wrapped(*largs, **kwargs):
        print "Ejecutando %s con argumentos %s %s" % (func, largs, kwargs)
        result = func(*largs, **kwargs)
        return result
    return wrapped

debugargs_and_time = DebugDecorator(timeit=True)

if __name__ == "__main__":
    @debugargs_and_time
    def x(a, b = None, c = 'coquinio'):
        time.sleep(0.4)
        print a, b, c
        return a, b, c
    x()
    