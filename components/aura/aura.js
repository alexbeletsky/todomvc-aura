
define('aura/platform',[],function() {
  // The bind method is used for callbacks.
  //
  // * (bind)[https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Function/bind]
  // * (You don't need to use $.proxy)[http://www.aaron-powell.com/javascript/you-dont-need-jquery-proxy]
  if (typeof Function.prototype.bind !== "function") {
    Function.prototype.bind = function(oThis) {
      if (typeof this !== "function") {
        // closest thing possible to the ECMAScript 5 internal IsCallable function
        throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
      }

      var aArgs = Array.prototype.slice.call(arguments, 1);
      var fToBind = this;
      var FNOP = function() {};
      var FBound = function() {
          return fToBind.apply(this instanceof FNOP && oThis ? this : oThis,
          aArgs.concat(Array.prototype.slice.call(arguments)));
        };

      FNOP.prototype = this.prototype;
      FBound.prototype = new FNOP();

      return FBound;
    };
  }

  // Returns true if an object is an array, false if it is not.
  //
  // * (isArray)[https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Array/isArray]
  if (typeof Array.isArray !== "function") {
    Array.isArray = function(vArg) {
      return Object.prototype.toString.call(vArg) === "[object Array]";
    };
  }

  // Creates a new object with the specified prototype object and properties.
  //
  // * (create)[https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object/create]

  if (!Object.create) {
    Object.create = function (o) {
      if (arguments.length > 1) {
        throw new Error('Object.create implementation only accepts the first parameter.');
      }
      function F() {}
      F.prototype = o;
      return new F();
    };
  }
  // Returns an array of a given object's own enumerable properties, in the same order as that provided by a for-in loop
  // (the difference being that a for-in loop enumerates properties in the prototype chain as well).
  //
  // (keys)[https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object/keys]
  if (!Object.keys) {
    Object.keys = (function () {
      var ownProp = Object.prototype.hasOwnProperty,
          hasDontEnumBug = !({toString: null}).propertyIsEnumerable('toString'),
          dontEnums = [
            'toString',
            'toLocaleString',
            'valueOf',
            'hasOwnProperty',
            'isPrototypeOf',
            'propertyIsEnumerable',
            'constructor'
          ],
          dontEnumsLength = dontEnums.length;

      return function (obj) {
        if (typeof obj !== 'object' && typeof obj !== 'function' || obj === null) {
          throw new TypeError('Object.keys called on non-object');
        }

        var result = [];

        for (var prop in obj) {
          if (ownProp.call(obj, prop)) {
            result.push(prop);
          }
        }

        if (hasDontEnumBug) {
          for (var i=0; i < dontEnumsLength; i++) {
            if (ownProp.call(obj, dontEnums[i])) {
              result.push(dontEnums[i]);
            }
          }
        }
        return result;
      };
    })();
  }


});

(function() {
  var defaultConfig = {
    require: {
      paths: {
        underscore: 'components/underscore/underscore',
        jquery:     'components/jquery/jquery'
      },
      shim: {
        underscore: { exports: '_' },
        jquery:     { exports: '$' }
      }
    }
  };

  require.config(defaultConfig.require);

  if (window.jQuery) {
    define('jquery', [], function () {
      return window.jQuery;
    });
  }

  define('aura/base',['module', 'underscore', 'jquery', './platform'], function(module, _, $) {
    var console = window.console || {};

    // Auto configure aura path... if not set yet...
    if (!require.s.contexts._.config.paths.aura) {
      require.config({ paths: { aura: module.id.replace(/base$/, '') }});
    }

    var base = {};

    base.dom = {
      find: function(selector, context) {
        context = context || document;
        return $(context).find(selector);
      },
      data: function(selector, attribute) {
        return $(selector).data(attribute);
      }
    };

    base.data = {
      deferred: $.Deferred,
      when: $.when
    };

    base.util = {
      each: $.each,
      extend: $.extend,
      uniq: _.uniq,
      _: _,
      decamelize: function(camelCase, delimiter) {
        delimiter = (delimiter === undefined) ? '_' : delimiter;
        return camelCase.replace(/([A-Z])/g, delimiter + '$1').toLowerCase();
      }
    };

    var noop = function() {};

    base.log = function() {
      return console.log && console.log(arguments);
    };
    // base.warn = console.warn || noop;
    // base.error = console.error || noop;

    base.events = {
      listen: function(context, events, selector, callback) {
        return $(context).on(events, selector, callback);
      },
      bindAll: function() {
        return _.bindAll.apply(this, arguments);
      }
    };


    base.template = {
      parse: _.template
    };

    return base;

  });

})();

