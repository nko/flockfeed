(function() {
  var OAuth, Twitter, User, app, connect, crypto, ejs, express, hoptoad, sys, url;
  require.paths.unshift('./vendor');
  require('express');
  require('oauth');
  crypto = require('crypto');
  sys = require('sys');
  OAuth = require('oauth').OAuth;
  url = require('url');
  connect = require('connect');
  express = require('express');
  ejs = require('ejs');
  Twitter = new OAuth('http://api.twitter.com/oauth/request_token', 'http://api.twitter.com/oauth/access_token', process.env.TWITTER_KEY, process.env.TWITTER_SECRET, '1.0', null, 'HMAC-SHA1');
  User = require('./user').User;
  User.init('localhost', '27017');
  if (process.env.RACK_ENV === 'production') {
    hoptoad = require('hoptoad-notifier').Hoptoad;
    hoptoad.key = '63da924b138bae57d1066c46accddbe7';
    process.addListener('uncaughtException', function(error) {
      return hoptoad.notify(error);
    });
  }
  app = express.createServer(connect.cookieDecoder(), connect.session(), express.staticProvider(__dirname + '/public'), express.logger({
    format: ':method :url [:status] (:response-time ms)'
  }));
  app.set('view engine', 'ejs');
  app.get('/', function(req, res) {
    return res.render('home.ejs');
  });
  app.get('/sign_in', function(req, res) {
    return Twitter.getOAuthRequestToken(function(error, token, secret, url, params) {
      if (error) {
        return res.redirect('/');
      } else {
        req.session['req.token'] = token;
        req.session['req.secret'] = secret;
        return res.redirect(("http://api.twitter.com/oauth/authenticate?oauth_token=" + (token)));
      }
    });
  });
  app.get('/oauth/callback', function(req, res) {
    sys.puts("Retrieving Access Token...");
    return Twitter.getOAuthAccessToken(req.session['req.token'], req.session['req.secret'], function(error, access_token, access_secret, params) {
      if (error) {
        res.send(error);
        return null;
      }
      sys.puts("Retrieving user info...");
      return Twitter.getProtectedResource('http://api.twitter.com/1/account/verify_credentials.json', 'GET', access_token, access_secret, function(error, data, response) {
        if (error) {
          res.send(error);
          return null;
        }
        sys.puts("Creating user in Mongo...");
        return User.retrieve(JSON.parse(data), function(error, user) {
          return error ? res.send(error) : res.send(JSON.stringify(user));
        });
      });
    });
  });
  app.listen(parseInt(process.env.PORT) || 3000);
})();
