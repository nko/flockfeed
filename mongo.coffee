require.paths.unshift './vendor'

mongoose = require('mongoose').Mongoose
db = mongoose.connect process.env.MONGO_URL || 'mongodb://localhost:27017/flockfeeds'
sys = require 'sys'

db.addListener 'error', (err,scope)->
  sys.puts sys.inspect(err)

exports.mongoose = mongoose
exports.db = db