require.paths.unshift('./vendor')

sys = require 'sys'
Logger = require('./log').Logger
Readability = require('./readability').Client

Content =
  domains:[],
  handlers:{}
  addHandler:(domain,handler)->
    Content.domains.push(domain)
    Content.handlers[domain] = handler
  for:(link, body, fn)->
    for domain in Content.domains
      match = domain.exec link.url
      if match
        Logger.debug "Content", "Matched #{domain}"
        ret = Content.handlers[domain].call(link, match)
        return fn(
          content:ret.content
          title:ret.title || Content.title(body)
        )
    Readability.parse body, (result)->
      if result
        Logger.debug "Link", "Content parsed successfully. (#{link.url})"
        fn(result)
      else
        Logger.debug "Link", "Could not parse content of #{link.url}"
        fn({ content: '', title: '' })
  title:(body)->
    m = body.match /<title>\s*(.*)\s*<\/title>/mi
    if m
      m[1]
    else
      ""

Content.addHandler /youtube\.com\/watch.*[?&]v=([^&]+)/i, (match)->
  content: YouTube.player(match[1])
  title: this.status.text

Content.addHandler /youtu\.be\/(.*)\??/i, (match)->
  content: YouTube.player(match[1])
  title: this.status.text
  
Content.addHandler /twitpic\.com\/(.*)\??/i, (match)->
  content:"<p><a href='#{this.url}'><img src='http://twitpic.com/show/large/#{match[1]}'/></a></p>"

Content.addHandler /yfrog\.com\/(.*)\??/i, (match)->
  content:"<p><a href='#{this.url}'><img src='http://yfrog.com/#{match[1]}.th.jpg'/></a></p>"
  
Content.addHandler /twitter\/.com\/.*\/statuses\/([0-9]+)/i, (match)->
  content:"<p><a href='#{this.url}'><img src='http://twictur.es/i/#{match[1]}'/></a></p>"
  title: this.status.text
  
YouTube =
  player:(youtube_id)->
    "<p><object width='480' height='385'><param name='movie' value='http://www.youtube.com/v/#{youtube_id}?fs=1&amp;hl=en_US'></param><param name='allowFullScreen' value='true'></param><param name='allowscriptaccess' value='always'></param><embed src='http://www.youtube.com/v/#{youtube_id}?fs=1&amp;hl=en_US' type='application/x-shockwave-flash' allowscriptaccess='always' allowfullscreen='true' width='480' height='385'></embed></object></p>"
    

exports.Content = Content