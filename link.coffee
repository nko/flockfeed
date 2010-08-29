require.paths.unshift('./vendor')

REST = require('./rest').Client
sys = require 'sys'
Twitter = require './twitter'
mongo = require('./mongo')

mongo.mongoose.model 'Link',
  properties: ['url','redirects','title','user_id',{'status':['id','text',{'user':['screen_name','name']},'created_at']}]
  static:
    fromStatus:(user, status)->
      links = []
      if status.entities.urls
        for url in status.entities.urls
          l = new this.constructor()
          l.user_id = user.id
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
          title_match = response.body.match /<title>(.*)<\/title>/mi
          if title_match
            self.title = title_match[1].replace(/^\s+|\s+$/g, '')
            sys.puts "[Link] Title fetched successfully. (#{self.title})"
            self.save()
        # Follow redirects to their source!
        else if response.status >= 300 && response.status < 400 and self.redirects <= 3
          location = response.headers['Location'] || response.headers['location']
          sys.puts "[Link] #{self.url} is a redirect, following to #{location}"
          self.url = location
          self.redirects ||= 0
          self.redirects += 1
          self.save ->
            self.fetchContent()
        
exports.Link = mongo.db.model 'Link'