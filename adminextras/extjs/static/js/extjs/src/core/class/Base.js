/**
 * @author Jacky Nguyen
 * @class Ext.Base
 *
 * The root of all classes created with {@link Ext#define}
 * All prototype and static properties of this class are inherited by any other class
 *
 */
(function(flexSetter) {

var Base = Ext.Base = function() {};
    Base.prototype = {
        $className: 'Ext.Base',

        $class: Base,

        /**
         * Get the reference to the current class from which this object was instantiated. Unlike {@link Ext.Base#statics},
         * `this.self` is scope-dependent and it's meant to be used for dynamic inheritance. See {@link Ext.Base#statics}
         * for a detailed comparison

    Ext.define('My.Cat', {
        statics: {
            speciciesName: 'Cat' // My.Cat.speciciesName = 'Cat'
        },

        constructor: function() {
            alert(this.self.speciciesName); / dependent on 'this'

            return this;
        },

        clone: function() {
            return new this.self();
        }
    });


    Ext.define('My.SnowLeopard', {
        extend: 'My.Cat',
        statics: {
            speciciesName: 'Snow Leopard' // My.SnowLeopard.speciciesName = 'Snow Leopard'
        }
    });

    var kitty = new My.Cat();           // alerts 'Cat'
    var katty = new My.SnowLeopard();   // alerts 'Snow Leopard'

    var cutie = katty.clone();
    alert(Ext.getClassName(cutie));     // alerts 'My.SnowLeopard'

         * @type Class
         * @protected
         * @markdown
         */
        self: Base,

        /**
         * Default constructor, simply returns `this`
         * @constructor
         * @protected
         * @return {Object} this
         */
        constructor: function() {
            return this;
        },

        /**
         * Initialize configuration for this class. a typical example:

    Ext.define('My.awesome.Class', {
        // The default config
        config: {
            name: 'Awesome',
            isAwesome: true
        },

        constructor: function(config) {
            this.initConfig(config);

            return this;
        }
    });

    var awesome = new My.awesome.Class({
        name: 'Super Awesome'
    });

    alert(awesome.getName()); // 'Super Awesome'

         * @protected
         * @param {Object} config
         * @return {Object} mixins The mixin prototypes as key - value pairs
         */
        initConfig: function(config) {
            if (!this.$configInited) {
                this.config = Ext.Object.merge({}, this.config || {}, config || {});

                this.applyConfig(this.config);

                this.$configInited = true;
            }

            return this;
        },

        /**
         * @private
         */
        setConfig: function(config) {
            this.applyConfig(config || {});

            return this;
        },

        /**
         * @private
         */
        applyConfig: flexSetter(function(name, value) {
            var setter = 'set' + Ext.String.capitalize(name);

            if (typeof this[setter] === 'function') {
                this[setter].call(this, value);
            }

            return this;
        }),

        /**
         * @deprecated
         * @ignore
         */
        parent: function(args) {
            if (Ext.isDefined(Ext.global.console)) {
                console.warn("[" + this.parent.caller.displayName + "] this.parent is deprecated. " +
                             "Please use this.callParent instead.");
            }

            return this.callParent.apply(this, arguments);
        },

        /**
         * Call the overridden superclass' method. For example:

    Ext.define('My.own.A', {
        constructor: function(test) {
            alert(test);
        }
    });

    Ext.define('My.own.B', {
        constructor: function(test) {
            alert(test);

            this.callParent([test + 1]);
        }
    });

    var a = new My.own.A(1); // alerts '1'
    var b = new My.own.B(1); // alerts '1', then alerts '2'

         * @protected
         * @param {Array/Arguments} args The arguments, either an array or the `arguments` object
         * from the current method, for example: `this.callParent(arguments)`
         * @return {Mixed} Returns the result from the superclass' method
         * @markdown
         */
        callParent: function(args) {
            var method = this.callParent.caller,
                superCls, methodName;

            if (!method.$owner) {
                //<debug error>
                if (!method.caller) {
                    throw new Error("[" + Ext.getClassName(this) + "#callParent] Calling a protected method from the " +
                                    "public scope");
                }
                //</debug>

                method = method.caller;
            }

            superCls = method.$owner.superclass;
            methodName = method.$name;

            //<debug error>
            if (!(methodName in superCls)) {
                throw new Error("[" + Ext.getClassName(this) + "#" + methodName + "] this.parent was called but there's no " +
                                "such method (" + methodName + ") found in the parent class (" +
                                (Ext.getClassName(superCls) || 'Object') + ")");
            }
            //</debug>
            return superCls[methodName].apply(this, args || []);
        },


        /**
         * Get the reference to the class from which this object was instantiated. Note that unlike {@link Ext.Base#self},
         * `this.statics()` is scope-independent and it always returns the class from which it was called, regardless of what
         * `this` points to during runtime

    Ext.define('My.Cat', {
        statics: {
            speciciesName: 'Cat' // My.Cat.speciciesName = 'Cat'
        },

        constructor: function() {
            alert(this.statics().speciciesName); // always equals to 'Cat' no matter what 'this' refers to
                                                 // equivalent to: My.Cat.speciciesName

            alert(this.self.speciciesName);      // dependent on 'this'

            return this;
        },

        clone: function() {
            var cloned = new this.self;                      // dependent on 'this'

            cloned.groupName = this.statics().speciciesName; // equivalent to: My.Cat.speciciesName

            return cloned;
        }
    });


    Ext.define('My.SnowLeopard', {
        statics: {
            speciciesName: 'Snow Leopard' // My.SnowLeopard.speciciesName = 'Snow Leopard'
        },

        constructor: function() {
            this.callParent();
        }
    });

    var kitty = new My.Cat();         // alerts 'Cat', then alerts 'Cat'

    var katty = new My.SnowLeopard(); // alerts 'Cat', then alerts 'Snow Leopard'

    var cutie = kitty.clone();
    alert(Ext.getClassName(cutie));   // alerts 'My.SnowLeopard'
    alert(cutie.groupName);           // alerts 'Cat'

         * @protected
         * @return {Class}
         * @markdown
         */
        statics: function() {
            var method = this.statics.caller,
                self = this.self;

            if (!method) {
                return self;
            }

            return method.$owner;
        },

        /**
         * Call the original method that was previously overridden with {@link Ext.Base#override}

    Ext.define('My.Cat', {
        constructor: function() {
            alert("I'm a cat!");

            return this;
        }
    });

    My.Cat.override({
        constructor: function() {
            alert("I'm going to be a cat!");

            var instance = this.callOverridden();

            alert("Meeeeoooowwww");

            return instance;
        }
    });

    var kitty = new My.Cat(); // alerts "I'm going to be a cat!"
                              // alerts "I'm a cat!"
                              // alerts "Meeeeoooowwww"

         * @param {Array/Arguments} args The arguments, either an array or the `arguments` object
         * @return {Mixed} Returns the result after calling the overridden method
         * @markdown
         */
        callOverridden: function(args) {
            var method = this.callOverridden.caller,
                methodName = method.$name;

            if (!method.$owner) {
                //<debug error>
                throw new Error("[" + Ext.getClassName(this) + "#callOverridden] Calling a protected method from the " +
                                "public scope");
                //</debug>
            }

            //<debug error>
            if (!method.$previous) {
                throw new Error("[" + Ext.getClassName(this) + "] this.callOverridden was called in '" + methodName +
                                "' but this method has never been overridden");
            }
            //</debug>

            return method.$previous.apply(this, args || []);
        },

        destroy: function() {}
    };

    // These static properties will be copied to every newly created class with {@link Ext#define}
    Ext.apply(Ext.Base, {

        /**
         * @private
         */
        ownMethod: flexSetter(function(name, fn) {
            var originalFn, className;

            if (fn === Ext.emptyFn) {
                this.prototype[name] = fn;
                return;
            }

            if (fn.$isOwned) {
                originalFn = fn;

                fn = function() {
                    return originalFn.apply(this, arguments);
                };
            }

            //<debug>
            className = Ext.getClassName(this);
            if (className) {
                fn.displayName = className + '#' + name;
            }
            //</debug>
            fn.$owner = this;
            fn.$name = name;
            fn.$isOwned = true;

            this.prototype[name] = fn;
        }),

        /**
         * @private
         */
        borrowMethod: flexSetter(function(name, fn) {
            if (!fn.$isOwned) {
                this.ownMethod(name, fn);
            }
            else {
                this.prototype[name] = fn;
            }
        }),

        /**
         * Add / override static properties of this class. This method is a {@link Ext.Function#flexSetter flexSetter}.
         * It can either accept an object of key - value pairs or 2 arguments of name - value.

    Ext.define('My.cool.Class', {
        ...
    });

    My.cool.Class.extend({
        someProperty: 'someValue',      // My.cool.Class.someProperty = 'someValue'
        method1: function() { ... },    // My.cool.Class.method1 = function() { ... };
        method2: function() { ... }     // My.cool.Class.method2 = function() { ... };
    });

    My.cool.Class.extend('method3', function(){ ... }); // My.cool.Class.method3 = function() { ... };

         * @property extend
         * @static
         * @type Function
         * @param {String/Object} name See {@link Ext.Function#flexSetter flexSetter}
         * @param {Mixed} value See {@link Ext.Function#flexSetter flexSetter}
         * @markdown
         */
        extend: flexSetter(function(name, value) {
            this[name] = value;
        }),

        /**
         * Add / override prototype properties of this class. This method is a {@link Ext.Function#flexSetter flexSetter}.
         * It can either accept an object of key - value pairs or 2 arguments of name - value.

    Ext.define('My.cool.Class', {
        ...
    });

    // Object with key - value pairs
    My.cool.Class.implement({
        someProperty: 'someValue',
        method1: function() { ... },
        method2: function() { ... }
    });

    var cool = new My.cool.Class();
    alert(cool.someProperty); // alerts 'someValue'
    cool.method1();
    cool.method2();

    // name - value arguments
    My.cool.Class.implement('method3', function(){ ... });
    cool.method3();

         * @property implement
         * @static
         * @type Function
         * @param {String/Object} name See {@link Ext.Function#flexSetter flexSetter}
         * @param {Mixed} value See {@link Ext.Function#flexSetter flexSetter}
         */
        implement: flexSetter(function(name, value) {
            if (Ext.isObject(this.prototype[name]) && Ext.isObject(value)) {
                Ext.Object.merge(this.prototype[name], value);
            }
            else if (Ext.isFunction(value)) {
                this.ownMethod(name, value);
            }
            else {
                this.prototype[name] = value;
            }
        }),

        /**
         * Add / override prototype properties of this class. This method is similar to {@link Ext.Base#implement implement},
         * except that it stores the reference of the overridden method which can be called later on via {@link Ext.Base#callOverridden}
         *
         * @property override
         * @static
         * @type Function
         * @param {String/Object} name See {@link Ext.Function#flexSetter flexSetter}
         * @param {Mixed} value See {@link Ext.Function#flexSetter flexSetter}
         */
        override: flexSetter(function(name, value) {
            if (Ext.isObject(this.prototype[name]) && Ext.isObject(value)) {
                Ext.Object.merge(this.prototype[name], value);
            }
            else if (Ext.isFunction(this.prototype[name]) && Ext.isFunction(value)) {
                var previous = this.prototype[name];

                this.ownMethod(name, value);
                this.prototype[name].$previous = previous;
            }
            else {
                this.prototype[name] = value;
            }
        }),

       /**
         * Used internally by the mixins pre-processor
         * @private
         */
        mixin: flexSetter(function(name, cls) {
            var mixinPrototype = cls.prototype,
                myPrototype = this.prototype,
                i;

            for (i in mixinPrototype) {
                if (mixinPrototype.hasOwnProperty(i)) {
                    if (myPrototype[i] === undefined) {
                        if (Ext.isFunction(mixinPrototype[i])) {
                            this.borrowMethod(i, mixinPrototype[i]);
                        }
                        else {
                            myPrototype[i] = mixinPrototype[i];
                        }
                    }
                    else if (i === 'config' && Ext.isObject(myPrototype[i]) && Ext.isObject(mixinPrototype[i])) {
                        Ext.Object.merge(myPrototype[i], mixinPrototype[i]);
                    }
                }
            }

            if (!myPrototype.mixins) {
                myPrototype.mixins = {};
            }

            myPrototype.mixins[name] = mixinPrototype;
        }),

        /**
         * Create aliases for current prototype methods. Example:

    Ext.define('My.cool.Class', {
        method1: function() { ... },
        method2: function() { ... }
    });

    var test = new My.cool.Class();

    My.cool.Class.createAlias({
        method3: 'method1',
        method4: 'method2'
    });

    test.method3(); // test.method1()

    My.cool.Class.createAlias('method5', 'method3');

    test.method5(); // test.method3() -> test.method1()

         * @property createAlias
         * @static
         * @type Function
         * @param {String/Object} alias The new method name, or an object to set multiple aliases. See
         * {@link Ext.Function#flexSetter flexSetter}
         * @param {String/Object} origin The original method name
         * @markdown
         */
        createAlias: flexSetter(function(alias, origin) {
            this.prototype[alias] = this.prototype[origin];
        })
    });

})(Ext.Function.flexSetter);