define('aura/aura.extensions',['./base'], function(base) {

  var _ = base.util._,
      slice = Array.prototype.slice,
      deferred = base.data.deferred,
      when     = base.data.when;

  /**
   * Anatomy of an extension...
   * TODO...
   */

  function ExtManager() {
    this._extensions  = [];
    this.initStatus   = deferred();
    return this;
  }

  //---------------------------------------------------------------------------
  // Public API
  //---------------------------------------------------------------------------

  ExtManager.prototype.add = function(ext) {
    if (_.include(this._extensions, ext)) {
      var msg =  ext.ref.toString() + " is already registered.";
          msg += "Extensions can only be added once.";
      throw new Error(msg);
    }

    if (this.initStarted) {
      throw new Error("Init extensions already called");
    }

    this._extensions.push(ext);
    return this;
  };

  ExtManager.prototype.onReady = function(fn) {
    this.initStatus.then(fn);
    return this;
  };

  ExtManager.prototype.onFailure = function(fn) {
    this.initStatus.fail(fn);
    return this;
  };

  ExtManager.prototype.init = function() {

    if (this.initStarted) {
      throw new Error("Init extensions already called");
    }

    this.initStarted = true;

    var extensions    = _.compact(this._extensions.slice(0)),
        initialized   = [],
        initStatus    = this.initStatus;

    // Enforce sequencial loading of extensions.
    // The `initStatus` promise resolves to the
    // actually resolved and loaded extensions.
    (function _init(extDef) {
      if (extDef) {
        var ext = initExtension(extDef);
        initialized.push(ext);
        ext.done(function () { _init(extensions.shift()); });
        ext.fail(function (err) {
          if (!err) {
            err = "Unknown error while loading an extension";
          }
          if (!(err instanceof Error)) {
            err = new Error(err);
          }
          initStatus.reject(err);
        });
      } else if (extensions.length === 0) {
        when.apply(undefined, initialized).done(function () {
          initStatus.resolve(Array.prototype.slice.call(arguments));
        });
      }
    })(extensions.shift());

    return initStatus.promise();
  };

  //---------------------------------------------------------------------------
  // Private API
  //---------------------------------------------------------------------------

  /*!
   * Helper function that returns the first function found among its arguments.
   * If no function if found, it return a noop (empty function).
   *
   * @return {[type]} [description]
   */
  function getFn() {
    var funcs = slice.call(arguments), fn;
    for (var f = 0, l = funcs.length; f < l; f++) {
      fn = funcs[f];
      if (typeof(fn) === 'function') { return fn; }
    }
    return function () {};
  }

  /*!
   * If the value of the first argument is a function then invoke
   * it with the rest of the args, otherwise, return it.
   */
  function getVal(val) {
    if (typeof val === 'function') {
      return val.apply(undefined, slice.call(arguments, 1));
    } else {
      return val;
    }
  }

  /*!
  * Actual extension loading.
  *
  * The sequence is:
  *
  * * resolves the extension reference
  * * register and requires its dependencies if any
  * * init the extension
  *
  * This method also returns a promise that allows
  * to keep track of the app's loading sequence.
  *
  * If the extension provides a `afterAppStart` method,
  * the promise will resolve to that function that
  * will be called at the end of the app loading sequence.
  *
  * @param {String|Object|Function} extDef the reference and context of the extension
  */

  function initExtension(extDef) {
    var dfd       = deferred(),
        ref       = extDef.ref,
        context   = extDef.context;

    var req = requireExtension(ref, context);
    req.fail(dfd.reject);
    req.done(function (ext) {

      // The extension did not return anything,
      // but probably already did what it had to do.
      if (!ext) { return dfd.resolve(); }

      // Let's initialize it then...
      // If ext is a function, call it
      // Else If ext has a init method, call it
      var _fn;
      try {
        _fn = getFn(ext, ext.initialize)(context);
      } catch (e) {
        dfd.reject(e);
      }
      var init = when(_fn);
      init.done(function () { dfd.resolve(ext); });
      init.fail(dfd.reject);
    });
    return dfd.promise();
  }

  /*!
  * Extension resolution before actual loading.
  * If `ext` is a String, it is considered as a reference
  * to an AMD module that has to be loaded.
  *
  * This method returns a promise that resolves to the actual extension,
  * With all its dependencies already required' too.
  *
  * @param {String|Object|Function} ext the reference of the extension
  * @param {Object} context the thing this extension is supposed to extend
  */

  function requireExtension(ext, context) {
    var dfd = deferred();

    var resolve = function (ext) {
      try {
        ext = getVal(ext, context);
        if (ext && ext.require && ext.require.paths) {
          var deps = Object.keys(ext.require.paths) || [];
          require.config(ext.require);
          require(deps, function() {
            dfd.resolve(ext);
          }, reject);
        } else {
          dfd.resolve(ext);
        }
      } catch (err) {
        reject(err);
      }
    };

    var reject = function (err) {
      console.error("Error loading ext:", ext, err);
      dfd.reject(err);
    };

    if (typeof ext === 'string') {
      require([ext], resolve, reject);
    } else {
      resolve(ext);
    }

    return dfd;
  }

  return ExtManager;
});

