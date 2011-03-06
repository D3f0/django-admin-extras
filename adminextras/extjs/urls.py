#!/usr/bin/env python
#-*- encoding: utf-8 -*-
# Created: 08/04/2010 by defo


from django.conf.urls.defaults import *
from piston.resource import Resource

from dfuelerp.apps.api.handlers import *
from dfuelerp.apps.api.handlers import *
from dfuelerp.apps.api import handlers
from dfuelerp.apps.api.urltools import generate_urls_from_module
from dfuelerp.apps.api.views import generic_create_update
from dfuelerp.apps.api.views import get_form_defs
from dfuelerp.apps.api.views import dump_queryset

#pprint.pprint(list(generate_urls_from_module(handlers)))

urlpatterns = patterns('',
                       *generate_urls_from_module(handlers)
)

urlpatterns += patterns('',
                       (r'^form/(?P<form_name>[\w\d]+|[\w\d]+\.[\w\d]+)/(:?(?P<pk>[\d\w]+)/?)?$', 
                            generic_create_update, ),
                       (r'^forms/$', get_form_defs, ),
                       (r'^dump_fk/$', dump_queryset, ),
                       (r'^dump_fk/(?P<resource>[\w\\d_]+)/?$', dump_queryset, ),
                       #(r'^form/(?P<form_name>[\w\d\.]+)/(?P<pk>\d{1,9})/?$', generic_update, ),
)