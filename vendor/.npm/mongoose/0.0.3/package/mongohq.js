require.paths.unshift('.')
var assert = require('assert'),
    mongoose = require('mongoose').Mongoose,
    mongo = require('mongodb'),
    ObjectID = require('mongodb/bson/bson').ObjectID;

    mongoose.model('User', {
      properties: ['_someid', '_someother', 'first', 'last', {'nested': ['test']}]
    });
    
db = mongoose.connect('mongodb://nodeko:0157ec1842d@nodeko.mongohq.com:27114/smooth-locker');


  var user = new (db.model('User'))();

  user.first = 'test';
  user.last = 'last';

  user.save(function(){
    db.model('User').find().all(function(users){
      console.dir(users);
      db.close();
    });
  });


  db.model('User').find().all(function(users){
    console.dir(users);
    db.close();
  });


