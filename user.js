(function() {
  var DB, ObjectID, Server, User, crypto, sys;
  require.paths.unshift('./vendor');
  sys = require('sys');
  DB = require('mongodb/db').Db;
  ObjectID = require('mongodb/bson/bson').ObjectID;
  Server = require('mongodb/connection').Server;
  crypto = require('crypto');
  User = {
    init: function(host, port, username, password) {
      return (User.db = new DB(process.env.MONGO_DATABASE || 'flockfeeds', new Server(process.env.MONGO_HOST || 'localhost', process.env.MONGO_PORT || 27017, {
        auto_reconnect: true
      })));
    },
    open: function(callback) {
      if (!(User.db)) {
        User.init();
      }
      return User.db.open(function() {
        return process.env.MONGO_USER ? db.authenticate(process.env.MONGO_USERNAME, process.env.MONGO_PASSWORD, function(error, val) {
          return error ? callback(error) : callback(null, true);
        }) : callback(null, true);
      });
    },
    collection: function(callback) {
      return User.open(function() {
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
    find: function(id, callback) {
      return User.collection(function(error, users) {
        if (error) {
          callback(error);
          return null;
        }
        return users.findOne({
          _id: id
        }, function(error, user) {
          return error ? callback(error) : callback(null, user);
        });
      });
    },
    sign_in: function(hash, access_token, access_secret, callback) {
      return User.collection(function(error, users) {
        var user;
        if (error) {
          return callback(error);
        } else {
          user = {
            screen_name: hash.screen_name,
            name: hash.name,
            access: {
              token: access_token,
              secret: access_secret
            }
          };
          return users.findOne({
            _id: hash.id
          }, function(error, existing) {
            if (existing) {
              sys.puts('Existing user found...');
              return callback(null, existing);
            } else {
              user._id = hash.id;
              user.key = crypto.createHash('sha1').update(("--" + (hash.id) + "-url-hash")).digest('hex');
              return User.create(user, callback);
            }
          });
        }
      });
    }
  };
  exports.User = User;
})();
