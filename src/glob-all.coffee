Glob = require("glob").Glob
EventEmitter = require("events").EventEmitter

# helper class to store and compare glob results
class File
  stars: /((\/\*\*)?\/\*)?\.(\w+)$/,
  constructor: (@pattern, @patternId, @path, @fileId) ->
    @include = true
    while @pattern.charAt(0) is "!"
      @include = not @include
      @pattern = @pattern.substr 1

  #strip stars and compare pattern length
  #longest length wins
  compare: (other) ->
    p1 = @pattern.replace @stars, ''
    p2 = other.pattern.replace @stars, ''
    if p1.length > p2.length then @ else other

  toString: ->
    "#{@path} (#{@patternId}: #{@fileId}: #{@pattern})"

# allows the use arrays with 'node-glob'
# interatively combines the resulting arrays
# api is exactly the same
class GlobAll extends EventEmitter
  constructor: (sync, patterns, opts = {}, callback) ->
    super()
    #init array
    if typeof patterns is 'string'
      patterns = [patterns]
    unless patterns instanceof Array
      throw new TypeError 'Invalid input'
    #use copy of array
    @patterns = patterns.slice()
    #no opts provided
    if typeof opts is 'function'
      callback = opts
      opts = {}
    #allow sync+nocallback or async+callback
    if sync isnt (typeof callback isnt 'function')
      throw new Error "should#{if sync then ' not' else ''} have callback"
    #all globs share the same stat cache
    @statCache = opts.statCache = opts.statCache or {}
    opts.sync = sync
    @opts = opts
    @set = {}
    @results = null
    @globs = []
    @callback = callback
    #bound functions
    @globbedOne = @globbedOne.bind @

  run: ->
    @globNext()
    return @results

  globNext: ->
    if @patterns.length is 0
      return @globbedAll()
    pattern = @patterns[0] #peek!
    #run
    if @opts.sync
      #sync - callback straight away
      g = new Glob pattern, @opts
      @globs.push g
      @globbedOne null, g.found
    else
      #async
      g = new Glob pattern, @opts, @globbedOne
      @globs.push g
    return

  #collect results
  globbedOne: (err, files) ->
    #handle callback error early
    if err
      @emit 'error', err if !@callback
      @removeAllListeners()
      @callback err if @callback
      return;
    patternId  = @patterns.length
    pattern = @patterns.shift()
    #insert each into the results set
    for path, fileId in files
      #convert to file instance
      f = new File pattern, patternId, path, fileId
      existing = @set[path]
      #new item
      if not existing
        if f.include
          @set[path] = f
          @emit 'match', path
        continue
      #compare or delete
      if f.include
        @set[path] = f.compare existing
      else
        delete @set[path]
    #run next
    @globNext()
    return

  globbedAll: ->
    #map result set into an array
    files = []
    for k,v of @set
      files.push v
    #sort files by index
    files.sort (a,b) ->
      return 1 if a.patternId < b.patternId
      return -1 if a.patternId > b.patternId
      return if a.fileId >= b.fileId then 1 else -1
    #finally, convert back into a path string
    @results = files.map (f) ->
      f.path
    @emit 'end'
    @removeAllListeners()
    #return string paths
    unless @opts.sync
      @callback null, @results
    return @results

#expose
globAll = module.exports = (array, opts, callback) ->
  g = new GlobAll false, array, opts, callback
  g.run()
  return g

#sync is actually the same function :)
globAll.sync = (array, opts) ->
  g = new GlobAll true, array, opts
  return g.run()
