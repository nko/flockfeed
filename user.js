(function() {
  var Link, Twitter, crypto, mongo, sys;
  require.paths.unshift('./vendor');
  sys = require('sys');
  crypto = require('crypto');
  Twitter = require('./twitter');
  mongo = require('./mongo');
  Link = require('./link').Link;
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
      },
      fetch: function(id) {
        return this.findById(id, function(user) {
          return user.fetch();
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
        this.key = crypto.createHash('sha1').update(("--" + (this._id) + "--url-hash")).digest('hex');
        return this.__super__(callback);
      },
      links: function(callback) {
        return Link.find().where('user_id', this.id).sort('status.created_at', -1).all(function(arr) {
          return callback(arr);
        });
      },
      fetch: function(callback) {
        var path, self;
        path = '/statuses/home_timeline.json?include_entities=true&count=200';
        if (this.since_id) {
          path += ("&since_id=" + (this.since_id));
        }
        self = this;
        return this.client.get(path, function(statuses) {
          var _a, _b, _c, _d, _e, _f, _g, _h, _i, link, links, status, url;
          if (statuses[0]) {
            self.since_id = statuses[0].id;
          }
          _b = statuses;
          for (_a = 0, _c = _b.length; _a < _c; _a++) {
            status = _b[_a];
            if (status.entities.urls) {
              _e = status.entities.urls;
              for (_d = 0, _f = _e.length; _d < _f; _d++) {
                url = _e[_d];
                sys.puts(("[Link] Creating '" + (url.url) + "' from status '" + (status.id) + "'"));
                links = Link.fromStatus(self, status);
                _h = links;
                for (_g = 0, _i = _h.length; _g < _i; _g++) {
                  link = _h[_g];
                  link.fetchContent();
                }
              }
            }
          }
          self.last_fetched = new Date();
          return self.save();
        });
      }
    }
  });
  exports.User = mongo.db.model('User');
})();
