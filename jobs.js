/* ==============================================================
   jobs.js - the Job Board (jobs.html)

   jobs.html                 where to serve, open listings, recruitment posters, follow an application
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

  /* ---------- SETTINGS: "Where do you want to serve?" ----------
     One card per place people can serve. A listing counts for a card when its
     category matches, and (if words are given) its organisation contains one of them.
       emblem: a picture (e.g. 'images/emblems/army.png'). Without one, the card
               shows a badge with the letters in "badge", in the card's color. */
  var SERVICES = [
    { name: 'Government',      color: '#bed215', badge: 'GOV', emblem: 'images/TYEcoatofarms.png', category: 'Government' },
    { name: 'Army',            color: '#5bbf49', badge: 'A',   category: 'Armed Forces', words: ['army', 'infantry', 'armored', 'armoured'] },
    { name: 'Special Forces',  color: '#bed215', badge: 'SF',  category: 'Armed Forces', words: ['special', 'ceres'] },
    { name: 'Navy',            color: '#369cd3', badge: 'N',   category: 'Armed Forces', words: ['navy', 'naval', 'fleet', 'marine'] },
    { name: 'Air Force',       color: '#8fd0f0', badge: 'AF',  category: 'Armed Forces', words: ['air', 'helicopter', 'wing', 'squadron'] },
    { name: 'Military Police', color: '#c3c9d1', badge: 'MP',  category: 'Armed Forces', words: ['military police', 'ceremonial', 'guard'] },
    { name: 'Police',          color: '#369cd3', badge: 'PD',  category: 'Emergency Services', words: ['police'] },
    { name: 'Fire',            color: '#e8a33d', badge: 'FD',  category: 'Emergency Services', words: ['fire'] },
    { name: 'Parks & Wildlife',color: '#5bbf49', badge: 'PW',  category: 'Emergency Services', words: ['park', 'wildlife', 'ranger'] },
    { name: 'Corporations',    color: '#e8a33d', badge: 'CO',  category: 'Corporations' },
    { name: 'Media',           color: '#d9534f', badge: 'M',   category: 'Media' },
    { name: 'Other',           color: '#949ba4', badge: '+',   category: 'Other' },
  ];

  /* ---------- SETTINGS: "Answer the call" posters ----------
     image:    the background (a screenshot works best; put them in images/posters/)
     position: which part of the image to show ('center', 'left top', '30% 70%'...)
     tint:     a color laid over the image
     kicker / title / sub: the small line, the big words, the line under them
     footer:   the small text at the bottom
     service:  clicking the poster shows that card's jobs (a name from SERVICES above) */
  var POSTERS = [
    { image: 'images/yeloria.png', position: '20% 60%', tint: '#5bbf49', kicker: 'Boots on the ground', title: 'Hold the line', footer: 'Join the Army', service: 'Army', color: '#ffffff' },
    { image: 'images/yeloria.png', position: '85% 30%', tint: '#369cd3', kicker: 'Run towards danger', title: 'Yellonia Police', sub: 'is recruiting', footer: 'Join the Police', service: 'Police', color: '#8fd0f0' },
    { image: 'images/yeloria.png', position: '50% 90%', tint: '#1d3b5c', kicker: 'From the water, without a trace', title: 'Marine Division', sub: 'The sea needs you', footer: 'Volunteer', service: 'Navy', color: '#ffffff' },
    { image: 'images/yeloria.png', position: '60% 20%', tint: '#7a5a1c', kicker: 'Every street. Every stone.', title: 'Defend Yeloria', footer: 'Enlist today', service: 'Military Police', color: '#f3c98a' },
    { image: 'images/yeloria.png', position: '10% 10%', tint: '#2a2c30', kicker: 'You won\'t see our faces.', title: 'You\'ll see our results', footer: 'Special Forces · Apply', service: 'Special Forces', color: '#dbdee1' },
    { image: 'images/yeloria.png', position: '95% 70%', tint: '#26485e', kicker: 'Learn to fly', title: 'Take the skies', footer: 'Join the Air Force', service: 'Air Force', color: '#ffffff' },
    { image: 'images/yeloria.png', position: '40% 40%', tint: '#5c2a1c', kicker: 'When it burns', title: 'We answer', footer: 'Join the Fire Department', service: 'Fire', color: '#f3c98a' },
    { image: 'images/yeloria.png', position: '70% 55%', tint: '#4a5200', kicker: 'Serve the Empire', title: 'Guard the Palace', footer: 'Government service', service: 'Government', color: '#e2ea9a' },
  ];

  var user = null, me = null, listings = [], categories = [];
  var filter = { category: new URLSearchParams(location.search).get('category') || '', service: new URLSearchParams(location.search).get('service') || '', q: '' };

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
  function serviceOf(name) { for (var i = 0; i < SERVICES.length; i++) if (SERVICES[i].name === name) return SERVICES[i]; return null; }
  function inService(l, sv) {
    if (sv.category && l.category !== sv.category) return false;
    if (!sv.words) return true;
    var org = (l.organisation + ' ' + l.title).toLowerCase();
    return sv.words.some(function (w) { return org.indexOf(w) !== -1; });
  }
  function emblem(sv, className) {
    var wrap = el('span', className);
    wrap.style.setProperty('--svc', sv.color);
    if (sv.emblem) { var img = el('img'); img.src = sv.emblem; img.alt = ''; img.loading = 'lazy'; wrap.appendChild(img); }
    else { wrap.classList.add('svc-badge'); wrap.appendChild(el('span', null, sv.badge || sv.name.charAt(0))); }
    return wrap;
  }
  function head(kicker, title, text) {
    var h = el('header', 'jb-head');
    if (kicker) h.appendChild(el('p', 'gov-kicker', kicker));
    h.appendChild(el('h2', null, title));
    if (text) h.appendChild(el('p', 'jb-head-text', text));
    return h;
  }

  function drawBoard() {
    root.textContent = '';

    /* Officer / account buttons */
    var actions = el('div', 'job-actions jb-actions');
    if (me && me.isOfficer) actions.appendChild(S.link('Post a job', '#post', 'button-primary'));
    if (user) actions.appendChild(S.link(me && me.isOfficer ? 'Your listings and applications' : 'Your applications', '#mine', 'button-secondary'));
    else actions.appendChild(S.link('Log in with Discord', '/api/auth/login?next=' + encodeURIComponent('/jobs.html'), 'button-discord'));

    /* 1. Where do you want to serve? */
    var serve = el('section', 'jb-section');
    var serveHead = head('Job Board', 'Where do you want to serve?', null);
    serveHead.appendChild(actions);
    serve.appendChild(serveHead);
    var cards = el('div', 'svc-grid');
    SERVICES.forEach(function (sv) {
      var n = listings.filter(function (l) { return inService(l, sv); }).length;
      var c = el('button', 'svc-card' + (n ? ' svc-card-open' : '')); c.type = 'button';
      c.style.setProperty('--svc', sv.color);
      c.setAttribute('aria-pressed', filter.service === sv.name ? 'true' : 'false');
      c.appendChild(emblem(sv, 'svc-emblem'));
      c.appendChild(el('strong', null, sv.name));
      c.appendChild(el('span', 'svc-count', n ? n + (n === 1 ? ' opening' : ' openings') : 'No openings yet'));
      c.addEventListener('click', function () {
        filter.service = filter.service === sv.name ? '' : sv.name;
        Array.prototype.forEach.call(cards.children, function (x) { x.setAttribute('aria-pressed', 'false'); });
        if (filter.service) c.setAttribute('aria-pressed', 'true');
        fill();
        if (filter.service) openings.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      cards.appendChild(c);
    });
    serve.appendChild(cards);
    root.appendChild(serve);

    /* 2. Open positions */
    var openings = el('section', 'jb-section jb-openings'); openings.id = 'openings';
    var oh = head(null, 'Open positions', null);
    var tools = el('div', 'jb-tools');
    var search = el('input'); search.type = 'search'; search.placeholder = 'Search jobs'; search.value = filter.q;
    search.setAttribute('aria-label', 'Search jobs');
    tools.appendChild(search);
    var showing = el('div', 'jb-showing');
    tools.appendChild(showing);
    oh.appendChild(tools);
    openings.appendChild(oh);
    var grid = el('div', 'job-grid');
    openings.appendChild(grid);
    root.appendChild(openings);

    function fill() {
      grid.textContent = ''; showing.textContent = '';
      var sv = serviceOf(filter.service);
      var label = sv ? sv.name : filter.category;
      if (label) {
        var pill = el('button', 'jb-pill', 'Showing: ' + label + '  ✕'); pill.type = 'button';
        pill.setAttribute('aria-label', 'Show all jobs');
        pill.addEventListener('click', function () {
          filter.service = ''; filter.category = '';
          Array.prototype.forEach.call(cards.children, function (x) { x.setAttribute('aria-pressed', 'false'); });
          fill();
        });
        showing.appendChild(pill);
      }
      var q = filter.q.toLowerCase();
      var shown = listings.filter(function (l) {
        if (sv && !inService(l, sv)) return false;
        if (!sv && filter.category && l.category !== filter.category) return false;
        if (!q) return true;
        return (l.title + ' ' + l.organisation + ' ' + l.description).toLowerCase().indexOf(q) !== -1;
      });
      if (!shown.length) {
        grid.appendChild(el('p', 'jb-empty', listings.length
          ? (label ? 'No open positions in ' + label + ' right now. Check back soon.' : 'No jobs match your search.')
          : 'There are no open positions right now. Check back soon.'));
      }
      shown.forEach(function (l) { grid.appendChild(card(l)); });
    }
    var t;
    search.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { filter.q = search.value.trim(); fill(); }, 150); });
    fill();

    /* 3. Answer the call */
    var call = el('section', 'jb-section jb-call');
    call.appendChild(head(null, 'Answer the call', null));
    var posters = el('div', 'poster-grid');
    POSTERS.forEach(function (p) {
      var sv = serviceOf(p.service) || {};
      var a = el('button', 'poster'); a.type = 'button';
      a.style.setProperty('--tint', p.tint || '#111214');
      a.style.setProperty('--poster-color', p.color || '#ffffff');
      var bg = el('span', 'poster-bg'); bg.style.backgroundImage = 'url("' + p.image + '")'; bg.style.backgroundPosition = p.position || 'center';
      a.appendChild(bg);
      var text = el('span', 'poster-text');
      if (p.kicker) text.appendChild(el('span', 'poster-kicker', p.kicker));
      text.appendChild(el('span', 'poster-title', p.title));
      if (p.sub) text.appendChild(el('span', 'poster-sub', p.sub));
      a.appendChild(text);
      var foot = el('span', 'poster-foot');
      var arms = el('img'); arms.src = sv.emblem || 'images/TYEcoatofarms.png'; arms.alt = ''; foot.appendChild(arms);
      foot.appendChild(el('span', null, (p.footer || '') + ' · yellonia.net/jobs'));
      a.appendChild(foot);
      a.setAttribute('aria-label', (p.kicker ? p.kicker + ' ' : '') + p.title + '. Show ' + (p.service || 'all') + ' jobs');
      a.addEventListener('click', function () {
        filter.service = p.service || '';
        Array.prototype.forEach.call(cards.children, function (x, i) { x.setAttribute('aria-pressed', SERVICES[i].name === filter.service ? 'true' : 'false'); });
        fill();
        openings.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      posters.appendChild(a);
    });
    call.appendChild(posters);
    root.appendChild(call);

    /* 4. Follow an application */
    var track = el('section', 'jb-section jb-track');
    var box = el('div', 'track-box');
    box.appendChild(el('h2', null, 'Follow an application'));
    box.appendChild(el('p', 'jb-head-text', 'Enter the application number you received.'));
    var f = el('form', 'track-form'); f.noValidate = true;
    var num = el('input'); num.type = 'text'; num.placeholder = 'JOB-XXXXXXXX'; num.maxLength = 12; num.autocomplete = 'off';
    num.setAttribute('aria-label', 'Application number'); num.spellcheck = false;
    var go = el('button', 'button-primary track-go'); go.type = 'submit';
    go.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><span>Check</span>';
    f.appendChild(num); f.appendChild(go);
    box.appendChild(f);
    var result = el('div', 'track-result'); result.setAttribute('role', 'status');
    box.appendChild(result);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = num.value.trim().toUpperCase();
      if (!v) { num.focus(); return; }
      go.disabled = true; result.textContent = ''; result.appendChild(el('p', 'news-loading', 'Checking…'));
      S.api('public', 'job-track', { number: v }).then(function (r) {
        go.disabled = false; result.textContent = '';
        if (!r.success) { result.appendChild(el('p', 'form-message form-message-error', r.msg)); return; }
        var app = r.application;
        var card = el('div', 'track-card');
        var top = el('div', 'track-card-top');
        top.appendChild(el('span', 'report-number', app.number));
        top.appendChild(el('span', 'job-status job-status-' + app.status.toLowerCase(), app.statusName));
        card.appendChild(top);
        card.appendChild(el('strong', null, app.title));
        if (app.organisation) card.appendChild(el('span', 'job-org', app.organisation));
        card.appendChild(el('p', 'job-foot', 'Applied ' + S.day(app.createdAt) + (app.decidedAt ? ' · decided ' + S.day(app.decidedAt) : '')));
        result.appendChild(card);
      });
    });
    track.appendChild(box);
    root.appendChild(track);
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

      /* Share: yellonia.net/jobs/<id> shows the job's details as an embed in Discord */
      var shareUrl = location.origin + '/jobs/' + encodeURIComponent(l.id);
      var share = el('div', 'job-share');
      var copy = S.button('Copy link to share', 'button-secondary job-share-button');
      var copied = el('span', 'job-share-note', 'Paste it in Discord to show the job as an embed.');
      copy.addEventListener('click', function () {
        function done() { copy.textContent = 'Link copied'; setTimeout(function () { copy.textContent = 'Copy link to share'; }, 2500); }
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(shareUrl).then(done, function () { window.prompt('Copy this link:', shareUrl); });
        else window.prompt('Copy this link:', shareUrl);
      });
      share.appendChild(copy); share.appendChild(copied);
      main.appendChild(share);
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
        side.appendChild(el('p', null, 'You applied on ' + S.day(a.application.createdAt) + '. Application number: '));
        side.appendChild(el('p', 'report-number job-app-number', a.application.number));
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
        info.appendChild(el('p', 'job-foot', app.number + ' · ' + (app.listing ? app.listing.organisation + ' · ' : '') + 'applied ' + S.day(app.createdAt)));
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
