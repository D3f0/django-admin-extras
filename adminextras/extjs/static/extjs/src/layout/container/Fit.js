/**
 * @class Ext.layout.container.Fit
 * @extends Ext.layout.container.AbstractFit
 * <p>This is a base class for layouts that contain <b>a single item</b> that automatically expands to fill the layout's
 * container.  This class is intended to be extended or created via the <tt>layout:'fit'</tt> {@link Ext.Container#layout}
 * config, and should generally not need to be created directly via the new keyword.</p>
 * <p>FitLayout does not have any direct config options (other than inherited ones).  To fit a panel to a container
 * using FitLayout, simply set layout:'fit' on the container and add a single panel to it.  If the container has
 * multiple panels, only the first one will be displayed.  Example usage:</p>
 * <pre><code>
var p = new Ext.Panel({
    title: 'Fit Layout',
    layout:'fit',
    items: {
        title: 'Inner Panel',
        html: '&lt;p&gt;This is the inner panel content&lt;/p&gt;',
        border: false
    }
});
</code></pre>
 */
Ext.define('Ext.layout.container.Fit', {

    /* Begin Definitions */

    extend: 'Ext.layout.container.AbstractFit',

    alias: 'layout.fit',

    /* End Definitions */
    // @private
    onLayout : function() {
        Ext.layout.container.Fit.superclass.onLayout.call(this);

        if (this.owner.items.length) {
            this.setItemBox(this.owner.items.get(0), this.getLayoutTargetSize());
        }
    },

    getTargetBox : function() {
        return this.getLayoutTargetSize();
    },

    setItemBox : function(item, box) {
        var owner = this.owner;
        if (item && box.height > 0) {
            box.ownerCt = owner;
            if (this.isManaged('width') === true) {
               box.width = undefined;
            }
            if (this.isManaged('height') === true) {
               box.height = undefined;
            }
            item.setCalculatedSize(box);
        }
    }
});