/**
 * @class Ext.form.ComboBox
 * @extends Ext.form.Picker

A combobox control with support for autocomplete, remote-loading, paging and many other features.

A ComboBox works in a similar manner to a traditional HTML &lt;select> field. The difference is
that to submit the {@link #valueField}, you must specify a {@link #hiddenName} to create a hidden input
field to hold the value of the valueField. The _{@link #displayField}_ is shown in the text field
which is named according to the {@link #name}.

#Events#

To do something when something in ComboBox is selected, configure the select event:

    var cb = new Ext.form.ComboBox({
        // all of your config options
        listeners:{
             scope: yourScope,
             'select': yourFunction
        }
    });

    // Alternatively, you can assign events after the object is created:
    var cb = new Ext.form.ComboBox(yourOptions);
    cb.on('select', yourFunction, yourScope);

#ComboBox in Grid#

If using a ComboBox in an {@link Ext.grid.EditorGridPanel Editor Grid} a {@link Ext.grid.Column#renderer renderer}
will be needed to show the displayField when the editor is not active.  Set up the renderer manually, or implement
a reusable render, for example:

    // create reusable renderer
    Ext.util.Format.comboRenderer = function(combo){
        return function(value){
            var record = combo.findRecord(combo.{@link #valueField}, value);
            return record ? record.get(combo.{@link #displayField}) : combo.{@link #valueNotFoundText};
        }
    }

    // create the combo instance
    var combo = new Ext.form.ComboBox({
        {@link #typeAhead}: true,
        {@link #triggerAction}: 'all',
        {@link #lazyRender}:true,
        {@link #mode}: 'local',
        {@link #store}: new Ext.data.ArrayStore({
            id: 0,
            fields: [
                'myId',
                'displayText'
            ],
            data: [[1, 'item1'], [2, 'item2']]
        }),
        {@link #valueField}: 'myId',
        {@link #displayField}: 'displayText'
    });

    // snippet of column model used within grid
    var cm = new Ext.grid.ColumnModel([{
           ...
        },{
           header: "Some Header",
           dataIndex: 'whatever',
           width: 130,
           editor: combo, // specify reference to combo instance
           renderer: Ext.util.Format.comboRenderer(combo) // pass combo instance to reusable renderer
        },
        ...
    ]);

#Filtering#

A ComboBox {@link #doQuery uses filtering itself}, for information about filtering the ComboBox
store manually see <tt>{@link #lastQuery}</tt>.

 * @constructor
 * Create a new ComboBox.
 * @param {Object} config Configuration options
 * @xtype combo
 * @markdown
 */
