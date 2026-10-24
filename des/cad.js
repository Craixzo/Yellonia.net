/* ==============================================================
   des/cad.js - CAD (Computer Aided Dispatch)

   One screen, three parts, refreshed every few seconds:
     CALL QUEUE   open calls, most urgent first; recently closed below
     THE CALL     the selected call: details, units on it, linked
                  Criminal Database records, and its running log
     UNIT BOARD   every unit on duty and what it's doing

   The bar at the top is YOUR unit: go on duty under a callsign and
   set your status. Dispatchers (and supervisors/admins) can also
   create calls and move any unit; the server checks every action.

   CONTENTS
     1. SETTINGS
     2. START-UP AND REFRESHING
     3. YOUR UNIT BAR
     4. NEW CALL FORM
     5. CALL QUEUE
     6. THE SELECTED CALL
     7. UNIT BOARD
     8. SMALL HELPERS
   ============================================================== */
(function () {
  var el = DES.el;
  var main = document.getElementById('cad');


  /* ---------- 1. SETTINGS ---------- */
  var REFRESH_MS = 5000;           /* how often the board updates (each refresh is one request) */
  var NEW_CALL_MS = 15000;         /* how long a new call stays highlighted */
  var DISPOSITIONS = ['Arrest made', 'Citation issued', 'Warning given', 'Report taken', 'Handled', 'Unfounded',
    'Gone on arrival', 'Transported to hospital', 'Fire extinguished', 'Cancelled', 'Duplicate call'];


  /* ---------- 2. START-UP AND REFRESHING ---------- */
  var state = {
    board: null,           /* the last 'cad' answer */
    selected: null,        /* id of the call on the right */
    call: null,            /* the last 'cad-incident' answer for it */
    offset: 0,             /* server clock minus this computer's clock */
    known: null,           /* ids of open calls seen so far (to spot new ones) */
    fresh: {},             /* id -> time first seen */
    myCall: undefined,     /* the call my unit was on last refresh */
    busy: false,
  };
  var ui = {};

  DES.requireMember().then(function () {
    build();
    var fromHash = location.hash.slice(1);
    if (/^[A-Za-z0-9-]{8,64}$/.test(fromHash)) state.selected = fromHash;
    refresh();
    setInterval(function () { if (!document.hidden) refresh(); }, REFRESH_MS);
    setInterval(tickClocks, 1000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(); });
  });

  function build() {
    main.textContent = '';
    main.classList.add('cad-main');

    var head = el('div', 'page-head');
    var titles = el('div');
    titles.appendChild(el('div', 'label', 'Dispatch Operations'));
    titles.appendChild(el('h1', null, 'CAD'));
    head.appendChild(titles);
    var right = el('div', 'button-row cad-head-right');
    ui.live = el('span', 'cad-live', 'Connecting…');
    right.appendChild(ui.live);
    ui.newBtn = el('button', 'btn btn-primary', 'New call');
    ui.newBtn.type = 'button';
    right.appendChild(ui.newBtn);
    head.appendChild(right);
    main.appendChild(head);

    ui.flash = el('p', 'message flash');
    ui.flash.setAttribute('role', 'status');
    main.appendChild(ui.flash);

    ui.me = el('section', 'panel cad-me');
    main.appendChild(ui.me);

    ui.newPanel = el('section', 'panel');
    ui.newPanel.hidden = true;
    main.appendChild(ui.newPanel);
    ui.newBtn.addEventListener('click', function () {
      ui.newPanel.hidden = !ui.newPanel.hidden;
      if (!ui.newPanel.hidden) { buildNewCall(); ui.newPanel.querySelector('select').focus(); }
    });

    var grid = el('div', 'cad-grid');
    ui.queue = el('section', 'panel cad-queue');
    ui.callPanel = el('section', 'panel cad-call');
    ui.units = el('section', 'panel cad-units');
    grid.appendChild(ui.queue);
    grid.appendChild(ui.callPanel);
    grid.appendChild(ui.units);
    main.appendChild(grid);

    ui.callPanel.appendChild(empty('Select a call from the queue to see it here.'));
    ui.callPanel.classList.add('is-empty');
  }

  function refresh() {
    if (state.busy) return;
    state.busy = true;
    var asked = state.selected;
    DES.act('cad', asked ? { id: asked } : {}).then(function (board) {
      state.busy = false;
      if (!board.success) { ui.live.textContent = 'Connection problem, retrying…'; ui.live.className = 'cad-live cad-live-bad'; return; }
      state.offset = new Date(board.now).getTime() - Date.now();
      ui.live.textContent = 'Live · ' + new Date().toTimeString().slice(0, 8);
      ui.live.className = 'cad-live';
      state.board = board;
      if (asked && asked === state.selected) {
        if (board.incident) state.call = board.incident;
        else { state.selected = null; state.call = null; history.replaceState(null, '', location.pathname); }
      }
      noticeChanges(board);
      ui.newBtn.disabled = !(board.me.canDispatch || board.me.unit);
      ui.newBtn.title = ui.newBtn.disabled ? 'Go on duty to start a call.' : '';
      drawMe();
      drawQueue();
      drawUnits();
      drawCall();
    });
  }

  /* After an action: show the result and refresh at once */
  function run(action, data, okText) {
    return DES.act(action, data).then(function (answer) {
      flash(answer.success ? 'ok' : 'error', answer.success ? (okText || answer.msg) : answer.msg);
      if (answer.success) { state.busy = false; refresh(); }
      return answer;
    });
  }

  /* New calls get highlighted; being sent to a call opens it */
  function noticeChanges(board) {
    var ids = board.incidents.map(function (i) { return i.id; });
    if (state.known) {
      ids.forEach(function (id) { if (state.known.indexOf(id) === -1) state.fresh[id] = Date.now(); });
    }
    state.known = ids;
    Object.keys(state.fresh).forEach(function (id) { if (Date.now() - state.fresh[id] > NEW_CALL_MS) delete state.fresh[id]; });

    var mine = board.me.unit ? board.me.unit.incidentId : null;
    if (state.myCall !== undefined && mine && mine !== state.myCall) {
      var call = board.incidents.filter(function (i) { return i.id === mine; })[0];
      if (call) flash('ok', board.me.unit.callsign + ' is now on ' + call.number + ': ' + call.type + ' at ' + call.location + '.');
      select(mine);
    }
    state.myCall = mine;
  }

  function select(id) {
    if (state.selected === id) return;
    state.selected = id;
    state.call = null;
    history.replaceState(null, '', id ? '#' + id : location.pathname);
    ui.callPanel.textContent = '';
    ui.callPanel.appendChild(empty('Loading call…'));
    ui.callParts = null;
    ui.callPanel.classList.remove('is-empty');
    if (window.innerWidth < 1000) ui.callPanel.scrollIntoView({ block: 'start' });
    drawQueue();
    state.busy = false;
    refresh();
  }


  /* ---------- 3. YOUR UNIT BAR ---------- */
  function drawMe() {
    var me = state.board.me;
    var key = JSON.stringify(me);
    if (ui.me.dataset.key === key || holdsFocus(ui.me)) return;
    ui.me.dataset.key = key;
    ui.me.textContent = '';
    var body = el('div', 'cad-me-body');

    if (!me.unit) {
      body.appendChild(el('span', 'cad-me-title', 'You\'re off duty'));
      var form = el('form', 'cad-me-form');
      var label = el('label', 'tool');
      label.appendChild(el('span', 'label', 'Callsign'));
      var callsign = el('input', 'mono');
      callsign.value = me.defaultCallsign;
      callsign.maxLength = 16;
      callsign.autocomplete = 'off';
      label.appendChild(callsign);
      form.appendChild(label);
      var go = el('button', 'btn btn-primary', 'Go on duty');
      go.type = 'submit';
      form.appendChild(go);
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        go.disabled = true;
        run('cad-duty-on', { callsign: callsign.value.trim() }).then(function () { go.disabled = false; });
      });
      body.appendChild(form);
      ui.me.appendChild(body);
      return;
    }

    var u = me.unit;
    var who = el('div', 'cad-me-who');
    who.appendChild(el('span', 'cad-callsign', u.callsign));
    who.appendChild(statusChip(u.status, u.statusName));
    var since = el('span', 'dim mono');
    since.dataset.since = u.since;
    who.appendChild(since);
    body.appendChild(who);

    var call = u.incidentId ? findCall(u.incidentId) : null;
    var where = el('div', 'cad-me-call');
    if (call) {
      var link = el('button', 'link-btn', call.number + ' · ' + call.type + ' · ' + call.location);
      link.type = 'button';
      link.addEventListener('click', function () { select(call.id); });
      where.appendChild(link);
    } else {
      where.appendChild(el('span', 'dim', 'Not on a call'));
    }
    body.appendChild(where);

    var buttons = el('div', 'cad-status-btns');
    Object.keys(state.board.unitStatus).forEach(function (key) {
      var b = el('button', 'btn btn-small status-btn status-btn-' + key.toLowerCase() + (u.status === key ? ' is-current' : ''), state.board.unitStatus[key]);
      b.type = 'button';
      b.setAttribute('aria-pressed', u.status === key ? 'true' : 'false');
      if ((key === 'ENROUTE' || key === 'ONSCENE') && !u.incidentId) { b.disabled = true; b.title = 'Attach to a call first.'; }
      b.addEventListener('click', function () { if (u.status !== key) run('cad-status', { status: key }); });
      buttons.appendChild(b);
    });
    body.appendChild(buttons);

    var off = el('button', 'btn btn-small btn-danger', 'Go off duty');
    off.type = 'button';
    DES.confirmClick(off, 'Click again to go off duty', function () { run('cad-duty-off', {}); });
    body.appendChild(off);
    ui.me.appendChild(body);
  }


  /* ---------- 4. NEW CALL FORM ---------- */
  function buildNewCall() {
    var b = state.board;
    ui.newPanel.textContent = '';
    ui.newPanel.appendChild(panelHead('New call'));
    var body = el('div', 'panel-body');
    var form = el('form', 'form cad-new');
    form.noValidate = true;

    var row = el('div', 'cad-form-row');
    var type = field(row, 'Call type', 'select');
    type.appendChild(option('', 'Pick a type…'));
    Object.keys(b.callTypes).forEach(function (dept) {
      var group = el('optgroup');
      group.label = b.departments[dept] || dept;
      b.callTypes[dept].forEach(function (t) { group.appendChild(option(t, t)); });
      type.appendChild(group);
    });
    var priority = field(row, 'Priority', 'select');
    Object.keys(b.priorities).forEach(function (p) { priority.appendChild(option(p, 'P' + p + ' · ' + b.priorities[p])); });
    priority.value = '3';
    type.addEventListener('change', function () {
      if (/shots fired|pursuit|needs assistance|structure fire|rescue/i.test(type.value) && priority.value === '3') priority.value = '1';
    });
    form.appendChild(row);

    var location = field(form, 'Location', 'input', 'Street, landmark or area in Yellonia.');
    location.maxLength = 120;
    var caller = field(form, 'Caller (optional)', 'input', 'Who reported it, in-game.');
    caller.maxLength = 80;
    var description = field(form, 'Details (optional)', 'textarea');
    description.rows = 3;
    description.maxLength = 2000;

    var attach = null;
    if (b.me.canDispatch && b.me.unit) {
      var check = el('label', 'check');
      attach = el('input');
      attach.type = 'checkbox';
      check.appendChild(attach);
      check.appendChild(el('span', null, 'Put my unit (' + b.me.unit.callsign + ') on it'));
      form.appendChild(check);
    } else if (!b.me.canDispatch) {
      form.appendChild(el('p', 'field-hint', 'Your unit (' + (b.me.unit ? b.me.unit.callsign : '') + ') goes on this call, on scene.'));
    }

    var msg = el('p', 'message');
    var buttons = el('div', 'button-row');
    var save = el('button', 'btn btn-primary', 'Create call');
    save.type = 'submit';
    var cancel = el('button', 'btn', 'Cancel');
    cancel.type = 'button';
    cancel.addEventListener('click', function () { ui.newPanel.hidden = true; });
    buttons.appendChild(save);
    buttons.appendChild(cancel);
    form.appendChild(msg);
    form.appendChild(buttons);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!type.value) { DES.message(msg, 'error', 'Pick a call type.'); type.focus(); return; }
      if (location.value.trim().length < 2) { DES.message(msg, 'error', 'Enter a location.'); location.focus(); return; }
      save.disabled = true;
      DES.act('cad-create', { type: type.value, priority: Number(priority.value), location: location.value.trim(),
        caller: caller.value.trim(), description: description.value.trim(), attach: attach ? attach.checked : undefined }).then(function (answer) {
        save.disabled = false;
        if (!answer.success) { DES.message(msg, 'error', answer.msg); return; }
        ui.newPanel.hidden = true;
        flash('ok', answer.msg);
        if (answer.id) { state.known = (state.known || []).concat(answer.id); select(answer.id); }
        else { state.busy = false; refresh(); }
      });
    });
    body.appendChild(form);
    ui.newPanel.appendChild(body);
  }


  /* ---------- 5. CALL QUEUE ---------- */
  function drawQueue() {
    var b = state.board;
    if (!b) return;
    var key = JSON.stringify([b.incidents, b.recent, state.selected, Object.keys(state.fresh)]);
    if (ui.queue.dataset.key === key) return;
    ui.queue.dataset.key = key;
    ui.queue.textContent = '';

    var head = panelHead('Call queue');
    var counts = el('span', 'label', b.incidents.length + ' open');
    head.appendChild(counts);
    ui.queue.appendChild(head);

    if (!b.incidents.length) ui.queue.appendChild(empty('No open calls.'));
    var list = el('ul', 'cad-list');
    b.incidents.forEach(function (i) { list.appendChild(callRow(i)); });
    ui.queue.appendChild(list);

    if (b.recent.length) {
      var more = el('details', 'cad-recent');
      if (ui.recentOpen) more.open = true;
      more.addEventListener('toggle', function () { ui.recentOpen = more.open; });
      more.appendChild(el('summary', null, 'Recently closed (' + b.recent.length + ')'));
      var closed = el('ul', 'cad-list');
      b.recent.forEach(function (i) { closed.appendChild(callRow(i)); });
      more.appendChild(closed);
      ui.queue.appendChild(more);
    }
  }

  function callRow(i) {
    var li = el('li');
    var btn = el('button', 'cad-row cad-p' + i.priority + (i.id === state.selected ? ' is-selected' : '') + (state.fresh[i.id] ? ' is-new' : '') + (i.status === 'CLOSED' ? ' is-closed' : ''));
    btn.type = 'button';
    btn.setAttribute('aria-current', i.id === state.selected ? 'true' : 'false');
    var top = el('div', 'cad-row-top');
    top.appendChild(el('span', 'prio prio-' + i.priority, 'P' + i.priority));
    top.appendChild(el('span', 'mono cad-num', i.number));
    var age = el('span', 'mono dim cad-age');
    if (i.status === 'CLOSED') age.textContent = timeOf(i.closedAt);
    else age.dataset.since = i.createdAt;
    top.appendChild(age);
    btn.appendChild(top);
    btn.appendChild(el('div', 'cad-row-type', i.type));
    btn.appendChild(el('div', 'cad-row-loc', i.location));
    var tags = el('div', 'cad-row-tags');
    if (i.status === 'CLOSED') tags.appendChild(el('span', 'dim', i.disposition || 'Closed'));
    else if (!i.units.length) tags.appendChild(el('span', 'chip chip-red', 'No units'));
    i.units.forEach(function (u) { tags.appendChild(el('span', 'unit-tag unit-' + u.status.toLowerCase(), u.callsign)); });
    if (i.subjectCount) tags.appendChild(el('span', 'chip', i.subjectCount + (i.subjectCount === 1 ? ' record' : ' records')));
    btn.appendChild(tags);
    btn.addEventListener('click', function () { select(i.id); });
    li.appendChild(btn);
    return li;
  }


  /* ---------- 6. THE SELECTED CALL ----------
     Built once per call, then each part is redrawn only when it changes,
     so typing a note or a disposition is never interrupted. */
  function drawCall() {
    var c = state.call;
    if (!state.selected) {
      if (ui.callParts !== 'empty') { ui.callPanel.textContent = ''; ui.callPanel.appendChild(empty('Select a call from the queue to see it here.')); ui.callParts = 'empty'; }
      ui.callPanel.classList.add('is-empty');
      return;
    }
    ui.callPanel.classList.remove('is-empty');
    if (!c) return;
    if (!ui.callParts || ui.callParts === 'empty' || ui.callParts.id !== c.id) buildCall(c);
    var p = ui.callParts;
    var open = c.status !== 'CLOSED';
    var myUnit = state.board.me.unit;

    paint(p.info, [c.number, c.priority, c.type, c.location, c.status, c.disposition, c.description, c.caller, c.closedAt], function () { drawInfo(p.info, c); });
    paint(p.actions, [c.status, c.canWork, c.canDispatch, myUnit && myUnit.id, myUnit && myUnit.incidentId], function () { drawActions(p, c); });
    paint(p.units, [c.units, c.canDispatch, open, state.board.units.map(function (u) { return [u.id, u.incidentId, u.status]; })], function () { drawCallUnits(p.units, c); });
    paint(p.subjects, [c.subjects, c.canWork], function () { drawSubjects(p, c); });
    p.linkBox.hidden = !c.canWork;
    p.noteForm.hidden = !(c.canDispatch || myUnit);
    paint(p.log, c.log.map(function (l) { return l.id; }), function () { drawLog(p.log, c); });
  }

  function buildCall(c) {
    ui.callPanel.textContent = '';
    var p = ui.callParts = { id: c.id };

    p.info = el('div', 'cad-info');
    ui.callPanel.appendChild(p.info);
    p.actions = el('div', 'cad-actions');
    ui.callPanel.appendChild(p.actions);
    p.edit = el('div', 'cad-edit');
    p.edit.hidden = true;
    ui.callPanel.appendChild(p.edit);
    p.close = el('div', 'cad-edit');
    p.close.hidden = true;
    ui.callPanel.appendChild(p.close);
    buildCloseForm(p);

    ui.callPanel.appendChild(sectionHead('Units on this call'));
    p.units = el('div', 'cad-section');
    ui.callPanel.appendChild(p.units);

    ui.callPanel.appendChild(sectionHead('Linked records'));
    var subjectsWrap = el('div', 'cad-section');
    p.subjects = el('div');
    subjectsWrap.appendChild(p.subjects);
    p.linkBox = el('div', 'cad-link');
    buildLinkSearch(p);
    subjectsWrap.appendChild(p.linkBox);
    ui.callPanel.appendChild(subjectsWrap);

    ui.callPanel.appendChild(sectionHead('Call log'));
    p.log = el('ol', 'cad-log');
    ui.callPanel.appendChild(p.log);
    p.noteForm = el('form', 'cad-note');
    var note = el('textarea');
    note.rows = 2;
    note.maxLength = 1000;
    note.placeholder = 'Add to the log… (Enter to send, Shift+Enter for a new line)';
    note.setAttribute('aria-label', 'Add a note to the call log');
    var send = el('button', 'btn btn-small', 'Add note');
    send.type = 'submit';
    p.noteForm.appendChild(note);
    p.noteForm.appendChild(send);
    note.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); p.noteForm.requestSubmit(); } });
    p.noteForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = note.value.trim();
      if (!text) return;
      send.disabled = true;
      run('cad-note', { id: c.id, text: text }).then(function (answer) {
        send.disabled = false;
        if (answer.success) { note.value = ''; note.focus(); }
      });
    });
    ui.callPanel.appendChild(p.noteForm);
  }

  function drawInfo(box, c) {
    box.textContent = '';
    var top = el('div', 'cad-info-top');
    top.appendChild(el('span', 'prio prio-' + c.priority, 'P' + c.priority + ' · ' + c.priorityName));
    top.appendChild(el('span', 'mono cad-num', c.number));
    top.appendChild(el('span', 'chip ' + (c.status === 'CLOSED' ? '' : c.status === 'PENDING' ? 'chip-red' : 'chip-green'),
      c.status === 'PENDING' ? 'Pending · no units' : c.status === 'ACTIVE' ? 'Active' : 'Closed'));
    box.appendChild(top);
    box.appendChild(el('h2', 'cad-type', c.type));
    box.appendChild(el('p', 'cad-loc', c.location));

    var kv = el('dl', 'kv');
    add(kv, 'Received', timeOf(c.createdAt));
    if (c.status === 'CLOSED') { add(kv, 'Closed', timeOf(c.closedAt)); add(kv, 'Disposition', c.disposition || '—'); }
    else { var dd = add(kv, 'Open for', ''); dd.dataset.since = c.createdAt; }
    if (c.caller) add(kv, 'Caller', c.caller);
    box.appendChild(kv);
    if (c.description) box.appendChild(el('p', 'cad-desc', c.description));
  }

  function drawActions(p, c) {
    var box = p.actions;
    box.textContent = '';
    var myUnit = state.board.me.unit;
    var open = c.status !== 'CLOSED';

    if (open && myUnit && myUnit.incidentId !== c.id) {
      var attach = button('Attach ' + myUnit.callsign, 'btn-primary');
      attach.addEventListener('click', function () { run('cad-assign', { id: c.id, unitId: myUnit.id }); });
      box.appendChild(attach);
    }
    if (open && myUnit && myUnit.incidentId === c.id) {
      var clear = button('Clear ' + myUnit.callsign);
      clear.addEventListener('click', function () { run('cad-clear', {}); });
      box.appendChild(clear);
    }
    if (open && c.canWork) {
      var edit = button('Edit call');
      edit.addEventListener('click', function () {
        p.edit.hidden = !p.edit.hidden;
        p.close.hidden = true;
        if (!p.edit.hidden) buildEditForm(p, state.call);
      });
      box.appendChild(edit);
      var close = button('Close call', 'btn-danger');
      close.addEventListener('click', function () {
        p.close.hidden = !p.close.hidden;
        p.edit.hidden = true;
        if (!p.close.hidden) p.close.querySelector('input').focus();
      });
      box.appendChild(close);
    }
    if (!open && c.canDispatch) {
      var reopen = button('Reopen call');
      DES.confirmClick(reopen, 'Click again to reopen', function () { run('cad-reopen', { id: c.id }); });
      box.appendChild(reopen);
    }
    if (!open) { p.edit.hidden = true; p.close.hidden = true; }
    if (!box.children.length) box.hidden = true; else box.hidden = false;
  }

  function buildEditForm(p, c) {
    var b = state.board;
    p.edit.textContent = '';
    var form = el('form', 'form');
    form.noValidate = true;
    var row = el('div', 'cad-form-row');
    var type = field(row, 'Call type', 'select');
    Object.keys(b.callTypes).forEach(function (dept) {
      var group = el('optgroup');
      group.label = b.departments[dept] || dept;
      b.callTypes[dept].forEach(function (t) { group.appendChild(option(t, t)); });
      type.appendChild(group);
    });
    type.value = c.type;
    var priority = field(row, 'Priority', 'select');
    Object.keys(b.priorities).forEach(function (k) { priority.appendChild(option(k, 'P' + k + ' · ' + b.priorities[k])); });
    priority.value = String(c.priority);
    form.appendChild(row);
    var location = field(form, 'Location', 'input');
    location.value = c.location;
    location.maxLength = 120;
    var description = field(form, 'Details', 'textarea');
    description.rows = 3;
    description.value = c.description || '';
    var msg = el('p', 'message');
    form.appendChild(msg);
    var buttons = el('div', 'button-row');
    var save = button('Save changes', 'btn-primary btn-small');
    save.type = 'submit';
    var cancel = button('Cancel', 'btn-small');
    cancel.addEventListener('click', function () { p.edit.hidden = true; });
    buttons.appendChild(save);
    buttons.appendChild(cancel);
    form.appendChild(buttons);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      save.disabled = true;
      DES.act('cad-update', { id: c.id, type: type.value, priority: Number(priority.value), location: location.value.trim(), description: description.value.trim() }).then(function (answer) {
        save.disabled = false;
        if (!answer.success) { DES.message(msg, 'error', answer.msg); return; }
        p.edit.hidden = true;
        flash('ok', answer.msg);
        state.busy = false;
        refresh();
      });
    });
    p.edit.appendChild(form);
  }

  function buildCloseForm(p) {
    var form = el('form', 'cad-close-form');
    var label = el('label', 'tool');
    label.appendChild(el('span', 'label', 'Disposition'));
    var input = el('input');
    input.maxLength = 200;
    input.placeholder = 'How did the call end?';
    var listId = 'cad-dispositions';
    if (!document.getElementById(listId)) {
      var list = el('datalist');
      list.id = listId;
      DISPOSITIONS.forEach(function (d) { list.appendChild(option(d, d)); });
      document.body.appendChild(list);
    }
    input.setAttribute('list', listId);
    label.appendChild(input);
    form.appendChild(label);
    var go = button('Close call', 'btn-danger');
    go.type = 'submit';
    form.appendChild(go);
    var cancel = button('Cancel');
    cancel.addEventListener('click', function () { p.close.hidden = true; });
    form.appendChild(cancel);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (input.value.trim().length < 2) { flash('error', 'Give a disposition (how the call ended).'); input.focus(); return; }
      go.disabled = true;
      run('cad-close', { id: p.id, disposition: input.value.trim() }).then(function (answer) {
        go.disabled = false;
        if (answer.success) { input.value = ''; p.close.hidden = true; }
      });
    });
    p.close.appendChild(form);
  }

  function drawCallUnits(box, c) {
    box.textContent = '';
    var open = c.status !== 'CLOSED';
    if (!c.units.length) box.appendChild(el('p', 'dim cad-none', open ? 'No units yet.' : 'All units cleared.'));
    var list = el('ul', 'cad-unit-list');
    c.units.forEach(function (u) {
      var li = el('li');
      li.appendChild(el('span', 'cad-callsign-sm mono', u.callsign));
      li.appendChild(statusChip(u.status, u.statusName));
      li.appendChild(el('span', 'dim', u.memberName));
      var since = el('span', 'mono dim');
      since.dataset.since = u.since;
      li.appendChild(since);
      if (c.canDispatch && open) {
        var clear = button('Clear', 'btn-small');
        clear.addEventListener('click', function () { run('cad-clear', { unitId: u.id }); });
        li.appendChild(clear);
      }
      list.appendChild(li);
    });
    box.appendChild(list);

    if (c.canDispatch && open) {
      var others = state.board.units.filter(function (u) { return u.incidentId !== c.id && u.status !== 'OOS'; });
      var form = el('form', 'cad-assign');
      var select = el('select');
      select.setAttribute('aria-label', 'Unit to assign');
      select.appendChild(option('', others.length ? 'Assign a unit…' : 'No other units on duty'));
      others.sort(function (a, b) { return (a.status === 'AVAILABLE' ? 0 : 1) - (b.status === 'AVAILABLE' ? 0 : 1); });
      others.forEach(function (u) {
        var onCall = u.incidentId ? findCall(u.incidentId) : null;
        select.appendChild(option(u.id, u.callsign + ' · ' + u.statusName + (onCall ? ' (' + onCall.number + ')' : '')));
      });
      form.appendChild(select);
      var go = button('Assign', 'btn-small btn-primary');
      go.type = 'submit';
      form.appendChild(go);
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!select.value) return;
        run('cad-assign', { id: c.id, unitId: select.value });
      });
      box.appendChild(form);
    }
  }

  function drawSubjects(p, c) {
    var box = p.subjects;
    box.textContent = '';
    if (!c.subjects.length) { box.appendChild(el('p', 'dim cad-none', 'No Criminal Database records linked.')); return; }
    var list = el('ul', 'cad-subjects');
    c.subjects.forEach(function (s) {
      var li = el('li', s.activeWarrants ? 'has-warrant' : '');
      var link = el('a', 'row-link', s.username);
      link.href = '/des/subject.html?id=' + encodeURIComponent(s.id);
      link.target = '_blank';
      link.rel = 'noopener';
      li.appendChild(link);
      if (s.characterName) li.appendChild(el('span', 'dim', s.characterName));
      if (s.activeWarrants) li.appendChild(el('span', 'chip chip-red', '⚠ ' + s.activeWarrants + (s.activeWarrants === 1 ? ' active warrant' : ' active warrants')));
      if (s.danger) li.appendChild(el('span', 'chip danger-' + s.danger.toLowerCase(), 'Danger: ' + s.danger.toLowerCase()));
      s.flags.forEach(function (f) { li.appendChild(el('span', 'chip chip-amber', f)); });
      if (c.canWork) {
        var un = button('Unlink', 'btn-small');
        un.addEventListener('click', function () { run('cad-link', { id: c.id, subjectId: s.id, remove: true }); });
        li.appendChild(un);
      }
      list.appendChild(li);
    });
    box.appendChild(list);
  }

  function buildLinkSearch(p) {
    var form = el('form', 'cad-link-form');
    var input = el('input');
    input.type = 'search';
    input.placeholder = 'Find a record by Roblox username…';
    input.setAttribute('aria-label', 'Find a Criminal Database record to link');
    form.appendChild(input);
    var go = button('Search', 'btn-small');
    go.type = 'submit';
    form.appendChild(go);
    var results = el('ul', 'cad-link-results');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = input.value.trim();
      if (!q) return;
      DES.act('subjects', { q: q }).then(function (answer) {
        results.textContent = '';
        if (!answer.success) { results.appendChild(el('li', 'dim', answer.msg)); return; }
        if (!answer.subjects.length) { results.appendChild(el('li', 'dim', 'No records match. Add them in the Criminal Database first.')); return; }
        answer.subjects.slice(0, 6).forEach(function (s) {
          var li = el('li');
          li.appendChild(el('strong', null, s.username));
          if (s.activeWarrants) li.appendChild(el('span', 'chip chip-red', s.activeWarrants + ' warrant' + (s.activeWarrants === 1 ? '' : 's')));
          var link = button('Link', 'btn-small');
          link.addEventListener('click', function () {
            run('cad-link', { id: p.id, subjectId: s.id }).then(function (a) { if (a.success) { results.textContent = ''; input.value = ''; } });
          });
          li.appendChild(link);
          results.appendChild(li);
        });
      });
    });
    p.linkBox.appendChild(form);
    p.linkBox.appendChild(results);
  }

  function drawLog(box, c) {
    var atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
    box.textContent = '';
    c.log.forEach(function (l) {
      var li = el('li', 'log-' + l.kind.toLowerCase());
      li.appendChild(el('span', 'mono log-time', timeOf(l.createdAt, true)));
      li.appendChild(el('span', 'log-who', l.actorName));
      li.appendChild(el('span', 'log-text', l.text));
      box.appendChild(li);
    });
    if (atBottom || !box.dataset.scrolled) { box.scrollTop = box.scrollHeight; box.dataset.scrolled = '1'; }
  }


  /* ---------- 7. UNIT BOARD ---------- */
  function drawUnits() {
    var b = state.board;
    var key = JSON.stringify([b.units, b.me.canDispatch, b.incidents.map(function (i) { return [i.id, i.number]; })]);
    if (ui.units.dataset.key === key || holdsFocus(ui.units)) return;
    ui.units.dataset.key = key;
    ui.units.textContent = '';

    var head = panelHead('Units on duty');
    var avail = b.units.filter(function (u) { return u.status === 'AVAILABLE'; }).length;
    head.appendChild(el('span', 'label', b.units.length + ' on · ' + avail + ' available'));
    ui.units.appendChild(head);
    if (!b.units.length) { ui.units.appendChild(empty('Nobody is on duty.')); return; }

    Object.keys(b.departments).forEach(function (dept) {
      var units = b.units.filter(function (u) { return u.department === dept; });
      if (!units.length) return;
      ui.units.appendChild(el('h3', 'label cad-dept', b.departments[dept]));
      var list = el('ul', 'cad-board');
      units.forEach(function (u) {
        var li = el('li', u.memberId === (b.me.unit && b.me.unit.memberId) ? 'is-me' : '');
        var top = el('div', 'cad-board-top');
        top.appendChild(el('span', 'cad-callsign-sm mono', u.callsign));
        top.appendChild(statusChip(u.status, u.statusName));
        var since = el('span', 'mono dim cad-age');
        since.dataset.since = u.since;
        top.appendChild(since);
        li.appendChild(top);
        var line = el('div', 'cad-board-line');
        line.appendChild(el('span', 'dim', u.memberName));
        var call = u.incidentId ? findCall(u.incidentId) : null;
        if (call) {
          var link = el('button', 'link-btn mono', call.number);
          link.type = 'button';
          link.addEventListener('click', function () { select(call.id); });
          line.appendChild(link);
        }
        li.appendChild(line);

        if (b.me.canDispatch && u.memberId !== (b.me.unit && b.me.unit.memberId)) {
          var tools = el('div', 'cad-board-tools');
          var status = el('select');
          status.setAttribute('aria-label', 'Status for ' + u.callsign);
          Object.keys(b.unitStatus).forEach(function (k) {
            var o = option(k, b.unitStatus[k]);
            if ((k === 'ENROUTE' || k === 'ONSCENE') && !u.incidentId) o.disabled = true;
            status.appendChild(o);
          });
          status.value = u.status;
          status.addEventListener('change', function () { run('cad-status', { unitId: u.id, status: status.value }); });
          tools.appendChild(status);
          var off = button('Off duty', 'btn-small btn-danger');
          DES.confirmClick(off, 'Confirm', function () { run('cad-duty-off', { unitId: u.id }); });
          tools.appendChild(off);
          li.appendChild(tools);
        }
        list.appendChild(li);
      });
      ui.units.appendChild(list);
    });
  }


  /* ---------- 8. SMALL HELPERS ---------- */
  function findCall(id) {
    var b = state.board;
    return b.incidents.concat(b.recent).filter(function (i) { return i.id === id; })[0] || null;
  }

  /* Redraws a part only when its data changed, and never while someone's typing in it */
  function paint(box, data, draw) {
    var key = JSON.stringify(data);
    if (box.dataset.key === key || holdsFocus(box)) return;
    box.dataset.key = key;
    draw();
  }
  function holdsFocus(box) { return box.contains(document.activeElement) && /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName); }

  /* Every element with data-since shows how long ago that was, ticking each second */
  function tickClocks() {
    var now = Date.now() + state.offset;
    Array.prototype.forEach.call(main.querySelectorAll('[data-since]'), function (node) {
      node.textContent = elapsed(now - new Date(node.dataset.since).getTime());
    });
  }
  function elapsed(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h) return h + 'h ' + String(m).padStart(2, '0') + 'm';
    return m + ':' + String(sec).padStart(2, '0');
  }
  function timeOf(value, short) {
    if (!value) return '—';
    var d = new Date(value);
    var t = d.toTimeString().slice(0, short ? 8 : 5);
    if (short) return t;
    var today = new Date().toDateString() === d.toDateString();
    return today ? 'Today ' + t : DES.day(value) + ' ' + t;
  }

  function flash(kind, text) {
    ui.flash.textContent = text || '';
    ui.flash.className = 'message flash' + (kind ? ' message-' + kind : '');
    clearTimeout(flash.timer);
    flash.timer = setTimeout(function () { ui.flash.textContent = ''; }, 6000);
  }

  function statusChip(status, name) { return el('span', 'unit-status unit-' + String(status).toLowerCase(), name); }
  function panelHead(text) { var h = el('div', 'panel-head'); h.appendChild(el('h2', null, text)); return h; }
  function sectionHead(text) { return el('h3', 'label cad-section-head', text); }
  function empty(text) { return el('p', 'dim cad-empty', text); }
  function button(text, extra) { var b = el('button', 'btn' + (extra ? ' ' + extra : ''), text); b.type = 'button'; return b; }
  function option(value, text) { var o = el('option', null, text); o.value = value; return o; }
  function add(dl, term, value) { dl.appendChild(el('dt', null, term)); var dd = el('dd', null, value); dl.appendChild(dd); return dd; }
  function field(parent, labelText, tag, hint) {
    var wrap = el('div', 'field');
    var id = 'cad-f-' + Math.random().toString(36).slice(2, 8);
    var label = el('label', null, labelText);
    label.htmlFor = id;
    var input = el(tag);
    input.id = id;
    wrap.appendChild(label);
    wrap.appendChild(input);
    if (hint) wrap.appendChild(el('span', 'field-hint', hint));
    parent.appendChild(wrap);
    return input;
  }
})();
