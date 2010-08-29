require.paths.unshift('./vendor')

sys = require 'sys'
Logger = require('./log').Logger
crypto = require 'crypto'
Twitter = require './twitter'
mongo = require './mongo'
Link = require('./link').Link
chain = require('./vendor/.npm/chain-gang/active/package/lib').create({ workers: (parseInt(process.env.WORKERS) || 5) })

mongo.mongoose.model 'User',
  properties: ['last_fetched', 'since_id','id','name', 'screen_name', 'key', access:['token','secret']]
  indexes:['id','key']
  cast:
    id:Number
  static:
    findById:(id, callback)->
      this.find('id':id).first(callback)
    fetchOutdated:(since, callback)->
      self = this
      self.find('last_fetched':{'$lte':since}).all (stale)->
        self.find().where('last_fetched',null).all (virgin)->
          users = stale.concat(virgin)
          for user in users
            user.fetch()
          callback()
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
      Link.find().where('user_id',this.id).sort([['status.created_at',-1]]).all (arr)->  
        callback(arr)
    job: (timeout, link) ->
      (worker) ->
        link.fetchContent ->
          worker.finish()
    fetch:(callback)->
      if this.since_id
        count = 200
      else
        count = 30
        
      path = "/statuses/home_timeline.json?include_entities=true&count=#{count}"
      path += "&since_id=#{this.since_id}" if this.since_id
      self = this
      this.client.get path, (statuses)->
        Logger.debug "asdf", "#{statuses.length}"
        self.last_fetched = new Date()
        if statuses[0]
          self.since_id = statuses[0].id
        self.save()          
        for status in statuses
          if status.entities.urls
            for url in status.entities.urls
              Logger.debug "Link", "Creating '#{url.url}' from status '#{status.id}'"
              links = Link.fromStatus(self,status)
              for link in links
                Logger.debug "User", "Adding job to retrieve url #{link.url}"
                chain.add self.job("#{parseInt(process.env.WORKER_TIMEOUT) || 10}", link), "#{link._id}"

exports.User = mongo.db.model 'User'
