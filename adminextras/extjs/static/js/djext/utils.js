/**
 * Utilidades varias
 * 
 * 
 */
Ext.apply(Ext, {
	/**
	 * 
	 * @param {Object} iterable
	 * @param {Function} callable
	 */
	map: function (iterable, callable) {
	   var return_values = [],
	       call_wrapper = function (element){
		      return_values[return_values.length] = callable(element);
		   };
		   
	   Ext.each(iterable, call_wrapper);
	   
	   return return_values;
	},
	/**
	 * Une urls agregando el Slash al final
	 */
    urlJoin: function(/* Argumetos variables */){
        var result = "/"
        Ext.each(arguments, function(url_part){
            url_part = "" + url_part; // Coherción
            Ext.each(url_part.split("/"), function(url_atom){
                if (url_atom) 
                    result = result + url_atom + "/";
            })
        });
        return result;
    },
    parseResponse: function(respText){
        var d = {};
        Ext.each(respText.split("\n"), function(line){
            if (line) {
                var x = line.split(': ');
                d[x[0]] = x[1];
            }
        });
        return d;
    },
    isJsonResponse: function(resp){
        var jsonContentType = /json/;
        var responseHeaders = Ext.ux.urlJoin.parseResponse(resp.getAllResponseHeaders());
        if ('Content-Type' in responseHeaders) 
            return (responseHeaders['Content-Type'].search(jsonContentType) > -1);
        return false;
    },
	/** iconCls property para los errores */
	DEFAULT_ERROR_ICONCLS: 'exclamation',
	DEFAULT_ERROR_WIDTH: 400,
	/**
	 * Muestra el error generico
	 */
	showError: function (object){
		var title = "Error", message = "Error";
		
		if (Ext.isArray(object)){
			 title = object[0];
			 message = object[1] || message;
		} else {
			if (Ext.isObject(object)) {
				title = object.title || title;
				message = object.message || message;
			}
			else {
				if (Ext.isString(object)) {
					message = object;
				}
			}
		}
		
		Ext.Msg.show({
			title: title,
			msg: String.format("<b>{0}</b>", message),
			iconCls: Ext.DEFAULT_ERROR_ICONCLS,
			width: Ext.DEFAULT_ERROR_WIDTH,
			buttons: Ext.Msg.OK

		})
	},
	/**
	 * Muest
	 * @param {Object} object
	 */
	showObject: function (object) {
		var win = null, data = null;
		if (Ext.isString(object)){
			data = object;
		} else {
			try {
            	if (Ext.isArray(object)) {
					data = Ext.map(object, function(o){
						return Ext.encode(o);
					});
					console.log(data);
					data = data.join('<br />');
				}
				else {
					data = Ext.encode(object);
					data = data.replace(/\,\ /g, ",\n");
				}
			} catch (e) {
				data = String.format("No se pudo decodificar el objeto.\n", e);
			}
		}
		
		// Creamos una ventana
        win = new Ext.Window({
			title: "Deupración",
			autoHeight: true,
			autoDestroy: true,
			closable: true,
			width: 400,
			items: {
				html: String.format("<h2>Objeto</h2><p>{0}</p>", data)
			}
		});
		win.show();
	},
	
    log: function (){
		
	},
	info: function () {
		
	},
	error: function () {
		
	}
});