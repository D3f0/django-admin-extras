# encoding: utf-8

from django.db import models
from django.db.models.loading import get_model
from django.conf import settings
import datetime
try:
    from simplejson import dumps as json_dumps
except ImportError:
    from json import dumps as json_dumps
from django.http import HttpResponse
import traceback
from django.utils.encoding import smart_unicode
from django.template.loader import render_to_string
from django.template.context import RequestContext
from django.utils.safestring import mark_safe

class DataTableArgumentsException(Exception):
    pass

class InvalidColumn(DataTableArgumentsException):
    pass

class InvalidModel(DataTableArgumentsException):
    pass

class ResourceNotFound(DataTableArgumentsException):
    pass

def _get_datatable_queryset(sResource):
    '''
    Gets the reousrce the datatable wants to list
    It could be a model or an admin class
    @return: A queryset
    '''
    # TODO: Get the queryset from an admin instance
    if not sResource:
        raise InvalidModel(u"Missing sResource argument.")
    
    app_name, model_name = sResource.split('.')
    model = get_model(app_name, model_name)
    if not model:
        raise ResourceNotFound("%s did not match any resource" % sResource)
    #import ipdb; ipdb.set_trace()
    # Defaul manager
    return model.objects


def _debug_sorting_args(request):
    d, req = {}, request.REQUEST # Aliased shortcuts
    for  key in filter(lambda s: s.count('Sort'), req.keys()):
        d[key] = req[key]
    return d


class DataTableResponse(dict):
    '''
    A generic dict which accepts JavaScirpt like.
    '''
    def __setattr__(self, name, value):
        self.__setitem__(name, value)

    def __getattr__(self, name):
        return self.__getitem__(name)
    
DATE_FORMAT = settings.DATE_INPUT_FORMATS[0] or '%d/%m/%Y'

def attribute_getter(instance, name):
    '''
    Callable called for conversion
    '''
    try:
        data = getattr(instance, name)
        if isinstance(data, (datetime.date,)):
            return data.strftime(DATE_FORMAT)
        elif isinstance(data, (models.Model, )):
            #return [data.pk, unicode(data)]
            return data
        elif callable(data):
            data = data()
            
    except AttributeError:
        return "Not in model"
    return data

class DataTableRequest(object):
    ''' 
    Simplify DataTable request management
     
        * Proxyfy iField sField bField so type conversions are made implicitly inside this class
        * Get order_by fields
        * Dump queryset (it's arguable if this methods belongs here, but we have all the needed
            infrmation in instances of this class, so it fit quite well here rather than laying
            as a flat function).
    
    '''
    def __init__(self, request):
        self._request = request.REQUEST # We don't care about GET/POST
        self._cache = {}
        
    def __getattr__(self, name): 
        if not name in self._cache:
            self._cache[name]  = self.get_data(name)
        return self._cache[name]
    
    
    def get_data(self, name):
        if not name in self._request:
            raise KeyError("%s not in request" % name)
        type_, data = name[0], self._request[name]
        if type_ == 'i':
            return int(data)
        elif type_ == 'b':
            if data.lower() == 'false':
                return False
            return True
        # s is the default case
        return data
    
    def __str__(self):
        return "<DataTable Request Wrapper for %s>" % self._request
    
    COLUMN_SPLITTER = ','
    
    _columns = None
    @property
    def columns(self):
        ''' Proxy for columns '''
        if not self._columns:
            self._columns = self.sColumns.split(self.COLUMN_SPLITTER)
        return self._columns
    
    
    _order_by_fields = None
    @property
    def order_by_fields(self):
        '''
        Process request's iSort... fields into a valid QuerySet ordery_by(*fields)
        arguemnts. 
        '''
        
        if not self._order_by_fields:
            # Calculte order by fields
            self._order_by_fields = []
            
            for n_col in range(self.iSortingCols):
                #col_number = int(request.REQUEST.get('iSortCol_%d' % i))
                col_number = getattr(self, 'iSortCol_%d' % n_col)
                
                direction = getattr(self, 'sSortDir_%d' % n_col)
                column = self.columns[col_number]
                column = column.replace('.', '__') # Query  lookups
                if direction == u'asc':
                    pass 
                elif direction == u'desc':
                    column = '-%s' % column
                else:
                    continue
                self._order_by_fields.append(column)
        
        return self._order_by_fields
                
        
                        
    def dump_queryset_data(self, queryset, pks_as_ids = True, row_class = None, 
                           attribute_getter = attribute_getter, 
                           in_depth = True):
        '''
        Converts a a model instance into a jsonizable dictionary.
        
        '''
        result = []
        for instance in queryset:
            row = {}
            # Row data
            if pks_as_ids:
                row.update(DT_RowId = 'PK_%s' % instance.pk)
            if isinstance(row_class, basestring):
                row.update(DT_RowClass = row_class)
            elif callable(row_class):
                row.update(DT_RowClass = row_class(instance))
            # Row fields
            for number, name in enumerate(self.columns):
                # Get dot separated elements (depath search)
                if in_depth:
                    #import ipdb; ipdb.set_trace()
                    data = instance
                    for attr_name in name.split('.'):
                        data = attribute_getter(data, attr_name)
                    if isinstance(data, models.Model):
                        data = smart_unicode(data)
                    row[number] = data
                else:
                    row[number] = attribute_getter(instance, name)
            result.append(row)
        return result



