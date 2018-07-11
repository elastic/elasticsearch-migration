"use strict";

function Indices() {

  require('Mapping.js');
  require('Warmers.js');
  require('IndexSettings.js');

  var indices_color = 'green';
  var indices;

  function remove_old_indices() {
    return check_hash(
      'red',
      'Indices created before v2.0.0 must be reindexed with the '
        + '<a href="#" onclick="global_switch_view(\'reindex\')">Reindex Helper</a>',
      indices,
      function(v, k) {
        if (v.settings.index.version.created < '2000000') {
          delete indices[k];
          return '`' + k + '`';
        }
      },
      "https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking-changes-5.0.html#_indices_created_before_5_0");
  }

  function indexed_scripts() {
    return check_hash(
      'yellow',
      'Indexed scripts/templates moved to cluster state',
      indices,
      function(v, k) {
        if (k === '.scripts') {
          delete indices[k];
          return "Indexed scripts and templates in the `.scripts` index will need to be recreated as `stored` scripts/templates";
        }
      },
      "https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_scripting.html#_indexed_scripts_and_templates");
  }

  function shards_per_index() {
    var min_required_shards = 0;
    var fail = [];
    _.forEach(indices, function(v, k) {
      var shard_count = parseInt(v.settings.index.number_of_shards);
      if (shard_count > 1024) {
        fail.push(k + " has " + shard_count + " shards.");
        if (shard_count > min_required_shards) {
          min_required_shards = shard_count;
        }
      }
    });
    if (min_required_shards > 0) {
      fail
        .push("<b>At least 1 index has `"
          + min_required_shards
          + "` shards.  By default, Elasticsearch 5.0.0 will not start up with"
          + " any index containing > 1024 shards.  If you wish to upgrade, you will need to start Elasticsearch 5.0.0 by setting"
          + " <br>`export ES_JAVA_OPTS=\"-Des.index.max_number_of_shards="
          + min_required_shards
          + "\"`"
          + " <br>first on every node.</b>");
    }
    return log
      .result(
        'red',
        'High index shard count',
        fail,
        'https://www.elastic.co/guide/en/elasticsearch/reference/5.0/index-modules.html#_static_index_settings');
  }

  function total_shards() {
    var total = 0;
    _.forEach(indices, function(v, k) {
      total += parseInt(v.settings.index.number_of_shards);
    });
    var fail = [];
    if (total > 1000) {
      fail
        .push("In 5.x, a maximum of 1000 shards can be queried in a single request.  This cluster has `"
          + total
          + "` primary shards.");
    }
    return log
      .result(
        'blue',
        "Total primary shards",
        fail,
        "https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_search_changes.html#_search_shard_limit")
  }

  function index_names() {
    return check_hash(
      'yellow',
      'New indices in 5.x may not begin with `_`, `-`, or `+`',
      indices,
      function(v, k) {
        if (k.match(/^[-_+]/)) {
          return k
        }
      },
      "https://www.elastic.co/guide/en/elasticsearch/reference/5.0/breaking_50_index_apis.html#_creating_indices_starting_with_emphasis_emphasis_or_emphasis_emphasis");
  }

  function per_index_checks(index_names) {

    function _check() {
      var index = index_names.shift();
      if (!index) {
        return;
      }
      var index_color = 'green';

      log.start_section('index', '`' + index + '`');
      log.start_section('mappings', 'Mappings');

      return new Mapping(index)

      .then(function(color) {
        index_color = process_color(index_color, color);
        log.start_section('warmers', 'Warmers');
        return new Warmers(index)
      })

      .then(function(color) {
        index_color = process_color(index_color, color);
        log.start_section('settings', 'Index settings');
        return new IndexSettings(index)
      })

      .then(function(color) {
        index_color = process_color(index_color, color);
        indices_color = process_color(indices_color, index_color);
        return _check();
      })

    }
    return _check();
  }

  return es.get(
    '/_cluster/state/metadata',
    {
      filter_path : "metadata.indices.*.state,"
        + "metadata.indices.*.settings.index.version.created,"
        + "metadata.indices.*.settings.index.number_of_shards"
    })

  .then(function(r) {
    if (_.has(r, [
      'metadata', 'indices', '.security'
    ])) {
      delete r.metadata.indices['.security'];
      if (_.keys(r.metadata.indices).length === 0) {
        r = {}
      }
    }
    if (!r.metadata) {
      log.log('No indices to check');
      return;
    }
    indices = r.metadata.indices;
    indices_color = worse(indices_color, remove_old_indices());
    indices_color = worse(indices_color, total_shards());
    indices_color = worse(indices_color, indexed_scripts());
    indices_color = worse(indices_color, shards_per_index());
    indices_color = worse(indices_color, index_names());
    return per_index_checks(_.keys(indices).sort());
  })

  .then(function() {
    return indices_color;
  });

};
