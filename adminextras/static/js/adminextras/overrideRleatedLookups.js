/**
 * Override default Django add new behaviour
 */
var orignialFunction = dismissAddAnotherPopup; 
dismissAddAnotherPopup = function (win, newId, newRepr) {
	// Mirá mamá ahora sin jQuery :P
	var name = windowname_to_id(win.name);
    newRepr = html_unescape(newRepr);
    var textInput = name.replace(/id_/g, 'autocomplete_');
    var elem = document.getElementById(textInput);
    if (elem) {
    	elem.value = newRepr;
    }
    
    return orignialFunction.apply(this, arguments);

}
