

assert = require 'assert'
glob = require '../'

describe 'math', ->
  describe 'add', ->
    it 'should be 2', ->
      assert.equal(1+1,2)