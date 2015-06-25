"use strict";

Checks.register("tests", [
/* Units for time and byte settings */
{
  name : "Units for time and byte cluster settings",
  setup : [ [ "PUT", "/_cluster/settings", {
    "persistent" : {
      "discovery.zen.publish_timeout" : "30s",
      "cluster.info.update.timeout" : 15000
    }
  } ]

  ],

  checks : [ {
    cluster : "Cluster settings",
    msg : /Units are required.*: cluster.info.update.timeout$/
  } ]
}

]);
