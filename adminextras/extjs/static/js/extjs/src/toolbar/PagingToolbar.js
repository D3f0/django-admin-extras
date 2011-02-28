/**
 * @class Ext.toolbar.PagingToolbar
 * @extends Ext.toolbar.Toolbar
 * <p>As the amount of records increases, the time required for the browser to render
 * them increases. Paging is used to reduce the amount of data exchanged with the client.
 * Note: if there are more records/rows than can be viewed in the available screen area, vertical
 * scrollbars will be added.</p>
 * <p>Paging is typically handled on the server side (see exception below). The client sends
 * parameters to the server side, which the server needs to interpret and then respond with the
 * appropriate data.</p>
 * <p><b>Ext.toolbar.PagingToolbar</b> is a specialized toolbar that is bound to a {@link Ext.data.Store}
 * and provides automatic paging control. This Component {@link Ext.data.Store#load load}s blocks
 * of data into the <tt>{@link #store}</tt> by passing {@link Ext.data.Store#paramNames paramNames} used for
 * paging criteria.</p>
 * <p>PagingToolbar is typically used as one of the Grid's toolbars:</p>
 * <pre><code>
Ext.tip.QuickTips.init(); // to display button quicktips

var myStore = new Ext.data.Store({
    reader: new Ext.data.JsonReader({
        {@link Ext.data.JsonReader#totalProperty totalProperty}: 'results', 
        ...
    }),
    ...
});

var myPageSize = 25;  // server script should only send back 25 items at a time

var grid = new Ext.grid.GridPanel({
    ...
    store: myStore,
    dockedItems: [
        new Ext.toolbar.PagingToolbar({
            {@link Ext.panel.Panel#dock dock: 'bottom',
            {@link #store}: myStore,       // grid and PagingToolbar using same store
            {@link #displayInfo}: true,
            {@link #pageSize}: myPageSize,
            {@link #prependButtons}: true,
            items: [
                'text 1'
            ]
        });
    ]
});
 * </code></pre>
 *
 * <p>To use paging, pass the paging requirements to the server when the store is first loaded.</p>
 * <pre><code>
store.load({
    params: {
        // specify params for the first page load if using paging
        start: 0,          
        limit: myPageSize,
        // other params
        foo:   'bar'
    }
});
 * </code></pre>
 * 
 * <p>If using {@link Ext.data.Store#autoLoad store's autoLoad} configuration:</p>
 * <pre><code>
var myStore = new Ext.data.Store({
    {@link Ext.data.Store#autoLoad autoLoad}: {params:{start: 0, limit: 25}},
    ...
});
 * </code></pre>
 * 
 * <p>The packet sent back from the server would have this form:</p>
 * <pre><code>
{
    "success": true,
    "results": 2000, 
    "rows": [ // <b>*Note:</b> this must be an Array 
        { "id":  1, "name": "Bill", "occupation": "Gardener" },
        { "id":  2, "name":  "Ben", "occupation": "Horticulturalist" },
        ...
        { "id": 25, "name":  "Sue", "occupation": "Botanist" }
    ]
}
 * </code></pre>
 * <p><u>Paging with Local Data</u></p>
 * <p>Paging can also be accomplished with local data using extensions:</p>
 * <div class="mdetail-params"><ul>
 * <li><a href="http://sencha.com/forum/showthread.php?t=71532">Ext.ux.data.PagingStore</a></li>
 * <li>Paging Memory Proxy (examples/ux/PagingMemoryProxy.js)</li>
 * </ul></div>
 * @constructor Create a new PagingToolbar
 * @param {Object} config The config object
 * @xtype pagingtoolbar
 */
