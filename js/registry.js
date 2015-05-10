"use strict";

var Checks = (function() {
  var registry = {
    "index.settings" : [],
    "index.segments" : [],
    "index.mappings" : [],
    "index.flat_mappings" : [],
    "index.mappings.fields" : []
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
    for ( var type in mappings) {
      if (f(type)) {
        errors.push("`" + type + "`");
      }
    }
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
