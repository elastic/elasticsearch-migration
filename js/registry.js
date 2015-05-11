"use strict";

var Checks = (function() {
  var registry = {
    "index.settings" : [],
    "index.segments" : [],
    "index.mappings" : [],
    "index.flat_mappings" : [],
    "index.mappings.fields" : [],
    "tests" : []
  };

  function register(phase, checks) {
    for (var i = 0; i < checks.length; i++) {
      registry[phase].push(checks[i])
    }
    return Checks;
  }

  function checks_for_phase(phase) {
    return registry[phase];
  }

  function get_key(o, path) {
    var keys = path.split('.');
    while (keys.length) {
      if (!o instanceof Object) {
        return "";
      }
      var key = keys.shift();
      if (o.hasOwnProperty(key)) {
        o = o[key]
      } else {
        return "";
      }
    }

    return o == undefined ? "" : o;
  }

  function check_types(msg, mappings, f) {
    var errors = [];
    forall(mappings, function(foo, type) {
      if (f(type)) {
        errors.push("`" + type + "`");
      }
    });
    if (errors.length) {
      return msg + ", in type" + (errors.length > 1 ? 's: ' : ': ')
        + errors.join(", ");
    }
  }

  return {
    check_types : check_types,
    checks_for_phase : checks_for_phase,
    get_key : get_key,
    register : register,
    registry : registry
  };

})();

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
    var keys = [ 'major', 'minor', 'patch', 'snapshot' ];
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
    return this.major + "." + this.minor + "." + this.patch
      + (this.snapshot ? '-SNAPSHOT' : '')
  }

  return this;
}