Ext.define('Ext.toolbar.PagingToolbar', {
    extend: 'Ext.toolbar.Toolbar',
    alias: 'widget.pagingtoolbar',
    alternateClassName: 'Ext.PagingToolbar',
    requires: ['Ext.toolbar.TextItem', 'Ext.form.Number'],
    /**
     * @cfg {Ext.data.Store} store
     * The {@link Ext.data.Store} the paging toolbar should use as its data source (required).
     */
    /**
     * @cfg {Boolean} displayInfo
     * <tt>true</tt> to display the displayMsg (defaults to <tt>false</tt>)
     */
    displayInfo: false,
    /**
     * @cfg {Boolean} prependButtons
     * <tt>true</tt> to insert any configured <tt>items</tt> <i>before</i> the paging buttons.
     * Defaults to <tt>false</tt>.
     */
    prependButtons: false,
    /**
     * @cfg {String} displayMsg
     * The paging status message to display (defaults to <tt>'Displaying {0} - {1} of {2}'</tt>).
     * Note that this string is formatted using the braced numbers <tt>{0}-{2}</tt> as tokens
     * that are replaced by the values for start, end and total respectively. These tokens should
     * be preserved when overriding this string if showing those values is desired.
     */
    displayMsg : 'Displaying {0} - {1} of {2}',
    /**
     * @cfg {String} emptyMsg
     * The message to display when no records are found (defaults to 'No data to display')
     */
    emptyMsg : 'No data to display',
    /**
     * @cfg {String} beforePageText
     * The text displayed before the input item (defaults to <tt>'Page'</tt>).
     */
    beforePageText : 'Page',
    /**
     * @cfg {String} afterPageText
     * Customizable piece of the default paging text (defaults to <tt>'of {0}'</tt>). Note that
     * this string is formatted using <tt>{0}</tt> as a token that is replaced by the number of
     * total pages. This token should be preserved when overriding this string if showing the
     * total page count is desired.
     */
    afterPageText : 'of {0}',
    /**
     * @cfg {String} firstText
     * The quicktip text displayed for the first page button (defaults to <tt>'First Page'</tt>).
     * <b>Note</b>: quick tips must be initialized for the quicktip to show.
     */
    firstText : 'First Page',
    /**
     * @cfg {String} prevText
     * The quicktip text displayed for the previous page button (defaults to <tt>'Previous Page'</tt>).
     * <b>Note</b>: quick tips must be initialized for the quicktip to show.
     */
    prevText : 'Previous Page',
    /**
     * @cfg {String} nextText
     * The quicktip text displayed for the next page button (defaults to <tt>'Next Page'</tt>).
     * <b>Note</b>: quick tips must be initialized for the quicktip to show.
     */
    nextText : 'Next Page',
    /**
     * @cfg {String} lastText
     * The quicktip text displayed for the last page button (defaults to <tt>'Last Page'</tt>).
     * <b>Note</b>: quick tips must be initialized for the quicktip to show.
     */
    lastText : 'Last Page',
    /**
     * @cfg {String} refreshText
     * The quicktip text displayed for the Refresh button (defaults to <tt>'Refresh'</tt>).
     * <b>Note</b>: quick tips must be initialized for the quicktip to show.
     */
    refreshText : 'Refresh',

    /**
     * <p><b>Deprecated</b>. <code>paramNames</code> should be set in the <b>data store</b>
     * (see {@link Ext.data.Store#paramNames}).</p>
     * <br><p>Object mapping of parameter names used for load calls, initially set to:</p>
     * <pre>{start: 'start', limit: 'limit'}</pre>
     * @type Object
     * @property paramNames
     * @deprecated
     */

    /**
     * Gets the standard paging items in the toolbar
     * @private
     */
    getPagingItems: function() {
        return [{
            itemId: 'first',
            tooltip: this.firstText,
            overflowText: this.firstText,
            iconCls: Ext.baseCSSPrefix + 'tbar-page-first',
            disabled: true,
            handler: this.moveFirst,
            scope: this
        },{
            itemId: 'prev',
            tooltip: this.prevText,
            overflowText: this.prevText,
            iconCls: Ext.baseCSSPrefix + 'tbar-page-prev',
            disabled: true,
            handler: this.movePrevious,
            scope: this
        },
        '-',
        this.beforePageText,
        {
            xtype: 'numberfield',
            itemId: 'inputItem',
            name: 'inputItem',
            cls: Ext.baseCSSPrefix + 'tbar-page-number',
            allowDecimals: false,
            minValue: 1,
            hideTrigger: true,
            enableKeyEvents: true,
            selectOnFocus: true,
            submitValue: false,
            hideLabel: true,
            height: 19,
            width: 30,
            margins: '-1 2 3 2',
            listeners: {
                scope: this,
                keydown: this.onPagingKeyDown,
                blur: this.onPagingBlur
            }
        },{
            xtype: 'tbtext',
            itemId: 'afterTextItem',
            text: Ext.String.format(this.afterPageText, 1)
        },
        '-',
        {
            itemId: 'next',
            tooltip: this.nextText,
            overflowText: this.nextText,
            iconCls: Ext.baseCSSPrefix + 'tbar-page-next',
            disabled: true,
            handler: this.moveNext,
            scope: this
        },{
            itemId: 'last',
            tooltip: this.lastText,
            overflowText: this.lastText,
            iconCls: Ext.baseCSSPrefix + 'tbar-page-last',
            disabled: true,
            handler: this.moveLast,
            scope: this
        },
        '-',
        {
            itemId: 'refresh',
            tooltip: this.refreshText,
            overflowText: this.refreshText,
            iconCls: Ext.baseCSSPrefix + 'tbar-loading',
            handler: this.doRefresh,
            scope: this
        }];
    },

    initComponent : function(){
        var pagingItems = this.getPagingItems(),
            userItems   = this.items || this.buttons || [];
            
        if (this.prependButtons) {
            this.items = userItems.concat(pagingItems);
        } else {
            this.items = pagingItems.concat(userItems);
        }
        delete this.buttons;
        
        if (this.displayInfo) {
            this.items.push('->');
            this.items.push({xtype: 'tbtext', itemId: 'displayItem'});
        }
        
        Ext.toolbar.PagingToolbar.superclass.initComponent.call(this);
        
        this.addEvents(
            /**
             * @event change
             * Fires after the active page has been changed.
             * @param {Ext.toolbar.PagingToolbar} this
             * @param {Object} pageData An object that has these properties:<ul>
             * <li><code>total</code> : Number <div class="sub-desc">The total number of records in the dataset as
             * returned by the server</div></li>
             * <li><code>activePage</code> : Number <div class="sub-desc">The current page number</div></li>
             * <li><code>pages</code> : Number <div class="sub-desc">The total number of pages (calculated from
             * the total number of records in the dataset as returned by the server and the current {@link #pageSize})</div></li>
             * </ul>
             */
            'change',
            /**
             * @event beforechange
             * Fires just before the active page is changed.
             * Return false to prevent the active page from being changed.
             * @param {Ext.toolbar.PagingToolbar} this
             * @param {Object} params An object hash of the parameters which the PagingToolbar will send when
             * loading the required page. This will contain:<ul>
             * <li><code>start</code> : Number <div class="sub-desc">The starting row number for the next page of records to
             * be retrieved from the server</div></li>
             * <li><code>limit</code> : Number <div class="sub-desc">The number of records to be retrieved from the server</div></li>
             * </ul>
             * <p>(note: the names of the <b>start</b> and <b>limit</b> properties are determined
             * by the store's {@link Ext.data.Store#paramNames paramNames} property.)</p>
             * <p>Parameters may be added as required in the event handler.</p>
             */
            'beforechange'
        );
        this.on('afterlayout', this.onFirstLayout, this, {single: true});

        this.bindStore(this.store, true);
    },

    // private
    onFirstLayout : function(){
        if (this.dsLoaded) {
            this.onLoad.apply(this, this.dsLoaded);
        }
    },

    // private
    updateInfo : function(){
        var displayItem = this.child('#displayItem'),
            store = this.store,
            pageData = this.getPageData(),
            count, msg;

        if (displayItem) {
            count = store.getCount();
            if (count === 0) {
                msg = this.emptyMsg;
            } else {
                msg = Ext.String.format(
                    this.displayMsg,
                    pageData.fromRecord,
                    pageData.toRecord,
                    pageData.total
                );
            }
            displayItem.setText(msg);
            this.doComponentLayout();
        }
    },

    // private
    onLoad : function(store, r, o){
        if (!this.rendered) {
            this.dsLoaded = [store, r, o];
            return;
        }

        var pageData  = this.getPageData(),
            currPage  = pageData.currentPage,
            pageCount = pageData.pageCount,
            afterText = Ext.String.format(this.afterPageText, isNaN(pageCount) ? 1 : pageCount);

        this.child('#afterTextItem').setText(afterText);
        this.child('#inputItem').setValue(currPage);
        this.child('#first').setDisabled(currPage === 1);
        this.child('#prev').setDisabled(currPage === 1);
        this.child('#next').setDisabled(currPage === pageCount);
        this.child('#last').setDisabled(currPage === pageCount);
        this.child('#refresh').enable();
        this.updateInfo();
        this.fireEvent('change', this, pageData);
    },

    // private
    getPageData : function(){
        var store = this.store,
            totalCount = store.getTotalCount();
            
        return {
            total : totalCount,
            currentPage : store.currentPage,
            pageCount: Math.ceil(totalCount / store.pageSize),
            //pageCount :  store.getPageCount(),
            fromRecord: ((store.currentPage - 1) * store.pageSize) + 1,
            toRecord: Math.min(store.currentPage * store.pageSize, totalCount)
            
        };
    },

    /**
     * Change the active page
     * @param {Integer} page The page to display
     * @deprecated
     */
    changePage : function(page){
        console.warn('PagingToolbar: changePage is deprecated and will be removed. Please interact with the store directly via loadPage (Indices have been changed to 1-based).');
        // account for 0 based index to 1 based index change.
        page--;
        this.store.loadPage(page);
    },

    // private
    onLoadError : function(){
        if (!this.rendered) {
            return;
        }
        this.child('#refresh').enable();
    },

    // private
    readPageFromInput : function(pageData){
        var v = this.child('#inputItem').getValue(),
            pageNum = parseInt(v, 10);
            
        if (!v || isNaN(pageNum)) {
            this.child('#inputItem').setValue(pageData.currentPage);
            return false;
        }
        return pageNum;
    },

    onPagingFocus : function(){
        this.child('#inputItem').select();
    },

    //private
    onPagingBlur : function(e){
        var curPage = this.getPageData().currentPage;
        this.child('#inputItem').setValue(curPage);
    },

    // private
    onPagingKeyDown : function(field, e){
        var k = e.getKey(),
            pageData = this.getPageData(),
            increment = e.shiftKey ? 10 : 1,
            pageNum;

        if (k == e.RETURN) {
            e.stopEvent();
            pageNum = this.readPageFromInput(pageData);
            if (pageNum !== false) {
                pageNum = Math.min(Math.max(1, pageNum), pageData.total);
                this.store.loadPage(pageNum);
            }
        } else if (k == e.HOME || k == e.END) {
            e.stopEvent();
            pageNum = k == e.HOME ? 1 : pageData.pageCount;
            field.setValue(pageNum);
        } else if (k == e.UP || k == e.PAGEUP || k == e.DOWN || k == e.PAGEDOWN) {
            e.stopEvent();
            pageNum = this.readPageFromInput(pageData);
            if (pageNum) {
                if (k == e.DOWN || k == e.PAGEDOWN) {
                    increment *= -1;
                }
                pageNum += increment;
                if (pageNum >= 1 && pageNum <= pageData.pages) {
                    field.setValue(pageNum);
                }
            }
        }
    },

    // private
    beforeLoad : function(){
        if(this.rendered && this.refresh){
            this.refresh.disable();
        }
    },

    // private
    doLoad : function(start){
        if(this.fireEvent('beforechange', this, o) !== false){
            this.store.load();
        }
    },

    /**
     * Move to the first page, has the same effect as clicking the 'first' button.
     */
    moveFirst : function(){
        this.store.loadPage(1);
    },

    /**
     * Move to the previous page, has the same effect as clicking the 'previous' button.
     */
    movePrevious : function(){
        this.store.previousPage();
    },

    /**
     * Move to the next page, has the same effect as clicking the 'next' button.
     */
    moveNext : function(){
        this.store.nextPage();
    },

    /**
     * Move to the last page, has the same effect as clicking the 'last' button.
     */
    moveLast : function(){
        var store = this.store,
            lastPage = this.getPageData().pageCount;
            
        store.loadPage(lastPage);
    },

    /**
     * Refresh the current page, has the same effect as clicking the 'refresh' button.
     */
    doRefresh : function(){
        var store = this.store;
        store.loadPage(store.currentPage);
    },

    /**
     * Binds the paging toolbar to the specified {@link Ext.data.Store}
     * @param {Store} store The store to bind to this toolbar
     * @param {Boolean} initial (Optional) true to not remove listeners
     */
    bindStore : function(store, initial){
        var doLoad;
        if (!initial && this.store) {
            if(store !== this.store && this.store.autoDestroy){
                this.store.destroy();
            }else{
                this.store.un('beforeload', this.beforeLoad, this);
                this.store.un('load', this.onLoad, this);
                this.store.un('exception', this.onLoadError, this);
            }
            if(!store){
                this.store = null;
            }
        }
        if (store) {
            store = Ext.data.StoreMgr.lookup(store);
            store.on({
                scope: this,
                beforeload: this.beforeLoad,
                load: this.onLoad,
                exception: this.onLoadError
            });
            // EAC: Commented out 12/16/10
            // Can this be removed?
            //doLoad = true;
        }
        this.store = store;
        if (doLoad) {
            this.onLoad(store, null, {});
        }
    },

    /**
     * Unbinds the paging toolbar from the specified {@link Ext.data.Store} <b>(deprecated)</b>
     * @param {Ext.data.Store} store The data store to unbind
     */
    unbind : function(store){
        this.bindStore(null);
    },

    /**
     * Binds the paging toolbar to the specified {@link Ext.data.Store} <b>(deprecated)</b>
     * @param {Ext.data.Store} store The data store to bind
     */
    bind : function(store){
        this.bindStore(store);
    },

    // private
    onDestroy : function(){
        this.bindStore(null);
        Ext.toolbar.PagingToolbar.superclass.onDestroy.call(this);
    }
});
