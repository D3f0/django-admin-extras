/**
 * @author Jacky Nguyen
 * @class Ext.Loader
 *
 * Ext.Loader is the heart of the new dynamic dependency loading capability in Ext JS 4+. It is most commonly used
 * via the {@link Ext#require} shorthand
 *
 * <pre><code>
Ext.require([
    'widget.window',
    'widget.button',
    'layout.fit'
]);

Ext.onReady(function() {
    var window = Ext.widget('window', {
        width: 500,
        height: 300,
        layout: 'fit',
        items: {
            xtype: 'button',
            text: 'Hello World',
            handler: function() { alert(this.text) }
        }
    });

    window.show();
});
 * </code></pre>
 *
 * @singleton
 */

(function(Manager, Class, flexSetter) {

    var defaultClassPreprocessors = Class.getDefaultPreprocessors(),
        Loader;

    Ext.Loader = {

        /**
         * Flag indicating whether there are still files being loaded
         * @private
         */
        isLoading: false,

        /**
         * Maintain the queue for all dependencies. Each item in the array is an object of the format:
         * {
         *      requires: [...], // The required classes for this queue item
         *      callback: function() { ... } // The function to execute when all classes specified in requires exist
         * }
         * @private
         */
        queue: [],

        /**
         * Maintain the list of files that have already been handled so that they never get double-loaded
         * @private
         */
        isFileLoaded: {},

        /**
         * Maintain the list of listeners to execute when all required scripts are fully loaded
         * @private
         */
        readyListeners: [],

        /**
         * Contains all class names that are ever required via {@link Ext.Loader#require}
         * @private
         */
        requireHistory: {},

        /**
         * Contains optional dependencies to be loaded last
         * @private
         */
        optionalRequires: [],

        /**
         * Map of fully qualified class names to an array of dependent classes.
         * @private
         */
        requiresMap: {},

        /**
         * @private
         */
        numPendingFiles: 0,

        /**
         * @private
         */
        numLoadedFiles: 0,

        /**
         * @private
         */
        classNameToFilePathMap: {},

        /**
         * An array of class names to keep track of the dependency loading order.
         * This is not guaranteed to be the same everytime due to the asynchronous
         * nature of the Loader.
         *
         * @property history
         * @type Array
         */
        history: [],

        /**
         * Configuration
         * @private
         */
        config: {
            /**
             * Whether or not to enable the dynamic dependency loading feature
             * Defaults to false
             * @cfg {Boolean} enabled
             */
            enabled: false,

            /**
             * Whether or not to enable automatic deadlock detection, very useful
             * during development
             * Defaults to true
             * @cfg {Boolean} enableDeadlockDetection
             */
            enableDeadlockDetection: true,

            /**
             * Whether or not to enable automatic deadlock detection, very useful
             * during development
             * Defaults to true
             * @cfg {Boolean} enableCacheBuster
             */
            enableCacheBuster: true,

            /**
             * The mapping from namespaces to file paths
             * <pre><code>
             * {
             *      'Ext': './src' // This is set by default, Ext.layout.Container will refer to ./src/layout/Container.js
             *      'My': './src/my_own_folder' // My.layout.Container will refer to ./src/my_own_folder/layout/Container.js
             * }
             * </code></pre>
             *
             * If not being specified, for example, <code>Other.awesome.Class</code>
             * will simply refer to <code>./Other/awesome/Class.js</code>
             * @cfg {Object} paths
             */
            paths: {
                'Ext': '.'
            }
        },

        /**
         * Set the configuration for the loader. This should be called right after ext-core.js
         * (or ext-core-debug.js) is included in the page, i.e:
         * <pre><code>
         * &lt;script type="text/javascript" src="ext-core-debug.js">&lt;/script>
         * &lt;script type="text/javascript">
         *      Ext.Loader.setConfig({
         *          enabled: true,
         *          paths: {
         *              'My': 'my_own_path'
         *          }
         *      });
         * &lt;/script>
         * &lt;script type="text/javascript">
         *      Ext.require(...);
         *
         *      Ext.onReady(function() {
         *          // application code here
         *      });
         * &lt;/script>
         * </code></pre>
         * Refer to {@link Ext.Loader#config} for the list of possible properties
         *
         * @param {Object} config The config object to override the default values in {@link Ext.Loader#config}
         * @return {Ext.Loader} this
         */
        setConfig: function(name, value) {
            if (Ext.isObject(name) && arguments.length === 1) {
                Ext.merge(this.config, name);
            }
            else {
                this.config[name] = (Ext.isObject(value)) ? Ext.merge(this.config[name], value) : value;
            }

            return this;
        },

        /**
         * Get the config value corresponding to the specified name. If no name is given, will return the config object
         * @param {String} name The config property name
         * @return {Object/Mixed}
         */
        getConfig: function(name) {
            if (name) {
                return this.config[name];
            }

            return this.config;
        },

        /**
         * Sets the path of a namespace.
         * For Example:
         *   Ext.Loader.setPath('Ext', '.');
         * Indicates that any classes with the top level object "Ext" will be found
         * at the root basePath.
         * @param {String/Object} name See {@link Ext.Function#flexSetter flexSetter}
         * @param {String} path See {@link Ext.Function#flexSetter flexSetter}
         */
        setPath: flexSetter(function(name, path) {
            this.config.paths[name] = path;

            return this;
        }),

        /**
         * Translates a className to a path to load the file from by prefixing
         * the proper prefix and converting the .'s to /'s.
         *
         * For example:
         * 
         * <pre><code>
         * ("Ext.layout.Layout" => "./src/Ext/layout/Layout.js")
         *</code></pre>
         *
         * @param {String} className
         * @return {String} path
         */
        getPath: function(className) {
            var path = '',
                paths = this.config.paths,
                prefix, deepestPrefix = '';

            if (paths.hasOwnProperty(className)) {
                return paths[className];
            }

            for (prefix in paths) {
                if (paths.hasOwnProperty(prefix) && prefix === className.substring(0, prefix.length)) {
                    if (prefix.length > deepestPrefix.length) {
                        deepestPrefix = prefix;
                    }
                }
            }

            path += paths[deepestPrefix];
            className = className.substring(deepestPrefix.length + 1);

            path = path + "/" + className.replace(/\./g, "/") + '.js';
            path = path.replace(/\/\.\//g, '/');

            return path;
        },

        /**
         * Refresh all items in the queue. If all dependencies for an item exist during looping,
         * it will execute the callback and call refreshQueue again. Triggers onReady when the queue is
         * empty
         * @private
         */
        refreshQueue: function() {
            var manager = Manager,
                ln = this.queue.length,
                i, item, j, requires;

            if (ln === 0) {
                this.triggerReady();
                return;
            }

            for (i = 0; i < ln; i++) {
                item = this.queue[i];

                if (item) {
                    requires = item.requires;

                    // Don't bother checking when the number of files loaded
                    // is still less than the array length
                    if (requires.length > this.numLoadedFiles) {
                        continue;
                    }

                    j = 0;

                    do {
                        if (manager.exist(requires[j])) {
                            requires.splice(j, 1);
                        }
                        else {
                            j++;
                        }
                    } while (j < requires.length);

                    if (item.requires.length === 0) {
                        this.queue.splice(i, 1);
                        item.callback.call(item.scope);
                        this.refreshQueue();
                        break;
                    }
                }
            }
        },

        /**
         * @private
         */
        injectScriptElement: function(url, onLoad, onError, scope) {
            var script = document.createElement('script'),
                head = document.head || document.getElementsByTagName('head')[0],
                isLoaded = false,
                onLoadFn = function() {
                    if (!isLoaded) {
                        isLoaded = true;
                        onLoad.call(scope);
                    }
                };

            Ext.apply(script, {
                type: 'text/javascript',
                src: url,
                onload: onLoadFn,
                onerror: onError,
                onreadystatechange: function() {
                    if (this.readyState === 'loaded' || this.readyState === 'complete') {
                        onLoadFn();
                    }
                }
            });

            head.appendChild(script);

            return script;
        },

        /**
         * Load a script file, supports both asynchronous and synchronous approaches
         * @param {String} url
         * @param {Function} onLoad
         * @param {Scope} scope
         * @param {Boolean} synchronous
         * @private
         */
        loadScriptFile: function(url, onLoad, scope, synchronous) {
            var me = this,
                noCacheUrl = url + (this.getConfig('enableCacheBuster') ? '?' + Ext.Date.now() : ''),
                fileName = url.split('/').pop(),
                xhr, status, onScriptError;

            scope = scope || this;

            this.isLoading = true;

            if (!synchronous) {
                onScriptError = function() {
                    me.onFileLoadError.call(me, {
                        message: "Failed loading '" + url + "', please verify that it exists",
                        url: url,
                        synchronous: false
                    });
                };

                if (!Ext.isReady) {
                    Ext.onDocumentReady(function() {
                        me.injectScriptElement(noCacheUrl, onLoad, onScriptError, scope);
                    });
                }
                else {
                    this.injectScriptElement(noCacheUrl, onLoad, onScriptError, scope);
                }
            }
            else {
                if (typeof XMLHttpRequest !== 'undefined') {
                    xhr = new XMLHttpRequest();
                } else {
                    xhr = new ActiveXObject('Microsoft.XMLHTTP');
                }

                xhr.open('GET', noCacheUrl, false);
                xhr.send(null);

                status = (xhr.status === 1223) ? 204 : xhr.status;

                if (status >= 200 && status < 300) {
                    // Firebug friendly, file names are still shown even though they're eval'ed code
                    new Function(xhr.responseText + "\n//@ sourceURL=" + fileName)();

                    onLoad.call(scope);
                }
                else {
                    this.onFileLoadError.call(this, {
                        message: "Failed loading synchronously via XHR: '" + url + "'; please " +
                                 "verify that the file exists. " +
                                 "XHR status code: " + status,
                        url: url,
                        synchronous: true
                    });
                }
            }
        },

        /**
         * @private
         */
        onFileLoadError: function(error) {
            //<debug error>
            throw new Error("[Ext.Loader] " + error.message);
            //</debug>
        },

        /**
         * Explicitly exclude
         */
        exclude: function(excludes) {
            var me = this;

            return {
                require: function(expressions, fn, scope) {
                    return me.require(expressions, fn, scope, excludes);
                }
            };
        },

        /**
         * Loads all classes by the given names and all their direct dependencies; optionally executes the given callback function when
         * finishes, within the optional scope. This method is aliased by {@link Ext#require} for convenience
         * @param {String/Array} expressions Can either be a string or an array of string
         * @param {Function} fn (Optional) The callback function
         * @param {Object} scope (Optional) The execution scope (<code>this</code>) of the callback function
         * @param {String/Array} excludes (Optional) Stuff to be excluded, useful when being used with expressions
         * @private
         */
        require: function(expressions, fn, scope, excludes) {
            var filePath, expression, exclude, className, excluded = {},
                excludedClassNames = [],
                possibleClassNames = [],
                possibleClassName, classNames = [],
                me = this,
                i, j, ln, subLn, onFileLoaded;

            expressions = Ext.Array.from(expressions);
            excludes = Ext.Array.from(excludes);

            fn = fn || Ext.emptyFn;

            scope = scope || Ext.global;

            for (i = 0, ln = excludes.length; i < ln; i++) {
                exclude = excludes[i];

                if (Ext.isString(exclude) && exclude.length > 0) {
                    excludedClassNames = Manager.getNamesByExpression(exclude);

                    for (j = 0, subLn = excludedClassNames.length; j < subLn; j++) {
                        excluded[excludedClassNames[j]] = true;
                    }
                }
            }

            for (i = 0, ln = expressions.length; i < ln; i++) {
                expression = expressions[i];

                if (Ext.isString(expression) && expression.length > 0) {
                    possibleClassNames = Manager.getNamesByExpression(expression);

                    for (j = 0, subLn = possibleClassNames.length; j < subLn; j++) {
                        possibleClassName = possibleClassNames[j];

                        if (!excluded.hasOwnProperty(possibleClassName) && !Manager.exist(possibleClassName)) {
                            Ext.Array.include(classNames, possibleClassName);
                        }
                    }
                }
            }

            //<debug error>
            // If the dynamic dependency feature is not being used, throw an error
            // if the dependencies are not defined
            if (!this.config.enabled) {
                if (classNames.length > 0) {
                    throw new Error("[Ext.Loader][not enabled] Missing required class" + ((classNames.length > 1) ? "es" : "") +
                                    ": " + classNames.join(', '));
                }
            }
            //</debug>

            if (classNames.length === 0) {
                fn.call(scope);
                return this;
            }

            this.queue.push({
                requires: classNames,
                callback: fn,
                scope: scope
            });

            classNames = classNames.slice();

            for (i = 0, ln = classNames.length; i < ln; i++) {
                className = classNames[i];

                if (!(this.isFileLoaded.hasOwnProperty(className) && this.isFileLoaded[className] === true)) {
                    this.requireHistory[className] = true;

                    this.isFileLoaded[className] = true;

                    filePath = this.getPath(className);

                    this.classNameToFilePathMap[className] = filePath;

                    this.numPendingFiles++;

                    if (this.numLoadedFiles === 0) {
                        this.startLoadingTime = Ext.Date.now();
                    }

                    this.loadScriptFile(filePath, Ext.Function.pass(this.onFileLoaded, [className, filePath], this), this, this.syncModeEnabled);
                }
            }

            return this;
        },

        onFileLoaded: function(className, filePath) {
            this.numLoadedFiles++;

            //<debug info>
            window.status = "Loaded: " + className + " (" + this.numLoadedFiles + " total)";
            //</debug>

            this.numPendingFiles--;

            if (this.numPendingFiles === 0) {
                this.refreshQueue();
            }

            //<debug>
            if (this.numPendingFiles === 0 && this.isLoading) {
                var queue = this.queue,
                    requires,
                    i, ln, j, subLn, missingClasses = [], missingPaths = [];

                for (i = 0, ln = queue.length; i < ln; i++) {
                    requires = queue[i].requires;

                    for (j = 0, subLn = requires.length; j < ln; j++) {
                        if (this.isFileLoaded[requires[j]]) {
                            missingClasses.push(requires[j]);
                        }
                    }
                }

                if (missingClasses.length < 1) {
                    return;
                }

                for (i = 0, ln = missingClasses.length; i < ln; i++) {
                    missingPaths.push(this.classNameToFilePathMap[missingClasses[i]]);
                }

                throw new Error("[Ext.Loader] The following classes are not declared even if their files have been loaded: " +
                                missingClasses.join(', ') + ". Please check the source code of their " +
                                "corresponding files for possible typos: " + missingPaths.join(', '));
            }
            //</debug>
        },

        /**
         * @private
         */
        addOptionalRequires: function(requires) {
            var optionalRequires = this.optionalRequires,
                i, ln, require;

            requires = Ext.Array.from(requires);

            for (i = 0, ln = requires.length; i < ln; i++) {
                require = requires[i];

                Ext.Array.include(optionalRequires, require);
            }

            return this;
        },

        /**
         * @private
         */
        triggerReady: function(force) {
            var readyListeners = this.readyListeners,
                optionalRequires, listener;

            if (this.isLoading || force) {
                this.isLoading = false;

                if (this.optionalRequires.length) {
                    // Clone then empty the array to eliminate potential recursive loop issue
                    optionalRequires = Ext.Array.clone(this.optionalRequires);

                    // Empty the original array
                    this.optionalRequires.length = 0;

                    this.require(optionalRequires, Ext.Function.pass(this.triggerReady, [true], this), this);
                    return this;
                }

                //<debug info>
                window.status = "All dependencies are loaded. (" + this.numLoadedFiles + " files in " +
                                 ((Ext.Date.now() - this.startLoadingTime) / 1000)+"s | using " +
                                Math.round(((this.numLoadedFiles / Ext.Object.getSize(Manager.maps.nameToAliases)) * 100)) + "% of the whole library)";
                //</debug>

                while (readyListeners.length) {
                    listener = readyListeners.shift();
                    listener.fn.call(listener.scope);
                }
            }

            return this;
        },

        /**
         * Add a new listener to be executed when all required scripts are fully loaded
         * @param {Function} fn The function callback to be executed
         * @param {Object} scope The execution scope (<code>this</code>) of the callback function
         * @param {Boolean} withDomReady Whether or not to wait for document dom ready as well
         */
        onReady: function(fn, scope, withDomReady, options) {
            var me = this,
                oldFn;

            if (withDomReady !== false && Ext.onDocumentReady) {
                oldFn = fn;

                fn = function() {
                    Ext.onDocumentReady(oldFn, scope, options);
                };
            }

            if (!this.isLoading) {
                fn.call(scope);
            }
            else {
                this.readyListeners.push({
                    fn: fn,
                    scope: scope
                });
            }
        },

        historyPush: function(className) {
            if (className && this.requireHistory.hasOwnProperty(className)) {
                Ext.Array.include(this.history, className);
            }
        },

        /**
         * @private
         */
        enableSyncMode: function(isEnabled) {
            this.syncModeEnabled = isEnabled;
        }
    };

    Loader = Ext.Loader;

    /**
     * Convenient shortcut to {@link Ext.Loader#require}
     * @member Ext
     * @method require
     */
    Ext.require = Ext.Function.alias(Loader, 'require');
    
    /**
     * Convenient shortcut to {@link Ext.Loader#exclude}
     * @member Ext 
     * @method exclude
     */
    Ext.exclude = Ext.Function.alias(Loader, 'exclude');

    /**
     * Convenient shortcut to {@link Ext.Loader#exclude}
     * @member Ext
     * @method exclude
     */
    Ext.exclude = Ext.Function.alias(Loader, 'exclude');

    Class.registerPreprocessor('loader', function(cls, data, fn) {
        var me = this,
            dependencyProperties = ['extend', 'mixins', 'requires'],
            dependencies = [],
            className = Manager.getName(cls),
            requiresMap = Loader.requiresMap,
            i, j, ln, subLn, value, propertyName, propertyValue, deadlockPath = [], detectDeadlock;

        // Basically loop through the dependencyProperties, look for string class names and push
        // them into a stack, regardless of whether the property's value is a string, array or object. For example:
        // {
        //      extend: 'Ext.MyClass',
        //      requires: ['Ext.some.OtherClass'],
        //      mixins: {
        //          observable: 'Ext.util.Observable';
        //      }
        // }
        // which will later be transformed into:
        // {
        //      extend: Ext.MyClass,
        //      requires: [Ext.some.OtherClass],
        //      mixins: {
        //          observable: Ext.util.Observable;
        //      }
        // }
        for (i = 0, ln = dependencyProperties.length; i < ln; i++) {
            propertyName = dependencyProperties[i];

            if (data.hasOwnProperty(propertyName)) {
                propertyValue = data[propertyName];

                if (Ext.isString(propertyValue)) {
                    dependencies.push(propertyValue);
                }
                else if (Ext.isArray(propertyValue)) {
                    for (j = 0, subLn = propertyValue.length; j < subLn; j++) {
                        value = propertyValue[j];

                        if (Ext.isString(value)) {
                            dependencies.push(value);
                        }
                    }
                }
                else {
                    for (j in propertyValue) {
                        if (propertyValue.hasOwnProperty(j)) {
                            value = propertyValue[j];

                            if (Ext.isString(value)) {
                                dependencies.push(value);
                            }
                        }
                    }
                }
            }
        }

        //<debug error>

        // Automatically detect deadlocks before-hand,
        // will throw an error with detailed path for ease of debugging. Examples of deadlock cases:
        //
        // - A extends B, then B extends A
        // - A requires B, B requires C, then C requires A
        //
        // The detectDeadlock function will recursively transverse till the leaf, hence it can detect deadlocks
        // no matter how deep the path is.

        if (className && Loader.getConfig('enableDeadlockDetection')) {
            requiresMap[className] = dependencies;

            detectDeadlock = function(cls) {
                deadlockPath.push(cls);

                if (requiresMap[cls]) {
                    if (Ext.Array.contains(requiresMap[cls], className)) {
                        throw new Error("[Ext.Loader] Deadlock detected! '" + className + "' and '" + deadlockPath[1] + "' " +
                                        "mutually require each other. Path: " + deadlockPath.join(' -> ') +
                                        " -> " + deadlockPath[0]);
                    }

                    for (i = 0, ln = requiresMap[cls].length; i < ln; i++) {
                        detectDeadlock(requiresMap[cls][i]);
                    }
                }
            };

            detectDeadlock(className);
        }

        //</debug>

        Ext.require(dependencies, function() {
            Loader.historyPush(className);

            for (i = 0, ln = dependencyProperties.length; i < ln; i++) {
                propertyName = dependencyProperties[i];

                if (data.hasOwnProperty(propertyName)) {
                    propertyValue = data[propertyName];

                    if (Ext.isString(propertyValue)) {
                        data[propertyName] = Manager.get(propertyValue);
                    }
                    else if (Ext.isArray(propertyValue)) {
                        for (j = 0, subLn = propertyValue.length; j < subLn; j++) {
                            value = propertyValue[j];

                            if (Ext.isString(value)) {
                                data[propertyName][j] = Manager.get(value);
                            }
                        }
                    }
                    else {
                        for (var k in propertyValue) {
                            if (propertyValue.hasOwnProperty(k)) {
                                value = propertyValue[k];

                                if (Ext.isString(value)) {
                                    data[propertyName][k] = Manager.get(value);
                                }
                            }
                        }
                    }
                }
            }

            if (fn) {
                fn.call(me, cls, data);
            }
        });

    }).insertDefaultPreprocessor('loader', 'after', 'className');

    Manager.registerPostprocessor('uses', function(name, cls, data, fn) {
        if (data.uses) {
            var uses = Ext.Array.from(data.uses);

            uses = Ext.Array.filter(uses, function(use) {
                return Ext.isString(use);
            });

            Loader.addOptionalRequires(uses);
        }

        if (fn) {
            fn.call(this, name, cls, data);
        }

    }).insertDefaultPostprocessor('uses', 'last');

})(Ext.ClassManager, Ext.Class, Ext.Function.flexSetter);
