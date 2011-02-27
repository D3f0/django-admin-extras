/**
 * @class Ext.chart.axis.Axis
 * @extends Ext.chart.axis.Abstract
 * 
 * Defines axis for charts. The axis position, type, style can be configured.
 * The axes are defined in an axes array of configuration objects where the type, 
 * field, grid and other configuration options can be set. To know more about how 
 * to create a Chart please check the Chart class documentation. Here's an example for the axes part:
 * An example of axis for a series (in this case for an area chart that has multiple layers of yFields) could be:
 * 
  <pre><code>
    axes: [{
        type: 'Numeric',
        grid: true,
        position: 'left',
        fields: ['data1', 'data2', 'data3'],
        title: 'Number of Hits',
        grid: {
            odd: {
                opacity: 1,
                fill: '#ddd',
                stroke: '#bbb',
                'stroke-width': 1
            }
        },
        minimum: 0,
        adjustMinimumByMajorUnit: 0
    }, {
        type: 'Category',
        position: 'bottom',
        fields: ['name'],
        title: 'Month of the Year',
        grid: true,
        label: {
            rotate: {
                degrees: 315
            }
        }
    }]
   </code></pre>
 * 
 * In this case we use a `Numeric` axis for displaying the values of the Area series and a `Category` axis for displaying the names of
 * the store elements. The numeric axis is placed on the left of the screen, while the category axis is placed at the bottom of the chart. 
 * Both the category and numeric axes have `grid` set, which means that horizontal and vertical lines will cover the chart background. In the 
 * category axis the labels will be rotated so they can fit the space better.
 * 
 */
