(function() {
  var OAuth, Twitter, app, connect, ejs, express, hoptoad, sys, url;
  require.paths.unshift('./vendor');
  require('express');
  require('oauth');
  sys = require('sys');
  OAuth = require('oauth').OAuth;
  url = require('url');
  connect = require('connect');
  express = require('express');
  ejs = require('ejs');
  Twitter = new OAuth('http://api.twitter.com/oauth/request_token', 'http://api.twitter.com/oauth/access_token', process.env.TWITTER_KEY, process.env.TWITTER_SECRET, '1.0', null, 'HMAC-SHA1');
  hoptoad = require('hoptoad-notifier').Hoptoad;
  hoptoad.key = '63da924b138bae57d1066c46accddbe7';
  process.addListener('uncaughtException', function(error) {
    return hoptoad.notify(error);
  });
  app = express.createServer(connect.cookieDecoder(), connect.session(), express.staticProvider(__dirname + '/public'), express.logger({
    format: ':method :url [:status] (:response-time ms)'
  }));
  app.set('view engine', 'ejs');
  app.get('/', function(req, res) {
    return res.render('home.ejs');
  });
  app.get('/sign_in', function(req, res) {
    return Twitter.getOAuthRequestToken(function(error, token, secret, url, params) {
      req.session['req.token'] = token;
      req.session['req.secret'] = secret;
      return res.redirect(("http://api.twitter.com/oauth/authenticate?oauth_token=" + (token)));
    });
  });
  app.get('/oauth/callback', function(req, res) {
    sys.puts("Starting OAuth Callback...");
    sys.puts(JSON.stringify(req.session));
    return Twitter.getOAuthAccessToken(req.session['req.token'], req.session['req.secret'], function(error, access_token, access_secret, params) {
      return Twitter.getProtectedResource('http://api.twitter.com/1/account/verify_credentials.json', 'GET', access_token, access_secret, function(error, data, response) {
        return res.send(data);
      });
    });
  });
  app.listen(parseInt(process.env.PORT) || 3000);
})();
