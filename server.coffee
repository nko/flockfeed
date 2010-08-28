require.paths.unshift './vendor'

require 'express'
require 'oauth'

sys = require 'sys'
oauth = require 'oauth'
url = require 'url'
connect = require 'connect'
express = require 'express'
ejs = require 'ejs'

app = express.createServer connect.cookieDecoder(), connect.session()

app.get '/', (req,res)->
  res.send "Hello from Express!"

app.listen parseInt(process.env.PORT) || 3000
