/**
 * @class Ext.grid.TemplateHeader
 * @extends Ext.grid.Header
 * <p>A Column definition class which renders a value by processing a {@link Ext.data.Record Record}'s
 * {@link Ext.data.Record#data data} using a {@link #tpl configured} {@link Ext.XTemplate XTemplate}.
 * See the {@link Ext.grid.Column#xtype xtype} config option of {@link Ext.grid.Column} for more
 * details.</p>
 */
Ext.define('Ext.grid.TemplateHeader', {
    extend: 'Ext.grid.Header',
    alias: ['widget.templateheader'],
    requires: ['Ext.XTemplate'],
    
    /**
     * @cfg {String/XTemplate} tpl
     * An {@link Ext.XTemplate XTemplate}, or an XTemplate <i>definition string</i> to use to process a
     * {@link Ext.data.Record Record}'s {@link Ext.data.Record#data data} to produce a column's rendered value.
     */
    constructor: function(cfg){
        Ext.grid.TemplateHeader.superclass.constructor.call(this, cfg);
        var tpl = (!Ext.isPrimitive(this.tpl) && this.tpl.compile) ? this.tpl : new Ext.XTemplate(this.tpl);
        this.renderer = function(value, p, r){
            return tpl.apply(r.data);
        };
        this.tpl = tpl;
    }
});