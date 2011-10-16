/**
 * Creates a datepicker for a input
 */
if (typeof(adminextras) == 'undefined') {
	adminextras = {};
}
adminextras.datepicker = (function (){
	var datepickers = [];
		
	function retrieve_options(input) {
		var opts_selctor = '#datepicker_opts_'+ $(input).attr('id');
		var opts = $.parseJSON($(opts_selctor).attr('value'));
		return opts;
	}
	
	function create_datepicker () {
		
		// En uniform los dates no son el input, así que hacemos el trabajo de buscar
		// el input manualmente
		var input;
		if (! $(this).is('input[type=text]')) {
			input = $(this).find('input[type=text]');	
		} else {
			input = this;
		}
		var opts = retrieve_options(input);
//		$.extend(opts, {
//			buttonImage: "../../img/adminextras/famfamfam/calendar_view_month.png"
//		});
		console.info("Instanciando calendario con opciones", opts, "en elemento", input);
		var dp = $(input).datepicker(opts);
		// i18n, 
		$(input).datepicker( $.datepicker.regional[ "es" ] );
		datepickers[datepickers.length] = $(input);
		//console.log($.datepicker.regional);
		
	}
	
	function init() {
		//console.log("Init");
		$('.jquery_datepicker').each(create_datepicker);
	};
	jQuery(init);
	return {
		today: function (input){
			var datepicker = $(input).parents('span.datepicker');
			var date = new Date();
			// var str_date = date.strftime('%d/%m/%Y');
			var date = date.getDay() + '/' + date.getMonth() +'/' + date.getFullYear();
			
			//try {
			var dateInput = $(datepicker).find('input[type=text]');
			dateInput.attr('value', date);
			console.log(dateInput);
			//} catch(e) {console.error(e)}
			return false;
		},
		datepickers: datepickers
	}
})();