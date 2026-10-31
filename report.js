/* ==============================================================
   report.js - the Complaints and Reports page (report.html)

   1. Not logged in: a "Log in with Discord" card.
   2. Logged in: pick what you're reporting, fill in the form, send.
      You get a reference number (OIA-2026-0001, OFI-2026-0001, or for a
      crime C-2026-00001: crimes go straight to police dispatch).
   3. "Your reports": everything you've filed, its status, and the
      outcome once it's finished.

   CONTENTS
     1. SETTINGS: the four kinds of report and their wording
     2. HELPERS
     3. START-UP AND LOGIN
     4. THE FORM
     5. YOUR REPORTS
   ============================================================== */
(function () {
  var root = document.getElementById('report-root');
  if (!root) return;


  /* ---------- 1. SETTINGS ---------- */
  var KINDS = {
    crime: {
      key: 'CRIME', name: 'A crime', blurb: 'A robbery, assault, theft or anything else the police should know about.', /* DRAFT */
      goesTo: 'Goes straight to police dispatch as a call. In an emergency, also tell an officer in-game.',
    },
    officer: {
      key: 'OFFICER', name: 'An officer or firefighter', blurb: 'Something a member of the Police or Fire Department did.', /* DRAFT */
      goesTo: 'Goes to the Office of Internal Affairs.',
    },
    department: {
      key: 'DEPARTMENT', name: 'A department', blurb: 'How the Police or Fire Department works as a whole.', /* DRAFT */
      goesTo: 'Goes to the Office of Internal Affairs.',
    },
    fire: {
      key: 'FIRE', name: 'A fire', blurb: 'A fire you saw, especially one you think was started on purpose.', /* DRAFT */
      goesTo: 'Goes to the Office of Fire Investigations.',
    },
  };
  var DEPARTMENTS = [['POLICE', 'Yellonia Police Department'], ['FIRE', 'Yellonia Fire Department']];
  var crimeTypes = ['Robbery', 'Assault', 'Theft', 'Burglary', 'Shots fired', 'Disturbance', 'Suspicious person', 'Other'];   /* replaced by Centurion's list on load */


  /* ---------- 2. HELPERS ---------- */
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }
  function link(text, href, className) { var a = el('a', className, text); a.href = href; return a; }
  function message(target, kind, text) {
    target.textContent = text || '';
    target.className = 'form-message' + (kind ? ' form-message-' + kind : '');
  }
  function option(value, text) { var o = el('option', null, text); o.value = value; return o; }
  function field(labelText, input, hint) {
    var wrap = el('label', 'field');
    wrap.appendChild(el('span', 'field-label', labelText));
    wrap.appendChild(input);
    if (hint) wrap.appendChild(el('span', 'field-hint', hint));
    return wrap;
  }
  function textInput(max, placeholder) {
    var input = el('input');
    input.type = 'text';
    input.maxLength = max;
    if (placeholder) input.placeholder = placeholder;
    return input;
  }
  function day(value) { return value ? new Date(value).toISOString().slice(0, 10) : ''; }

  function api(action, data) {
    return fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(Object.assign({ action: action }, data || {})),
    }).then(function (reply) {
      return reply.json().catch(function () { return { success: false, msg: 'Something went wrong. Please try again.' }; });
    }).catch(function () {
      return { success: false, msg: 'Couldn\'t reach the site. Check your connection and try again.' };
    });
  }


  /* ---------- 3. START-UP AND LOGIN ---------- */
  var here = location.pathname + location.hash;

  fetch('/api/auth/me', { credentials: 'same-origin' })
    .then(function (reply) { return reply.json(); })
    .catch(function () { return { user: null }; })
    .then(function (answer) {
      root.textContent = '';
      if (!answer.user) { root.appendChild(loginCard()); return; }
      root.appendChild(accountBar(answer.user));
      var formBox = el('section', 'report-section');
      var mineBox = el('section', 'report-section');
      root.appendChild(formBox);
      root.appendChild(mineBox);
      buildForm(formBox, function () { loadMine(mineBox); });
      loadMine(mineBox);
    });

  function loginCard() {
    var card = el('div', 'login-card');
    card.appendChild(el('h2', null, 'Log in to send a report'));
    card.appendChild(el('p', null, 'Reports are tied to your Discord account, so we can follow up and you can check on them later.'));
    card.appendChild(link('Log in with Discord', '/api/auth/login?next=' + encodeURIComponent(here), 'button-discord'));
    card.appendChild(el('p', 'login-small', 'We only see your Discord name, ID and avatar. The officer you report never sees who you are.'));
    return card;
  }

  function accountBar(user) {
    var bar = el('div', 'account-bar');
    if (user.avatar) { var pic = el('img', 'account-avatar'); pic.src = user.avatar; pic.alt = ''; bar.appendChild(pic); }
    var who = el('span', null, 'Logged in as ');
    who.appendChild(el('strong', null, user.name));
    bar.appendChild(who);
    bar.appendChild(link('Log out', '/api/auth/logout', 'account-logout'));
    return bar;
  }


  /* ---------- 4. THE FORM ---------- */
  function buildForm(box, onSent) {
    box.appendChild(el('h2', null, 'What are you reporting?'));
    var choices = el('div', 'report-choices report-choices-4');
    choices.setAttribute('role', 'radiogroup');
    choices.setAttribute('aria-label', 'What are you reporting?');
    var holder = el('div');
    var buttons = {};
    Object.keys(KINDS).forEach(function (key) {
      var k = KINDS[key];
      var b = el('button', 'report-choice report-choice-' + key);
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', 'false');
      b.appendChild(el('strong', null, k.name));
      b.appendChild(el('span', null, k.blurb));
      b.addEventListener('click', function () { pick(key, true); });
      buttons[key] = b;
      choices.appendChild(b);
    });
    box.appendChild(choices);
    box.appendChild(holder);

    function pick(key, focus) {
      Object.keys(buttons).forEach(function (k) { buttons[k].setAttribute('aria-checked', k === key ? 'true' : 'false'); });
      history.replaceState(null, '', '#' + key);
      holder.textContent = '';
      holder.appendChild(form(key, onSent));
      if (focus) holder.querySelector('input, select').focus();
    }
    var start = location.hash.slice(1);
    if (KINDS[start]) pick(start, false);
  }

  function crimeForm(onSent) {
    var f = el('form', 'news-form report-form');
    f.noValidate = true;
    f.appendChild(el('p', 'form-note', KINDS.crime.goesTo));
    var type = el('select');
    type.appendChild(option('', 'Pick one…'));
    crimeTypes.forEach(function (t) { type.appendChild(option(t, t)); });
    f.appendChild(field('What kind of crime?', type));
    var where = textInput(120, 'Street, landmark or area');
    f.appendChild(field('Where did it happen?', where));
    var description = el('textarea');
    description.rows = 6;
    description.maxLength = 2000;
    f.appendChild(field('What happened?', description, 'What you saw, in order, and when.'));
    var suspect = textInput(200, 'e.g. Username, clothing, vehicle and plate');
    f.appendChild(field('Suspect (optional)', suspect, 'Anything that helps officers find them.'));
    var msg = el('p', 'form-message');
    msg.setAttribute('role', 'status');
    f.appendChild(msg);
    var send = el('button', 'button-primary', 'Send to police');
    send.type = 'submit';
    f.appendChild(send);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!type.value) { message(msg, 'error', 'Pick what kind of crime it was.'); type.focus(); return; }
      if (where.value.trim().length < 2) { message(msg, 'error', 'Say where it happened.'); where.focus(); return; }
      if (description.value.trim().length < 20) { message(msg, 'error', 'Describe what happened (at least 20 characters).'); description.focus(); return; }
      send.disabled = true;
      message(msg, '', 'Sending…');
      api('crime', { type: type.value, location: where.value.trim(), description: description.value.trim(), suspect: suspect.value.trim() }).then(function (answer) {
        send.disabled = false;
        if (answer.needsLogin) { location.reload(); return; }
        if (!answer.success) { message(msg, 'error', answer.msg); return; }
        var done = el('div', 'login-card report-done');
        done.appendChild(el('h2', null, 'Sent to police dispatch'));
        var p = el('p', null, 'Your reference number is ');
        p.appendChild(el('strong', 'report-number', answer.number));
        p.appendChild(document.createTextNode('. You can follow it under "Your reports" below.'));
        done.appendChild(p);
        var again = el('button', 'button-secondary', 'Report another');
        again.type = 'button';
        again.addEventListener('click', function () { done.parentNode.replaceChild(crimeForm(onSent), done); });
        done.appendChild(again);
        f.parentNode.replaceChild(done, f);
        onSent();
      });
    });
    return f;
  }

  function form(key, onSent) {
    if (key === 'crime') return crimeForm(onSent);
    var kind = KINDS[key];
    var f = el('form', 'news-form report-form');
    f.noValidate = true;
    f.appendChild(el('p', 'form-note', kind.goesTo));

    var accused = null, department = null;
    if (key === 'officer') {
      accused = textInput(120, 'e.g. Sgt KingMS, badge 2318');
      f.appendChild(field('Which officer?', accused, 'Their name or badge number if you know it. If not, describe them (rank, unit, vehicle number).'));
      department = el('select');
      department.appendChild(option('', 'Not sure'));
      DEPARTMENTS.forEach(function (d) { department.appendChild(option(d[0], d[1])); });
      f.appendChild(field('Department', department));
    }
    if (key === 'department') {
      department = el('select');
      department.appendChild(option('', 'Pick a department…'));
      DEPARTMENTS.forEach(function (d) { department.appendChild(option(d[0], d[1])); });
      f.appendChild(field('Which department?', department));
    }

    var title = textInput(120, key === 'fire' ? 'e.g. House fire on Harbour Road' : 'e.g. Rude during a traffic stop');
    f.appendChild(field('Short title', title));
    var where = textInput(120, 'Street, landmark or area');
    f.appendChild(field(key === 'fire' ? 'Where was the fire?' : 'Where did it happen? (optional)', where));
    var when = textInput(60, 'e.g. Saturday evening, around 8pm EST');
    f.appendChild(field('When? (optional)', when));
    var description = el('textarea');
    description.rows = 7;
    description.maxLength = 4000;
    f.appendChild(field('What happened?', description,
      key === 'fire' ? 'What did you see? If you think someone started it, say who and why.' : 'Say what happened, in order. Stick to facts: what was said and done.'));
    var evidence = el('textarea');
    evidence.rows = 3;
    evidence.placeholder = 'https://…';
    f.appendChild(field('Evidence links (optional)', evidence, 'Clips or screenshots: one link per line, up to 6 (YouTube, Medal, Gyazo, Imgur…).'));

    var msg = el('p', 'form-message');
    msg.setAttribute('role', 'status');
    f.appendChild(msg);
    var send = el('button', 'button-primary', 'Send report');
    send.type = 'submit';
    f.appendChild(send);

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (accused && accused.value.trim().length < 2) { message(msg, 'error', 'Say which officer, or describe them.'); accused.focus(); return; }
      if (key === 'department' && !department.value) { message(msg, 'error', 'Pick the department.'); department.focus(); return; }
      if (title.value.trim().length < 5) { message(msg, 'error', 'Give it a short title (at least 5 characters).'); title.focus(); return; }
      if (key === 'fire' && !where.value.trim()) { message(msg, 'error', 'Say where the fire was.'); where.focus(); return; }
      if (description.value.trim().length < 20) { message(msg, 'error', 'Describe what happened (at least 20 characters).'); description.focus(); return; }
      send.disabled = true;
      message(msg, '', 'Sending…');
      api('submit', {
        kind: kind.key, title: title.value.trim(), location: where.value.trim(), occurredAt: when.value.trim(),
        description: description.value.trim(), evidence: evidence.value,
        accused: accused ? accused.value.trim() : undefined, department: department ? department.value : undefined,
      }).then(function (answer) {
        send.disabled = false;
        if (answer.needsLogin) { location.reload(); return; }
        if (!answer.success) { message(msg, 'error', answer.msg); return; }
        var done = el('div', 'login-card report-done');
        done.appendChild(el('h2', null, 'Report sent'));
        var p = el('p', null, 'Your reference number is ');
        p.appendChild(el('strong', 'report-number', answer.number));
        p.appendChild(document.createTextNode('. You can follow it under "Your reports" below.'));
        done.appendChild(p);
        var again = el('button', 'button-secondary', 'Send another');
        again.type = 'button';
        again.addEventListener('click', function () { done.parentNode.replaceChild(form(key, onSent), done); });
        done.appendChild(again);
        f.parentNode.replaceChild(done, f);
        onSent();
      });
    });
    return f;
  }


  /* ---------- 5. YOUR REPORTS ---------- */
  var CRIME_CLASS = { PENDING: 'new', ACTIVE: 'open', CLOSED: 'closed' };

  function loadMine(box) {
    Promise.all([api('mine'), api('crime-mine')]).then(function (both) {
      var answer = both[0], crimes = both[1];
      box.textContent = '';
      box.appendChild(el('h2', null, 'Your reports'));
      if (!answer.success) { box.appendChild(el('p', 'form-message form-message-error', answer.msg)); return; }
      if (crimes.success && crimes.types && crimes.types.length) crimeTypes = crimes.types;
      var crimeList = crimes.success ? crimes.reports : [];
      if (!answer.reports.length && !crimeList.length) { box.appendChild(el('p', 'form-note', 'You haven\'t sent any reports yet.')); return; }
      var list = el('div', 'report-list');
      crimeList.forEach(function (r) {
        var card = el('article', 'report-card report-' + (CRIME_CLASS[r.status] || 'new'));
        var top = el('div', 'report-card-top');
        top.appendChild(el('span', 'report-number', r.number));
        top.appendChild(el('span', 'report-status', r.statusName));
        card.appendChild(top);
        card.appendChild(el('h3', null, r.type + ' at ' + r.location));
        card.appendChild(el('p', 'report-meta', 'Crime report · police · sent ' + day(r.createdAt)));
        if (r.outcome) {
          var o = el('p', 'report-outcome');
          o.appendChild(el('strong', null, 'Outcome: ' + r.outcome));
          card.appendChild(o);
        }
        list.appendChild(card);
      });
      answer.reports.forEach(function (r) {
        var card = el('article', 'report-card report-' + r.status.toLowerCase());
        var top = el('div', 'report-card-top');
        top.appendChild(el('span', 'report-number', r.number));
        top.appendChild(el('span', 'report-status', r.statusName));
        card.appendChild(top);
        card.appendChild(el('h3', null, r.title));
        card.appendChild(el('p', 'report-meta', r.kindName + (r.department && r.kind !== 'FIRE' ? ' · ' + r.department : '') + ' · sent ' + day(r.createdAt)));
        if (r.outcome) {
          var o = el('p', 'report-outcome');
          o.appendChild(el('strong', null, (r.kind === 'FIRE' ? 'Cause: ' : 'Outcome: ') + r.outcome));
          card.appendChild(o);
        }
        if (r.publicNote) card.appendChild(el('p', 'report-note', r.publicNote));
        list.appendChild(card);
      });
      box.appendChild(list);
    });
  }
})();
