require.paths.unshift('./vendor')

crypto = require 'crypto'
mongoose = require('mongoose').Mongoose
db = mongoose.connect process.env.MONGO_URL || 'mongodb://localhost:27017/flockfeeds'

mongoose.model 'User',
  properties: ['id','name', 'screen_name', 'key', access:['token','secret']]
  indexes:['id','key']
  cast:
    id:Number
  static:
    findById:(id, callback)->
      this.find({'id':id}).first(callback)
  methods:
    save:(callback)->
      this.key = crypto.createHash('sha1').update("--#{this._id}--url-hash").digest('hex')
      this.__super__(callback)
      
exports.User = db.model 'User'

#   create:(hash, callback)->
#     User.collection (error, users)->
#       if error
#         callback error
#       else
#         users.insert hash, (error, docs)->
#           if error
#             callback error
#           else
#             callback null, docs[0]
#   
#   find:(id,callback)->
#     User.collection (error,users)->
#       if error
#         callback error
#         return
#       users.findOne _id:id,(error,user)->
#         if error
#           callback error
#         else
#           callback null, user
#   
#   sign_in:(hash, access_token, access_secret, callback)->
#     User.collection (error, users)->
#       if error
#         callback error
#       else
#         user = 
#           screen_name:hash.screen_name
#           name:hash.name
#           access:
#             token:access_token
#             secret:access_secret
#         users.findOne _id:hash.id, (error, existing)->
#           if existing
#             sys.puts 'Existing user found...'
#             callback null, existing
#           else        
#             user._id = hash.id
#             user.key = crypto.createHash('sha1').update("--#{hash.id}-url-hash").digest('hex')
#             User.create user, callback
#             
# exports.User = User