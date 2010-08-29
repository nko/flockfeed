require.paths.unshift './vendor'

require 'express'

sys = require 'sys'
url = require 'url'
connect = require 'connect'
express = require 'express'
ejs = require 'ejs'
Logger = require('./log').Logger
Twitter = require './twitter'
User = require('./user').User
REST = require('./rest').Client
Readability = require('./readability').Client
hoptoad = require('hoptoad-notifier').Hoptoad
    
# Setup Hoptoad Notification

# debugging
pp = (obj) -> sys.puts sys.inspect(obj)

# helpers
login_required = (req, res, success_callback) ->
  if req.session['user_id']
    User.findById parseInt(req.session.user_id), (current_user)->
      success_callback(current_user)
  else
    pp "login_required: redirecting to /"
    res.redirect '/'

app = express.createServer connect.cookieDecoder(), connect.session(), express.staticProvider(__dirname + '/public'), express.logger({ format: ':method :url [:status] (:response-time ms)' })
app.set 'view engine', 'ejs'

app.error (err,req,res,next)->
  if process.env.RACK_ENV == 'production'
    hoptoad.key = '63da924b138bae57d1066c46accddbe7'
    hoptoad.notify(err)
  
  res.render 'error.ejs',
    status: 500

app.get '/', (req,res)->
  res.render 'splash.ejs'

app.get '/sign_in', (req, res)->
  Twitter.consumer.getOAuthRequestToken (error, token, secret, url, params)->
    if error
      res.send error
    else
      req.session['req.token'] = token
      req.session['req.secret'] = secret
      res.redirect "http://api.twitter.com/oauth/authenticate?oauth_token=#{token}"

app.get '/oauth/callback', (req, res)->
  unless req.session['req.token']
    res.redirect '/sign_in'
    return

  Twitter.consumer.getOAuthAccessToken req.session['req.token'], req.session['req.secret'], (error, access_token, access_secret, params)->
    throw error if error
    twitter = new Twitter.client(access_token, access_secret)

    twitter.get '/account/verify_credentials.json', (hash)->
      User.find().where('id',hash.id).first (user)->
        if user
          Logger.info "User", "Existing user logged in."
          req.session.user_id = user.id
          res.redirect '/home'
        else
          Logger.info "User", "Creating new user."
          user = new User()
          user.id = hash.id
          user.screen_name = hash.screen_name
          user.name = hash.name
          user.access.token = access_token
          user.access.secret = access_secret
          user.save ->
            req.session.user_id = user.id
            res.redirect '/home'
            process.nextTick ->
              user.fetch()

app.get '/populating', (req,res)->
  login_required req, res, (current_user)->
    res.render 'populating.ejs', locals:
      current_user:current_user

app.get '/ready.json', (req,res)->
  res.header 'Content-Type', 'application/json'
  if req.session.user_id
    Link.find().where('user_id':req.session.user_id).first (user)->
      if user
        res.send JSON.stringify(success:'Ready to go.')
      else
        res.send JSON.stringify(error:'Still working.'), 408
  else
    res.send JSON.stringify(error:'Not logged in.'), 401
  

app.get '/home', (req,res)->
  login_required req, res, (current_user) ->
    res.render 'home.ejs', 
      locals:
        current_user:current_user
        
app.get '/readability', (req, res)->
  if typeof(req.param('url')) == 'undefined'
    res.redirect 'home'
    return

  REST.get req.param('url'), (response)->
    Readability.parse response.body, (result)->
      res.render 'readability.ejs', locals:
        { content: result.content, url: req.param('url') }

app.get '/feeds/:key', (req, res) ->
  User.find(key:req.params.key).first (user)->
    unless user
      res.send '404 Not Found', 404
      return
      
    user.links (linkies)->
      res.header 'Content-Type', 'application/atom+xml'      
      res.render 'atom.ejs',
        layout: false
        locals:
          user: user
          links: linkies

app.get '/admin/logs', (req, res)->
  Logger.fetch (logs)->
    res.render 'logs.ejs',
      locals:
        logs:logs

# periodically fetch user timelines
pollInterval = 30 # seconds
work = ->
  process.nextTick ->
    try
      Logger.info "Worker", "Refreshing feeds..."
      since = new Date(new Date().getTime() - pollInterval * 1000)
      User.fetchOutdated since, ->
        Logger.info "Worker", "Finished, starting again in #{pollInterval} seconds."
        setTimeout work, pollInterval * 1000
    catch error
      Logger.warn "Worker", "Caught exception trying to refetch."
work()

app.listen parseInt(process.env.PORT) || 3000