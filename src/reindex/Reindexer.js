function Reindexer(index) {
  var src = index.name;
  var dest = src + "-" + version;

  function create_dest_index() {
    if (index.get_reindex_status() !== 'starting') {
      return Promise.resolve()
    }
    return es.get('/' + src) //
    .then(function(d) {
      d = d[src];

      delete d.warmers;

      index.state.aliases = d.aliases;
      delete d.aliases;

      index.state.refresh = d.settings.index.refresh_interval || '1s';
      index.state.replicas = d.settings.index.number_of_replicas;

      d.settings.index.refresh_interval = -1;
      d.settings.index.number_of_replicas = 0;

      delete d.settings.index.version;
      delete d.settings.index.creation_date;
      delete d.settings.index.blocks;
      delete d.settings.index.legacy;

      console.log('Creating index `' + dest + '`');
      return es.put('/' + dest, {}, d)

      .then(function() {
        return index.set_reindex_status('index_created')
      });
    });
  }

  function set_src_read_only() {
    if (index.get_reindex_status() !== 'index_created') {
      return Promise.resolve()
    }
    console.log('Setting index `' + src + '` to read-only');
    return es.put('/' + src + '/_settings', {}, {
      "index.blocks.write" : true
    });
  }

  function start_reindex() {
    if (index.get_reindex_status() !== 'index_created') {
      return Promise.resolve()
    }
    console.log('Starting reindex');
    return es.post('/_reindex', {
      wait_for_completion : false
    }, {
      source : {
        index : src
      },
      dest : {
        index : dest,
        version_type : "external"
      }
    }) //
    .then(function(r) {
      index.state.task_id = r.task;
      return index.set_reindex_status('reindexing');
    });
  }

  function monitor_reindex() {
    if (index.get_reindex_status() !== 'reindexing') {
      return Promise.resolve();
    }
    if (!index.state.task_id) {
      throw ("Index should be reindexing, but there is no task ID");
    }

    return new MonitorTask(index, index.state.task_id).then(function() {
      index.set_reindex_status('reindexed');
      return es.post('/' + dest + '/_refresh');
    });
  }

  function check_success() {
    if (index.get_reindex_status() !== 'reindexed') {
      return Promise.resolve();
    }
    return Promise.all([
      es.get('/' + src + '/_count'), es.get('/' + dest + '/_count')
    ]) //
    .then(
      function(d) {
        if (d[0].count !== d[1].count) {
          throw ('Index `'
            + src
            + '` has `'
            + d[0].count
            + '` docs, but index `'
            + dest
            + '` has `'
            + d[1].count + '` docs');
        }
        console.log('Indices `'
          + src
          + '` and `'
          + dest
          + '` have the same number of docs');
      });
  }

  function finalise_dest() {
    if (index.get_reindex_status() !== 'reindexed') {
      return Promise.resolve();
    }
    var settings = {
      "index.number_of_replicas" : index.state.replicas,
      "index.refresh_interval" : index.state.refresh
    };

    console.log('Adding replicas to index `' + dest + '`');

    return es.put('/' + dest + '/_settings', {}, settings) //
    .then(function() {
      console.log('Waiting for index `' + dest + '` to turn green');
      index.set_extra('Waiting for index `' + dest + '` to turn `green`');
      return new MonitorHealth(index, dest)
    })

  }

  function delete_src() {
    if (index.get_reindex_status() !== 'green') {
      return Promise.resolve();
    }
    console.log('Deleting index `' + src + '`');
    return es.del('/' + src) //
    .then(function() {
      return index.set_reindex_status('src_deleted');
    });
  }

  function add_aliases_to_dest() {
    if (index.get_reindex_status() !== 'src_deleted') {
      return Promise.resolve();
    }
    console.log('Adding aliases to index `' + src + '`');
    var actions = [
      {
        add : {
          index : dest,
          alias : src
        }
      }
    ];

    _.forEach(index.state.aliases, function(v, k) {
      v.index = dest;
      v.alias = k;
      actions.push({
        add : v
      });
    });

    return es.post('/_aliases', {}, {
      actions : actions
    })

    .then(function() {
      return index.set_reindex_status('finished');
    });
  }

  function reset() {
    console.log('Resetting index `' + src + '` and index `' + dest + '`');
    index.set_extra('');
    return Promise
      .all([ //
        es.get('/' + src + '/_count'), //
        es.get('/_cluster/health/' + src, {
          level : "indices"
        })
      //
      ])

      .then(
        function(r) {
          if (r[0].count !== index.info.docs) {
            throw ('Doc count in index `' + src + '` has changed. Not resetting.')
          }

          var health = _.get(r[1], 'indices.' + src + '.status') || 'missing';
          if (health !== 'green') {
            throw ('Health of index `'
              + src
              + '` is `'
              + health
              + '`, not `green`. ' + 'Not resetting.');
          }

          console.log('Setting index `' + src + '` to writable');
        })

      .then(function() {
        return es.put('/' + src + '/_settings', {}, {
          "index.blocks.write" : false
        });
      })

      .then(function() {
        console.log('Deleting index `' + dest + '`');
        return es.del('/' + dest).caught(ES_Error, function(e) {
          if (e.status !== 404) {
            throw (e);
          }
        })
      })

      .lastly(function() {
        index.set_extra('');
        return index.set_reindex_status('');
      })

      .caught(handle_error);
  }

  function handle_error(e) {
    index.state.error = e.toString();
    return index.set_reindex_status('error') //
    .then(function() {
      throw (e)
    });

  }

  function reindex() {

    if (index.get_reindex_status() === 'error') {
      return Promise.reject("Cannot reindex `"
        + src
        + "`. First resolve error: "
        + state.error);
    }

    console.log('Reindexing `' + src + '` to `' + dest + '`');

    return create_dest_index() //
    .then(set_src_read_only) //
    .then(start_reindex) //
    .then(monitor_reindex) //
    .then(check_success) //
    .then(finalise_dest) //
    .then(delete_src) //
    .then(add_aliases_to_dest) //
    .then(function() {
      if (index.get_reindex_status() === 'cancelled') {
        console.log('Reindexing cancelled');
        return reset();
      }
      return console.log('Reindexing completed successfully');
    }) //
    .caught(handle_error);
  }

  return {
    reindex : reindex,
    reset : reset
  }

}
