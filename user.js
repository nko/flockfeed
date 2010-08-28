(function() {
  var crypto, db, mongoose, sys;
  require.paths.unshift('./vendor');
  sys = require('sys');
  crypto = require('crypto');
  mongoose = require('mongoose').Mongoose;
  db = mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/flockfeeds');
  mongoose.model('User', {
    properties: [
      'id', 'name', 'screen_name', 'key', {
        access: ['token', 'secret'],
        'last_fetched': 'last_fetched'
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
            _a.push((function() {
              sys.puts("  " + user.id + " " + user.last_fetched);
              user.last_fetched = new Date();
              return user.save;
            })());
          }
          return _a;
        });
      }
    },
    methods: {
      save: function(callback) {
        this.key = crypto.createHash('sha1').update(("--" + (this._id) + "--url-hash")).digest('hex');
        return this.__super__(callback);
      }
    }
  });
  exports.User = db.model('User');
})();
