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
		var opts = retrieve_options(this); 
//		$.extend(opts, {
//			buttonImage: "../../img/adminextras/famfamfam/calendar_view_month.png"
//		});
		console.log("Instanciando calendario con opciones", opts);
		var dp = $(this).datepicker(opts);
		// i18n, 
		$(this).datepicker( $.datepicker.regional[ "es" ] );
		datepickers[datepickers.length] = $(this);
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
			var str_date = date.strftime('%d/%m/%Y');
			$(datepicker).find('input[type=text]').attr('value', str_date);
			return false;
		},
		datepickers: datepickers
	}
})();