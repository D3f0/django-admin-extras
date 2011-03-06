#!/usr/bin/env python
#-*- encoding: utf-8 -*-
# Created: 23/04/2010 by defo

import inspect
import re
from piston.resource import Resource
from piston.handler import BaseHandler

from adminextras.extjs.resource import ExtResource as Resource
import simplejson
from piston.utils import Mimer
Mimer.register(simplejson.loads, ('application/json; charset=UTF-8',))

RESOURCE_URL_PATTERNS = (r'^%s/$',
                         r'^%s\.(?P<emitter_format>.+)/?$',
                         r'^%s/(?P<emitter_format>.+)/?$',
                         )

def handler_uri(name, strip_from_name = re.compile(r'Handler$', 
                                                           re.IGNORECASE)):
    '''
    Genera el nombre de la url a partir de el nombre de la clase
    '''
    if strip_from_name:
        name = re.sub(strip_from_name, '', name)
    return name.lower()


def generate_urls_from_module(mod, 
                              base_class = BaseHandler, 
                              resource_url_patterns = RESOURCE_URL_PATTERNS):
    '''
    Busca en un módulo las urls
    '''
    def get_modules_handler_names():
        name_mapping = {}
        for name in dir(mod):
            e = getattr(mod, name, None)
        
            if inspect.isclass(e) and issubclass(e, base_class):
                if e is base_class:
                    continue
                name_mapping[ handler_uri(name) ] = e
        return name_mapping
    
    mapping = get_modules_handler_names()
    for name_for_url, handler_class in mapping.iteritems():
        for url_pat in resource_url_patterns:
            yield (url_pat % name_for_url, Resource(handler = handler_class))