/**
 * @class Ext.LoadMask
 * A simple utility class for generically masking elements while loading data.  If the {@link #store}
 * config option is specified, the masking will be automatically synchronized with the store's loading
 * process and the mask element will be cached for reuse.
 * <p>Example usage:</p>
 * <pre><code>
// Basic mask:
var myMask = new Ext.LoadMask(Ext.getBody(), {msg:"Please wait..."});
myMask.show();
</code></pre>

 * @constructor
 * Create a new LoadMask
 * @param {Mixed} el The element or DOM node, or its id
 * @param {Object} config The config object
 */

Ext.define('Ext.LoadMask', {

    /* Begin Definitions */

    mixins: {
        observable: 'Ext.util.Observable'
    },

    requires: ['Ext.data.StoreMgr'],

    /* End Definitions */

    /**
     * @cfg {Ext.data.Store} store
     * Optional Store to which the mask is bound. The mask is displayed when a load request is issued, and
     * hidden on either load success, or load fail.
     */

    /**
     * @cfg {String} msg
     * The text to display in a centered loading message box (defaults to 'Loading...')
     */
    msg : 'Loading...',
    /**
     * @cfg {String} msgCls
     * The CSS class to apply to the loading message element (defaults to "x-mask-loading")
     */
    msgCls : Ext.baseCSSPrefix + 'mask-loading',

    /**
     * Read-only. True if the mask is currently disabled so that it will not be displayed (defaults to false)
     * @type Boolean
     */
    disabled: false,

    constructor : function(el, config) {
        var me = this;

        me.el = Ext.get(el);
        Ext.apply(me, config);

        me.addEvents('beforeshow', 'show', 'hide');
        if (me.store) {
            me.bindStore(me.store, true);
        }
        me.mixins.observable.constructor.call(me, config);
    },

    /**
     * Changes the data store bound to this LoadMask.
     * @param {Store} store The store to bind to this LoadMask
     */
    bindStore : function(store, initial) {
        var me = this;

        if (!initial && me.store) {
            me.mun(me.store, {
                scope: me,
                beforeload: me.onBeforeLoad,
                load: me.onLoad,
                exception: me.onLoad
            });
            if(!store) {
                me.store = null;
            }
        }
        if (store) {
            store = Ext.data.StoreMgr.lookup(store);
            me.mon(store, {
                scope: me,
                beforeload: me.onBeforeLoad,
                load: me.onLoad,
                exception: me.onLoad
            });

        }
        me.store = store;
        if (store && store.isLoading()) {
            me.onBeforeLoad();
        }
    },

    /**
     * Disables the mask to prevent it from being displayed
     */
    disable : function() {
        var me = this;

       me.disabled = true;
       if (me.loading) {
           me.onLoad();
       }
    },

    /**
     * Enables the mask so that it can be displayed
     */
    enable : function() {
        this.disabled = false;
    },

    /**
     * Method to determine whether this LoadMask is currently disabled.
     * @return {Boolean} the disabled state of this LoadMask.
     */
    isDisabled : function() {
        return this.disabled;
    },

    // private
    onLoad : function() {
        var me = this;

        me.loading = false;
        me.el.unmask();
        me.fireEvent('hide', me, me.el, me.store);
    },

    // private
    onBeforeLoad : function() {
        var me = this;

        if (!me.disabled && !me.loading && me.fireEvent('beforeshow', me, me.el, me.store) !== false) {
            me.el.mask(me.msg, me.msgCls, false);
            me.fireEvent('show', me, me.el, me.store);
            me.loading = true;
        }
    },

    /**
     * Show this LoadMask over the configured Element.
     */
    show: function() {
        this.onBeforeLoad();
    },

    /**
     * Hide this LoadMask.
     */
    hide: function() {
        this.onLoad();
    },

    // private
    destroy : function() {
        this.hide();
        this.clearListeners();
    }
});
