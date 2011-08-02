/**
 * jQuery Multiselect Plugin for Djnago select multiple
 */
if (typeof(adminextras) == 'undefined') {
	adminextras = {};
}

adminextras.multiselect = (function (){
	var multiselects = [];
	
	function init(){
		
		$('.jqueryuimultiselect').each(function (){
			$(this).find('option[value=""]').each(function (){
				alert("hoa");
			});
			var opts = $.parseJSON($(this).attr('multiselect_attrs'));
			console.info("Construyendo sobre", this, "con", opts);
			var multiselect = $(this).multiselect(opts);
			var filter_opts = $.parseJSON($(this).attr('filter_attrs'));
			console.info("Filter", filter_opts);
			if (filter_opts) {
				console.debug("Convirtiendo", this, "en filtro");
				$(this).multiselect().multiselectfilter(filter_opts);
			}
		});
	}
	
	jQuery(init);
	
	return {
		multiselects: multiselects
	}
})();