Ext.define('Ext.form.ComboBox', {
    extend:'Ext.form.Picker',
    requires: ['Ext.util.DelayedTask', 'Ext.EventObject', 'Ext.view.BoundList', 'Ext.view.BoundListKeyNav', 'Ext.data.StoreMgr'],
    alias: ['widget.combobox', 'widget.combo'],

    /**
     * @cfg {String} triggerCls
     * An additional CSS class used to style the trigger button. The trigger will always get the
     * {@link #triggerBaseCls} by default and <tt>triggerCls</tt> will be <b>appended</b> if specified.
     * Defaults to 'x-form-arrow-trigger' for ComboBox.
     */
    triggerCls: Ext.baseCSSPrefix + 'form-arrow-trigger',

    /**
     * @cfg {Ext.data.Store/Array} store The data source to which this combo is bound (defaults to <tt>undefined</tt>).
     * Acceptable values for this property are:
     * <div class="mdetail-params"><ul>
     * <li><b>any {@link Ext.data.Store Store} subclass</b></li>
     * <li><b>an Array</b> : Arrays will be converted to a {@link Ext.data.ArrayStore} internally,
     * automatically generating {@link Ext.data.Field#name field names} to work with all data components.
     * <div class="mdetail-params"><ul>
     * <li><b>1-dimensional array</b> : (e.g., <tt>['Foo','Bar']</tt>)<div class="sub-desc">
     * A 1-dimensional array will automatically be expanded (each array item will be used for both the combo
     * {@link #valueField} and {@link #displayField})</div></li>
     * <li><b>2-dimensional array</b> : (e.g., <tt>[['f','Foo'],['b','Bar']]</tt>)<div class="sub-desc">
     * For a multi-dimensional array, the value in index 0 of each item will be assumed to be the combo
     * {@link #valueField}, while the value at index 1 is assumed to be the combo {@link #displayField}.
     * </div></li></ul></div></li></ul></div>
     * <p>See also <tt>{@link #queryMode}</tt>.</p>
     */

    /**
     * @cfg {Boolean} multiSelect
     * If set to <tt>true</tt>, allows the combo field to hold more than one value at a time, and allows selecting
     * multiple items from the dropdown list. The combo's text field will show all selected values separated by
     * the {@link #delimiter}. (Defaults to <tt>false</tt>.)
     */
    multiSelect: false,

    /**
     * @cfg {String} delimiter
     * The character(s) used to separate the {@link #displayField display values} of multiple selected items
     * when <tt>{@link #multiSelect} = true</tt>. Defaults to <tt>', '</tt>.
     */
    delimiter: ', ',

    /**
     * @cfg {String} displayField The underlying {@link Ext.data.Field#name data field name} to bind to this
     * ComboBox (defaults to 'text').
     * <p>See also <tt>{@link #valueField}</tt>.</p>
     * <p>TODO still valid? <b>Note</b>: if using a ComboBox in an {@link Ext.grid.EditorGridPanel Editor Grid} a
     * {@link Ext.grid.Column#renderer renderer} will be needed to show the displayField when the editor is not
     * active.</p>
     */
    displayField: 'text',

    /**
     * @cfg {String} valueField
     * @required
     * The underlying {@link Ext.data.Field#name data value name} to bind to this ComboBox (defaults to match
     * the value of the {@link #displayField} config).
     * <p>TODO still valid? <b>Note</b>: use of a <tt>valueField</tt> requires the user to make a selection in order for a value to be
     * mapped.  See also <tt>{@link #hiddenName}</tt>, <tt>{@link #hiddenValue}</tt>, and <tt>{@link #displayField}</tt>.</p>
     */

    /**
     * @cfg {String} triggerAction The action to execute when the trigger is clicked.
     * <div class="mdetail-params"><ul>
     * <li><b><tt>'all'</tt></b> : <b>Default</b>
     * <p class="sub-desc">{@link #doQuery run the query} specified by the <tt>{@link #allQuery}</tt> config option</p></li>
     * <li><b><tt>'query'</tt></b> :
     * <p class="sub-desc">{@link #doQuery run the query} using the {@link Ext.form.BaseField#getRawValue raw value}.</p></li>
     * </ul></div>
     * <p>See also <code>{@link #queryParam}</code>.</p>
     */
    triggerAction: 'all',

    /**
     * @cfg {String} allQuery The text query to send to the server to return all records for the list
     * with no filtering (defaults to '')
     */
    allQuery: '',

    /**
     * @cfg {String} queryParam Name of the query ({@link Ext.data.Store#baseParam baseParam} name for the store)
     * as it will be passed on the querystring (defaults to <tt>'query'</tt>)
     */
    queryParam: 'query',

    /**
     * @cfg {String} queryMode
     * The mode for queries. Acceptable values are:
     * <div class="mdetail-params"><ul>
     * <li><b><tt>'remote'</tt></b> : <b>Default</b>
     * <p class="sub-desc">Automatically loads the <tt>{@link #store}</tt> the <b>first</b> time the trigger
     * is clicked. If you do not want the store to be automatically loaded the first time the trigger is
     * clicked, set to <tt>'local'</tt> and manually load the store.  To force a requery of the store
     * <b>every</b> time the trigger is clicked see <tt>{@link #lastQuery}</tt>.</p></li>
     * <li><b><tt>'local'</tt></b> :
     * <p class="sub-desc">ComboBox loads local data</p>
     * <pre><code>
var combo = new Ext.form.ComboBox({
    renderTo: document.body,
    queryMode: 'local',
    store: new Ext.data.ArrayStore({
        id: 0,
        fields: [
            'myId',  // numeric value is the key
            'displayText'
        ],
        data: [[1, 'item1'], [2, 'item2']]  // data is local
    }),
    valueField: 'myId',
    displayField: 'displayText',
    triggerAction: 'all'
});
     * </code></pre></li>
     * </ul></div>
     */
    queryMode: 'remote',

    queryCaching: true,

    /**
     * @cfg {Number} queryDelay The length of time in milliseconds to delay between the start of typing and
     * sending the query to filter the dropdown list (defaults to <tt>500</tt> if <tt>{@link #queryMode} = 'remote'</tt>
     * or <tt>10</tt> if <tt>{@link #queryMode} = 'local'</tt>)
     */

    /**
     * @cfg {Number} minChars The minimum number of characters the user must type before autocomplete and
     * {@link #typeAhead} activate (defaults to <tt>4</tt> if <tt>{@link #queryMode} = 'remote'</tt> or <tt>0</tt> if
     * <tt>{@link #queryMode} = 'local'</tt>, does not apply if <tt>{@link Ext.form.Trigger#editable editable} = false</tt>).
     */

    /**
     * @cfg {Boolean} autoSelect <tt>true</tt> to select the first result gathered by the data store (defaults
     * to <tt>true</tt>).  A false value would require a manual selection from the dropdown list to set the components value
     * unless the value of ({@link #typeAhead}) were true.
     */
    autoSelect: true,

    /**
     * @cfg {Boolean} typeAhead <tt>true</tt> to populate and autoselect the remainder of the text being
     * typed after a configurable delay ({@link #typeAheadDelay}) if it matches a known value (defaults
     * to <tt>false</tt>)
     */
    typeAhead: false,

    /**
     * @cfg {Number} typeAheadDelay The length of time in milliseconds to wait until the typeahead text is displayed
     * if <tt>{@link #typeAhead} = true</tt> (defaults to <tt>250</tt>)
     */
    typeAheadDelay: 250,

    /**
     * @cfg {Boolean} selectOnTab
     * Whether the Tab key should select the currently highlighted item. Defaults to <tt>true</tt>.
     */
    selectOnTab: true,
    
    /**
     * @cfg {Boolean} forceSelection <tt>true</tt> to restrict the selected value to one of the values in the list,
     * <tt>false</tt> to allow the user to set arbitrary text into the field (defaults to <tt>false</tt>)
     */
    forceSelection: false,

    /**
     * The value of the match string used to filter the store. Delete this property to force a requery.
     * Example use:
     * <pre><code>
var combo = new Ext.form.ComboBox({
    ...
    queryMode: 'remote',
    listeners: {
        // delete the previous query in the beforequery event or set
        // combo.lastQuery = null (this will reload the store the next time it expands)
        beforequery: function(qe){
            delete qe.combo.lastQuery;
        }
    }
});
     * </code></pre>
     * To make sure the filter in the store is not cleared the first time the ComboBox trigger is used
     * configure the combo with <tt>lastQuery=''</tt>. Example use:
     * <pre><code>
var combo = new Ext.form.ComboBox({
    ...
    queryMode: 'local',
    triggerAction: 'all',
    lastQuery: ''
});
     * </code></pre>
     * @property lastQuery
     * @type String
     */


    ///// Config properties for the BoundList:
    // TODO consider removing all of these in favor of a single listConfig object which would be passed
    // directly to the BoundList constructor after combination with default configs. That would be
    // simpler and more flexible as any aspect of the BoundList could be customized.


    /**
     * @cfg {String} listEmptyText The empty text to display in the data view if no items are found.
     * (defaults to '')
     */
    listEmptyText: '',

    /**
     * @cfg {String} listLoadingText The text to display in the dropdown list while data is loading.  Only applies
     * when <tt>{@link #mode} = 'remote'</tt> (defaults to <tt>'Loading...'</tt>)
     */
    listLoadingText: 'Loading...',

    /**
     * @cfg {Number} listMaxHeight The maximum height in pixels of the dropdown list before scrollbars are shown
     * (defaults to <tt>300</tt>)
     */
    listMaxHeight: 300,

    /**
     * @cfg {Number} listWidth The width in pixels of the dropdown list (defaults to the width of the ComboBox
     * field).
     */

    /**
     * @cfg {Function} getInnerTpl If specified, will be used to generate the template for the markup inside
     * each item in the dropdown list. Defaults to the {@link Ext.view.BoundList}'s default behavior, which
     * is to display the value of each item's {@link #displayField}.
     * @return {String} The template string
     */



    //<debug>
    deprecatedProperties: [
        // slated to be removed/yet to be implemented
        'autoCreate',
        'clearFilterOnReset',
        'handleHeight',
        'hiddenId',
        'hiddenName',
        'itemSelector', // could be passed to BoundList config
        'lazyInit',
        'lazyRender',
        'listAlign', // -> pickerAlign
        'listClass', // could be passed to BoundList config's cls
        'loadingText', // -> listLoadingText
        'maxHeight', // -> listMaxHeight
        'minHeight', // -> ???
        'minListWidth', // -> ???
        'mode', // -> queryMode
        'pageSize',
        'resizable', // could be passed to BoundList config
        'selectedClass', // could be passed to BoundList config's selectedItemCls
        'shadow', // could be passed to BoundList config's floating.shadow
        'title',
        'tpl', // -> getInnerTpl
        'transform',
        'triggerClass', // -> triggerCls,
        'valueNotFoundText' // -> ???
    ],
    //</debug>
    
    
    /**
     * @type Boolean
     * @property isExpanded
     */

    initComponent: function() {
        var me = this,
            isLocalMode = me.queryMode === 'local',
            isDefined = Ext.isDefined;

        //<debug>
        if (!me.store) {
            throw "Ext.form.ComboBox: No store defined on ComboBox.";
        }
        if (me.typeAhead && me.multiSelect) {
            throw "Ext.form.ComboBox: typeAhead and multiSelect are mutually exclusive options.";
        }
        if (me.typeAhead && !me.editable) {
            throw "Ext.form.ComboBox: typeAhead must be used in conjunction with editable.";
        }
        if (me.selectOnFocus && !me.editable) {
            throw "Ext.form.ComboBox: selectOnFocus must be used in conjunction with editable.";
        }

        var dp = me.deprecatedProperties,
            ln = dp.length,
            i  = 0;
        for (; i < ln; i++) {
            if (isDefined(me[dp[i]])) {
                throw dp[i] + " is no longer supported.";
            }
        }
        //</debug>

        this.addEvents(
            // TODO need beforeselect?
                
            /**
             * @event beforequery
             * Fires before all queries are processed. Return false to cancel the query or set the queryEvent's
             * cancel property to true.
             * @param {Object} queryEvent An object that has these properties:<ul>
             * <li><code>combo</code> : Ext.form.ComboBox <div class="sub-desc">This combo box</div></li>
             * <li><code>query</code> : String <div class="sub-desc">The query string</div></li>
             * <li><code>forceAll</code> : Boolean <div class="sub-desc">True to force "all" query</div></li>
             * <li><code>cancel</code> : Boolean <div class="sub-desc">Set to true to cancel the query</div></li>
             * </ul>
             */
            'beforequery'
        );

        
        me.bindStore(me.store, true);
        if (me.store.autoCreated) {
            me.valueField = 'field1';
            me.displayField = 'field2';
        }

        if (!isDefined(me.valueField)) {
            me.valueField = me.displayField;
        }

        if (!isDefined(me.queryDelay)) {
            me.queryDelay = isLocalMode ? 10 : 500;
        }
        if (!isDefined(me.minChars)) {
            me.minChars = isLocalMode ? 0 : 4;
        }

        if (!me.displayTpl) {
            me.displayTpl = new Ext.XTemplate('<tpl for=".">{' + me.displayField + '}<tpl if="xindex < xcount">' + me.delimiter + '</tpl></tpl>');
        } else if (Ext.isString(me.displayTpl)) {
            me.displayTpl = new Ext.XTemplate(me.displayTpl);
        }

        me.callParent();

        me.doQueryTask = new Ext.util.DelayedTask(me.doRawQuery, me);
        
        // store has already been loaded, setValue
        if (me.store.getCount() > 0) {
            me.setValue(me.value);
        }
    },

    beforeBlur: function() {
        var me = this;
        me.doQueryTask.cancel();
        if (me.forceSelection) {
            me.assertValue();
        } else {
            me.collapse();
        }
    },

    // private
    assertValue: function() {
        var me = this,
            value = me.getRawValue(),
            rec   = me.findRecordByDisplay(value);
        
        // forceSelection required by no record found
        if (me.forceSelection && !rec) {
            me.setRawValue('');
            me.applyEmptyText();
        } else if (rec) {
            me.select(rec);
        }
        me.collapse();
    },

    onTypeAhead: function() {
        var me = this,
            displayField = me.displayField,
            record = me.store.findRecord(displayField, me.getRawValue()),
            boundList = me.getPicker(),
            newValue, len, selStart;

        if (record) {
            newValue = record.get(displayField);
            len = newValue.length;
            selStart = me.getRawValue().length;

            boundList.highlightItem(boundList.getNode(record));
            
            if (selStart !== 0 && selStart !== len) {
                me.setRawValue(newValue);
                me.selectText(selStart, newValue.length);
            }
        }
    },

    // invoked when a different store is bound to this combo
    // than the original
    resetToDefault: function() {
        
    },

    bindStore: function(store, initial) {
        var me = this,
            oldStore = me.store;

        // this code directly accesses this.picker, bc invoking getPicker
        // would create it when we may be preping to destroy it
        if (oldStore && !initial) {
            if (oldStore !== store && oldStore.autoDestroy) {
                oldStore.destroy();
            } else {
                oldStore.un('load', me.onLoad, me);
                oldStore.un('exception', me.collapse, me);
            }
            if (!store) {
                me.store = null;
                if (me.picker) {
                    me.picker.bindStore(null);
                }
            }
        }
        if (store) {
            if (!initial) {
                me.resetToDefault();
            }

            me.store = Ext.data.StoreMgr.lookup(store);
            me.store.on({
                scope: me,
                load: me.onLoad,
                exception: me.collapse
            });

            if (me.picker) {
                me.picker.bindStore(store);
            }
        }
    },
    
    onLoad: function() {
        var me = this;

        // Set the value on load
        if (me.value) {
            me.setValue(me.value);
        } else {
            // There's no value.
            // Highlight the first item in the list if autoSelect: true
            if (me.store.getCount()) {
                me.doAutoSelect();
            } else {
                me.setValue('');
            }
        }

        // check to make sure value is in set
        if (me.forceSelection) {
            me.assertValue();
        }
    },
    
    /**
     * @private
     * Execute the query with the raw contents within the textfield.
     */
    doRawQuery: function() {
        this.doQuery(this.getRawValue());
    },

    /**
     * Executes a query to filter the dropdown list. Fires the {@link #beforequery} event prior to performing the
     * query allowing the query action to be canceled if needed.
     * @param {String} queryString The SQL query to execute
     * @param {Boolean} forceAll <tt>true</tt> to force the query to execute even if there are currently fewer
     * characters in the field than the minimum specified by the <tt>{@link #minChars}</tt> config option.  It
     * also clears any filter previously saved in the current store (defaults to <tt>false</tt>)
     * @return {Boolean} true if the query was permitted to run, false if it was cancelled by a {@link #beforequery} handler.
     */
    doQuery: function(queryString, forceAll) {
        queryString = queryString || '';
        
        // store in object and pass by reference in 'beforequery'
        // so that client code can modify values.
        var me = this,
            qe = {
                query: queryString,
                forceAll: forceAll,
                combo: me,
                cancel: false
            },
            store = me.store,
            isLocalMode = me.queryMode === 'local';

        if (me.fireEvent('beforequery', qe) === false || qe.cancel) {
            return false;
        }
        
        // get back out possibly modified values
        queryString = qe.query;
        forceAll = qe.forceAll;
        
        // query permitted to run
        if (forceAll || (queryString.length >= me.minChars)) {
            // expand before starting query so LoadMask can position itself correctly
            me.expand();

            // make sure they aren't querying the same thing
            if (!me.queryCaching || me.lastQuery !== queryString) {
                me.lastQuery = queryString;
                store.clearFilter();
                if (isLocalMode) {
                    if (!forceAll) {
                        store.filter(me.displayField, queryString);
                    }
                } else {
                    store.load({
                        params: me.getParams(queryString)
                    });
                }
            }

            if (isLocalMode) {
                me.doAutoSelect();
            }
            if (me.typeAhead) {
                me.doTypeAhead();
            }
        }
        return true;
    },

    // private
    getParams: function(queryString) {
        var p = {};
        p[this.queryParam] = queryString;
        return p;
    },

    /**
     * @private
     * If the autoSelect config is true, and the picker is open, highlights the first item.
     */
    doAutoSelect: function() {
        var me = this,
            picker = me.picker;
        if (picker && me.autoSelect && me.store.getCount() > 0) {
            picker.highlightItem(picker.getNode(0));
        }
    },
    
    doTypeAhead: function() {
        if (!this.typeAheadTask) {
            this.typeAheadTask = new Ext.util.DelayedTask(this.onTypeAhead, this);
        }
        if (this.lastKey != Ext.EventObject.BACKSPACE && this.lastKey != Ext.EventObject.DELETE) {
            this.typeAheadTask.delay(this.typeAheadDelay);
        }
    },
    


    onTriggerClick: function() {
        var me = this;
        if (!me.readOnly && !me.disabled) {
            if (me.isExpanded) {
                me.collapse();
            } else {
                me.onFocus({});
                if (me.triggerAction === 'all') {
                    me.doQuery(me.allQuery, true);
                } else {
                    me.doQuery(me.getRawValue());
                }
            }
            me.inputEl.focus();
        }
    },

    
    // store the last key and doQuery if relevant
    onKeyUp: function(e, t) {
        var key = e.getKey();
        
        this.lastKey = key;
        // we put this in a task so that we can cancel it if a user is
        // in and out before the queryDelay elapses
        
        // perform query w/ any normal key or backspace or delete
        if (!e.isSpecialKey() || key == e.BACKSPACE || key == e.DELETE) {
            this.doQueryTask.delay(this.queryDelay);
        }
    },

    initEvents: function() {
        var me = this;
        me.callParent();

        // setup keyboard handling
        me.mon(me.inputEl, 'keyup', me.onKeyUp, me);
    },

    createPicker: function() {
        var me = this,
            picker,
            opts = {
                selModel: {
                    mode: me.multiSelect ? 'SIMPLE' : 'SINGLE'
                },
                floating: true,
                hidden: true,
                ownerCt: this.ownerCt,
                renderTo: document.body,
                store: me.store,
                displayField: me.displayField,
                width: me.listWidth,
                maxHeight: me.listMaxHeight,
                loadingText: me.listLoadingText,
                emptyText: me.listEmptyText
            };

        if (me.getInnerTpl) {
            opts.getInnerTpl = me.getInnerTpl;
        }

        picker = new Ext.view.BoundList(opts);

        // Ensure the selected Models display as selected.
        if (me.value) {
            me.select(me.value.split(me.delimiter));
        }

        me.mon(picker.getSelectionModel(), {
            selectionChange: me.onListSelectionChange,
            scope: me
        });

        return picker;
    },

    onListSelectionChange: function(list, selectedRecords) {
        var me = this;
        // Only react to selection if it is not called from setValue, and if our list is
        // expanded (ignores changes to the selection model triggered elsewhere)
        if (!me.inSetValue && me.isExpanded) {
            if (!me.multiSelect) {
                Ext.defer(me.collapse, 1, me);
            }
            me.setValue(selectedRecords, false);
            me.fireEvent('select', me, selectedRecords);
            me.inputEl.focus();
        }
    },

    /**
     * @private
     * Enables the key nav for the BoundList when it is expanded.
     */
    onExpand: function() {
        var me = this,
            keyNav = me.listKeyNav,
            picker = me.getPicker(),
            lastSelected = picker.getSelectionModel().lastSelected,
            itemNode;

        if (!keyNav) {
            keyNav = me.listKeyNav = new Ext.view.BoundListKeyNav(this.inputEl, {
                boundList: picker,
                selectOnTab: me.selectOnTab,
                forceKeyDown: true
            });
        }
        Ext.defer(keyNav.enable, 1, keyNav); //wait a bit so it doesn't react to the down arrow opening the picker

        // Highlight the last selected item and scroll it into view
        if (lastSelected) {
            itemNode = picker.getNode(lastSelected);
            if (itemNode) {
                picker.highlightItem(itemNode);
                picker.el.scrollChildIntoView(itemNode, false);
            }
        }

        me.inputEl.focus();
    },

    /**
     * @private
     * Disables the key nav for the BoundList when it is collapsed.
     */
    onCollapse: function() {
        var keyNav = this.listKeyNav;
        if (keyNav) {
            keyNav.disable();
        }
    },


    
    /**
     * Selects an item by a {@link Ext.data.Model Model}, or by a key value.
     * @param r
     */
    select: function(r) {
        this.setValue(r, true);
/*        //<debug>
        if (!r || !r.isModel) {
            throw "Ext.form.ComboBox: Attempting to select a non record.";
        }
        //</debug>
        var list         = this.getPicker(),
            sm           = list.getSelectionModel(),
            displayField = this.displayField,
            displayValue = r.get(this.displayField),
            value        = r.get(this.valueField);
        
        sm.doSelect(r);
        this.value = value;
        this.setRawValue(displayValue); */
    },
    

    /**
     * Find the record by searching for a specific field/value combination
     * Returns an Ext.data.Record or false
     * @private
     */
    findRecord: function(field, value) {
        var ds  = this.store,
            idx = ds.find(field, value);
        
        if (idx !== -1) {
            return ds.getAt(idx);
        } else {
            return false;
        }
    },
    findRecordByValue: function(value) {
        return this.findRecord(this.valueField, value);
    },
    findRecordByDisplay: function(value) {
        return this.findRecord(this.displayField, value);
    },    

    /**
     * Sets the combo box's value(s).
     * @private
     * intentionally overriding superclass
     * @param v Either an array, or a single instance of key value(s) or Model(s)
     * @param doSelect Pass true to select the Models in the bound list.
     * Do not pass this when selecting <b>from</b> the list!
     */
    setValue: function(v, doSelect) {
        var me = this,
            i = 0,
            l,
            r,
            usingModels,
            ln,
            models = [],
            data = [],
            value = [];

        if (v) {
            if (me.store.loading) {
                // Called while the Store is loading. Ensure it is
                // processed by the onLoad method.
                this.value = v;
                return;
            } else {
                // This method processes multi-values, so ensure value is an array.
                if (Ext.isArray(v)) {
                    ln = v.length;
                } else {
                    v = [ v ];
                    ln = 1;
                }

                // Are we processing an Array of Models or keys?
                usingModels = v[0] instanceof Ext.data.Model;

                // Loop through them
                for (; i < ln; i++) {
                    if (usingModels) {
                        r = v[i];
                    } else {
                        r = this.findRecordByValue(v[i]);
                    }
                    // record found, select it.
                    if (r) {
                        models.push(r);
                        data.push(r.data);
                        value.push(r.get(this.valueField));
                    // record was not found, this could happen because
                    // store is not loaded or they set a value not in the store
                    } else {
                        value.push(v[i]);
                    }
                }
            }

            // Select the rows in the list if required.
            // This must not recurse into here.
            if ((this.isExpanded && (doSelect !== false)) || (this.picker && doSelect)) {
                this.inSetValue = true;
                this.picker.getSelectionModel().select(models);
                delete this.inSetValue;
            }

            // Set the value of this field. If we are multiselecting, then that is an array.
            this.value = (value.length == 1) ? value[0] : value;

            // Calculate raw value from the collection of Model data
            this.setRawValue(this.displayTpl.apply(data));
        }
    },

    // @private
    // intentionally overriding superclass
    getValue: function() {
        return this.value;
    },
    
    // @private
    getSubmitValue: function() {
        var me = this;
        return (me.disabled || !me.submitValue) ? null : me.getValue();
    }
});
