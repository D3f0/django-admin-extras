# coding: utf-8
import xlwt
from datetime import date, time, datetime
from django.db import models
from cStringIO import StringIO
from django.utils.datastructures import SortedDict
from django.conf import settings
from itertools import *
from django.http import HttpResponse
from django.utils.encoding import smart_str
from decimal import Decimal

'''
Estilos para las planillas
''' 
default = xlwt.XFStyle()
excel_date_fmt = 'D/M/YY'
style = xlwt.XFStyle()
style.num_format_str = excel_date_fmt

QUERYSET_LIMIT = 100
FORMATO_FECHA = settings.DATE_INPUT_FORMATS[0]
FORMATO_FECHA_ARCHIVO = '%d-%m-%Y'

decimal_style = xlwt.easyxf("", "#,###.00")


def _dump_cellval(value):
    if isinstance(value, basestring):
        return value, default
    elif isinstance(value, date):
        return value.strftime(FORMATO_FECHA), style
    elif isinstance(value, Decimal):
        return value, decimal_style
    elif isinstance(value, bool):
        return (value and "Sí" or "No"), default
    elif isinstance(value, models.Model):
        return unicode(value), default
    else:
        return value, default

# Pasar a títulos
title_case = lambda t: (t.lower() == t) and t.title() or t

def get_excel_fields(model_admin, request = None):
    #from ipdb import set_trace; set_trace()
    final_fields = []
    model = model_admin.model
    model_fields = map(lambda f: f.name, model._meta.fields)
    #valid_field = lambda f: f in model_fields or hasattr(model, f)
    if callable(model_admin.excel_exclude):
        exclude = model_admin.excel_exclude(request)
    else:
        exclude = model_admin.excel_exclude
        
    if callable(model_admin.excel_fields):
        include = model_admin.excel_fields(request)
    else:
        include = model_admin.excel_fields
    
         
    if exclude:
        if include:
            print "Include y exclude"
            for i in include:
                if hasattr(model, i) and not i in exclude:
                    final_fields.append(i)
        else: # No include
            print "Solo exclude"
            final_fields = filter(lambda f: not f in exclude, model_fields)
        
    elif include:
        # Solo los definidos
        print "Solo include"
        for i in include:
            
            if i in model_fields or hasattr(model, i):
                final_fields.append(i)
        print "Al final", final_fields
    else:
        print "Sin campos de excel definidos"
        final_fields = model_fields
    
    print "Final fields:", final_fields
    def rip_fields(name, a_list):
        if name in a_list and name not in include:
            a_list.pop(a_list.index(name))
        return a_list
    
    # Quitar el campo ID no necesario
    rip_fields('id', final_fields)
    
    def get_field_title(name):
        if name in model_fields:
            return model._meta.get_field(name).verbose_name
        else:
            f = getattr(model, name)
            short_description = getattr(f, "short_description")
            if short_description:
                return short_description
            return name 
    return SortedDict(map(lambda name: (name, get_field_title(name)), final_fields))
    
    

def to_excel_admin_action(modeladmin, request, queryset):
    '''
    Exportar a excel
    '''
    #queryset.update(status='p')
    estilo_titulos = xlwt.easyxf('font: bold on; align: wrap on, vert centre, horiz center')
    model_meta = modeladmin.model._meta
    f = StringIO()
    
    #nombres = SortedDict(map(lambda f: (f.name, f.verbose_name), model_meta.fields))
    nombres = get_excel_fields(modeladmin)
    
    
    planilla = xlwt.Workbook(encoding='utf-8')
    
    
    nombre = unicode(model_meta.verbose_name_plural)
    hoja = planilla.add_sheet(nombre)
    
    fecha = datetime.now().strftime(FORMATO_FECHA_ARCHIVO)
    fname = 'Listado de %s %s.xls' % (nombre, fecha)
    fname = fname.replace(' ', '_')
    #fname = 'Listado.xls' 
    
    cantidad = queryset.count()
    qs = queryset.all()
    
    iter_inicio = xrange(0, cantidad, QUERYSET_LIMIT)
    iter_fin = xrange(QUERYSET_LIMIT, cantidad + QUERYSET_LIMIT, QUERYSET_LIMIT)
    
    fila = 0
    hoja.write_merge(fila, fila, 0, len(nombres), title_case(nombre), estilo_titulos)
    
    fila = 1
    for pos, nombre in enumerate(nombres.keys()):
        titulo = title_case(nombres[nombre])
        hoja.write(fila, pos, titulo, estilo_titulos)
        
    fila = 2
    for inicio, fin in izip(iter_inicio, iter_fin):
        qs_slice =  qs[inicio: fin]
        for obj in qs_slice.all():
            
            for pos, nombre in enumerate(nombres.keys()):
                valor, estilo = _dump_cellval(getattr(obj, nombre, ''))
                if callable(valor):
                    valor = valor()
                hoja.write(fila, pos, valor, estilo)
                
            fila += 1
    
    planilla.save(f)
    f.seek(0)
    
    
    response = HttpResponse(f.getvalue(),  mimetype="application/ms-excel")
    response['Content-Disposition'] = 'attachment; filename=%s' % smart_str(fname)
    return response
    
to_excel_admin_action.short_description = "Exportar planilla XLS de los elementos seleccionados"
