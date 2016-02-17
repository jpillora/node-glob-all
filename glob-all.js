// Generated by CoffeeScript 1.7.1
(function() {
  var EventEmitter, File, Glob, GlobAll, globAll,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Glob = require("glob").Glob;

  EventEmitter = require("events").EventEmitter;

  File = (function() {
    File.prototype.stars = /((\/\*\*)?\/\*)?\.(\w+)$/;

    function File(pattern, patternId, path, fileId) {
      this.pattern = pattern;
      this.patternId = patternId;
      this.path = path;
      this.fileId = fileId;
      this.include = true;
      while (this.pattern.charAt(0) === "!") {
        this.include = !this.include;
        this.pattern = this.pattern.substr(1);
      }
    }

    File.prototype.compare = function(other) {
      var p1, p2;
      p1 = this.pattern.replace(this.stars, '');
      p2 = other.pattern.replace(this.stars, '');
      if (p1.length > p2.length) {
        return this;
      } else {
        return other;
      }
    };

    File.prototype.toString = function() {
      return "" + this.path + " (" + this.patternId + ": " + this.fileId + ": " + this.pattern + ")";
    };

    return File;

  })();

  GlobAll = (function(_super) {
    __extends(GlobAll, _super);

    function GlobAll(sync, patterns, opts, callback) {
      if (opts == null) {
        opts = {};
      }
      GlobAll.__super__.constructor.call(this);
      if (typeof patterns === 'string') {
        patterns = [patterns];
      }
      if (!(patterns instanceof Array)) {
        throw new TypeError('Invalid input');
      }
      this.patterns = patterns;
      if (typeof opts === 'function') {
        callback = opts;
        opts = {};
      }
      if (sync !== (typeof callback !== 'function')) {
        throw new Error("should" + (sync ? ' not' : '') + " have callback");
      }
      this.statCache = opts.statCache = opts.statCache || {};
      opts.sync = sync;
      this.opts = opts;
      this.set = {};
      this.results = null;
      this.globs = [];
      this.callback = callback;
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
      pattern = this.patterns[0];
      if (this.opts.sync) {
        g = new Glob(pattern, this.opts);
        this.globs.push(g);
        this.globbedOne(null, g.found);
      } else {
        g = new Glob(pattern, this.opts, this.globbedOne);
        this.globs.push(g);
      }
    };

    GlobAll.prototype.globbedOne = function(err, files) {
      var existing, f, fileId, path, pattern, patternId, _i, _len;
      if (err) {
        this.emit('error', err);
        this.removeAllListeners();
        if (this.callback) {
          this.callback(err);
        }
        return;
      }
      patternId = this.patterns.length;
      pattern = this.patterns.shift();
      for (fileId = _i = 0, _len = files.length; _i < _len; fileId = ++_i) {
        path = files[fileId];
        f = new File(pattern, patternId, path, fileId);
        existing = this.set[path];
        if (!existing) {
          if (f.include) {
            this.set[path] = f;
            this.emit('match', path);
          }
          continue;
        }
        if (f.include) {
          this.set[path] = f.compare(existing);
        } else {
          delete this.set[path];
        }
      }
      this.globNext();
    };

    GlobAll.prototype.globbedAll = function() {
      var files, k, v, _ref;
      files = [];
      _ref = this.set;
      for (k in _ref) {
        v = _ref[k];
        files.push(v);
      }
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
      this.results = files.map(function(f) {
        return f.path;
      });
      this.emit('end');
      this.removeAllListeners();
      if (!this.opts.sync) {
        this.callback(null, this.results);
      }
      return this.results;
    };

    return GlobAll;

  })(EventEmitter);

  globAll = module.exports = function(array, opts, callback) {
    var g;
    g = new GlobAll(false, array, opts, callback);
    g.run();
    return g;
  };

  globAll.sync = function(array, opts) {
    var g;
    g = new GlobAll(true, array, opts);
    return g.run();
  };

}).call(this);
