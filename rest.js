(function() {
  var Client, Logger, http, url;
  http = require('http');
  url = require('url');
  Logger = require('./log').Logger;
  Client = {
    request: function(method, request_url, callback) {
      var client, request, res, uri;
      uri = url.parse(request_url);
      client = http.createClient(uri.port || 80, uri.hostname);
      request = client.request(method, uri.pathname, {
        host: uri.hostname
      });
      request.end();
      res = {
        body: ''
      };
      request.on('response', function(response) {
        res.status = response.statusCode;
        res.headers = response.headers;
        response.setEncoding('utf8');
        response.on('data', function(chunk) {
          return res.body += chunk;
        });
        return response.on('end', function() {
          return callback(res);
        });
      });
      return request.on('error', function(error) {
        Logger.err('HTTP', ("Fetching of " + (request_url) + " failed"));
        return callback(null);
      });
    },
    get: function(url, callback) {
      return this.request('GET', url, callback);
    }
  };
  exports.Client = Client;
})();
