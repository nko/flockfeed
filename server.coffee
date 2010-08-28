require.paths.unshift './vendor'

require 'express'
require 'oauth'

sys = require 'sys'
OAuth = require('oauth').OAuth
url = require 'url'
connect = require 'connect'
express = require 'express'
ejs = require 'ejs'
Twitter = new OAuth('http://api.twitter.com/oauth/request_token', 'http://api.twitter.com/oauth/access_token', process.env.TWITTER_KEY, process.env.TWITTER_SECRET, '1.0', null, 'HMAC-SHA1')

# Setup Hoptoad Notification
hoptoad = require('hoptoad-notifier').Hoptoad
hoptoad.key = '63da924b138bae57d1066c46accddbe7'
process.addListener 'uncaughtException', (error)->
  hoptoad.notify(error)

app = express.createServer connect.cookieDecoder(), connect.session(), express.staticProvider(__dirname + '/public'), express.logger({ format: ':method :url [:status] (:response-time ms)' })
app.set 'view engine', 'ejs'

app.get '/', (req,res)->
  res.render 'home.ejs'
  
app.get '/sign_in', (req, res)->
  Twitter.getOAuthRequestToken (error, token, secret, url, params)->
    req.session['req.token'] = token
    req.session['req.secret'] = secret
    res.redirect "http://api.twitter.com/oauth/authenticate?oauth_token=#{token}"

app.get '/oauth/callback', (req, res)->
  sys.puts "Starting OAuth Callback..."
  sys.puts JSON.stringify(req.session)
  Twitter.getOAuthAccessToken req.session['req.token'], req.session['req.secret'], (error, access_token, access_secret, params)->
    Twitter.getProtectedResource 'http://api.twitter.com/1/account/verify_credentials.json', 'GET', access_token, access_secret, (error, data, response)->
      res.send data
    
app.listen parseInt(process.env.PORT) || 3000
