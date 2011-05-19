/**
 * Grid con paginación, filtrado (server side) y ABM para recursos
 * Piston de Django.
 * La idea es unificar la definción del store
 * @param {Object} config
 *  - fields: 
 *      {header: "Fecha", name: "date", visible: false }
 */


//Ext.Loader.setPath('Ext.ux', '../ux/');

Ext.require([
    'Ext.data.*',
    'Ext.grid.*',
    'Ext.util.*',
    'Ext.toolbar.*',
	'Ext.form.*',
    'Ext.state.*'
]);

Ext.onReady(function (){
	
	var ns = Ext.namespace('DjExt');
	Ext.define('DjExt.ModelList', {
		'extends': Ext.grid.GridPanel,
	    constructor: function (config){
	        // ------------------------------------
	        // Parametros tomados del hash de configuración
	        // ------------------------------------
	        this.autoCreateStore = config.autoCreateStore || true;
	        if (!Ext.isDefined(config.extraConfig)) 
	            config.extraConfig = {}
	        
	        
	        // Definiciones del modelo
	        this.verboseName = config.verboseName || ns.ModelList.verboseName;
	        this.verboseNamePlural = config.verboseNamePlural || this.verboseName + 's';
	        this.useFiltering = config.useFiltering || true;
	        
			// Clase para Crud
			this.formClass = config.formClass;
			this.formsetClass = config.formsetClass;
			
			if (typeof(config.updateOnCrud)  == "undefined"){
				this.updateOnCrud = true;
			} else {
				this.updateOnCrud = config.updateOnCrud;
			}
			
			
	        // Crear la configuración de campos para el store y para el grid
	        var storeFields = [];
	        var columns = [];
	        // Configuración de página
	        this.pageSize = config.pageSize || 25;
	        var fields = config.fields;
	        // Crear las capacidades de CRUD en el toolbar?
	        this.defaultCRUD = Ext.isDefined(config.defaultCRUD) ? config.defaultCRUD : true;
	        //
	        var that = this, tmp, idProperty;
	        Ext.each(fields, function (field) {
	            var name = field['name'], // Tomar el campo
	                extra_config = config.extraConfig[name] || {};
	            
	
	            // Campo del JsonStore
	            tmp = that.storeFieldFromConfig(name, field);
	            if (tmp) {
	                Ext.apply(tmp, extra_config);
	                storeFields[storeFields.length] = tmp;
	            }
	            
	            // Columna del grid
	            tmp = that.columnFromConfig(name, field);
	            if (tmp) {
	                Ext.apply(tmp, extra_config);
	                columns[columns.length] = tmp;
	            }
	        });
	        
	        // Crear el store, para luego trabajar con la paginación
	        var store = new Ext.data.JsonStore({
	            restful: true,
	            //autoDestroy: true,
	            remoteSort: true,
	            autoLoad: false,
	            showPreview: true,
				root: 'data',
	            successProperty: 'success',
	            totalProperty: 'total',
				idProperty: config.storeIdProperty || 'id', /* Cargado en el ttag form_config */
	            method: 'GET',
	            url: config.url,
	            fields: storeFields,
				storeId: config.storeId || null,
	            listeners: {
	                /*
	                load: function () {
	                    console.log("Store cargado", this.data);
	                    console.log(this.fields);
	                }*/
	            }
	        });
			
			
	        var initialSortingCol = columns[0]['name'];
	        //store.setDefaultSort(initialSortingCol,'ASC');
	        // console.info("Sorting: ", initialSortingCol)
	        
	        // Filtrado
	        // En los plugins está el filtrado
	        this.plugins = [];
	        
			// TODO: Ext4 fix
	        if (this.useFiltering){
	            this.plugins[this.plugins.length] = this.getGridFilters();
	            //this.plugins = [];
	        }
			this.plugins = [];
			
	        
	        this.selectionCheckCallbacks = [];
	        
	        // Instancias el listado
	        ns.ModelList.superclass.constructor.call(this, Ext.apply({
	            store: store,
	            columns: columns,
	            plugins: that.plugins,
	            autoHeight: config.autoHeight || (config.hasOwnProperty('height')?false:true),
	            height: config.height,
	            width: config.width,
	            //autoExpandColumn: config.autoExpandColumn || initialSortingCol,       
	            // Configuración de la barra inferior
	            bbar: new Ext.PagingToolbar({
	                store: store,
	                pageSize: that.pageSize,
	                displayInfo: true,
	                emptyMessage: "Sin elmentos", 
	                items: config.bbarItems || {}
	            }),
	            tbar: this.createToolBar(config),
	            listeners: {
					beforeRender: function(){
						store.load({
							params: {
								start: 0,
								limit: that.pageSize
							}
						});
			        // Deprecado
					//                    that.on('rowmousedown', that.fireSelectionCheck);
					}
				},
				selModel: new Ext.grid.RowSelectionModel({
	                listeners: {
	                    selectionchange: function (){
	                        //console.log("Cambio de selección");
							if (Ext.isFunction(that.selectionchange)){
								that.selectionchange.apply(that, arguments);
							}
	                    },
						// Does not work
	                    rowdblclick: function(grid, rowIndex, e){
	                        alert("double click on row " + rowIndex);
	                    }
	                }
	            })
	            
	            
	        }, config));
			
			var crudEvents = ["create", "edit", "delete"];
			Ext.each(crudEvents, function (event_name) {
				// TODO: Ext4 Fix
				return;
				// Agregamos el evento
				that.addEvents({
					event_name: true
				});
				// Sucripción al evento
				if (that.updateOnCrud) {
					that.on(event_name, function () {
						console.log(this.verboseName, "reload, event: ", event_name);
						that.reload();
					});
				}
			});
			
	//		this.addEvents({"create": true, "edit": true, "delete": true})
	//		if (this.updateOnCrud) {
	//			Ext.each([])
	//			
	//		}
	        
			this.CRUDConn = new Ext.data.Connection(); // Connection for CRUD
			
	    },
		/**
		 * Recarga el contenido del sotre del grid. Es un atajo a this.store.reload();
		 */
		reload: function () {
			this.store.reload();
		},
		
		selectionchange: function (selModel) {
			var rows = selModel.getSelections(),
			    toolBar = this.toolbars[0],
				addBtn = toolBar.getComponent('add')
				editBtn = toolBar.getComponent('edit'),
				deleteBtn = toolBar.getComponent('delete');
			try {
				switch (rows.length) {
					case 0:
						//console.log("Sin seleccion");
						addBtn.setDisabled(false);
						editBtn.setDisabled(true);
						deleteBtn.setDisabled(true);
						break;
					case 1:
						//console.log("Seleccion de un elemento");
						addBtn.setDisabled(false);
						editBtn.setDisabled(false);
						deleteBtn.setDisabled(false);
						break;
					default:
						//console.log("Seleccion múltiple");
						addBtn.setDisabled(false);
						editBtn.setDisabled(true);
						deleteBtn.setDisabled(false);
				}
			} catch(e){
				// No importa si no hay
			}
			  
			
		},
	    prunedKeysFromStoreField: ['header'], 
	    /**
	     * 
	     * @param {Object} fieldName
	     * @param {Object} field
	     */
	    storeFieldFromConfig: function (fieldName,  field) {
	        // Copiamos dest <- source
	        var mixed = Ext.apply({name: fieldName},
	          field
	        );
	        // Borramos las claves innecesarias
	        Ext.each(this.prunedKeysFromStoreField,
	            function (name) {
	                if (mixed.hasOwnProperty(name))
	                 delete mixed[name];
	            });
	        return mixed;
	    },
	    
	    prunedKeysFromColumn: [],
	    /**
	     * Retrona en null 
	     * @param {Object} field
	     * @return {Object}|null
	     */
	    columnFromConfig: function (fieldName, field){
	        //console.log('columnFromConfig(', arguments, ')')
	        var mixed = Ext.apply({dataIndex: fieldName, id: fieldName, sortable: true},
	          field
	        );
	        // Borramos las claves innecesarias
	        Ext.each(this.prunedKeysFromColumn,
	            function (name) {
	                if (mixed.hasOwnProperty(name))
	                 delete mixed[name];
	            });
	        return mixed;
	    },
	    /**
	     * Obtiene la columna por la cual se autoexpande la lista
	     * @param {Array} columns
	     * @param {Object} config
	     */
	    getExpandingColumn: function(columns, config){
	        var col, found = false;
	        if (config.hasOwnProperty('autoExpandColumn')){
	            col = config['autoExpandColumn'];
	            Ext.each(columns, function (column){
	                if (column['name'] == col) {
	                    found = true;
	                    return false;
	                }
	            });
	            if (!found){
	                console.warn("autoExpandColumn: No se encontró la columna", col)
	            }
	            return col;
	        } else {
	            col = columns[0]['name']
	            //console.info("Autoexpansión por", col);
	            return col;
	        }
	    },
	    /**
	     * Obtiene los filtros
	     */
	    getGridFilters: function () {
	       var filters = null;
		   // TODO:  Ext4 Fix
//	       if (Ext.isDefined(Ext.ux.grid.GridFilters)) {
//	            //console.log("Generando filtros");
//	            filters = new Ext.ux.grid.GridFilters({
//	               // encode and local configuration options defined previously for easier reuse
//	               encode: false, // json encode the filter query
//	               local: false   // defaults to false (remote filtering)
//	            }); 
//	            
//	        } else {
//	            console.warn("Filtering disabled")
//	        }   
			console.warn("Filtering disabled");
	        return filters;
	    },
	    /**
	     * Factory para el botón de Nuevo
	     * @param {Object} config
	     */
	    createAddButton: function (config) {
	        var addText = config.addText || "Agregar",
			    resourceGrid = this; // Para la clausura
	        
	        var btn = new Ext.Button({
	            text: addText,
	            toolTip: addText,
	            iconCls: 'add',
	            itemId: 'add',
	            handler: function (){
					var win = new Ext.Window({
						iconCls: "add",
						title: "Agregar nuevo "+ resourceGrid.verboseName,
						width: "40%",
						autoHeight: true,
						closable: false,
						// Panel de creación
						items: new ns.CreateFormPanel({
							formClass: resourceGrid.formClass,
							formsetClass: resourceGrid.formsetClass,
							url: resourceGrid.store.url,
							store: resourceGrid.store,
							listeners: {
								'closewindow': function () {
									win.close();
								},
								'success': function () {
									// Propagar el evento de creación
									console.log("Creación exitosa");
									resourceGrid.fireEvent('create');
								}
							}
						})
					});
					win.show();
	            }
	        });
	        
	        return btn;
	    },
	    
	    createEditButton: function (config) {
	        var editText = config.editText || "Modificar",
			    resourceGrid = this;
	        var btn = new Ext.Button({
	            text: editText,
	            toolTip: editText,
	            iconCls: 'application_edit',
	            disabled: true,
	            itemId: 'edit',
				handler: function (){
				     resourceGrid.editSelectedRow();	
				}	
	        });
	        return btn;
	    },
	    editSelectedRow: function (){
			var selectedRow = this.selModel.getSelected();
			console.log("Edit", selectedRow);
		},
		/**
		 * Factory
		 * @param {Object} config
		 */
	    createDeleteButton: function (config) {
	        var deleteText = config.deleteText || "Eliminar";
			var that = this;
	        var btn =  new Ext.Button({
	            text: deleteText,
	            toolTip: deleteText,
	            iconCls: 'delete',
	            disabled: true,
	            itemId: 'delete',
				handler: function (){
					var rows = that.selModel.getSelections(),
					    cant = rows.length;
					Ext.Msg.confirm("Confirmación de Elminación", 
					    "¿Esta seguro de borrar "+ cant + " elemento(s)?",
						that.deleteRows /* Callback */, 
						that); // Scope
				}
	        });
	        return btn;
	    },
		/**
		 * Handler para eliminar elementos del store
		 * @param {Object} btn
		 */
	    deleteRows: function (btn){
	        if (btn != "yes")
			  return; // User did not confirm, i.e. pressed "No"
			  
			var resourceGrid = this,
			    rows = this.selModel.getSelections(),
			    pkName = this.store.idProperty,
				requestData = {};
			
			var rowsPKs = Ext.map(rows, function (row) {
				return row.get(pkName);
			});
			
			
			requestData[pkName+'__in'] = rowsPKs;
			this.CRUDConn.request({
				url: Ext.urlJoin(resourceGrid.url),
				method: "DELETE",
				jsonData: requestData,
				success: function (response){
	                var result = Ext.decode(response.responseText);
	                //debugger;
					if (result.success) {
						resourceGrid.fireEvent('delete');
					}
					else {
						Ext.showError(result);
					}
					
				},
				failure: function (response){
					Ext.Msg.alert("Error de comunicaciones");
				}
			});
		},
	    createToolBar: function (config) {
			// Botones de edición
	        this.crudButtons = {};
			
	        if (this.defaultCRUD) {
	            var btns = [];
	            if (config.canAdd || true) {
	                btns[btns.length] = this.createAddButton(config);  
	                btns[btns.length] = '-';
					 
	            }
	            if (config.canEdit || true) {
	                btns[btns.length] = this.createEditButton(config);
	                btns[btns.length] = '-';    
	            }
	            if (config.canDelete || true) {
	                btns[btns.length] = this.createDeleteButton(config);
	                btns[btns.length] = '-';    
	            }
				
	            // Quick search...
				// btns = btns.concat(this.createQuickSearchConfig(config));
				/*
				 TODO: Arreglar estos botones de PDF y XLS
				btns = btns.concat(['->', {
					text: "Excel",
					toolTip: "Descargar este listado en XLS (Excel)",
					iconCls: "page_excel"
				}, {
	                text: "PDF",
					toolTip: "Descargar este listado en PDF",
	                iconCls: "page_white_acrobat"
	            }]);
	            */
				//console.log(btns);
	            return {buttons: btns,
				        itemId: 'crudbar'};
	        } else  
	        return Ext.apply(config.tbarConfig || {} , {
	            items: config.tbarItems || {}
	        })
	    },
		createQuickSearchConfig: function (config) {
	        var items = [];
			
			
	        items = items.concat({
	            xtype: "tbtext",
	            disabled: true,
	            iconCls: "find",
	            text: "Buscar",
	            style: "color: #557;",
	            listeners: {
	                click: function(){
	                    Ext.showError("X");
	                    
	                }
	            }
	        });
	        var fieldBusqueda = {
				xtype: "textfield",
	            name: "quicksearch",
	            fieldLabel: "Búsqueda",
	            iconCls: "search",
	            toolTip: "Búsqueda rápida",
				listeners: {
					'keypress': function (field, newval, oldval){
						console.log("Cambio", newval, oldval);
					}
				}
	        }
			
	        items = items.concat(fieldBusqueda);  
	            
	            
	        
	        items = items.concat({
	            xtype: "button",
				
	            toolTip: "limpiar",
	            iconCls: "cross"
	        });
	        return items;
			
			
		}
			
	});
	// Propiedades de clase
	/**
	 * Actualizar
	 * @param {String} key
	 * @param {Object} updates
	 * @param {Array} source
	 * @return {Array} source con los merges de updates, buscando por el valor key
	 */
	Ext.apply(ns.ModelList, {
	    // Texto a internacionalizar ocacionalmente
	    verboseName: 'elemento',
		// Esta es la configuración de la URL donde se van a buscar los formularios
		// y se hace el CRUD. Sería mejor para una futura versión cambiar esto y 
		// hacerlo RESTful
		formCRUDUrl: '/api/forms/',
		enablePDF: true,
	    enableXLS: true
	});
	
	/**
	 * Leector de errores
	 * @param {Object} config
	 */
	Ext.define("DjExt.PistonErrorReader", {
		'extends': Ext.data.JsonReader,
		constructor: function (config){
			var fields = this.getFieldsFromStore(config.store);
			//console.info(fields);
			ns.PistonErrorReader.superclass.constructor.call(this, Ext.apply({
				fields: fields
			}, config));
		},
		/**
		 * Deprecated. ExtJs Error reader data is hard to compatibilize with django
		 * form validation. Setting errors by hand is to lot easier.
		 * @param {Object} store
		 */
		getFieldsFromStore: function (store) {
			var fields = [];
			// Is a Store?
			if (!store.constructor.xtype && store.constructor.xtype.indexOf('store') < 0){
				throw "Invalid store for ErrorReader";
			}
			Ext.each(store.fields.items, function (f){
	            fields[fields.length] = {
					name: f.name
				};
	        });
			return fields;
		},
	});
	
	/**
	 * Ventana de creación
	 * 
	 * @param {Object} config
	 *  Dentro de config se debe definir
	 *  formClass: el nombre de la clase full-quilified para ser recuperada
	 *  asincrónicamente.
	 *  formsetClass: el nombre de la(s) clases para ser tratadas como inlines
	 *  sotreId: El nombre de la calse
	 */
	
	Ext.define("DjExt.CreateFormPanel", {
		'extends': Ext.form.FormPanel,
		constructor: function (config){
			var formPanel = this; // Para clausuras
			ns.CreateFormPanel.superclass.constructor.call(this, Ext.apply({
				padding: 2,
				items: {
					itemId: 'placeholder',
					html: '<div></div>',
					style: 'height: 70px'
				},
				buttons: [/*{
					text: "Crear y Seguir Editando",
					iconCls: "page_edit",
					handler: function () {
						formPanel.buttonCrearYEditar();
					}
				},*/{
					text: "Crear",
					iconCls: "add",
					handler: function () {
						formPanel.submitForm();
					}
				},{
					text: "Cancelar",
					iconCls: "cancel",
					handler: function (){
						formPanel.fireEvent('closewindow');
					}
				},
				],
				listeners: Ext.apply(config.listeners || {},{
					afterrender: function () {
					    formPanel.loadForm();	
					}
				}),
				errorReader: new ns.PistonErrorReader({
					successProperty: 'success',
	                root: 'errors',
					errors: 'errors',
					store: config.store
				}),
				waitTitle: "Espre profavor..."
				//autoDestroy: true
			},config));
			this.addEvents({'closewindow': true,
			                'success': true});
			// Mostrar los eventos
	//		Ext.util.Observable.capture(this, function (eventName){
	//			console.log(eventName);
	//		}, this);
	        this.connection = new Ext.data.Connection();
			this.initialConifg = config;
			
		},
		/**
		 * Cargar el formulario asincronicamente
		 */
		loadForm: function() {
			var formPanel = this;
			this.getEl().mask("Cargando formulario");
			this.connection.request({
				method: 'GET',
				url: ns.CreateFormPanel.formUrl,
				params: {
					'form': this.initialConfig.formClass,
					'formset': this.initialConfig.formsetClass
				},
				success: function (xhr) {
					var json = Ext.util.JSON.decode(xhr.responseText);
	                formPanel.loadFormStructure(json);			
				},
				failure: function () {
					formPanel.fireEvent('closewindow');
					Ext.Msg.alert("Error",
					    "No se pudo cargar el formulario"
					);
				}
			});
		},
		/**
		 * Carga la estrcutura del formulario
		 * @param {Object} json
		 */
		loadFormStructure: function (json) {
			var formPanel = this,
			    createWindow = this.findParentByType('window');
	        this.getEl().unmask();
	        this.remove(this.getComponent('placeholder'));
			
	        // Cargar campos del formulario        
	        this.add(this.fieldsFromJson(json.fields));
	        // Cargar campos del formset si existen
			try {
				var fieldSet;
				if (this.initialConfig.formsetClass) {
					// Formfields
					fieldSet = this.getFormsetFieldConfig(json.formset);
					this.add(fieldSet);
					
				}
			} catch (e) {console.error(e)}
	        
			// Agregar los campos del management
			this.add(Ext.map(json.formset.management, this.reconstructFormFieldConfig));
			
	        createWindow.setActive(false);
	        createWindow.setActive(true);
	        createWindow.doLayout(true);
	        createWindow.center();
	
			//this.add(fieldSet);
			//createWindow.doLayout(true);
	        
		},
		/**
		 * Genera a partir del JSON de los campos producidos por la vista
		 * de serialización de formularios las intacias de los fields de ExtJS.
		 * 
		 * @return {Array} Arreglo de fields de ExtJS
		 * @param {Object} fields en Json
		 */
		fieldsFromJson: function (fields, config) {
			config = Ext.applyIf({
				formset: false
			}, config || {});
			
			var formPanel = this;
			console.log("Creando los campos del formulario");
			return Ext.map(fields, function (f) {
				return formPanel.reconstructFormFieldConfig(f, false);
			});
			
		},
		/**
		 * Aplica la configuración de ExtJs a un campo de formulario serializado
		 * por Django en la vista de la aplicación API.
		 * @param {Object} field_cfg
		 */
		reconstructFormFieldConfig: function (field_cfg, is_inline) {
	        if (! is_inline) {
	            var overrides = ns.CreateFormPanel.fieldOverrides;
	        }
	        else {
				console.log("Es INLINE Es INLINE");
	            var overrides = ns.CreateFormPanel.inlineFieldOverrides;
	        }
			
	        // Manejo del tooltip
	        // http://www.extjs.com/forum/showthread.php?28293-Tooltip-not-getting-displayed-FormPanel
	//        if (field_cfg._toolTip) {
	//            //console.log("Tiene tooltip", f.name);
	//            field_cfg.listeners = {
	//                render: function(c){
	//                    Ext.QuickTips.register({
	//                        target: c.getEl(),
	//                        text: field_cfg.toolTip
	//                    });
	//                }
	//            }
	//        }
	        
	        if (overrides.hasOwnProperty(field_cfg.xtype)) {
	            Ext.apply(field_cfg, overrides[field_cfg.xtype]);
	            console.log("Pisando para", field_cfg.fieldLabel);
	        }
	        switch (field_cfg.xtype) {
	            case 'combo':
	                console.log("Creando combo", field_cfg);
	                return this.comboboxFieldFactory(field_cfg);
	            default:
	                return field_cfg;
	        } // Fin switch de xtype
		},
		/**
		 * Crear un feildset para una formset
		 * @param {Object} fields
		 */
		getFormsetFieldConfig: function (formset_config) {
			console.log("Fields", formset_config.fields);
			
	        var config = {
	            xtype: "fieldset",
				layout: "anchor",
	            title: "Items",
	            defaultType: 'textfield',
				height: "100px",
				style: "overflow-y: scroll",
	            //padding: "3px",
	            layout_Config_: {
	                columns: formset_config.length
	            },
	            items: this.createInlineFieldset(formset_config.forms, formset_config.labels)
	        }
	        console.log("Configuracion", config);
	        
			return config;
		},
		/**
		 * 
		 * @param {Array} forms
		 * @param {Array} labels
		 */
		createInlineFieldset: function (forms, labels){
			//Ext.Msg.alert("Creando forms: ", forms.length);
			var formPanel = this;
			
			var fieldLabels = Ext.map(labels, function (label){
				return {
					xtype: "label",
					text: label,
					style: "font-decoration: italics;"
				}
			});
			var fields = Ext.map(forms, function (form){
				return {
					xtype: "container",
					layout: "hbox",
					items: Ext.map(form, function (field){
						return formPanel.reconstructFormFieldConfig(field, true);
					})
				}
			});
			return fieldLabels.concat(fields);
		},
		/**
		 * Factory para la creaciónd de un Combo para claves foreaneas en
		 * un formulario.
		 * @param {Object} f
		 */
		comboboxFieldFactory: function (f){
			
			var store = this.comboBoxStoreFactory(f),
	            extra_cfg = {};
	        
	        // Creación del campo
			if (store) {
				extra_cfg = {
	                store: store,
					valueField: 'pk',
	                displayField: 'str',
					hiddenName: f.name,
					store: store,
	                typeAhead: true,
	                forceSelection: true,
	                mode: 'local',
	                triggerAction: 'all',
	                emptyText:'Pulse para seleccionar...',
	                selectOnFocus:true,
				}
			}
			var combobox = new Ext.form.ComboBox(Ext.apply(extra_cfg, f));
			COMBO = combobox;
			console.log("Creamos el combo");
			return combobox;
		},
		/**
		 * Cuando un formulario require un Store creado a partir de datos remotos
		 * se llama a esta función para crear el fáctory. Si el factory ya creó
		 * un store de este tipo, lo devuleve. 
		 * TODO: Actualizaciones
		 */
		comboBoxStoreFactory: function (field){
			var subURL;
			//console.log("Store para ", this.formClass, field.name);
			if (field.hasOwnProperty('model')){
			  	subURL = field.model;
			} else {
				subURL = String.format('{0}__{1}', this.formClass, field.name);
			}
			
			var storeUrl = Ext.urlJoin(ns.CreateFormPanel.fkUrl, subURL),
				store = Ext.StoreMgr.get(subURL);
			
			if (store){
				console.log("Ya existe el store");
				return store;
			} else {
				console.log("Creando el store");
			}
			  
			store = new Ext.data.JsonStore({
				storeId: subURL,
				url: storeUrl,
				method: "GET",
				totalProperty: 'total',
				root: 'data',
				autoLoad: true,
				autoDestroy: false,
				fields: [{
					name: 'pk'
				},{
					name: 'str'
				}],
				idProperty: 'pk', 
				listeners: {'load': function (){
					console.log(subURL, "load()", arguments);
				}}
			});
			STORE = store;
			
			return store;
			
		},
		
		/**
		 * Envia el formulario validandolo 
		 */
		submitForm: function () {
			
			var formPanel = this,
			    form = formPanel.getForm();
			    data = form.getValues(),
				field = null;
			
			console.log(Ext.encode(data));
			
			this.getEl().mask("Trabajando");
			this.connection.request({
				url: Ext.urlJoin(this.url), // Agregar el slash final
				jsonData: data,
				success: function (response, options) {
					var result = Ext.decode(response.responseText);
					formPanel.getEl().unmask();
					if (result.success) {
						formPanel.fireEvent("success");
	                    formPanel.fireEvent("closewindow");
					} else {
						Ext.each(result.errors, function (error_dict) {
							console.log("Error dict", error_dict);
							try {
								var name = error_dict['name'],
								    field = form.items.filter('name', name).items[0];
								field.markInvalid(error_dict['msg']);
							} catch (e) {}  
						});
						//Ext.Msg.alert("Error", "Corrija los errores");
						//form.isValid();
					}
				},
				failure: function (response, options) {
					var result = Ext.decode(response.responseText);
					formPanel.getEl().unmask();
					console.log("Failure", result);
				}
			});
		},
		buttonCrearYEditar: function () {
			
		}
	});
	
	
	Ext.apply(ns.CreateFormPanel, {
	    // Definciones por defecto de los campos...
	    fieldOverrides: {
	        textfield: {
	            width: 275
	        },
			numberfield: {
				width: 100
			}
	    },
		inlineFieldOverrides: {
			textfield: {
	            width: 50
	        },
	        numberfield: {
	            width: 50
	        },
			combo: {
				width: 300
			}
		},
		// Vista que devuelve JSON de los formularios
		formUrl: '/api/forms/',
		// Vista que devuelve el JSON de los queryset en los campos ForeignKey
		fkUrl: '/api/dump_fk/'	
	});
	
	
	/**
	 * Panel de edición
	 * @param {Object} config
	 */
	Ext.define('DjExt.EditFormPanel', {
		'extends': ns.CreateFormPanel,
		constructor: function (config){
			ns.EditFormPanel.superclass.constructor.call(this, Ext.apply({
				
			},config));
		}
	});
	
	 	
});