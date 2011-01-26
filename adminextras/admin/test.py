

import sys, os
from os.path import join, abspath, dirname
path = abspath(join(dirname(__file__), '..', 'testproj'))
print path
sys.path.append(path)

import settings #@UnresolvedImport
from django.core.management import setup_environ
setup_environ(settings)

from django.http import QueryDict
from widgets import EmptyCheckboxSelectMultiple
from django import forms

class TestForm(forms.Form):
    empty_field = forms.ModelMultipleChoiceField(widget = EmptyCheckboxSelectMultiple) 
    
    