/**
 * @class Ext.chart.series.Scatter
 * @extends Ext.chart.series.Cartesian
 * 
 * Creates a Scatter Chart. The scatter plot is useful when trying to display more than two variables in the same visualization. 
 * These variables can be mapped into x, y coordinates and also to an element's radius/size, color, etc.
 * As with all other series, the Scatter Series must be appended in the *series* Chart array configuration. See the Chart 
 * documentation for more information on creating charts. A typical configuration object for the scatter could be:
 * 
  <pre><code>
        series: [{
            type: 'scatter',
            markerCfg: {
                radius: 5,
                size: 5
            },
            axis: 'left',
            xField: 'name',
            yField: 'data1'
        }, {
            type: 'scatter',
            markerCfg: {
                radius: 5,
                size: 5
            },
            axis: 'left',
            xField: 'name',
            yField: 'data2'
        }, {
            type: 'scatter',
            markerCfg: {
                radius: 5,
                size: 5
            },
            axis: 'left',
            xField: 'name',
            yField: 'data3'
        }]
   </code></pre>
 
 * 
 * In this configuration we add three different categories of scatter series. Each of them is bound to a different field of the same data store, 
 * `data1`, `data2` and `data3` respectively. All x-fields for the series must be the same field, in this case `name`. 
 * Each scatter series has a different styling configuration for markers, specified by the `markerCfg` object. Finally we set the left axis as 
 * axis to show the current values of the elements.
 * 
 * @xtype scatter
 * 
 */
