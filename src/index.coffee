glob = require "glob"
async = require "async"
_ = require "lodash"

# allows the use arrays with 'node-glob'
# interatively combines the resulting arrays
# api is exactly the same
class File
  constructor: (@pattern, @path, @index) ->

  #strip stars and compare pattern length
  #longest length wins
  compare: (other) ->
    stars = /((\/\*\*)?\/\*)?\.(\w+)$/
    p1 = @pattern.replace stars, ''
    p2 = other.pattern.replace stars, ''
    if p1.length > p2.length then @ else other

  toString: ->
    "#{@path} (#{@index}: #{@pattern}"

class GlobArrayRun
  constructor: (@array, @opts = {}, @callback) ->
    unless typeof @callback is 'function'
      return throw "Callback required"

    if typeof @array is 'string'
      return glob @array, @opts, @callback

    unless @array instanceof Array
      return @callback "Array required"

    _.bindAll @
    @items = []
    
    globFns = []
    _.each @array, (str, i) =>
      #has protocol - cant glob
      if str.match /^(\w+:)?\/\//
        @items.push new File str, str, i
      else
        globFns.push @makeGlobFn str, i

    async.parallel globFns, @complete

  makeGlobFn: (pattern, i) ->
    (callback) =>
      glob pattern, @opts, (error, matches) =>

        if error isnt null
          return callback error

        for match in matches
          @items.push new File pattern, match, i

        callback null

  complete: ->

    #use object as set
    obj = {}
    _.each @items, (current) ->
      path = current.path
      existing = obj[path]

      if existing
        obj[path] = current.compare existing
      else
        obj[path] = current

    #map remaing files into an array
    files = _.values obj

    #sort files by index
    files.sort (a,b) ->
      if a.index >= b.index then 1 else -1

    #return string paths
    @callback null, files.map (f) -> f.path

globArray = (array, opts, callback) ->
  if typeof opts is 'function' and callback is `undefined`
    callback = opts
    opts = {}
  new GlobArrayRun(array, opts, callback)
  null

module.exports = globArray

# globArray([
#     "./build/dev/scripts/init.js"
#     "./build/dev/scripts/filters/*.js"
#     "./build/dev/scripts/directives/*.js"
#     "./build/dev/scripts/services/*.js"
#     "./build/dev/scripts/controllers/*.js"
#     "./build/dev/scripts/run.js"
#   ],
#   ((err, files) -> console.log err or files))






