from django.db import models
from django.db.models import signals

class Persona(models.Model):
    nombre = models.CharField(max_length = 50)
    def __unicode__(self):
        return self.nombre
    

def crear_personas(*largs, **kwargs):
    if not Persona.objects.count():
        for i in range(2000):
            pass


signals.post_syncdb.connect(crear_personas)