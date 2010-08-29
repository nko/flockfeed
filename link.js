(function() {
  var REST, Readability, Twitter, mongo, sys;
  require.paths.unshift('./vendor');
  REST = require('./rest').Client;
  sys = require('sys');
  Twitter = require('./twitter');
  mongo = require('./mongo');
  Readability = require('./readability').Client;
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
            if ((response.status >= 200) && response.status < 300) {
              title_match = response.body.match(/<title>(.*)<\/title>/mi);
              if (title_match) {
                self.title = title_match[1].replace(/^\s+|\s+$/g, '');
                sys.puts("[Link] Title fetched successfully. (" + (self.title) + ")");
                self.save();
              }
              return Readability.parse(response.body, function(result) {
                sys.puts("[Link] Content parsed successfully. (" + (self.title) + ")");
                return (self.content = result);
              });
            } else if ((response.status >= 300) && response.status < 400 && (self.redirects <= 3)) {
              location = response.headers['Location'] || response.headers['location'];
              sys.puts("[Link] " + (self.url) + " is a redirect, following to " + (location));
              self.url = location;
              self.redirects || (self.redirects = 0);
              self.redirects += 1;
              return self.save(function() {
                return self.fetchContent();
              });
            }
          });
        } catch (error) {
          return sys.puts("[Link] " + (self.url) + " could not be fetched.");
        }
      }
    }
  });
  exports.Link = mongo.db.model('Link');
})();