define('aura/aura',[
  './base',
  './aura.extensions'
  ], function(base, ExtManager) {

  var _ = base.util._,
      noop     = function() {},
      freeze   = Object.freeze || noop;

  /**
  * Aura constructor and main entry point
  * Loads mediator & widgets extensions by default.
  */
  function Aura(config) {
    if (!(this instanceof Aura)) { 
      return new Aura(config);
    }
    
    this.ref        = _.uniqueId('aura_');
    this.config     = config = config || {};
    this.extensions = new ExtManager();

    this.core       = Object.create(base);
    this.sandbox    = Object.create(base);
    this.sandboxes  = {};

    if (config.debug) { this.use('aura/ext/debug'); }
    this.use('aura/ext/mediator');

    config.widgets = (config.widgets || {});
    config.widgets.sources = (config.widgets.sources || { "default" : "widgets" });
    this.use('aura/ext/widgets');
    
    return this;
  }

  /**
   * Creates a brand new sandbox, using the app sandbox object as a prototype
   *
   */
  Aura.prototype.createSandbox = function() {
    var sandbox = Object.create(this.sandbox);
    sandbox.ref = _.uniqueId('sandbox-');
    this.sandboxes[sandbox.ref] = sandbox;
    return sandbox;
  };


  /**
   * Get a sandbox by its ref
   *
   */
  Aura.prototype.getSandbox = function(ref) {
    return this.sandboxes[ref];
  };

  /**
   * Tells the app to init with the given extension.
   *
   * This method can only be called before the app is actually started.
   *
   * @param  {String|Object|Function} ref the reference of the extension
   * @return {Aura}   the Aura app object
   */
  Aura.prototype.use = function(ref) {
    this.extensions.add({ ref: ref, context: this });
    return this;
  };

  /**
   * Adds a new source for widgets
   * 
   * @param {String} name    the name of the source
   * @param {String} baseUrl the base url for those widgets
   */
  Aura.prototype.registerWidgetsSource = function(name, baseUrl) {
    if (this.config.widgets.sources[name]) {
      throw new Error("Widgets source '" + name + "' is already registered");
    }
    this.config.widgets.sources[name] = baseUrl;
    return this;
  };

  /**
   * Application start.
   * Bootstraps the extensions loading process
   * @return {Promise} a promise that resolves when the app is started
   */
  Aura.prototype.start = function(options) {
    var app = this;

    if (app.started) {
      console.error("Aura already started... !");
      return app.extensions.initStatus;
    }

    app.startOptions  = options || {};
    app.started       = true;

    app.extensions.onReady(function(exts) {

      // Then we call all the `afterAppStart` provided by the extensions
      base.util.each(exts, function(i, ext) {
        if (ext && typeof(ext.afterAppStart) === 'function') {
          try {
            ext.afterAppStart(app);  
          } catch(e) {
            console.error("Error on ", (ext.name || ext) , ".afterAppStart callback: (", e.message, ")", e);
          }
        }
      });
    });

    // If there was an error in the boot sequence we 
    // reject every body an do some cleanup
    // TODO: Provide a better error message to the user.
    app.extensions.onFailure(function() {
      console.error("Error initializing app...", app.config.name, arguments);
      app.stop();
    });

    // Finally... we return a promise that allows 
    // to keep track of the loading process...
    // 
    
    return app.extensions.init();
  };

  /**
   * Stops the application and unregister its loaded dependencies.
   * TODO: We need to do a little more cleanup here...
   * @return {void}
   */
  Aura.prototype.stop = function() {
    this.started = false;
    
    // unregisterDeps(this.ref, Object.keys(allDeps.apps[env.appRef] || {}));
  };

  return Aura;
});

define('aura/ext/debug',[], function() {

  

  return {

    name: 'debug',

    initialize: function(app) {}
  };
});

