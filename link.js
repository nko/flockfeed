(function() {
  var REST, Twitter, mongo, sys;
  require.paths.unshift('./vendor');
  REST = require('./rest').Client;
  sys = require('sys');
  Twitter = require('./twitter');
  mongo = require('./mongo');
  mongo.mongoose.model('Link', {
    properties: [
      'url', 'title', 'user_id', {
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
        self = this;
        return REST.get(this.url, function(response) {
          var title_match;
          if (response.status >= 200 && response.status < 300) {
            title_match = response.body.match(/<title>(.*)<\/title>/i);
            if (title_match) {
              self.title = title_match[1];
              sys.puts(("[Link] Title fetched successfully. (" + (self.title) + ")"));
              return self.save();
            }
          }
        });
      }
    }
  });
  exports.Link = mongo.db.model('Link');
})();
