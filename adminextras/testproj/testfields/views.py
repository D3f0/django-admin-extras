from django.views.generic import FormView
from forms import TestDateFieldForm 

class PruebaFormularioView(FormView):
    form_class = TestDateFieldForm
    template_name = 'testfields/forms.html'