;!function(exports, undefined) {

  var isArray = Array.isArray ? Array.isArray : function _isArray(obj) {
    return Object.prototype.toString.call(obj) === "[object Array]";
  };
  var defaultMaxListeners = 10;

  function init() {
    this._events = {};
    if (this._conf) {
      configure.call(this, this._conf);
    }
  }

  function configure(conf) {
    if (conf) {
      
      this._conf = conf;
      
      conf.delimiter && (this.delimiter = conf.delimiter);
      conf.maxListeners && (this._events.maxListeners = conf.maxListeners);
      conf.wildcard && (this.wildcard = conf.wildcard);
      conf.newListener && (this.newListener = conf.newListener);

      if (this.wildcard) {
        this.listenerTree = {};
      }
    }
  }

  function EventEmitter(conf) {
    this._events = {};
    this.newListener = false;
    configure.call(this, conf);
  }

  //
  // Attention, function return type now is array, always !
  // It has zero elements if no any matches found and one or more
  // elements (leafs) if there are matches
  //
  function searchListenerTree(handlers, type, tree, i) {
    if (!tree) {
      return [];
    }
    var listeners=[], leaf, len, branch, xTree, xxTree, isolatedBranch, endReached,
        typeLength = type.length, currentType = type[i], nextType = type[i+1];
    if (i === typeLength && tree._listeners) {
      //
      // If at the end of the event(s) list and the tree has listeners
      // invoke those listeners.
      //
      if (typeof tree._listeners === 'function') {
        handlers && handlers.push(tree._listeners);
        return [tree];
      } else {
        for (leaf = 0, len = tree._listeners.length; leaf < len; leaf++) {
          handlers && handlers.push(tree._listeners[leaf]);
        }
        return [tree];
      }
    }

    if ((currentType === '*' || currentType === '**') || tree[currentType]) {
      //
      // If the event emitted is '*' at this part
      // or there is a concrete match at this patch
      //
      if (currentType === '*') {
        for (branch in tree) {
          if (branch !== '_listeners' && tree.hasOwnProperty(branch)) {
            listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i+1));
          }
        }
        return listeners;
      } else if(currentType === '**') {
        endReached = (i+1 === typeLength || (i+2 === typeLength && nextType === '*'));
        if(endReached && tree._listeners) {
          // The next element has a _listeners, add it to the handlers.
          listeners = listeners.concat(searchListenerTree(handlers, type, tree, typeLength));
        }

        for (branch in tree) {
          if (branch !== '_listeners' && tree.hasOwnProperty(branch)) {
            if(branch === '*' || branch === '**') {
              if(tree[branch]._listeners && !endReached) {
                listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], typeLength));
              }
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i));
            } else if(branch === nextType) {
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i+2));
            } else {
              // No match on this one, shift into the tree but not in the type array.
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i));
            }
          }
        }
        return listeners;
      }

      listeners = listeners.concat(searchListenerTree(handlers, type, tree[currentType], i+1));
    }

    xTree = tree['*'];
    if (xTree) {
      //
      // If the listener tree will allow any match for this part,
      // then recursively explore all branches of the tree
      //
      searchListenerTree(handlers, type, xTree, i+1);
    }
    
    xxTree = tree['**'];
    if(xxTree) {
      if(i < typeLength) {
        if(xxTree._listeners) {
          // If we have a listener on a '**', it will catch all, so add its handler.
          searchListenerTree(handlers, type, xxTree, typeLength);
        }
        
        // Build arrays of matching next branches and others.
        for(branch in xxTree) {
          if(branch !== '_listeners' && xxTree.hasOwnProperty(branch)) {
            if(branch === nextType) {
              // We know the next element will match, so jump twice.
              searchListenerTree(handlers, type, xxTree[branch], i+2);
            } else if(branch === currentType) {
              // Current node matches, move into the tree.
              searchListenerTree(handlers, type, xxTree[branch], i+1);
            } else {
              isolatedBranch = {};
              isolatedBranch[branch] = xxTree[branch];
              searchListenerTree(handlers, type, { '**': isolatedBranch }, i+1);
            }
          }
        }
      } else if(xxTree._listeners) {
        // We have reached the end and still on a '**'
        searchListenerTree(handlers, type, xxTree, typeLength);
      } else if(xxTree['*'] && xxTree['*']._listeners) {
        searchListenerTree(handlers, type, xxTree['*'], typeLength);
      }
    }

    return listeners;
  }

  function growListenerTree(type, listener) {

    type = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
    
    //
    // Looks for two consecutive '**', if so, don't add the event at all.
    //
    for(var i = 0, len = type.length; i+1 < len; i++) {
      if(type[i] === '**' && type[i+1] === '**') {
        return;
      }
    }

    var tree = this.listenerTree;
    var name = type.shift();

    while (name) {

      if (!tree[name]) {
        tree[name] = {};
      }

      tree = tree[name];

      if (type.length === 0) {

        if (!tree._listeners) {
          tree._listeners = listener;
        }
        else if(typeof tree._listeners === 'function') {
          tree._listeners = [tree._listeners, listener];
        }
        else if (isArray(tree._listeners)) {

          tree._listeners.push(listener);

          if (!tree._listeners.warned) {

            var m = defaultMaxListeners;
            
            if (typeof this._events.maxListeners !== 'undefined') {
              m = this._events.maxListeners;
            }

            if (m > 0 && tree._listeners.length > m) {

              tree._listeners.warned = true;
              console.error('(node) warning: possible EventEmitter memory ' +
                            'leak detected. %d listeners added. ' +
                            'Use emitter.setMaxListeners() to increase limit.',
                            tree._listeners.length);
              console.trace();
            }
          }
        }
        return true;
      }
      name = type.shift();
    }
    return true;
  };

  // By default EventEmitters will print a warning if more than
  // 10 listeners are added to it. This is a useful default which
  // helps finding memory leaks.
  //
  // Obviously not all Emitters should be limited to 10. This function allows
  // that to be increased. Set to zero for unlimited.

  EventEmitter.prototype.delimiter = '.';

  EventEmitter.prototype.setMaxListeners = function(n) {
    this._events || init.call(this);
    this._events.maxListeners = n;
    if (!this._conf) this._conf = {};
    this._conf.maxListeners = n;
  };

  EventEmitter.prototype.event = '';

  EventEmitter.prototype.once = function(event, fn) {
    this.many(event, 1, fn);
    return this;
  };

  EventEmitter.prototype.many = function(event, ttl, fn) {
    var self = this;

    if (typeof fn !== 'function') {
      throw new Error('many only accepts instances of Function');
    }

    function listener() {
      if (--ttl === 0) {
        self.off(event, listener);
      }
      fn.apply(this, arguments);
    };

    listener._origin = fn;

    this.on(event, listener);

    return self;
  };

  EventEmitter.prototype.emit = function() {
    
    this._events || init.call(this);

    var type = arguments[0];

    if (type === 'newListener' && !this.newListener) {
      if (!this._events.newListener) { return false; }
    }

    // Loop through the *_all* functions and invoke them.
    if (this._all) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
      for (i = 0, l = this._all.length; i < l; i++) {
        this.event = type;
        this._all[i].apply(this, args);
      }
    }

    // If there is no 'error' event listener then throw.
    if (type === 'error') {
      
      if (!this._all && 
        !this._events.error && 
        !(this.wildcard && this.listenerTree.error)) {

        if (arguments[1] instanceof Error) {
          throw arguments[1]; // Unhandled 'error' event
        } else {
          throw new Error("Uncaught, unspecified 'error' event.");
        }
        return false;
      }
    }

    var handler;

    if(this.wildcard) {
      handler = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handler, ns, this.listenerTree, 0);
    }
    else {
      handler = this._events[type];
    }

    if (typeof handler === 'function') {
      this.event = type;
      if (arguments.length === 1) {
        handler.call(this);
      }
      else if (arguments.length > 1)
        switch (arguments.length) {
          case 2:
            handler.call(this, arguments[1]);
            break;
          case 3:
            handler.call(this, arguments[1], arguments[2]);
            break;
          // slower
          default:
            var l = arguments.length;
            var args = new Array(l - 1);
            for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
            handler.apply(this, args);
        }
      return true;
    }
    else if (handler) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) args[i - 1] = arguments[i];

      var listeners = handler.slice();
      for (var i = 0, l = listeners.length; i < l; i++) {
        this.event = type;
        listeners[i].apply(this, args);
      }
      return (listeners.length > 0) || this._all;
    }
    else {
      return this._all;
    }

  };

  EventEmitter.prototype.on = function(type, listener) {
    
    if (typeof type === 'function') {
      this.onAny(type);
      return this;
    }

    if (typeof listener !== 'function') {
      throw new Error('on only accepts instances of Function');
    }
    this._events || init.call(this);

    // To avoid recursion in the case that type == "newListeners"! Before
    // adding it to the listeners, first emit "newListeners".
    this.emit('newListener', type, listener);

    if(this.wildcard) {
      growListenerTree.call(this, type, listener);
      return this;
    }

    if (!this._events[type]) {
      // Optimize the case of one listener. Don't need the extra array object.
      this._events[type] = listener;
    }
    else if(typeof this._events[type] === 'function') {
      // Adding the second element, need to change to array.
      this._events[type] = [this._events[type], listener];
    }
    else if (isArray(this._events[type])) {
      // If we've already got an array, just append.
      this._events[type].push(listener);

      // Check for listener leak
      if (!this._events[type].warned) {

        var m = defaultMaxListeners;
        
        if (typeof this._events.maxListeners !== 'undefined') {
          m = this._events.maxListeners;
        }

        if (m > 0 && this._events[type].length > m) {

          this._events[type].warned = true;
          console.error('(node) warning: possible EventEmitter memory ' +
                        'leak detected. %d listeners added. ' +
                        'Use emitter.setMaxListeners() to increase limit.',
                        this._events[type].length);
          console.trace();
        }
      }
    }
    return this;
  };

  EventEmitter.prototype.onAny = function(fn) {

    if(!this._all) {
      this._all = [];
    }

    if (typeof fn !== 'function') {
      throw new Error('onAny only accepts instances of Function');
    }

    // Add the function to the event listener collection.
    this._all.push(fn);
    return this;
  };

  EventEmitter.prototype.addListener = EventEmitter.prototype.on;

  EventEmitter.prototype.off = function(type, listener) {
    if (typeof listener !== 'function') {
      throw new Error('removeListener only takes instances of Function');
    }

    var handlers,leafs=[];

    if(this.wildcard) {
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      leafs = searchListenerTree.call(this, null, ns, this.listenerTree, 0);
    }
    else {
      // does not use listeners(), so no side effect of creating _events[type]
      if (!this._events[type]) return this;
      handlers = this._events[type];
      leafs.push({_listeners:handlers});
    }

    for (var iLeaf=0; iLeaf<leafs.length; iLeaf++) {
      var leaf = leafs[iLeaf];
      handlers = leaf._listeners;
      if (isArray(handlers)) {

        var position = -1;

        for (var i = 0, length = handlers.length; i < length; i++) {
          if (handlers[i] === listener ||
            (handlers[i].listener && handlers[i].listener === listener) ||
            (handlers[i]._origin && handlers[i]._origin === listener)) {
            position = i;
            break;
          }
        }

        if (position < 0) {
          return this;
        }

        if(this.wildcard) {
          leaf._listeners.splice(position, 1)
        }
        else {
          this._events[type].splice(position, 1);
        }

        if (handlers.length === 0) {
          if(this.wildcard) {
            delete leaf._listeners;
          }
          else {
            delete this._events[type];
          }
        }
      }
      else if (handlers === listener ||
        (handlers.listener && handlers.listener === listener) ||
        (handlers._origin && handlers._origin === listener)) {
        if(this.wildcard) {
          delete leaf._listeners;
        }
        else {
          delete this._events[type];
        }
      }
    }

    return this;
  };

  EventEmitter.prototype.offAny = function(fn) {
    var i = 0, l = 0, fns;
    if (fn && this._all && this._all.length > 0) {
      fns = this._all;
      for(i = 0, l = fns.length; i < l; i++) {
        if(fn === fns[i]) {
          fns.splice(i, 1);
          return this;
        }
      }
    } else {
      this._all = [];
    }
    return this;
  };

  EventEmitter.prototype.removeListener = EventEmitter.prototype.off;

  EventEmitter.prototype.removeAllListeners = function(type) {
    if (arguments.length === 0) {
      !this._events || init.call(this);
      return this;
    }

    if(this.wildcard) {
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      var leafs = searchListenerTree.call(this, null, ns, this.listenerTree, 0);

      for (var iLeaf=0; iLeaf<leafs.length; iLeaf++) {
        var leaf = leafs[iLeaf];
        leaf._listeners = null;
      }
    }
    else {
      if (!this._events[type]) return this;
      this._events[type] = null;
    }
    return this;
  };

  EventEmitter.prototype.listeners = function(type) {
    if(this.wildcard) {
      var handlers = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handlers, ns, this.listenerTree, 0);
      return handlers;
    }

    this._events || init.call(this);

    if (!this._events[type]) this._events[type] = [];
    if (!isArray(this._events[type])) {
      this._events[type] = [this._events[type]];
    }
    return this._events[type];
  };

  EventEmitter.prototype.listenersAny = function() {

    if(this._all) {
      return this._all;
    }
    else {
      return [];
    }

  };

  if (typeof define === 'function' && define.amd) {
    define('eventemitter',[],function() {
      return EventEmitter;
    });
  } else {
    exports.EventEmitter2 = EventEmitter; 
  }

}(typeof process !== 'undefined' && typeof process.title !== 'undefined' && typeof exports !== 'undefined' ? exports : window);

