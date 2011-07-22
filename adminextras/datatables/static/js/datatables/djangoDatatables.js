/**
 * Some generic things about jQuery datatable for adminextras.datatable application
 */
if (typeof(django) == 'undefined') {
	django = {}; // Global namespace
};

(function ($){
	django.datatable = {
		// Defaults
		defaults: {
			oLanguage: {
				"sProcessing":   "Procesando...",
				"sLengthMenu":   "Mostrar _MENU_ registros",
				"sZeroRecords":  "No se encontraron resultados",
				"sInfo":         "Mostrando desde _START_ hasta _END_ de _TOTAL_ registros",
				"sInfoEmpty":    "Mostrando desde 0 hasta 0 de 0 registros",
				"sInfoFiltered": "(filtrado de _MAX_ registros en total)",
				"sInfoPostFix":  "",
				"sSearch":       "Buscar:",
				"sUrl":          "",
				"oPaginate": {
					"sFirst":    "Primero",
					"sPrevious": "Anterior",
					"sNext":     "Siguiente",
					"sLast":     "Último"
				}
			},
			bProcessing: true,
			bJQueryUI: true,
			sPaginationType: "full_numbers",
			bServerSide: true,
			bSearchable: false,
			sBaseURL: '/api/',
			/**
			 * Get 
			 * @param {Object} sSource
			 * @param {Object} aoData
			 * @param {Object} fnCallback
			 */
			fnServerData: function ( sSource, aoData, fnCallback ) {
				/* Add some extra data to the sender */
				var oInitSettings = $(this).dataTable().fnSettings().oInit;
				// debugger;
				//console.error(oInitSettings);
				if (typeof(oInitSettings.sResource) != 'undefined') {
					// A remote resource has been defined
					console.log("Adding resource: ", oInitSettings.sResource);
					aoData.push( { name: "sResource", value: oInitSettings.sResource} );
				}
				
				// Substitute $.getJSON so we can see 500 error traceback
				$.ajax({
					url: oInitSettings.sBaseURL + 'list/',
					dataType: 'json',
					data: aoData,
					success: function (json) {
	                    if (!json.bSuccess) {
	                        console.error("Generando mensaje de error para", json);
	                        var dialog = $('<div>' + json.sError + '<pre>' +
	                        (json.sTraceback || '') +
	                        '</pre></div>');
	                        $(dialog).dialog({
	                            autoShow: false,
	                            title: "Se produjo un error en el Servidor",
	                            modal: true,
	                            width: "80%",
								buttons: [
									{
										text: "Cerrar",
										click: function (){
											$(this).dialog("close").dialog('destroy');
										}
									}
								]
	                        })
	                        $(dialog).dialog('show');
	                    }
	                    else {
	                        fnCallback(json)
	                    }
					},
					error: function (jqXHR, textStatus, errorThrown){
						console.log("Argumentos", arguments);
						// Error 500
						var $dialog = $('<div><iframe style="border: 1px solid #ccc;" width="96%" height="90%"></iframe></div>');
						$($dialog).dialog({
							autoShow: false,
							title: "Error en el servidor",
							width: 500,
							modal: true
						});
						var iframe = $($dialog).find('iframe').get(0);
						console.log(iframe);
						iframe.contentDocument.write(jqXHR.responseText);
						$($dialog).dialog("show");
					}
				
				});
			}, // fnServeData
			createDialog: function () {
				
				alert("Hola");
				var dlg = $('<div></div>').dialog({});
				return false;
			}
		}
	};
	//
	django.datatable._makeDateInputs = function (where) {
		console.log("Creando date inputs en", where);
	}
	
	django.datatable._makeAutocompleteWidgets = function (where) {
		console.log("Creando autocomplete inputs en", where);
	}
	
	django.datatable.createWidgets = function () {
		
	}
	
	$.widget('my.addNewDialog', $.ui.dialog, {
		options: {
			autoOpen: false,
			width: 750,
			buttons: [
					{
						text: "Crear", 
						click: function (){
							$(this).addNewDialog('close');
							
						}
					},
					{
						text: "Cancelar",
						click: function (){
							$(this).addNewDialog('close');
							
						}
					}
				]
		},
		_init: function () {
			$(this.element).append(
				'<p class="loading">Cargando</p>'
			);
			// Ask for the form asynchronously
			var that = this;
			$.ajax({
				url: '/api/forms/',
				data: {'form': that.options.form},
				success: function (data, status, xhr){
					console.log("Success:", data, status, xhr);
					$(that.element).html(data);
				},
				error: function (error) {
					console.log("Error", this, arguments);
					$(that.element).html(error.responseText);
				}
			});
		}
		
	});
	/**
	 * Add new button
	 */
	$.widget('my.addNewButton', $.ui.button, {
		options: {
			text: "pepe",
			title: "Agregar un",
			// The form to be used...
			form: null,
			// Dialog options
			dlgOptions: {
				//modal: false
			}
		},
		_create: function (){
			var that = this;
			$.ui.button.prototype._create.call(this, arguments);
			$(this.element).addNewButton().click(function (event){
				event.preventDefault();
				var $dlg = $('<div class="addNewDialog"></div>').addNewDialog(
					$.extend(true, {}, {
						title: "Agregar nuevo",
						form: that.options.form,
						height: 400,
						modal: true,
						// Remove
						close: function(event, ui){
							console.log("Destruccion");
							$(this).addNewDialog('destroy');
							$('.addNewDialog').remove();
						}
					}, that.options.dlgOptions) 
				);
				$dlg.addNewDialog('open');
				return false;	
			});
		}
	});
})(jQuery);
