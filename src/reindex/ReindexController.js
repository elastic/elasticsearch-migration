"use strict";

var controller_init_time;

function ReindexController(es, wrapper, error) {

  require('Index.js');
  require('Indices.js');
  require('Reindexer.js');
  require('MonitorTask.js');
  require('MonitorHealth.js');

  var version;
  var current;
  var queue = [];

  function enqueue(index) {
    queue.push(index);
    reindex_next();
  }

  function dequeue(index) {
    var found = _.remove(queue, function(el) {
      return el.name === index.name
    });
    return found.length > 0;
  }

  function reindex_next() {
    var reindex_init_time = controller_init_time;

    if (current) {
      return;
    }

    function _next() {
      if (reindex_init_time !== controller_init_time) {
        return;
      }

      current = queue.shift();
      if (current) {
        Promise.resolve().then(function() {
          if (current.get_reindex_status() === 'queued') {
            return current.set_reindex_status('starting')
          }
        })

        .then(function() {
          return new Reindexer(current).reindex()
        })

        .caught(show_error).lastly(function() {
          current = undefined;
        })

        .delay(0).then(_next)
      }
    }

    _next();
  }

  function show_error(e) {
    error.empty().html(e);
    throw (e);
  }

  controller_init_time = Date.now();

  error.empty();
  wrapper.empty();

  console.log('Connecting to: ' + es.host);

  es.get_version().then(function(v) {
    version = v;
    if (v.lt('2.3.*') || v.gt('2.*')) {
      throw ('The Reindex Helper only works with Elasticsearch versions 2.3.0 - 2.4.x')
    }
    return new Indices(wrapper);
  }).caught(show_error);
}
