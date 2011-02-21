/**
 * Buttons
 * 
 * They are defined in a class
 */
if (typeof(adminextras) == 'undefined') {
	adminextras = {};
}
adminextras.button = (function (){
	var buttons = [];
	// Inicialización
	function init(){
		$('.form_button').each(function (){
			var fn = null;
			var opts = $(this).attr('button_params');
			opts = $.parseJSON(opts);
			//console.log("Creando botón con argumentos: ", opts);
			var btn = $(this).button(opts);
			
			try {
				fn = eval(opts.onclick);
				if ($.isFunction(fn)) {
					$(btn).click(fn)
				}
				//console.log(fn);
			} catch (e){
				console.error("No se puede setaer el callback ", opts.onclick);
			}
			// Agregarlo a la lista
			buttons[buttons.length] = btn;
		});
	}
	$(window).load(init);
	return {
		buttons: buttons
	}
})();
