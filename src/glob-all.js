var EventEmitter, File, Glob, GlobAll, globAll, util,

util = require("util");

Glob = require("glob").Glob;

EventEmitter = require("events").EventEmitter;

// helper class to store and compare glob results
File = (function() {
  File.prototype.stars = /((\/\*\*)?\/\*)?\.(\w+)$/;

  function File(pattern1, patternId1, path1, fileId1) {
    this.pattern = pattern1;
    this.patternId = patternId1;
    this.path = path1;
    this.fileId = fileId1;
    this.include = true;
    while (this.pattern.charAt(0) === "!") {
      this.include = !this.include;
      this.pattern = this.pattern.substr(1);
    }
  }

  // strip stars and compare pattern length
  // longest length wins
  File.prototype.compare = function(other) {
    var p1, p2;
    p1 = this.pattern.replace(this.stars, "");
    p2 = other.pattern.replace(this.stars, "");
    if (p1.length > p2.length) {
      return this;
    } else {
      return other;
    }
  };

  File.prototype.toString = function() {
    return this.path + " (" + this.patternId + ": " + this.fileId + ": " + this.pattern + ")";
  };

  return File;
})();

// using standard node inheritance
util.inherits(GlobAll, EventEmitter);

// allows the use arrays with "node-glob"
// interatively combines the resulting arrays
// api is exactly the same
GlobAll = (function() {
  function GlobAll(sync, patterns, opts, callback) {
    if (opts == null) {
      opts = {};
    }
    GlobAll.__super__.constructor.call(this);
    // init array
    if (typeof patterns === "string") {
      patterns = [patterns];
    }
    if (!(patterns instanceof Array)) {
      throw new TypeError("Invalid input");
    }
    // use copy of array
    this.patterns = patterns.slice();
    // no opts provided
    if (typeof opts === "function") {
      callback = opts;
      opts = {};
    }
    // allow sync+nocallback or async+callback
    if (sync !== (typeof callback !== "function")) {
      throw new Error("should" + (sync ? " not" : "") + " have callback");
    }
    // all globs share the same stat cache
    this.statCache = opts.statCache = opts.statCache || {};
    opts.sync = sync;
    this.opts = opts;
    this.set = {};
    this.results = null;
    this.globs = [];
    this.callback = callback;
    // bound functions
    this.globbedOne = this.globbedOne.bind(this);
  }

  GlobAll.prototype.run = function() {
    this.globNext();
    return this.results;
  };

  GlobAll.prototype.globNext = function() {
    var g, pattern;
    if (this.patterns.length === 0) {
      return this.globbedAll();
    }
    pattern = this.patterns[0]; // peek!
    // run
    if (this.opts.sync) {
      // sync - callback straight away
      g = new Glob(pattern, this.opts);
      this.globs.push(g);
      this.globbedOne(null, g.found);
    } else {
      // async
      g = new Glob(pattern, this.opts, this.globbedOne);
      this.globs.push(g);
    }
  };

  // collect results
  GlobAll.prototype.globbedOne = function(err, files) {
    var existing, f, fileId, i, len, path, pattern, patternId;
    // handle callback error early
    if (err) {
      if (!this.callback) {
        this.emit("error", err);
      }
      this.removeAllListeners();
      if (this.callback) {
        this.callback(err);
      }
      return;
    }
    patternId = this.patterns.length;
    pattern = this.patterns.shift();
    // insert each into the results set
    for (fileId = i = 0, len = files.length; i < len; fileId = ++i) {
      // convert to file instance
      path = files[fileId];
      f = new File(pattern, patternId, path, fileId);
      existing = this.set[path];
      // new item
      if (!existing) {
        if (f.include) {
          this.set[path] = f;
          this.emit("match", path);
        }
        continue;
      }
      // compare or delete
      if (f.include) {
        this.set[path] = f.compare(existing);
      } else {
        delete this.set[path];
      }
    }
    // run next
    this.globNext();
  };

  GlobAll.prototype.globbedAll = function() {
    var files, k, ref, v;
    // map result set into an array
    files = [];
    ref = this.set;
    for (k in ref) {
      v = ref[k];
      files.push(v);
    }
    // sort files by index
    files.sort(function(a, b) {
      if (a.patternId < b.patternId) {
        return 1;
      }
      if (a.patternId > b.patternId) {
        return -1;
      }
      if (a.fileId >= b.fileId) {
        return 1;
      } else {
        return -1;
      }
    });
    // finally, convert back into a path string
    this.results = files.map(function(f) {
      return f.path;
    });
    this.emit("end");
    this.removeAllListeners();
    // return string paths
    if (!this.opts.sync) {
      this.callback(null, this.results);
    }
    return this.results;
  };

  return GlobAll;
});

// expose
globAll = module.exports = function(array, opts, callback) {
  var g;
  g = new GlobAll(false, array, opts, callback);
  g.run();
  return g;
};

// sync is actually the same function :)
globAll.sync = function(array, opts) {
  var g;
  g = new GlobAll(true, array, opts);
  return g.run();
};
