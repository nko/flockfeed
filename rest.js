(function() {
  var Client, http, url;
  http = require('http');
  url = require('url');
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
      return request.on('response', function(response) {
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
    },
    get: function(url, callback) {
      return this.request('GET', url, callback);
    }
  };
  exports.Client = Client;
})();
