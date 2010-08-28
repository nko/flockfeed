(function() {
  var crypto, db, mongoose;
  require.paths.unshift('./vendor');
  crypto = require('crypto');
  mongoose = require('mongoose').Mongoose;
  db = mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/flockfeeds');
  mongoose.model('User', {
    properties: [
      'id', 'name', 'screen_name', 'key', {
        access: ['token', 'secret']
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
