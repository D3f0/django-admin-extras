/**
 * @class Ext.layout.container.boxOverflow.HorizontalMenu
 * @extends Ext.layout.container.boxOverflow.Menu
 * @private
 */
Ext.define('Ext.layout.container.boxOverflow.HorizontalMenu', {

    /* Begin Definitions */

    extend: 'Ext.layout.container.boxOverflow.Menu',

    /* End Definitions */

    constructor: function() {
        Ext.layout.container.boxOverflow.HorizontalMenu.superclass.superclass.constructor.apply(this, arguments);

        var me = this,
            layout = me.layout,
            origFunction = layout.calculateChildBoxes;

        layout.calculateChildBoxes = function(visibleItems, targetSize) {
            var calcs = origFunction.apply(layout, arguments),
                meta = calcs.meta,
                items = me.menuItems,
                index, length, hiddenWidth;

            //calculate the width of the items currently hidden solely because there is not enough space
            //to display them
            hiddenWidth = 0;
            for (index = 0, length = items.length; index < length; index++) {
                hiddenWidth += items[index].width;
            }

            meta.minimumWidth += hiddenWidth;
            meta.tooNarrow = meta.minimumWidth > targetSize.width;

            return calcs;
        };
    },

    handleOverflow: function(calculations, targetSize) {
        this.showTrigger();

        var newWidth = targetSize.width - this.afterCt.getWidth(),
            boxes = calculations.boxes,
            usedWidth = 0,
            recalculate = false,
            index, length, spareWidth, showCount, hidden, comp, width, i, item, right;

        //calculate the width of all visible items and any spare width
        for (index = 0, length = boxes.length; index < length; index++) {
            usedWidth += boxes[index].width;
        }

        spareWidth = newWidth - usedWidth;
        showCount = 0;

        //see if we can re-show any of the hidden components
        for (index = 0, length = this.menuItems.length; index < length; index++) {
            hidden = this.menuItems[index];
            comp = hidden.component;
            width = hidden.width;

            if (width < spareWidth) {
                comp.show();

                spareWidth -= width;
                showCount++;
                recalculate = true;
            } else {
                break;
            }
        }

        if (recalculate) {
            this.menuItems = this.menuItems.slice(showCount);
        } else {
            for (i = boxes.length - 1; i >= 0; i--) {
                item = boxes[i].component;
                right = boxes[i].left + boxes[i].width;

                if (right >= newWidth) {
                    this.menuItems.unshift({
                        component: item,
                        width: boxes[i].width
                    });

                    item.hide();
                } else {
                    break;
                }
            }
        }

        if (this.menuItems.length == 0) {
            this.hideTrigger();
        }

        return {
            targetSize: {
                height: targetSize.height,
                width: newWidth
            },
            recalculate: recalculate
        };
    }
});