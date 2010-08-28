require.paths.unshift './vendor'

require 'express'

sys = require 'sys'
url = require 'url'
connect = require 'connect'
express = require 'express'
ejs = require 'ejs'
Twitter = require './twitter'
User = require('./user').User

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

app.get '/home', (req,res)->
  login_required req, res, (current_user) ->
    res.render 'home.ejs', locals:
      current_user:current_user

app.get '/readability', (req, res)->
  sys.puts "Starting readability"
  if typeof(req.param('url')) == 'undefined'
    res.render 'home.ejs'
  else
    parsedUrl = url.parse(req.param('url'))
    headers = { 'User-Agent': 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10.6; en-US; rv:1.9.2.8) Gecko/20100722 Firefox/3.6.8' }
    httpClient = http.createClient(80, parsedUrl.hostname)
    request = httpClient.request('GET', parsedUrl.pathname + "?" + querystring.stringify(parsedUrl.query), headers)
    result = "";

    request.addListener 'response', (response)->
      response.addListener 'data', (chunk)->
        result+= chunk
      response.addListener 'end', ->
        sys.puts "Raw"
        # sys.puts result

        htmlDom = htmlparser.ParseHtml(result)
        sys.puts "Parsed HTML"
        # sys.puts(sys.inspect(htmlDom, false, null));

        domWindow = jsdom.createWindow(htmlDom)
        sys.puts "Parsed DOM"
        # sys.puts(sys.inspect(domWindow.document, false, null));

        content = readability.parseArticle(domWindow.document)
        sys.puts "Parsed content"
        sys.puts(sys.inspect(content.innerHTML, false, null));
    request.end();


app.get '/feeds/:key', (req, res) ->
  User.find(key: req.params.key).first (user) ->
    headers = 'Content-Type': "text/xml"
    res.render 'rss.ejs',
      layout: false
      locals:
        user: user


# periodically fetch user timelines
pollInterval = 3 # seconds
setInterval ->
  since = new Date(new Date().getTime() - pollInterval * 1000)
  User.fetchOutdated since
, pollInterval * 1000

app.listen parseInt(process.env.PORT) || 3000