define('aura/ext/mediator',['eventemitter','underscore'], function () {
  

  return {
    name: 'mediator',

    require: {
      paths: {
        eventemitter: 'components/eventemitter2/lib/eventemitter2',
        underscore: 'components/underscore/underscore'
      },
      shim: {
        underscore: {
          exports: '_'
        }
      }
    },

    initialize: function (app) {
      var EventEmitter = require('eventemitter');
      var _ = require('underscore');

      app.config.mediator = _.defaults(app.config.mediator || {}, {
        wildcard: true,
        delimiter: '.',
        newListener: true,
        maxListeners: 20
      });

      var mediator = new EventEmitter(app.config.mediator);

      app.core.mediator = mediator;

      app.sandbox.on = function (name, listener) {
        this._events = this._events || [];
        this._events.push({ name: name, listener: listener});

        mediator.on(name, listener);
      };

      app.sandbox.off = function (name, listener) {
        if(!this._events) { return; }
        this._events = _.reject(this._events, function (evt) {
          return (evt.name === name && evt.listener === listener);
        });
        mediator.off(name, listener);
      };

      app.sandbox.emit = function () {
        mediator.emit.apply(mediator, arguments);
      };

      app.sandbox.stopListening = function () {
        if (!this._events) { return; }
        _.each(this._events, function (evt) {
          mediator.off(evt.name, evt.listener);
        });
      };

      var eventName = ['aura', 'sandbox', 'stop'].join(app.config.mediator.delimiter);
      app.core.mediator.on(eventName, function (sandbox) {
        sandbox.stopListening();
      });
    }
  };
});

