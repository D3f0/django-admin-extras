/**
 * Autocompletado para los <span class="autocomplete">
 *  <input type="hiden">
 * basado en el plugin de jQuery UI.
 * 
 * Importante. Este plugin se activa cuando el autcompletado gana foco.
 */
if (typeof(adminextras) == 'undefined') {
	adminextras = {};
	console.log("Creando ns");
}
adminextras.autocomplete = (function (){
	console.info("Cargando autcompleción");
	// Referencia estática al autocompletado en curso
	var autocomplete_inputs = [];
	/**
	 * 
	 */
	function getAutocomplete( input ){
		if (autocomplete_inputs.indexOf(input) < 0) {
			return;
		} else {
			return autocomplete_inputs[input];
		}
	}
	
	/** Effect for user hinting */
	function flashInputWithColor(input, color, time) {
		if (!time) {
			time = 150;
		}
		var originalCssColor = $(input).css('background-color');
		$(input).css('background-color', color);
		window.setTimeout(function(){
			$(input).css('background-color', originalCssColor);
		}, time);
	}
	
	// Creación de un widget de autocompleción
	function makeAutocompleteInput(input) {
		
		console.log("Creando autocomplecion sobre", input);
		
		var span = $(input).parent(),
            autocomplete_url = $(span).attr('url'), 
            hidden = $(span).find('input[type=hidden]');
		
		$(input).autocomplete({
            source: function(request, response){
                $.ajax({
                    url: autocomplete_url + request.term + '/',
                    method: "GET",
                    success: function(xhr){
						$(input).removeClass('ui-autocomplete-loading');
                        response(xhr);
                    },
                    error: function(){
						$(input).removeClass('ui-autocomplete-loading');
                    	console.error("Error de autocompletado", this, arguments);
                    	flashInputWithColor(input, '#FF2323', 333);
						
                    }
                });
            },
            select: function(event, sel){
                var selection = sel.item;
				
				if (selection.pk) {
					//console.log(selection, selection.value,"=", selection.label);
					$(hidden).attr('value', selection.pk);
					$(input).attr('value', selection.label);
					
				} else {
					// Sin resultados
					
					$(hidden).attr('value', '');
					$(input).attr('value', '');
					$(this).attr('value', '');
					event.cancel();
					console.info("Sin resultados");
					return false;
				}
				
            }
        }).bind({
			'keydown': function (evt){
				// Backspace?
				if (evt.keyCode == 8){
					if ($(this).attr('value').length <= 1) {
						// Borramos el valor del hidden
						$(this).prev('input[type="hidden"]').attr('value', '');
						flashInputWithColor(this, 'red');
					}
				}
			}
		});
		$(input).attr('django-autocomplete', 'done');
		
		return input;
	}
	/**
	 * Checkea si un input está en la lista de autocompleción.
	 * @param {Object} input
	 */
    function check(input){
    	if ($(input).attr('django-autocomplete') != undefined) {
		//if (autocomplete_inputs.indexOf(input) > 0){
			console.log("Ya esta el input en autocompleción");
		} else {
            makeAutocompleteInput(input);
            //autocomplete_inputs[autocomplete_inputs.length] = input;
		}
	}
	function clear(link){
		$(link).parent().find('input').each(function (){
			$(this).attr('value', '');
		})
		return false;
	} 
	return {
		/**
		 * 
		 */
		clear: clear,
		/**
		 * 
		 */
		check: check,
		autocomplete_inputs: autocomplete_inputs
		
	}
})();
