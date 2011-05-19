#!/usr/bin/env python
#-*- encoding: utf-8 -*-
# Created: 23/05/2010 by defo

# Taken from
# http://www.mattdorn.com/content/restful-web-apps-with-django-piston-and-ext-js/
# Credits goes to Mat Dorn

from django.utils import simplejson, datetime_safe
from django.core.serializers.json import DateTimeAwareJSONEncoder
from django.conf import settings
from piston.emitters import Emitter
import datetime

import logging

from django.utils.functional import Promise
from django.utils.translation import force_unicode
from django.utils.simplejson import JSONEncoder
from django.http import HttpResponse


class JsonEncoder(DateTimeAwareJSONEncoder):
    def default(self, o):
        if isinstance(o, Promise):
            return force_unicode(o)
#        elif isinstance(o, datetime.datetime):
#            d = datetime_safe.new_datetime(o)
#            return d.strftime("%s %s" % (self.DATE_FORMAT, self.TIME_FORMAT))
        return DateTimeAwareJSONEncoder.default(self, o)

MAX_FILTER_COUNT = 10

class SortingFilteringEmmiter(Emitter):
    '''
    Handles request sorting and filtering
    '''
    DEFAULT_QUERYSET_LENGTH = 100
    
    def debug_filter(self, request):
        # TODO: Checkear el modo debug
        for name in filter(lambda v: v.startswith('filter'), request.GET.keys()):
            print name
            print request.GET.get(name, None)
        #print "Filter"
        
    def get_filter_params(self, request):
        '''
        Tomar los argumentos del request
        '''
        q = {}
        for i in range(0, MAX_FILTER_COUNT):
            field = request.GET.get('filter[%d][field]' % i, None)
            if not field:
                break
            filter_type = request.GET.get('filter[%d][data][type]' % i, None)
            filter_val = request.GET.get('filter[%d][data][value]' % i, None)
            
            if filter_type == 'string':
                q[str('%s__icontains' % field)] = filter_val
            elif filter_type in ('numeric', 'date'):
                comp = filter_type = request.GET.get('filter[%d][data][comparison]' % i)
                if comp is 'eq':
                    q[str('%s' % field)] = filter_val
                else:
                    q[str('%s__%s' % (field, comp))] = filter_val
        #logging.warning(q)
        return q
    
    def sort_and_filter_data(self, request):
        '''
        Ordernar el QuerySet en función de los parametros del request:
            start -> int
            limit -> int
            sort -> str
            dir -> ASC, DESC
        '''
        message = 'OK'
        
        query = self.get_filter_params(request)
        if query:
            print query
            self.data = self.data.filter(**query)
        # Obtener el total
        total = self.data.count()
        
        try:
            start = int(request.REQUEST.get('start', 0))
            limit = request.REQUEST.get('limit', None)
            if isinstance(limit, basestring):
                limit = int(limit)
                if limit <= 0:
                    end = None
                else:
                    end = start + int(limit)
            else:
                end = self.DEFAULT_QUERYSET_LENGTH
        except:
            message = 'Index error, first %d entries' % self.DEFAULT_QUERYSET_LENGTH
            start = 0
            end = None
            
        order_by = request.REQUEST.get('sort', '')
        direction = request.REQUEST.get('dir', '')
        direction = direction == 'DESC' and '-' or ''
        if order_by:
            self.data = self.data.order_by(direction + order_by)
        
        self.data = self.data[start:end]
        
        return total, message


class ExtJSONEmitter(SortingFilteringEmmiter):
    """
    JSON emitter, understands timestamps, wraps result set in object literal
    for Ext JS compatibility
    """
                
    def render(self, request):
        #from ipdb import set_trace; set_trace()
        data, cb = {}, None
        #print "Emitter serializando"
        if request.method == 'GET':
            # Serializar un queryset
            total, message = self.sort_and_filter_data(request)
                    
            cb = request.GET.get('callback')
            data.update(success = True, 
                        data = self.construct(), 
                        message = message, 
                        total = total
                        )
        else:
            data = self.data
        #print "Serializando", data
        seria = simplejson.dumps(data, cls=JsonEncoder, ensure_ascii=False, indent=4)
        #print "Metodo", seria
        # Callback
        if request.method == "GET" and cb:
            return '%s(%s)' % (cb, seria)
        return seria

if settings.DEBUG:
    fmt = 'text/plain; charset=utf-8'
else:
    fmt = 'application/json; charset=utf-8'


class MSExcelEmitter(SortingFilteringEmmiter):
    def render(self, request):
        total, message = self.sort_and_filter_data(request)
        import xlwt
        from cStringIO import StringIO
        f = StringIO()
        #workbook = xlwt.Workbook()
        f.write('\n'.join(map(unicode, self.construct())))
        f.seek(0)
        return f.read()

Emitter.register('json', ExtJSONEmitter, fmt)
Emitter.register('xls', MSExcelEmitter)

class ExtJSFormEmitter(Emitter):
    def render(self, request):
        handler = self.handler
        Form = handler.form
        form = Form()
        FormSet = handler.formset
        if FormSet:
            formset = FormSet()
        fields = []
        for name, field in form.fields.iteritems():
            fields.append({'name': name, })
        return simplejson.dumps(fields)

Emitter.register('jsform', ExtJSFormEmitter)


class JsonResponse(HttpResponse):
    def __init__(self, *args, **kwargs):
        pass
    
class SimpleJsonResponse(HttpResponse):
    def __init__(self, d = None, **args):
        if d:
            args = d.update(args)
        content = simplejson.dumps(args, cls=JsonEncoder, ensure_ascii=False, indent=4)
        HttpResponse.__init__(self, content, mimetype = "application/json")