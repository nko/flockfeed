(function() {
  var Logger, REST, Twitter, mongo, sys;
  require.paths.unshift('./vendor');
  REST = require('./rest').Client;
  sys = require('sys');
  Logger = require('./log').Logger;
  Twitter = require('./twitter');
  mongo = require('./mongo');
  mongo.mongoose.model('Link', {
    properties: [
      'url', 'redirects', 'title', 'user_id', {
        'status': [
          'id', 'text', {
            'user': ['screen_name', 'name']
          }, 'created_at'
        ]
      }
    ],
    indexes: [
      'user_id', {
        'status.created_at': -1
      }
    ],
    static: {
      fromStatus: function(user, status) {
        var _a, _b, _c, l, links, url;
        links = [];
        if (status.entities.urls) {
          _b = status.entities.urls;
          for (_a = 0, _c = _b.length; _a < _c; _a++) {
            url = _b[_a];
            l = new this.constructor();
            l.user_id = user.id;
            l.url = url.url;
            l.status.id = status.id;
            l.status.text = status.text;
            l.status.user.screen_name = status.user.screen_name;
            l.status.user.name = status.user.name;
            l.status.created_at = status.created_at;
            l.save;
            links.push(l);
          }
        }
        return links;
      }
    },
    methods: {
      fetchContent: function() {
        var self;
        try {
          self = this;
          return REST.get(this.url, function(response) {
            var location, title_match;
            if (response.status >= 200 && response.status < 300) {
              title_match = response.body.match(/<title>(.*)<\/title>/mi);
              if (title_match) {
                self.title = title_match[1].replace(/^\s+|\s+$/g, '');
                Logger.debug("Link", ("Title fetched successfully. (" + (self.title) + ")"));
                return self.save();
              }
            } else if ([300, 301, 302, 303, 305, 307].indexOf(response.status) !== -1 && self.redirects <= 3) {
              location = response.headers['Location'] || response.headers['location'];
              Logger.debug("Link", ("" + (self.url) + " is a redirect, following to " + (location)));
              self.url = location;
              self.redirects = self.redirects || 0;
              self.redirects += 1;
              return self.save(function() {
                return self.fetchContent();
              });
            }
          });
        } catch (error) {
          return Logger.warn("Link", ("" + (self.url) + " could not be fetched."));
        }
      }
    }
  });
  exports.Link = mongo.db.model('Link');
})();
