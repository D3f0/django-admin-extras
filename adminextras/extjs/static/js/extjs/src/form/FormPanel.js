/**
 * @class Ext.form.FormPanel
 * @extends Ext.panel.Panel
 * <p>FormPanel provides a standard container for forms. It is essentially a standard {@link Ext.panel.Panel} which
 * automatically creates a {@link Ext.form.Basic BasicForm} for managing any {@link Ext.form.Field}
 * objects that are added as descendants of the panel. It also includes conveniences for configuring and
 * working with the BasicForm and the collection of Fields.</p>
 *
 * <p><b><u>Layout</u></b></p>
 * <p>By default, FormPanel is configured with <tt>{@link Ext.layout.AnchorLayout layout:'anchor'}</tt> for
 * the layout of its immediate child items. This can be changed to any of the supported container layouts.
 * The layout of sub-containers is configured in {@link Ext.lib.Container#layout the standard way}.</p>
 *
 * <p><b><u>BasicForm</u></b></p>
 * <p>Although <b>not listed</b> as configuration options of FormPanel, the FormPanel class accepts all
 * of the config options supported by the {@link Ext.form.Basic} class, and will pass them along to
 * the internal BasicForm when it is created.</p>
 * <p><b>Note</b>: If subclassing FormPanel, any configuration options for the BasicForm must be applied to
 * the <tt><b>initialConfig</b></tt> property of the FormPanel. Applying {@link Ext.form.Basic BasicForm}
 * configuration settings to <b><tt>this</tt></b> will <b>not</b> affect the BasicForm's configuration.</p>
 * <p>The following events fired by the BasicForm will be re-fired by the FormPanel and can therefore be
 * listened for on the FormPanel itself:</p>
 * <div class="mdetail-params"><ul>
 * <li>{@link Ext.form.Basic#beforeaction beforeaction}</li>
 * <li>{@link Ext.form.Basic#actionfailed actionfailed}</li>
 * <li>{@link Ext.form.Basic#actioncomplete actioncomplete}</li>
 * <li>{@link Ext.form.Basic#validitychange validitychange}</li>
 * <li>{@link Ext.form.Basic#dirtychange dirtychange}</li>
 * </ul></div>
 *
 * <p><b><u>Field Defaults</u></b></p>
 * <p>The {@link #fieldDefaults} config option conveniently allows centralized configuration of default values
 * for all field-labelable added as descendants of the FormPanel. Any config option recognized by implementations
 * of {@link Ext.form.Labelable} may be included in this object. See the {@link #fieldDefaults} documentation
 * for details of how the defaults are applied.</p>
 *
 * <p><b><u>Form Validation</u></b></p>
 * <p>With the default configuration, form fields are validated on the fly while the user edits their values.
 * This can be controlled on a per-field basis (or via the {@link #fieldDefaults} config) with the field
 * config properties {@link Ext.form.Field#validateOnChange} and {@link Ext.form.BaseField#checkChangeEvents},
 * and the FormPanel's config properties {@link #pollForChanges} and {@link #pollInterval}.</p>
 * <p>Any component within the FormPanel can be configured with <tt>formBind: true</tt>. This will cause that
 * component to be automatically disabled when the form is invalid, and enabled when it is valid. This is most
 * commonly used for Button components to prevent submitting the form in an invalid state, but can be used on
 * any component type.</p>
 * <p>For more information on form validation see the following:</p>
 * <div class="mdetail-params"><ul>
 * <li>{@link Ext.form.Field#validateOnChange}</li>
 * <li>{@link #pollForChanges} and {@link #pollInterval}</li>
 * <li>{@link Ext.form.VTypes}</li>
 * <li>{@link Ext.form.Basic#doAction BasicForm.doAction <b>clientValidation</b> notes}</li>
 * </ul></div>
 *
 * <p><b><u>Form Submission</u></b></p>
 * <p>By default, Ext Forms are submitted through Ajax, using {@link Ext.form.action.Action}. See the documentation for
 * {@link Ext.form.Basic}</p>
 *
 * @constructor
 * @param {Object} config Configuration options
 * @xtype form
 */
