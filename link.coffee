require.paths.unshift('./vendor')

REST = require('./rest').Client
sys = require 'sys'
Logger = require('./log').Logger
Twitter = require './twitter'
mongo = require('./mongo')
Readability = require('./readability').Client
Content = require('./content').Content

mongo.mongoose.model 'Link',
  properties: ['url','redirects','title','user_id', 'content', {'status':['id','text',{'user':['screen_name','name']},'created_at']}]
  indexes:['user_id',{'status.created_at':-1}]
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
    generateWelcome:(user,callback)->
      l = new this.constructor(
        user_id:user.id
        url:'http://flockfeeds.com/home'
        status:
          id:1
          text:"Welcome to FlockFeeds!"
          user:
            screen_name:'flockfeeds'
            name:'FlockFeeds'
        content:'''
                <p>Welcome to your FlockFeed! This should soon be filled with
                a myriad of interesting links pulled directly from the people
                you follow.</p>
                
                <p>Your FlockFeed will continue to update indefinitely without
                you having to do any more work. However, if you happen to lose
                the link, you can always head back to 
                <a href='http://flockfeeds.com'>the FlockFeeds site</a> and log
                back in to retrieve it.</p>
                
                <p>Thanks for signing up, and we hope you enjoy your feed!</p>
                '''
      )
      l.save ->
        callback()
  getters:
    xmlDate:->
      d = new Date(Date.parse(this.status.created_at))
      "#{d.getUTCFullYear()}-#{d.getUTCMonth()}-#{d.getUTCDate()}T#{d.getUTCHours()}:#{d.getUTCMinutes()}:#{d.getUTCSeconds()}"
  methods:
    fetchContent:->
      try
        self = this
        REST.get this.url,(response)->
          unless response
            self.content = ''
            self.save()
            return
            
          if response.status >= 200 && response.status < 300
            content_type = response.headers['Content-Type'] || response.headers['content-type']
            Logger.debug "Link", "Content Type: #{content_type}"
            if content_type.indexOf('image') >= 0
              self.content = "<body><p><img src='#{res.body}'></p></body>"
              self.save()
            else if content_type.indexOf('text/html') >= 0
              Logger.debug "Link", "Fetched successfully (#{self.url})"
              Content.for self, response.body, (result)->
                self.content = result.content
                self.title = result.title
                self.save()
            else
              self.content = ''
              self.save()
              
          # Follow redirects to their source!
          else if [300,301,302,303,305,307].indexOf(response.status) != -1 and self.redirects <= 3
            location = response.headers['Location'] || response.headers['location']
            Logger.debug "Link", "#{self.url} is a redirect, following to #{location}"
            self.url = location
            self.redirects ||= 0
            self.redirects += 1
            self.save ->
              self.fetchContent()
      catch error
        Logger.warn "Link", "#{self.url} could not be fetched."
        
exports.Link = mongo.db.model 'Link'