Ext.define('Ext.chart.series.Scatter', {

    /* Begin Definitions */

    extend: 'Ext.chart.series.Cartesian',

    requires: ['Ext.chart.axis.Axis', 'Ext.chart.Shapes', 'Ext.fx.Anim'],

    /* End Definitions */

    type: 'scatter',

    /**
     * @cfg {Object} markerCfg
     * The display style for the scatter series markers.
     */
    
    /**
     * @cfg {Object} style 
     * Append styling properties to this object for it to override theme properties.
     */

    constructor: function(config) {
        this.callParent(arguments);
        var me = this,
            shadow = me.chart.shadow,
            surface = me.chart.surface, i, l;
        Ext.apply(me, config, {
            style: {},
            markerCfg: {},
            shadowAttributes: [{
                "stroke-width": 6,
                "stroke-opacity": 0.05,
                stroke: 'rgb(0, 0, 0)'
            }, {
                "stroke-width": 4,
                "stroke-opacity": 0.1,
                stroke: 'rgb(0, 0, 0)'
            }, {
                "stroke-width": 2,
                "stroke-opacity": 0.15,
                stroke: 'rgb(0, 0, 0)'
            }]
        });
        me.group = surface.getGroup(me.seriesId);
        if (shadow) {
            for (i = 0, l = me.shadowAttributes.length; i < l; i++) {
                me.shadowGroups.push(surface.getGroup(me.seriesId + '-shadows' + i));
            }
        }
    },

    /**
     * Draws the series for the current chart.
     */
    drawSeries: function() {
        var me = this,
            chart = me.chart,
            store = chart.substore || chart.store,
            chartBBox = chart.chartBBox,
            group = me.group,
            gutterX = chart.maxGutter[0],
            gutterY = chart.maxGutter[1],
            enableShadows = chart.shadow,
            shadowGroups = me.shadowGroups,
            shadowAttributes = me.shadowAttributes,
            lnsh = shadowGroups.length,
            markerStyle = me.markerStyle,
            seriesStyle = me.seriesStyle,
            minX = 0,
            minY = 0,
            bbox,
            shadowAttribute,
            shadows,
            shadow,
            shindex,
            rendererAttributes,
            attrs = [],
            attr,
            sprite,
            ln,
            i,
            axis,
            ends,
            xScale,
            yScale,
            maxX,
            maxY,
            endMarkerStyle, endSeriesStyle, type;

        endMarkerStyle = Ext.apply(markerStyle, me.markerCfg);
        endSeriesStyle = Ext.apply(seriesStyle, me.style);
        type = endMarkerStyle.type;
        delete endMarkerStyle.type;
        
        //if the store is empty then there's nothing to be rendered
        if (!store || !store.getCount()) {
            return;
        }
        
        me.unHighlightItem();
        me.cleanHighlights();

        me.bbox = bbox = {
            x: chartBBox.x + gutterX,
            y: chartBBox.y + gutterY,
            width: chartBBox.width - (gutterX * 2),
            height: chartBBox.height - (gutterY * 2)
        };

        me.clipRect = [bbox.x, bbox.y, bbox.width, bbox.height];
        axis = chart.axes.get(me.axis);
        if (axis) {
            if (axis.position == 'top' || axis.position == 'bottom') {
                minX = axis.from;
                maxX = axis.to;
            }
            else {
                minY = axis.from;
                maxY = axis.to;
            }
        }
        else {
            if (me.xField) {   
                ends = new Ext.chart.axis.Axis({
                    chart: chart,
                    fields: [me.xField]
                }).calcEnds();
                minX = ends.from;
                maxX = ends.to;
            }
            if (me.yField) {
                ends = new Ext.chart.axis.Axis({
                    chart: chart,
                    fields: [me.yField]
                }).calcEnds();
                minY = ends.from;
                maxY = ends.to;
            }
        }
        xScale = bbox.width / (maxX - minX);
        yScale = bbox.height / (maxY - minY);

        me.items = [];

        store.each(function(record, i) {
            var xValue = record.get(me.xField),
                yValue = record.get(me.yField),
                x,
                y;

            // Ensure a value
            if (typeof xValue == 'string') {
                xValue = i;
                minX = 0;
                xScale = bbox.width / (store.getCount() - 1);
            }
            if (typeof yValue == 'string') {
                yValue = i;
                minY = 0;
                yScale = bbox.height / (store.getCount() - 1);
            }
            x = bbox.x + (xValue - minX) * xScale;
            y = bbox.y + bbox.height - (yValue - minY) * yScale;
            attrs.push({
                x: x,
                y: y
            });

            me.items.push({
                series: me,
                value: [xValue, yValue],
                point: [x, y],
                storeItem: record
            });
            
            // When resizing, reset before animating
            if (chart.animate && chart.resizing) {
                sprite = group.getAt(i);
                if (sprite) {
                    sprite.setAttributes({
                        translate: {
                            x: (bbox.x + bbox.width) / 2,
                            y: (bbox.y + bbox.height) / 2
                        }
                    }, true);
                    if (enableShadows) {
                        shadows = sprite.shadows;
                        for (shindex = 0; shindex < lnsh; shindex++) {
                            shadowAttribute = Ext.apply({}, shadowAttributes[shindex]);
                            if (shadowAttribute.translate) {
                                shadowAttribute.translate = Ext.apply({}, shadowAttribute.translate || {});
                                shadowAttribute.translate.x += (bbox.x + bbox.width) / 2;
                                shadowAttribute.translate.y += (bbox.y + bbox.height) / 2;
                            } else {
                                Ext.apply(shadowAttribute, {
                                    translate: {
                                        x: (bbox.x + bbox.width) / 2,
                                        y: (bbox.y + bbox.height) / 2
                                    }
                                });
                            }
                            shadows[shindex].setAttributes(shadowAttribute, true);
                        }
                    }
                }
            }
        }, me);

        // Create new or reuse bar sprites and animate/display
        ln = attrs.length;
        for (i = 0; i < ln; i++) {
            attr = attrs[i];
            sprite = group.getAt(i);
            Ext.apply(attr, endMarkerStyle);
            // Create a new sprite if needed (no height)
            if (!sprite) {
                sprite = Ext.chart.Shapes[type](chart.surface, Ext.apply({}, {
                    x: 0, y: 0,
                    group: group,
                    translate: {
                        x: (bbox.x + bbox.width) / 2,
                        y: (bbox.y + bbox.height) / 2
                    }
                }, attr));
                
                if (enableShadows) {
                    sprite.shadows = shadows = [];
                    for (shindex = 0; shindex < lnsh; shindex++) {
                        shadowAttribute = Ext.apply({}, shadowAttributes[shindex]);
                        if (shadowAttribute.translate) {
                            shadowAttribute.translate = Ext.apply({}, shadowAttribute.translate);
                            shadowAttribute.translate.x += (bbox.x + bbox.width) / 2;
                            shadowAttribute.translate.y += (bbox.y + bbox.height) / 2;
                        } else {
                            Ext.apply(shadowAttribute, {
                                translate: {
                                    x: (bbox.x + bbox.width) / 2,
                                    y: (bbox.y + bbox.height) / 2
                                }
                            });
                        }
                        Ext.apply(shadowAttribute, endMarkerStyle);
                        shadow = Ext.chart.Shapes[type](chart.surface, Ext.apply({}, {
                            x: 0, y: 0,
                            group: shadowGroups[shindex]
                        }, shadowAttribute));
                        shadows.push(shadow);
                    }
                }
            }
            shadows = sprite.shadows;
            if (chart.animate) {
                rendererAttributes = me.renderer(sprite, store.getAt(i), 
                                            { translate: attr }, i, store);
                sprite._to = rendererAttributes;
                me.animation = me.onAnimate(sprite, {
                    to: rendererAttributes
                });
                //animate shadows
                for (shindex = 0; shindex < lnsh; shindex++) {
                    shadowAttribute = Ext.apply({}, shadowAttributes[shindex]);
                    rendererAttributes = me.renderer(shadows[shindex], store.getAt(i), Ext.apply({}, { 
                        translate: {
                            x: attr.x + (shadowAttribute.translate? shadowAttribute.translate.x : 0),
                            y: attr.y + (shadowAttribute.translate? shadowAttribute.translate.y : 0)
                        } 
                    }, shadowAttribute), i, store);
                    this.onAnimate(shadows[shindex], { to: rendererAttributes });
                }
            } else {
                rendererAttributes = me.renderer(sprite, store.getAt(i), 
                            Ext.apply({ translate: attr }, { hidden: false }), i, store);
                sprite.setAttributes(rendererAttributes, true);
                //update shadows
                for (shindex = 0; shindex < lnsh; shindex++) {
                    shadowAttribute = shadowAttributes[shindex];
                    rendererAttributes = me.renderer(shadows[shindex], store.getAt(i), Ext.apply({ 
                        x: attr.x,
                        y: attr.y
                    }, shadowAttribute), i, store);
                    shadows[shindex].setAttributes(rendererAttributes, true);
                }
            }
            me.items[i].sprite = sprite;
        }
        // Hide unused sprites
        ln = group.getCount();
        for (i = attrs.length; i < ln; i++) {
            group.getAt(i).hide(true);
        }
        me.renderLabels();
        me.renderCallouts();
    },
    
    // @private callback for when creating a label sprite.
    onCreateLabel: function(storeItem, item, i, display) {
        var me = this,
            group = me.labelsGroup,
            config = me.label,
            endLabelStyle = Ext.apply({}, config, me.seriesLabelStyle),
            bbox = me.bbox;
        
        return me.chart.surface.add(Ext.apply({
            'type': 'text',
            'group': group,
            'x': item.point[0],
            'y': bbox.y + bbox.height / 2
        }, endLabelStyle));
    },
    
    // @private callback for when placing a label sprite.
    onPlaceLabel: function(label, storeItem, item, i, display, animate) {
        var me = this,
            chart = me.chart,
            resizing = chart.resizing,
            config = me.label,
            format = config.renderer,
            field = config.field,
            bbox = me.bbox,
            x = item.point[0],
            y = item.point[1],
            radius = item.sprite.attr.radius,
            bb, width, height;
        
        label.setAttributes({
            text: format(storeItem.get(field)),
            hidden: true
        }, true);
        
        if (display == 'rotate') {
            label.setAttributes({
                'text-anchor': 'start',
                'rotation': {
                    x: x,
                    y: y,
                    degrees: -45
                }
            }, true);
            //correct label position to fit into the box
            bb = label.getBBox();
            width = bb.width;
            height = bb.height;
            x = x < bbox.x? bbox.x : x;
            x = (x + width > bbox.x + bbox.width)? (x - (x + width - bbox.x - bbox.width)) : x;
            y = (y - height < bbox.y)? bbox.y + height : y;
        
        } else if (display == 'under' || display == 'over') {
            //TODO(nicolas): find out why width/height values in circle bounding boxes are undefined.
            bb = item.sprite.getBBox();
            bb.width = bb.width || (radius * 2);
            bb.height = bb.height || (radius * 2);
            y = y + (display == 'over'? -bb.height : bb.height);
            //correct label position to fit into the box
            bb = label.getBBox();
            width = bb.width/2;
            height = bb.height/2;
            x = x - width < bbox.x ? bbox.x + width : x;
            x = (x + width > bbox.x + bbox.width) ? (x - (x + width - bbox.x - bbox.width)) : x;
            y = y - height < bbox.y? bbox.y + height : y;
            y = (y + height > bbox.y + bbox.height) ? (y - (y + height - bbox.y - bbox.height)) : y;
        }
        
        if (me.chart.animate && !me.chart.resizing) {
            label.show(true);
            me.onAnimate(label, {
                to: {
                    x: x,
                    y: y
                }
            });
        }
        else {
            label.setAttributes({
                x: x,
                y: y
            }, true);
            if (resizing) {
                if (me.animation) {
                    me.animation.on('afteranimate', function() {
                        label.show(true);
                    });   
                } else {
                    label.show(true);
                }
            } else {
                label.show(true);
            }
        }
    },
    
    // @private callback for when placing a callout sprite.    
    onPlaceCallout: function(callout, storeItem, item, i, display, animate, index) {
        var me = this,
            chart = me.chart,
            surface = chart.surface,
            resizing = chart.resizing,
            config = me.callouts,
            items = me.items,
            cur = item.point,
            normal,
            bbox = callout.label.getBBox(),
            offsetFromViz = 30,
            offsetToSide = 10,
            offsetBox = 3,
            boxx, boxy, boxw, boxh,
            p, clipRect = me.clipRect,
            x, y;
    
        //position
        normal = [Math.cos(Math.PI /4), -Math.sin(Math.PI /4)];
        x = cur[0] + normal[0] * offsetFromViz;
        y = cur[1] + normal[1] * offsetFromViz;
        
        //box position and dimensions
        boxx = x + (normal[0] > 0? 0 : -(bbox.width + 2 * offsetBox));
        boxy = y - bbox.height /2 - offsetBox;
        boxw = bbox.width + 2 * offsetBox;
        boxh = bbox.height + 2 * offsetBox;
        
        //now check if we're out of bounds and invert the normal vector correspondingly
        //this may add new overlaps between labels (but labels won't be out of bounds).
        if (boxx < clipRect[0] || (boxx + boxw) > (clipRect[0] + clipRect[2])) {
            normal[0] *= -1;
        }
        if (boxy < clipRect[1] || (boxy + boxh) > (clipRect[1] + clipRect[3])) {
            normal[1] *= -1;
        }
    
        //update positions
        x = cur[0] + normal[0] * offsetFromViz;
        y = cur[1] + normal[1] * offsetFromViz;
        
        //update box position and dimensions
        boxx = x + (normal[0] > 0? 0 : -(bbox.width + 2 * offsetBox));
        boxy = y - bbox.height /2 - offsetBox;
        boxw = bbox.width + 2 * offsetBox;
        boxh = bbox.height + 2 * offsetBox;
        
        if (chart.animate) {
            //set the line from the middle of the pie to the box.
            me.onAnimate(callout.lines, {
                to: {
                    path: ["M", cur[0], cur[1], "L", x, y, "Z"]
                }
            }, true);
            //set box position
            me.onAnimate(callout.box, {
                to: {
                    x: boxx,
                    y: boxy,
                    width: boxw,
                    height: boxh
                }
            }, true);
            //set text position
            me.onAnimate(callout.label, {
                to: {
                    x: x + (normal[0] > 0? offsetBox : -(bbox.width + offsetBox)),
                    y: y
                }
            }, true);
        } else {
            //set the line from the middle of the pie to the box.
            callout.lines.setAttributes({
                path: ["M", cur[0], cur[1], "L", x, y, "Z"]
            }, true);
            //set box position
            callout.box.setAttributes({
                x: boxx,
                y: boxy,
                width: boxw,
                height: boxh
            }, true);
            //set text position
            callout.label.setAttributes({
                x: x + (normal[0] > 0? offsetBox : -(bbox.width + offsetBox)),
                y: y
            }, true);
        }
        for (p in callout) {
            callout[p].show(true);
        }
    },

    // @private handles sprite animation for the series.
    onAnimate: function(sprite, attr) {
        sprite.show();
        return this.callParent(arguments);
    },

    /**
     * For a given x/y point relative to the Surface, find a corresponding item from this
     * series, if any.
     *
     * @param x {Number} The left pointer coordinate.
     * @param y {Number} The top pointer coordinate.
     * @return {Object} An object with the item found or null instead.
     */
    getItemForPoint: function(x, y) {
        //if there are no elements then just return null
        if (!this.items) {
            return null;
        }
        
        var items = this.items,
            point,
            closestItem = null,
            tolerance = 10,
            i = items && items.length;

        function dist(point) {
            var abs = Math.abs,
                dx = abs(point[0] - x),
                dy = abs(point[1] - y);
            return Math.sqrt(dx * dx + dy * dy);
        }

        while (i--) {
            point = items[i].point;
            if (point[0] - tolerance <= x && point[0] + tolerance >= x &&
                point[1] - tolerance <= y && point[1] + tolerance >= y) {
                if (!closestItem || (dist(point) < dist(closestItem.point))) {
                    closestItem = items[i];
                }
            }
            // If we already found a match but no longer match, assume we're moving further
            // away and exit the loop
            else if (closestItem) {
                break;
            }
        }

        return closestItem;
    }
});

