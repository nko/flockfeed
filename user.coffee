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
    fetch:(id)->
      this.findById id,(user)->
        user.fetch()
  getters:
    client: ->
      new Twitter.client(this.access.token, this.access.secret)
  methods:
    save:(callback)->
      this.key = crypto.createHash('sha1').update("--#{this._id}--url-hash").digest('hex')
      this.__super__ callback
    links:(callback)->
      Link.find().where('user_id',this.id).sort('status.created_at',-1).all (arr)->  
        callback(arr)
    fetch:(callback)->
      path = '/statuses/home_timeline.json?include_entities=true&count=200'
      path += "&since_id=#{this.since_id}" if this.since_id
      self = this
      this.client.get path, (statuses)->
        if statuses[0]
          self.since_id = statuses[0].id
        for status in statuses
          if status.entities.urls
            for url in status.entities.urls
              sys.puts "[Link] Creating '#{url.url}' from status '#{status.id}'"
              links = Link.fromStatus(self,status)
              for link in links
                link.fetchContent()
        self.last_fetched = new Date()
        self.save()

exports.User = mongo.db.model 'User'
