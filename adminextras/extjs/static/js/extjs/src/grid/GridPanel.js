/**
 * @class Ext.grid.GridPanel
 * @extends Ext.panel.Panel
 *
 * Aggregates GridSections in a layout of hbox align stretch
 *
 * GridScrollers will be docked here based off of the scroll configuration
 *
 * @xtype gridpanel
 */
Ext.define('Ext.grid.GridPanel', {
    extend: 'Ext.panel.Panel',
    alias: ['widget.gridpanel', 'widget.grid'],
    alternateClassName: ['Ext.list.ListView', 'Ext.ListView'],
    requires: [
        'Ext.grid.Section',
        'Ext.grid.Scroller',
        'Ext.grid.RowSelectionModel',
        //'Ext.grid.CellSelectionModel',
        //'Ext.grid.CheckboxSelectionModel',
        'Ext.data.StoreMgr',
        'Ext.layout.container.Fit',
        'Ext.layout.container.HBox',
        'Ext.layout.component.Dock'
    ],

    defaultType: 'gridsection',
    
    verticalScrollDock: 'right',
    /**
     * @cfg {String/Boolean} scroll
     * Valid values are 'both', 'horizontal' or 'vertical'. true implies 'both'. false implies 'none'.
     * Defaults to true.
     */
    scroll: true,
    
    /**
     * @cfg {Mixed} selModel
     */
    
    /**
     * @cfg {Mixed} store
     */
    
    /**
     * @cfg {Mixed} colModel/headers
     */
    initComponent: function() {
        if (this.columnLines) {
            this.cls = (this.cls || '') + ' ' + Ext.baseCSSPrefix + 'grid-with-col-lines';
        }
        // <debug>
        if (this.autoExpandColumn) {
            console.warn("Ext.grid.GridPanel: autoExpandColumn has been removed in favor of flexible headers.");
        }
        if (this.trackMouseOver) {
            console.warn('Ext.grid.GridPanel: trackMouseOver has been removed in favor of the trackOver configuration inherited from DataView. Pass in viewConfig: {trackOver: false}');
        }
        // </debug>
        
        
        var sm = this.getSelectionModel();
        
        this.layout = {
            type: 'hbox',
            align: 'stretch'
        };
        

        
        // Single pre-defined section
        // the typical case.
        if (!this.items) {
            this.layout = 'fit';
            var gridSectionCfg = {
                xtype: 'gridsection'
            };
            gridSectionCfg.headers = this.headers;
            gridSectionCfg.features = this.features;
            gridSectionCfg.viewConfig = this.viewConfig;
            delete this.headers;
            delete this.features;
            delete this.viewConfig;
            this.items = [gridSectionCfg];
        }
        
        this.store = Ext.data.StoreMgr.lookup(this.store);
        this.store.on('load', this.onStoreLoad, this);
        var items = this.items;
        // Inject the selModel into each GridSection.
        for (var i = 0, ln = items.length; i < ln; i++) {
            if (items[i]) {
                items[i].selModel = sm;
                items[i].store = this.store;
            }
            
            // <debug>
            if (items[i].columns) {
                items[i].headers = items[i].columns;
                console.warn("Ext.grid.GridPanel now specifies the headers via the headers configuration rather than columns.");
                delete items[i].columns;
            }
            // <debug>
            
        }
        Ext.grid.GridPanel.superclass.initComponent.call(this);
    },
    
    onStoreLoad: function() {
        this.invalidateScroller();
    },
    
    setScrollTop: function(top) {
        var scrollerRight = this.query('gridscroller[dock=' + this.verticalScrollDock  + ']')[0];
        scrollerRight.setScrollTop(top);
    },
    
    scrollByDeltaY: function(delta) {
        var scrollerRight = this.query('gridscroller[dock=' + this.verticalScrollDock + ']')[0];
        scrollerRight.scrollByDeltaY(delta);
    },
    
    invalidateScroller: function() {
        var sections = this.query('gridsection'),
            ln = sections.length,
            i  = 0,
            section;
            
        for (; i < ln; i++) {
            section = sections[i];
            section.determineScrollbars();
            if (section.verticalScroller) {
                section.verticalScroller.invalidate();
            }
            if (section.horizontalScroller) {
                section.horizontalScroller.invalidate();
            }
        }
        
    },
    
    getSelectionModel: function(){
        if (!this.selModel) {
            this.selModel = {};
        }

        var mode = 'SINGLE';
        if (this.simpleSelect) {
            mode = 'SIMPLE';
        } else if (this.multiSelect) {
            mode = 'MULTI';
        }
        
        Ext.applyIf(this.selModel, {
            allowDeselect: this.allowDeselect,
            mode: mode
        });        
        
        if (!this.selModel.events) {
            this.selModel = new Ext.grid.RowSelectionModel(this.selModel);
        }
        
        if (!this.selModel.hasRelaySetup) {
            this.relayEvents(this.selModel, ['selectionchange', 'select', 'deselect']);
            this.selModel.hasRelaySetup = true;
        }

        // lock the selection model if user
        // has disabled selection
        if (this.disableSelection) {
            this.selModel.locked = true;
        }
        
        return this.selModel;
    }
});