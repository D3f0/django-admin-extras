from setuptools import setup, find_packages

setup(
    name='django-admin-extras',
    version=__import__('adminextras').__version__,
    description='Common ground for some apps.',
    long_description=open('README.rst').read(),
    # Get more strings from http://www.python.org/pypi?:action=list_classifiers
    author='Nahuel Defossé',
    author_email='nahuel.defosse+django-admin-extras@gmail.com',
    url='http://D3f0.github.com/django-admin-extras/',
    download_url='http://github.com/D3f0/django-admin-extras/downloads',
    license='BSD',
    packages=find_packages(exclude=['ez_setup']),
    include_package_data=True,
    zip_safe=False, # because we're including media that Django needs
    classifiers=[
        'Development Status :: 4 - Beta',
        'Environment :: Web Environment',
        'Framework :: Django',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: BSD License',
        'Operating System :: OS Independent',
        'Programming Language :: Python',
        'Topic :: Software Development :: Libraries :: Python Modules',
    ],
)