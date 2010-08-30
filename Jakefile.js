(function() {
  var sys;
  require.paths.unshift('./vendor');
  sys = require('sys');
  desc('Show some stats on latest usage.');
  task('stats', [], function() {
    var Link, User;
    process.env.MONGO_URL = "mongodb://nodeko:4dde7fd5a58@nodeko.mongohq.com:27050/small-chip";
    User = require('./user').User;
    Link = require('./link').Link;
    User.find({}, ['screen_name']).sort([['$natural', -1]]).all(function(users) {
      sys.puts(("Total Users: " + (users.length)));
      sys.puts;
      return sys.puts(("Recent Users: " + (users[0].screen_name) + ", " + (users[1].screen_name) + ", " + (users[2].screen_name)));
    });
    return Link.find().sort([['$natural', -1]]).all(function(links) {
      return sys.puts(("Total Links: " + (links.length)));
    });
  });
})();
