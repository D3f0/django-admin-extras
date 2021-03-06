'''
Created on 13/02/2011

@author: defo
'''


from django.core.management import BaseCommand
from optparse import make_option
import os
from django.core.management.base import CommandError


class Command(BaseCommand):
    
    option_list = (
                   make_option('-U', '--user',
                               default = 'postgres', help = "Username"
                               ),
                   make_option('--passwd',
                               default = 'postgres', help = "Password"
                               ),
                   make_option('-n', '--name',
                               default = 'psycopg2_test', help = "DB Name"
                               ),
                    make_option('-H', '--host',
                               default = 'psycopg2_test', help = "Hostname"
                               ),
                    make_option('-p', '--port', type=int,
                               default = 5432, help = "DB Port"
                               ),
    ) + BaseCommand.option_list
    
    def handle(self, *largs, **opts):
        os.environ['PSYCOPG2_TESTDB']  = opts.get('name')
        os.environ['PSYCOPG2_TESTDB_HOST'] = opts.get('host')
        os.environ['PSYCOPG2_TESTDB_PORT'] = str(opts.get('port'))
        os.environ['PSYCOPG2_TESTDB_USER'] = opts.get('passwd')
        try:
            from pyscopg2 import tests
        except ImportError, e:
            import traceback; print(traceback.format_exc())
            raise CommandError("Iport Error, " + str(e))
        