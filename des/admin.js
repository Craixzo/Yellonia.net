/* ==============================================================
   des/admin.js - Local Admin (admin.html)

   Add a member, and see who still needs to set a password or is
   locked out. Local Admins work on their own department and can give
   officer, dispatcher, supervisor, OIA and OFI roles; Service Admins
   can do everything. Centurion checks all of it again.
   ============================================================== */
(function () {
  var el = DES.el;
  var main = document.getElementById('admin');

  DES.requireMember().then(function (me) {
    if (!DES.hasRole(me, 'local-admin', 'service-admin')) return DES.noAccess(main, 'This page is for Local Admins and Service Admins.');
    DES.act('personnel', {}).then(function (answer) {
      if (!answer.success) return DES.noAccess(main, answer.msg);
      draw(me, answer);
    });
  });

  function draw(me, answer) {
    var service = DES.hasRole(me, 'service-admin');
    var mine = answer.members.filter(function (m) { return m.manageable; });
    main.textContent = '';

    var titles = el('div');
    titles.appendChild(el('div', 'label', 'Department Administration'));
    titles.appendChild(el('h1', null, 'Local Admin'));
    titles.appendChild(el('p', 'dim', service ? 'As a Service Admin you can manage every department.' : 'You manage the ' + me.departmentName + '.'));
    main.appendChild(titles);

    var grid = el('div', 'dash-grid');

    /* ---- Add a member ---- */
    var add = panel('Add a member');
    add.box.id = 'add';
    var form = el('form', 'form');
    form.noValidate = true;
    var discord = field(form, 'Discord username or ID', 'input', 'They must be in the Yellonia Discord server. Their Discord account is how they set their password.');
    var roblox = field(form, 'Roblox username', 'input', 'This is the username they log in with.');
    var badge = field(form, 'Badge ID', 'input');
    badge.classList.add('mono');
    var dept = null;
    if (service) {
      dept = field(form, 'Department', 'select');
      answer.departments.forEach(function (d) { var o = el('option', null, d.name); o.value = d.key; dept.appendChild(o); });
    } else {
      var fixed = field(form, 'Department', 'input');
      fixed.value = me.departmentName;
      fixed.readOnly = true;
    }
    var rank = field(form, 'Rank', 'input');
    var ranks = el('datalist');
    ranks.id = 'rank-list';
    answer.members.map(function (m) { return m.rank; }).filter(function (r, i, a) { return a.indexOf(r) === i; }).sort()
      .forEach(function (r) { var o = el('option'); o.value = r; ranks.appendChild(o); });
    rank.setAttribute('list', 'rank-list');
    form.appendChild(ranks);
    var unit = field(form, 'Unit (optional)', 'input');

    var set = el('fieldset', 'role-picker');
    set.appendChild(el('legend', null, 'Roles'));
    var boxes = DES.grantableFor(me).map(function (key) {
      var lab = el('label', 'check');
      var box = el('input');
      box.type = 'checkbox';
      box.value = key;
      box.checked = key === 'officer';
      lab.appendChild(box);
      lab.appendChild(el('span', null, DES.ROLE_NAMES[key]));
      set.appendChild(lab);
      return box;
    });
    form.appendChild(set);

    var msg = el('p', 'message');
    msg.setAttribute('role', 'status');
    form.appendChild(msg);
    var submit = el('button', 'btn btn-primary', 'Add member');
    submit.type = 'submit';
    form.appendChild(submit);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!discord.value.trim() || !roblox.value.trim() || !badge.value.trim() || !rank.value.trim()) return DES.message(msg, 'error', 'Fill in Discord, Roblox username, Badge ID and rank.');
      submit.disabled = true;
      DES.message(msg, null, 'Adding…');
      var data = {
        discord: discord.value.trim(), robloxUsername: roblox.value.trim(), badgeId: badge.value.trim(),
        rank: rank.value.trim(), unit: unit.value.trim(),
        roles: boxes.filter(function (b) { return b.checked; }).map(function (b) { return b.value; }),
      };
      if (dept) data.department = dept.value;
      DES.act('member-add', data).then(function (a) {
        submit.disabled = false;
        if (!a.success) return DES.message(msg, 'error', a.msg);
        DES.message(msg, 'ok', a.msg);
        form.reset();
        boxes.forEach(function (b) { b.checked = b.value === 'officer'; });
        var open = el('a', null, ' Open their record');
        open.href = '/des/member.html?id=' + encodeURIComponent(a.id);
        msg.appendChild(open);
      });
    });
    add.body.appendChild(form);
    grid.appendChild(add.box);

    /* ---- Needs attention ---- */
    var side = el('div', 'stack');
    side.appendChild(listPanel('Not set up yet', mine.filter(function (m) { return m.setUp === false; }),
      'Everyone has set a password.', 'They set a password with their Discord account: Service Login → First time?'));
    side.appendChild(listPanel('Locked out', mine.filter(function (m) { return m.locked; }),
      'Nobody is locked out.', 'Locked after too many wrong passwords. Open them to unlock early.'));

    var summary = panel('At a glance');
    var kv = el('dl', 'kv');
    answer.departments.forEach(function (d) {
      var count = answer.members.filter(function (m) { return m.department === d.key; }).length;
      kv.appendChild(el('dt', null, d.short));
      kv.appendChild(el('dd', null, count + (count === 1 ? ' member' : ' members')));
    });
    summary.body.appendChild(kv);
    var links = el('div', 'button-row');
    links.style.marginTop = '14px';
    var p1 = el('a', 'btn', 'Personnel Database'); p1.href = '/des/personnel.html'; links.appendChild(p1);
    var p2 = el('a', 'btn', 'Former Personnel'); p2.href = '/des/former.html'; links.appendChild(p2);
    summary.body.appendChild(links);
    side.appendChild(summary.box);

    grid.appendChild(side);
    main.appendChild(grid);
    if (location.hash === '#add') discord.focus();
  }

  function listPanel(title, people, emptyText, hint) {
    var p = panel(title + ' (' + people.length + ')');
    var list = el('ul', 'access-list');
    if (!people.length) list.appendChild(el('li', 'access-none', emptyText));
    people.forEach(function (m) {
      var li = el('li');
      var a = el('a', null, m.rank + ' ' + m.username);
      a.href = '/des/member.html?id=' + encodeURIComponent(m.id);
      li.appendChild(a);
      li.appendChild(el('span', 'mono dim', m.departmentShort + ' · ' + m.badgeId));
      list.appendChild(li);
    });
    p.box.appendChild(list);
    p.box.removeChild(p.body);
    if (people.length) { var h = el('p', 'field-hint panel-note', hint); p.box.appendChild(h); }
    return p.box;
  }

  function panel(title) {
    var box = el('section', 'panel');
    var head = el('div', 'panel-head');
    head.appendChild(el('h2', null, title));
    box.appendChild(head);
    var body = el('div', 'panel-body');
    box.appendChild(body);
    return { box: box, body: body };
  }
  var n = 0;
  function field(form, labelText, tag, hint) {
    var wrap = el('div', 'field');
    var label = el('label', null, labelText);
    var input = el(tag);
    input.id = 'a' + (++n);
    label.htmlFor = input.id;
    wrap.appendChild(label);
    wrap.appendChild(input);
    if (hint) wrap.appendChild(el('span', 'field-hint', hint));
    form.appendChild(wrap);
    return input;
  }
})();
