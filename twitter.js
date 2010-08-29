(function() {
  var Client, Consumer, OAuth, sys;
  require.paths.unshift('./vendor');
  sys = require('sys');
  OAuth = require('oauth').OAuth;
  Consumer = new OAuth('http://api.twitter.com/oauth/request_token', 'http://api.twitter.com/oauth/access_token', process.env.TWITTER_KEY, process.env.TWITTER_SECRET, '1.0', null, 'HMAC-SHA1');
  Client = function(token, secret) {
    this.token = token;
    return (this.secret = secret);
  };
  Client.prototype.request = function(method, path, callback) {
    var url;
    url = ("http://api.twitter.com/1" + (path));
    sys.puts("[Twitter] Fetching " + (path));
    return Consumer.getProtectedResource(url, method, this.token, this.secret, function(error, data, response) {
      return error ? sys.puts(sys.inspect(error)) : callback(JSON.parse(data));
    });
  };
  Client.prototype.get = function(path, callback) {
    return this.request('GET', path, callback);
  };
  exports.consumer = Consumer;
  exports.client = Client;
})();
