/**
 * @class Ext.state.CookieProvider
 * @extends Ext.state.Provider
 * A Provider implementation which saves and retrieves state via cookies.
 * The CookieProvider supports the usual cookie options, such as:
 * <ul>
 * <li>{@link #path}</li>
 * <li>{@link #expires}</li>
 * <li>{@link #domain}</li>
 * <li>{@link #secure}</li>
 * </ul>
 <pre><code>
   var cp = new Ext.state.CookieProvider({
       path: "/cgi-bin/",
       expires: new Date(new Date().getTime()+(1000*60*60*24*30)), //30 days
       domain: "extjs.com"
   });
   Ext.state.Manager.setProvider(cp);
 </code></pre>
 
 
 * @cfg {String} path The path for which the cookie is active (defaults to root '/' which makes it active for all pages in the site)
 * @cfg {Date} expires The cookie expiration date (defaults to 7 days from now)
 * @cfg {String} domain The domain to save the cookie for.  Note that you cannot specify a different domain than
 * your page is on, but you can specify a sub-domain, or simply the domain itself like 'extjs.com' to include
 * all sub-domains if you need to access cookies across different sub-domains (defaults to null which uses the same
 * domain the page is running on including the 'www' like 'www.extjs.com')
 * @cfg {Boolean} secure True if the site is using SSL (defaults to false)
 * @constructor
 * Create a new CookieProvider
 * @param {Object} config The configuration object
 */
Ext.define('Ext.state.CookieProvider', {
    extend: 'Ext.state.Provider',
    
    constructor : function(config){
        var me = this;
        
        Ext.state.CookieProvider.superclass.constructor.call(me);
        me.path = "/";
        me.expires = new Date(new Date().getTime()+(1000*60*60*24*7)); //7 days
        me.domain = null;
        me.secure = false;
        Ext.apply(me, config);
        me.state = me.readCookies();
    },
    
    // private
    set : function(name, value){
        var me = this;
        
        if(typeof value == "undefined" || value === null){
            me.clear(name);
            return;
        }
        me.setCookie(name, value);
        Ext.state.CookieProvider.superclass.set.call(me, name, value);
    },

    // private
    clear : function(name){
        this.clearCookie(name);
        Ext.state.CookieProvider.superclass.clear.call(this, name);
    },

    // private
    readCookies : function(){
        var cookies = {},
            c = document.cookie + ";",
            re = /\s?(.*?)=(.*?);/g,
            matches,
            name,
            value;
            
        while((matches = re.exec(c)) != null){
            name = matches[1];
            value = matches[2];
            if(name && name.substring(0,3) == "ys-"){
                cookies[name.substr(3)] = this.decodeValue(value);
            }
        }
        return cookies;
    },

    // private
    setCookie : function(name, value){
        var me = this;
        
        document.cookie = "ys-"+ name + "=" + me.encodeValue(value) +
           ((me.expires == null) ? "" : ("; expires=" + me.expires.toGMTString())) +
           ((me.path == null) ? "" : ("; path=" + me.path)) +
           ((me.domain == null) ? "" : ("; domain=" + me.domain)) +
           ((me.secure == true) ? "; secure" : "");
    },

    // private
    clearCookie : function(name){
        var me = this;
        
        document.cookie = "ys-" + name + "=null; expires=Thu, 01-Jan-70 00:00:01 GMT" +
           ((me.path == null) ? "" : ("; path=" + me.path)) +
           ((me.domain == null) ? "" : ("; domain=" + me.domain)) +
           ((me.secure == true) ? "; secure" : "");
    }
});