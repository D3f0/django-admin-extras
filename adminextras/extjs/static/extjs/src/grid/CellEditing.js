/**
 * @class Ext.grid.CellEditing
 * @extends Ext.grid.Editing
 */
// currently does not support keyboard navigation
// must be implemented in SelectionModel code
Ext.define('Ext.grid.CellEditing', {
    extend: 'Ext.grid.Editing',
    alias: 'editing.cellediting',    
    
    editStyle: 'cell',

    getKey: function(obj) {
        if (obj.field) {
            return obj.field.name;
        } else {
            return obj.name;
        }
    },

    initEditTrigger: function() {
        var grid = this.grid;
        if (this.clicksToEdit === 1){
            grid.on("cellclick", this.onCellDblClick, this);
        }else {
            grid.on('celldblclick', this.onCellDblClick, this);
        }
    },

    getEditor: function(name, dontCreate) {
        var ed = this.editors.get(name);
        if (!ed) {
            return false;
        }
        if (ed.field || dontCreate) {
            return ed;
        } else {
            ed = new Ext.grid.GridEditor({
                field: ed
            });
            // constrain to the gridview
            ed.parentEl = this.grid.view.getEditorParent(ed);
            ed.on({
                scope: this,
                render: {
                    fn: function(c){
                        c.field.focus(false, true);
                    },
                    single: true,
                    scope: this
                },
                specialkey: this.onSpecialKey,
                complete: this.onEditComplete,
                canceledit: this.stopEditing.createDelegate(this, [true])
            });
            this.editors.add(ed);
            return ed;
        }
    },

    onSpecialKey: function(field, e) {
        var grid = this.grid;
        grid.getSelectionModel().onEditorKey(field, e);
    },

    // Implementation of calculateLocation for CellEditing.
    // This will pick the first column that is bound to the dataIndex/field
    // in the column model as the location
    calculateLocation: function(record, dataIndex) {
        var grid   = this.grid,
            rowIdx = grid.getStore().indexOf(record),
            colIdx = grid.getColumnModel().findColumnIndex(dataIndex);

        return grid.view.getCell(row, col).firstChild;
    },

    // private
    onCellDblClick : function(grid, rowIdx, colIdx){
        var store = grid.getStore(),
            record = store.getAt(rowIdx),
            colModel = grid.getColumnModel(),
            dataIdx = colModel.getDataIndex(colIdx),
            // manually calculate location to ensure its the correct column
            location = grid.view.getCell(rowIdx, colIdx).firstChild;

        this.startEditing(record, dataIdx, location);
    },


    ensureVisible: function(record, dataIndex, location) {
        //var view = this.grid.view;
        //view.ensureVisible(row, col, true);
    },


    performEdit: function(record, dataIndex, location, e) {
        var ed = this.getEditor(dataIndex),
            v = this.preEditValue(record, dataIndex);

        if (!ed) {
            return;
        }

        this.activeEditor = ed;
        ed.startEdit(location, Ext.isDefined(v) ? v : '');
    },

    /**
     * Stops any active editing
     * @param {Boolean} cancel (optional) True to cancel any changes
     */
    stopEditing : function(cancel){
        var view = this.grid.view;
        if (this.editing) {
            var activeEditor = this.activeEditor;
            if (activeEditor) {
                activeEditor[cancel === true ? 'cancelEdit' : 'completeEdit']();
                //view.focusCell(ae.row, ae.col);
            }
            this.activeEditor = null;
        }
        this.editing = false;
    },


    // private
    onEditComplete : function(ed, value, startValue){
        this.editing = false;
        this.lastActiveEditor = this.activeEditor;
        this.activeEditor = null;

        var record = this.currRecord,
            dataIndex = this.currDataIndex,
            grid = this.grid;

        value = this.postEditValue(value, startValue, record, dataIndex);
        if (this.forceValidation === true || String(value) !== String(startValue)) {
            var e = {
                grid: grid,
                record: record,
                field: dataIndex,
                originalValue: startValue,
                value: value,
                //row: ed.row,
                //column: ed.col,
                cancel: false
            };
            if (grid.fireEvent("validateedit", e) !== false && !e.cancel && String(value) !== String(startValue)) {
                record.set(dataIndex, value);
                delete e.cancel;
                grid.fireEvent("afteredit", e);
            }
        }
        //grid.view.focusCell(ed.row, ed.col);
    },

    onGridResize: function() {
        var ae = this.activeEditor;
        if(this.editing && ae){
            ae.realign(true);
        }
    }
});
