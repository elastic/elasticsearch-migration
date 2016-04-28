"use strict";

Checks
  .register(
    "tests",

    /* In-memory indices */

    [
      {
        name : "In-memory indices",
        setup : [

        [ "PUT", "/ram", {
          settings : {
            "index.store.type" : "ram"
          }
        } ],

        [ "PUT", "/memory", {
          settings : {
            "index.store.type" : "memory"
          }
        } ],

        [ "PUT", "/good", {} ]

        ],

        checks : [ {
          index : "ram",
          msg : /index.store.type.*no longer supported/
        }, {
          index : "memory",
          msg : /index.store.type.*no longer supported/
        }, {
          index : "good"
        } ]
      },

      /* Type wrapper setting */

      {
        name : "Type wrapper setting",
        setup : [

        [ "PUT", "/good", {
          settings : {
            "index.mapping.allow_type_wrapper" : false
          }
        } ],

        [ "PUT", "/bad", {
          settings : {
            "index.mapping.allow_type_wrapper" : true
          }
        } ],

        [ "PUT", "/not_set" ]

        ],

        checks : [ {
          index : "good"
        }, {
          index : "not_set"
        }, {
          index : "bad",
          msg : /index.mapping.allow_type_wrapper/
        } ]

      },

      /* Codec setting */

      {
        name : "Codec setting",
        skip : {
          gte : "1.4.*"
        },
        setup : [

        [ "PUT", "/good" ], [ "PUT", "/bad", {
          settings : {
            "codec.postings_format" : {
              my_format : {
                type : "pulsing",
                freq_cut_off : 5
              }
            }
          }
        } ]

        ],
        checks : [ {
          index : "good"
        }, {
          index : "bad",
          msg : /Custom codecs can no longer be configured/
        } ]

      },

      /* Default index analyzer */
      {
        name : "Default index analyzer",
        setup : [ [ "PUT", "/good", {
          "settings" : {
            "analysis" : {
              "analyzer" : {
                "default" : {
                  "type" : "standard"
                }
              }
            }
          }
        } ], [ "PUT", "/bad", {
          "settings" : {
            "analysis" : {
              "analyzer" : {
                "default_index" : {
                  "type" : "standard"
                }
              }
            }
          }
        } ]

        ],

        checks : [ {
          index : "good"
        }, {
          index : "bad",
          msg : /default_index analyzer/
        } ]
      },

      /* Units for time and byte settings */
      {
        name : "Units for time and byte settings",
        setup : [ [ "PUT", "/units", {
          "settings" : {
            "index" : {
              "refresh_interval" : "1s"
            }
          }
        } ], [ "PUT", "/exempt", {
          "settings" : {
            "index" : {
              "refresh_interval" : "-1"
            }
          }
        } ], [ "PUT", "/bad", {
          "settings" : {
            "index" : {
              "refresh_interval" : "1000"
            }
          }
        } ]

        ],

        checks : [ {
          index : "units"
        }, {
          index : "exempt"
        }, {
          index : "bad",
          msg : /Units are required.*index.refresh_interval/
        } ]
      },

      /* Merge policy settings */
      {
        name : "Merge policy settings",
        setup : [ [ "PUT", "/good", {
          "settings" : {
            "index" : {
              "refresh_interval" : "1s"
            }
          }
        } ], [ "PUT", "/bad", {
          "settings" : {
            "index" : {
              "merge.policy.max_merge_docs" : "10000"
            }
          }
        } ]

        ],

        checks : [
          {
            index : "good"
          },
          {
            index : "bad",
            msg : /Merge policy settings will be ignored: index.merge.policy.max_merge_docs/
          } ]
      },

      /* Index buffer size */
      {
        name : "Index buffer size setting",
        setup : [ [ "PUT", "/good", {} ], [ "PUT", "/bad", {
          "settings" : {
            "index" : {
              "buffer_size" : "2mb"
            }
          }
        } ]

        ],

        checks : [ {
          index : "good"
        }, {
          index : "bad",
          msg : /index.buffer_size setting/
        } ]
      },

    ]);
