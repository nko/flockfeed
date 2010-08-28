require.paths.unshift './vendor'

require 'express'
require 'oauth'

crypto = require('crypto')
sys = require 'sys'
OAuth = require('oauth').OAuth
url = require 'url'
connect = require 'connect'
express = require 'express'
ejs = require 'ejs'
Twitter = new OAuth('http://api.twitter.com/oauth/request_token', 'http://api.twitter.com/oauth/access_token', process.env.TWITTER_KEY, process.env.TWITTER_SECRET, '1.0', null, 'HMAC-SHA1')

User = require('./user').User
User.init 'localhost', '27017'

# Setup Hoptoad Notification
if process.env.RACK_ENV == 'production'
  hoptoad = require('hoptoad-notifier').Hoptoad
  hoptoad.key = '63da924b138bae57d1066c46accddbe7'
  process.addListener 'uncaughtException', (error)->
    hoptoad.notify(error)

app = express.createServer connect.cookieDecoder(), connect.session(), express.staticProvider(__dirname + '/public'), express.logger({ format: ':method :url [:status] (:response-time ms)' })
app.set 'view engine', 'ejs'

app.get '/', (req,res)->
  res.render 'splash.ejs'
  
app.get '/sign_in', (req, res)->
  Twitter.getOAuthRequestToken (error, token, secret, url, params)->
    if error
      res.redirect '/'
    else
      req.session['req.token'] = token
      req.session['req.secret'] = secret
      res.redirect "http://api.twitter.com/oauth/authenticate?oauth_token=#{token}"

app.get '/oauth/callback', (req, res)->
  unless req.session['req.token']
    res.redirect '/sign_in'
    return
    
  Twitter.getOAuthAccessToken req.session['req.token'], req.session['req.secret'], (error, access_token, access_secret, params)->
    if error
      res.send error
      return
    sys.puts "Retrieving user info..."
    Twitter.getProtectedResource 'http://api.twitter.com/1/account/verify_credentials.json', 'GET', access_token, access_secret, (error, data, response)->
      if error
        res.send error
        return
      sys.puts "Creating user in Mongo..."
      User.sign_in JSON.parse(data), access_token, access_secret, (error, user)->
        if error
          res.send error
        else
          req.session['user_id'] = user._id
          res.redirect "/home"

app.get '/home', (req,res)->
  unless req.session.user_id
    res.redirect 'sign_in'
    return
  User.find req.session.user_id,(error,current_user)->
    if error
      res.send error
    else
      res.render 'home.ejs', locals:
        current_user:current_user
  
app.listen parseInt(process.env.PORT) || 3000
