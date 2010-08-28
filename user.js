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
            _a.push(user.fetch());
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
        var path;
        path = '/statuses/home_timeline.json?include_entities=true&count=200';
        if (this.since_id) {
          path += ("&since_id=" + (this.since_id));
        }
        this.client.get(path, function(statuses) {
          var _a, _b, _c, _d, _e, _f, _g, _h, link, status, url;
          _a = []; _c = statuses;
          for (_b = 0, _d = _c.length; _b < _d; _b++) {
            status = _c[_b];
            _a.push((function() {
              if (status.entities.urls) {
                _e = []; _g = status.entities.urls;
                for (_f = 0, _h = _g.length; _f < _h; _f++) {
                  url = _g[_f];
                  _e.push((function() {
                    sys.puts(("[Link] Creating '" + (url.url) + "' from status '" + (status.id) + "'"));
                    link = new Link();
                    return link.populate(status);
                  })());
                }
                return _e;
              }
            })());
          }
          return _a;
        });
        this.last_fetched = new Date();
        return this.save();
      }
    }
  });
  exports.User = mongo.db.model('User');
})();
