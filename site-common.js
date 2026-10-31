/* ==============================================================
   site-common.js - shared by jobs.html, documents.html, document.html,
   constitution.html, contact.html and staff.html

   SITE.api(scope, action, data)  talks to /api/site (see api/_routes/site.js)
   SITE.user()                    the Discord login, or null
   SITE.renderText(box, text)     turns a document's text into headings, lists and paragraphs
   SITE.el / link / field / message / day / when   small helpers
   ============================================================== */
(function () {
  var SITE = {};

  SITE.el = function (tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  };
  SITE.link = function (text, href, className) { var a = SITE.el('a', className, text); a.href = href; return a; };
  SITE.message = function (target, kind, text) {
    target.textContent = text || '';
    target.className = 'form-message' + (kind ? ' form-message-' + kind : '');
  };
  SITE.field = function (labelText, input, hint) {
    var wrap = SITE.el('label', 'field');
    wrap.appendChild(SITE.el('span', 'field-label', labelText));
    wrap.appendChild(input);
    if (hint) wrap.appendChild(SITE.el('span', 'field-hint', hint));
    return wrap;
  };
  SITE.input = function (max, placeholder) {
    var i = SITE.el('input'); i.type = 'text'; i.maxLength = max; if (placeholder) i.placeholder = placeholder; return i;
  };
  SITE.textarea = function (rows, max, placeholder) {
    var t = SITE.el('textarea'); t.rows = rows; t.maxLength = max; if (placeholder) t.placeholder = placeholder; return t;
  };
  SITE.select = function (options, first) {
    var s = SITE.el('select');
    if (first) { var o0 = SITE.el('option', null, first); o0.value = ''; s.appendChild(o0); }
    options.forEach(function (x) { var o = SITE.el('option', null, Array.isArray(x) ? x[1] : x); o.value = Array.isArray(x) ? x[0] : x; s.appendChild(o); });
    return s;
  };
  SITE.button = function (text, className) { var b = SITE.el('button', className || 'button-primary', text); b.type = 'button'; return b; };
  SITE.day = function (value) { return value ? new Date(value).toISOString().slice(0, 10) : ''; };
  SITE.when = function (value) {
    if (!value) return '';
    var d = new Date(value);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };
  /* "Click again to confirm" buttons, for anything that can't be undone */
  SITE.confirmClick = function (button, armedText, run) {
    var armed = false, original = button.textContent;
    button.addEventListener('click', function () {
      if (!armed) {
        armed = true; button.textContent = armedText; button.classList.add('button-armed');
        setTimeout(function () { armed = false; button.textContent = original; button.classList.remove('button-armed'); }, 4000);
        return;
      }
      run();
    });
  };

  SITE.api = function (scope, action, data) {
    return fetch('/api/site', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(Object.assign({ scope: scope, action: action }, data || {})),
    }).then(function (reply) {
      return reply.json().catch(function () { return { success: false, msg: 'Something went wrong. Please try again.' }; });
    }).catch(function () {
      return { success: false, msg: 'Couldn\'t reach the site. Check your connection and try again.' };
    });
  };

  var userPromise = null;
  SITE.user = function () {
    if (!userPromise) {
      userPromise = fetch('/api/auth/me', { credentials: 'same-origin' })
        .then(function (r) { return r.json(); })
        .then(function (a) { return a.user || null; })
        .catch(function () { return null; });
    }
    return userPromise;
  };

  SITE.loginCard = function (title, text) {
    var card = SITE.el('div', 'login-card');
    card.appendChild(SITE.el('h2', null, title));
    card.appendChild(SITE.el('p', null, text));
    card.appendChild(SITE.link('Log in with Discord', '/api/auth/login?next=' + encodeURIComponent(location.pathname + location.search + location.hash), 'button-discord'));
    card.appendChild(SITE.el('p', 'login-small', 'We only see your Discord name, ID and avatar.'));
    return card;
  };

  SITE.accountBar = function (user) {
    var bar = SITE.el('div', 'account-bar');
    if (user.avatar) { var pic = SITE.el('img', 'account-avatar'); pic.src = user.avatar; pic.alt = ''; bar.appendChild(pic); }
    var who = SITE.el('span', null, 'Logged in as ');
    who.appendChild(SITE.el('strong', null, user.name));
    bar.appendChild(who);
    bar.appendChild(SITE.link('Log out', '/api/auth/logout', 'account-logout'));
    return bar;
  };

  /* ---------- Document text ----------
     ## Heading         a heading (also listed in the contents)
     ### Sub-heading    a smaller heading
     - item / 1. item   bulleted / numbered lists
     **bold**           bold
     anything else      paragraphs (a blank line starts a new one)
     Returns the list of ## headings as [{ id, text }] for a contents list. */
  function inline(parent, text) {
    var parts = text.split(/(\*\*[^*]+\*\*)/);
    parts.forEach(function (part) {
      if (/^\*\*[^*]+\*\*$/.test(part)) parent.appendChild(SITE.el('strong', null, part.slice(2, -2)));
      else if (part) parent.appendChild(document.createTextNode(part));
    });
  }
  function slug(text, used) {
    var base = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'section';
    var id = base, n = 2;
    while (used[id]) id = base + '-' + (n++);
    used[id] = true;
    return id;
  }
  SITE.renderText = function (box, text) {
    var headings = [], used = {};
    var lines = String(text || '').replace(/\r/g, '').split('\n');
    var para = [], list = null, listType = null;
    function flushPara() {
      if (!para.length) return;
      var p = SITE.el('p'); inline(p, para.join(' ')); box.appendChild(p); para = [];
    }
    function flushList() { list = null; listType = null; }
    lines.forEach(function (raw) {
      var line = raw.trim();
      var m;
      if (!line) { flushPara(); flushList(); return; }
      if ((m = line.match(/^(#{2,3})\s+(.+)$/))) {
        flushPara(); flushList();
        var level = m[1].length;
        var h = SITE.el(level === 2 ? 'h2' : 'h3', 'doc-h' + level);
        inline(h, m[2]);
        if (level === 2) { h.id = slug(m[2], used); headings.push({ id: h.id, text: h.textContent }); }
        box.appendChild(h);
        return;
      }
      if ((m = line.match(/^(-|\*|\d+\.)\s+(.+)$/))) {
        flushPara();
        var type = /\d/.test(m[1]) ? 'ol' : 'ul';
        if (!list || listType !== type) { list = SITE.el(type, 'doc-list'); listType = type; box.appendChild(list); }
        var li = SITE.el('li'); inline(li, m[2]); list.appendChild(li);
        return;
      }
      flushList();
      para.push(line);
    });
    flushPara();
    return headings;
  };

  /* ---------- Modmail: the messages of a conversation, and the reply box (contact.html, staff.html) ---------- */
  function messagesView(messages) {
    var list = SITE.el('ol', 'mm-messages');
    messages.forEach(function (m) {
      var li = SITE.el('li', 'mm-msg ' + (m.internal ? 'mm-msg-note' : m.fromStaff ? 'mm-msg-staff' : 'mm-msg-person'));
      var meta = SITE.el('p', 'mm-msg-meta');
      meta.textContent = (m.internal ? 'Internal note · ' : '') + m.authorName + ' · ' + SITE.when(m.createdAt) + (m.source === 'DISCORD' ? ' · via Discord' : '');
      li.appendChild(meta);
      var body = SITE.el('div', 'mm-msg-body'); body.textContent = m.body; li.appendChild(body);
      list.appendChild(li);
    });
    return list;
  }
  function replyForm(send, done, label, withNote) {
    var f = SITE.el('form', 'news-form mm-reply'); f.noValidate = true;
    var body = SITE.textarea(4, 3000, 'Write a reply…'); body.setAttribute('aria-label', 'Reply');
    f.appendChild(body);
    var note = null;
    if (withNote) {
      note = SITE.el('input'); note.type = 'checkbox';
      var check = SITE.el('label', 'check'); check.appendChild(note); check.appendChild(SITE.el('span', null, 'Internal note (staff only, not sent)'));
      f.appendChild(check);
    }
    var msg = SITE.el('p', 'form-message'); msg.setAttribute('role', 'status'); f.appendChild(msg);
    var go = SITE.el('button', 'button-primary', label); go.type = 'submit'; f.appendChild(go);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!body.value.trim()) { body.focus(); return; }
      go.disabled = true;
      send(body.value.trim(), note ? note.checked : false).then(function (a) {
        go.disabled = false;
        if (!a.success) { SITE.message(msg, 'error', a.msg); return; }
        done(a);
      });
    });
    return f;
  }
  SITE.modmailMessages = messagesView;
  SITE.modmailReply = replyForm;

  window.SITE = SITE;
})();
