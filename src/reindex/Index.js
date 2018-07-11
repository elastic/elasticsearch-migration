function Index(name, info, state, on_change) {

  this.name = name;
  this.info = info;
  this.state = state || {
    reindex_status : ''
  };
  this.extra = '';

  this.sort_key = function() {
    return [
      this.info.state === 'close' ? '1' : '0',
      _.padStart(1000000 - parseInt(this.info.priority || 0), 7, '0'),
      (2000000000000 - this.info.created_timestamp),
      this.name
    ].join('~')
  };

  this.get_extra = function() {
    return this.extra
      || (this.info.state === 'close' && 'Index is closed, cannot be reindexed')
      || (this.info.health !== 'green' && 'Index is not green, cannot be reindexed')
      || (this.get_reindex_status() === 'error' && this.state.error)
      || '';
  };

  this.set_extra = function(extra) {
    this.extra = extra;
    return on_change(this.name)
  };

  this.get_reindex_status = function() {
    return this.state.reindex_status;
  }

  this.set_reindex_status = function(status) {
    if (status && this.state.reindex_status === 'cancelled') {
      return Promise.resolve();
    }
    if (status === this.state.reindex_status) {
      return Promise.resolve();
    }
    console.log("Setting status `" + status + "`");
    this.state.reindex_status = status;
    return status === 'finished' ? this.del() : this.save();
  }

  this.save = function() {
    var name = this.name;
    return es.put(
      '/' + Index.reindex_index + '/index/' + encodeURIComponent(name),
      {
        refresh : true
      },
      this.state)

    .then(function() {
      return on_change(name)
    });
  };

  this.del = function() {
    var name = this.name;
    return es.del(
      '/' + Index.reindex_index + '/index/' + encodeURIComponent(name),
      {
        refresh : true
      })

    .then(function() {
      return on_change(name)
    });
  };

  this.status = function() {

    if (this.info.state === 'close') {
      return 'Closed';
    }

    switch (this.info.health) {
    case 'red':
      return 'Red';
    case 'yellow':
      return 'Yellow';
    }

    switch (this.state.reindex_status) {
    case 'queued':
      return 'Queued';
    case 'error':
      return 'Error';
    case '':
      return 'Pending';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Reindexing'
    }
  };

  this.action = function() {

    var self = this;

    function cancel() {
      return [
        'Cancel',
        function() {
          var status = self.get_reindex_status();

          console.log("Cancelling status `" + status + "`");

          if (status === 'finished'
            || status === 'src_deleted'
            || status === 'green'
            || status === 'aliases_added') {
            console.log("Too late to cancel");
            return;
          }

          if (dequeue(self)) {
            console.log('Found job in queue')
            return self.set_reindex_status('');
          }

          return self.set_reindex_status('cancelled');

        }
      ]
    }

    function reset() {
      return [
        'Reset', function() {
          return new Reindexer(self).reset()
        }
      ]
    }

    function queue() {
      return [
        'Reindex',
        function() {
          var warning;
          if (self.name === '.kibana') {
            warning = 'Warning: You will need to reindex the .kibana index in order '
              + 'to upgrade to Elasticsearch 5.x. However, once you have done so, '
              + 'you will be unable to use Kibana 4.x unless you update kibana.yml to '
              + 'set: \n\n    kibana_index: .kibana-'
              + version
              + '\n\nDo you want to continue?';
          }
          if (self.name === '.watches') {
            warning = 'Warning: You will need to reindex the .watches index in order '
              + 'to upgrade to Elasticsearch 5.x. However, once you have done so, '
              + 'you will be unable to use Watcher in your current cluster.\n\n'
              + 'The .watches index cannot be reindexed correctly unless Watcher is disabled, '
              + 'which you can do by adding the following to your elasticsearch.yml files '
              + 'and restarting your cluster:'
              + '\n\n    watcher.enabled: false'
              + '\n\nDo you want to continue?';
          }
          if (warning && !confirm(warning)) {
            return;
          }
          return self.set_reindex_status('queued') //
          .then(function() {
            enqueue(self);
          });
        }
      ];
    }

    var status = this.status();
    switch (status) {
    case 'Closed':
    case 'Red':
    case 'Yellow':
      return;
    case 'Queued':
      return cancel();
    case 'Error':
    case 'Cancelled':
      return reset();
    case 'Reindexing':
      return cancel();
    case 'Pending':
      return queue();
    default:
      throw ("Unknown status: " + status);
    }
  }

}

