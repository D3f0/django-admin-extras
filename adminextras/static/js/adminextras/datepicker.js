
django.admindatepicker = (function (){
	
	function create_datepicker () {
		var dp = $(this).datepicker({
			dateFormat: 'dd/mm/yy',
			showOtherMonths: true,
			selectOtherMonths: true,
			changeMonth: true,
			changeYear: true

			
		});
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