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
      fromStatus: function(status) {
        var _a, _b, _c, _d, l, url;
        if (status.entities.urls) {
          _a = []; _c = status.entities.urls;
          for (_b = 0, _d = _c.length; _b < _d; _b++) {
            url = _c[_b];
            _a.push((function() {
              l = new this.constructor();
              l.url = url.url;
              l.status = {
                id: status.id,
                text: status.text,
                user: {
                  screen_name: status.user.screen_name,
                  name: status.user.name
                },
                created_at: status.created_at
              };
              return l.save;
            }).call(this));
          }
          return _a;
        }
      }
    },
    methods: {
      save: function(callback) {
        this.__super__(callback);
        return !(this.title) ? fetchContent() : null;
      },
      fetchContent: function() {
        return REST.get(this.url, function(response) {
          return sys.puts(sys.inspect(response));
        });
      }
    }
  });
  exports.Link = mongo.db.model('Link');
})();
