(function() {
  var app, connect, ejs, express, hoptoad, oauth, sys, url;
  require.paths.unshift('./vendor');
  require('express');
  require('oauth');
  sys = require('sys');
  oauth = require('oauth');
  url = require('url');
  connect = require('connect');
  express = require('express');
  ejs = require('ejs');
  hoptoad = require('hoptoad-notifier').Hoptoad;
  hoptoad.key = '63da924b138bae57d1066c46accddbe7';
  process.addListener('uncaughtException', function(error) {
    return hoptoad.notify(error);
  });
  app = express.createServer(connect.cookieDecoder(), connect.session(), express.staticProvider(__dirname + '/public'));
  app.set('view engine', 'ejs');
  app.get('/', function(req, res) {
    return res.render('home.ejs');
  });
  app.listen(parseInt(process.env.PORT) || 3000);
})();
