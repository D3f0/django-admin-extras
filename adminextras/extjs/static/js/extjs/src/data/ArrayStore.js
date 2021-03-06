/**
 * @author Ed Spencer
 * @class Ext.data.ArrayStore
 * @extends Ext.data.Store
 * @ignore
 * 
 * <p>Small helper class to make creating {@link Ext.data.Store}s from Array data easier.
 * An ArrayStore will be automatically configured with a {@link Ext.data.ArrayReader}.</p>
 * 
 * <p>A store configuration would be something like:</p>
<pre><code>
var store = new Ext.data.ArrayStore({
    // store configs
    autoDestroy: true,
    storeId: 'myStore',
    // reader configs
    idIndex: 0,
    fields: [
       'company',
       {name: 'price', type: 'float'},
       {name: 'change', type: 'float'},
       {name: 'pctChange', type: 'float'},
       {name: 'lastChange', type: 'date', dateFormat: 'n/j h:ia'}
    ]
});
</code></pre>
 * <p>This store is configured to consume a returned object of the form:
<pre><code>
var myData = [
    ['3m Co',71.72,0.02,0.03,'9/1 12:00am'],
    ['Alcoa Inc',29.01,0.42,1.47,'9/1 12:00am'],
    ['Boeing Co.',75.43,0.53,0.71,'9/1 12:00am'],
    ['Hewlett-Packard Co.',36.53,-0.03,-0.08,'9/1 12:00am'],
    ['Wal-Mart Stores, Inc.',45.45,0.73,1.63,'9/1 12:00am']
];
</code></pre>
* 
 * <p>An object literal of this form could also be used as the {@link #data} config option.</p>
 * 
 * <p><b>*Note:</b> Although not listed here, this class accepts all of the configuration options of
 * <b>{@link Ext.data.ArrayReader ArrayReader}</b>.</p>
 * 
 * @constructor
 * @param {Object} config
 * @xtype arraystore
 */
Ext.define('Ext.data.ArrayStore', {
    extend: 'Ext.data.Store',
    alias: 'widget.arraystore',
    
    /**
     * @cfg {Ext.data.DataReader} reader @hide
     */
    constructor: function(config) {
        config = config || {};

        Ext.applyIf(config, {
            proxy: {
                type: 'memory',
                reader: 'array'
            }
        });

        Ext.data.ArrayStore.superclass.constructor.call(this, config);
    },

    loadData: function(data, append) {
        if (this.expandData === true) {
            var r = [],
                i = 0,
                ln = data.length;

            for (; i < ln; i++) {
                r[r.length] = [data[i]];
            }
            
            data = r;
        }

        Ext.data.ArrayStore.superclass.loadData.call(this, data, append);
    }
}, function() {
    // backwards compat
    Ext.data.SimpleStore = Ext.data.ArrayStore;
    // Ext.reg('simplestore', Ext.data.SimpleStore);
});