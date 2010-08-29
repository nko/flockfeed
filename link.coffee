require.paths.unshift('./vendor')

REST = require('./rest').Client
sys = require 'sys'
Twitter = require './twitter'
mongo = require('./mongo')

mongo.mongoose.model 'Link',
  properties: ['url','title','user_id',{'status':['id','text',{'user':['screen_name','name']},'created_at']}]
  static:
    fromStatus:(status)->
      if status.entities.urls
        for url in status.entities.urls
          l = new this.constructor()
          l.url = url.url
          l.status = 
            id:status.id
            text:status.text
            user:
              screen_name:status.user.screen_name
              name:status.user.name
            created_at:status.created_at
          l.save
  methods:
    save:(callback)->
      this.__super__(callback)
      unless this.title
        fetchContent()
    fetchContent:->
      REST.get this.url,(response)->
        if response.status >= 200 && response.status < 300
          title_match = response.body.match(/<title>(.*)<\/title>/i)
          if title_match
            this.title = title_match[1]
            sys.puts "Link] Title fetched successfully. (#{this.title})"
            this.save
        
exports.Link = mongo.db.model 'Link'