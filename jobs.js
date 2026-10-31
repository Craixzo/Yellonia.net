/* ==============================================================
   jobs.js - the Job Board (jobs.html)

   jobs.html                 every open listing, with search and category filters
   jobs.html#job/<id>        one listing, and the form to apply
   jobs.html#post            post a listing (officers)
   jobs.html#edit/<id>       change your listing (officers)
   jobs.html#apps/<id>       the applications to your listing (officers)
   jobs.html#mine            your applications, and your listings if you're an officer

   Officers are people with the officer role in the Yellonia Discord server
   (set in Centurion: SITE_SETTINGS.jobOfficerRoleIds). Staff count too.
   ============================================================== */
(function () {
  var S = window.SITE;
  var el = S.el;
  var root = document.getElementById('jobs-root');
  if (!root) return;

  var user = null, me = null, listings = [], categories = [];
  var filter = { category: new URLSearchParams(location.search).get('category') || '', q: '' };   /* jobs.html?category=Armed%20Forces opens filtered */

  function card(l) {
    var a = S.link('', '#job/' + encodeURIComponent(l.id), 'job-card job-cat-' + catClass(l.category));
    var top = el('div', 'job-card-top');
    top.appendChild(el('span', 'job-cat', l.category));
    if (l.applicants) top.appendChild(el('span', 'job-count', l.applicants + (l.applicants === 1 ? ' applicant' : ' applicants')));
    a.appendChild(top);
    a.appendChild(el('h3', null, l.title));
    a.appendChild(el('p', 'job-org', l.organisation));
    a.appendChild(el('p', 'job-desc', l.description));
    var foot = el('p', 'job-foot');
    foot.textContent = 'Posted by ' + l.postedName + ' · ' + (l.closesAt ? 'closes ' + S.day(l.closesAt) : 'open');
    a.appendChild(foot);
    return a;
  }
  function catClass(c) { return String(c || '').toLowerCase().replace(/[^a-z]+/g, '-'); }

  /* ---------- The board ---------- */
  function drawBoard() {
    root.textContent = '';
    var tools = el('div', 'job-tools');
    var search = el('input'); search.type = 'search'; search.placeholder = 'Search jobs'; search.value = filter.q;
    search.setAttribute('aria-label', 'Search jobs');
    tools.appendChild(search);
    var chips = el('div', 'job-chips'); chips.setAttribute('role', 'group'); chips.setAttribute('aria-label', 'Category');
    [''].concat(categories).forEach(function (c) {
      var b = el('button', 'job-chip', c || 'All');
      b.type = 'button';
      b.setAttribute('aria-pressed', filter.category === c ? 'true' : 'false');
      b.addEventListener('click', function () { filter.category = c; drawBoard(); });
      chips.appendChild(b);
    });
    tools.appendChild(chips);
    root.appendChild(tools);

    var actions = el('div', 'job-actions');
    if (me && me.isOfficer) actions.appendChild(S.link('Post a job', '#post', 'button-primary'));
    if (user) actions.appendChild(S.link(me && me.isOfficer ? 'Your listings and applications' : 'Your applications', '#mine', 'button-secondary'));
    else actions.appendChild(S.link('Log in with Discord', '/api/auth/login?next=' + encodeURIComponent('/jobs.html'), 'button-discord'));
    root.appendChild(actions);

    var grid = el('div', 'job-grid');
    root.appendChild(grid);
    function fill() {
      grid.textContent = '';
      var q = filter.q.toLowerCase();
      var shown = listings.filter(function (l) {
        if (filter.category && l.category !== filter.category) return false;
        if (!q) return true;
        return (l.title + ' ' + l.organisation + ' ' + l.description).toLowerCase().indexOf(q) !== -1;
      });
      if (!shown.length) grid.appendChild(el('p', 'form-note job-empty', listings.length ? 'No jobs match.' : 'No open jobs right now. Check back soon.'));
      shown.forEach(function (l) { grid.appendChild(card(l)); });
    }
    var t;
    search.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { filter.q = search.value.trim(); fill(); }, 150); });
    fill();
  }

  /* ---------- One listing ---------- */
  function drawListing(id) {
    root.textContent = '';
    root.appendChild(S.link('← All jobs', '#', 'text-link job-back'));
    var box = el('div'); root.appendChild(box);
    box.appendChild(el('p', 'news-loading', 'Loading…'));
    S.api('public', 'job', { id: id }).then(function (a) {
      box.textContent = '';
      if (!a.success) { box.appendChild(el('p', 'form-message form-message-error', a.msg)); return; }
      var l = a.listing;
      var layout = el('div', 'job-detail');
      var main = el('article', 'job-main');
      main.appendChild(el('span', 'job-cat', l.category));
      main.appendChild(el('h2', null, l.title));
      main.appendChild(el('p', 'job-org job-org-big', l.organisation));
      if (l.status !== 'OPEN') main.appendChild(el('p', 'report-notice', 'This listing is closed.'));
      main.appendChild(el('h3', null, 'About the job'));
      S.renderText(main, l.description);
      if (l.requirements) { main.appendChild(el('h3', null, 'Requirements')); S.renderText(main, l.requirements); }
      main.appendChild(el('p', 'job-foot', 'Posted by ' + l.postedName + ' on ' + S.day(l.createdAt) + (l.closesAt ? ' · closes ' + S.day(l.closesAt) : '')));
      layout.appendChild(main);

      var side = el('aside', 'job-apply');
      side.appendChild(el('h3', null, 'Apply'));
      if (!l.applyOnSite) {
        side.appendChild(el('p', null, 'This job doesn\'t take applications here. To apply:'));
        var how = el('div', 'job-how'); S.renderText(how, l.howToApply || ''); side.appendChild(how);
      } else if (l.yours) {
        side.appendChild(el('p', null, 'This is your listing.'));
        side.appendChild(S.link('See applications', '#apps/' + encodeURIComponent(l.id), 'button-primary'));
      } else if (!user) {
        side.appendChild(el('p', null, 'Log in with the Discord account linked to your Roblox account.'));
        side.appendChild(S.link('Log in with Discord', '/api/auth/login?next=' + encodeURIComponent('/jobs.html#job/' + l.id), 'button-discord'));
      } else if (a.application && a.application.status !== 'WITHDRAWN') {
        side.appendChild(el('p', null, 'You applied on ' + S.day(a.application.createdAt) + '.'));
        side.appendChild(el('p', 'job-status job-status-' + a.application.status.toLowerCase(), a.application.statusName));
        if (a.application.note) side.appendChild(el('p', 'report-note', a.application.note));
      } else if (l.status === 'OPEN') {
        var f = el('form', 'news-form'); f.noValidate = true;
        var msgBox = S.textarea(6, 1500, 'Why you, your experience, when you\'re usually on…');
        f.appendChild(S.field('Your message', msgBox, 'Your Roblox account (from your Discord link) is added automatically.'));
        var msg = el('p', 'form-message'); msg.setAttribute('role', 'status'); f.appendChild(msg);
        var send = el('button', 'button-primary', 'Send application'); send.type = 'submit'; f.appendChild(send);
        f.addEventListener('submit', function (e) {
          e.preventDefault();
          if (msgBox.value.trim().length < 20) { S.message(msg, 'error', 'Tell them a little about yourself (at least 20 characters).'); msgBox.focus(); return; }
          send.disabled = true; S.message(msg, '', 'Sending…');
          S.api('user', 'job-apply', { id: l.id, message: msgBox.value.trim() }).then(function (r) {
            send.disabled = false;
            if (!r.success) { S.message(msg, 'error', r.msg); return; }
            drawListing(l.id);
          });
        });
        side.appendChild(f);
      }
      if (me && me.isStaff && !l.yours) {
        var remove = S.button('Remove listing (staff)', 'button-small');
        S.confirmClick(remove, 'Click again to remove', function () {
          S.api('staff', 'job-remove', { id: l.id }).then(function (r) { if (r.success) { load().then(function () { location.hash = ''; }); } });
        });
        side.appendChild(remove);
      }
      layout.appendChild(side);
      box.appendChild(layout);
    });
  }

  /* ---------- Post or edit a listing (officers) ---------- */
  function drawPost(existing) {
    root.textContent = '';
    root.appendChild(S.link('← All jobs', '#', 'text-link job-back'));
    if (!me || !me.isOfficer) { root.appendChild(el('p', 'report-notice', 'Only officers can post jobs. Officers are set by a role in the Yellonia Discord server.')); return; }
    root.appendChild(el('h2', 'job-form-title', existing ? 'Edit listing' : 'Post a job'));
    var f = el('form', 'news-form job-form'); f.noValidate = true;
    var title = S.input(80, 'e.g. Helicopter Pilot'); f.appendChild(S.field('Job title', title));
    var org = S.input(80, 'e.g. 1st Air Wing'); f.appendChild(S.field('Who is hiring', org, 'Your unit, department, ministry or corporation.'));
    var cat = S.select(categories, 'Pick a category'); f.appendChild(S.field('Category', cat));
    var desc = S.textarea(7, 3000); f.appendChild(S.field('About the job', desc, 'What they\'ll do. Blank lines start new paragraphs; start a line with "- " for a list.'));
    var req = S.textarea(4, 1500); f.appendChild(S.field('Requirements (optional)', req));
    var onSite = el('input'); onSite.type = 'checkbox'; onSite.checked = true;
    var check = el('label', 'check'); check.appendChild(onSite); check.appendChild(el('span', null, 'Take applications on this page'));
    f.appendChild(check);
    var how = S.textarea(3, 500, 'e.g. DM SgtSmith on Discord, or join the hangar at 7pm EST'); var howField = S.field('How to apply', how);
    f.appendChild(howField);
    var days = S.select([['7', '7 days'], ['14', '14 days'], ['30', '30 days'], ['60', '60 days'], ['90', '90 days']]); days.value = '30';
    f.appendChild(S.field('Keep it open for', days));
    function sync() { howField.hidden = onSite.checked; }
    onSite.addEventListener('change', sync);
    if (existing) {
      title.value = existing.title; org.value = existing.organisation; cat.value = existing.category; desc.value = existing.description;
      req.value = existing.requirements || ''; onSite.checked = existing.applyOnSite; how.value = existing.howToApply || '';
    }
    sync();
    var msg = el('p', 'form-message'); msg.setAttribute('role', 'status'); f.appendChild(msg);
    var send = el('button', 'button-primary', existing ? 'Save changes' : 'Post job'); send.type = 'submit'; f.appendChild(send);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      send.disabled = true; S.message(msg, '', 'Saving…');
      var data = { title: title.value.trim(), organisation: org.value.trim(), category: cat.value, description: desc.value.trim(), requirements: req.value.trim(), applyOnSite: onSite.checked, howToApply: how.value.trim(), days: Number(days.value) };
      if (existing) data.id = existing.id;
      S.api('user', existing ? 'job-update' : 'job-post', data).then(function (r) {
        send.disabled = false;
        if (!r.success) { S.message(msg, 'error', r.msg); return; }
        load().then(function () { location.hash = '#job/' + (existing ? existing.id : r.id); });
      });
    });
    root.appendChild(f);
  }

  /* ---------- Applications to one listing (officers) ---------- */
  function drawApps(id) {
    root.textContent = '';
    root.appendChild(S.link('← Your listings', '#mine', 'text-link job-back'));
    var box = el('div'); root.appendChild(box);
    S.api('user', 'job-apps', { id: id }).then(function (a) {
      if (!a.success) { box.appendChild(el('p', 'form-message form-message-error', a.msg)); return; }
      box.appendChild(el('h2', 'job-form-title', 'Applications: ' + a.listing.title));
      if (!a.applications.length) { box.appendChild(el('p', 'form-note', 'No applications yet.')); return; }
      var list = el('div', 'job-app-list');
      a.applications.forEach(function (app) {
        var c = el('article', 'job-app job-app-' + app.status.toLowerCase());
        var top = el('div', 'job-app-top');
        var who = S.link(app.robloxUsername, 'https://www.roblox.com/users/' + encodeURIComponent(app.robloxUserId) + '/profile', 'job-app-name');
        who.target = '_blank'; who.rel = 'noopener noreferrer';
        top.appendChild(who);
        top.appendChild(el('span', 'job-status job-status-' + app.status.toLowerCase(), app.statusName));
        c.appendChild(top);
        c.appendChild(el('p', 'job-foot', 'Discord: ' + app.discordName + ' · applied ' + S.day(app.createdAt)));
        var body = el('div', 'job-app-body'); S.renderText(body, app.message); c.appendChild(body);
        if (app.status === 'PENDING') {
          var note = S.textarea(2, 800, 'Message to them (optional): next steps, or why not'); c.appendChild(note);
          var row = el('div', 'job-app-buttons');
          var yes = S.button('Accept'), no = S.button('Decline', 'button-secondary');
          var msg = el('p', 'form-message');
          function decide(accept) {
            yes.disabled = no.disabled = true;
            S.api('user', 'job-decide', { applicationId: app.id, accept: accept, note: note.value.trim() }).then(function (r) {
              if (!r.success) { yes.disabled = no.disabled = false; S.message(msg, 'error', r.msg); return; }
              drawApps(id);
            });
          }
          yes.addEventListener('click', function () { decide(true); });
          no.addEventListener('click', function () { decide(false); });
          row.appendChild(yes); row.appendChild(no); c.appendChild(row); c.appendChild(msg);
        } else if (app.note) c.appendChild(el('p', 'report-note', app.note));
        list.appendChild(c);
      });
      box.appendChild(list);
    });
  }

  /* ---------- Your applications / your listings ---------- */
  function drawMine() {
    root.textContent = '';
    root.appendChild(S.link('← All jobs', '#', 'text-link job-back'));
    if (!user) { root.appendChild(S.loginCard('Log in to see your applications', 'Applications are tied to your Discord account.')); return; }
    S.api('user', 'jobs-me').then(function (a) {
      if (!a.success) { root.appendChild(el('p', 'form-message form-message-error', a.msg)); return; }
      me = a;
      if (a.isOfficer) {
        var h = el('div', 'job-section-head');
        h.appendChild(el('h2', null, 'Your listings'));
        h.appendChild(S.link('Post a job', '#post', 'button-primary'));
        root.appendChild(h);
        if (!a.listings.length) root.appendChild(el('p', 'form-note', 'You haven\'t posted anything yet.'));
        a.listings.forEach(function (l) {
          var row = el('div', 'job-row');
          var info = el('div');
          info.appendChild(S.link(l.title, '#job/' + encodeURIComponent(l.id), 'job-row-title'));
          info.appendChild(el('p', 'job-foot', l.organisation + ' · ' + l.statusName + (l.waiting ? ' · ' + l.waiting + ' waiting' : '')));
          row.appendChild(info);
          var btns = el('div', 'job-row-buttons');
          if (l.applyOnSite) btns.appendChild(S.link('Applications' + (l.waiting ? ' (' + l.waiting + ')' : ''), '#apps/' + encodeURIComponent(l.id), 'button-small'));
          btns.appendChild(S.link('Edit', '#edit/' + encodeURIComponent(l.id), 'button-small'));
          if (l.status === 'OPEN') {
            var close = S.button('Close', 'button-small');
            S.confirmClick(close, 'Click again to close', function () { S.api('user', 'job-close', { id: l.id }).then(function () { load().then(drawMine); }); });
            btns.appendChild(close);
          }
          row.appendChild(btns);
          root.appendChild(row);
        });
      }
      root.appendChild(el('h2', 'job-section-head-plain', 'Your applications'));
      if (!a.applications.length) root.appendChild(el('p', 'form-note', 'You haven\'t applied to anything yet.'));
      a.applications.forEach(function (app) {
        var row = el('div', 'job-row');
        var info = el('div');
        if (app.listing) info.appendChild(S.link(app.listing.title, '#job/' + encodeURIComponent(app.listing.id), 'job-row-title'));
        info.appendChild(el('p', 'job-foot', (app.listing ? app.listing.organisation + ' · ' : '') + 'applied ' + S.day(app.createdAt)));
        if (app.note) info.appendChild(el('p', 'report-note', app.note));
        row.appendChild(info);
        var right = el('div', 'job-row-buttons');
        right.appendChild(el('span', 'job-status job-status-' + app.status.toLowerCase(), app.statusName));
        if (app.status === 'PENDING') {
          var w = S.button('Withdraw', 'button-small');
          S.confirmClick(w, 'Click again', function () { S.api('user', 'job-withdraw', { applicationId: app.id }).then(drawMine); });
          right.appendChild(w);
        }
        row.appendChild(right);
        root.appendChild(row);
      });
    });
  }

  /* ---------- Routing ---------- */
  function route() {
    var h = location.hash.slice(1);
    var m;
    window.scrollTo(0, document.getElementById('jobs-top').offsetTop - 80);
    if ((m = h.match(/^job\/(.+)$/))) return drawListing(decodeURIComponent(m[1]));
    if ((m = h.match(/^apps\/(.+)$/))) return drawApps(decodeURIComponent(m[1]));
    if ((m = h.match(/^edit\/(.+)$/))) {
      return S.api('public', 'job', { id: decodeURIComponent(m[1]) }).then(function (a) { if (a.success) drawPost(a.listing); else drawBoard(); });
    }
    if (h === 'post') return drawPost(null);
    if (h === 'mine') return drawMine();
    drawBoard();
  }

  function load() {
    return S.api('public', 'jobs').then(function (a) {
      if (!a.success) { listings = null; root.textContent = ''; root.appendChild(el('p', 'form-message form-message-error', a.msg)); return; }
      listings = a.listings; categories = a.categories;
      var stat = document.getElementById('jobs-count');
      if (stat) stat.textContent = listings.length + (listings.length === 1 ? ' open job' : ' open jobs');
    });
  }

  S.user().then(function (u) {
    user = u;
    return Promise.all([load(), u ? S.api('user', 'jobs-me').then(function (a) { if (a.success) me = a; }) : null]);
  }).then(function () {
    if (listings) route();
    window.addEventListener('hashchange', route);
  });
})();
