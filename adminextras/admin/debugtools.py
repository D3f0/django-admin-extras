# encoding: utf-8
'''
Created on 17/02/2011

@author: defo
'''

from django.conf import settings
import time
from django.http import HttpRequest

DEBUG_ENABLED = hasattr(settings, 'DEBUG') and settings.DEBUG #and\
                #hasattr(settings, 'HOSTS_DESARROLLO') and 

#lambda r: 

#def format_args(*largs, **kwargs):
#   
import sys


def sanitize_arg_repr(arg):
    
    if isinstance(arg, HttpRequest):
        return '<%s object at %x>' % (type(arg).__name__, hash(arg))
    return unicode(arg)
        

class DebugDecorator(object):
    '''
    A callable for debuging purposes
    '''
    def __init__(self, debug_func = lambda s: sys.stdout.write(s + '\n'), timeit = False):
        self.timeit = timeit
        self.time0 = None
        self.time1 = None
        self.total_time = None
        self.debug_func = debug_func
        
    def __call__(self, func):
        def wrapped(*largs, **kwargs):
            if self.timeit:
                self.time0 = time.time()  
            retval = func(*largs, **kwargs)
            if self.timeit:
                self.time1 = time.time()
                self.total_time = self.time1 - self.time0
            if callable(self.debug_func):
                self.debug_func(self.build_string(func, largs, kwargs))
            return retval
        return wrapped
    
    def build_string(self, func, largs, kwargs):
        # Crear una representación agradable de la cadena
        largs_s = ', '.join(map(sanitize_arg_repr, largs))
        kwargs_s = ', '.join(['%s = %s' % (k, sanitize_arg_repr(v)) 
                              for k, v in kwargs.iteritems()])
        if hasattr(func, 'func_name'):
            func_s = func.func_name
        elif hasattr(func, 'im_func'):
            func_s = func.im_func.func_name
        else:
            func_s =  repr(func)
            
        s = (u"La funcion %s" 
             "con los argumentos %s %s"
             "%s") % (func_s, largs_s, kwargs_s, self.build_time())
        s = s.replace('\n', '').encode('utf-8')
        return s
    
    def build_time(self):
        if  not self.timeit:
            return ''
        return u' tomó %.5f segundos' % self.total_time
    
debugargs = DebugDecorator(timeit=False)

debugargs_and_time = DebugDecorator(timeit=True)

if __name__ == "__main__":
    @debugargs
    def x(a, b = None, c = 'coquinio'):
        time.sleep(0.4)
        print a, b, c
        return a, b, c
    x(1)
    @debugargs_and_time
    def y(a, b = None, c = 'coquinio'):
        time.sleep(0.4)
        print a, b, c
        return a, b, c
    y('foo')
    
    