Ext.define('Ext.form.FormPanel', {
    extend:'Ext.panel.Panel',
    alias: 'widget.form',
    alternateClassName: 'Ext.FormPanel',
    requires: ['Ext.form.Basic', 'Ext.util.TaskRunner'],

    /**
     * @cfg {Object} fieldDefaults
     * <p>If specified, the properties in this object are used as default config values for each
     * {@link Ext.form.Labelable} instance (e.g. {@link Ext.form.Field} or {@link Ext.form.FieldContainer})
     * that is added as a descendant of this FormPanel. Corresponding values specified in an individual field's
     * own configuration, or from the {@link Ext.lib.Container#defaults defaults config} of its parent container,
     * will take precedence. See the documentation for {@link Ext.form.Labelable} to see what config
     * options may be specified in the <tt>fieldDefaults</tt>.</p>
     * <p>Example:</p>
     * <pre><code>new Ext.form.FormPanel({
    fieldDefaults: {
        labelAlign: 'left',
        labelWidth: 100
    },
    items: [{
        xtype: 'fieldset',
        defaults: {
            labelAlign: 'top'
        },
        items: [{
            name: 'field1'
        }, {
            name: 'field2'
        }]
    }, {
        xtype: 'fieldset',
        items: [{
            name: 'field3',
            labelWidth: 150
        }, {
            name: 'field4'
        }]
    }]
});</code></pre>
     * <p>In this example, field1 and field2 will get labelAlign:'top' (from the fieldset's <tt>defaults</tt>)
     * and labelWidth:100 (from <tt>fieldDefaults</tt>), field3 and field4 will both get labelAlign:'left' (from
     * <tt>fieldDefaults</tt> and field3 will use the labelWidth:150 from its own config.</p>
     */

    /**
     * @cfg {Boolean} pollForChanges
     * If set to <tt>true</tt>, sets up an interval task (using the {@link #pollInterval}) in which the 
     * panel's fields are repeatedly checked for changes in their values. This is in addition to the normal detection
     * each field does on its own input element, and is not needed in most cases. It does, however, provide a
     * means to absolutely guarantee detection of all changes including some edge cases in some browsers which
     * do not fire native events. Defaults to <tt>false</tt>.
     */

    /**
     * @cfg {Number} pollInterval
     * Interval in milliseconds at which the form's fields are checked for value changes. Only used if
     * the {@link #pollForChanges} option is set to <tt>true</tt>. Defaults to 500 milliseconds.
     */

    /**
     * @cfg {String} layout The {@link Ext.container.Container#layout} for the form panel's immediate child items.
     * Defaults to <tt>'anchor'</tt>.
     */
    layout: 'anchor',

    ariaRole: 'form',

    initComponent: function() {
        var me = this;
        me.callParent();

        me.relayEvents(me.form, [
            'beforeaction',
            'actionfailed',
            'actioncomplete',
            'validitychange',
            'dirtychange'
        ]);

        // Start polling if configured
        if (me.pollForChanges) {
            me.startPolling(me.pollInterval || 500);
        }
    },

    initItems: function() {
        // Create the BasicForm
        this.form = this.createForm();
        this.callParent();
    },

    /**
     * @private
     */
    createForm: function() {
        return new Ext.form.Basic(this, Ext.applyIf({listeners: {}}, this.initialConfig));
    },

    /**
     * Provides access to the {@link Ext.form.Basic Form} which this Panel contains.
     * @return {Ext.form.Basic} The {@link Ext.form.Basic Form} which this Panel contains.
     */
    getForm: function() {
        return this.form;
    },

    beforeDestroy: function() {
        this.stopPolling();
        this.form.destroy();
        this.callParent();
    },

    /**
     * @private
     * Handle the addition of components to the FormPanel's child tree, copying the default field config
     * properties from the panel to individual fields as necessary.
     */
    onSubCmpAdded: function(parent, child) {
        var me = this,
            minButtonWidth = me.minButtonWidth;

        function handleCmp(cmp) {
            if (cmp.isFieldLabelable) {
                cmp.applyFieldDefaults(me.fieldDefaults);
            } else if (cmp.isContainer) {
                cmp.items.each(handleCmp);
            }
        }
        handleCmp(child);
        
        me.callParent(arguments);
    },

    /**
     * This is a proxy for the underlying BasicForm's {@link Ext.form.Basic#load} call.
     * @param {Object} options The options to pass to the action (see {@link Ext.form.Basic#load} and
     * {@link Ext.form.Basic#doAction} for details)
     */
    load: function(options) {
        this.form.load(options);
    },

    /**
     * This is a proxy for the underlying BasicForm's {@link Ext.form.Basic#submit} call.
     * @param {Object} options The options to pass to the action (see {@link Ext.form.Basic#submit} and
     * {@link Ext.form.Basic#doAction} for details)
     */
    submit: function(options) {
        this.form.submit(options);
    },

    /*
     * Inherit docs, not using onDisable because it only gets fired
     * when the component is rendered.
     */
    disable: function(silent) {
        this.callParent(arguments);
        this.form.getFields().each(function(field) {
            field.disable();
        });
    },

    /*
     * Inherit docs, not using onEnable because it only gets fired
     * when the component is rendered.
     */
    enable: function(silent) {
        this.callParent(arguments);
        this.form.getFields().each(function(field) {
            field.enable();
        });
    },

    /**
     * Start an interval task to continuously poll all the fields in the form for changes in their
     * values. This is normally started automatically by setting the {@link #pollForChanges} config.
     * @param {Number} interval The interval in milliseconds at which the check should run.
     */
    startPolling: function(interval) {
        this.stopPolling();
        var task = new Ext.util.TaskRunner(interval);
        task.start({
            interval: 0,
            run: this.checkChanges,
            scope: this
        });
        this.pollTask = task;
    },

    /**
     * Stop a running interval task that was started by {@link #startPolling}.
     */
    stopPolling: function() {
        var task = this.pollTask;
        if (task) {
            task.stopAll();
            delete this.pollTask;
        }
    },

    /**
     * Forces each field within the form panel to 
     * {@link Ext.form.Field#checkChange check if its value has changed}.
     */
    checkChanges: function() {
        this.form.getFields().each(function(field) {
            field.checkChange();
        });
    }
});
