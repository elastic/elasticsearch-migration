"use strict";

Checks
  .register(
    "index.segments",
    [

    {
      name : "Ancient index segments",
      color : "red",
      check : function(segments) {
        for ( var shard_num in segments.shards) {
          var group = segments.shards[shard_num];
          for (var j = 0; j < group.length; j++) {
            for ( var segment_name in group[j].segments) {
              var segment = group[j].segments[segment_name]
              if (!Checks.get_key(segment, 'version').match('^[45]')) {
                return "This index contains segments created before Lucene 4. "
                  + 'Install Elasticsearch 1.6.x and upgrade this "+"index with the <a href="http://www.elastic.co/guide/en/elasticsearch/reference/current/indices-upgrade.html">`upgrade` API</a>.';
              }
            }
          }
        }
      }
    }

    ]);
