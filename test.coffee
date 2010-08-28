require.paths.unshift('./vendor')

sys = require 'sys'
mongoose = require('mongoose').Mongoose

db = mongoose.connect('mongodb://localhost/test')
Collection = mongoose.noSchema('test',db)

