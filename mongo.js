(function() {
  var db, mongoose, sys;
  require.paths.unshift('./vendor');
  mongoose = require('mongoose').Mongoose;
  db = mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/flockfeeds');
  sys = require('sys');
  db.addListener('error', function(err, scope) {
    return sys.puts(sys.inspect(err));
  });
  exports.mongoose = mongoose;
  exports.db = db;
})();
