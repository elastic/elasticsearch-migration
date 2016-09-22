function MonitorHealth(index, dest) {

  var monitor_init_time = controller_init_time;

  function wait_for_green(resolve, reject) {

    function _wait_for_green() {
      es.get('/_cluster/health/' + encodeURIComponent(dest), {
        level : 'indices'
      }) //
      .then(
        function(r) {
          if (index.get_reindex_status() === 'cancelled'
            || monitor_init_time !== controller_init_time) {
            resolve();
            return;
          }
          if (r.indices[dest].status === 'green') {
            index.set_extra('');
            index.set_reindex_status('green');
            resolve();
            return;
          }
          return Promise.delay(1000).then(_wait_for_green);
        }) //
      .caught(reject);
    }
    _wait_for_green();
  }

  return new Promise(wait_for_green);

}
