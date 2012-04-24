from django import forms
from adminextras.jswidgets.select_time_widget import SelectTimeWidget

class TestDateFieldForm(forms.Form):
    hora = forms.TimeField( widget = SelectTimeWidget(use_seconds = False))
    