define('aura/ext/widgets',[], function() {

  

  return function(app) {

    var core = app.core;
    core.Widgets = core.Widgets || {};

    var ownProp = function(obj, key) {
      return Object.prototype.hasOwnProperty.call(obj, key);
    };

    /**
     * Widgets registry
     * @type {Object}
     */
    var registeredWidgets = {};

    /**
     * The base Widget constructor...
     *
     * @param {Object} options the options to init the widget...
     */
    function Widget(options) {
      this.options    = options;
      this._ref       = options._ref;
      this.$el        = core.dom.find(options.el);

      this.initialize.call(this, options);
      return this;
    }

    Widget.prototype.initialize = function() {};

    /**
     * A small helper function to render markup
     *
     * @param  {String} markup the markup to render in the widget's root el
     * @return {Widget} the Widget instance to allow methods chaining...
     */
    Widget.prototype.html = function(markup) {
      var el = this.$el;
      el.html(markup);
      this.sandbox.start(el);
      return this;
    };

    // Stolen from Backbone 0.9.9 !
    // Helper function to correctly set up the prototype chain, for subclasses.
    // Similar to `goog.inherits`, but uses a hash of prototype properties and
    // class properties to be extended.
    var extend = function(protoProps, staticProps) {
      var parent = this;
      var child;
      if (protoProps && ownProp(protoProps, 'constructor')) {
        child = protoProps.constructor;
      } else {
        child = function(){ parent.apply(this, arguments); };
      }
      core.util.extend(child, parent, staticProps);
      var Surrogate = function(){ this.constructor = child; };
      Surrogate.prototype = parent.prototype;
      child.prototype = new Surrogate();
      if (protoProps) { core.util.extend(child.prototype, protoProps); }
      child.__super__ = parent.prototype;
      return child;
    };

    Widget.extend = extend;

    /**
     * Widget loader.
     * @param  {String} name    The name of the Widget to load
     * @param  {Object} options The options to pass to the new widget instance.
     * @return {Promise}        A Promise that resolves to the loaded widget instance.
     */
    Widget.load = function(name, options) {
      // TODO: Make it more simple / or break it down
      // in several functions...
      // it's too big !
      //

      var dfd = core.data.deferred(),
          ref = options.ref,
          widget,
          WidgetConstructor;

      dfd.fail(function(err) {
        console.error("Error loading widget ", name, err);
      });


      // Apply requirejs map / package configuration before the actual loading.
      require.config(options.require);

      // Here, we require the widget's package definition
      require([options.ref], function(widgetDefinition) {

        if (!widgetDefinition) {
          return dfd.reject("widget " + options.ref + " Definition is empty !");
        }

        try {

          // Ok, the widget has already been loaded once, we should already have it in the registry
          if (registeredWidgets[ref]) {
            WidgetConstructor = registeredWidgets[ref];
          } else {

            if (widgetDefinition.type) {
              // If `type` is defined, we use a constructor provided by an extension ? ex. Backbone.
              WidgetConstructor = core.Widgets[widgetDefinition.type];
            } else {
              // Otherwise, we use the stock Widget constructor.
              WidgetConstructor = Widget;
            }

            if (!WidgetConstructor) {
              throw new Error("Can't find widget of type '" +  widgetDefinition.type + "', did you forget to include the extension that provides it ?");
            }

            if (core.util._.isObject(widgetDefinition)) {
              WidgetConstructor = registeredWidgets[ref] = WidgetConstructor.extend(widgetDefinition);
            }
          }

          var sandbox = app.createSandbox();
          options._ref  = core.util._.uniqueId(ref + '+');

          // Here we inject the sandbox in the widget's prototype...
          var ext = { sandbox: sandbox };

          // If the Widget is just defined as a function, we use it as its `initialize` method.
          if (typeof widgetDefinition === 'function') {
            ext.initialize = widgetDefinition;
          }

          WidgetConstructor = WidgetConstructor.extend(ext);

          var newWidget = new WidgetConstructor(options);

          var initialized = core.data.when(newWidget);

          initialized.then(function(ret) { dfd.resolve(ret); });
          initialized.fail(function(err) { dfd.reject(err); });

          return initialized;
        } catch(err) {
          console.error(err.message);
          dfd.reject(err);
        }
      }, function(err) { dfd.reject(err); });

      return dfd.promise();
    };

    /**
     * Parses the widget's options from its element's data attributes.
     *
     * @param  {String|DomNode} el the element
     * @return {Object}         An object that contains the widget's options
     */
    function parseWidgetOptions(el, namespace) {
      var options = { el: el, require: {} }, widgetName, widgetSource;
      var data = core.dom.data(el);

      // Here we go through all the data attributes of the element to build the options object
      core.util.each(data, function(k, v) {
        k = k.replace(new RegExp("^" + namespace), "");
        k = k.charAt(0).toLowerCase() + k.slice(1);

        if (k !== "widget") {
          options[k] = v;
        } else {
          var ref = v.split("@");
          widgetName    = core.util.decamelize(ref[0]);
          widgetSource  = ref[1] || "default";
        }
      });

      var requireContext = require.s.contexts._;
      var widgetsPath    = app.config.widgets.sources[widgetSource] || "widgets";

      // Register the widget a s requirejs package...
      // TODO: packages are not supported by almond, should we find another way to do this ?
      options.ref               = '__widget__$' + widgetName + "@" + widgetSource;
      options.baseUrl           = widgetsPath + "/" + widgetName;
      options.require           = options.require || {};
      options.require.packages  = options.require.packages || [];
      options.require.packages.push({ name: options.ref, location: widgetsPath + "/" + widgetName });
      options.name  = widgetName;
      return options;
    }

    /**
     * Returns a list of widget.
     * If the first argument is a String, it is considered as a DomNode reference
     * We then parse its content to find aura-widgets inside of it.
     *
     * @param  {Array|String} widgets a list of widgets or a reference to a root dom node
     * @return {Array}        a list of widget with their options
     */
    Widget.parseList = function(widgets) {
      if (Array.isArray(widgets)) {
        return widgets;
      }
      var list = [];
      if (widgets && core.dom.find(widgets)) {
        var appNamespace = app.config.namespace;
        var selector = ["[data-aura-widget]"];
        if (appNamespace) { selector.push("[data-" + appNamespace + "-widget]"); }
        selector = selector.join(",");
        core.dom.find(selector, widgets || 'body').each(function() {
          var ns = "aura";
          if (appNamespace && this.getAttribute('data-' + appNamespace +'-widget')) {
            ns = appNamespace;
          }
          var options = parseWidgetOptions(this, ns);
          list.push({ name: options.name, options: options });
        });
      }
      return list;
    };

    /**
     * Actual start method for a list of widgets.
     *
     * @param  {Array|String} widgets cf. `Widget.parseList`
     * @return {Promise} a promise that resolves to a list of started widgets.
     */
    Widget.startAll = function(widgets) {
      var widgetsList = Widget.parseList(widgets);
      var list = [];
      core.util.each(widgetsList, function(i, w) {
        list.push(Widget.load(w.name, w.options));
      });
      return core.data.when.apply(undefined, list);
    };

    return {
      name: 'widgets',

      require: { paths: { text: 'components/requirejs-text/text' } },

      initialize: function(app) {

        // Widgets 'classes' registry...
        app.core.Widgets.Base = Widget;

        // Any idea for a better name ?
        app.core.registerWidgetType = function(type, def) {
          if (app.core.Widgets[type]) {
            throw new Error("Widget type " + type + " already defined");
          }
          app.core.Widgets[type] = Widget.extend(def);
        };

        app.core.start = Widget.startAll;

        app.sandbox.start = function (list) {
          var event = ['aura', 'sandbox', 'start'].join(app.config.mediator.delimiter);
          app.core.mediator.emit(event, this);
          _.invoke(this._children || [], 'stop');
          var self = this;
          Widget.startAll(list).then(function () {
            var widgets   = Array.prototype.slice.call(arguments);
            var children  = [];
            _.each(widgets, function (w) {
              w.sandbox._widget = w;
              w.sandbox._parent = self;
              children.push(w.sandbox);
            });
            self._children = children;
          });
          return this;
        };

        app.sandbox.stop = function() {
          var event = ['aura', 'sandbox', 'stop'].join(app.config.mediator.delimiter);
          _.invoke(this._children, 'stop');
          app.core.mediator.emit(event, this);
          this.stopped  = true;
          delete app.sandboxes[this.ref];
          return this;
        };
      },

      afterAppStart: function(app) {
        // Auto start widgets when the app is loaded.
        if (app.startOptions.widgets) {
          app.core.start(app.startOptions.widgets);
        }
      }

    };
  };
});
