glob = require "glob"
async = require "async"

# allows the use arrays with 'node-glob'
# interatively combines the resulting arrays
# api is exactly the same
class File
  constructor: (@pattern, @globId, @path, @fileId) ->
    @include = true
    while @pattern.charAt(0) is "!"
      @include = not @include
      @pattern = @pattern.substr 1

  #strip stars and compare pattern length
  #longest length wins
  compare: (other) ->
    stars = /((\/\*\*)?\/\*)?\.(\w+)$/
    p1 = @pattern.replace stars, ''
    p2 = other.pattern.replace stars, ''
    if p1.length > p2.length then @ else other

  toString: ->
    "#{@path} (#{@fileId}: #{@pattern}"

class GlobAll
  constructor: (@array, @opts, @callback) ->
    @sync = typeof @callback isnt 'function'
    @items = []

  run: ->
    async.parallel @array.filter((str, i) =>
      if /^(\w+:)?\/\//.test str
        @items.push new File str, i
        return false
      return true
    ).map((str, globId) =>
      @globOne str, globId
    ), @globbedAll.bind @
    return @results

  globOne: (pattern, globId) ->
    (callback) =>
      gotFiles = (error, files) ->
        if files
          files = files.map (f, fileId) -> new File pattern, globId, f, fileId
        callback error, files
        return
      #sync - callsback straight away
      if @sync
        # console.log @opts
        gotFiles null, glob.sync pattern, @opts
      else
        #async      
        glob pattern, @opts, gotFiles
      return

  globbedAll: (err, allFiles) ->
    #use object as set
    set = {}

    #include and exclude
    for files in allFiles
      for f in files
        path = f.path
        existing = set[path]
        #new item
        if not existing          
          set[path] = f if f.include
          continue
        #compare or delete
        if f.include
          set[path] = f.compare existing
        else
          delete set[path]

    #map remaing files into an array
    files = []
    files.push v for k,v of set

    #sort files by index
    files.sort (a,b) ->
      return -1 if a.globId < b.globId 
      return 1 if a.globId > b.globId 
      return if a.fileId >= b.fileId then 1 else -1

    @results = files.map (f) -> f.path
    #return string paths
    unless @sync
      @callback null, @results
    return @results

#expose
globAll = module.exports = (array, opts, callback) ->
  if typeof array is 'string'
    array = [array]
  unless array instanceof Array
    throw new TypeError 'Invalid input'
  if typeof opts is 'function'
    callback = opts
    opts = {}
  all = new GlobAll array, opts, callback
  return all.run()
#sync is actually the same function :)
globAll.sync = globAll


