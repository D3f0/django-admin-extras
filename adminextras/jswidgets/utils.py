'''
Created on 29/01/2012

@author: defo
'''
from json import dumps

def build_params(params, options, remove_param_keys = True, encode = True):
    '''Generates a dicionary or a JSON encoded version of a dictionary,
    taking its key, value pairs from  params when the pair differs from options
    (where it's supposed to have the defaults)
    @param params: The arguments (usually kwargs from some call)
    @param options: Defaults dictionary
    @param remove_param_keys: Remove params keys when a non default value is found 
    
    '''
    attrs = {}
    for name in params:
        if name in options:
            value = params.get(name)
            if value != options[name]: 
                # Not the default
                attrs[name] = value
    # Remove those keys which were not expected
    if remove_param_keys:
        map(lambda name: params.pop(name), attrs)
    if encode:
        return dumps(attrs)
    return attrs

from django.forms.widgets import MediaDefiningClass
from django.conf import settings
import re


MEDIA_PATTERN = re.compile('''
(:?\$\{
    [\w\d\.\:\[\]\(\)\"\'\,\-\_]+
\})
''', re.VERBOSE)

MEDIA_SUBST_PATTERN = re.compile(
    '''(:?
        \$\{(?P<value>[\w\.\d]+)
        (:?(?P<filters>.*))?\}
        )''',
    re.VERBOSE | re.MULTILINE
)

def get_value(s):
    '''
    Gets a value from a path, for example settings.ADMIN_MEDIA_PREFIX,
    it  imports modules and gets values from them 
    '''
    dots = s.count('.')
    if dots == 0:
        return getattr(settings, s)
    else:
        mod_pathname, attr = s.rsplit('.', 1)
        #print "Modulo, pathname", mod_pathname
        mod = __import__(mod_pathname, {}, {}, '*')
        #print "Modulo importado", mod
        return getattr(mod, attr)

class MediaSubstitutionException(Exception):
    pass

SUBINDEX = re.compile('\[(?P<index>\d+)\]')
METHOD = re.compile('(?P<name>[\d\w\_]+)\((?P<args>.*)\)')
def apply_filters(value, filters):
    '''
    Applies a set of filters to a value
    '''
    filters = filters.split(':')
    for filter in filters:
        subindex_match = SUBINDEX.search(filter)
        if subindex_match:
            index = int(subindex_match.group('index'))
            value = value[index]
            continue
        method_match = METHOD.search(filter)
        if method_match:
            method_name = method_match.group('name')
            method_args = method_match.group('args')
            method = getattr(value, method_name)
            args = eval(method_args, {})
            value = method(*args)
            continue
        raise MediaSubstitutionException("In %s could not parse %s" % (filters, filter))
    
    return value

#TODO: Manage complex subsitutions
def subst(source):
    '''
    Substitute patterns in URLs like
    ${settings.CONFIG_VALUE:split('-'):[0]}
    '''
    dest = ''
    last_end = 0
    for ptrn in MEDIA_SUBST_PATTERN.finditer(source):
        #import ipdb; ipdb.set_trace()
        dest += source[last_end:ptrn.start()]
        value_name = ptrn.group('value')
        filters = ptrn.group('filters') or ''
        value = get_value(value_name)
        value = apply_filters(value, filters)
        #print value_name, filters, value
        dest += value 
        last_end = ptrn.end()
    dest += source[last_end:]
    return dest

class MediaSubstitutionMetaclass(MediaDefiningClass):
    "Metaclass for classes that can have media definitions"
    def __new__(cls, name, bases, attrs):
        # Get class media
        Media = attrs.get('Media', None)
        if Media:
            Media.js = map(subst, Media.js)
        new_class = super(MediaSubstitutionMetaclass, cls).__new__(cls, name, bases,
                                                           attrs)
        return new_class