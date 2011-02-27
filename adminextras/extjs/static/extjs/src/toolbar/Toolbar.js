/**
 * @class Ext.toolbar.Toolbar
 * @extends Ext.container.Container
 * <p>Basic Toolbar class. Although the <code>{@link Ext.container.Container#defaultType defaultType}</code> for Toolbar
 * is <code>{@link Ext.button.Button button}</code>, Toolbar elements (child items for the Toolbar container) may
 * be virtually any type of Component. Toolbar elements can be created explicitly via their constructors,
 * or implicitly via their xtypes, and can be <code>{@link #add}</code>ed dynamically.</p>
 * <p>Some items have shortcut strings for creation:</p>
 * <pre>
<u>Shortcut</u>  <u>xtype</u>          <u>Class</u>                  <u>Description</u>
'->'      'tbfill'       {@link Ext.toolbar.Fill}       begin using the right-justified button container
'-'       'tbseparator'  {@link Ext.toolbar.Separator}  add a vertical separator bar between toolbar items
' '       'tbspacer'     {@link Ext.toolbar.Spacer}     add horiztonal space between elements
 * </pre>
 *
 * Example usage of various elements:
 * <pre><code>
var tb = new Ext.toolbar.Toolbar({
    renderTo: document.body,
    width: 600,
    height: 100,
    items: [
        {
            // xtype: 'button', // default for Toolbars, same as 'tbbutton'
            text: 'Button'
        },
        {
            xtype: 'splitbutton', // same as 'tbsplitbutton'
            text: 'Split Button'
        },
        // begin using the right-justified button container
        '->', // same as {xtype: 'tbfill'}, // Ext.toolbar.Fill
        {
            xtype: 'textfield',
            name: 'field1',
            emptyText: 'enter search term'
        },
        // add a vertical separator bar between toolbar items
        '-', // same as {xtype: 'tbseparator'} to create Ext.toolbar.Separator
        'text 1', // same as {xtype: 'tbtext', text: 'text1'} to create Ext.toolbar.TextItem
        {xtype: 'tbspacer'},// same as ' ' to create Ext.toolbar.Spacer
        'text 2',
        {xtype: 'tbspacer', width: 50}, // add a 50px space
        'text 3'
    ]
});
 * </code></pre>
 * Example adding a ComboBox within a menu of a button:
 * <pre><code>
// ComboBox creation
var combo = new Ext.form.ComboBox({
    store: new Ext.data.ArrayStore({
        autoDestroy: true,
        fields: ['initials', 'fullname'],
        data : [
            ['FF', 'Fred Flintstone'],
            ['BR', 'Barney Rubble']
        ]
    }),
    displayField: 'fullname',
    typeAhead: true,
    mode: 'local',
    forceSelection: true,
    triggerAction: 'all',
    emptyText: 'Select a name...',
    selectOnFocus: true,
    width: 135,
    getListParent: function() {
        return this.el.up('.x-menu');
    },
    iconCls: 'no-icon' //use iconCls if placing within menu to shift to right side of menu
});

// put ComboBox in a Menu
var menu = new Ext.menu.Menu({
    id: 'mainMenu',
    items: [
        combo // A Field in a Menu
    ]
});

// add a Button with the menu
tb.add({
        text:'Button w/ Menu',
        menu: menu  // assign menu by instance
    });
 * </code></pre>
 * @constructor
 * Creates a new Toolbar
 * @param {Object/Array} config A config object or an array of buttons to <code>{@link #add}</code>
 * @xtype toolbar
 */
