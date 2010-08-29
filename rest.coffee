http = require 'http'
url = require 'url'
Logger = require('./log').Logger

Client =
  request:(method,request_url,callback)->
    uri = url.parse(request_url)
    client = http.createClient uri.port || 80, uri.hostname
    request = client.request method, uri.pathname,
      host: uri.hostname
    request.end()
    res =
      body: ''
    request.on 'response',(response)->
      res.status = response.statusCode
      res.headers = response.headers
      response.setEncoding 'utf8'
      response.on 'data',(chunk)->
        res.body += chunk
      response.on 'end',->
        content_type = res.headers['Content-Type'] || res.headers['content-type']
        if content_type.indexOf('image') > 0
          res.body = "<body><p><img src='#{res.body}'></p></body>"
          callback res
        else if content_type == 'text/html'
          callback res
        else
          return

  get:(url,callback)->
    this.request 'GET', url, callback
    
exports.Client = Client