"use strict";

Checks
  .register(
    "tests",
    [

    /* "Conflicting" fields */

    {
      "name" : "Conflicting field mappings",
      "setup" : [

      [ "PUT", "/good", {
        "mappings" : {
          "one" : {
            "properties" : {
              "aaa" : {
                "type" : "string"
              },
              "bbb" : {
                "properties" : {
                  "ccc" : {
                    "type" : "string"
                  }
                }
              }
            }
          },
          "two" : {
            "properties" : {
              "aaa" : {
                "type" : "string"
              },
              "bbb" : {
                "properties" : {
                  "ccc" : {
                    "type" : "string"
                  }

                }
              }
            }
          }
        }
      } ],

      [ "PUT", "/bad", {
        "mappings" : {
          "one" : {
            "properties" : {
              "aaa" : {
                "type" : "string"
              },
              "bbb" : {
                "properties" : {
                  "ccc" : {
                    "type" : "string"
                  }
                }
              },
              "ddd" : {
                "type" : "string",
                "fielddata" : {
                  "format" : "disabled"
                }
              }
            }
          },
          "two" : {
            "properties" : {
              "aaa" : {
                "type" : "integer"
              },
              "bbb" : {
                "properties" : {
                  "ccc" : {
                    "type" : "integer"
                  }

                }
              },
              "ddd" : {
                "type" : "string",
                "fielddata" : {
                  "format" : "lazy"
                }
              }
            }
          }
        }
      } ],

      [ "PUT", "/safe", {
        "mappings" : {
          "one" : {
            "properties" : {
              "aaa" : {
                "type" : "string"
              },
              "bbb" : {
                "dynamic" : false,
                "properties" : {
                  "ccc" : {
                    "type" : "date",
                    "copy_to" : [ "foo" ]
                  }
                }
              }
            }
          },
          "two" : {
            "properties" : {
              "aaa" : {
                "type" : "string",
                "ignore_above" : 10
              },
              "bbb" : {
                "dynamic" : true,
                "properties" : {
                  "ccc" : {
                    "type" : "date",
                    "copy_to" : [ "bar" ],
                    "include_in_all" : true
                  }

                }
              }
            }
          }
        }
      } ]

      ],

      "checks" : [
        {
          "index" : "good"
        },
        {
          "index" : "bad",
          "msg" : /Mapping for field one:aaa conflicts with: two:aaa. Check parameter: type/
        },
        {
          "index" : "bad",
          "msg" : /Mapping for field one:bbb.ccc conflicts with: two:bbb.ccc. Check parameter: type/
        },
        {
          "index" : "bad",
          "msg" : /Mapping for field one:ddd conflicts with: two:ddd. Check parameter: fielddata.format/
        }, {
          "index" : "safe"
        } ]
    } ]);
