/**
 * @class Ext.form.Radio
 * @extends Ext.form.Checkbox
 * <p>Single radio field.  Same as Checkbox, but provided as a convenience for automatically setting the input type.
 * Radio grouping is handled automatically by the browser if you give each radio in a group the same name.</p>
 * <p><b>Labeling:</b> In addition to the {@link Ext.form.Labelable standard field labeling options}, radio buttons
 * may be given an optional {@link #boxLabel} which will be displayed immediately to the right of
 * the input. Also see {@link Ext.form.RadioGroup} for a convenient method of grouping related radio buttons.</p>
 * <p><b>Values:</b> The main value of a Radio field is a boolean, indicating whether or not the radio is checked.
 * The following values will check the radio:<code>true</code>, <code>'true'</code>, <code>'1'</code>, or
 * <code>'on'</code>. Any other value will uncheck it.</p>
 * <p>In addition to the main boolean value, you may also specify a separate {@link #inputValue}. This will be
 * used as the "value" attribute of the radio input and will be submitted as the parameter value when the form
 * is {@link Ext.form.Basic#submit submitted}. You will want to set this value if you have multiple radio buttons
 * with the same {@link #name}, as is almost always the case.</p>
 * <p>Example usage:</p>
 * <pre><code>new Ext.form.FormPanel({
    title: 'Order Form',
    width: 300,
    bodyPadding: 10,
    items: [{
        xtype: 'fieldcontainer',
        fieldLabel: 'Size',
        defaultType: 'radiofield',
        defaults: {
            hideLabel: true,
            flex: 1
        },
        layout: 'hbox',
        items: [{
            boxLabel: 'M',
            name: 'size',
            inputValue: 'm'
        }, {
            boxLabel: 'L',
            name: 'size',
            inputValue: 'l'
        }, {
            boxLabel: 'XL',
            name: 'size',
            inputValue: 'xl'
        }]
    }, {
        xtype: 'fieldcontainer',
        fieldLabel: 'Color',
        defaultType: 'radiofield',
        defaults: {
            hideLabel: true,
            flex: 1
        },
        layout: 'hbox',
        items: [{
            boxLabel: 'Blue',
            name: 'color',
            inputValue: 'blue'
        }, {
            boxLabel: 'Grey',
            name: 'color',
            inputValue: 'grey'
        }, {
            boxLabel: 'Black',
            name: 'color',
            inputValue: 'black'
        }]
    }]
});</code></pre>
 *
 * @constructor
 * Creates a new Radio
 * @param {Object} config Configuration options
 *
 * @xtype radio
 */
Ext.define('Ext.form.Radio', {
    extend:'Ext.form.Checkbox',
    alias: ['widget.radiofield', 'widget.radio'],
    requires: ['Ext.form.RadioManager'],

    inputType: 'radio',

    isRadio: true,
    
    /**
     * If this radio is part of a group, it will return the selected value
     * @return {String}
     */
    getGroupValue: function() {
        var selected = this.getManager().getChecked(this.name);
        return selected ? selected.inputValue : null;
    },

    /**
     * Sets either the checked/unchecked status of this Radio, or, if a string value
     * is passed, checks a sibling Radio of the same name whose value is the value specified.
     * @param value {String/Boolean} Checked value, or the value of the sibling radio button to check.
     * @return {Boolean} The value that was set
     */
    setRawValue: function(v) {
        var me = this,
            active;
            
        if (Ext.isBoolean(v)) {
            Ext.form.Radio.superclass.setRawValue.call(me, v);
        } else {
            active = this.getManager().getWithValue(me.name, v).getAt(0);
            if (active) {
                active.setRawValue(true);
            }
        }
        return me.checked;
    },

    onChange: function(newVal, oldVal) {
        var me = this;
        Ext.form.Radio.superclass.onChange.call(me, newVal, oldVal);
        if (newVal) {
            this.getManager().getByName(me.name).each(function(item){
                if (item !== me) {
                    item.setValue(false);
                }
            }, me);
        }
    },
    
    beforeDestroy: function(){
        Ext.form.Radio.superclass.beforeDestroy.call(this);
        this.getManager().removeByKey(this.id);
    },

    getManager: function() {
        return Ext.form.RadioManager;
    }
});
