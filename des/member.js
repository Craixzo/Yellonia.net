/* ==============================================================
   des/member.js - one member's record (member.html?id=...)

   Everyone sees the record. Admins who may manage this member also
   get: edit rank, unit, department and roles; unlock; sign out
   everywhere; remove (with a reason); reinstate. Centurion checks
   every one of these again.
   ============================================================== */
(function () {
  var el = DES.el;
  var main = document.getElementById('member');
  var id = new URLSearchParams(location.search).get('id') || '';

  DES.requireMember().then(function (me) {
    if (!id) return DES.noAccess(main, 'No member was chosen. Open one from the Personnel Database.');
    load(me);
  });

  function load(me) {
    DES.act('member', { id: id }).then(function (answer) {
      if (!answer.success) return DES.noAccess(main, answer.msg);
      draw(me, answer);
    });
  }

  function draw(me, answer) {
    var m = answer.member;
    main.textContent = '';
    document.title = m.username + ' | YES Emergency Services';

    var back = el('a', 'back-link', m.status === 'FORMER' ? '← Former Personnel' : '← Personnel Database');
    back.href = m.status === 'FORMER' ? '/des/former.html' : '/des/personnel.html';
    main.appendChild(back);

    /* Heading */
    var head = el('div', 'page-head');
    var titles = el('div');
    titles.appendChild(el('div', 'label', m.departmentName));
    var h1 = el('h1', null, m.rank + ' ' + m.username);
    titles.appendChild(h1);
    var chips = el('div', 'chips');
    chips.style.marginTop = '8px';
    chips.appendChild(el('span', 'chip ' + (m.status === 'ACTIVE' ? 'chip-green' : ''), m.status === 'ACTIVE' ? 'Active' : 'Former'));
    if (m.setUp === false) chips.appendChild(el('span', 'chip chip-amber', 'Password not set up'));
    if (m.locked) chips.appendChild(el('span', 'chip chip-red', 'Locked'));
    titles.appendChild(chips);
    head.appendChild(titles);
    main.appendChild(head);

    var grid = el('div', 'dash-grid');

    /* The record */
    var rec = panel('Record');
    var kv = el('dl', 'kv');
    var rows = [['Username', m.username], ['Badge ID', m.badgeId], ['Department', m.departmentName], ['Rank', m.rank], ['Unit', m.unit || '—'],
      ['Joined', DES.day(m.joinedAt)], ['Service', DES.service(m.joinedAt, m.leftAt)]];
    if (m.status === 'FORMER') rows.push(['Left', DES.day(m.leftAt)], ['Reason', m.leaveReason || '—']);
    if (answer.manageable) rows.push(['Discord ID', m.discordId], ['Last login', m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleString() : 'Never'],
      ['Password set', m.passwordSetAt ? DES.day(m.passwordSetAt) : 'Not yet']);
    rows.forEach(function (r) { kv.appendChild(el('dt', null, r[0])); kv.appendChild(el('dd', null, r[1])); });
    rec.body.appendChild(kv);
    if (m.roles) {
      var roles = el('div', 'chips');
      roles.style.marginTop = '14px';
      m.roles.forEach(function (r) { roles.appendChild(el('span', 'chip chip-lime', DES.ROLE_NAMES[r] || r)); });
      rec.body.appendChild(roles);
    }
    grid.appendChild(rec.box);

    if (answer.manageable) {
      if (m.status === 'ACTIVE') grid.appendChild(editPanel(me, answer));
      grid.appendChild(actionsPanel(me, answer));
      if (answer.history && answer.history.length) {
        var hist = panel('History');
        var list = el('ul', 'access-list');
        answer.history.forEach(function (h) {
          var li = el('li');
          var text = el('span');
          text.appendChild(el('strong', null, h.action));
          if (h.detail) text.appendChild(el('span', 'dim', ' · ' + h.detail));
          li.appendChild(text);
          li.appendChild(el('span', 'mono dim', new Date(h.at).toLocaleString()));
          list.appendChild(li);
        });
        hist.box.appendChild(list);
        hist.box.removeChild(hist.body);
        grid.appendChild(hist.box);
      }
    }
    main.appendChild(grid);

    function reload(msgEl, answerMsg) {
      DES.message(msgEl, 'ok', answerMsg);
      setTimeout(function () { load(me); }, 900);
    }

    /* ---- Edit rank, unit, department, roles ---- */
    function editPanel(me, answer) {
      var p = panel('Edit');
      var form = el('form', 'form');
      form.noValidate = true;
      var rank = field(form, 'Rank', 'input', m.rank);
      var unit = field(form, 'Unit', 'input', m.unit || '');
      var dept = null;
      if (answer.departments.length > 1) {
        dept = field(form, 'Department', 'select');
        answer.departments.forEach(function (d) { var o = el('option', null, d.name); o.value = d.key; o.selected = d.key === m.department; dept.appendChild(o); });
      }
      var roleBoxes = rolePicker(form, answer.grantable, m.roles || []);
      var msg = el('p', 'message');
      msg.setAttribute('role', 'status');
      form.appendChild(msg);
      var save = el('button', 'btn btn-primary', 'Save changes');
      save.type = 'submit';
      form.appendChild(save);
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        save.disabled = true;
        var data = { id: m.id, rank: rank.value, unit: unit.value, roles: roleBoxes.filter(function (b) { return b.checked; }).map(function (b) { return b.value; }) };
        if (dept) data.department = dept.value;
        DES.act('member-update', data).then(function (a) {
          save.disabled = false;
          if (!a.success) return DES.message(msg, 'error', a.msg);
          if (m.id === me.id && data.roles) return location.replace('/des/login.html?next=' + encodeURIComponent(location.pathname + location.search));
          reload(msg, a.msg);
        });
      });
      p.body.appendChild(form);
      return p.box;
    }

    /* ---- Unlock, sign out, remove, reinstate ---- */
    function actionsPanel(me, answer) {
      var p = panel('Account');
      var msg = el('p', 'message');
      msg.setAttribute('role', 'status');
      var row = el('div', 'button-row');
      p.body.appendChild(row);

      if (m.status === 'ACTIVE') {
        if (m.locked) {
          var unlock = button(row, 'Unlock account');
          unlock.addEventListener('click', function () { DES.act('member-unlock', { id: m.id }).then(function (a) { a.success ? reload(msg, a.msg) : DES.message(msg, 'error', a.msg); }); });
        }
        var out = button(row, 'Sign out everywhere');
        DES.confirmClick(out, 'Click again to sign out', function () {
          DES.act('member-signout', { id: m.id }).then(function (a) {
            if (!a.success) return DES.message(msg, 'error', a.msg);
            if (answer.self) return location.replace('/des/login.html');
            DES.message(msg, 'ok', a.msg);
          });
        });

        if (!answer.self) {
          var removeBox = el('div', 'form');
          removeBox.style.marginTop = '18px';
          var reason = field(removeBox, 'Reason for removal', 'textarea');
          reason.rows = 2;
          reason.maxLength = 300;
          reason.placeholder = 'e.g. Resigned; Transferred to the Army; Inactivity';
          var remove = button(removeBox, 'Remove from DES', 'btn-danger');
          DES.confirmClick(remove, 'Click again to remove', function () {
            if (!reason.value.trim()) return DES.message(msg, 'error', 'Give a reason first; it\'s kept in Former Personnel.');
            DES.act('member-remove', { id: m.id, reason: reason.value }).then(function (a) { a.success ? reload(msg, a.msg) : DES.message(msg, 'error', a.msg); });
          });
          p.body.appendChild(removeBox);
        }
      } else {
        var back = button(row, 'Reinstate', 'btn-primary');
        back.addEventListener('click', function () { DES.act('member-reinstate', { id: m.id }).then(function (a) { a.success ? reload(msg, a.msg) : DES.message(msg, 'error', a.msg); }); });
      }
      p.body.appendChild(msg);
      return p.box;
    }
  }

  /* ---- small builders ---- */
  function panel(title) {
    var box = el('section', 'panel');
    var head = el('div', 'panel-head');
    head.appendChild(el('h2', null, title));
    box.appendChild(head);
    var body = el('div', 'panel-body');
    box.appendChild(body);
    return { box: box, body: body };
  }
  var fieldCount = 0;
  function field(form, labelText, tag, value) {
    var wrap = el('div', 'field');
    var id = 'f' + (++fieldCount);
    var label = el('label', null, labelText);
    label.htmlFor = id;
    var input = el(tag);
    input.id = id;
    if (value !== undefined) input.value = value;
    wrap.appendChild(label);
    wrap.appendChild(input);
    form.appendChild(wrap);
    return input;
  }
  function button(parent, text, extra) {
    var b = el('button', 'btn' + (extra ? ' ' + extra : ''), text);
    b.type = 'button';
    parent.appendChild(b);
    return b;
  }
  function rolePicker(form, grantable, current) {
    var set = el('fieldset', 'role-picker');
    set.appendChild(el('legend', null, 'Roles'));
    var boxes = [];
    grantable.forEach(function (g) {
      var lab = el('label', 'check');
      var box = el('input');
      box.type = 'checkbox';
      box.value = g.key;
      box.checked = current.indexOf(g.key) !== -1;
      lab.appendChild(box);
      lab.appendChild(el('span', null, g.name));
      set.appendChild(lab);
      boxes.push(box);
    });
    var others = current.filter(function (r) { return !grantable.some(function (g) { return g.key === r; }); });
    if (others.length) set.appendChild(el('p', 'field-hint', 'Also has (only a Service Admin can change): ' + others.map(function (r) { return DES.ROLE_NAMES[r] || r; }).join(', ')));
    form.appendChild(set);
    return boxes;
  }
})();
