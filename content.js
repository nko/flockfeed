(function() {
  var Content, Logger, Readability, YouTube, sys;
  require.paths.unshift('./vendor');
  sys = require('sys');
  Logger = require('./log').Logger;
  Readability = require('./readability').Client;
  Content = {
    domains: [],
    handlers: {},
    addHandler: function(domain, handler) {
      Content.domains.push(domain);
      return (Content.handlers[domain] = handler);
    },
    "for": function(link, body, fn) {
      var _a, _b, _c, domain, match, ret;
      _b = Content.domains;
      for (_a = 0, _c = _b.length; _a < _c; _a++) {
        domain = _b[_a];
        match = domain.exec(link.url);
        if (match) {
          Logger.debug("Content", ("Matched " + (domain)));
          ret = Content.handlers[domain].call(link, match);
          return fn({
            content: ret.content,
            title: ret.title || Content.title(body)
          });
        }
      }
      return Readability.parse(body, function(result) {
        if (result) {
          Logger.debug("Link", ("Content parsed successfully. (" + (link.url) + ")"));
          return fn(result);
        } else {
          Logger.debug("Link", ("Could not parse content of " + (link.url)));
          return fn({
            content: '',
            title: ''
          });
        }
      });
    },
    title: function(body) {
      var m;
      m = body.match(/<title>\s*(.*)\s*<\/title>/mi);
      return m ? m[1] : "";
    }
  };
  Content.addHandler(/youtube\.com\/watch.*[?&]v=([^&]+)/i, function(match) {
    return {
      content: YouTube.player(match[1]),
      title: this.status.text
    };
  });
  Content.addHandler(/youtu\.be\/(.*)\??/i, function(match) {
    return {
      content: YouTube.player(match[1]),
      title: this.status.text
    };
  });
  Content.addHandler(/twitpic\.com\/(.*)\??/i, function(match) {
    return {
      content: ("<p><a href='" + (this.url) + "'><img src='http://twitpic.com/show/large/" + (match[1]) + "'/></a></p>")
    };
  });
  Content.addHandler(/yfrog\.com\/(.*)\??/i, function(match) {
    return {
      content: ("<p><a href='" + (this.url) + "'><img src='http://yfrog.com/" + (match[1]) + ".th.jpg'/></a></p>")
    };
  });
  Content.addHandler(/twitter\/.com\/.*\/statuses\/([0-9]+)/i, function(match) {
    return {
      content: ("<p><a href='" + (this.url) + "'><img src='http://twictur.es/i/" + (match[1]) + "'/></a></p>"),
      title: this.status.text
    };
  });
  YouTube = {
    player: function(youtube_id) {
      return "<p><object width='480' height='385'><param name='movie' value='http://www.youtube.com/v/" + (youtube_id) + "?fs=1&amp;hl=en_US'></param><param name='allowFullScreen' value='true'></param><param name='allowscriptaccess' value='always'></param><embed src='http://www.youtube.com/v/" + (youtube_id) + "?fs=1&amp;hl=en_US' type='application/x-shockwave-flash' allowscriptaccess='always' allowfullscreen='true' width='480' height='385'></embed></object></p>";
    }
  };
  exports.Content = Content;
})();
