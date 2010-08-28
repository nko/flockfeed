(function() {
  var app, connect, ejs, express, oauth, sys, url;
  require.paths.unshift('./vendor');
  require('express');
  require('oauth');
  sys = require('sys');
  oauth = require('oauth');
  url = require('url');
  connect = require('connect');
  express = require('express');
  ejs = require('ejs');
  app = express.createServer(connect.cookieDecoder(), connect.session());
  app.get('/', function(req, res) {
    return res.send("Hello from Express!");
  });
  app.listen(parseInt(process.env.PORT) || 3000);
})();
