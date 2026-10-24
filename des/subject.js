/* ==============================================================
   des/subject.js - one subject (subject.html?id=...)

   Their record (arrests, citations, warnings, notes) and warrants.
   Officers add records; supervisors and admins issue/recall warrants,
   set the Most Wanted flag, and edit flags/notes; admins remove things.
   All IN-GAME roleplay only.
   ============================================================== */
(function () {
  var el = DES.el;
  var main = document.getElementById('subject');
  var id = new URLSearchParams(location.search).get('id') || '';

  DES.requireMember().then(function () {
    if (!id) return DES.noAccess(main, 'No subject was chosen. Open one from the Criminal Database.');
    load();
  });

  function load() {
    DES.act('subject', { id: id }).then(function (answer) {
      if (!answer.success) return DES.noAccess(main, answer.msg);
      draw(answer);
    });
  }
  function reloadSoon() { setTimeout(load, 700); }

  /* Error line under the header (used by the small buttons on each card) */
  var flash = null;
  function say(text) { if (flash) { flash.textContent = text; flash.scrollIntoView({ block: 'nearest' }); } }

  function draw(answer) {
    var s = answer.subject, can = answer.can;
    main.textContent = '';
    document.title = s.username + ' | YES Emergency Services';

    var back = el('a', 'back-link', '← Criminal Database');
    back.href = '/des/criminal.html';
    main.appendChild(back);

    /* header: avatar, names, flags */
    var header = el('div', 'subject-head');
    var av = el('div', 'subject-head-av');
    av.setAttribute('data-initials', s.username);
    if (s.avatar) { var img = el('img'); img.alt = ''; img.onerror = function () { var box = this.parentNode; box.textContent = (box.getAttribute('data-initials') || '?').slice(0, 2).toUpperCase(); }; img.src = s.avatar; av.appendChild(img); }
    else av.textContent = s.username.slice(0, 2).toUpperCase();
    header.appendChild(av);
    var titles = el('div');
    titles.appendChild(el('div', 'label', 'Criminal Database · in-game record'));
    titles.appendChild(el('h1', null, s.username));
    if (s.characterName) titles.appendChild(el('p', 'dim', 'Character: ' + s.characterName));
    var chips = el('div', 'chips');
    chips.style.marginTop = '8px';
    var active = answer.warrants.filter(function (w) { return w.status === 'ACTIVE'; });
    if (active.length) chips.appendChild(el('span', 'chip chip-red', active.length + (active.length === 1 ? ' active warrant' : ' active warrants')));
    s.flags.forEach(function (f) { chips.appendChild(el('span', 'chip chip-amber', f.name)); });
    titles.appendChild(chips);
    header.appendChild(titles);
    main.appendChild(header);

    main.appendChild(rpNote());
    flash = el('p', 'message message-error flash');
    flash.setAttribute('role', 'alert');
    main.appendChild(flash);

    var grid = el('div', 'dash-grid');

    /* ---- warrants ---- */
    var wPanel = panel('Warrants');
    if (can.warrant) wPanel.head.appendChild(toggleBtn('Issue warrant', function () { wForm.hidden = !wForm.hidden; if (!wForm.hidden) wForm.querySelector('textarea,input').focus(); }));
    var wForm = el('div');
    wForm.hidden = true;
    if (can.warrant) { buildWarrantForm(wForm, answer); wPanel.body.appendChild(wForm); }
    if (!answer.warrants.length) wPanel.body.appendChild(el('p', 'dim', 'No warrants.'));
    answer.warrants.forEach(function (w) { wPanel.body.appendChild(warrantCard(w, can)); });
    grid.appendChild(wPanel.box);

    /* ---- record ---- */
    var rPanel = panel('Record');
    if (can.record) rPanel.head.appendChild(toggleBtn('Add entry', function () { rForm.hidden = !rForm.hidden; if (!rForm.hidden) rForm.querySelector('select,textarea').focus(); }));
    var rForm = el('div');
    rForm.hidden = true;
    if (can.record) { buildRecordForm(rForm, answer); rPanel.body.appendChild(rForm); }
    if (!answer.records.length) rPanel.body.appendChild(el('p', 'dim', 'No entries on this record.'));
    answer.records.forEach(function (r) { rPanel.body.appendChild(recordCard(r, can)); });
    grid.appendChild(rPanel.box);

    /* ---- details / flags / notes ---- */
    var dPanel = panel('Details');
    var kv = el('dl', 'kv');
    [['Roblox user', s.username], ['Character', s.characterName || '—'], ['First recorded', DES.day(s.createdAt)]].forEach(function (row) {
      kv.appendChild(el('dt', null, row[0])); kv.appendChild(el('dd', null, row[1]));
    });
    dPanel.body.appendChild(kv);
    if (s.notes) { dPanel.body.appendChild(el('div', 'label', 'Notes')); dPanel.body.appendChild(el('p', 'subject-notes', s.notes)); }
    if (can.edit) dPanel.body.appendChild(editDetails(answer));
    if (can.remove) dPanel.body.appendChild(removeSubjectBox());
    grid.appendChild(dPanel.box);

    main.appendChild(grid);

    /* ---- forms ---- */
    function buildWarrantForm(parent, answer) {
      var form = el('form', 'form form-inset');
      form.noValidate = true;
      var summary = field(form, 'What for', 'textarea');
      summary.rows = 2;
      var charges = field(form, 'Charges (one per line, or comma-separated)', 'textarea');
      charges.rows = 2;
      var danger = field(form, 'Danger level', 'select');
      answer.dangerLevels.forEach(function (d) { var o = el('option', null, d.name); o.value = d.key; if (d.key === 'MEDIUM') o.selected = true; danger.appendChild(o); });
      var wanted = check(form, 'Put on the public Most Wanted page');
      var msg = el('p', 'message');
      form.appendChild(msg);
      var submit = el('button', 'btn btn-primary', 'Issue warrant');
      submit.type = 'submit';
      form.appendChild(submit);
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        submit.disabled = true;
        DES.act('warrant-issue', { subjectId: id, summary: summary.value, charges: charges.value, danger: danger.value, onWantedList: wanted.checked }).then(function (a) {
          submit.disabled = false;
          if (!a.success) return DES.message(msg, 'error', a.msg);
          reloadSoon();
        });
      });
      parent.appendChild(form);
    }

    function buildRecordForm(parent, answer) {
      var form = el('form', 'form form-inset');
      form.noValidate = true;
      var kind = field(form, 'Type', 'select');
      answer.recordKinds.forEach(function (k) { var o = el('option', null, k.name); o.value = k.key; kind.appendChild(o); });
      var charges = field(form, 'Charges (optional; one per line or comma-separated)', 'textarea');
      charges.rows = 2;
      var summary = field(form, 'What happened', 'textarea');
      summary.rows = 3;
      var loc = field(form, 'Location (optional)', 'input');
      var msg = el('p', 'message');
      form.appendChild(msg);
      var submit = el('button', 'btn btn-primary', 'Add entry');
      submit.type = 'submit';
      form.appendChild(submit);
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (summary.value.trim().length < 3) return DES.message(msg, 'error', 'Write what happened.');
        submit.disabled = true;
        DES.act('record-add', { subjectId: id, kind: kind.value, charges: charges.value, summary: summary.value, location: loc.value }).then(function (a) {
          submit.disabled = false;
          if (!a.success) return DES.message(msg, 'error', a.msg);
          reloadSoon();
        });
      });
      parent.appendChild(form);
    }

    function editDetails(answer) {
      var wrap = el('details', 'edit-details');
      wrap.appendChild(el('summary', null, 'Edit flags & notes'));
      var form = el('form', 'form');
      form.noValidate = true;
      var character = field(form, 'Character name', 'input');
      character.value = s.characterName || '';
      var boxes = answer.allFlags.map(function (f) {
        var lab = el('label', 'check');
        var box = el('input');
        box.type = 'checkbox';
        box.value = f.key;
        box.checked = s.flags.some(function (x) { return x.key === f.key; });
        lab.appendChild(box);
        lab.appendChild(el('span', null, f.name));
        form.appendChild(lab);
        return box;
      });
      var notes = field(form, 'Notes', 'textarea');
      notes.rows = 3;
      notes.value = s.notes || '';
      var msg = el('p', 'message');
      form.appendChild(msg);
      var save = el('button', 'btn btn-primary', 'Save');
      save.type = 'submit';
      form.appendChild(save);
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        save.disabled = true;
        DES.act('subject-update', { id: id, characterName: character.value, flags: boxes.filter(function (b) { return b.checked; }).map(function (b) { return b.value; }), notes: notes.value }).then(function (a) {
          save.disabled = false;
          a.success ? reloadSoon() : DES.message(msg, 'error', a.msg);
        });
      });
      wrap.appendChild(form);
      return wrap;
    }

    function removeSubjectBox() {
      var wrap = el('details', 'edit-details');
      wrap.appendChild(el('summary', null, 'Remove this record'));
      var box = el('div', 'form');
      var reason = field(box, 'Reason', 'textarea');
      reason.rows = 2;
      var msg = el('p', 'message');
      box.appendChild(msg);
      var btn = el('button', 'btn btn-danger', 'Remove record');
      btn.type = 'button';
      box.appendChild(btn);
      DES.confirmClick(btn, 'Click again to remove', function () {
        if (!reason.value.trim()) return DES.message(msg, 'error', 'Give a reason first.');
        DES.act('subject-remove', { id: id, reason: reason.value }).then(function (a) {
          a.success ? (location.href = '/des/criminal.html') : DES.message(msg, 'error', a.msg);
        });
      });
      wrap.appendChild(box);
      return wrap;
    }
  }

  /* ---- cards ---- */
  function warrantCard(w, can) {
    var card = el('div', 'rec-card warrant-' + w.status.toLowerCase());
    var top = el('div', 'rec-top');
    top.appendChild(el('span', 'mono rec-num', w.number));
    top.appendChild(el('span', 'chip danger-' + w.danger.toLowerCase(), w.dangerName + ' risk'));
    top.appendChild(el('span', 'chip', statusName(w.status)));
    if (w.onWantedList) top.appendChild(el('span', 'chip chip-red', 'Most Wanted'));
    card.appendChild(top);
    card.appendChild(el('p', 'rec-summary', w.summary));
    if (w.charges.length) card.appendChild(chargeList(w.charges));
    card.appendChild(el('p', 'rec-meta', 'Issued ' + DES.day(w.issuedAt) + ' by ' + w.issuedByName + (w.closedAt ? ' · closed ' + DES.day(w.closedAt) : '')));
    if (can.warrant && w.status === 'ACTIVE') {
      var row = el('div', 'button-row');
      var wantBtn = el('button', 'btn btn-small', w.onWantedList ? 'Remove from Most Wanted' : 'Add to Most Wanted');
      wantBtn.type = 'button';
      wantBtn.addEventListener('click', function () { DES.act('warrant-wanted', { id: w.id, onWantedList: !w.onWantedList }).then(function (a) { a.success ? reloadSoon() : say(a.msg); }); });
      row.appendChild(wantBtn);
      var served = el('button', 'btn btn-small', 'Mark served');
      served.type = 'button';
      served.addEventListener('click', function () { DES.act('warrant-close', { id: w.id, served: true }).then(function (a) { a.success ? reloadSoon() : say(a.msg); }); });
      row.appendChild(served);
      var recall = el('button', 'btn btn-small', 'Recall');
      recall.type = 'button';
      recall.addEventListener('click', function () { DES.act('warrant-close', { id: w.id, served: false }).then(function (a) { a.success ? reloadSoon() : say(a.msg); }); });
      row.appendChild(recall);
      card.appendChild(row);
    }
    return card;
  }

  function recordCard(r, can) {
    var card = el('div', 'rec-card');
    var top = el('div', 'rec-top');
    top.appendChild(el('span', 'chip kind-' + r.kind.toLowerCase(), r.kindName));
    top.appendChild(el('span', 'rec-meta', DES.day(r.createdAt) + ' · ' + r.officerName + (r.location ? ' · ' + r.location : '')));
    card.appendChild(top);
    if (r.charges.length) card.appendChild(chargeList(r.charges));
    card.appendChild(el('p', 'rec-summary', r.summary));
    if (can.remove) {
      var box = el('details', 'edit-details');
      box.appendChild(el('summary', 'summary-small', 'Remove entry'));
      var inner = el('div', 'form');
      var reason = field(inner, 'Reason', 'input');
      var btn = el('button', 'btn btn-small btn-danger', 'Remove');
      btn.type = 'button';
      DES.confirmClick(btn, 'Click again', function () {
        if (!reason.value.trim()) return;
        DES.act('record-remove', { id: r.id, reason: reason.value }).then(function (a) { a.success ? reloadSoon() : say(a.msg); });
      });
      inner.appendChild(btn);
      box.appendChild(inner);
      card.appendChild(box);
    }
    return card;
  }

  /* small builders */
  function panel(title) {
    var box = el('section', 'panel');
    var head = el('div', 'panel-head');
    head.appendChild(el('h2', null, title));
    box.appendChild(head);
    var body = el('div', 'panel-body');
    box.appendChild(body);
    return { box: box, head: head, body: body };
  }
  function toggleBtn(text, fn) { var b = el('button', 'btn btn-small', text); b.type = 'button'; b.addEventListener('click', fn); return b; }
  function chargeList(charges) {
    var ul = el('ul', 'charge-list');
    charges.forEach(function (c) { ul.appendChild(el('li', null, c)); });
    return ul;
  }
  function rpNote() { var p = el('p', 'rp-note'); p.textContent = 'In-game roleplay record. Do not add real-world personal information.'; return p; }
  function statusName(s) { return { ACTIVE: 'Active', SERVED: 'Served', RECALLED: 'Recalled' }[s] || s; }
  var n = 0;
  function field(form, labelText, tag, hint) {
    var wrap = el('div', 'field');
    var input = el(tag);
    input.id = 's' + (++n);
    var label = el('label', null, labelText);
    label.htmlFor = input.id;
    wrap.appendChild(label);
    wrap.appendChild(input);
    if (hint) wrap.appendChild(el('span', 'field-hint', hint));
    form.appendChild(wrap);
    return input;
  }
  function check(form, labelText) {
    var lab = el('label', 'check');
    var box = el('input');
    box.type = 'checkbox';
    lab.appendChild(box);
    lab.appendChild(el('span', null, labelText));
    form.appendChild(lab);
    return box;
  }
})();
