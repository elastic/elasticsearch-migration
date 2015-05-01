/* Index settings */
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

Checks
    .register(
        {
            name : "In-memory indices",
            phase : "index.settings",
            color : "red",
            check : function(settings) {
                var o = Checks.get_key(settings, "index.store.type");
                if (Checks.get_key(settings, "index.store.type").match(
                    /ram|memory/)) {
                    return "Indices with `index.store.type` of `ram` or `memory` "
                        + "are no longer supported."
                }
            }
        })

    .register(
        {
            name : "Type wrapper",
            phase : "index.settings",
            color : "red",
            check : function(settings) {
                if (Checks
                    .get_key(settings, "index.mapping.allow_type_wrapper") == 'true') {
                    return "The document `_source` field may no longer have "
                        + "the type name as the root element. "
                        + "Remove the `index.mapping.allow_type_wrapper` setting.";
                }
            }
        })

    /* Index segments */

    .register(
        {
            name : "Ancient index segments",
            phase : "index.segments",
            color : "red",
            check : function(segments) {
                for ( var shard_num in segments.shards) {
                    var group = segments.shards[shard_num];
                    for (var j = 0; j < group.length; j++) {
                        for (segment_name in group[j].segments) {
                            var segment = group[j].segments[segment_name]
                            if (!Checks.get_key(segment, 'version').match(
                                '^[45]')) {
                                return "This index contains segments created before Lucene 4. "
                                    + 'Install Elasticsearch 1.6.x and upgrade this "+"index with the <a href="http://www.elastic.co/guide/en/elasticsearch/reference/current/indices-upgrade.html">`upgrade` API</a>.';
                            }
                        }
                    }
                }
            }
        })

    /* Index mappings */

    .register(
        {
            name : "Source field",
            phase : "index.mappings",
            color : "yellow",
            check : function(mappings) {
                return check_types(
                    "The `_source` field can no longer be disabled",
                    mappings,
                    function(type) {
                        return Checks
                            .get_key(mappings[type], '_source.enabled') === false
                    });
            }
        })

    .register(
        {
            name : "Boost field",
            phase : "index.mappings",
            color : "yellow",
            check : function(mappings) {
                return check_types(
                    "The `_boost` field has been removed",
                    mappings,
                    function(type) {
                        return Checks.get_key(mappings[type], '_boost')
                    });
            }
        })

    .register(
        {
            name : "Analyzer field",
            phase : "index.mappings",
            color : "yellow",
            check : function(mappings) {
                return check_types(
                    "`_analyzer` field has been removed",
                    mappings,
                    function(type) {
                        return Checks.get_key(mappings[type], '_analyzer')
                    });
            }
        })

    .register(
        {
            name : "Type-level analyzer defaults",
            phase : "index.mappings",
            color : "yellow",
            check : function(mappings) {
                return check_types(
                    "`analyzer`, `search_analyzer` and `index_analyzer` settings have been removed",
                    mappings,
                    function(type) {
                        return Checks
                            .get_key(mappings[type], 'search_analyzer')
                            || Checks.get_key(mappings[type], 'index_analyzer')
                            || Checks.get_key(mappings[type], 'analyzer');
                    });
            }
        })

    .register(
        {
            name : "Conflicting field mappings",
            phase : "index.mappings",
            color : "red",
            check : function(mappings) {
                var errors = [];
                var fields = {};
                var conflicts = [];
                var safe = {
                    _name : true,
                    "fielddata.format" : true
                // TODO: Add other safe mapping keys
                };

                function flatten_fields(d) {
                    var vals = {};

                    function flatten(prefix, d) {
                        for ( var key in d) {
                            if (d[key] instanceof Object) {
                                flatten(prefix + key + ".", d[key])
                            } else if (!safe.hasOwnProperty(prefix+key)){
                                vals[prefix + key] = d[key];
                            }
                        }
                    }
                    flatten('', d);
                    return vals;
                }


                function cmp_fields(first, second) {
                    for ( var key in first) {
                        if (!second.hasOwnProperty(key)
                            || first[key] !== second[key]) {
                            return true;
                        } else {
                            delete second[key]
                        }
                    }
                    if (Object.keys(second).length) {
                        return true;
                    }
                    return false;
                }

                function find_conflicts(first, others) {
                    var f_vals = flatten_fields(first);

                    for (var i = 0; i < others.length; i++) {
                        var o_vals = flatten_fields(others[i]);

                        if (cmp_fields(f_vals, o_vals)) {
                            conflicts
                                .push("Mapping for field `" + first._name
                                    + "` conflicts with: `" + others[i]._name
                                    + "`");
                        }
                    }
                }


                for (var type in mappings) {
                    for (var field_name in mappings[type].properties) {
                        var field = mappings[type].properties[field_name];
                        if (fields.hasOwnProperty(field_name)){
                            fields[field_name].push(field);
                        }else {
                            fields[field_name] = [field];
                        }
                    }
                }

                var field_names = Object.keys(fields).sort();
                var errors = [];
                for (var i = 0; i < field_names.length; i++) {
                    var name = field_names[i];
                    find_conflicts(fields[name].shift(), fields[name]);
                }
                if (conflicts.length) {
                    return conflicts.join("\n");
                }
            }
        });
