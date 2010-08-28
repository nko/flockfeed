require.paths.unshift('./vendor')

crypto = require 'crypto'
mongoose = require('mongoose').Mongoose
db = mongoose.connect process.env.MONGO_URL || 'mongodb://localhost:27017/flockfeeds'

mongoose.model 'User',
  properties: ['id','name', 'screen_name', 'key', access:['token','secret'], 'last_fetched']
  indexes:['id','key']
  cast:
    id:Number
  static:
    findById:(id, callback)->
      this.find('id':id).first(callback)
    fetchOutdated:(since)->
      this.find('last_fetched':{'$lt':since}).all (users)->
        for user in users
          sys.puts "  " + user.id + " " + user.last_fetched
          user.last_fetched = new Date()
          user.save
  methods:
    save:(callback)->
      this.key = crypto.createHash('sha1').update("--#{this._id}--url-hash").digest('hex')
      this.__super__(callback)

exports.User = db.model 'User'
