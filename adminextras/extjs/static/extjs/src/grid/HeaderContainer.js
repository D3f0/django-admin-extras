/**
 * @class Ext.grid.HeaderContainer
 * @extends Ext.container.Container
 *
 * Container which holds healders and is docked at the top or bottom of a grid
 * section. The HeaderContainer drives resizing/moving/hiding of columns within
 * the gridview. As headers are hidden, moved or resized the headercontainer is
 * responsible for triggering changes within the view.
 *
 * @xtype headercontainer
 */
Ext.define('Ext.grid.HeaderContainer', {
    extend: 'Ext.container.Container',
    requires: [
        'Ext.grid.ColumnLayout',
        'Ext.grid.Header',
        'Ext.menu.Menu',
        'Ext.menu.CheckItem',
        'Ext.menu.Separator',
        'Ext.grid.HeaderResizer',
        'Ext.grid.HeaderReorderer'
    ],
    
    alias: 'widget.headercontainer',

    cls: Ext.baseCSSPrefix + 'grid-header-ct',
    dock: 'top',
    height: 23,
    defaultType: 'gridheader',
    /**
     * @cfg {Number} defaultWidth
     * Width of the header if no width or flex is specified. Defaults to 100.
     */
    defaultWidth: 100,
    
    
    sortAscText: 'Sort Ascending',
    sortDescText: 'Sort Descending',
    sortClearText: 'Clear Sort',
    columnsText: 'Columns',
    
    lastHeaderCls: Ext.baseCSSPrefix + 'column-header-last',
    firstHeaderCls: Ext.baseCSSPrefix + 'column-header-first',
    headerOpenCls: Ext.baseCSSPrefix + 'column-header-open',
    
    lastCellCls: Ext.baseCSSPrefix + 'grid-cell-last',
    firstCellCls: Ext.baseCSSPrefix + 'grid-cell-first',
    
    // private; will probably be removed by 4.0
    triStateSort: false,
    
    locked: false,
    
    dragging: false,
    
    initComponent: function() {
        this.plugins  = this.plugins || [];
        // TODO: Pass in configurations to turn on/off dynamic
        //       resizing and disable resizing all together
        var resizer   = new Ext.grid.HeaderResizer(),
            reorderer = new Ext.grid.HeaderReorderer();
        this.plugins.push(reorderer, resizer);
        
        
        this.layout = {
            type: 'gridcolumn',
            align: 'stretchmax'
        };
        this.defaults = this.defaults || {};
        Ext.applyIf(this.defaults, {
            width: this.defaultWidth,
            triStateSort: this.triStateSort
        });
        Ext.grid.HeaderContainer.superclass.initComponent.call(this);
        this.addEvents(
            /**
             * @event headerresize
             * @param {Ext.HeaderContainer} ct
             * @param {Ext.Header} header
             * @param {Number} width
             */
            'headerresize',
            
            /**
             * @event headerclick
             * @param {Ext.HeaderContainer} ct
             * @param {Ext.Header} header
             * @param {Ext.EventObject} e
             * @param {HTMLElement} t
             */
            'headerclick',
            
            /**
             * @event headerclick
             * @param {Ext.HeaderContainer} ct
             * @param {Ext.Header} header
             * @param {Ext.EventObject} e
             * @param {HTMLElement} t
             */
            'headertriggerclick',
            
            /**
             * @event headermove
             * @param {Ext.HeaderContainer} ct
             * @param {Ext.Header} header
             * @param {Number} fromIdx
             * @param {Number} toIdx
             */
            'headermove'
        );
    },
    
    
    afterRender: function() {
        Ext.grid.HeaderContainer.superclass.afterRender.apply(this, arguments);
        var store   = this.up('gridpanel').store,
            sorters = store.sorters,
            first   = sorters.first(),
            hd;
            
        if (first) {
            hd = this.down('gridheader[dataIndex=' + first.property  +']');
            hd.setSortState(first.direction);
        }
    },
    
    afterLayout: function() {
        Ext.grid.HeaderContainer.superclass.afterLayout.apply(this, arguments);
        var headers = this.query('gridheader:not(gridheader[hidden])'),
            viewEl;

        headers[0].el.radioCls(this.firstHeaderCls);
        headers[headers.length - 1].el.radioCls(this.lastHeaderCls);
        
        // Maintain First and Last cell cls
        if (this.view) {
            viewEl = this.view.el;
            viewEl.select('.'+this.firstCellCls).removeCls(this.firstCellCls);
            viewEl.select('.'+this.lastCellCls).removeCls(this.lastCellCls);
            viewEl.select(headers[0].getCellSelector()).addCls(this.firstCellCls);
            viewEl.select(headers[headers.length - 1].getCellSelector()).addCls(this.lastCellCls);
        }
    },
    
    onHeaderShow: function(header) {
        // Pass up to the GridSection
        var gridSection = this.ownerCt,
            // explicitly reference .menu and NOT getMenu()
            // to avoid unnecessary creation
            menu = this.menu,
            idx,
            visibleHeaders,
            colCheckItem;

        if (menu) {
            colCheckItem = menu.down('menucheckitem[headerId=' + header.id + ']');
            if (colCheckItem) {
                colCheckItem.setChecked(true, true);
            }
            
            if (this.disabledHeaderItem) {
                visibleHeaders = this.query('gridheader:not(gridheader[hidden])');
                if (visibleHeaders.length > 1) {
                    this.disabledHeaderItem.enable();
                    delete this.disabledHeaderItem;
                }
            }
        }
        
        if (this.view) {
            this.view.onHeaderShow(this, header, idx, true);
        }
        if (gridSection) {
            idx = this.items.indexOf(header);
            gridSection.onHeaderShow(this, header, idx);
        }
    },
    
    onHeaderHide: function(header) {
        // Pass up to the GridSection
        var gridSection = this.ownerCt,
            // explicitly reference .menu and NOT getMenu()
            // to avoid unnecessary creation
            menu = this.menu,
            idx,
            colCheckItem,
            visibleHeaders,
            itemToDisable;

        if (menu) {
            colCheckItem = menu.down('menucheckitem[headerId=' + header.id + ']');
            if (colCheckItem) {
                colCheckItem.setChecked(false, true);
            }
            
            visibleHeaders = this.query('gridheader:not(gridheader[hidden])');
            if (visibleHeaders.length === 1) {
                itemToDisable = menu.down('#columnItem menucheckitem[checked]');
                if (itemToDisable) {
                    itemToDisable.disable();
                    this.disabledHeaderItem = itemToDisable;
                }
            }
        }
        
        
        if (this.view) {
            this.view.onHeaderHide(this, header, idx, true);
        }
        if (gridSection) {
            idx = this.items.indexOf(header);
            this.ownerCt.onHeaderHide(this, header, idx);
        }
    },
    
    /**
     * Temporarily lock the headerCt. This makes it so that clicking on headers
     * don't trigger actions like sorting or opening of the header menu. This is
     * done because extraneous events may be fired on the headers after interacting
     * with a drag drop operation.
     * @private
     */
    tempLock: function() {
        this.locked = true;
        Ext.Function.defer(function() {
            this.locked = false;
        }, 200, this);
    },
    
    onHeaderResize: function(header, w) {
        this.tempLock();
        if (this.view) {
            this.view.onHeaderResize(header, w);
        }
        this.fireEvent('headerresize', this, header, w);
    },
    
    onHeaderClick: function(header, e, t) {
        this.fireEvent("headerclick", this, header, e, t);
    },
    
    onHeaderTriggerClick: function(header, e, t) {
        // generate and cache menu, provide ability to cancel/etc
        // TODO: allow individual header to add additional menu items
        // provide way to invalidate cache.
        this.showMenuBy(t, header);
        this.fireEvent("headertriggerclick", this, header, e, t);
    },
    
    showMenuBy: function(t, header) {
        var menu = this.getMenu(),
            sortableMth;
            
        menu.activeHeader = header;
        header.addCls(this.headerOpenCls);
        
        // enable or disable asc & desc menu items based on header being sortable
        sortableMth = header.sortable ? 'enable' : 'disable';
        menu.down('#ascItem')[sortableMth]();
        menu.down('#descItem')[sortableMth]();
        menu.showBy(t);
    },
    
    // remove the trigger open class when the menu is hidden
    onMenuHide: function() {
        var menu = this.getMenu();
        menu.activeHeader.removeCls(this.headerOpenCls);
    },
    
    
    moveHeader: function(fromIdx, toIdx) {
        this.tempLock();
        var gridSection = this.ownerCt,
            header = this.move(fromIdx, toIdx);

        if (gridSection) {
            gridSection.onHeaderMove(this, header, fromIdx, toIdx);
        }

        this.fireEvent("headermove", this, header, fromIdx, toIdx);
    },
    
    /**
     * Gets the menu (and will create it if it doesn't already exist)
     * @private
     */
    getMenu: function() {
        if (!this.menu) {
            this.menu = new Ext.menu.Menu({
                items: this.getMenuItems()
            });
            this.menu.on('hide', this.onMenuHide, this);
        }
        return this.menu;
    },
    
    /**
     * Returns an array of menu items to be placed into the shared menu
     * across all headers in this header container.
     * @returns {Array} menuItems
     */
    getMenuItems: function() {
        return [{
            itemId: 'ascItem',
            text: this.sortAscText,
            cls: 'xg-hmenu-sort-asc',
            handler: this.onSortAscClick,
            scope: this
        },{
            itemId: 'descItem',
            text: this.sortDescText,
            cls: 'xg-hmenu-sort-desc',
            handler: this.onSortDescClick,
            scope: this
        },'-',{
            itemId: 'columnItem',
            text: this.columnsText,
            cls: 'x-cols-icon',
            menu: this.getColumnsMenu()
        }];
    },
    
    // sort asc when clicking on item in menu
    onSortAscClick: function() {
        var menu = this.getMenu(),
            activeHeader = menu.activeHeader;

        activeHeader.setSortState('ASC');
    },
    
    // sort desc when clicking on item in menu
    onSortDescClick: function() {
        var menu = this.getMenu(),
            activeHeader = menu.activeHeader;

        activeHeader.setSortState('DESC');
    },
    
    /**
     * Returns all headers which have been configured as hideable to be
     * placed in the Columns menu.
     */
    getColumnsMenu: function() {
        var menuItems = [],
            i = 0,
            item,
            items = this.query('gridheader[hideable]'),
            itemsLn = items.length;
            
        for (; i < itemsLn; i++) {
            item = items[i];
            menuItems.push({
                text: item.text,
                checked: !item.hidden,
                hideOnClick: false,
                headerId: item.id,
                checkHandler: this.onColumnCheckChange,
                scope: this
            });
        }
        return menuItems;
    },
    
    onColumnCheckChange: function(checkItem, checked) {
        var header = Ext.getCmp(checkItem.headerId);
        header[checked ? 'show' : 'hide']();
    },
    
    /**
     * Get the columns used for generating a template via TableChunker.
     * Returns an array of all columns and their
     *  - dataIndex
     *  - align
     *  - width
     *  - id
     *  @private
     */
    getColumnsForTpl: function() {
        var cols    = [],
            items   = this.query('gridheader'),
            itemsLn = items.length,
            i       = 0,
            item;

        for (; i < itemsLn; i++) {
            item = items[i];
            cols.push({
                dataIndex: item.dataIndex,
                align: item.align,
                width: item.hidden ? 0 : item.getDesiredWidth(),
                id: item.id
            });
        }
        return cols;
    },

    /**
     * Returns the number of grid headers in this headercontainer.
     */
    getCount: function() {
        return this.query('gridheader').length;
    },
    
    /**
     * Returns the number of grid headers that are currently visible in this
     * headercontainer.
     */
    getVisibleCount: function() {
        return this.query('gridheader:not(gridheader[hidden])').length;
    },
    
    /**
     * Gets the full width of all columns that are visible.
     */
    getFullWidth: function() {
        var fullWidth = 0,
            items     = this.items.items,
            itemsLn   = items.length,
            i         = 0;

        for (; i < itemsLn; i++) {
            if (!isNaN(items[i].width) && !items[i].hidden) {
                // use headers getDesiredWidth if its there
                if (items[i].getDesiredWidth) {
                    fullWidth += items[i].getDesiredWidth();
                // if injected a diff cmp use getWidth
                } else {
                    fullWidth += items[i].getWidth();
                }
                
            }
        }
        return fullWidth;
    },
    
    // invoked internally by a header when not using triStateSorting
    clearOtherSortStates: function(activeHeader) {
        var items     = this.items.items,
            itemsLn   = items.length,
            i         = 0;

        for (; i < itemsLn; i++) {
            if (items[i] !== activeHeader) {
                // unset the sortstate and dont recurse
                items[i].setSortState(null, true);
            }
        }
    },
    
    /**
     * Maps the record data to base it on the header id's.
     * This correlates to the markup/template generated by
     * TableChunker.
     */
    prepareData: function(data, rowIdx, record) {
        var obj     = {},
            items   = this.items.items,
            itemsLn = items.length,
            colIdx  = 0,
            item, value,
            metaData,
            store = this.up('gridpanel').store;
            
        for (; colIdx < itemsLn; colIdx++) {
            metaData = {
                tdCls: '',
                style: ''
            };
            item = items[colIdx];
            value = data[item.dataIndex];
            
            // When specifying a renderer as a string, it always resolves
            // to Ext.util.Format
            if (Ext.isString(item.renderer)) {
                item.renderer = Ext.util.Format[item.renderer];
            }
            
            if (Ext.isFunction(item.renderer)) {
                value = item.renderer.call(
                    item.scope || this.ownerCt,
                    value,
                    // metadata per cell passing an obj by reference so that
                    // it can be manipulated inside the renderer
                    metaData,
                    record,
                    rowIdx,
                    colIdx,
                    store
                );
            }
            
            // <debug>
            if (metaData.css) {
                console.warn("Header renderer: metadata css has been replaced by tdCls.");
                metaData.tdCls = metaData.css;
                delete metaData.css;
            }
            // </debug>
            obj[item.id+'-modified'] = record.isModified(item.dataIndex) ? Ext.baseCSSPrefix + 'grid-dirty-cell' : Ext.baseCSSPrefix + 'grid-clean-cell';
            obj[item.id+'-tdCls'] = metaData.tdCls;
            obj[item.id+'-tdAttr'] = metaData.tdAttr;
            obj[item.id+'-style'] = metaData.style;
            obj[item.id] = value;
        }
        return obj;
    },
    
    expandToFit: function(header) {
        if (this.view) {
            this.view.expandToFit(header);
        }
    }
});
