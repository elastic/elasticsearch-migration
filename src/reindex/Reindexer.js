function Reindexer(index) {
  var src = index.name;
  var dest = src + "-" + version;

  function run_stmt(r) {
    if (!r) {
      return;
    }
    if (r.log) {
      console.log(r.log);
    }
    return es[r.method](r.path, r.qs, r.body);
  }

  function create_dest_index() {
    if (index.get_reindex_status() !== 'starting') {
      return Promise.resolve()
    }

    return create_dest_index_stmt().then(run_stmt)

    .then(function() {
      return index.set_reindex_status('index_created')
    });
  }

  function create_dest_index_stmt() {
    return es.get('/' + encodeURIComponent(src)) //
    .then(function(d) {
      d = d[src];

      delete d.warmers;

      index.state.aliases = d.aliases;
      delete d.aliases;

      index.state.refresh = d.settings.index.refresh_interval || '1s';
      index.state.replicas = d.settings.index.number_of_replicas;

      d.settings.index.refresh_interval = -1;
      d.settings.index.number_of_replicas = 0;

      delete d.settings.index.uuid;
      delete d.settings.index.version;
      delete d.settings.index.creation_date;
      delete d.settings.index.blocks;
      delete d.settings.index.legacy;
      return {
        log : 'Creating index `' + dest + '`',
        method : "put",
        path : '/' + encodeURIComponent(dest),
        body : d
      };
    });
  }

  function set_src_read_only() {
    if (index.get_reindex_status() !== 'index_created') {
      return Promise.resolve()
    }

    return set_src_read_only_stmt().then(run_stmt)
  }

  function set_src_read_only_stmt() {
    return Promise.resolve({
      log : 'Setting index `' + src + '` to read-only',
      method : 'put',
      path : '/' + encodeURIComponent(src) + '/_settings',
      body : {
        "index.blocks.write" : true
      }
    });
  }

  function start_reindex() {
    if (index.get_reindex_status() !== 'index_created') {
      return Promise.resolve()
    }
    return start_reindex_stmt().then(run_stmt)

    .then(function(r) {
      index.state.task_id = r.task;
      return index.set_reindex_status('reindexing');
    });
  }

  function start_reindex_stmt() {
    return Promise.resolve({
      log : "Starting reindex",
      method : 'post',
      path : '/_reindex',
      qs : {
        wait_for_completion : false
      },
      body : {
        source : {
          index : src,
          sort : "_doc",
          size : 1000
        },
        dest : {
          index : dest,
          version_type : "external"
        }
      }
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
      return es.post('/' + encodeURIComponent(dest) + '/_refresh');
    });
  }

  function monitor_task_stmt() {
    return Promise
      .resolve({
        log : "Use the task_id from the reindex request above to monitor the reindex status",
        method : "get",
        path : "/_tasks/{TASK_ID}",
        qs : {
          detailed : true
        }
      });
  }

  function check_success() {
    if (index.get_reindex_status() !== 'reindexed') {
      return Promise.resolve();
    }
    var src_count;
    return check_src_count_stmt().then(run_stmt)

    .then(function(r) {
      src_count = r.count;
      return check_dest_count_stmt()
    }).then(run_stmt)

    .then(
      function(r) {
        if (r.count !== src_count) {
          throw ('Index `'
            + src
            + '` has `'
            + src_count
            + '` docs, but index `'
            + dest
            + '` has `'
            + r.count + '` docs');
        }
        console.log('Indices `'
          + src
          + '` and `'
          + dest
          + '` have the same number of docs');
      });
  }

  function check_src_count_stmt() {
    return Promise.resolve({
      log : "Check that `"
        + src
        + "` and `"
        + dest
        + "` have the same number of documents",
      method : "get",
      path : '/' + encodeURIComponent(src) + '/_count'
    });

  }

  function check_dest_count_stmt() {
    return Promise.resolve({
      method : "get",
      path : '/' + encodeURIComponent(dest) + '/_count'
    });

  }

  function finalise_dest() {
    if (index.get_reindex_status() !== 'reindexed') {
      return Promise.resolve();
    }
    return finalise_dest_stmt().then(run_stmt)

    .then(function() {
      console.log('Waiting for index `' + dest + '` to turn green');
      index.set_extra('Waiting for index `' + dest + '` to turn `green`');
      return new MonitorHealth(index, dest)
    })
  }

  function finalise_dest_stmt() {
    return Promise.resolve({
      log : 'Adding replicas to index `' + dest + '`',
      method : 'put',
      path : '/' + encodeURIComponent(dest) + '/_settings',
      body : {
        "index.number_of_replicas" : index.state.replicas,
        "index.refresh_interval" : index.state.refresh
      }
    });
  }

  function monitor_health_stmt() {
    return Promise.resolve({
      log : "Wait for index `" + dest + "` to turn green",
      method : "get",
      path : "/_cluster/health/" + encodeURIComponent(dest),
      qs : {
        wait_for_status : 'green'
      }
    });
  }

  function move_extra_aliases_to_dest() {
    if (index.get_reindex_status() !== 'green') {
      return Promise.resolve();
    }

    return move_extra_aliases_to_dest_stmt().then(run_stmt)

    .then(function() {
      return index.set_reindex_status('aliases_added');
    });
  }

  function move_extra_aliases_to_dest_stmt() {
    if (_.keys(index.state.aliases).length == 0) {
      return Promise.resolve();
    }

    var actions = [];

    _.forEach(index.state.aliases, function(v, k) {
      v.index = dest;
      v.alias = k;
      actions.push({
        add : v
      });
    });
    return Promise.resolve({
      log : 'Moving extra aliases to index `' + dest + '`',
      method : 'post',
      path : '/_aliases',
      body : {
        actions : actions
      }
    });
  }

  function delete_src() {
    if (index.get_reindex_status() !== 'aliases_added') {
      return Promise.resolve();
    }
    return delete_src_stmt().then(run_stmt)

    .then(function() {
      return index.set_reindex_status('src_deleted');
    });
  }

  function delete_src_stmt() {
    return Promise.resolve({
      log : 'Deleting index `' + src + '`',
      method : 'del',
      path : '/' + encodeURIComponent(src)
    });
  }

  function add_name_alias_to_dest() {
    if (index.get_reindex_status() !== 'src_deleted') {
      return Promise.resolve();
    }

    return add_name_alias_to_dest_stmt().then(run_stmt)

    .then(function() {
      return index.set_reindex_status('finished');
    });
  }

  function add_name_alias_to_dest_stmt() {
    var actions = [
      {
        add : {
          index : dest,
          alias : src
        }
      }
    ];

    return Promise.resolve({
      log : 'Adding `' + src + '` alias to index `' + dest + '`',
      method : 'post',
      path : '/_aliases',
      body : {
        actions : actions
      }
    });
  }

  function reset() {
    console.log('Resetting index `' + src + '` and index `' + dest + '`');
    index.set_extra('');
    return Promise
      .all([ //
        es.get('/' + encodeURIComponent(src) + '/_count'), //
        es.get('/_cluster/health/' + encodeURIComponent(src), {
          level : "indices"
        })
      //
      ])

      .then(
        function(r) {
          if (r[0].count !== index.info.docs) {
            throw ('Doc count in index `' + src + '` has changed. Not resetting.')
          }

          var health = _.get(r[1], [
            'indices', src, 'status'
          ]) || 'missing';
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
        return es.put('/' + encodeURIComponent(src) + '/_settings', {}, {
          "index.blocks.write" : false
        });
      })

      .then(
        function() {
          console.log('Deleting index `' + dest + '`');
          return es.del('/' + encodeURIComponent(dest)).caught(
            ES_Error,
            function(e) {
              if (e.status !== 404) {
                throw (e);
              }
            })
        })

      .lastly(function() {
        error.empty();
        index.set_extra('');
        index.set_reindex_status('');
        reindex_next();
        return;
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
    .then(move_extra_aliases_to_dest) //
    .then(delete_src) //
    .then(add_name_alias_to_dest) //
    .then(function() {
      if (index.get_reindex_status() === 'cancelled') {
        console.log('Reindexing cancelled');
        return reset();
      }
      return console.log('Reindexing completed successfully');
    }) //
    .caught(handle_error);
  }

  function reindex_to_html() {
    var out;
    function print_stmt(r) {
      if (!r) {
        return;
      }
      var html = "";
      if (r.log) {
        html = '<pre>## ' + r.log + "</pre>\n";
      }
      var method;
      switch (r.method) {
      case 'get':
        method = 'GET';
        break;
      case 'put':
        method = 'PUT';
        break;
      case 'post':
        method = 'POST';
        break;
      case 'del':
        method = 'DELETE';
        break;
      }
      var url = es.host + r.path;
      if (r.qs) {
        url += '?' + jQuery.param(r.qs);
      }
      html += '<pre class="curl">curl -X' + method + " '" + url + "'";

      if (r.body) {
        html += " -d '\n" + JSON.stringify(r.body, null, 2) + "\n'\n"
      } else {
        html += "\n"
      }
      ;

      html += "</pre>\n\n";
      out.append(html);
    }
    var close = jQuery('<a href="#">Close</a>').click(function(e) {
      e.preventDefault();
      jQuery('#reindex_process').hide()
    });
    out = jQuery('#reindex_process').empty().show().append(
      '<div id="reindex_content"></div>').find('#reindex_content');
    out.append(close);
    out.append('<h2>Steps to manually reindex <code>'
      + src
      + '</code> to <code>'
      + dest
      + '</code></h2>'
      + "\n");

    return create_dest_index_stmt().then(print_stmt).then(
      set_src_read_only_stmt).then(print_stmt) //
    .then(start_reindex_stmt).then(print_stmt) //
    .then(monitor_task_stmt).then(print_stmt) //
    .then(check_src_count_stmt).then(print_stmt) //
    .then(check_dest_count_stmt).then(print_stmt) //
    .then(finalise_dest_stmt).then(print_stmt) //
    .then(monitor_health_stmt).then(print_stmt) //
    .then(move_extra_aliases_to_dest_stmt).then(print_stmt) //
    .then(delete_src_stmt).then(print_stmt) //
    .then(add_name_alias_to_dest_stmt).then(print_stmt) //

  }

  return {
    reindex : reindex,
    reindex_to_html : reindex_to_html,
    reset : reset
  }

}
