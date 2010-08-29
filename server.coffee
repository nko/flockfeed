require.paths.unshift './vendor'

require 'express'

sys = require 'sys'
url = require 'url'
connect = require 'connect'
express = require 'express'
ejs = require 'ejs'
Twitter = require './twitter'
User = require('./user').User
REST = require('./rest').Client
Readability = require('./readability').Client

# Setup Hoptoad Notification
if process.env.RACK_ENV == 'production'
  hoptoad = require('hoptoad-notifier').Hoptoad
  hoptoad.key = '63da924b138bae57d1066c46accddbe7'
  process.addListener 'uncaughtException', (error)->
    hoptoad.notify(error)

# debugging
pp = (obj) -> sys.puts sys.inspect(obj)

# helpers
login_required = (req, res, success_callback) ->
  pp req.session
  if req.session['user_id']
    User.findById parseInt(req.session.user_id), (current_user)->
      success_callback(current_user)
  else
    pp "login_required: redirecting to /"
    res.redirect '/'

app = express.createServer connect.cookieDecoder(), connect.session(), express.staticProvider(__dirname + '/public'), express.logger({ format: ':method :url [:status] (:response-time ms)' })
app.set 'view engine', 'ejs'

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

    sys.puts "Retrieving user info..."
    twitter.get '/account/verify_credentials.json', (hash)->
      sys.puts "Creating user in Mongo..."
      User.find().where('id',hash.id).first (user)->
        if user
          sys.puts sys.inspect(user)
          sys.puts "Found existing user..."
          req.session.user_id = user.id
          res.redirect '/home'
        else
          sys.puts "Creating new user..."
          user = new User()
          user.id = hash.id
          user.screen_name = hash.screen_name
          user.name = hash.name
          user.access.token = access_token
          user.access.secret = access_secret
          user.save ->
            sys.puts sys.inspect(user)
            req.session.user_id = user.id
            res.redirect '/home'
            process.nextTick ->
              user.fetch()

app.get '/home', (req,res)->
  login_required req, res, (current_user) ->
    res.render 'home.ejs', locals:
      current_user:current_user

app.get '/readability', (req, res)->
  if typeof(req.param('url')) == 'undefined'
    res.redirect 'home'
    return

  REST.get req.param('url'), (response)->
    Readability.parse response.body, (result)->
      res.render 'readability.ejs', locals:
        { content: result.innerHTML, url: req.param('url') }      

app.get '/feeds/:key', (req, res) ->
  User.find(key: req.params.key).first (user)->
    user.links (linkies)->
      sys.puts sys.inspect(linkies)
      res.header 'Content-Type', 'application/atom+xml'      
      res.render 'atom.ejs',
        layout: false
        locals:
          user: user
          links: linkies


# periodically fetch user timelines
pollInterval = 3 # seconds
setInterval ->
  since = new Date(new Date().getTime() - pollInterval * 1000)
  User.fetchOutdated since
, pollInterval * 1000

app.listen parseInt(process.env.PORT) || 3000


