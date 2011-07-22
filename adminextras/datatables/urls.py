from django.conf.urls.defaults import patterns
import views
urlpatterns = patterns('',
    # AJAX listings
    ('^list/?$', views.jq_datatable),
    
    # Returns the form HTML
    ('^forms?/?$', views.get_from), 
    
    #    
                       
)