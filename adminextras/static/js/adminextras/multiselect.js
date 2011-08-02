/**
 * jQuery Multiselect Plugin for Djnago select multiple
 */
if( typeof (adminextras) == 'undefined') {
	adminextras = {};
}

adminextras.multiselect = (function() {
	var multiselects = [];

	function createMultiselect() {
		// Si hay un elemento vacío, lo quitamos
		$(this).find('option[value=""]').remove();
		// Buscamos los parámetros
		var opts = $.parseJSON($(this).attr('multiselect_attrs'));
		//console.info("Construyendo sobre", this, "con", opts);
		var multiselect = $(this).multiselect(opts);
		var filter_opts = $.parseJSON($(this).attr('filter_attrs'));
		console.info("Filter", filter_opts);
		if(filter_opts) {
			console.debug("Convirtiendo", this, "en filtro");
			$(this).multiselect().multiselectfilter(filter_opts);
		}
		return this;
	}

	function init() {
		multiselects = $('.jqueryuimultiselect').map(createMultiselect);
	}

	jQuery(init);

	return {
		getMultiselects : function () {
			return multiselects;
		}
	}
})();
