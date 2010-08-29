require.paths.unshift('./vendor')

REST = require('./rest').Client
sys = require 'sys'
Twitter = require './twitter'
mongo = require('./mongo')

mongo.mongoose.model 'Link',
  properties: ['url','title','user_id',{'status':['id','text',{'user':['screen_name','name']},'created_at']}]
  static:
    fromStatus:(status)->
      links = []
      if status.entities.urls
        for url in status.entities.urls
          l = new this.constructor()
          l.url = url.url
          l.status.id = status.id
          l.status.text = status.text
          l.status.user.screen_name = status.user.screen_name
          l.status.user.name = status.user.name
          l.status.created_at = status.created_at
          l.save
          links.push l
      links
  methods:
    fetchContent:->
      self = this
      REST.get this.url,(response)->
        if response.status >= 200 && response.status < 300
          title_match = response.body.match /<title>(.*)<\/title>/i
          if title_match
            self.title = title_match[1]
            sys.puts "[Link] Title fetched successfully. (#{self.title})"
            self.save()
        
exports.Link = mongo.db.model 'Link'