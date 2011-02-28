// Currently has the following issues:
// - Does not handle postEditValue
// - Fields without editors need to sync with their values in Store
// - starting to edit another record while already editing and dirty should probably prevent it
// - aggregating validation messages
// - tabIndex is not managed bc we leave elements in dom, and simply move via positioning
// - layout issues when changing sizes/width while hidden (layout bug)

Ext.define('Ext.grid.RowEditor', {
    extend: 'Ext.form.FormPanel',
    

    saveBtnText  : 'Save',
    cancelBtnText: 'Cancel',
    
    lastScrollLeft: 0,
    lastScrollTop: 0,

    initComponent: function() {
        Ext.applyIf(this, {
            cls: Ext.baseCSSPrefix + 'row-editor'
        });
        this.layout = {
            type: 'hbox'
        };
        
        Ext.grid.RowEditor.superclass.initComponent.call(this);
    },

    afterRender: function() {
        Ext.grid.RowEditor.superclass.afterRender.call(this);
        this.renderTo.on('scroll', this.onCtScroll, this/*, {buffer: 300}*/);
    },
    
    onCtScroll: function(e, target) {
        var scrollTop  = target.scrollTop,
            scrollLeft = target.scrollLeft;
        
        if (scrollTop !== this.lastScrollTop) {
            this.lastScrollTop = scrollTop;
            //this.cancelEdit();
        }
        if (scrollLeft !== this.lastScrollLeft) {
            this.lastScrollLeft = scrollLeft;
            this.repositionBtns();
        }
        


    },

    getFloatingButtons: function() {
        if (!this.floatingButtons) {
            this.floatingButtons = new Ext.panel.Panel({
                // currently just need container, depends on when invoked
                // which will be setup...
                renderTo: this.container || this.renderTo,
                height: 40,
                baseCls: Ext.baseCSSPrefix + 'plain',
                floating: true,
                cls: Ext.baseCSSPrefix + 'btns ' + Ext.baseCSSPrefix + 'row-editor-btns',
                layout: 'hbox',
                width: 150,
                items: [{
                    flex: 1,
                    xtype: 'button',
                    handler: this.completeEdit,
                    scope: this,
                    text: this.saveBtnText
                }, {
                    flex: 1,
                    xtype: 'button',
                    handler: this.cancelEdit,
                    scope: this,
                    text: this.cancelBtnText
                }]
            });

        }
        return this.floatingButtons;
    },

    // floating buttons are positioned independently of the roweditor itself
    // this method will reposition the buttons to be immediately below 
    repositionBtns: function(initialLocation) {
        initialLocation = Ext.get(initialLocation);
        var btns = this.getFloatingButtons(),
            btnEl = btns.el,
            grid = this.editingPlugin.grid,
            view = grid.view,
            // always get data from ColumnModel as its what drives
            // the GridView's sizing
            mainBodyWidth = grid.down('gridsection').headerCt.getFullWidth(),
            scrollerWidth = grid.getWidth(),
            // use the minimum as the columns may not fill up the entire grid
            // width
            width = Math.min(mainBodyWidth, scrollerWidth),
            scrollLeft = btns.container.dom.scrollLeft,
            btnWidth = btns.getWidth(),
            left = (width - btnWidth) / 2 + scrollLeft;

        // need to set both top/left
        if (initialLocation && Ext.isElement(initialLocation.dom)) {
            var top = initialLocation.dom.offsetTop,
                btnTop = top + initialLocation.getHeight();
            
            this.el.setTop(top);
            btnEl.setTop(btnTop);
        }
        btnEl.setLeft(left);

    },

    startEdit: function(location, values, dataIndex) {
        // initial position of the buttons.
        this.repositionBtns(location);

        this.getForm().setValues(values);
        this.show();

        var fieldEl = this.editingPlugin.getEditor(dataIndex);
        if (fieldEl && fieldEl.focus) {
            fieldEl.focus();
        }
    },

    cancelEdit: function() {
        var form = this.getForm();
        form.reset();
        this.hide();
    },

    completeEdit: function() {
        var form = this.getForm();
        form.updateRecord(this.editingPlugin.currRecord);
        this.hide();
    },

    // synchronize the floating buttons panel
    doLayout: function() {
        Ext.grid.RowEditor.superclass.doLayout.call(this);
        this.repositionBtns();
    },

    // synchronize the floating buttons panel
    onShow: function() {
        Ext.grid.RowEditor.superclass.onShow.apply(this, arguments);
        this.getFloatingButtons().show();
        this.doLayout();
    },

    // synchronize the floating buttons panel
    onHide: function() {
        Ext.grid.RowEditor.superclass.onHide.apply(this, arguments);
        this.getFloatingButtons().hide();
    }
});