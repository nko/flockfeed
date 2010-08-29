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
        var self;
        self = this;
        return self.find({
          'last_fetched': {
            '$lt': since
          }
        }).all(function(stale) {
          return self.find().where('last_fetched', null).all(function(virgin) {
            var _a, _b, _c, _d, user, users;
            users = stale.concat(virgin);
            _a = []; _c = users;
            for (_b = 0, _d = _c.length; _b < _d; _b++) {
              user = _c[_b];
              _a.push(user.fetch());
            }
            return _a;
          });
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
        this.key = crypto.createHash('sha1').update("--" + (this._id) + "--url-hash").digest('hex');
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
          var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, link, links, status, url;
          self.last_fetched = new Date();
          if (statuses[0]) {
            self.since_id = statuses[0].id;
          }
          self.save();
          _a = []; _c = statuses;
          for (_b = 0, _d = _c.length; _b < _d; _b++) {
            status = _c[_b];
            _a.push((function() {
              if (status.entities.urls) {
                _e = []; _g = status.entities.urls;
                for (_f = 0, _h = _g.length; _f < _h; _f++) {
                  url = _g[_f];
                  _e.push((function() {
                    sys.puts("[Link] Creating '" + (url.url) + "' from status '" + (status.id) + "'");
                    links = Link.fromStatus(self, status);
                    _i = []; _k = links;
                    for (_j = 0, _l = _k.length; _j < _l; _j++) {
                      link = _k[_j];
                      _i.push(link.fetchContent());
                    }
                    return _i;
                  })());
                }
                return _e;
              }
            })());
          }
          return _a;
        });
      }
    }
  });
  exports.User = mongo.db.model('User');
})();
