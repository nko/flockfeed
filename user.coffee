require.paths.unshift('./vendor')

sys = require 'sys'
crypto = require 'crypto'
Twitter = require './twitter'
mongo = require './mongo'

mongo.mongoose.model 'User',
  properties: ['id','name', 'screen_name', 'key', access:['token','secret'], 'last_fetched', 'since_id']
  indexes:['id','key']
  cast:
    id:Number
  static:
    findById:(id, callback)->
      this.find('id':id).first(callback)
    fetchOutdated:(since)->
      this.find('last_fetched':{'$lt':since}).all (users)->
        for user in users
          sys.puts "  " + user.id + " " + user.last_fetched
          user.last_fetched = new Date()
          user.save
  getters:
    client: ->
      new Twitter.client(this.access.token, this.access.secret)
  methods:
    save:(callback)->
      this.key = crypto.createHash('sha1').update("--#{this._id}--url-hash").digest('hex')
      wasNew = this.isNew ? true : false
      this.__super__ ->
        if wasNew
          setTimeout this.fetch, 0
          callback()
    fetch:(callback)->
      this.client.get '/statuses/home_timeline', (statuses)->
        callback(statuses)

exports.User = mongo.db.model 'User'
