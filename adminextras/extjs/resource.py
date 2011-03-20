'''
Created on 26/05/2010

@author: defo
'''
from django.conf import settings
from django.core.mail import send_mail, EmailMessage
from django.http import HttpResponse, Http404, HttpResponseNotAllowed, \
    HttpResponseForbidden, HttpResponseServerError
from django.views.debug import ExceptionReporter
from django.views.decorators.vary import vary_on_headers
from emitters import Emitter
from piston.authentication import NoAuthentication
from piston.doc import HandlerMethod
from piston.handler import typemapper
from piston.resource import Resource
from piston.utils import Mimer, coerce_put_post, FormValidationError, \
    HttpStatusCode, rc, format_error, translate_mime, MimerDataException
import sys



class ExtResource(Resource):
    # Comentado
    @vary_on_headers('Authorization')
    def ___call__(self, request, *args, **kwargs):
        """
        NB: Sends a `Vary` header so we don't cache requests
        that are different (OAuth stuff in `Authorization` header.)
        """
        #from ipdb import set_trace; set_trace()
        rm = request.method.upper()

        # Django's internal mechanism doesn't pick up
        # PUT request, so we trick it a little here.
        if rm == "PUT":
            coerce_put_post(request)

        if not self.authentication.is_authenticated(request):
            if hasattr(self.handler, 'anonymous') and \
                callable(self.handler.anonymous) and \
                rm in self.handler.anonymous.allowed_methods:

                handler = self.handler.anonymous()
                anonymous = True
            else:
                return self.authentication.challenge()
        else:
            handler = self.handler
            anonymous = handler.is_anonymous
        
        # Translate nested datastructs into `request.data` here.
        if rm in ('POST', 'PUT'):
            try:
                #from ipdb import set_trace; set_trace()
                translate_mime(request)
            except MimerDataException:
                pass
                #print "Error de Mime"
                #return rc.BAD_REQUEST
        
        if not rm in handler.allowed_methods:
            return HttpResponseNotAllowed(handler.allowed_methods)
        
        meth = getattr(handler, self.callmap.get(rm), None)
        
        if not meth:
            raise Http404

        # Support emitter both through (?P<emitter_format>) and ?format=emitter.
        em_format = self.determine_emitter(request, *args, **kwargs)

        kwargs.pop('emitter_format', None)
        
        # Clean up the request object a bit, since we might
        # very well have `oauth_`-headers in there, and we
        # don't want to pass these along to the handler.
        request = self.cleanup_request(request)
        
        try:
            result = meth(request, *args, **kwargs)
        except FormValidationError, e:
            # TODO: Use rc.BAD_REQUEST here
            return HttpResponse("Bad Request: %s" % e.form.errors, status=400)
        except TypeError, e:
            result = rc.BAD_REQUEST
            hm = HandlerMethod(meth)
            sig = hm.get_signature()

            msg = 'Method signature does not match.\n\n'
            
            if sig:
                msg += 'Signature should be: %s' % sig
            else:
                msg += 'Resource does not expect any parameters.'

            if self.display_errors:                
                msg += '\n\nException was: %s' % str(e)
                
            result.content = format_error(msg)
        except HttpStatusCode, e:
            #result = e ## why is this being passed on and not just dealt with now?
            return e.response
        except Exception, e:
            """
            On errors (like code errors), we'd like to be able to
            give crash reports to both admins and also the calling
            user. There's two setting parameters for this:
            
            Parameters::
             - `PISTON_EMAIL_ERRORS`: Will send a Django formatted
               error email to people in `settings.ADMINS`.
             - `PISTON_DISPLAY_ERRORS`: Will return a simple traceback
               to the caller, so he can tell you what error they got.
               
            If `PISTON_DISPLAY_ERRORS` is not enabled, the caller will
            receive a basic "500 Internal Server Error" message.
            """
            exc_type, exc_value, tb = sys.exc_info()
            rep = ExceptionReporter(request, exc_type, exc_value, tb.tb_next)
            if self.email_errors:
                self.email_exception(rep)
            if self.display_errors:
                return HttpResponseServerError(
                    format_error('\n'.join(rep.format_exception())))
            else:
                raise

        emitter, ct = Emitter.get(em_format)
        srl = emitter(result, typemapper, handler, handler.fields, anonymous)

        try:
            """
            Decide whether or not we want a generator here,
            or we just want to buffer up the entire result
            before sending it to the client. Won't matter for
            smaller datasets, but larger will have an impact.
            """
            if self.stream: stream = srl.stream_render(request)
            else: stream = srl.render(request)

            resp = HttpResponse(stream, mimetype=ct)

            resp.streaming = self.stream

            return resp
        except HttpStatusCode, e:
            return e.response
