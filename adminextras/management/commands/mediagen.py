'''
'''
from django.core.management import commands
from django.core.management.base import LabelCommand, BaseCommand, CommandError
from django.db.models.loading import get_apps
from os.path import abspath, dirname, isdir, join
from os import sep, walk
from django.conf import settings
from optparse import make_option
from glob import glob

class Command(BaseCommand):
    output_transaction = False
    can_import_settings = False
    required_model_validation = False
    help = '''
    Genrates css files which includes a set of images as classes.
    
    By default it crette a css file for each app, in the static folder
    which defines a class for every icon it finds.
    
    It should be helpful for icons packs such as famfamfam ones. 
    '''
    option_list = (
                   make_option('-i', '--image-dir', dest='image_dir',
                               default = 'img', help = "Name of the directory where images "
                               "are stored. I.e.: In '/static/img/my_cool_image.png' it would "
                               "be 'img'"),
                    make_option('-p', '--prefix', dest="prefix", 
                                default = '', help = 'CSS rule class prefix'),
                    make_option('-o', '--postfix', dest="postfix", 
                                default = '', help = 'CSS rule class postfix'),
                    make_option('-e', '--extensions', dest="extensions", action='append',
                                default = ['png', 'jpg', 'gif', ]),
    ) + BaseCommand.option_list
    
    def __init__(self):
        super(Command, self).__init__()
    
    def get_static_dirs(self):
        '''
        Iterates over media directories
        '''
        dirnames = getattr(settings, 'STATICFILES_MEDIA_DIRNAMES', None)
        if not dirnames:
            raise CommandError("Can't find STATICFILES_MEDIA_DIRNAMES in settings files")
                
        for app in get_apps():
            dir_path =  dirname(abspath(getattr(app, '__file__')))
            for static_dirname in dirnames:
                d = join(dir_path, static_dirname)
                if isdir(d):
                    yield d
    
    def get_image_dirs(self, options):
        for path in self.get_static_dirs():
            image_dir = options.get('image_dir', None)
            image_path = join(path, image_dir)
            if isdir(image_path):
                yield image_path
    
    
    def handle(self, *largs, **options):
        from PIL import Image #@UnresolvedImport
        skiped, not_images = 0, 0
        image_by_size = {}
        for image_path in self.get_image_dirs(options):
            extensions = options.get('extensions')
            files = []
            for dirpath, dirnames, filenames in walk(image_path):
                for filename in filenames:
                    fullpath = join(dirpath, filename)
                    #print fullpath
                    try:
                        i = Image.open(fullpath)
                    except IOError:
                        not_images += 1
                        continue
                        
                        continue
                    if not is_icon(i):
                        skiped += 1
                        continue 
                    size = i.size
                    if not size in image_by_size:
                        image_by_size[size] = [fullpath, ]
                    else:
                        image_by_size[size].append(fullpath)
                #print dirpath, dirnames, len(filenames) 
            #for ext in extensions:
            #    pattern = '%s%s*.%s' % (image_path, sep, ext)
            #    print pattern
            #    files += glob(pattern)
            #print files
                
        dict_list_len(image_by_size)


MAX_ICON_SIZE = 64
MIN_ICON_SIZE = 2
def is_icon(image):
    ''' Checks if an image instance looks like an icon'''
    w, h = image.size
    if w == h and w < MAX_ICON_SIZE and w > MIN_ICON_SIZE:
        return True
    return False
    
    
def dict_list_len(dict_of_lists):
    
    for key, a_list in dict_of_lists.iteritems():
        
        print  '%-8s' % 'x'.join(map(str, key)), '->', len(a_list)
        