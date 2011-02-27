/**
 * @class Ext.chart.Legend
 *
 * Defines a legend for a chart's series.
 * The 'chart' member must be set prior to rendering.
 * The legend class displays a list of legend items each of them related with a
 * series being rendered. In order to render the legend item of the proper series
 * the series configuration object must have <code>showInSeries</code> set to
 * true.
 *
 * The legend configuration object accepts a <code>position</code> as parameter.
 * The <code>position</code> parameter can be <code>left</code>, <code>right</code>
 * <code>top</code> or <code>bottom</code>. For example:
 *
   <pre><code>
        legend: {
            position: 'right'
        },
    </code></pre>
 *
 * @constructor
 */
Ext.define('Ext.chart.Legend', {

    /* Begin Definitions */

    requires: ['Ext.chart.LegendItem'],

    /* End Definitions */

    /**
     * @cfg {Boolean} visible
     * Whether or not the legend should be displayed.
     */
    visible: true,

    /**
     * @cfg {String} position
     * The position of the legend in relation to the chart. One of: "top",
     * "bottom", "left", "right", or "float". If set to "float", then the legend
     * box will be positioned at the point denoted by the x and y parameters.
     */
    position: 'bottom',

    /**
     * @cfg {Number} x
     * X-position of the legend box. Used directly if position is set to "float", otherwise 
     * it will be calculated dynamically.
     */
    x: 0,

    /**
     * @cfg {Number} y
     * Y-position of the legend box. Used directly if position is set to "float", otherwise
     * it will be calculated dynamically.
     */
    y: 0,

    /**
     * @cfg {String} labelFont
     * Font to be used for the legend labels.
     */
    labelFont: '12px Helvetica, sans-serif',

    /**
     * @cfg {String} boxStroke
     * Style of the stroke for the legend box
     */
    boxStroke: '#000',

    /**
     * @cfg {String} boxStrokeWidth
     * Width of the stroke for the legend box
     */
    boxStrokeWidth: 1,

    /**
     * @cfg {String} boxFill
     * Fill style for the legend box
     */
    boxFill: '#FFF',

    /**
     * @cfg {Number} itemSpacing
     * Amount of space between legend items
     */
    itemSpacing: 10,

    /**
     * @cfg {Number} padding
     * Amount of padding between the legend box's border and its items
     */
    padding: 5,

    // @private
    width: 0,
    // @private
    height: 0,

    /**
     * @cfg {Number} boxZIndex
     * Sets the z-index for the legend. Defaults to 100.
     */
    boxZIndex: 100,

    constructor: function(config) {
        var me = this;
        if (config) {
            Ext.apply(me, config);
        }
        me.items = [];
        /**
         * Whether the legend box is oriented vertically, i.e. if it is on the left or right side or floating.
         * @type {Boolean}
         */
        me.isVertical = ("left|right|float".indexOf(me.position) !== -1);
    },

    /**
     * @private Create all the sprites for the legend
     */
    create: function() {
        var me = this;
        if (!me.created && me.isDisplayed()) {
            me.createItems();
            me.createBox();
            me.created = true;
        }
    },

    /**
     * @private Determine whether the legend should be displayed. Looks at the legend's 'visible' config,
     * and also the 'showInLegend' config for each of the series.
     */
    isDisplayed: function() {
        return this.visible && this.chart.series.findIndex('showInLegend', true) !== -1;
    },

    /**
     * @private Create the series markers and labels
     */
    createItems: function() {
        var me = this,
            chart = me.chart,
            padding = me.padding,
            itemSpacing = me.itemSpacing,
            maxWidth = 0,
            maxHeight = 0,
            totalWidth = 0,
            totalHeight = 0,
            vertical = me.isVertical,
            math = Math,
            mfloor = math.floor,
            mmax = math.max,
            x, y, spacing, item, bbox, height, width;

        // Create all the item labels, collecting their dimensions and positioning each one
        // properly in relation to the previous item
        chart.series.each(function(series, i) {
            if (series.showInLegend) {
                Ext.each([].concat(series.yField), function(field, j) {
                    item = new Ext.chart.LegendItem({
                        legend: this,
                        series: series,
                        surface: chart.surface,
                        yFieldIndex: j
                    });
                    bbox = item.getBBox();

                    //always measure from x=0, since not all markers go all the way to the left
                    width = bbox.width; 
                    height = bbox.height;

                    if (i + j === 0) {
                        spacing = vertical ? padding + height / 2 : padding;
                    }
                    else {
                        spacing = itemSpacing / (vertical ? 2 : 1);
                    }
                    // Set the item's position relative to the legend box
                    item.x = mfloor(vertical ? padding : totalWidth + spacing);
                    item.y = mfloor(vertical ? totalHeight + spacing : padding + height / 2);

                    // Collect cumulative dimensions
                    totalWidth += width + spacing;
                    totalHeight += height + spacing;
                    maxWidth = mmax(maxWidth, width);
                    maxHeight = mmax(maxHeight, height);

                    this.items.push(item);
                }, this);
            }
        }, me);

        // Store the collected dimensions for later
        me.width = mfloor((vertical ? maxWidth : totalWidth) + padding * 2);
        me.height = mfloor((vertical ? totalHeight - 2 * spacing : maxHeight) + (padding * 2));
        me.itemHeight = maxHeight;
    },

    /**
     * @private Get the bounds for the legend's outer box
     */
    getBBox: function() {
        var me = this;
        return {
            x: me.x,
            y: me.y,
            width: me.width,
            height: me.height
        };
    },

    /**
     * @private Create the box around the legend items
     */
    createBox: function() {
        var me = this,
            box = me.boxSprite = me.chart.surface.add(Ext.apply({
                type: 'rect',
                stroke: me.boxStroke,
                "stroke-width": me.boxStrokeWidth,
                fill: me.boxFill,
                zIndex: me.boxZIndex
            }, me.getBBox()));
        box.redraw();
    },

    /**
     * @private Update the position of all the legend's sprites to match its current x/y values
     */
    updatePosition: function() {
        var me = this,
            x, y,
            legendWidth = me.width,
            legendHeight = me.height,
            padding = me.padding,
            chart = me.chart,
            chartBBox = chart.chartBBox,
            insets = chart.insetPadding,
            chartWidth = chartBBox.width - (insets * 2),
            chartHeight = chartBBox.height - (insets * 2),
            chartX = chartBBox.x + insets,
            chartY = chartBBox.y + insets,
            surface = chart.surface,
            mfloor = Math.floor;
        if (me.isDisplayed()) {

            // Find the position based on the dimensions
            switch(me.position) {
                case "left":
                    x = insets;
                    y = mfloor(chartY + chartHeight / 2 - legendHeight / 2);
                    break;
                case "right":
                    x = mfloor(surface.width - legendWidth) - insets;
                    y = mfloor(chartY + chartHeight / 2 - legendHeight / 2);
                    break;
                case "top":
                    x = mfloor(chartX + chartWidth / 2 - legendWidth / 2);
                    y = insets;
                    break;
                case "bottom":
                    x = mfloor(chartX + chartWidth / 2 - legendWidth / 2);
                    y = mfloor(surface.height - legendHeight) - insets;
                    break;
                default:
                    x = mfloor(me.x) + insets;
                    y = mfloor(me.y) + insets;
            }
            me.x = x;
            me.y = y;

            // Update the position of each item
            Ext.each(me.items, function(item) {
                item.updatePosition();
            });
            // Update the position of the outer box
            me.boxSprite.setAttributes(me.getBBox(), true);
        }
    }
});