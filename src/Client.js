function Client(host, enable_creds) {

  var version;

  function get_version() {
    if (version) {
      return Promise.resolve(version);
    }
    return this.get('/').then(function(r) {
      version = new ES_Version(r.version.number, r.version.build_snapshot);
      return version;
    });
  }

  function handle_error(e, method, url) {
    var msg = "Failed to " + method + " " + url;

    if (e.responseJSON) {
      if (e.status === 404 && e.responseJSON.found === false) {
        e.responseJSON.type = 'not_found';
        e.responseJSON.reason = 'resource not found';
        throw new ES_Error(method + ' ' + url, {
          status : 404,
          error : {
            root_cause : [
              e.responseJSON
            ]
          }
        })
      }
      if (e.responseJSON.error) {
        if (typeof e.responseJSON.error === 'object') {
          throw new ES_Error(method + ' ' + url, e.responseJSON);
        }
        e.responseText = e.responseJSON.error;
      }
    }

    var reason = e.responseText || e.statusText;

    if (reason.match(/^\s*</)) {
      reason = 'Is the URL correct?';
    } else if (reason === 'error') {
      reason = 'Is the URL correct?';
      if (window.location.protocol === 'https:' && url.indexOf('https:') !== 0) {
        reason += ' Cannot access a cluster via HTTP when this plugin is served via HTTPS.'
      } else {
        var origin = window.location.protocol
          + "//"
          + window.location.hostname
          + (window.location.port ? ':' + window.location.port : '');
        if (url.indexOf(origin) !== 0) {
          reason += ' Does Elasticsearch have <a href="https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-http.html">CORS enabled</a> and properly configured?'
        }
      }
    }
    msg += " " + reason;
    throw (msg);
  }

  function _request(method, path, qs, body) {
    var url = host + path;
    if (qs) {
      url += '?' + jQuery.param(qs);
    }

    var req = {
      dataType : "json",
      method : method,
      url : url
    };
    if (body) {
      req.data = JSON.stringify(body)
    }
    if (enable_creds) {
      req['xhrFields'] = {
        withCredentials : true
      };
      req['crossDomain'] = true;
    }

    return new Promise(function(resolve, reject) {
      jQuery.ajax(req) //
      .done(resolve) //
      .fail(function(e) {
        try {
          handle_error(e, method, url)
        } catch (e) {
          reject(e);
        }
      })
    });

  }

  return {
    get : function(path, qs) {
      return _request('GET', path, qs)
    },
    del : function(path, qs) {
      return _request('DELETE', path, qs)
    },
    post : function(path, qs, body) {
      return _request('POST', path, qs, body)
    },
    put : function(path, qs, body) {
      return _request('PUT', path, qs, body)
    },
    get_version : get_version,
    host : host
  }
}

function ES_Version(v_string, snapshot) {
  var parts = v_string.split('.');
  this.major = parts[0];
  this.minor = parts[1] || 0;
  this.patch = parts[2] || 0;
  this.snapshot = snapshot ? 1 : 0;

  this.cmp = function(other) {
    if (typeof other === "string") {
      other = new ES_Version(other);
    }
    var keys = [
      'major', 'minor', 'patch', 'snapshot'
    ];
    for (var i = 0; i < 4; i++) {
      var key = keys[i];
      if (this[key] === "*" || other[key] === "*") {
        return 0;
      }
      if (this[key] === other[key]) {
        continue;
      }
      return this[key] > other[key] ? 1 : -1
    }
    return 0;
  }

  this.lt = function(v) {
    return this.cmp(v) === -1
  }
  this.lte = function(v) {
    return this.cmp(v) !== 1
  }

  this.gt = function(v) {
    return this.cmp(v) === 1
  }
  this.gte = function(v) {
    return this.cmp(v) !== -1
  }

  this.matches = function(v) {
    return this.cmp(v) === 0;
  }
  this.toString = function() {
    return this.major
      + "."
      + this.minor
      + "."
      + this.patch
      + (this.snapshot ? '-SNAPSHOT' : '')
  }

  return this;
}

function ES_Error(request, e) {
  this.request = request;
  this.params = e.error.root_cause[0];
  this.status = e.status;
  this.type = this.params.type;
  this.reason = this.params.reason;

  delete this.params.type;
  delete this.params.reason;

  this.toString = function() {
    return this.request
      + " failed with ["
      + this.status
      + "] "
      + this.reason
      + ": "
      + JSON.stringify(this.params)
  }
}

ES_Error.prototype = Object.create(Error.prototype);
ES_Error.prototype.constructor = ES_Error;
