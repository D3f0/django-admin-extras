/**
 * 
 */

if (typeof(adminextras) == 'undefined') {
	adminextras = {};
}
adminextras.admindlg = (function (){
	
	function createDialog(){
		console.log("Hola mundo");	
	}
	
	return {
		/**
		 * Create dialog
		 */
		createDialog: createDialog
	}
})();
