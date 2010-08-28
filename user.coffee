require.paths.unshift('./vendor')

sys = require 'sys'
DB = require('mongodb/db').Db
ObjectID = require('mongodb/bson/bson').ObjectID
Server = require('mongodb/connection').Server
crypto = require 'crypto'

User = 
  init:(host, port)->
    User.db = new DB 'small-chip', new Server(host, port, auto_reconnect:true)
  
  collection:(callback)->
    User.db.open ->
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