Index.reindex_index = '.reindex-status';

Index.init_all_indices = function(on_change) {
  var indices = {};
  return Index.init_index()

  .then(function() {
    console.log('Loading index data');
    return es.post('/_refresh')
  })

  .then(
    function() {
      return Promise.all([
        es.get('/_cluster/state/metadata', {
          "filter_path" : "metadata.indices.*.state,"
            + "metadata.indices.*.settings.index.version.created,"
            + "metadata.indices.*.settings.index.creation_date,"
            + "metadata.indices.*.settings.index.number*,"
            + "metadata.indices.*.settings.index.priority"
        }),
        es.get('/_cluster/health', {
          "level" : "indices",
          "filter_path" : "indices.*.status"
        }),
        es.get('/_stats', {
          "human" : true,
          "filter_path" : "indices.*.primaries.docs.count,"
            + "indices.*.primaries.store.size"
        })

      ])
    })

  .then(
    function(d) {

      function format_version(version) {
        return version.substr(0, 1)
          + '.'
          + parseInt(version.substr(1, 2))
          + '.'
          + parseInt(version.substr(3, 2));
      }

      function format_date(timestamp) {
        var date = new Date(parseInt(timestamp));
        return date.getFullYear()
          + '-'
          + _.padStart(date.getMonth(), 2, '0')
          + '-'
          + _.padStart(date.getDay(), 2, '0');
      }

      var state = d[0].metadata.indices;
      var health = d[1].indices;
      var stats = d[2].indices || {};

      _.forEach(state, function(v, k) {

        var version = v.settings.index.version.created;
        if (version >= 2000000) {
          return;
        }

        indices[k] = {
          version : format_version(version),
          state : v.state,
          shards : v.settings.index.number_of_shards,
          replicas : v.settings.index.number_of_replicas,
          created : format_date(v.settings.index.creation_date),
          created_timestamp : v.settings.index.creation_date,
          priority : v.settings.index.priority || '',
          health : health[k] ? health[k].status : '',
          docs : stats[k] ? stats[k].primaries.docs.count : '',
          size : stats[k] ? stats[k].primaries.store.size : ''
        };

      });

      if (_.keys(indices).length === 0) {
        return Promise.resolve({
          docs : []
        });
      }
      return es.post('/' + Index.reindex_index + '/index/_mget', {
        filter_path : "docs._id,docs._source"
      }, {
        ids : _.keys(indices)
      });
    })

  .then(function(r) {
    _.forEach(r.docs, function(v) {
      indices[v._id] = new Index(v._id, indices[v._id], v._source, on_change)
    });

    if (_.keys(indices).length === 0) {
      return Index.delete_index();
    }
  })

  .then(function() {
    return indices;
  });
}

Index.init_index = function() {
  var index_name = Index.reindex_index;

  console.log('Creating index: `' + index_name + '`');
  return es.put('/' + index_name, {}, {
    "settings" : {
      "number_of_shards" : 1
    },
    "mappings" : {
      "index" : {
        "properties" : {
          "reindex_status" : {
            "type" : "string",
            "index" : "not_analyzed"
          },
          "task_id" : {
            "type" : "string",
            "index" : "not_analyzed"
          },
          "error" : {
            "enabled" : false
          },
          "aliases" : {
            "enabled" : false
          },
          "replicas" : {
            "enabled" : false
          },
          "refresh" : {
            "enabled" : false
          }

        }
      }
    }
  }) //
  .then(function() {
    console.log('Index `' + index_name + '` created successfully')
  }) //
  .caught(ES_Error, function(e) {
    if (e.type === 'index_already_exists_exception') {
      console.log('Index `' + index_name + '` already exists - skipping')
    } else {
      throw (e)
    }
  });
};

Index.delete_index = function() {
  var index_name = Index.reindex_index;
  console.log('Deleting `' + index_name + '`');
  return es.del('/' + index_name)

  .then(function() {
    console.log('Index `' + index_name + '` deleted successfully');
  })

  .caught(ES_Error, function(e) {
    if (e.type === 'index_not_found_exception') {
      console.log('Index `' + index_name + '` not found');
    } else {
      throw (e)
    }
  });
}
