(function() {
  var Content, Logger, REST, Readability, Twitter, mongo, sys;
  require.paths.unshift('./vendor');
  REST = require('./rest').Client;
  sys = require('sys');
  Logger = require('./log').Logger;
  Twitter = require('./twitter');
  mongo = require('./mongo');
  Readability = require('./readability').Client;
  Content = require('./content').Content;
  mongo.mongoose.model('Link', {
    properties: [
      'url', 'redirects', 'title', 'user_id', 'content', {
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
    getters: {
      xmlDate: function() {
        var d;
        d = new Date(Date.parse(this.status.created_at));
        return "" + (d.getUTCFullYear()) + "-" + (d.getUTCMonth()) + "-" + (d.getUTCDate()) + "T" + (d.getUTCHours()) + ":" + (d.getUTCMinutes()) + ":" + (d.getUTCSeconds());
      }
    },
    methods: {
      fetchContent: function() {
        var self;
        try {
          self = this;
          return REST.get(this.url, function(response) {
            var content_type, location;
            if (response.status >= 200 && response.status < 300) {
              content_type = response.headers['Content-Type'] || response.headers['content-type'];
              Logger.debug("Link", ("Content Type: " + (content_type)));
              if (content_type.indexOf('image') > 0) {
                self.content = ("<body><p><img src='" + (res.body) + "'></p></body>");
                return self.save();
              } else if (content_type.indexOf('text/html') >= 0) {
                Logger.debug("Link", ("Fetched successfully (" + (self.url) + ")"));
                return Content["for"](self, response.body, function(result) {
                  self.content = result.content;
                  self.title = result.title;
                  return self.save();
                });
              } else {
                self.content = '';
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
