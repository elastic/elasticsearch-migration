var global_switch_view;

jQuery(function() {

  require('Client.js');
  require('migration/MigrationController.js');
  require('reindex/ReindexController.js');
  require('deprecation/DeprecationController.js');

  var els = {
    home : jQuery('#intro_switch'),
    blurb : jQuery('#blurb p, #blurb ul'),
    form : jQuery('#blurb form'),
    es_host : jQuery('#es_host'),
    creds : jQuery('#enable_creds'),
    show_green : jQuery('#show_green'),
    buttons : {
      blurb : jQuery('#blurb_button'),
      migration : jQuery('#blurb form button.migration'),
      reindex : jQuery('#blurb form button.reindex'),
      depr : jQuery('#blurb form button.depr'),
    },
    sections : {
      intro : jQuery('.intro'),
      migration : jQuery('.migration'),
      reindex : jQuery('.reindex'),
      depr : jQuery('.depr')
    },
    wrappers : {
      migration : jQuery('#migration_wrapper'),
      migration_log : jQuery('#migration_log'),
      reindex : jQuery('#reindex_wrapper'),
      depr : jQuery('#depr_wrapper'),
      error : jQuery('#error_wrapper'),
    }
  };

  function get_client() {
    return new Client(els.es_host.val(), els.creds.is(':checked'));
  }

  function run_migration(e) {
    e.preventDefault();
    blurb('Hide');
    els.wrappers.migration.show();
    new MigrationController(
      get_client(),
      els.wrappers.migration_log,
      els.wrappers.error);
  }

  function run_reindex(e) {
    e.preventDefault();
    blurb('Hide');
    new ReindexController(
      get_client(),
      els.wrappers.reindex,
      els.wrappers.error);
  }

  function run_depr(e) {
    e.preventDefault();
    blurb('Hide');
    new DeprecationController(
      get_client(),
      els.wrappers.depr,
      els.wrappers.error);
  }

  function blurb(state) {
    if (state !== 'Show' && state !== 'Hide') {
      state = els.buttons.blurb.text()
    }

    if (state === 'Show') {
      els.blurb.show(200);
      els.buttons.blurb.text('Hide');
    } else {
      els.blurb.hide(200);
      els.buttons.blurb.text('Show');
    }
    els.buttons.blurb.blur();
  }

  function switch_view(page) {
    _.forEach(els.sections, function(v, k) {
      k === page ? v.show(200) : v.hide(200);
    });

    if (page === 'intro') {
      els.home.hide(200);
      els.buttons.blurb.hide(200);
      els.form.hide(200);
    } else {
      els.home.show(200);
      els.buttons.blurb.show(200);
      els.form.show(200);
    }

    if (page === 'migration') {
      els.wrappers.migration.hide(200);
      els.wrappers.migration_log.empty();
    }

    blurb('Show');
    els.wrappers.error.empty();
  }

  function show_green() {
    if (els.show_green.is(':checked')) {
      els.wrappers.migration_log.removeClass('no_green');
    } else {
      els.wrappers.migration_log.addClass('no_green');
    }
  }

  function init() {
    _.forEach(_.keys(els.sections), function(k) {
      jQuery('#' + k + '_switch').click(function(e) {
        e.preventDefault();
        switch_view(k)
      });
    });

    els.buttons.migration.click(run_migration);
    els.buttons.reindex.click(run_reindex);
    els.buttons.depr.click(run_depr);
    els.buttons.blurb.click(blurb);

    els.show_green.change(show_green);

    switch_view('intro');

    els.es_host.val(location.protocol + '//' + location.host);
    global_switch_view = switch_view;
  }
  init();
});
