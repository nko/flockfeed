require.paths.unshift('./vendor')

sys = require 'sys'
crypto = require 'crypto'
Twitter = require './twitter'
mongo = require './mongo'
Link = require('./link').Link

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
          user.fetch()
  getters:
    client: ->
      new Twitter.client(this.access.token, this.access.secret)
  methods:
    save:(callback)->
      this.key = crypto.createHash('sha1').update("--#{this._id}--url-hash").digest('hex')
      this.__super__ callback
    fetch:(callback)->
      path = '/statuses/home_timeline.json?include_entities=true&count=200'
      path += "&since_id=#{this.since_id}" if this.since_id
      this.client.get path, (statuses)->
        for status in statuses
          if status.entities.urls
            for url in status.entities.urls
              sys.puts "[Link] Creating '#{url.url}' from status '#{status.id}'"
              links = Link.fromStatus(status)
              for link in links
                link.fetchContent()
      this.last_fetched = new Date()
      this.save()

exports.User = mongo.db.model 'User'
