from django.conf.urls.defaults import *

from views import PruebaFormularioView
 
urlpatterns = patterns('',
    (r'^$', PruebaFormularioView.as_view()),
          
)