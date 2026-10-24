/* ==============================================================
   des/application.js - one application (application.html?id=...)

   Left:  who they are (Roblox and Discord), their answers, and the
          internal notes (the applicant never sees these)
   Right: what happens next. Supervisors can mark it "in review".
          Admins of the department accept it (choosing badge, rank, unit
          and roles: this adds them to DES, like /des-add) or decline it
          with a message the applicant sees.
   ============================================================== */
(function () {
  var el = DES.el;
  var main = document.getElementById('application');
  var id = new URLSearchParams(location.search).get('id') || '';
  var me, flash;
  var STATUS_CHIP = { PENDING: 'chip-amber', REVIEW: 'chip-lime', ACCEPTED: 'chip-green', DECLINED: 'chip-red', WITHDRAWN: '' };

  DES.requireMember().then(function (member) { me = member; load(); });

  function load(okText) {
    DES.act('application', { id: id }).then(function (answer) {
      if (!answer.success) { DES.noAccess(main, answer.msg); return; }
      draw(answer);
      if (okText) say('ok', okText);
    });
  }
  function say(kind, text) {
    flash.textContent = text || '';
    flash.className = 'message flash' + (kind ? ' message-' + kind : '');
    if (text) flash.scrollIntoView({ block: 'nearest' });
  }
  function run(action, data) {
    return DES.act(action, Object.assign({ id: id }, data)).then(function (answer) {
      if (!answer.success) { say('error', answer.msg); return answer; }
      load(answer.msg);
      return answer;
    });
  }

  function draw(answer) {
    var a = answer.application;
    var open = a.status === 'PENDING' || a.status === 'REVIEW';
    main.textContent = '';
    document.title = a.number + ' | YES Emergency Services';

    var back = el('a', 'back-link', '← Recruitment');
    back.href = '/des/recruitment.html';
    main.appendChild(back);
    var head = el('div', 'page-head');
    var titles = el('div');
    titles.appendChild(el('div', 'label', 'Application · ' + a.departmentName));
    var h1 = el('h1');
    h1.appendChild(el('span', 'mono case-num', a.number));
    h1.appendChild(document.createTextNode(' ' + a.robloxUsername));
    titles.appendChild(h1);
    head.appendChild(titles);
    head.appendChild(el('span', 'chip ' + (STATUS_CHIP[a.status] || ''), a.statusName));
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

    /* who */
    var whoPanel = panel(left, 'Applicant');
    var wbody = el('div', 'panel-body');
    var top = el('div', 'subject-head');
    var av = el('div', 'subject-head-av', a.robloxUsername.slice(0, 2).toUpperCase());
    if (a.avatar) {
      var img = el('img');
      img.src = a.avatar;
      img.alt = '';
      img.onerror = function () { av.textContent = a.robloxUsername.slice(0, 2).toUpperCase(); };
      av.textContent = '';
      av.appendChild(img);
    }
    top.appendChild(av);
    var kv = el('dl', 'kv');
    var dd = add(kv, 'Roblox', '');
    var rl = el('a', null, a.robloxUsername);
    rl.href = 'https://www.roblox.com/users/' + encodeURIComponent(a.robloxUserId) + '/profile';
    rl.target = '_blank';
    rl.rel = 'noopener noreferrer';
    dd.appendChild(rl);
    add(kv, 'Discord', a.discordName + ' · ' + a.discordId);
    add(kv, 'Department', a.departmentName);
    add(kv, 'Applied', DES.day(a.createdAt));
    if (a.reviewedName) add(kv, 'Reviewer', a.reviewedName);
    top.appendChild(kv);
    wbody.appendChild(top);

    /* things to know */
    var warn = el('div', 'stack-sm app-flags');
    if (a.criminalRecord) {
      var cr = el('p', a.criminalRecord.activeWarrants ? 'warn' : 'dim');
      cr.appendChild(document.createTextNode(a.criminalRecord.activeWarrants ? 'Has ' + a.criminalRecord.activeWarrants + ' active warrant(s) in the ' : 'Has a record in the '));
      var crl = el('a', null, 'Criminal Database');
      crl.href = '/des/subject.html?id=' + encodeURIComponent(a.criminalRecord.id);
      cr.appendChild(crl);
      cr.appendChild(document.createTextNode('.'));
      warn.appendChild(cr);
    }
    if (a.existingMember) {
      var em = a.existingMember;
      var mp = el('p', 'dim');
      mp.appendChild(document.createTextNode(em.status === 'ACTIVE' ? 'Already a member: ' : 'Former member: '));
      var ml = el('a', null, em.rank + ', Badge ' + em.badgeId + ' (' + em.department + ')');
      ml.href = '/des/member.html?id=' + encodeURIComponent(em.id);
      mp.appendChild(ml);
      if (em.leaveReason) mp.appendChild(document.createTextNode('. Left: ' + em.leaveReason));
      warn.appendChild(mp);
    }
    if (a.earlier.length) {
      warn.appendChild(el('p', 'dim', 'Applied before: ' + a.earlier.map(function (x) { return x.number + ' (' + x.statusName + ')'; }).join(', ')));
    }
    if (warn.children.length) wbody.appendChild(warn);
    whoPanel.appendChild(wbody);

    /* answers */
    var ans = panel(left, 'Answers');
    var abody = el('div', 'panel-body');
    a.answers.forEach(function (x, n) {
      abody.appendChild(el('h3', 'label case-sub', (n + 1) + '. ' + x.q));
      abody.appendChild(el('p', 'case-desc', x.a));
    });
    ans.appendChild(abody);

    /* notes */
    var logPanel = panel(left, 'Notes');
    logPanel.querySelector('.panel-head').appendChild(el('span', 'label', 'Internal only'));
    var logList = el('ol', 'cad-log case-log');
    a.log.forEach(function (l) {
      var li = el('li', 'log-' + l.kind.toLowerCase());
      li.appendChild(el('span', 'mono log-time', DES.day(l.createdAt) + ' ' + new Date(l.createdAt).toTimeString().slice(0, 5)));
      li.appendChild(el('span', 'log-who', l.actorName));
      li.appendChild(el('span', 'log-text', l.text));
      logList.appendChild(li);
    });
    logPanel.appendChild(logList);
    var noteForm = el('form', 'cad-note');
    var note = el('textarea');
    note.rows = 3;
    note.maxLength = 2000;
    note.placeholder = 'Interview notes, checks, opinions…';
    note.setAttribute('aria-label', 'Add a note');
    var send = button('Add note', 'btn-small');
    send.type = 'submit';
    noteForm.appendChild(note);
    noteForm.appendChild(send);
    noteForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!note.value.trim()) return;
      run('app-note', { text: note.value.trim() });
    });
    logPanel.appendChild(noteForm);

    /* next step */
    var next = panel(right, open ? 'Next step' : 'Decided');
    var nbody = el('div', 'panel-body stack-sm');
    if (!open) {
      nbody.appendChild(el('p', null, a.statusName + (a.decidedAt ? ' on ' + DES.day(a.decidedAt) : '') + (a.reviewedName && a.status !== 'WITHDRAWN' ? ' by ' + a.reviewedName : '') + '.'));
      if (a.publicNote) { nbody.appendChild(el('strong', null, 'Told the applicant:')); nbody.appendChild(el('p', 'case-desc', a.publicNote)); }
      if (a.memberId) { var ml2 = el('a', 'btn btn-small', 'Open their member record'); ml2.href = '/des/member.html?id=' + encodeURIComponent(a.memberId); nbody.appendChild(ml2); }
    } else {
      if (a.status === 'PENDING') {
        var rev = button('Mark in review', 'btn-primary');
        rev.addEventListener('click', function () { run('app-review', {}); });
        nbody.appendChild(rev);
        nbody.appendChild(el('p', 'field-hint', 'The applicant sees "In review", e.g. while you set up an interview.'));
      }
      if (answer.canDecide) {
        nbody.appendChild(acceptForm(a));
        nbody.appendChild(declineForm());
      } else {
        nbody.appendChild(el('p', 'dim', 'An admin of this department accepts or declines it.'));
      }
    }
    next.appendChild(nbody);
  }

  function acceptForm(a) {
    var form = el('form', 'form form-inset');
    form.noValidate = true;
    form.appendChild(el('strong', null, 'Accept'));
    form.appendChild(el('p', 'field-hint', 'Adds them to DES. They set their password with their Discord account.'));
    var badge = field(form, 'Badge ID', 'input');
    badge.classList.add('mono');
    badge.maxLength = 20;
    var rank = field(form, 'Rank', 'input');
    rank.maxLength = 40;
    rank.placeholder = a.department === 'FIRE' ? 'e.g. Probationary Firefighter' : 'e.g. Probationary Officer';
    var unit = field(form, 'Unit (optional)', 'input');
    unit.maxLength = 60;
    var fs = el('fieldset', 'role-picker');
    fs.appendChild(el('legend', null, 'Roles'));
    DES.grantableFor(me).forEach(function (key) {
      var label = el('label', 'check');
      var box = el('input');
      box.type = 'checkbox';
      box.value = key;
      if (key === 'officer') box.checked = true;
      label.appendChild(box);
      label.appendChild(el('span', null, DES.ROLE_NAMES[key] || key));
      fs.appendChild(label);
    });
    form.appendChild(fs);
    var msg = field(form, 'Message to the applicant (optional)', 'textarea');
    msg.rows = 2;
    msg.maxLength = 1000;
    var go = button('Accept and add to DES', 'btn-primary');
    go.type = 'submit';
    form.appendChild(go);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var roles = Array.prototype.filter.call(fs.querySelectorAll('input'), function (b) { return b.checked; }).map(function (b) { return b.value; });
      go.disabled = true;
      run('app-accept', { badgeId: badge.value.trim(), rank: rank.value.trim(), unit: unit.value.trim(), roles: roles, publicNote: msg.value.trim() })
        .then(function () { go.disabled = false; });
    });
    return form;
  }

  function declineForm() {
    var box = el('details', 'edit-details');
    box.appendChild(el('summary', null, 'Decline'));
    var form = el('form', 'form');
    form.noValidate = true;
    var reason = field(form, 'Message to the applicant', 'textarea');
    reason.rows = 3;
    reason.maxLength = 1000;
    reason.placeholder = 'e.g. Thanks for applying. We\'re looking for more roleplay experience; you\'re welcome to apply again later.';
    var go = button('Decline application', 'btn-danger btn-small');
    go.type = 'submit';
    form.appendChild(go);
    form.addEventListener('submit', function (e) { e.preventDefault(); run('app-decline', { publicNote: reason.value.trim() }); });
    box.appendChild(form);
    return box;
  }

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
  function field(parent, labelText, tag) {
    var wrap = el('div', 'field');
    var fid = 'app-f-' + Math.random().toString(36).slice(2, 8);
    var label = el('label', null, labelText);
    label.htmlFor = fid;
    var input = el(tag);
    input.id = fid;
    wrap.appendChild(label);
    wrap.appendChild(input);
    parent.appendChild(wrap);
    return input;
  }
})();
