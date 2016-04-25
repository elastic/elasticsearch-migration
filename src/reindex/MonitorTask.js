function MonitorTask(index, task_id) {

  var monitor_init_time = controller_init_time;
  var node_id = task_id.split(':')[0];

  function get_task(resolve, reject) {

    function _get_task() {
      if (index.get_reindex_status() === 'cancelled') {
        console.log('Cancelling reindex task: ', task_id);
        resolve();
        return es.post('/_tasks/' + task_id + '/_cancel')
      }

      return es.get('/_tasks/' + task_id, {
        detailed : true,
        nodes : node_id
      }) //
      .then(
        function(r) {
          if (monitor_init_time === controller_init_time && r.nodes[node_id]) {
            var status = r.nodes[node_id].tasks[task_id].status;
            index.set_extra((status.created + status.updated)
              + " / "
              + status.total);
            return Promise.delay(1000).then(_get_task);
          }
          index.set_extra('');
          resolve();
        }) //
      .caught(reject);
    }
    _get_task();
  }
  return new Promise(get_task);
};

