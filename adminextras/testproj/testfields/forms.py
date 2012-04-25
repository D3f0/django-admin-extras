from django import forms
from adminextras.jswidgets.select_time_widget import SelectTimeWidget

class TestDateFieldForm(forms.Form):
    #===========================================================================
    # Un campo para probar la nulidad
    #===========================================================================
    hora = forms.TimeField( widget = SelectTimeWidget(use_seconds = False))
    #===========================================================================
    # Un campo para probar la no nulidad
    #===========================================================================
    hora_opcional = forms.TimeField( widget = SelectTimeWidget(use_seconds = False), 
                                     required = False)
    