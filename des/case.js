/* ==============================================================
   des/case.js - one OIA complaint or OFI investigation (case.html?id=...)

   Left:  the details, evidence, linked Criminal Database records, and
          the internal case log (never shown to the person who filed it)
   Right: who's investigating, what happens next (start, close with a
          finding or cause, dismiss, reopen), and for officer complaints,
          the officer's other complaints

   "Told the reporter" is the only text the person who filed the case
   ever sees, on report.html, once the case is closed or dismissed.
   ============================================================== */
(function () {
  var el = DES.el;
  var main = document.getElementById('case');
  var id = new URLSearchParams(location.search).get('id') || '';
  var flash;

  DES.requireMember().then(function () { load(); });

  function load() {
    DES.act('case', { id: id }).then(function (answer) {
      if (!answer.success) { DES.noAccess(main, answer.msg); return; }
      draw(answer);
    });
  }

  function say(kind, text) {
    flash.textContent = text || '';
    flash.className = 'message flash' + (kind ? ' message-' + kind : '');
    if (text) flash.scrollIntoView({ block: 'nearest' });
  }

  /* Runs an action, then reloads the case */
  function run(action, data) {
    return DES.act(action, Object.assign({ id: id }, data)).then(function (answer) {
      if (!answer.success) { say('error', answer.msg); return answer; }
      var text = answer.msg;
      DES.act('case', { id: id }).then(function (fresh) { if (fresh.success) { draw(fresh); say('ok', text); } });
      return answer;
    });
  }

  function draw(answer) {
    var c = answer.case;
    var fire = c.kind === 'FIRE';
    var done = c.status === 'CLOSED' || c.status === 'DISMISSED';
    main.textContent = '';
    document.title = c.number + ' | YES Emergency Services';

    /* heading */
    var back = el('a', 'back-link', '← ' + listName(c));
    back.href = listPage(c);
    main.appendChild(back);
    var head = el('div', 'page-head');
    var titles = el('div');
    titles.appendChild(el('div', 'label', (fire ? 'Office of Fire Investigations' : 'Office of Internal Affairs') + ' · ' + c.kindName));
    var h1 = el('h1');
    h1.appendChild(el('span', 'mono case-num', c.number));
    h1.appendChild(document.createTextNode(' ' + c.title));
    titles.appendChild(h1);
    head.appendChild(titles);
    head.appendChild(statusChip(c));
    main.appendChild(head);

    flash = el('p', 'message flash');
    flash.setAttribute('role', 'status');
    main.appendChild(flash);

    var grid = el('div', 'case-grid');
    var left = el('div', 'stack');
    var right = el('div', 'stack');
    grid.appendChild(left);
    grid.appendChild(right);
    main.appendChild(grid);

    /* ---- details ---- */
    var details = panel(left, 'Details');
    var body = el('div', 'panel-body');
    var kv = el('dl', 'kv');
    add(kv, 'Type', c.kindName);
    if (c.kind === 'OFFICER') {
      var dd = add(kv, 'Officer', '');
      if (c.accused) {
        var a = el('a', null, c.accused.name + ' (#' + c.accused.badgeId + ', ' + c.accused.department + ')');
        a.href = '/des/member.html?id=' + encodeURIComponent(c.accused.id);
        dd.appendChild(a);
        if (c.accused.status !== 'ACTIVE') dd.appendChild(el('span', 'dim', ' · former member'));
      } else {
        dd.appendChild(el('span', 'warn', 'Not matched to a member'));
      }
      if (c.accusedText) add(kv, 'Reporter said', '“' + c.accusedText + '”');
    }
    if (c.kind === 'DEPARTMENT') add(kv, 'Department', c.departmentName || '—');
    add(kv, 'Location', c.location || '—');
    add(kv, 'When', c.occurredAt || '—');
    if (fire || c.linkedCall) add(kv, 'CAD call', c.linkedCall || '—');
    add(kv, 'Filed by', c.internal ? c.submitterName + ' (internal)' : c.submitterName + ' · Discord ' + c.submitterDiscordId);
    add(kv, 'Received', when(c.createdAt));
    if (done) {
      add(kv, c.status === 'CLOSED' ? 'Closed' : 'Dismissed', when(c.closedAt));
      if (c.findingName) add(kv, fire ? 'Cause' : 'Finding', c.findingName);
      add(kv, 'Told the reporter', c.publicNote || (c.internal ? '—' : '(nothing extra)'));
    }
    body.appendChild(kv);
    body.appendChild(el('h3', 'label case-sub', 'What happened'));
    body.appendChild(el('p', 'case-desc', c.description));

    body.appendChild(el('h3', 'label case-sub', 'Evidence'));
    if (!c.evidence.length) body.appendChild(el('p', 'dim', 'No links given.'));
    else {
      var ul = el('ul', 'case-evidence');
      c.evidence.forEach(function (link) {
        var li = el('li');
        var aa = el('a', null, link);
        aa.href = /^https?:\/\//i.test(link) ? link : '#';
        aa.target = '_blank';
        aa.rel = 'noopener noreferrer nofollow';
        li.appendChild(aa);
        ul.appendChild(li);
      });
      body.appendChild(ul);
      body.appendChild(el('p', 'field-hint', 'Links open outside Yellonia. Be careful with anything you don\'t recognise.'));
    }
    if (!done) body.appendChild(editForm(c, answer.departments));
    details.appendChild(body);

    /* ---- linked records ---- */
    var recs = panel(left, 'Linked Criminal Database records');
    var rbody = el('div', 'panel-body');
    if (!c.subjects.length) rbody.appendChild(el('p', 'dim', fire ? 'No suspects linked.' : 'No records linked.'));
    else {
      var list = el('ul', 'cad-subjects');
      c.subjects.forEach(function (s) {
        var li = el('li', s.activeWarrants ? 'has-warrant' : '');
        var link = el('a', 'row-link', s.username);
        link.href = '/des/subject.html?id=' + encodeURIComponent(s.id);
        li.appendChild(link);
        if (s.characterName) li.appendChild(el('span', 'dim', s.characterName));
        if (s.activeWarrants) li.appendChild(el('span', 'chip chip-red', s.activeWarrants + ' active warrant' + (s.activeWarrants === 1 ? '' : 's')));
        s.flags.forEach(function (f) { li.appendChild(el('span', 'chip chip-amber', f)); });
        var un = button('Unlink', 'btn-small');
        un.addEventListener('click', function () { run('case-link', { subjectId: s.id, remove: true }); });
        li.appendChild(un);
        list.appendChild(li);
      });
      rbody.appendChild(list);
    }
    rbody.appendChild(linkSearch());
    recs.appendChild(rbody);

    /* ---- case log ---- */
    var logPanel = panel(left, 'Case log');
    logPanel.querySelector('.panel-head').appendChild(el('span', 'label', 'Internal only'));
    var logList = el('ol', 'cad-log case-log');
    c.log.forEach(function (l) {
      var li = el('li', 'log-' + l.kind.toLowerCase());
      li.appendChild(el('span', 'mono log-time', when(l.createdAt)));
      li.appendChild(el('span', 'log-who', l.actorName));
      li.appendChild(el('span', 'log-text', l.text));
      logList.appendChild(li);
    });
    logPanel.appendChild(logList);
    var noteForm = el('form', 'cad-note');
    var note = el('textarea');
    note.rows = 3;
    note.maxLength = 2000;
    note.placeholder = 'Add a note: interviews, findings, next steps…';
    note.setAttribute('aria-label', 'Add a note to the case log');
    var send = button('Add note', 'btn-small');
    send.type = 'submit';
    noteForm.appendChild(note);
    noteForm.appendChild(send);
    noteForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!note.value.trim()) return;
      send.disabled = true;
      run('case-note', { text: note.value.trim() }).then(function () { send.disabled = false; });
    });
    logPanel.appendChild(noteForm);

    /* ---- right: investigator ---- */
    var inv = panel(right, 'Investigator');
    var ibody = el('div', 'panel-body');
    ibody.appendChild(el('p', 'case-assigned' + (c.assignedName ? '' : ' dim'), c.assignedName || 'Nobody yet'));
    if (!done) {
      var aform = el('form', 'cad-assign');
      var pick = el('select');
      pick.setAttribute('aria-label', 'Investigator');
      pick.appendChild(option('', 'Unassigned'));
      answer.investigators.forEach(function (m) { pick.appendChild(option(m.id, m.name)); });
      pick.value = c.assignedTo || '';
      aform.appendChild(pick);
      var go = button('Assign', 'btn-small btn-primary');
      go.type = 'submit';
      aform.appendChild(go);
      aform.addEventListener('submit', function (e) { e.preventDefault(); run('case-assign', { memberId: pick.value }); });
      ibody.appendChild(aform);
      if (c.assignedTo !== answer.me && answer.investigators.some(function (m) { return m.id === answer.me; })) {
        var mine = button('Assign to me', 'btn-small');
        mine.style.marginTop = '8px';
        mine.addEventListener('click', function () { run('case-assign', { memberId: answer.me }); });
        ibody.appendChild(mine);
      }
    }
    inv.appendChild(ibody);

    /* ---- right: next step ---- */
    var next = panel(right, done ? 'Finished' : 'Next step');
    var nbody = el('div', 'panel-body stack-sm');
    if (c.status === 'NEW') {
      nbody.appendChild(el('p', 'dim', fire ? 'Reported by the public. Start an investigation, or dismiss it.' : 'Received and waiting. Start the investigation when someone picks it up.'));
      var start = button(fire ? 'Start investigation' : 'Start investigation', 'btn-primary');
      start.addEventListener('click', function () { run('case-status', { status: 'OPEN' }); });
      nbody.appendChild(start);
    }
    if (!done && c.status === 'OPEN') nbody.appendChild(closeForm(c, answer.findings));
    if (!done) nbody.appendChild(dismissForm(c));
    if (done) {
      nbody.appendChild(el('p', 'dim', 'Reopening clears the outcome, and the reporter sees the case as under investigation again.'));
      var reopen = button('Reopen case');
      DES.confirmClick(reopen, 'Click again to reopen', function () { run('case-status', { status: 'OPEN' }); });
      nbody.appendChild(reopen);
    }
    next.appendChild(nbody);

    /* ---- right: the officer's other complaints ---- */
    if (c.kind === 'OFFICER' && c.accused) {
      var hist = panel(right, 'Other complaints about this officer');
      var hbody = el('div', 'panel-body');
      if (!c.history.length) hbody.appendChild(el('p', 'dim', 'None.'));
      else {
        var sustained = c.history.filter(function (h) { return h.finding === 'SUSTAINED'; }).length;
        hbody.appendChild(el('p', sustained ? 'warn' : 'dim', c.history.length + ' other complaint' + (c.history.length === 1 ? '' : 's') + (sustained ? ', ' + sustained + ' sustained' : '')));
        var hl = el('ul', 'case-history');
        c.history.forEach(function (h) {
          var li = el('li');
          var link = el('a', 'row-link mono', h.number);
          link.href = '/des/case.html?id=' + encodeURIComponent(h.id);
          li.appendChild(link);
          li.appendChild(el('span', null, h.title));
          li.appendChild(el('span', 'dim', h.findingName || h.statusName));
          hl.appendChild(li);
        });
        hbody.appendChild(hl);
      }
      hist.appendChild(hbody);
    }
  }

  /* ---------- forms ---------- */
  function editForm(c, departments) {
    var box = el('details', 'edit-details');
    box.appendChild(el('summary', null, 'Edit details'));
    var form = el('form', 'form');
    form.noValidate = true;
    var title = field(form, 'Title', 'input');
    title.value = c.title;
    title.maxLength = 120;
    var accused = null, dept = null, call = null;
    if (c.kind === 'OFFICER') {
      accused = field(form, 'Officer\'s badge number', 'input', 'Links the complaint to that member. Leave empty to unlink.');
      accused.classList.add('mono');
      accused.value = c.accused ? c.accused.badgeId : '';
    }
    if (c.kind === 'DEPARTMENT') {
      dept = field(form, 'Department', 'select');
      departments.forEach(function (d) { dept.appendChild(option(d.key, d.name)); });
      dept.value = c.departmentKey || '';
    }
    var place = field(form, 'Location', 'input');
    place.value = c.location || '';
    place.maxLength = 120;
    var time = field(form, 'When', 'input');
    time.value = c.occurredAt || '';
    time.maxLength = 60;
    call = field(form, 'CAD call', 'input', 'The call number, e.g. C-2026-00012.');
    call.classList.add('mono');
    call.value = c.linkedCall || '';
    call.maxLength = 20;
    var save = button('Save changes', 'btn-primary btn-small');
    save.type = 'submit';
    form.appendChild(save);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = { title: title.value.trim(), location: place.value.trim(), occurredAt: time.value.trim(), linkedCall: call.value.trim() };
      if (accused) data.accused = accused.value.trim();
      if (dept) data.department = dept.value;
      run('case-update', data);
    });
    box.appendChild(form);
    return box;
  }

  function closeForm(c, findings) {
    var fire = c.kind === 'FIRE';
    var form = el('form', 'form form-inset');
    form.noValidate = true;
    form.appendChild(el('strong', null, 'Close the case'));
    var finding = field(form, fire ? 'Cause of the fire' : 'Finding', 'select');
    finding.appendChild(option('', fire ? 'Pick the cause…' : 'Pick a finding…'));
    findings.forEach(function (f) { finding.appendChild(option(f.key, f.name)); });
    var note = field(form, c.internal ? 'Closing note (optional)' : 'Message to the reporter (optional)', 'textarea',
      c.internal ? null : 'They see the outcome and this message on their reports page. Don\'t include anything confidential.');
    note.rows = 3;
    note.maxLength = 1000;
    var go = button('Close case', 'btn-primary');
    go.type = 'submit';
    form.appendChild(go);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!finding.value) { say('error', fire ? 'Pick the cause of the fire.' : 'Pick a finding.'); finding.focus(); return; }
      run('case-status', { status: 'CLOSED', finding: finding.value, publicNote: note.value.trim() });
    });
    return form;
  }

  function dismissForm(c) {
    var box = el('details', 'edit-details');
    box.appendChild(el('summary', null, 'Dismiss'));
    var form = el('form', 'form');
    form.noValidate = true;
    var reason = field(form, 'Reason', 'textarea', c.internal ? null : 'The reporter is told this, e.g. "Not enough information to investigate."');
    reason.rows = 2;
    reason.maxLength = 1000;
    var go = button('Dismiss case', 'btn-danger btn-small');
    go.type = 'submit';
    form.appendChild(go);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      run('case-status', { status: 'DISMISSED', publicNote: reason.value.trim() });
    });
    box.appendChild(form);
    return box;
  }

  function linkSearch() {
    var wrap = el('div');
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
      if (!input.value.trim()) return;
      DES.act('subjects', { q: input.value.trim() }).then(function (answer) {
        results.textContent = '';
        if (!answer.success) { results.appendChild(el('li', 'dim', answer.msg)); return; }
        if (!answer.subjects.length) { results.appendChild(el('li', 'dim', 'No records match. Add them in the Criminal Database first.')); return; }
        answer.subjects.slice(0, 6).forEach(function (s) {
          var li = el('li');
          li.appendChild(el('strong', null, s.username));
          var link = button('Link', 'btn-small');
          link.addEventListener('click', function () { run('case-link', { subjectId: s.id }); });
          li.appendChild(link);
          results.appendChild(li);
        });
      });
    });
    wrap.appendChild(form);
    wrap.appendChild(results);
    return wrap;
  }

  /* ---------- helpers ---------- */
  function listPage(c) {
    if (c.kind === 'OFFICER') return '/des/oia-officer.html';
    if (c.kind === 'DEPARTMENT') return '/des/oia-department.html';
    return c.status === 'NEW' ? '/des/ofi-reported.html' : c.status === 'OPEN' ? '/des/ofi-active.html' : '/des/ofi-database.html';
  }
  function listName(c) {
    if (c.kind === 'OFFICER') return 'Officer Complaints';
    if (c.kind === 'DEPARTMENT') return 'Department Complaints';
    return c.status === 'NEW' ? 'Reported Investigations' : c.status === 'OPEN' ? 'Active Investigations' : 'OFI Database';
  }
  function statusChip(c) {
    var cls = { NEW: 'chip-amber', OPEN: 'chip-lime', CLOSED: 'chip-green', DISMISSED: '' }[c.status] || '';
    return el('span', 'chip ' + cls, c.statusName);
  }
  function when(value) { return value ? DES.day(value) + ' ' + new Date(value).toTimeString().slice(0, 5) : '—'; }
  function panel(parent, title) {
    var p = el('section', 'panel');
    var h = el('div', 'panel-head');
    h.appendChild(el('h2', null, title));
    p.appendChild(h);
    parent.appendChild(p);
    return p;
  }
  function add(dl, term, value) { dl.appendChild(el('dt', null, term)); var dd = el('dd', null, value); dl.appendChild(dd); return dd; }
  function button(text, extra) { var b = el('button', 'btn' + (extra ? ' ' + extra : ''), text); b.type = 'button'; return b; }
  function option(value, text) { var o = el('option', null, text); o.value = value; return o; }
  function field(parent, labelText, tag, hint) {
    var wrap = el('div', 'field');
    var fid = 'case-f-' + Math.random().toString(36).slice(2, 8);
    var label = el('label', null, labelText);
    label.htmlFor = fid;
    var input = el(tag);
    input.id = fid;
    wrap.appendChild(label);
    wrap.appendChild(input);
    if (hint) wrap.appendChild(el('span', 'field-hint', hint));
    parent.appendChild(wrap);
    return input;
  }
})();