Ext.define('Ext.toolbar.Toolbar', {
    extend: 'Ext.container.Container',
    requires: [
        'Ext.toolbar.Fill',
        'Ext.layout.container.HBox',
        'Ext.layout.container.VBox'
    ],
    alias: 'widget.toolbar',
    alternateClassName: 'Ext.Toolbar',
    isToolbar: true,

    vertical: false,
    defaultType: 'button',

    /**
     * @cfg {String/Object} layout
     * This class assigns a default layout (<code>layout:'<b>hbox</b>'</code>).
     * Developers <i>may</i> override this configuration option if another layout
     * is required (the constructor must be passed a configuration object in this
     * case instead of an array).
     * See {@link Ext.container.Container#layout} for additional information.
     */

    /**
     * @cfg {Boolean} enableOverflow
     * Defaults to false. Configure <code>true</code> to make the toolbar provide a button
     * which activates a dropdown Menu to show items which overflow the Toolbar's width.
     */
    enableOverflow : false,

    trackMenus: true,

    baseCls: Ext.baseCSSPrefix + 'toolbar',

    ariaRole: 'toolbar',

    ui: 'default',

    initComponent: function() {
        var me = this;

        me.layout = Ext.applyIf(Ext.isString(me.layout) ? {
            type: me.layout
        } : me.layout||{}, {
            type: me.vertical ? 'vbox' : 'hbox',
            align: me.vertical ? 'center' : 'middle'
        });
        me.callParent();

        /**
         * @event overflowchange
         * Fires after the overflow state has changed.
         * @param {Object} c The Container
         * @param {Boolean} lastOverflow overflow state
         */
        me.addEvents('overflowchange');
    },

    /**
     * <p>Adds element(s) to the toolbar -- this function takes a variable number of
     * arguments of mixed type and adds them to the toolbar.</p>
     * <br><p><b>Note</b>: See the notes within {@link Ext.container.Container#add}.</p>
     * @param {Mixed} arg1 The following types of arguments are all valid:<br />
     * <ul>
     * <li>{@link Ext.button.Button} config: A valid button config object (equivalent to {@link #addButton})</li>
     * <li>HtmlElement: Any standard HTML element (equivalent to {@link #addElement})</li>
     * <li>Field: Any form field (equivalent to {@link #addField})</li>
     * <li>Item: Any subclass of {@link Ext.toolbar.Toolbar.Item} (equivalent to {@link #addItem})</li>
     * <li>String: Any generic string (gets wrapped in a {@link Ext.toolbar.Toolbar.TextItem}, equivalent to {@link #addText}).
     * Note that there are a few special strings that are treated differently as explained next.</li>
     * <li>'-': Creates a separator element (equivalent to {@link #addSeparator})</li>
     * <li>' ': Creates a spacer element (equivalent to {@link #addSpacer})</li>
     * <li>'->': Creates a fill element (equivalent to {@link #addFill})</li>
     * </ul>
     * @param {Mixed} arg2
     * @param {Mixed} etc.
     * @method add
     */

    // private
    lookupComponent: function(c) {
        if (Ext.isString(c)) {
            var shortcut = Ext.toolbar.Toolbar.shortcuts[c];
            if (shortcut) {
                c = {
                    xtype: shortcut
                };
            } else {
                c = {
                    xtype: 'tbtext',
                    text: c
                };
            }
            this.applyDefaults(c);
        }
        return this.callParent(arguments);
    },

    // private
    applyDefaults: function(c) {
        if (!Ext.isString(c)) {
            c = this.callParent(arguments);
            var d = this.internalDefaults;
            if (c.events) {
                Ext.applyIf(c.initialConfig, d);
                Ext.apply(c, d);
            } else {
                Ext.applyIf(c, d);
            }
        }
        return c;
    },

    // private
    trackMenu: function(item, remove) {
        if (this.trackMenus && item.menu) {
            var method = remove ? 'mun' : 'mon',
                me = this;

            me[method](item, 'menutriggerover', me.onButtonTriggerOver, me);
            me[method](item, 'menushow', me.onButtonMenuShow, me);
            me[method](item, 'menuhide', me.onButtonMenuHide, me);
        }
    },

    // private
    constructButton: function(item) {
        return item.events ? item : this.createComponent(item, item.split ? 'splitbutton' : this.defaultType);
    },

    // private
    onBeforeAdd: function(component) {
        if (component.is('button') && this.ui != 'footer') {
            component.ui = 'toolbar';
        }
        this.callParent(arguments);
    },

    // private
    onAdd: function(component) {
        this.callParent(arguments);

        this.trackMenu(component);
        if (this.disabled) {
            component.disable();
        }
    },

    // private
    onRemove: function(c) {
        this.callParent(arguments);
        this.trackMenu(c, true);
    },

    // private
    onDisable: function() {
        this.items.each(function(item) {
            if (item.disable) {
                item.disable();
            }
        });
    },

    // private
    onEnable: function() {
        this.items.each(function(item) {
            if (item.enable) {
                item.enable();
            }
        });
    },

    // private
    onButtonTriggerOver: function(btn){
        if (this.activeMenuBtn && this.activeMenuBtn != btn) {
            this.activeMenuBtn.hideMenu();
            btn.showMenu();
            this.activeMenuBtn = btn;
        }
    },

    // private
    onButtonMenuShow: function(btn) {
        this.activeMenuBtn = btn;
    },

    // private
    onButtonMenuHide: function(btn) {
        delete this.activeMenuBtn;
    }
}, function() {
    this.shortcuts = {
        '-': 'tbseparator',
        ' ': 'tbspacer',
        '->': 'tbfill'
    };
});