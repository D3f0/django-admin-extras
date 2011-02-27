/**
 * @class Ext.chart.series.Area
 * @extends Ext.chart.series.Cartesian
 * 
 <p>
    Creates a Stacked Area Chart. The stacked area chart is useful when displaying multiple aggregated layers of information.
    As with all other series, the Area Series must be appended in the *series* Chart array configuration. See the Chart 
    documentation for more information. A typical configuration object for the area series could be:
 </p>
 
  <pre><code>
   series: [{
       type: 'area',
       highlight: true,
       axis: 'left',
       xField: 'name',
       yField: ['data1', 'data2', 'data3', 'data4', 'data5', 'data6', 'data7'],
       style: {
           opacity: 0.93
       }
   }]
   </code></pre>
 
  
 <p>
  In this configuration we set `area` as the type for the series, set highlighting options to true for highlighting elements on hover, 
  take the left axis to measure the data in the area series, set as xField (x values) the name field of each element in the store, 
  and as yFields (aggregated layers) seven data fields from the same store. Then we override some theming styles by adding some opacity 
  to the style object.
 </p>
  
 * @xtype area
 * 
 */
Ext.define('Ext.chart.series.Area', {

    /* Begin Definitions */

    extend: 'Ext.chart.series.Cartesian',

    requires: ['Ext.chart.axis.Axis', 'Ext.draw.Color', 'Ext.fx.Anim'],

    /* End Definitions */

    type: 'area',

    /**
     * @cfg {Object} style 
     * Append styling properties to this object for it to override theme properties.
     */
    style: {},

    constructor: function(config) {
        this.callParent(arguments);
        var me = this,
            surface = me.chart.surface,
            i, l;
        Ext.apply(me, config, {
            __excludes: [],
            highlightCfg: {
                lineWidth: 3,
                stroke: '#55c',
                opacity: 0.8,
                color: '#f00'
            }
        });
        if (me.highlight) {
            me.highlightSprite = surface.add({
                type: 'path',
                path: ['M', 0, 0],
                zIndex: 1000,
                opacity: 0.3,
                lineWidth: 5,
                hidden: true,
                stroke: '#444'
            });
        }
        me.group = surface.getGroup(me.seriesId);
    },

    // @private Shrinks dataSets down to a smaller size
    shrink: function(xValues, yValues, size) {
        var len = xValues.length,
            ratio = Math.floor(len / size),
            i, j,
            xSum = 0,
            yCompLen = this.areas.length,
            ySum = [],
            xRes = [],
            yRes = [];
        //initialize array
        for (j = 0; j < yCompLen; ++j) {
            ySum[j] = 0;
        }
        for (i = 0; i < len; ++i) {
            xSum += xValues[i];
            for (j = 0; j < yCompLen; ++j) {
                ySum[j] += yValues[i][j];
            }
            if (i % ratio == 0) {
                //push averages
                xRes.push(xSum/ratio);
                for (j = 0; j < yCompLen; ++j) {
                    ySum[j] /= ratio;
                }
                yRes.push(ySum);
                //reset sum accumulators
                xSum = 0;
                for (j = 0, ySum = []; j < yCompLen; ++j) {
                    ySum[j] = 0;
                }
            }
        }
        return {
            x: xRes,
            y: yRes
        };
    },

    // @private Get chart and data boundaries
    getBounds: function() {
        var me = this,
            chart = me.chart,
            store = chart.substore || chart.store,
            chartBBox = chart.chartBBox,
            gutterX = chart.maxGutter[0],
            gutterY = chart.maxGutter[1],
            areas = [].concat(me.yField),
            areasLen = areas.length,
            xValues = [],
            yValues = [],
            bbox, axis, minX, maxX, minY, maxY, ends, xScale, yScale, xValue, yValue,
            areaIndex, acumY, ln, sumValues;
            
        //get box dimensions
        bbox = me.bbox = {};
        bbox.x = chartBBox.x + gutterX;
        bbox.y = chartBBox.y + gutterY;
        bbox.width = chartBBox.width - (gutterX * 2);
        bbox.height = chartBBox.height - (gutterY * 2);

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
            } else
            if (areas.length) {
                ends = new Ext.chart.axis.Axis({
                    chart: chart,
                    fields: [areas]
                }).calcEnds();
                minY = ends.from;
                maxY = ends.to;
            }
        }
        if (isNaN(minX)) {
            minX = 0;
            xScale = bbox.width / (store.getCount() - 1);
        }
        else {
            xScale = bbox.width / (maxX - minX);
        }

        if (isNaN(minY)) {
            minY = 0;
            yScale = bbox.height / (store.getCount() - 1);
        } 
        else {
            yScale = bbox.height / (maxY - minY);
        }

        store.each(function(record, i) {
            if (i == 0) {
                maxX = 0;
                maxY = 0;
            }
            xValue = record.get(me.xField);
            yValue = [];
            if (typeof xValue != 'number') {
                xValue = i;
            }
            xValues.push(xValue);
            acumY = 0;
            for (areaIndex = 0; areaIndex < areasLen; areaIndex++) {
                var areaElem = record.get(areas[areaIndex]);
                acumY += areaElem;
                if (typeof areaElem == 'number') {
                    yValue.push(areaElem);
                } else {
                    yValue.push(i);
                }
            }
            maxX = Math.max(maxX, xValue);
            maxY = Math.max(maxY, acumY);
            yValues.push(yValue);
        }, me);
        
        xScale = bbox.width / (maxX - minX);
        yScale = bbox.height / (maxY - minY);

        ln = xValues.length;
        if ((ln > bbox.width || ln > bbox.height) && me.areas) {
            sumValues = me.shrink(xValues, yValues, Math.min(bbox.width, bbox.height));
            xValues = sumValues.x;
            yValues = sumValues.y;
        }
        return {
            bbox: bbox,
            minX: minX,
            minY: minY,
            xValues: xValues,
            yValues: yValues,
            xScale: xScale,
            yScale: yScale,
            areasLen: areasLen
        };
    },

    // @private Build an array of paths for the chart
    getPaths: function() {
        var me = this,
            chart = me.chart,
            store = chart.substore || chart.store,
            first = true,
            bounds = me.getBounds(),
            bbox = bounds.bbox,
            items = me.items = [],
            componentPaths = [],
            componentPath,
            paths = [],
            i, ln, x, y, xValue, yValue, acumY, areaIndex, prevAreaIndex, areaElem, path;

        ln = bounds.xValues.length;
        // Start the path
        for (i = 0; i < ln; i++) {
            xValue = bounds.xValues[i];
            yValue = bounds.yValues[i];
            x = bbox.x + (xValue - bounds.minX) * bounds.xScale;
            acumY = 0;
            for (areaIndex = 0; areaIndex < bounds.areasLen; areaIndex++) {
                // Excluded series
                if (me.__excludes[areaIndex]) {
                    continue;
                }
                if (!componentPaths[areaIndex]) {
                    componentPaths[areaIndex] = [];
                }
                areaElem = yValue[areaIndex];
                acumY += areaElem;
                y = bbox.y + bbox.height - (acumY - bounds.minY) * bounds.yScale;
                if (!paths[areaIndex]) {
                    paths[areaIndex] = ['M', x, y];
                    componentPaths[areaIndex].push(['L', x, y]);
                } else {
                    paths[areaIndex].push('L', x, y);
                    componentPaths[areaIndex].push(['L', x, y]);
                }
                if (!items[areaIndex]) {
                    items[areaIndex] = {
                        pointsUp: [],
                        pointsDown: [],
                        series: me
                    };
                }
                items[areaIndex].pointsUp.push([x, y]);
            }
        }
        
        // Close the paths
        for (areaIndex = 0; areaIndex < bounds.areasLen; areaIndex++) {
            // Excluded series
            if (me.__excludes[areaIndex]) {
                continue;
            }
            path = paths[areaIndex];
            // Close bottom path to the axis
            if (areaIndex == 0 || first) {
                first = false;
                path.push('L', x, bbox.y + bbox.height,
                          'L', bbox.x, bbox.y + bbox.height,
                          'Z');
            }
            // Close other paths to the one before them
            else {
                componentPath = componentPaths[prevAreaIndex];
                componentPath.reverse();
                path.push('L', x, componentPath[0][2]);
                for (i = 0; i < ln; i++) {
                    path.push(componentPath[i][0],
                              componentPath[i][1],
                              componentPath[i][2]);
                    items[areaIndex].pointsDown[ln -i -1] = [componentPath[i][1], componentPath[i][2]];
                }
                path.push('L', bbox.x, path[2], 'Z');
            }
            prevAreaIndex = areaIndex;
        }
        return {
            paths: paths,
            areasLen: bounds.areasLen
        };
    },

    /**
     * Draws the series for the current chart.
     */
    drawSeries: function() {
        var me = this,
            chart = me.chart,
            store = chart.substore || chart.store,
            surface = chart.surface,
            animate = chart.animate,
            group = me.group,
            endLineStyle = Ext.apply(me.seriesStyle, me.style),
            colorArrayStyle = me.colorArrayStyle,
            colorArrayLength = colorArrayStyle && colorArrayStyle.length || 0,
            areaIndex, areaElem, paths, path, rendererAttributes;

        me.unHighlightItem();
        me.cleanHighlights();

        if (!store || !store.getCount()) {
            return;
        }
        
        paths = me.getPaths();

        if (!me.areas) {
            me.areas = [];
        }

        for (areaIndex = 0; areaIndex < paths.areasLen; areaIndex++) {
            // Excluded series
            if (me.__excludes[areaIndex]) {
                continue;
            }
            if (!me.areas[areaIndex]) {
                me.items[areaIndex].sprite = me.areas[areaIndex] = surface.add(Ext.apply({}, {
                    type: 'path',
                    group: group,
                    path: paths.paths[areaIndex],
                    stroke: endLineStyle.stroke || colorArrayStyle[areaIndex % colorArrayLength],
                    fill: colorArrayStyle[areaIndex % colorArrayLength]
                }, endLineStyle || {}));
            }
            areaElem = me.areas[areaIndex];
            path = paths.paths[areaIndex];
            if (animate) {
                //Add renderer to line. There is not a unique record associated with this.
                rendererAttributes = me.renderer(areaElem, false, { 
                    path: path,
                    fill: colorArrayStyle[areaIndex % colorArrayLength],
                    stroke: endLineStyle.stroke || colorArrayStyle[areaIndex % colorArrayLength]
                }, areaIndex, store);
                //fill should not be used here but when drawing the special fill path object
                me.animation = me.onAnimate(areaElem, {
                    to: rendererAttributes
                });
            } else {
                rendererAttributes = me.renderer(areaElem, false, { 
                    path: path, 
                    hidden: false,
                    fill: colorArrayStyle[areaIndex % colorArrayLength],
                    stroke: endLineStyle.stroke || colorArrayStyle[areaIndex % colorArrayLength]
                }, areaIndex, store);
                me.areas[areaIndex].setAttributes(rendererAttributes, true);
            }
        }
        me.renderLabels();
        me.renderCallouts();
    },

    // @private
    onAnimate: function(sprite, attr) {
        sprite.show();
        return this.callParent(arguments);
    },

    // @private
    onCreateLabel: function(storeItem, item, i, display) {
        var me = this,
            group = me.labelsGroup,
            config = me.label,
            bbox = me.bbox,
            endLabelStyle = Ext.apply(config, me.seriesLabelStyle);

        return me.chart.surface.add(Ext.apply({
            'type': 'text',
            'text-anchor': 'middle',
            'group': group,
            'x': item.point[0],
            'y': bbox.y + bbox.height / 2
        }, endLabelStyle || {}));
    },

    // @private
    onPlaceLabel: function(label, storeItem, item, i, display, animate, index) {
        var me = this,
            chart = me.chart,
            resizing = chart.resizing,
            config = me.label,
            format = config.renderer,
            field = config.field,
            bbox = me.bbox,
            x = item.point[0],
            y = item.point[1],
            bb, width, height;
        
        label.setAttributes({
            text: format(storeItem.get(field[index])),
            hidden: true
        }, true);
        
        bb = label.getBBox();
        width = bb.width / 2;
        height = bb.height / 2;
        
        x = x - width < bbox.x? bbox.x + width : x;
        x = (x + width > bbox.x + bbox.width) ? (x - (x + width - bbox.x - bbox.width)) : x;
        y = y - height < bbox.y? bbox.y + height : y;
        y = (y + height > bbox.y + bbox.height) ? (y - (y + height - bbox.y - bbox.height)) : y;

        if (me.chart.animate && !me.chart.resizing) {
            label.show(true);
            me.onAnimate(label, {
                to: {
                    x: x,
                    y: y
                }
            });
        } else {
            label.setAttributes({
                x: x,
                y: y
            }, true);
            if (resizing) {
                me.animation.on('afteranimate', function() {
                    label.show(true);
                });
            } else {
                label.show(true);
            }
        }
    },

    // @private
    onPlaceCallout : function(callout, storeItem, item, i, display, animate, index) {
        var me = this,
            chart = me.chart,
            surface = chart.surface,
            resizing = chart.resizing,
            config = me.callouts,
            items = me.items,
            prev = (i == 0) ? false : items[i -1].point,
            next = (i == items.length -1) ? false : items[i +1].point,
            cur = item.point,
            dir, norm, normal, a, aprev, anext,
            bbox = callout.label.getBBox(),
            offsetFromViz = 30,
            offsetToSide = 10,
            offsetBox = 3,
            boxx, boxy, boxw, boxh,
            p, clipRect = me.clipRect,
            x, y;

        //get the right two points
        if (!prev) {
            prev = cur;
        }
        if (!next) {
            next = cur;
        }
        a = (next[1] - prev[1]) / (next[0] - prev[0]);
        aprev = (cur[1] - prev[1]) / (cur[0] - prev[0]);
        anext = (next[1] - cur[1]) / (next[0] - cur[0]);
        
        norm = Math.sqrt(1 + a * a);
        dir = [1 / norm, a / norm];
        normal = [-dir[1], dir[0]];
        
        //keep the label always on the outer part of the "elbow"
        if (aprev > 0 && anext < 0 && normal[1] < 0 || aprev < 0 && anext > 0 && normal[1] > 0) {
            normal[0] *= -1;
            normal[1] *= -1;
        } else if (Math.abs(aprev) < Math.abs(anext) && normal[0] < 0 || Math.abs(aprev) > Math.abs(anext) && normal[0] > 0) {
            normal[0] *= -1;
            normal[1] *= -1;
        }

        //position
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
        for (p in callout) {
            callout[p].show(true);
        }
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
        //if there are no items to query just return null.
        if (!this.items) {
            return null;
        }
        var me = this,
            items = me.items,
            dist = Infinity,
            tolerance = 20,
            p, pln, pointsUp, pointsDown, point,
            abs = Math.abs,
            bbox = me.bbox,
            item, i, ln;

        if (x < bbox.x || x > bbox.x + bbox.width
                || y < bbox.y || y > bbox.y + bbox.height) {
            return null;
        }
        if (items && items.length) {
            //Find closest point
            for (i = 0, ln = items.length; i < ln; i++) {
                item = items[i];
                if (item) {
                    pointsUp = item.pointsUp;
                    pointsDown = item.pointsDown;
                    dist = Infinity;
                    for (p = 0, pln = pointsUp.length; p < pln; p++) {
                        point = [pointsUp[p][0], pointsUp[p][1]];
                        if (dist > abs(x - point[0])) {
                            dist = abs(x - point[0]);
                        } else {
                            point = pointsUp[p -1];
                            if (y >= point[1] && (!pointsDown.length || y <= (pointsDown[p -1][1]))) {
                                item.storeIndex = p -1;
                                item.storeField = me.yField[i];
                                item.storeItem = me.chart.store.getAt(p -1);
                                item._points = pointsDown.length? [point, pointsDown[p -1]] : [point];
                                return item;
                            } else {
                                break;
                            }
                        }
                    }
                }
            }
        }
        
        return null;
    },

    /**
     * Highlight this entire series.
     * @param {Object} item Info about the item; same format as returned by #getItemForPoint.
     */
    highlightSeries: function() {
        var area, to, fillColor;
        if (this._index !== undefined) {
            area = this.areas[this._index];
            if (area.__highlightAnim) {
                area.__highlightAnim.paused = true;
            }
            area.__highlighted = true;
            area.__prevOpacity = area.__prevOpacity || area.attr.opacity || 1;
            area.__prevFill = area.__prevFill || area.attr.fill;
            area.__prevLineWidth = area.__prevLineWidth || area.attr.lineWidth;
            fillColor = Ext.draw.Color.fromString(area.__prevFill);
            to = {
                lineWidth: (area.__prevLineWidth || 0) + 2
            };
            if (fillColor) {
                to.fill = fillColor.getLighter(0.2).toString();
            }
            else {
                to.opacity = Math.max(area.__prevOpacity - 0.3, 0);
            }
            if (this.chart.animate) {
                area.__highlightAnim = new Ext.fx.Anim(Ext.apply({
                    target: area,
                    to: to
                }, this.chart.animate));
            }
            else {
                area.setAttributes(to, true);
            }
        }
    },

    /**
     * UnHighlight this entire series.
     * @param {Object} item Info about the item; same format as returned by #getItemForPoint.
     */
    unHighlightSeries: function() {
        var area;
        if (this._index !== undefined) {
            area = this.areas[this._index];
            if (area.__highlightAnim) {
                area.__highlightAnim.paused = true;
            }
            if (area.__highlighted) {
                area.__highlighted = false;
                area.__highlightAnim = new Ext.fx.Anim({
                    target: area,
                    to: {
                        fill: area.__prevFill,
                        opacity: area.__prevOpacity,
                        lineWidth: area.__prevLineWidth
                    }
                });
            }
        }
    },

    /**
     * Highlight the specified item. If no item is provided the whole series will be highlighted.
     * @param item {Object} Info about the item; same format as returned by #getItemForPoint
     */
    highlightItem: function(item) {
        var me = this,
            points, path;
        if (!item) {
            this.highlightSeries();
            return;
        }
        points = item._points;
        path = points.length == 2? ['M', points[0][0], points[0][1], 'L', points[1][0], points[1][1]]
                : ['M', points[0][0], points[0][1], 'L', points[0][0], me.bbox.y + me.bbox.height];
        me.highlightSprite.setAttributes({
            path: path,
            hidden: false
        }, true);
    },

    /**
     * un-highlights the specified item. If no item is provided it will un-highlight the entire series.
     * @param item {Object} Info about the item; same format as returned by #getItemForPoint
     */
    unHighlightItem: function(item) {
        if (!item) {
            this.unHighlightSeries();
        }

        if (this.highlightSprite) {
            this.highlightSprite.hide(true);
        }
    },

    // @private
    hideAll: function() {
        if (!isNaN(this._index)) {
            this.__excludes[this._index] = true;
            this.areas[this._index].hide(true);
            this.drawSeries();
        }
    },

    // @private
    showAll: function() {
        if (!isNaN(this._index)) {
            this.__excludes[this._index] = false;
            this.areas[this._index].show(true);
            this.drawSeries();
        }
    },
    
    /**
     * Returns the color of the series (to be displayed as color for the series legend item).
     * @param item {Object} Info about the item; same format as returned by #getItemForPoint
     */
    getLegendColor: function(index) {
        var me = this;
        return me.colorArrayStyle[index % me.colorArrayStyle.length];
    }
});
