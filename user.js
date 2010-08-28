(function() {
  var Twitter, crypto, mongo, sys;
  require.paths.unshift('./vendor');
  sys = require('sys');
  crypto = require('crypto');
  Twitter = require('./twitter');
  mongo = require('./mongo');
  mongo.mongoose.model('User', {
    properties: [
      'id', 'name', 'screen_name', 'key', {
        access: ['token', 'secret'],
        'last_fetched': 'last_fetched',
        'since_id': 'since_id'
      }
    ],
    indexes: ['id', 'key'],
    cast: {
      id: Number
    },
    static: {
      findById: function(id, callback) {
        return this.find({
          'id': id
        }).first(callback);
      },
      fetchOutdated: function(since) {
        return this.find({
          'last_fetched': {
            '$lt': since
          }
        }).all(function(users) {
          var _a, _b, _c, _d, user;
          _a = []; _c = users;
          for (_b = 0, _d = _c.length; _b < _d; _b++) {
            user = _c[_b];
            _a.push((function() {
              sys.puts("  " + user.id + " " + user.last_fetched);
              user.last_fetched = new Date();
              return user.save;
            })());
          }
          return _a;
        });
      }
    },
    getters: {
      client: function() {
        return new Twitter.client(this.access.token, this.access.secret);
      }
    },
    methods: {
      save: function(callback) {
        var _a, wasNew;
        this.key = crypto.createHash('sha1').update(("--" + (this._id) + "--url-hash")).digest('hex');
        wasNew = (typeof (_a = this.isNew) !== "undefined" && _a !== null) ? this.isNew : {
          "true": false
        };
        return this.__super__(function() {
          if (wasNew) {
            setTimeout(this.fetch, 0);
            return callback();
          }
        });
      },
      fetch: function(callback) {
        return this.client.get('/statuses/home_timeline', function(statuses) {
          return callback(statuses);
        });
      }
    }
  });
  exports.User = mongo.db.model('User');
})();
