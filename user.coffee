require.paths.unshift('./vendor')

sys = require 'sys'
DB = require('mongodb/db').Db
ObjectID = require('mongodb/bson/bson').ObjectID
Server = require('mongodb/connection').Server
crypto = require 'crypto'

User = 
  init:(host, port, username, password)->
    User.db = new DB process.env.MONGO_DATABASE || 'flockfeeds', new Server(process.env.MONGO_HOST || 'localhost', process.env.MONGO_PORT || 27017, auto_reconnect:true)
  
  open:(callback)->
    User.init() unless User.db
    User.db.open ->
      if process.env.MONGO_USER
        db.authenticate process.env.MONGO_USERNAME, process.env.MONGO_PASSWORD, (error, val)->
          if error
            callback error
          else
            callback null, true
      else
        callback null, true
        
  collection:(callback)->
    User.open ->
      User.db.collection 'users', (error, users_collection)->
        if error
          callback(error)
        else
          callback(null,users_collection)

  create:(hash, callback)->
    User.collection (error, users)->
      if error
        callback error
      else
        users.insert hash, (error, docs)->
          if error
            callback error
          else
            callback null, docs[0]
  
  find:(id,callback)->
    User.collection (error,users)->
      if error
        callback error
        return
      users.findOne _id:id,(error,user)->
        if error
          callback error
        else
          callback null, user
  
  sign_in:(hash, access_token, access_secret, callback)->
    User.collection (error, users)->
      if error
        callback error
      else
        user = 
          screen_name:hash.screen_name
          name:hash.name
          access:
            token:access_token
            secret:access_secret
        users.findOne _id:hash.id, (error, existing)->
          if existing
            sys.puts 'Existing user found...'
            callback null, existing
          else        
            user._id = hash.id
            user.key = crypto.createHash('sha1').update("--#{hash.id}-url-hash").digest('hex')
            User.create user, callback
            
exports.User = User