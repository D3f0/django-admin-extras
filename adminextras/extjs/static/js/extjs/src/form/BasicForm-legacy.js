/**
 * Overrides for maintaining back-compat with pre-Ext4 legacy BasicForm API
 * @ignore
 */
(function() {

    Ext.override(Ext.form.Basic, {

        /**
         * Add Ext.form Components to this form's Collection. This does not result in rendering of
         * the passed Component, it just enables the form to validate Fields, and distribute values to
         * Fields.
         * <p><b>You will not usually call this function. In order to be rendered, a Field must be added
         * to a {@link Ext.container.Container Container}, usually an {@link Ext.form.FormPanel FormPanel}.
         * The FormPanel to which the field is added takes care of adding the Field to the BasicForm's
         * collection.</b></p>
         * @param {Field} field1
         * @param {Field} field2 (optional)
         * @param {Field} etc (optional)
         * @return {Ext.form.Basic} this
         * @deprecated
         */
        add: function() {
            //<debug>
            console.log('Ext.form.Basic#add is deprecated.');
            //</debug>
            return this;
        },

        /**
         * Removes a field from the items collection (does NOT remove its markup).
         * @param {Field} field
         * @return {Ext.form.Basic} this
         * @deprecated
         */
        remove: function(field) {
            //<debug>
            console.log('Ext.form.Basic#remove is deprecated.');
            //</debug>
            return this;
        },

        /**
         * Removes all fields from the collection that have been destroyed.
         * @deprecated
         */
        cleanDestroyed: function() {
            //<debug>
            console.log('Ext.form.Basic#cleanDestroyed is deprecated.');
            //</debug>
        },

        /**
         * Iterates through the {@link Ext.form.Field Field}s which have been {@link #add add}ed to this BasicForm,
         * checks them for an id attribute, and calls {@link Ext.form.Field#applyToMarkup} on the existing dom element with that id.
         * @return {Ext.form.Basic} this
         * @deprecated
         */
        render: function() {
            //<debug>
            console.log('Ext.form.Basic#render is deprecated.');
            //</debug>
            return this;
        },


        /**
         * Retrieves the fields in the form as a set of key/value pairs, using the {@link Ext.form.Field#getValue getValue()} method.
         * If multiple fields exist with the same name they are returned as an array.
         * @return {Object} The values in the form
         * @deprecated Use getValues instead
         */
        getFieldValues: function(dirtyOnly) {
            //<debug>
            console.log('Ext.form.Basic#getFieldValues is deprecated. Use getValues instead.');
            //</debug>
            return this.getValues(false, dirtyOnly);
        },


        callFieldMethod: function(fnName, args) {
            //<debug>
            console.log('Ext.form.Basic#callFieldMethod is deprecated.');
            //</debug>

            args = args || [];
            this.getFields().each(function(f) {
                if (Ext.isFunction(f[fnName])) {
                    f[fnName].apply(f, args);
                }
            });
            return this;
        }

    });

})();