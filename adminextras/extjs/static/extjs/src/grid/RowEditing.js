/**
 * @class Ext.grid.RowEditing
 * @extends Ext.grid.Editing
 */
Ext.define('Ext.grid.RowEditing', {
    extend: 'Ext.grid.Editing',
    alias: 'editing.rowediting',
    editStyle: 'row',

    init: function(grid) {
        Ext.grid.RowEditing.superclass.init.call(this, grid);

        // setup event handlers to mirror the columnmodel
        //var cm = grid.getColumnModel();
        //cm.on({
        //    add: this.onColAdd,
        //    remove: this.onColRemove,
        //    widthchange: this.onColWidthChange,
        //    hiddenchange: this.onColHiddenChange,
        //    scope: this
        //});
    },

    getEditor: function() {
        var ed = Ext.grid.RowEditing.superclass.getEditor.apply(this, arguments);
        // if no editor was created, create a default
        if (!ed) {
            ed = Ext.ComponentMgr.create({
                //html: arguments[0],
                name: arguments[0]
            }, 'displayfield');
            this.editors.add(ed);
        }
        return ed;
    },


    onColAdd: function(ct, column) {
        if (this.rowEditor) {
            var rowEditor = this.rowEditor,
                colIdx = ct.items.indexOf(column),
                grid = this.grid,
                editor = this.getEditor(column.dataIndex);

            rowEditor.add(colIdx, editor);
        }

    },

    onColRemove: function(ct, column, colIdx, autoDestroy) {
        if (this.rowEditor) {
            var rowEditor = this.rowEditor,
                grid = this.grid,
                ed = this.getEditor(column.dataIndex);

            rowEditor.remove(ed, autoDestroy);
        }
    },

    onColWidthChange: function(cm, colIdx, newWidth) {
        var col = cm.getColumnAt(colIdx),
            ed = this.getEditor(col.dataIndex);

        if (ed && this.rowEditor) {
            if (newWidth) {
                delete ed.width;
                ed.setWidth(newWidth);
            } else {
                ed.hide();
            }
            this.rowEditor.setWidth(cm.getTotalWidth());
        }
    },

    onColHiddenChange: function(cm, colIdx, hidden) {
        var col = cm.getColumnAt(colIdx),
            ed = this.getEditor(col.dataIndex),
            width;

        if (ed && this.rowEditor) {
            ed[hidden ? 'hide' : 'show']();
            width = cm.getColumnWidth(colIdx);
            if (width) {
                ed.setWidth(width);
            } else {
                ed.hide();
            }
            this.rowEditor.setWidth(cm.getTotalWidth());
            // layout if already visible, otherwise
            // always laid out when shown due to event handler.
            //if (this.rowEditor.isVisible()) {
                this.rowEditor.doLayout();
            //}
        }
    },

    initEditTrigger: function() {
        var view = this.grid.down('gridview');
        this.view = view;
        if (this.clicksToEdit === 1) {
            view.on("cellclick", this.onRowDblClick, this);
        } else {
            view.on('celldblclick', this.onRowDblClick, this);
        }
    },

    // Implementation of calculateLocation for RowEditing
    // Retrieves the row that a particular record represents
    calculateLocation: function(record, dataIndex) {
        var grid   = this.grid,
            view   = this.view,
            rowIdx = grid.getStore().indexOf(record);

        return view.getRow(rowIdx);
    },

    // private
    onRowDblClick : function(view, cell, rowIdx, colIdx, e) {
        var store    = view.store,
            record   = store.getAt(rowIdx),
            grid     = view.up('gridsection'),
            headerCt = grid.headerCt,
            header   = headerCt.items.getAt(colIdx),
            //colIdx = view.findCellIndex(e.getTarget()),
            // manually calculate location to ensure its the correct column
            location = view.getNode(rowIdx),
            dataIdx;

        // when user clicks on borders, colIdx will not be found
        if (colIdx === false) {
            return;
        } else {
            dataIdx = header.dataIndex;
            //dataIdx = grid.getColumnModel().getDataIndex(colIdx);
        }

        this.startEditing(record, dataIdx, location);
    },


    performEdit: function(record, dataIndex, location, e) {
        var rowEd  = this.getRowEditor(),
            values = {},
            data   = record.data,
            key;

        if (!rowEd) {
            return;
        }

        for (key in data) {
            values[key] = this.preEditValue(record, key);
        }

        // why pass record.data instead of record
        // then we wouldnt have to track currRecord?
        rowEd.startEdit(location, values, dataIndex);
    },

    /**
     * Stops any active editing
     * @param {Boolean} cancel (optional) True to cancel any changes
     */
    stopEditing : function(cancel) {
        if (this.editing) {
            var rowEditor = this.getRowEditor();
            rowEditor[cancel ? 'cancelEdit' : 'completeEdit']();
            this.editing = false;
        }
    },
    
    isDirty: function() {
        var dirty;
        if (!this.currRecord) {
            return;
        }
        this.editors.each(function(f){
            if(f.getValue && String(this.currRecord.get(f.name)) !== String(f.getValue())){
                dirty = true;
                return false;
            }
        }, this);
        return dirty;
    },
    
    beforeEdit: function(record) {
        return !(this.getRowEditor().isVisible() && this.isDirty(record));
    },

    getRowEditor: function() {
        if (!this.rowEditor) {
            var items = [],
                grid = this.grid,
                view = this.view,
                section = grid.down('gridsection'),
                headerCt = section.headerCt,
                //view = grid.view,
                //cm = this.grid.getColumnModel(),
                ln = headerCt.getCount(),
                i = 0,
                width,
                column,
                ed;

            for (;i < ln; i++) {
                column = headerCt.items.getAt(i);
                ed = this.getEditor(column.dataIndex);

                if (i === 0) {
                    ed.margins = '0 1 2 1';
                } else if (i === ln - 1) {
                    ed.margins = '0 0 2 1';
                } else {
                    if (Ext.isIE) {
                        ed.margins = '0 0 2 0';
                    }
                    else {
                        ed.margins = '0 1 2 0';
                    }
                }
                width = column.getDesiredWidth();
                if (width) {
                    ed.setWidth(width);
                } else {
                    ed.hide();
                }

                items.push(ed);
            }

            this.rowEditor = new Ext.grid.RowEditor({
                items: items,
                floating: true,
                width: headerCt.getFullWidth(),
                // keep a reference..
                editingPlugin: this,
                renderTo: view.getEl()
            });
        }
        return this.rowEditor;
    }
});