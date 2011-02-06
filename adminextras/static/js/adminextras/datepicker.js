/**
 * Creates a datepicker for a input
 */
django.admindatepicker = (function (){
	
	function retrieve_options(input) {
		var opts_selctor = '#datepicker_opts_'+ $(input).attr('id');
		var opts = $.parseJSON($(opts_selctor).attr('value'));
		return opts;
	}
	
	function create_datepicker () {
		var opts = retrieve_options(this); 
		var dp = $(this).datepicker(opts);
		// i18n
		$(this).datepicker( $.datepicker.regional[ "es" ] );
		console.log($.datepicker.regional);
		
	}
	
	function init() {
		//console.log("Init");
		$('.jquery_datepicker').each(create_datepicker);
	};
	jQuery(init);
	return {
		
	}
})();