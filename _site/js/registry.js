"use strict";

var Checks = (function() {
  var registry = {
    "cluster.settings" : [],
    "index.settings" : [],
    "index.segments" : [],
    "index.mappings" : [],
    "index.flat_mappings" : [],
    "index.mappings.fields" : [],
    "tests" : []
  };

  function register(phase, checks) {
    forall(checks, function(check) {
      registry[phase].push(check)
    });
    return Checks;
  }

  function checks_for_phase(phase) {
    return registry[phase];
  }

  function get_key(o, path) {
    while (path.length) {
      if (!(o instanceof Object)) {
        return "";
      }
      var matches = path.match(/^((?:\\.|[^.])+)\.?/);
      path = path.substring(matches[0].length);

      var key = matches[1].replace(/\\/g, '');
      if (o.hasOwnProperty(key)) {
        o = o[key]
      } else if (o.hasOwnProperty('.' + key)) {
        o = o['.' + key]
      } else {
        return "";
      }
    }

    return o === undefined ? "" : o;
  }

  function worse_color(current_color, new_color) {
    if (current_color === 'red' || new_color === 'red') {
      return 'red'
    }
    if (current_color === 'yellow' || new_color === 'yellow') {
      return 'yellow'
    }
    if (current_color === 'blue' || new_color === 'blue') {
      return 'blue'
    }
    return 'green';
  }

  return {
    checks_for_phase : checks_for_phase,
    get_key : get_key,
    register : register,
    worse_color : worse_color
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
