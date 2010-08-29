(function() {
  var Content, Logger, REST, Readability, Twitter, User, app, chainGang, connect, ejs, express, hoptoad, login_required, pollInterval, pp, sys, url, work;
  require.paths.unshift('./vendor');
  require('express');
  sys = require('sys');
  url = require('url');
  connect = require('connect');
  express = require('express');
  ejs = require('ejs');
  Logger = require('./log').Logger;
  Twitter = require('./twitter');
  User = require('./user').User;
  REST = require('./rest').Client;
  Readability = require('./readability').Client;
  hoptoad = require('hoptoad-notifier').Hoptoad;
  chainGang = require('./vendor/.npm/chain-gang/active/package/lib');
  pp = function(obj) {
    return sys.puts(sys.inspect(obj));
  };
  login_required = function(req, res, success_callback) {
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
  app.error(function(err, req, res, next) {
    if (process.env.RACK_ENV === 'production') {
      hoptoad.key = '63da924b138bae57d1066c46accddbe7';
      hoptoad.notify(err);
    }
    return res.render('error.ejs', {
      status: 500
    });
  });
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
      return twitter.get('/account/verify_credentials.json', function(hash) {
        return User.find().where('id', hash.id).first(function(user) {
          if (user) {
            Logger.info("User", "Existing user logged in.");
            req.session.user_id = user.id;
            return res.redirect('/home');
          } else {
            Logger.info("User", "Creating new user.");
            user = new User();
            user.id = hash.id;
            user.screen_name = hash.screen_name;
            user.name = hash.name;
            user.access.token = access_token;
            user.access.secret = access_secret;
            return user.save(function() {
              req.session.user_id = user.id;
              res.redirect('/home');
              return process.nextTick(function() {
                return user.fetch();
              });
            });
          }
        });
      });
    });
  });
  app.get('/populating', function(req, res) {
    return login_required(req, res, function(current_user) {
      return res.render('populating.ejs', {
        locals: {
          current_user: current_user
        }
      });
    });
  });
  app.get('/ready.json', function(req, res) {
    res.header('Content-Type', 'application/json');
    return req.session.user_id ? Link.find().where({
      'user_id': req.session.user_id
    }).first(function(user) {
      return user ? res.send(JSON.stringify({
        success: 'Ready to go.'
      })) : res.send(JSON.stringify({
        error: 'Still working.'
      }), 408);
    }) : res.send(JSON.stringify({
      error: 'Not logged in.'
    }), 401);
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
  Content = require('./content').Content;
  app.get('/readability', function(req, res) {
    if (typeof (req.param('url')) === 'undefined') {
      res.redirect('home');
      return null;
    }
    return REST.get(req.param('url'), function(response) {
      return Content["for"]({
        url: req.param('url')
      }, response.body, function(content) {
        return res.render('readability.ejs', {
          locals: {
            content: content,
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
      if (!(user)) {
        res.send('404 Not Found', 404);
        return null;
      }
      return user.links(function(linkies) {
        res.header('Content-Type', 'application/atom+xml');
        return res.render('atom.ejs', {
          layout: false,
          locals: {
            user: user,
            links: linkies
          }
        });
      });
    });
  });
  app.get('/admin/logs', function(req, res) {
    return Logger.fetch(function(logs) {
      return res.render('logs.ejs', {
        locals: {
          logs: logs
        }
      });
    });
  });
  pollInterval = 30;
  work = function() {
    return process.nextTick(function() {
      var since;
      try {
        Logger.info("Worker", "Refreshing feeds...");
        since = new Date(new Date().getTime() - pollInterval * 1000);
        return User.fetchOutdated(since, function() {
          Logger.info("Worker", ("Finished, starting again in " + (pollInterval) + " seconds."));
          return setTimeout(work, pollInterval * 1000);
        });
      } catch (error) {
        return Logger.warn("Worker", "Caught exception trying to refetch.");
      }
    });
  };
  work();
  app.listen(parseInt(process.env.PORT) || 3000);
})();
