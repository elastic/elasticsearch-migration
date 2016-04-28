"use strict";

Checks.register("tests", [
/* Units for time and byte settings */
{
  name : "Units for time and byte cluster settings",
  setup : [ [ "PUT", "/_cluster/settings", {
    "persistent" : {
      "discovery.zen.publish_timeout" : "30s",
      "indices.ttl.interval" : 15000
    }
  } ]

  ],

  checks : [ {
    cluster : "Cluster settings",
    msg : /Units are required.*: indices.ttl.interval$/
  } ]
}

]);
