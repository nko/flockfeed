(function() {
  var Twitter, mongo, sys;
  require.paths.unshift('./vendor');
  sys = require('sys');
  Twitter = require('./twitter');
  mongo = require('./mongo');
  mongo.mongoose.model('Link', {
    properties: [
      'user_id', {
        'status': [
          'id', 'text', {
            'user': ['screen_name', 'name']
          }, 'created_at'
        ]
      }, 'url', ''
    ]
  });
})();
