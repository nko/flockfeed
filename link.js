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
      },
      generateWelcome: function(user, callback) {
        var l;
        l = new this.constructor({
          user_id: user.id,
          url: 'http://flockfeeds.com/home',
          status: {
            id: 1,
            text: "Welcome to FlockFeeds!",
            user: {
              screen_name: 'flockfeeds',
              name: 'FlockFeeds'
            }
          },
          content: '<p>Welcome to your FlockFeed! This should soon be filled with\na myriad of interesting links pulled directly from the people\nyou follow.</p>\n\n<p>Your FlockFeed will continue to update indefinitely without\nyou having to do any more work. However, if you happen to lose\nthe link, you can always head back to \n<a href=\'http://flockfeeds.com\'>the FlockFeeds site</a> and log\nback in to retrieve it.</p>\n\n<p>Thanks for signing up, and we hope you enjoy your feed!</p>'
        });
        return l.save(function() {
          return callback();
        });
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
            if (!(response)) {
              self.content = '';
              self.save();
              return null;
            }
            if (response.status >= 200 && response.status < 300) {
              content_type = response.headers['Content-Type'] || response.headers['content-type'];
              Logger.debug("Link", ("Content Type: " + (content_type)));
              if (content_type.indexOf('image') >= 0) {
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
