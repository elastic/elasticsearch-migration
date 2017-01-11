"use strict";

var controller_init_time;

function DeprecationController(es, wrapper, error) {

  function render_status(status) {
    var msg;
    var buttons;
    var color;

    switch (status) {
    case -1:
      msg = "Enabled on all nodes";
      color = 'green';
      buttons = [
        'disable'
      ];
      break;
    case 0:
      msg = "Disabled on all nodes";
      color = 'red';
      buttons = [
        'enable'
      ];
      break;
    default:
      color = 'yellow';
      msg = "Enabled on some nodes";
      buttons = [
        'enable', 'disable'
      ];
    }

    wrapper.empty().html(
      '<h2>Deprecation logging is currently: '
        + '<span id="depr_status" class="'
        + color
        + '">'
        + msg
        + '</span></h2>');

    _.forEach(buttons, function(v) {
      var button;
      switch (v) {
      case 'enable':
        button = jQuery(
          '<a href="#" class="enable">'
            + 'Enable deprecation logging on all nodes in the cluster'
            + '</a>').click(function(e) {
          e.preventDefault();
          return set_status('enable');
        }); break;
      case 'disable':
        button = jQuery(
          '<a href="#" class="disable">'
            + 'Disable deprecation logging on all nodes in the cluster'
            + '</a>').click(function(e) {
          e.preventDefault();
          return set_status('disable');
        });
      }
      wrapper.append(button);
    });

  }

  function set_status(status) {
    return es.put('/_cluster/settings', {}, {
      "transient" : {
        "logger.deprecation" : status === 'enable' ? 'DEBUG' : 'INFO'
      }
    })

    .then(get_status)
  }

  function get_status() {
    return Promise.all([
      es.get('/_cluster/settings', {
        flat_settings : true
      }), es.get('/_nodes/settings', {
        flat_settings : true
      })
    ])

    .then(function(r) {
      var status;
      var setting = _.get(r[0], [
        'transient', 'logger.deprecation'
      ]) || _.get(r[0], [
        'persistent', 'logger.deprecation'
      ]);
      if (setting) {
        status = setting === 'DEBUG' ? -1 : 0;
      } else {
        var nodes = r[1].nodes;
        var count = 0;
        _.forEach(nodes, function(v) {
          if (_.get(v, [
            'settings', 'logger.deprecation'
          ]) === 'DEBUG') {
            count++;
          }
        });
        if (count === _.keys(nodes).length) {
          status = -1;
        } else if (count === 0) {
          status = 0;
        } else {
          status = count
        }
      }
      render_status(status)
    });
  }

  function show_error(e) {
    error.empty().html(e);
    throw (e);
  }

  error.empty();
  wrapper.empty();

  console.log('Connecting to: ' + es.host);

  es.get_version().then(function(v) {
    if (v.lt('2.4.*') || v.gt('2.*')) {
      throw ('Deprecation Logging is only available in Elasticsearch versions 2.4.x')
    }
    return get_status();
  }).caught(show_error);
}
