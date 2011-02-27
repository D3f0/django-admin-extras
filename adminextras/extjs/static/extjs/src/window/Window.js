/**
 * @class Ext.window.Window
 * @extends Ext.panel.Panel
 * <p>A specialized panel intended for use as an application window.  Windows are floated, {@link #resizable}, and
 * {@link #draggable} by default.  Windows can be {@link #maximizable maximized} to fill the viewport,
 * restored to their prior size, and can be {@link #minimize}d.</p>
 * <p>Windows can also be linked to a {@link Ext.window.WindowGroup} or managed by the {@link Ext.window.WindowMgr} to provide
 * grouping, activation, to front, to back and other application-specific behavior.</p>
 * <p>By default, Windows will be rendered to document.body. To {@link #constrain} a Window to another element
 * specify {@link Ext.Component#renderTo renderTo}.</p>
 * @constructor
 * @param {Object} config The config object
 * @xtype window
 */
Ext.define('Ext.window.Window', {
    extend: 'Ext.panel.Panel',

    alternateClassName: 'Ext.Window',

    requires: ['Ext.util.ComponentDragger', 'Ext.util.Region', 'Ext.EventManager'],

    alias: 'widget.window',

    handleCls: Ext.baseCSSPrefix + 'window-handle',
    pinned: true,
    handles: 'all',
    /**
     * @cfg {Number} x
     * The X position of the left edge of the window on initial showing. Defaults to centering the Window within
     * the width of the Window's container {@link Ext.core.Element Element) (The Element that the Window is rendered to).
     */
    /**
     * @cfg {Number} y
     * The Y position of the top edge of the window on initial showing. Defaults to centering the Window within
     * the height of the Window's container {@link Ext.core.Element Element) (The Element that the Window is rendered to).
     */
    /**
     * @cfg {Boolean} modal
     * True to make the window modal and mask everything behind it when displayed, false to display it without
     * restricting access to other UI elements (defaults to false).
     */
    /**
     * @cfg {String/Element} animateTarget
     * Id or element from which the window should animate while opening (defaults to null with no animation).
     */
    /**
     * @cfg {String} resizeHandles
     * A valid {@link Ext.Resizable} handles config string (defaults to 'all').  Only applies when resizable = true.
     */
    /**
    * @cfg {String/Number/Component} defaultFocus
    * <p>Specifies a Component to receive focus when this Window is focused.</p>
    * <p>This may be one of:</p><div class="mdetail-params"><ul>
    * <li>The index of a footer Button.</li>
    * <li>The id or {@link Ext.AbstractComponent#itemId} of a descendant Component.</li>
    * <li>A Component.</li>
    * </ul></div>
    */
    /**
    * @cfg {Function} onEsc
    * Allows override of the built-in processing for the escape key. Default action
    * is to close the Window (performing whatever action is specified in {@link #closeAction}.
    * To prevent the Window closing when the escape key is pressed, specify this as
    * Ext.emptyFn (See {@link Ext#emptyFn}).
    */
    /**
     * @cfg {Boolean} collapsed
     * True to render the window collapsed, false to render it expanded (defaults to false). Note that if
     * {@link #expandOnShow} is true (the default) it will override the <code>collapsed</code> config and the window
     * will always be expanded when shown.
     */
    /**
     * @cfg {Boolean} maximized
     * True to initially display the window in a maximized state. (Defaults to false).
     */

    /**
    * @cfg {String} baseCls
    * The base CSS class to apply to this panel's element (defaults to 'x-window').
    */
    baseCls: Ext.baseCSSPrefix + 'window',

    /**
     * @cfg {Mixed} resizable
     * <p>Specify as <code>true</code> to allow user resizing at each edge and corner of the window, false to disable resizing (defaults to true).</p>
     * <p>This may also be specified as a config object to </p>
     */
    resizable: true,

    /**
     * @cfg {Boolean} draggable
     * <p>True to allow the window to be dragged by the header bar, false to disable dragging (defaults to true).  Note
     * that by default the window will be centered in the viewport, so if dragging is disabled the window may need
     * to be positioned programmatically after render (e.g., myWindow.setPosition(100, 100);).<p>
     */
    draggable: true,

    /**
     * @cfg {Boolean} constrain
     * True to constrain the window within its containing element, false to allow it to fall outside of its
     * containing element. By default the window will be rendered to document.body.  To render and constrain the
     * window within another element specify {@link #renderTo}.
     * (defaults to false).  Optionally the header only can be constrained using {@link #constrainHeader}.
     */
    constrain: false,

    /**
     * @cfg {Boolean} constrainHeader
     * True to constrain the window header within its containing element (allowing the window body to fall outside
     * of its containing element) or false to allow the header to fall outside its containing element (defaults to
     * false). Optionally the entire window can be constrained using {@link #constrain}.
     */
    constrainHeader: false,

    /**
     * @cfg {Boolean} plain
     * True to render the window body with a transparent background so that it will blend into the framing
     * elements, false to add a lighter background color to visually highlight the body element and separate it
     * more distinctly from the surrounding frame (defaults to false).
     */
    plain: false,

    /**
     * @cfg {Boolean} minimizable
     * True to display the 'minimize' tool button and allow the user to minimize the window, false to hide the button
     * and disallow minimizing the window (defaults to false).  Note that this button provides no implementation --
     * the behavior of minimizing a window is implementation-specific, so the minimize event must be handled and a
     * custom minimize behavior implemented for this option to be useful.
     */
    minimizable: false,

    /**
     * @cfg {Boolean} maximizable
     * True to display the 'maximize' tool button and allow the user to maximize the window, false to hide the button
     * and disallow maximizing the window (defaults to false).  Note that when a window is maximized, the tool button
     * will automatically change to a 'restore' button with the appropriate behavior already built-in that will
     * restore the window to its previous size.
     */
    maximizable: false,

    /**
     * @cfg {Number} minHeight
     * The minimum height in pixels allowed for this window (defaults to 100).  Only applies when {@link #resizable}
     * is set.
     */
    minHeight: 100,

    /**
     * @cfg {Number} minWidth
     * The minimum width in pixels allowed for this window (defaults to 200).  Only applies when {@link #resizable}
     * is set.
     */
    minWidth: 200,

    /**
     * @cfg {Boolean} expandOnShow
     * True to always expand the window when it is displayed, false to keep it in its current state (which may be
     * {@link #collapsed}) when displayed (defaults to true).
     */
    expandOnShow: true,

    // inherited docs, same default
    collapsible: false,

    /**
     * @cfg {Boolean} closable
     * <p>True to display the 'close' tool button and allow the user to close the window, false to
     * hide the button and disallow closing the window (defaults to <code>true</code>).</p>
     * <p>By default, when close is requested by either clicking the close button in the header
     * or pressing ESC when the Window has focus, the {@link #close} method will be called. This
     * will <i>{@link Ext.Component#destroy destroy}</i> the Window and its content meaning that
     * it may not be reused.</p>
     * <p>To make closing a Window <i>hide</i> the Window so that it may be reused, set
     * {@link #closeAction} to 'hide'.</p>
     */
    closable: true,

    /**
     * @cfg {Boolean} hidden
     * Render this Window hidden (default is <code>true</code>). If <code>true</code>, the
     * {@link #hide} method will be called internally.
     */
    hidden: true,

    // Inherit docs from Component. Windows render to the body on first show.
    autoRender: true,

    // Inherit docs from Component. Windows hide using visibility.
    hideMode: 'visibility',

    /** @cfg {Boolean} floating @hide Windows are always floating*/
    floating: true,

    ariaRole: 'alertdialog',

    overlapHeader: true,
    
    // private
    initComponent: function() {
        Ext.window.Window.superclass.initComponent.call(this);
        this.addEvents(
            /**
             * @event activate
             * Fires after the window has been visually activated via {@link #setActive}.
             * @param {Ext.Window} this
             */
            /**
             * @event deactivate
             * Fires after the window has been visually deactivated via {@link #setActive}.
             * @param {Ext.Window} this
             */
            /**
             * @event resize
             * Fires after the window has been resized.
             * @param {Ext.Window} this
             * @param {Number} width The window's new width
             * @param {Number} height The window's new height
             */
            'resize',
            /**
             * @event maximize
             * Fires after the window has been maximized.
             * @param {Ext.Window} this
             */
            'maximize',
            /**
             * @event minimize
             * Fires after the window has been minimized.
             * @param {Ext.Window} this
             */
            'minimize',
            /**
             * @event restore
             * Fires after the window has been restored to its original size after being maximized.
             * @param {Ext.Window} this
             */
            'restore'
        );

        // Initialize as visible.
        if (this.hidden === false) {
            this.hidden = true;
            this.show();
        }
        if (this.modal) {
            this.ariaRole = 'dialog';
        }
    },

    // State Management
    // private
    getState: function() {
        var state = Ext.window.Window.superclass.getState.call(this) || {};
        return Ext.apply(state, this.getBox(true));
    },

    // private
    onRender: function(ct, position) {
        Ext.applyIf(this.renderData, {
            plain: this.plain ? this.baseCls + '-plain' : undefined
        });

        Ext.window.Window.superclass.onRender.call(this, ct, position);

        this.focusEl = this.el;

        // Double clicking a header will toggleMaximize
        if (this.maximizable) {
            this.mon(this.header, 'domdblclick', this.toggleMaximize, this);
        }
    },

    // private
    afterRender: function() {
        // Component's afterRender sizes and positions the Component
        Ext.window.Window.superclass.afterRender.call(this);

        // Create the proxy after the size has been applied in Component.afterRender
        this.proxy = this.getProxy();

        // clickToRaise
        this.mon(this.el, 'mousedown', this.toFront, this);

        // Initialize maximized
        if (this.maximized) {
            this.maximized = false;
            this.maximize();
        }

        if (this.closable) {
            var km = this.getKeyMap();
            km.on(27, this.onEsc, this);
            km.disable();
        }
    },

    /**
     * @private
     * @override
     * Override Component.initDraggable.
     * Window uses the header element as the delegate.
     */
    initDraggable: function() {
        var me = this,
            ddConfig = Ext.applyIf({
                el: me.el,
                delegate: '#' + me.header.id
            }, me.draggable);

        // Add extra configs if Window is specified to be constrained
        if (me.constrain || me.constrainHeader) {
            ddConfig.constrain = me.constrain;
            ddConfig.constrainDelegate = me.constrainHeader;
            ddConfig.constrainTo = me.constrainTo || me.container;
        }

        /**
         * <p>If this Window is configured {@link #draggable}, this property will contain
         * an instance of {@link Ext.util.ComponentDragger} (A subclass of {@link Ext.dd.DragTracker DragTracker})
         * which handles dragging the Window's DOM Element, and constraining according to the {@link #constrain}
         * and {@link #constrainHeader} .</p>
         * <p>This has implementations of <code>onBeforeStart</code>, <code>onDrag</code> and <code>onEnd</code>
         * which perform the dragging action. If extra logic is needed at these points, use
         * {@link Ext.Function#createInterceptor createInterceptor} or {@link Ext.Function#createSequence createSequence} to
         * augment the existing implementations.</p>
         * @type Ext.util.ComponentDragger
         * @property dd
         */
        this.dd = new Ext.util.ComponentDragger(this, ddConfig);
    },

    // private
    onEsc: function(k, e) {
        e.stopEvent();
        this[this.closeAction]();
    },

    // private
    beforeDestroy: function() {
        if (this.rendered) {
            this.hide();
            Ext.destroy(
                this.focusEl
            );
        }
        Ext.window.Window.superclass.beforeDestroy.call(this);
    },

    /**
     * @private
     * @override
     * Contribute class-specific tools to the header.
     * Called by Panel's initTools.
     */
    addTools: function() {
        // Call Panel's initTools
        this.callParent();

        if (this.minimizable) {
            this.addTool({
                type: 'minimize',
                handler: Ext.Function.bind(this.minimize, this, [])
            });
        }
        if (this.maximizable) {
            this.addTool({
                type: 'maximize',
                handler: Ext.Function.bind(this.maximize, this, [])
            });
            this.addTool({
                type: 'restore',
                handler: Ext.Function.bind(this.restore, this, []),
                hidden: true
            });
        }
    },

    /**
     * Gets the configured default focus item.  If a defaultComponent is set, it will receive focus, otherwise the
     * Container itself will receive focus.
     */
    getFocusEl: function() {
        var f = this.focusEl,
            defaultComp = this.defaultButton || this.defaultFocus,
            t = typeof db,
            el,
            ct;

        if (Ext.isDefined(defaultComp)) {
            if (Ext.isNumber(defaultComp)) {
                f = this.query('button')[0];
            } else if (Ext.isString(defaultComp)) {
                f = this.down('#' + defaultComp);
            } else {
                f = defaultComp;
            }
        }
        return f || this.focusEl;
    },

    // private
    beforeShow: function() {
        this.callParent();

        if (this.expandOnShow) {
            this.expand(false);
        }
    },

    // private
    afterShow: function(isAnim) {
        if (this.isDestroyed) {
            return false;
        }
        this.proxy.hide();

        if (this.maximized) {
            this.fitContainer();
        }

        if (this.monitorResize || this.constrain || this.constrainHeader) {
            Ext.EventManager.onWindowResize(this.onWindowResize, this);
        }
        this.doConstrain();
        if (this.keyMap) {
            this.keyMap.enable();
        }

        // BrowserBug. Explain the browser bug in the comment.
        if (isAnim && (Ext.isIE || Ext.isWebKit)) {
            var sz = this.getSize();
            this.onResize(sz.width, sz.height);
        }

        // Call superclass's afterShow
        this.callParent();
    },

    // private
    doClose: function() {
        // immediate close
        if (this.hidden) {
            this.fireEvent('close', this);
            this[this.closeAction]();
        }
        // close after hiding
        else {
            this.hide(this.animTarget, this.doClose, this);
        }
    },

    /**
     * Hides the window, setting it to invisible and applying negative offsets.
     * @param {String/Element} animateTarget (optional) The target element or id to which the window should
     * animate while hiding (defaults to null with no animation)
     * @param {Function} callback (optional) A callback function to call after the window is hidden
     * @param {Object} scope (optional) The scope (<code>this</code> reference) in which the callback is executed. Defaults to this Window.
     * @return {Ext.Window} this
     */
    hide: function(animateTarget, cb, scope) {
        if (this.hidden || this.fireEvent('beforehide', this) === false) {
            return this;
        }
        if (cb) {
            this.on('hide', cb, scope, {
                single: true
            });
        }
        this.hidden = true;
        if (this.animateTarget) {
            this.animHide();
        } else {
            this.el.hide();
            this.afterHide();
        }
        return this;
    },

    // private
    afterHide: function() {
        this.proxy.hide();

        // No longer subscribe to resizing now that we're hidden
        if (this.monitorResize || this.constrain || this.constrainHeader) {
            Ext.EventManager.removeResizeListener(this.onWindowResize, this);
        }

        // Turn off keyboard handling once window is hidden
        if (this.keyMap) {
            this.keyMap.disable();
        }

        this.onHide();
        this.fireEvent('hide', this);
    },

    // private
    onWindowResize: function() {
        if (this.maximized) {
            this.fitContainer();
        }
        this.doConstrain();
    },

    /**
     * Placeholder method for minimizing the window.  By default, this method simply fires the {@link #minimize} event
     * since the behavior of minimizing a window is application-specific.  To implement custom minimize behavior,
     * either the minimize event can be handled or this method can be overridden.
     * @return {Ext.Window} this
     */
    minimize: function() {
        this.fireEvent('minimize', this);
        return this;
    },

    afterCollapse: function() {
        if (this.maximizable) {
            this.tools.maximize.hide();
            this.tools.restore.hide();
        }
        if (this.resizer) {
            this.resizer.disable();
        }
        this.callParent([arguments]);
    },

    afterExpand: function() {
        var me = this;

        if (me.maximized) {
            me.tools.restore.show();
        } else if (me.maximizable) {
            me.tools.maximize.show();
        }
        if (me.resizer) {
            me.resizer.enable();
        }
        me.callParent([arguments]);
    },

    /**
     * Fits the window within its current container and automatically replaces
     * the {@link #maximizable 'maximize' tool button} with the 'restore' tool button.
     * Also see {@link #toggleMaximize}.
     * @return {Ext.Window} this
     */
    maximize: function() {
        if (!this.maximized) {
            this.expand(false);
            this.restoreSize = this.getSize();
            this.restorePos = this.getPosition(true);
            if (this.maximizable) {
                this.tools.maximize.hide();
                this.tools.restore.show();
            }
            this.maximized = true;
            this.el.disableShadow();

            if (this.dd) {
                this.dd.disable();
            }
            if (this.collapseTool) {
                this.collapseTool.hide();
            }
            this.el.addCls(Ext.baseCSSPrefix + 'window-maximized');
            this.container.addCls(Ext.baseCSSPrefix + 'window-maximized-ct');

            this.setPosition(0, 0);
            this.fitContainer();
            this.fireEvent('maximize', this);
        }
        return this;
    },

    /**
     * Restores a {@link #maximizable maximized}  window back to its original
     * size and position prior to being maximized and also replaces
     * the 'restore' tool button with the 'maximize' tool button.
     * Also see {@link #toggleMaximize}.
     * @return {Ext.Window} this
     */
    restore: function() {
        if (this.maximized) {
            this.removeCls(Ext.baseCSSPrefix + 'window-maximized');

            // Toggle tool visibility
            var t = this.tools;
            if (t.restore) {
                t.restore.hide();
            }
            if (t.maximize) {
                t.maximize.show();
            }
            if (this.collapseTool) {
                this.collapseTool.show();
            }

            // Restore the position/sizing
            this.setPosition(this.restorePos);
            this.setSize(this.restoreSize);

            // Unset old position/sizing
            delete this.restorePos;
            delete this.restoreSize;

            this.maximized = false;

            this.el.enableShadow(true);

            // Allow users to drag and drop again
            if (this.dd) {
                this.dd.enable();
            }

            this.container.removeCls(Ext.baseCSSPrefix + 'window-maximized-ct');

            this.doConstrain();
            this.fireEvent('restore', this);
        }
        return this;
    },

    /**
     * A shortcut method for toggling between {@link #maximize} and {@link #restore} based on the current maximized
     * state of the window.
     * @return {Ext.Window} this
     */
    toggleMaximize: function() {
        return this[this.maximized ? 'restore': 'maximize']();
    }

    /**
     * @cfg {Boolean} autoWidth @hide
     * Absolute positioned element and therefore cannot support autoWidth.
     * A width is a required configuration.
     **/
});
