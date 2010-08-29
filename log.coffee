require.paths.unshift './vendor'

mongo = require './mongo'
sys = require 'sys'

mongo.mongoose.model 'Log',
  properties:['created_at','level','category','message','payload']
  indexes:['category','level',{'created_at':-1}]
  getters:
    xmlDate:->
      d = new Date(Date.parse(this.created_at))
      "#{d.getUTCFullYear()}-#{d.getUTCMonth()}-#{d.getUTCDate()}T#{d.getUTCHours()}:#{d.getUTCMinutes()}:#{d.getUTCSeconds()}"
  static:
    log:(level,category,message,payload,fn)->
      unless process.env.RACK_ENV == 'production'
        sys.puts "[#{category}] #{message}"
        
      l = new this.constructor()
      l.level = level
      l.category = category
      l.message = message
      l.created_at = new Date()
      l.payload = payload
      l.save ->
        fn(l) if fn
    info: (cat,msg,ld,fn)->
      this.log('info', cat, msg, ld, fn)
    debug: (cat,msg,ld,fn)-> 
      this.log 'debug',cat,msg,ld,fn
    warn: (cat,msg,ld,fn)-> 
      this.log 'warn',cat,msg,ld,fn
    err: (cat,msg,ld,fn)-> 
      this.log 'error',cat,msg,ld,fn
    fetch:(level,category,fn)->
      if !fn and !category
        fn = level
      else if !fn
        fn = category
        
      q = this.find()
      q.where('level',level) if level
      q.where('category',category) if category
      q.limit(100)
      q.sort([['$natural',-1]])
      q.all (logs)->
        fn(logs)
    
exports.Logger = mongo.db.model 'Log'