Ext.define('Ext.chart.axis.Axis', {

    /* Begin Definitions */

    extend: 'Ext.chart.axis.Abstract',

    requires: ['Ext.draw.Draw'],

    /* End Definitions */

    /**
     * @cfg {Number} dashSize 
     * The size of the dash marker. Default's 3.
     */
    dashSize: 3,
    
    /**
     * @cfg {String} position
     * Where to set the axis. Available options are `left`, `bottom`, `right`, `top`. Default's `bottom`.
     */
    position: 'bottom',
    
    // @private
    skipFirst: false,
    
    /**
     * @cfg {Number} length
     * Offset axis position. Default's 0.
     */
    length: 0,
    
    /**
     * @cfg {Number} width
     * Offset axis width. Default's 0.
     */
    width: 0,

    // @private
    applyData: Ext.emptyFn,

    // @private creates a structure with start, end and step points.
    calcEnds: function() {
        var me = this,
            store = me.chart.store,
            series = me.chart.series.items,
            fields = me.fields,
            ln = fields.length,
            i, l,
            value,
            out,
            min = isNaN(me.minimum) ? Infinity : me.minimum,
            max = isNaN(me.maximum) ? -Infinity : me.maximum,
            prevMin = me.prevMin,
            prevMax = me.prevMax,
            aggregate = false,
            total = 0,
            excludes = [];
        
        //if one series is stacked I have to aggregate the values
        //for the scale.
        for (i = 0, l = series.length; !aggregate && i < l; i++) {
            aggregate = aggregate || series[i].stacked;
            excludes = series[i].__excludes || excludes;
        }
        store.each(function(record) {
            if (aggregate) {
                if (!isFinite(min)) {
                    min = 0;
                }
                for (value = 0, i = 0; i < ln; i++) {
                   if (excludes[i]) {
                       continue;
                   }
                   value += record.get(fields[i]);
                }               
                max = Math.max(max, value);
                min = Math.min(min, value);
            } else {
                for (i = 0; i < ln; i++) {
                    if (excludes[i]) {
                        continue;
                    }
                    value = record.get(fields[i]);
                    max = Math.max(max, value);
                    min = Math.min(min, value);
                }
            }
        });
        if (!isFinite(max)) {
            max = me.prevMax || 0;
        }
        if (!isFinite(min)) {
            min = me.prevMin || 0;
        }
        out = Ext.draw.Draw.snapEnds(min, max >> 0, me.steps);
        if (!isNaN(me.maximum)) {
            out.to = Math.max(out.to, me.maximum);
        }
        if (!isNaN(me.minimum)) {
            out.from = Math.min(out.from, me.minimum);
        }
        if (me.adjustMaximumByMajorUnit) {
            out.to += out.step;
        }
        if (me.adjustMinimumByMajorUnit) {
            out.from -= out.step;
        }
        me.prevMin = min;
        me.prevMax = max;
        return out;
    },

    /**
     * Renders the axis into the screen and updates it's position.
     */
    drawAxis: function (init) {
        var me = this,
            x = me.x,
            y = me.y,
            gutterX = me.chart.maxGutter[0],
            gutterY = me.chart.maxGutter[1],
            dashSize = me.dashSize,
            length = me.length,
            position = me.position,
            inflections = [],
            calcLabels = false,
            stepCalcs = me.applyData(),
            step = stepCalcs.step,
            steps = stepCalcs.steps,
            from = stepCalcs.from,
            to = stepCalcs.to,
            trueLength,
            currentX,
            currentY,
            path,
            prev,
            delta;
        
        //If no steps are specified
        //then don't draw the axis. This generally happens
        //when an empty store.
        if (isNaN(step) || (from == to)) {
            return;
        }
        
        me.from = stepCalcs.from;
        me.to = stepCalcs.to;
        if (position == 'left' || position == 'right') {
            currentX = Math.floor(x) + 0.5;
            path = ["M", currentX, y, "l", 0, -length];
            trueLength = length - (gutterY * 2);
        }
        else {
            currentY = Math.floor(y) + 0.5;
            path = ["M", x, currentY, "l", length, 0];
            trueLength = length - (gutterX * 2);
        }
        
        delta = trueLength / (steps || 1);
        if (me.type == 'Numeric') {
            calcLabels = true;
            me.labels = [stepCalcs.from];
        }
        if (position == 'right' || position == 'left') {
            currentY = y - gutterY;
            currentX = x - ((position == 'left') * dashSize * 2);
            while (currentY >= y - gutterY - trueLength) {
                path = path.concat(["M", currentX, Math.floor(currentY) + 0.5, "l", dashSize * 2 + 1, 0]);
                inflections.push([ Math.floor(x), Math.floor(currentY) ]);
                currentY -= delta;
                if (calcLabels) {
                    me.labels.push(me.labels[me.labels.length -1] + step);
                }
            }
            if (Math.round(currentY + delta - (y - gutterY - trueLength))) {
                path = path.concat(["M", currentX, Math.floor(y - length + gutterY) + 0.5, "l", dashSize * 2 + 1, 0]);
                inflections.push([ Math.floor(x), Math.floor(currentY) ]);
                if (calcLabels) {
                    me.labels.push(me.labels[me.labels.length -1] + step);
                }
            }
        } else {
            currentX = x + gutterX;
            currentY = y - (!!(position == 'top') * dashSize * 2);
            while (currentX <= x + gutterX + trueLength) {
                path = path.concat(["M", Math.floor(currentX) + 0.5, currentY, "l", 0, dashSize * 2 + 1]);
                inflections.push([ Math.floor(currentX), Math.floor(y) ]);
                currentX += delta;
                if (calcLabels) {
                    me.labels.push(me.labels[me.labels.length -1] + step);
                }
            }
            if (Math.round(currentX - delta - (x + gutterX + trueLength))) {
                path = path.concat(["M", Math.floor(x + length - gutterX) + 0.5, currentY, "l", 0, dashSize * 2 + 1]);
                inflections.push([ Math.floor(currentX), Math.floor(y) ]);
                if (calcLabels) {
                    me.labels.push(me.labels[me.labels.length -1] + step);
                }
            }
        }
        if (!me.axis) {
            me.axis = me.chart.surface.add(Ext.apply({
                type: 'path',
                path: path
            }, me.axisStyle));
        }
        me.axis.setAttributes({
            path: path
        }, true);
        me.inflections = inflections;
        if (!init && me.grid) {
            me.drawGrid();
        }
        me.axisBBox = me.axis.getBBox();
        me.drawLabels();
    },

    /**
     * Renders an horizontal and/or vertical grid into the Surface.
     */
    drawGrid: function() {
        var me = this,
            surface = me.chart.surface, 
            grid = me.grid,
            odd = grid.odd,
            even = grid.even,
            inflections = me.inflections,
            ln = inflections.length - ((odd || even)? 0 : 1),
            position = me.position,
            gutter = me.chart.maxGutter,
            width = me.width - 2,
            vert = false,
            point, prevPoint,
            i = 1,
            path = [], styles, lineWidth, dlineWidth,
            oddPath = [], evenPath = [];
        
        if ((gutter[1] !== 0 && (position == 'left' || position == 'right')) ||
            (gutter[0] !== 0 && (position == 'top' || position == 'bottom'))) {
            i = 0;
            ln++;
        }
        for (; i < ln; i++) {
            point = inflections[i];
            prevPoint = inflections[i - 1];
            if (odd || even) {
                path = (i % 2)? oddPath : evenPath;
                styles = ((i % 2)? odd : even) || {};
                lineWidth = (styles.lineWidth || styles['stroke-width'] || 0) / 2;
                dlineWidth = 2 * lineWidth;
                if (position == 'left') {
                    path.push("M", prevPoint[0] + 1 + lineWidth, prevPoint[1] + 0.5 - lineWidth, 
                              "L", prevPoint[0] + 1 + width - lineWidth, prevPoint[1] + 0.5 - lineWidth,
                              "L", point[0] + 1 + width - lineWidth, point[1] + 0.5 + lineWidth,
                              "L", point[0] + 1 + lineWidth, point[1] + 0.5 + lineWidth, "Z");
                }
                else if (position == 'right') {
                    path.push("M", prevPoint[0] - lineWidth, prevPoint[1] + 0.5 - lineWidth, 
                              "L", prevPoint[0] - width + lineWidth, prevPoint[1] + 0.5 - lineWidth,
                              "L", point[0] - width + lineWidth, point[1] + 0.5 + lineWidth,
                              "L", point[0] - lineWidth, point[1] + 0.5 + lineWidth, "Z");
                }
                else if (position == 'top') {
                    path.push("M", prevPoint[0] + 0.5 + lineWidth, prevPoint[1] + 1 + lineWidth, 
                              "L", prevPoint[0] + 0.5 + lineWidth, prevPoint[1] + 1 + width - lineWidth,
                              "L", point[0] + 0.5 - lineWidth, point[1] + 1 + width - lineWidth,
                              "L", point[0] + 0.5 - lineWidth, point[1] + 1 + lineWidth, "Z");
                }
                else {
                    path.push("M", prevPoint[0] + 0.5 + lineWidth, prevPoint[1] - lineWidth, 
                            "L", prevPoint[0] + 0.5 + lineWidth, prevPoint[1] - width + lineWidth,
                            "L", point[0] + 0.5 - lineWidth, point[1] - width + lineWidth,
                            "L", point[0] + 0.5 - lineWidth, point[1] - lineWidth, "Z");
                }
            } else {
                if (position == 'left') {
                    path = path.concat(["M", point[0] + 0.5, point[1] + 0.5, "l", width, 0]);
                }
                else if (position == 'right') {
                    path = path.concat(["M", point[0] - 0.5, point[1] + 0.5, "l", -width, 0]);
                }
                else if (position == 'top') {
                    path = path.concat(["M", point[0] + 0.5, point[1] + 0.5, "l", 0, width]);
                }
                else {
                    path = path.concat(["M", point[0] + 0.5, point[1] - 0.5, "l", 0, -width]);
                }
            }
        }
        if (odd || even) {
            if (oddPath.length) {
                if (!me.gridOdd && oddPath.length) {
                    me.gridOdd = surface.add({
                        type: 'path',
                        path: oddPath
                    });
                }
                me.gridOdd.setAttributes(Ext.apply({
                    path: oddPath,
                    hidden: false
                }, odd || {}), true);
            }
            if (evenPath.length) {
                if (!me.gridEven) {
                    me.gridEven = surface.add({
                        type: 'path',
                        path: evenPath
                    });
                } 
                me.gridEven.setAttributes(Ext.apply({
                    path: evenPath,
                    hidden: false
                }, even || {}), true);
            }
        }
        else {
            if (path.length) {
                if (!me.gridLines) {
                    me.gridLines = me.chart.surface.add({
                        type: 'path',
                        path: path,
                        "stroke-width": me.lineWidth || 1,
                        stroke: me.gridColor || '#ccc'
                    });
                }
                me.gridLines.setAttributes({
                    hidden: false,
                    path: path
                }, true);
            }
            else if (me.gridLines) {
                me.gridLines.hide(true);
            }
        }
    },

    /**
     * Renders the labels in the axes.
     */
    drawLabels: function() {
        var me = this,
            inflections = me.inflections,
            ln = inflections.length,
            chart = me.chart,
            position = me.position,
            labels = me.labels,
            surface = chart.surface,
            labelGroup = me.labelGroup,
            maxWidth = 0,
            maxHeight = 0,
            gutterY = me.chart.maxGutter[1],
            bbox,
            point,
            prevX,
            prevY,
            prevLabel,
            textLabel,
            labelAttr,
            textRight,
            text,
            label,
            last,
            x,
            y,
            i;

        if (position == 'left' || position == 'right') {
            last = ln;
            for (i = 0; i < last; i++) {
                point = inflections[i];
                text = me.label.renderer(labels[i]);
                // Re-use existing textLabel or create a new one
                textLabel = labelGroup.getAt(i);
                if (textLabel) {
                    if (text != textLabel.attr.text) {
                        textLabel.setAttributes(Ext.apply({
                            text: text
                        }, me.label), true);
                        textLabel._bbox = textLabel.getBBox();
                    }
                }
                else {
                    textLabel = surface.add(Ext.apply({
                        group: labelGroup,
                        type: 'text',
                        x: 0,
                        y: 0,
                        text: text
                    }, me.label));
                    surface.renderItem(textLabel);
                    textLabel._bbox = textLabel.getBBox();
                }
                labelAttr = textLabel.attr;
                bbox = textLabel._bbox;
                maxWidth = Math.max(maxWidth, bbox.width + me.dashSize + me.label.padding);

                y = point[1];
                if (gutterY < bbox.height / 2) {
                    if (i == last - 1 && chart.axes.findIndex('position', 'top') == -1) {
                        y = me.y - me.length + Math.ceil(bbox.height / 2);
                    }
                    else if (i == 0 && chart.axes.findIndex('position', 'bottom') == -1) {
                        y = me.y - Math.floor(bbox.height / 2);
                    }
                }

                if (position == 'left') {
                    x = point[0] - bbox.width - me.dashSize - me.label.padding - 2;
                }
                else {
                    x = point[0] + me.dashSize + me.label.padding + 2;
                }    
                if (x != labelAttr.x || y != labelAttr.y || labelAttr.hidden) {
                    textLabel.setAttributes(Ext.apply({
                        hidden: false,
                        x: x,
                        y: y
                    }, me.label), true);
                }
            }
        }
        else {
            last = ln - 1;
            for (i = last; i >= 0; i--) {
                point = inflections[i];
                text = me.label.renderer(labels[i]);
                // Re-use existing textLabel or create a new one
                textLabel = labelGroup.getAt(last - i);
                if (textLabel) {
                    if (text != textLabel.attr.text) {
                        textLabel.setAttributes({
                            text: text
                        }, true);
                        textLabel._bbox = textLabel.getBBox();
                    }
                }
                else {
                    textLabel = surface.add(Ext.apply({
                        group: labelGroup,
                        type: 'text',
                        x: 0,
                        y: 0,
                        text: text
                    }, me.label));
                    
                    surface.renderItem(textLabel);
                    textLabel._bbox = textLabel.getBBox();
                }
                labelAttr = textLabel.attr;
                bbox = textLabel._bbox;

                maxHeight = Math.max(maxHeight, bbox.height + me.dashSize + me.label.padding);
                x = Math.floor(point[0] - (bbox.width / 2) - bbox.x * Math.abs(Math.sin(((labelAttr.rotation && labelAttr.rotation.degrees || 0) * Math.PI / 180) || 0)));
                if (me.chart.maxGutter[0] == 0) {
                    if (i == 0 && chart.axes.findIndex('position', 'left') == -1) {
                        x = point[0];
                    }
                    else if (i == last && chart.axes.findIndex('position', 'right') == -1) {
                        x = point[0] - bbox.width;
                    }
                }
                textRight = x + bbox.width + me.label.padding;
                // Skip label if there isn't available minimum space
                if (i != 0 && (i != last) && textRight > prevX && !(labelAttr.rotation && labelAttr.rotation.degrees)) {
                    if (!me.elipsis(textLabel, text, prevX - x, 35, point[0])) {
                        textLabel.hide(true);
                        continue;
                    }
                }
                if (i == 0 && prevX < textRight) {
                    if (labelGroup.getCount() > 2) {
                        prevLabel = labelGroup.getAt((last - i) - 1);
                        me.elipsis(prevLabel, prevLabel.attr.text, labelGroup.getAt((last - i) - 2).getBBox().x - textRight, 35, inflections[i + 1][0]);
                    }
                }
                prevX = x;
                if (position == 'top') {
                    y = point[1] - (me.dashSize * 2) - me.label.padding - (bbox.height / 2);
                }
                else {
                    y = point[1] + (me.dashSize * 2) + me.label.padding + (bbox.height / 2);
                }
                textLabel.setAttributes({
                    hidden: false,
                    x: x,
                    y: y
                }, true);
            }
        }

        // Hide unused bars
        ln = labelGroup.getCount();
        i = inflections.length;
        for (; i < ln; i++) {
            labelGroup.getAt(i).hide(true);
        }

        me.bbox = {};
        Ext.apply(me.bbox, me.axisBBox);
        me.bbox.height = maxHeight;
        me.bbox.width = maxWidth;
        if (Ext.isString(me.title)) {
            me.drawTitle(maxWidth, maxHeight);
        }
    },

    // @private creates the elipsis for the text.
    elipsis: function(sprite, text, desiredWidth, minWidth, center) {
        var bbox,
            x;

        if (desiredWidth < minWidth) {
            sprite.hide(true);
            return false;
        }
        while (text.length > 4) {
            text = text.substr(0, text.length - 4) + "...";
            sprite.setAttributes({
                text: text
            }, true);
            bbox = sprite.getBBox();
            if (bbox.width < desiredWidth) {
                if (typeof center == 'number') {
                    sprite.setAttributes({
                        x: Math.floor(center - (bbox.width / 2))
                    }, true);
                }
                break;
            }
        }
        return true;
    },

    // @private draws the title for the axis.
    drawTitle: function(maxWidth, maxHeight) {
        var me = this,
            position = me.position,
            surface = me.chart.surface,
            rotate = (position == 'left' || position == 'right'),
            x = me.x,
            y = me.y,
            base,
            bbox,
            pad;

        if (!me.displaySprite) {
            base = {
                type: 'text',
                x: 0,
                y: 0,
                text: me.title
            };
            me.displaySprite = surface.add(Ext.apply(base, me.axisTitleStyle, me.labelTitle));
            surface.renderItem(me.displaySprite);
        }
        bbox = me.displaySprite.getBBox();
        pad = me.dashSize + me.label.padding;

        if (rotate) {
            y -= ((me.length / 2) - (bbox.height / 2));
            if (position == 'left') {
                x -= (maxWidth + pad + (bbox.width / 2));
            }
            else {
                x += (maxWidth + pad + bbox.width - (bbox.width / 2));
            }
            me.bbox.width += bbox.width + 10;
        }
        else {
            x += (me.length / 2) - (bbox.width * 0.5);
            if (position == 'top') {
                y -= (maxHeight + pad + (bbox.height * 0.3));
            }
            else {
                y += (maxHeight + pad + (bbox.height * 0.8));
            }
            me.bbox.height += bbox.height + 10;
        }
        me.displaySprite.setAttributes({
            translate: {
                x: x,
                y: y
            }
        }, true);
    }
});