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
	// Creación de un widget de autocompleción
	function makeAutocompleteInput(input) {
		
		
		var span = $(input).parent(),
            autocomplete_url = $(span).attr('url'), 
            hidden = $(span).find('input[type=hidden]');
		
		$(input).autocomplete({
            source: function(request, response){
            	
                $.ajax({
                    url: autocomplete_url + request.term + '/',
                    method: "GET",
                    success: function(xhr){
						$(this).removeClass('ui-autocomplete-loading');
                        response(xhr.data);
						//console.log(xhr.data);
                    },
                    error: function(){
						$(this).removeClass('ui-autocomplete-loading');
                    	console.error("Error de autocompletado");
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
						// Indicación con color de fondo rojo
						$(this).css('background-color', '#ef0000');
						// Borramos el valor del hidden
						$(this).prev('input[type="hidden"]').attr('value', '');
						var that = this;
						window.setTimeout(function(){
							$(that).css('background-color', 'white');
						}, 150);
					}
				}
			}
		});
		
		return input;
	}
	/**
	 * Checkea si un input está en la lista de autocompleción.
	 * @param {Object} input
	 */
    function check(input){
		if (autocomplete_inputs.indexOf(input) > 0){
			console.log("Ya esta el input en autocompleción")
		} else {
			console.log("Agregando el input como autocompleción");
            makeAutocompleteInput(input);
            autocomplete_inputs[autocomplete_inputs.length] = input;
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
