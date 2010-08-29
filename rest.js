(function() {
  var Client, http, url;
  http = require('http');
  url = require('url');
  Client = {
    request: function(method, request_url, callback) {
      var client, request, res, uri, headers;
      uri = url.parse(request_url);
      headers = {
        host: uri.hostname,
        'User-Agent': 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10.6; en-US; rv:1.9.2.8) Gecko/20100722 Firefox/3.6.8'
      }
      client = http.createClient(uri.port || 80, uri.hostname);
      request = client.request(method, uri.pathname, headers);
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
