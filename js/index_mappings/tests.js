"use strict";

Checks
  .register(
    "tests",

    /* _id field */

    [
      {
        name : "Field: _id",
        setup : [

        [ "PUT", "/good", {
          mappings : {
            test : {}
          }
        } ],

        [ "PUT", "/bad", {
          mappings : {
            test : {
              _id : {
                store : true
              }
            }
          }
        } ],

        ],

        checks : [ {
          index : "good"
        }, {
          index : "bad",
          msg : /The _id field can no longer be configured/
        } ]
      },

      /* _type field */
      {
        name : "Field: _type",
        setup : [

        [ "PUT", "/good", {
          mappings : {
            test : {}
          }
        } ],

        [ "PUT", "/bad", {
          mappings : {
            test : {
              _type : {
                store : true
              }
            }
          }
        } ],

        ],

        checks : [ {
          index : "good"
        }, {
          index : "bad",
          msg : /The _type field can no longer be configured/
        } ]
      },


      /* _analyzer field */

      {
        name : "Field: _analyzer",
        setup : [

        [ "PUT", "/good", {
          mappings : {
            test : {}
          }
        } ],

        [ "PUT", "/meta", {
          mappings : {
            test : {
              _analyzer : {
                path : "foo"
              }
            }
          }
        } ],

        [ "PUT", "/field/type/1", {
          foo : "bar",
          _analyzer : "whitespace"
        } ]

        ],

        checks : [ {
          index : "good"
        }, {
          index : "meta",
          msg : /The _analyzer field has been removed /
        }, {
          index : "field",
          msg : /The _analyzer field has been removed /
        } ]
      },

      /* _boost field */

      {
        name : "Field: _boost",
        setup : [

        [ "PUT", "/good", {
          mappings : {
            test : {}
          }
        } ],

        [ "PUT", "/bad", {
          mappings : {
            test : {
              _boost : {
                name : "foo"
              }
            }
          }
        } ]

        ],

        checks : [ {
          index : "good"
        }, {
          index : "bad",
          msg : /The _boost field has been removed /
        } ]
      },

      /* _routing field */

      {
        name : "Field: _routing",
        setup : [

        [ "PUT", "/good", {
          mappings : {
            test : {
              _routing : {
                required : true
              }
            }
          }
        } ],

        [ "PUT", "/bad", {
          mappings : {
            test : {
              _routing : {
                required : true,
                path : "foo"
              }
            }
          }
        } ]

        ],

        checks : [ {
          index : "good"
        }, {
          index : "bad",
          msg : /The _routing field will only accept the required parameter/
        } ]
      },

      /* _index field */

      {
        name : "Field: _index",
        skip : {
          lt : "1.4.*"
        },
        setup : [

        [ "PUT", "/good", {
          mappings : {
            test : {
              _index : {
                enabled : true
              }
            }
          }
        } ],

        [ "PUT", "/bad", {
          mappings : {
            test : {
              _index : {
                store : true
              }
            }
          }
        } ]

        ],

        checks : [ {
          index : "good"
        }, {
          index : "bad",
          msg : /The _index field will only accept the enabled parameter/
        } ]
      },

      /* _size field */

      {
        name : "Field: _size",
        skip : {
          lt : "1.4.*"
        },
        setup : [

        [ "PUT", "/good", {
          mappings : {
            test : {
              _size : {
                enabled : true
              }
            }
          }
        } ],

        [ "PUT", "/bad", {
          mappings : {
            test : {
              _size : {
                store : true
              }
            }
          }
        } ]

        ],

        checks : [ {
          index : "good"
        }, {
          index : "bad",
          msg : /The _size field will only accept the enabled parameter/
        } ]
      },

      /* _timestamp field */
      {
        name : "Field: _timestamp",
        setup : [

        [ "PUT", "/good", {
          "mappings" : {
            "good" : {
              "_timestamp" : {
                "enabled" : true,
                "format" : "dateOptionalTime",
                "default" : "2015-01-01"
              }
            }
          }
        } ],

        [ "PUT", "/bad", {
          "mappings" : {
            "bad" : {
              "_timestamp" : {
                "enabled" : true,
                "format" : "dateOptionalTime",
                "path" : "date",
                "store" : true,
                "default" : "2015-01-01",
                "index" : "no"
              }
            }
          }
        } ]

        ],

        checks : [ {
          index : "good"
        }, {
          index : "bad",
          msg : /The _timestamp field will only accept the enabled/
        } ]
      },

      /* Type level analyzer settings */

      {
        name : "Type-level analyzer settings",
        setup : [

        [ "PUT", "/good", {
          mappings : {
            test : {}
          }
        } ],

        [ "PUT", "/bad", {
          mappings : {
            analyzer : {
              analyzer : "whitespace",
              properties : {}
            },
            index_analyzer : {
              index_analyzer : "whitespace",
              properties : {}
            },
            search_analyzer : {
              search_analyzer : "whitespace",
              properties : {}
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
            msg : /analyzer.*have been removed.*in types: analyzer, index_analyzer, search_analyzer/
          } ]
      }

    ]);