def jq_datatable(request, queryset = None):
    '''
    Datatable JSON view generator
    Some of the request parameteres are:
    
        sEcho, 
        iColumns,
        sColumns, (comma separated)
        iDisplayStart, 
        iDisplayLength, 
        sSearch, 
        bRegex, 
        sSearch_0, 
        bRegex_0, 
        bSearchable_0, 
        sSearch_1, 
        bRegex_1, 
        bSearchable_1, 
        sSearch_2, 
        bRegex_2, 
        bSearchable_2, 
        iSortingCols, 
        iSortCol_0, 
        sSortDir_0, 
        bSortable_0, 
        bSortable_1, 
        bSortable_2, 
        sMmodel: ...
    '''
    result = DataTableResponse(
                               # We expect it to succeed :)
                               bSuccess = True,
                               # So there won't be any error msg
                               sError = '',
            )
    try:
        # Create the proxy for the DataTable Request
        dt_request = DataTableRequest(request)
        
        # Get echo number
        result.sEcho = dt_request.sEcho
        
        
        if not queryset:
            # Get queryset
            resource = _get_datatable_queryset(dt_request.sResource)
        elif isinstance(object, models.query.QuerySet):
            resource = queryset
    
        # Tomar el inicio y el fin de la paginación
        start = dt_request.iDisplayStart
        length = dt_request.iDisplayLength
    
        # Sorting (order_by)
        
        print "Sorting args: ", dt_request.order_by_fields
        qs = resource.order_by(*dt_request.order_by_fields)
        # Return the client the amount of records available
        result.iTotalRecords = result.iTotalDisplayRecords = qs.count()
        
        qs = qs[start: start+length]
        
        # Get data    
        result.aaData = dt_request.dump_queryset_data(qs, pks_as_ids = True)
    
    except Exception, e:
        
        result.update(
                      bSuccess = False,
                      sError = unicode(e).encode('utf-8'),
                      )
        if settings.DEBUG:
            result.update(sTraceback = traceback.format_exc())
    #print "La respuesta es: ", pformat(result)
    return HttpResponse(json_dumps(result))


def get_from(request):
    # TODO: Better HTML
    ''' Gets a form from request '''
    form_name = request.REQUEST.get('form', None)
    if not form_name:
        return HttpResponse("Falta el form")
    try:
        from_path, form_class = form_name.rsplit('.', 1)
        m = __import__(from_path, {}, {}, '*')
        Form = getattr(m, form_class)
        form = Form()
        
    except (ImportError, AttributeError), e:
        return HttpResponse("<h3>No se pudo encontrar el modulo %s</h3>" % form_name)
    
    form_html = render_to_string('datatables/forms/form.html', dict(form = form))
    return HttpResponse(mark_safe(form_html))
        
