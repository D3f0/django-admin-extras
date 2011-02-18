#!/usr/bin/env python
#
# http://www.djangosnippets.org/snippets/1457/
# based on http://www.djangosnippets.org/snippets/662/
# 
# Author:  <greencm@gmail.com>
#
# Purpose: Given a set of classes, sort them such that ones that have
#          ForeignKey relationships with later keys are show up after
#          the classes they depend on
#
# Created: 12/27/07
#
# Modified: 3/20/08
#
# Graham King added the abilility to walk other ManyToMany
# relationships as well as handling fixtures such as content types
#
# Modified: 4/21/09
# Dave Brondsema made it work as a Django management command
# and added ability to exclude apps or models.

import sys
from django.db import models

from django.core.management.base import CommandError
from django.core import serializers


# Original topological sort code written by Ofer Faigon
# (www.bitformation.com) and used with permission
def foreign_key_sort(items):
    """Perform topological sort.
       items is a list of django classes
       Returns a list of the items in one of the possible orders, or None
       if partial_order contains a loop.
    """

    def add_node(graph, node):
        """Add a node to the graph if not already exists."""
        if not graph.has_key(node):
            graph[node] = [0] # 0 = number of arcs coming into this node.

    def add_arc(graph, fromnode, tonode):
        """Add an arc to a graph. Can create multiple arcs.
           The end nodes must already exist."""
        graph[fromnode].append(tonode)
        # Update the count of incoming arcs in tonode.

        graph[tonode][0] = graph[tonode][0] + 1
    # step 1 - create a directed graph with an arc a->b for each input
    # pair (a,b).
    # The graph is represented by a dictionary. The dictionary contains
    # a pair item:list for each node in the graph. /item/ is the value
    # of the node. /list/'s 1st item is the count of incoming arcs, and
    # the rest are the destinations of the outgoing arcs. For example:
    #           {'a':[0,'b','c'], 'b':[1], 'c':[1]}
    # represents the graph:   c <-- a --> b
    # The graph may contain loops and multiple arcs.
    # Note that our representation does not contain reference loops to
    # cause GC problems even when the represented graph contains loops,
    # because we keep the node names rather than references to the nodes.
    graph = {}

    # iterate once for the nodes
    for v in items:
        add_node(graph, v)

    # iterate again to pull out the dependency information
    for a in items:

        rel_lst = related_field_filter(a._meta.fields)    # Add foreign keys
        rel_lst.extend( a._meta.many_to_many )            # Add many to many
        
        for b in rel_lst:
            # print "adding arc %s <- %s" % (b.rel.to, a)
            add_arc(graph, b.rel.to, a)
        

    # Step 2 - find all roots (nodes with zero incoming arcs).
    roots = [node for (node,nodeinfo) in graph.items() if nodeinfo[0] == 0]

    # step 3 - repeatedly emit a root and remove it from the graph. Removing
    # a node may convert some of the node's direct children into roots.
    # Whenever that happens, we append the new roots to the list of
    # current roots.
    sorted = []
    while len(roots) != 0:
        # If len(roots) is always 1 when we get here, it means that
        # the input describes a complete ordering and there is only
        # one possible output.
        # When len(roots) > 1, we can choose any root to send to the
        # output; this freedom represents the multiple complete orderings
        # that satisfy the input restrictions. We arbitrarily take one of
        # the roots using pop(). Note that for the algorithm to be efficient,
        # this operation must be done in O(1) time.

        root = roots.pop()
        sorted.append(root)
        for child in graph[root][1:]:
            graph[child][0] = graph[child][0] - 1
            if graph[child][0] == 0:
                roots.append(child)
        del graph[root]

    if len(graph.items()) != 0:
        # There is a loop in the input.
        raise CircularReferenceException, "Circular Dependency Detected in Input. %s" % graph.items()
    
    return sorted


# Problem: 
#

class CircularReferenceException(Exception):
    pass


def isclass(obj):
    if str(obj).find("<class") == 0:
        return True
    return False
    
def find_classes(module):
    classes = []

    for k,obj in module.__dict__.iteritems():
        if isclass(obj):
            # print k, "is a class!"
            classes.append(obj)

    return classes

def model_filter(lst):
    """ Given a list of classes, Filter out everything that's not an instance of models.Model """
    return filter(lambda x: issubclass(x, models.Model), lst)

def related_field_filter(lst):
    """ given a list of fields, return the ones that are related """

    ret = []
    for f in lst:
        s = str(f)
        if s.find('django.db.models.fields.related') >= 0:
            ret.append(f)

    return ret


from django.core.management.base import BaseCommand
from optparse import OptionParser, make_option
from django.db.models import get_app, get_apps, get_models

class Command(BaseCommand):
    option_list = BaseCommand.option_list + (make_option('--format', default='json', dest='format',
                               help='Specifies the output serialization format for fixtures.'),
                   make_option('--indent', default=None, dest='indent', type='int',
                               help='Specifies the indent level to use when pretty-printing output'),
                   make_option('-e', '--exclude', default=[], dest='exclude',action='append',
                               help='Exclude appname or appname.Model (you can use multiple --exclude)'),
                   )
     
    help = 'Output the contents of the database as a fixture of the given format.'
    args = '[appname ...]'

    def handle(self, *app_labels, **options):
        excluded_apps = [get_app(app_label) for app_label in options['exclude'] if "." not in app_label]
        excluded_models = [model.split('.') for model in options['exclude'] if "." in model]
        
        if len(app_labels) == 0:
            app_list = [app for app in get_apps() if app not in excluded_apps]
        else:
            app_list = [get_app(app_label) for app_label in app_labels]

        # Check that the serialization format exists; this is a shortcut to
        # avoid collating all the objects and _then_ failing.
        if options['format'] not in serializers.get_public_serializer_formats():
            raise CommandError("Unknown serialization format: %s" % options['format'])

        try:
            serializers.get_serializer(options['format'])
        except KeyError:
            raise CommandError("Unknown serialization format: %s" % options['format'])

        objects = []
        models = []
        for app in app_list:
            app_name = app.__name__.split('.')[-2] # assuming -1 is 'models' and -2 is name
            models.extend( [model for model in get_models(app) if [app_name, model.__name__] not in excluded_models] )
        models = foreign_key_sort(models)

        for model in models:
            objects.extend(model._default_manager.all())
        
        try:
            print serializers.serialize(options['format'], objects, indent=options['indent'])
        except Exception, e:
            if options['traceback']:
                raise
            raise CommandError("Unable to serialize database: %s" % e)
