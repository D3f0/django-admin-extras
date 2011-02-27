/**
 * @class Ext.button.Cycle
 * @extends Ext.button.Split
 * A specialized SplitButton that contains a menu of {@link Ext.menu.CheckItem} elements.  The button automatically
 * cycles through each menu item on click, raising the button's {@link #change} event (or calling the button's
 * {@link #changeHandler} function, if supplied) for the active menu item. Clicking on the arrow section of the
 * button displays the dropdown menu just like a normal SplitButton.  Example usage:
 * <pre><code>
var btn = new Ext.button.Cycle({
    showText: true,
    prependText: 'View as ',
    items: [{
        text:'text only',
        iconCls:'view-text',
        checked:true
    },{
        text:'HTML',
        iconCls:'view-html'
    }],
    changeHandler:function(btn, item){
        Ext.Msg.alert('Change View', item.text);
    }
});
</code></pre>
 * @constructor
 * Create a new split button
 * @param {Object} config The config object
 * @xtype cycle
 */

Ext.define('Ext.button.Cycle', {

    /* Begin Definitions */

    alias: 'widget.cycle',

    extend: 'Ext.button.Split',
    alternateClassName: 'Ext.CycleButton',

    /* End Definitions */

    /**
     * @cfg {Array} items An array of {@link Ext.menu.CheckItem} <b>config</b> objects to be used when creating the
     * button's menu items (e.g., {text:'Foo', iconCls:'foo-icon'})
     */
    /**
     * @cfg {Boolean} showText True to display the active item's text as the button text (defaults to false)
     */
    /**
     * @cfg {String} prependText A static string to prepend before the active item's text when displayed as the
     * button's text (only applies when showText = true, defaults to '')
     */
    /**
     * @cfg {Function} changeHandler A callback function that will be invoked each time the active menu
     * item in the button's menu has changed.  If this callback is not supplied, the SplitButton will instead
     * fire the {@link #change} event on active item change.  The changeHandler function will be called with the
     * following argument list: (SplitButton this, Ext.menu.CheckItem item)
     */
    /**
     * @cfg {String} forceIcon A css class which sets an image to be used as the static icon for this button.  This
     * icon will always be displayed regardless of which item is selected in the dropdown list.  This overrides the 
     * default behavior of changing the button's icon to match the selected item's icon on change.
     */
    /**
     * @property menu
     * @type Menu
     * The {@link Ext.menu.Menu Menu} object used to display the {@link Ext.menu.CheckItem CheckItems} representing the available choices.
     */

    // private
    getItemText: function(item) {
        if (item && this.showText === true) {
            var text = '';
            if (this.prependText) {
                text += this.prependText;
            }
            text += item.text;
            return text;
        }
        return undefined;
    },

    /**
     * Sets the button's active menu item.
     * @param {Ext.menu.CheckItem} item The item to activate
     * @param {Boolean} suppressEvent True to prevent the button's change event from firing (defaults to false)
     */
    setActiveItem: function(item, suppressEvent) {
        var me = this,
            t;
        if (!Ext.isObject(item)) {
            item = me.menu.getComponent(item);
        }
        if (item) {
            if (!me.rendered) {
                me.text = me.getItemText(item);
                me.iconCls = item.iconCls;
            } else {
                t = me.getItemText(item);
                if (t) {
                    me.setText(t);
                }
                me.setIconClass(item.iconCls);
            }
            me.activeItem = item;
            if (!item.checked) {
                item.setChecked(true, false);
            }
            if (me.forceIcon) {
                me.setIconClass(me.forceIcon);
            }
            if (!suppressEvent) {
                me.fireEvent('change', me, item);
            }
        }
    },

    /**
     * Gets the currently active menu item.
     * @return {Ext.menu.CheckItem} The active item
     */
    getActiveItem: function() {
        return this.activeItem;
    },

    // private
    initComponent: function() {
        var me = this,
            checked = 0;
        me.addEvents(
            /**
                 * @event change
                 * Fires after the button's active menu item has changed.  Note that if a {@link #changeHandler} function
                 * is set on this CycleButton, it will be called instead on active item change and this change event will
                 * not be fired.
                 * @param {Ext.CycleButton} this
                 * @param {Ext.menu.CheckItem} item The menu item that was selected
                 */
            "change"
        );

        if (me.changeHandler) {
            me.on('change', me.changeHandler, me.scope || me);
            delete me.changeHandler;
        }

        me.itemCount = me.items.length;

        me.menu = {
            cls: Ext.baseCSSPrefix + 'cycle-menu',
            items: []
        };
        Ext.each(me.items,
        function(item, i) {
            Ext.apply(item, {
                group: item.group || me.id,
                itemIndex: i,
                checkHandler: me.checkHandler,
                scope: me,
                checked: item.checked || false
            });
            me.menu.items.push(item);
            if (item.checked) {
                checked = i;
            }
        }, me);
        me.callParent(arguments);
        me.on('click', me.toggleSelected, me);
        me.setActiveItem(checked, me);
    },

    // private
    checkHandler: function(item, pressed) {
        if (pressed) {
            this.setActiveItem(item);
        }
    },

    /**
     * This is normally called internally on button click, but can be called externally to advance the button's
     * active item programmatically to the next one in the menu.  If the current item is the last one in the menu
     * the active item will be set to the first item in the menu.
     */
    toggleSelected: function() {
        var me = this,
            m = me.menu,
            i, nextIdx, checkItem;
        m.render();
        // layout if we haven't before so the items are active
        if (!m.hasLayout) {
            m.doLayout();
        }

        for (i = 1; i < me.itemCount; i++) {
            nextIdx = (me.activeItem.itemIndex + i) % me.itemCount;
            // check the potential item
            checkItem = m.items.getAt(nextIdx);
            // if its not disabled then check it.
            if (!checkItem.disabled) {
                checkItem.setChecked(true);
                break;
            }
        }
    }
});