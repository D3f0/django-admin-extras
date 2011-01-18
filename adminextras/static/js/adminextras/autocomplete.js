/**
 * Autocompletado para los <span class="autocomplete">
 *  <input type="hiden">
 * basado en el plugin de jQuery UI
 */
django.adminautocomp = (function (){
	// Referencia estática al autocompletado en curso
	var ACInputs = [];
	// Creación de un widget de autocompleción
	function makeAutocompleteInput(input) {
		
		var span = $(input).parent(),
            autocomplete_url = $(span).attr('url'), 
            hidden = $(span).find('input[type=hidden]');
		
		console.log("Autocompleción en:", span, autocomplete_url, hidden, input);
		
		$(input).autocomplete({
            source: function(request, response){
                $.ajax({
                    url: autocomplete_url + request.term + '/',
                    method: "GET",
                    success: function(xhr){
                        response(xhr.data);
                    },
                    error: function(){
                        alert("Error en autocompletado");
                    }
                });
            },
            select: function(event, sel){
                var selection = sel.item;
                //console.log(selection, selection.value,"=", selection.label);
                $(hidden).attr('value', selection.pk);
                $(input).attr('value', selection.label);
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
		if (input in ACInputs){
			console.log("Ya esta el input en autocompleción")
		} else {
			console.log("Agregando el input como autocompleción");
            makeAutocompleteInput(input);
            ACInputs[ACInputs.length] = input;
		}
	}
	function clear(link){
		$(link).parent().find('input').each(function (){
			$(this).attr('value', '');
		})
		return false;
	} 
	return {
		clear: clear,
		check: check
	}
})();
