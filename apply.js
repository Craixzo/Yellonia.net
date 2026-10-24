/* ==============================================================
   apply.js - the Join Emergency Services page (apply.html)

   1. Not logged in: a "Log in with Discord" card.
   2. Logged in: pick Police or Fire, enter your Roblox username and
      answer the questions. The questions come from Centurion
      (applicationQuestions in src/handlers/des/settings.ts).
   3. "Your applications": status, and the message from DES once decided.

   CONTENTS
     1. SETTINGS
     2. HELPERS
     3. START-UP AND LOGIN
     4. THE FORM
     5. YOUR APPLICATIONS
   ============================================================== */
(function () {
  var root = document.getElementById('apply-root');
  if (!root) return;


  /* ---------- 1. SETTINGS: wording for each department's button ---------- */
  var BLURBS = {
    POLICE: 'Patrol Yellonia, answer calls and keep the peace.',   /* DRAFT */
    FIRE: 'Fight fires, run rescues and answer medical calls.',     /* DRAFT */
  };
  var HASH = { police: 'POLICE', fire: 'FIRE' };


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
  function field(labelText, input, hint) {
    var wrap = el('label', 'field');
    wrap.appendChild(el('span', 'field-label', labelText));
    wrap.appendChild(input);
    if (hint) wrap.appendChild(el('span', 'field-hint', hint));
    return wrap;
  }
  function day(value) { return value ? new Date(value).toISOString().slice(0, 10) : ''; }
  function api(action, data) {
    return fetch('/api/apply', {
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
  fetch('/api/auth/me', { credentials: 'same-origin' })
    .then(function (reply) { return reply.json(); })
    .catch(function () { return { user: null }; })
    .then(function (answer) {
      root.textContent = '';
      if (!answer.user) { root.appendChild(loginCard()); return; }
      root.appendChild(accountBar(answer.user));
      var box = el('div');
      root.appendChild(box);
      load(box);
    });

  function loginCard() {
    var card = el('div', 'login-card');
    card.appendChild(el('h2', null, 'Log in to apply'));
    card.appendChild(el('p', null, 'Applications are tied to your Discord account, so we can contact you and you can follow your application here.'));
    card.appendChild(link('Log in with Discord', '/api/auth/login?next=' + encodeURIComponent(location.pathname + location.hash), 'button-discord'));
    card.appendChild(el('p', 'login-small', 'We only see your Discord name, ID and avatar. You must be a member of the Yellonia Discord server.'));
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

  function load(box) {
    api('status').then(function (answer) {
      box.textContent = '';
      if (!answer.success) { box.appendChild(el('p', 'form-message form-message-error', answer.msg)); return; }
      var formBox = el('section', 'report-section');
      box.appendChild(formBox);
      if (answer.blocked) {
        formBox.appendChild(el('h2', null, 'Apply'));
        formBox.appendChild(el('p', 'report-notice', answer.blocked));
      } else {
        buildForm(formBox, answer.departments, function () { load(box); });
      }
      var mine = el('section', 'report-section');
      box.appendChild(mine);
      drawMine(mine, answer.applications, function () { load(box); });
    });
  }


  /* ---------- 4. THE FORM ---------- */
  function buildForm(box, departments, onSent) {
    box.appendChild(el('h2', null, 'Which department?'));
    var choices = el('div', 'report-choices apply-choices');
    choices.setAttribute('role', 'radiogroup');
    choices.setAttribute('aria-label', 'Which department?');
    var holder = el('div');
    var buttons = {};
    departments.forEach(function (d) {
      var b = el('button', 'report-choice report-choice-' + (d.key === 'FIRE' ? 'fire' : 'officer'));
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', 'false');
      b.appendChild(el('strong', null, d.name));
      b.appendChild(el('span', null, d.open ? (BLURBS[d.key] || '') : 'Not taking applications right now.'));
      if (!d.open) b.disabled = true;
      b.addEventListener('click', function () { pick(d, true); });
      buttons[d.key] = b;
      choices.appendChild(b);
    });
    box.appendChild(choices);
    box.appendChild(holder);

    function pick(d, focus) {
      Object.keys(buttons).forEach(function (k) { buttons[k].setAttribute('aria-checked', k === d.key ? 'true' : 'false'); });
      history.replaceState(null, '', '#' + (d.key === 'FIRE' ? 'fire' : 'police'));
      holder.textContent = '';
      holder.appendChild(form(d, onSent));
      if (focus) holder.querySelector('input').focus();
    }
    var start = HASH[location.hash.slice(1)];
    departments.forEach(function (d) { if (d.key === start && d.open) pick(d, false); });
  }

  function form(d, onSent) {
    var f = el('form', 'news-form report-form');
    f.noValidate = true;
    var roblox = el('input');
    roblox.type = 'text';
    roblox.maxLength = 20;
    roblox.autocomplete = 'off';
    roblox.placeholder = 'Your Roblox username';
    f.appendChild(field('Roblox username', roblox, 'The account you play Yellonia on.'));
    var answers = d.questions.map(function (q, n) {
      var t = el('textarea');
      t.rows = 3;
      t.maxLength = 1500;
      f.appendChild(field((n + 1) + '. ' + q, t));
      return t;
    });
    var msg = el('p', 'form-message');
    msg.setAttribute('role', 'status');
    f.appendChild(msg);
    var send = el('button', 'button-primary', 'Send application');
    send.type = 'submit';
    f.appendChild(send);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!/^[A-Za-z0-9_]{3,20}$/.test(roblox.value.trim())) { message(msg, 'error', 'Enter your Roblox username.'); roblox.focus(); return; }
      for (var i = 0; i < answers.length; i++) {
        if (answers[i].value.trim().length < 2) { message(msg, 'error', 'Answer question ' + (i + 1) + '.'); answers[i].focus(); return; }
      }
      send.disabled = true;
      message(msg, '', 'Sending…');
      api('submit', { department: d.key, robloxUsername: roblox.value.trim(), answers: answers.map(function (t) { return t.value.trim(); }) }).then(function (answer) {
        send.disabled = false;
        if (answer.needsLogin) { location.reload(); return; }
        if (!answer.success) { message(msg, 'error', answer.msg); return; }
        onSent();
      });
    });
    return f;
  }


  /* ---------- 5. YOUR APPLICATIONS ---------- */
  function drawMine(box, apps, onChange) {
    box.appendChild(el('h2', null, 'Your applications'));
    if (!apps.length) { box.appendChild(el('p', 'form-note', 'You haven\'t applied yet.')); return; }
    var list = el('div', 'report-list');
    apps.forEach(function (a) {
      var card = el('article', 'report-card report-' + ({ PENDING: 'new', REVIEW: 'open', ACCEPTED: 'closed', DECLINED: 'dismissed', WITHDRAWN: 'dismissed' }[a.status] || ''));
      var top = el('div', 'report-card-top');
      top.appendChild(el('span', 'report-number', a.number));
      top.appendChild(el('span', 'report-status', a.statusName));
      card.appendChild(top);
      card.appendChild(el('h3', null, a.departmentName));
      card.appendChild(el('p', 'report-meta', 'As ' + a.robloxUsername + ' · sent ' + day(a.createdAt) + (a.decidedAt ? ' · decided ' + day(a.decidedAt) : '')));
      if (a.status === 'ACCEPTED') {
        var next = el('p', 'report-outcome');
        next.appendChild(el('strong', null, 'Welcome aboard. '));
        next.appendChild(document.createTextNode('Next, '));
        next.appendChild(link('set your back-end password', '/des/setup.html', 'text-link'));
        next.appendChild(document.createTextNode('.'));
        card.appendChild(next);
      }
      if (a.publicNote) card.appendChild(el('p', 'report-note', a.publicNote));
      if (a.status === 'PENDING' || a.status === 'REVIEW') {
        var withdraw = el('button', 'button-small', 'Withdraw application');
        withdraw.type = 'button';
        var armed = false;
        withdraw.addEventListener('click', function () {
          if (!armed) { armed = true; withdraw.textContent = 'Click again to withdraw'; withdraw.classList.add('button-armed'); return; }
          withdraw.disabled = true;
          api('withdraw', { number: a.number }).then(onChange);
        });
        var row = el('p');
        row.appendChild(withdraw);
        card.appendChild(row);
      }
      list.appendChild(card);
    });
    box.appendChild(list);
  }
})();
