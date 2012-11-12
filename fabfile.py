from fabric.api import *
import os

def _find(pattern, basedir='.'):
    for dirpath, dirnames, filenames in os.walk(basedir):
        print dirpath, dirnames, filenames
    

def remove_jquery_ui_version():
    '''Removes versions from JS and CSS files'''
    
    for f in _find('.*')