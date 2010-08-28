GLOBAL.DEBUG = true;

sys = require("sys");

var mongo = require('../lib/mongodb');

var host = 'nodeko.mongohq.com';
var port = 27114;

sys.puts("Connecting to " + host + ":" + port);
var db = new mongo.Db('smooth-locker', new mongo.Server(host, port, {}), {});
db.open(function(err, db) {
  db.authenticate('nodeko','0157ec1842d',function(){
    db.collection('test', function(err, collection) {
      // Erase all records from the collection, if any
      collection.remove(function(err, collection) {
        // Insert 3 records
        for(var i = 0; i < 3; i++) {
          collection.insert({'a':i});
        }
        
        collection.count(function(err, count) {
          sys.puts("There are " + count + " records in the test collection. Here they are:");

          collection.find(function(err, cursor) {
            cursor.each(function(err, item) {
              if(item != null) {
                sys.puts(sys.inspect(item));
                sys.puts("created at " + new Date(item._id.generationTime) + "\n")
              }
              // Null signifies end of iterator
              if(item == null) {                
                // Destory the collection
                collection.drop(function(err, collection) {
                  db.close();
                });
              }
            });
          });         
        });
      });  
    });    
  });
});