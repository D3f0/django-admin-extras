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
			var opts = $.parseJSON($(this).attr('multiselect_attrs'));
			console.log("Construyendo sobre", this, "con", opts);
			var multiselect = $(this).multiselect(opts);
			var filter_opts = $.parseJSON($(this).attr('filter_attrs'));
			console.log("Filter", filter_opts);
			if (filter_opts) {
				console.log("Convirtiendo", this, "en filtro");
				$(this).multiselect().multiselectfilter();
			}
		});
	}
	
	jQuery(init);
	
	return {
		multiselects: multiselects
	}
})();
