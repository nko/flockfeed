require.paths.unshift('./vendor')

sys = require('sys')

desc 'Show some stats on latest usage.'
task 'stats', [], ->
  process.env.MONGO_URL = "mongodb://nodeko:4dde7fd5a58@nodeko.mongohq.com:27050/small-chip"
  User = require('./user').User
  Link = require('./link').Link
  
  User.find({},['screen_name']).sort([['$natural',-1]]).all (users)->
    sys.puts "Total Users: #{users.length}"
    sys.puts
    sys.puts "Recent Users: #{users[0].screen_name}, #{users[1].screen_name}, #{users[2].screen_name}"
    
  Link.find().sort([['$natural',-1]]).all (links)->
    sys.puts "Total Links: #{links.length}"