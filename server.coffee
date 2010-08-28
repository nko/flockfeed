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
http = require 'http'
querystring = require 'querystring'
jsdom = require 'jsdom'
htmlparser = require './htmlparser'
readability = require './readability'

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

app.listen parseInt(process.env.PORT) || 3000
