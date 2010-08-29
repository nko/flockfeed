(function() {
  var REST, Readability, Twitter, User, app, connect, ejs, express, hoptoad, login_required, pollInterval, pp, sys, url;
  require.paths.unshift('./vendor');
  require('express');
  sys = require('sys');
  url = require('url');
  connect = require('connect');
  express = require('express');
  ejs = require('ejs');
  Twitter = require('./twitter');
  User = require('./user').User;
  REST = require('./rest').Client;
  Readability = require('./readability').Client;
  if (process.env.RACK_ENV === 'production') {
    hoptoad = require('hoptoad-notifier').Hoptoad;
    hoptoad.key = '63da924b138bae57d1066c46accddbe7';
    process.addListener('uncaughtException', function(error) {
      return hoptoad.notify(error);
    });
  }
  pp = function(obj) {
    return sys.puts(sys.inspect(obj));
  };
  login_required = function(req, res, success_callback) {
    pp(req.session);
    if (req.session['user_id']) {
      return User.findById(parseInt(req.session.user_id), function(current_user) {
        return success_callback(current_user);
      });
    } else {
      pp("login_required: redirecting to /");
      return res.redirect('/');
    }
  };
  app = express.createServer(connect.cookieDecoder(), connect.session(), express.staticProvider(__dirname + '/public'), express.logger({
    format: ':method :url [:status] (:response-time ms)'
  }));
  app.set('view engine', 'ejs');
  app.get('/', function(req, res) {
    return res.render('splash.ejs');
  });
  app.get('/sign_in', function(req, res) {
    return Twitter.consumer.getOAuthRequestToken(function(error, token, secret, url, params) {
      if (error) {
        return res.send(error);
      } else {
        req.session['req.token'] = token;
        req.session['req.secret'] = secret;
        return res.redirect(("http://api.twitter.com/oauth/authenticate?oauth_token=" + (token)));
      }
    });
  });
  app.get('/oauth/callback', function(req, res) {
    if (!(req.session['req.token'])) {
      res.redirect('/sign_in');
      return null;
    }
    return Twitter.consumer.getOAuthAccessToken(req.session['req.token'], req.session['req.secret'], function(error, access_token, access_secret, params) {
      var twitter;
      if (error) {
        throw error;
      }
      twitter = new Twitter.client(access_token, access_secret);
      sys.puts("Retrieving user info...");
      return twitter.get('/account/verify_credentials.json', function(hash) {
        sys.puts("Creating user in Mongo...");
        return User.find().where('id', hash.id).first(function(user) {
          if (user) {
            sys.puts(sys.inspect(user));
            sys.puts("Found existing user...");
            req.session.user_id = user.id;
            return res.redirect('/home');
          } else {
            sys.puts("Creating new user...");
            user = new User();
            user.id = hash.id;
            user.screen_name = hash.screen_name;
            user.name = hash.name;
            user.access.token = access_token;
            user.access.secret = access_secret;
            return user.save(function() {
              sys.puts(sys.inspect(user));
              req.session.user_id = user.id;
              res.redirect('/home');
              return user.fetch();
            });
          }
        });
      });
    });
  });
  app.get('/home', function(req, res) {
    return login_required(req, res, function(current_user) {
      return res.render('home.ejs', {
        locals: {
          current_user: current_user
        }
      });
    });
  });
  app.get('/readability', function(req, res) {
    if (typeof (req.param('url')) === 'undefined') {
      res.redirect('home');
      return null;
    }
    return REST.get(req.param('url'), function(response) {
      return Readability.parse(response.body, function(result) {
        return res.render('readability.ejs', {
          locals: {
            content: result.innerHTML,
            url: req.param('url')
          }
        });
      });
    });
  });
  app.get('/feeds/:key', function(req, res) {
    return User.find({
      key: req.params.key
    }).first(function(user) {
      var headers;
      headers = {
        'Content-Type': "text/xml"
      };
      return res.render('rss.ejs', {
        layout: false,
        locals: {
          user: user
        }
      });
    });
  });
  pollInterval = 3;
  setInterval(function() {
    var since;
    since = new Date(new Date().getTime() - pollInterval * 1000);
    return User.fetchOutdated(since);
  }, pollInterval * 1000);
  app.listen(parseInt(process.env.PORT) || 3000);
})();
