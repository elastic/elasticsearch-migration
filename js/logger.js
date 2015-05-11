"use strict";

function Logger(out_id) {
  var out;
  var sections;

  function start_section(class_name, msg) {
    msg = msg.replace(/`([^`]+)`/g, "<code>$1</code>");
    out.append('<li><span class="section ' + class_name + '">' + msg
      + '</span><ul></ul></li>');
    sections.push(out);
    out = out.find(':last');
  }

  function set_section_color(color) {
    out.parent().addClass(color)
  }

  function end_section() {
    out = sections.pop();
  }

  function log(msg) {
    out.append('<li>' + msg + '</li>');
  }

  function error(e) {
    while (sections.length) {
      end_section()
    }
    var msg;
    if (typeof e === "string") {
      console.log(e);
      msg = e;
    } else {
      console.log(e.message, e.stack);
      msg = e.message;
    }
    out.append('<p class="error">ERROR: ' + msg + '</p>');
    throw (e);
  }

  function clear() {
    jQuery(out_id).html('<ul></ul>');
    out = jQuery(out_id).find('ul');
    sections = [];
  }

  function result(color, check, msg) {
    check = check.replace(/`([^`]+)`/g, "<code>$1</code>");
    if (msg) {
      start_section('check', check);
      msg = msg.replace(/`([^`]+)`/g, "<code>$1</code>");
      forall(msg.split(/\n/), function(line) {
        out.append('<li class="' + color + '"><span class="msg">' + line
          + '</span></li>');
      });
      set_section_color(color);
      end_section();
    } else {
      out.append('<li class="' + color + '"><span class="check">' + check
        + '</span></li>');
    }
  }

  clear();

  return {
    clear : clear,
    log : log,
    error : error,
    result : result,
    start_section : start_section,
    end_section : end_section,
    set_section_color : set_section_color
  };

}
