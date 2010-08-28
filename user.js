(function() {
  var DB, ObjectID, Server, User, crypto, sys;
  require.paths.unshift('./vendor');
  sys = require('sys');
  DB = require('mongodb/db').Db;
  ObjectID = require('mongodb/bson/bson').ObjectID;
  Server = require('mongodb/connection').Server;
  crypto = require('crypto');
  User = {
    init: function(host, port) {
      return (User.db = new DB('small-chip', new Server(host, port, {
        auto_reconnect: true
      })));
    },
    collection: function(callback) {
      return User.db.open(function() {
        return User.db.collection('users', function(error, users_collection) {
          return error ? callback(error) : callback(null, users_collection);
        });
      });
    },
    create: function(hash, callback) {
      return User.collection(function(error, users) {
        return error ? callback(error) : users.insert(hash, function(error, docs) {
          return error ? callback(error) : callback(null, docs[0]);
        });
      });
    },
    retrieve: function(hash, callback) {
      return User.collection(function(error, users) {
        return users.findOne({
          _id: hash.id
        }, function(error, existing) {
          var user;
          if (existing) {
            sys.puts('Existing user found!');
            return callback(null, existing);
          } else {
            user = {
              _id: hash.id,
              key: crypto.createHash('sha1').update(("--" + (hash.id) + "-url-hash")).digest(),
              screen_name: hash.screen_name,
              name: hash.name
            };
            return User.create(user, callback);
          }
        });
      });
    }
  };
  exports.User = User;
})();
