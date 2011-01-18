Django Admin Extras
===================

A set of tools for django.contrib.admin application, providing Excel export,
autocomplete based on field (using jQuery UI). It depends on django-staticfiles.


Installation
============

Clone the repo, make it accesible through settings.py, for example, add these lines to 
you settings file supposing you have django-admin-extras at  the same level of your application
in your filesystem:

from os import dirname, join, abspath
import sys
sys.path.append(abspath(join(dirname(__file__), '..')))


TODO
====

Install with pip/easyinstall