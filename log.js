(function() {
  var mongo, sys;
  require.paths.unshift('./vendor');
  mongo = require('./mongo');
  sys = require('sys');
  mongo.mongoose.model('Log', {
    properties: ['created_at', 'level', 'category', 'message', 'payload'],
    indexes: [
      'category', 'level', {
        'created_at': -1
      }
    ],
    static: {
      log: function(level, category, message, payload, fn) {
        var l;
        if (!(process.env.RACK_ENV === 'production')) {
          sys.puts(("[" + (category) + "] " + (message)));
        }
        l = new this.constructor();
        l.level = level;
        l.category = category;
        l.message = message;
        l.created_at = new Date();
        l.payload = payload;
        return l.save(function() {
          if (fn) {
            return fn(l);
          }
        });
      },
      info: function(cat, msg, ld, fn) {
        return this.log('info', cat, msg, ld, fn);
      },
      debug: function(cat, msg, ld, fn) {
        return this.log('debug', cat, msg, ld, fn);
      },
      warn: function(cat, msg, ld, fn) {
        return this.log('warn', cat, msg, ld, fn);
      },
      error: function(cat, msg, ld, fn) {
        return this.log('error', cat, msg, ld, fn);
      },
      fetch: function(level, category, fn) {
        var q;
        if (!fn && !category) {
          fn = level;
        } else if (!fn) {
          fn = category;
        }
        q = this.find();
        if (level) {
          q.where('level', level);
        }
        if (category) {
          q.where('category', category);
        }
        q.limit(100);
        q.sort({
          '$natural': -1
        });
        return q.all(function(logs) {
          return fn(logs);
        });
      }
    }
  });
  exports.Logger = mongo.db.model('Log');
})();
