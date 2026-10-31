/* ==============================================================
   staff.js - the Staff Area (staff.html)

   Staff log in with Discord. Centurion checks their roles in the
   Yellonia Discord server (SITE_SETTINGS.staffRoleIds and adminRoleIds),
   so adding or removing someone is just giving or taking the role.

   #overview              counts and recent activity
   #modmail               open conversations (or closed / all)
   #modmail/<id>          one conversation: reply, internal note, close
   #documents             official documents, published and drafts
   #documents/new         write a new document (site admins)
   #documents/<slug>      edit one (site admins)
   #activity              everything staff did in this area
   ============================================================== */
(function () {
  var S = window.SITE;
  var el = S.el;
  var root = document.getElementById('staff-root');
  if (!root) return;

  var user = null, overview = null;
  var TABS = [['overview', 'Overview'], ['modmail', 'Modmail'], ['documents', 'Documents'], ['activity', 'Activity']];

  function shell(active) {
    root.textContent = '';
    var head = el('div', 'staff-head');
    var who = el('div');
    who.appendChild(el('p', 'staff-kicker', 'Staff Area'));
    who.appendChild(el('h1', null, 'Welcome, ' + overview.you.name));
    head.appendChild(who);
    head.appendChild(el('span', 'staff-badge', overview.you.isAdmin ? 'Site admin' : 'Staff'));
    root.appendChild(head);

    var nav = el('nav', 'staff-tabs'); nav.setAttribute('aria-label', 'Staff sections');
    TABS.forEach(function (t) {
      var a = S.link(t[1], '#' + t[0], 'staff-tab');
      if (t[0] === active) a.setAttribute('aria-current', 'page');
      if (t[0] === 'modmail' && overview.counts.modmailWaiting) a.appendChild(el('span', 'staff-count', String(overview.counts.modmailWaiting)));
      nav.appendChild(a);
    });
    root.appendChild(nav);
    var body = el('div', 'staff-body');
    root.appendChild(body);
    return body;
  }

  function activityList(items) {
    var ol = el('ol', 'staff-activity');
    if (!items.length) ol.appendChild(el('li', 'form-note', 'Nothing yet.'));
    items.forEach(function (a) {
      var li = el('li');
      li.appendChild(el('strong', null, a.actorName));
      li.appendChild(document.createTextNode(' ' + a.action.toLowerCase() + (a.detail ? ': ' + a.detail : '')));
      li.appendChild(el('span', 'job-foot', S.when(a.createdAt)));
      ol.appendChild(li);
    });
    return ol;
  }

  /* ---------- Overview ---------- */
  function drawOverview() {
    var body = shell('overview');
    var tiles = el('div', 'staff-tiles');
    [['Modmail waiting', overview.counts.modmailWaiting, '#modmail'], ['Open jobs', overview.counts.openJobs, 'jobs.html'], ['Draft documents', overview.counts.draftDocuments, '#documents']].forEach(function (t) {
      var a = S.link('', t[2], 'staff-tile');
      a.appendChild(el('strong', null, String(t[1])));
      a.appendChild(el('span', null, t[0]));
      tiles.appendChild(a);
    });
    body.appendChild(tiles);
    var quick = el('div', 'staff-quick');
    quick.appendChild(el('h2', null, 'Quick links'));
    var links = el('ul', 'staff-links');
    [['Job board', 'jobs.html'], ['Official documents', 'documents.html'], ['The Constitution', 'constitution.html'], ['Contact page', 'contact.html'], ['Brand kit', 'brand.html']].forEach(function (l) {
      var li = el('li'); li.appendChild(S.link(l[0], l[1], 'text-link')); links.appendChild(li);
    });
    quick.appendChild(links);
    body.appendChild(quick);
    body.appendChild(el('h2', null, 'Recent activity'));
    body.appendChild(activityList(overview.audit.slice(0, 10)));
  }

  function drawActivity() {
    var body = shell('activity');
    body.appendChild(el('h2', null, 'Activity'));
    body.appendChild(activityList(overview.audit));
  }

  /* ---------- Modmail ---------- */
  var mmFilter = 'open';
  function drawInbox() {
    var body = shell('modmail');
    var bar = el('div', 'job-chips');
    [['open', 'Open'], ['closed', 'Closed'], ['all', 'All']].forEach(function (f) {
      var b = el('button', 'job-chip', f[1]); b.type = 'button';
      b.setAttribute('aria-pressed', mmFilter === f[0] ? 'true' : 'false');
      b.addEventListener('click', function () { mmFilter = f[0]; drawInbox(); });
      bar.appendChild(b);
    });
    body.appendChild(bar);
    var list = el('div', 'mm-inbox'); list.appendChild(el('p', 'news-loading', 'Loading…'));
    body.appendChild(list);
    S.api('staff', 'modmail-inbox', { filter: mmFilter }).then(function (a) {
      list.textContent = '';
      if (!a.success) { list.appendChild(el('p', 'form-message form-message-error', a.msg)); return; }
      if (!a.threads.length) { list.appendChild(el('p', 'form-note', 'No conversations here.')); return; }
      a.threads.forEach(function (t) {
        var row = S.link('', '#modmail/' + encodeURIComponent(t.id), 'mm-row' + (t.waiting ? ' mm-row-new' : ''));
        var top = el('span', 'mm-row-top');
        top.appendChild(el('span', 'report-number', t.number));
        top.appendChild(el('span', 'mm-status mm-status-' + t.status.toLowerCase(), t.status === 'OPEN' ? (t.waiting ? 'Needs a reply' : 'Replied') : 'Closed'));
        row.appendChild(top);
        row.appendChild(el('strong', null, t.subject));
        row.appendChild(el('span', 'job-foot', t.discordName + ' · updated ' + S.when(t.updatedAt)));
        list.appendChild(row);
      });
    });
  }

  function drawConversation(id) {
    var body = shell('modmail');
    body.appendChild(S.link('← Inbox', '#modmail', 'text-link job-back'));
    var box = el('div'); body.appendChild(box);
    S.api('staff', 'modmail-thread', { id: id }).then(function (a) {
      if (!a.success) { box.appendChild(el('p', 'form-message form-message-error', a.msg)); return; }
      var t = a.thread;
      var head = el('div', 'mm-head');
      head.appendChild(el('span', 'report-number', t.number));
      head.appendChild(el('h2', null, t.subject));
      head.appendChild(el('span', 'mm-status mm-status-' + t.status.toLowerCase(), t.statusName));
      box.appendChild(head);
      box.appendChild(el('p', 'job-foot', 'From ' + t.discordName + ' (Discord ID ' + t.discordId + ')' + (t.discordThread ? ' · also in the Discord modmail channel' : '')));
      box.appendChild(S.modmailMessages(t.messages));
      if (t.status !== 'OPEN') return;
      var msg = el('p', 'form-message');
      box.appendChild(S.modmailReply(function (text, internal) {
        return S.api('staff', 'modmail-reply', { id: t.id, body: text, internal: internal });
      }, function (r) { refreshOverview().then(function () { drawConversation(id); setTimeout(function () { var m = document.querySelector('.mm-reply .form-message'); if (m) S.message(m, 'ok', r.msg); }, 50); }); }, 'Send reply', true));
      var close = S.button('Close conversation', 'button-secondary');
      S.confirmClick(close, 'Click again to close', function () {
        S.api('staff', 'modmail-close', { id: t.id }).then(function (r) { if (!r.success) { S.message(msg, 'error', r.msg); return; } refreshOverview().then(function () { drawConversation(id); }); });
      });
      box.appendChild(close);
      box.appendChild(msg);
    });
  }

  /* ---------- Documents ---------- */
  function drawDocuments() {
    var body = shell('documents');
    var head = el('div', 'job-section-head');
    head.appendChild(el('h2', null, 'Official documents'));
    if (overview.you.isAdmin) head.appendChild(S.link('New document', '#documents/new', 'button-primary'));
    body.appendChild(head);
    if (!overview.you.isAdmin) body.appendChild(el('p', 'form-note', 'Only site admins can write and publish documents.'));
    var list = el('div'); body.appendChild(list);
    S.api('staff', 'docs').then(function (a) {
      if (!a.success) { list.appendChild(el('p', 'form-message form-message-error', a.msg)); return; }
      if (!a.documents.length) { list.appendChild(el('p', 'form-note', 'No documents yet. Start with the Constitution: use the address name "constitution".')); return; }
      a.documents.forEach(function (d) {
        var row = el('div', 'job-row');
        var info = el('div');
        info.appendChild(overview.you.isAdmin ? S.link(d.title, '#documents/' + encodeURIComponent(d.slug), 'job-row-title') : el('strong', 'job-row-title', d.title));
        info.appendChild(el('p', 'job-foot', d.category + ' · ' + d.slug + ' · updated ' + S.day(d.updatedAt)));
        row.appendChild(info);
        var right = el('div', 'job-row-buttons');
        right.appendChild(el('span', 'mm-status mm-status-' + (d.status === 'PUBLISHED' ? 'open' : 'closed'), d.status === 'PUBLISHED' ? 'Published' : 'Draft'));
        if (d.status === 'PUBLISHED') right.appendChild(S.link('View', d.slug === 'constitution' ? 'constitution.html' : 'document.html?d=' + encodeURIComponent(d.slug), 'button-small'));
        row.appendChild(right);
        list.appendChild(row);
      });
    });
  }

  function drawEditor(slug) {
    var body = shell('documents');
    body.appendChild(S.link('← Documents', '#documents', 'text-link job-back'));
    if (!overview.you.isAdmin) { body.appendChild(el('p', 'report-notice', 'Only site admins can write documents.')); return; }
    var load = slug ? S.api('staff', 'doc', { slug: slug }) : Promise.resolve({ success: true, document: null });
    Promise.all([load, S.api('staff', 'docs')]).then(function (both) {
      var a = both[0], cats = both[1].categories || [];
      if (!a.success) { body.appendChild(el('p', 'form-message form-message-error', a.msg)); return; }
      var d = a.document;
      body.appendChild(el('h2', null, d ? 'Edit: ' + d.title : 'New document'));
      var grid = el('div', 'doc-editor');
      var f = el('form', 'news-form'); f.noValidate = true;
      var title = S.input(120, 'e.g. The Constitution of the Empire of Yellonia'); f.appendChild(S.field('Title', title));
      var address = S.input(60, 'e.g. constitution'); address.className = 'mono';
      f.appendChild(S.field('Address name', address, d ? 'Can\'t be changed after the document is created.' : 'Leave empty to make one from the title. Use "constitution" for the Constitution.'));
      if (d) address.disabled = true;
      var cat = S.select(cats, 'Pick a category'); f.appendChild(S.field('Category', cat));
      var summary = S.input(300, 'One sentence about what it is'); f.appendChild(S.field('Summary (optional)', summary));
      var eff = S.input(40, 'e.g. 1 November 2026'); f.appendChild(S.field('In force from (optional)', eff));
      var text = S.textarea(22, 200000);
      text.className = 'doc-editor-text';
      f.appendChild(S.field('Text', text, '"## Article I" for a heading (listed in the contents), "### Section 1" for a smaller one, "- " or "1. " for lists, **bold**. Blank line = new paragraph.'));
      if (d) { title.value = d.title; address.value = d.slug; cat.value = d.category; summary.value = d.summary || ''; eff.value = d.effectiveDate || ''; text.value = d.body; }
      else if (location.hash.indexOf('constitution') !== -1) { address.value = 'constitution'; cat.value = 'Constitution'; }

      var msg = el('p', 'form-message'); msg.setAttribute('role', 'status'); f.appendChild(msg);
      var row = el('div', 'job-app-buttons');
      var save = el('button', 'button-secondary', 'Save draft'); save.type = 'button';
      var live = d && d.status === 'PUBLISHED';
      var publish = el('button', 'button-primary', live ? 'Save changes' : 'Save and publish'); publish.type = 'button';
      row.appendChild(publish);
      if (!live) row.appendChild(save);   /* a published document stays published when saved */
      f.appendChild(row);
      function send(pub) {
        save.disabled = publish.disabled = true; S.message(msg, '', 'Saving…');
        S.api('staff', 'doc-save', { title: title.value.trim(), slug: address.value.trim(), originalSlug: d ? d.slug : undefined, category: cat.value, summary: summary.value.trim(), effectiveDate: eff.value.trim(), body: text.value, publish: pub }).then(function (r) {
          save.disabled = publish.disabled = false;
          if (!r.success) { S.message(msg, 'error', r.msg); return; }
          refreshOverview().then(function () { location.hash = '#documents/' + r.slug; drawEditor(r.slug); setTimeout(function () { var m = document.querySelector('.doc-editor .form-message'); if (m) S.message(m, 'ok', r.msg); }, 50); });
        });
      }
      save.addEventListener('click', function () { send(false); });
      publish.addEventListener('click', function () { send(true); });

      if (d) {
        var extra = el('div', 'doc-editor-extra');
        if (d.status === 'PUBLISHED') {
          var unpub = S.button('Unpublish', 'button-small');
          S.confirmClick(unpub, 'Click again to unpublish', function () { S.api('staff', 'doc-status', { slug: d.slug, publish: false }).then(function () { refreshOverview().then(function () { drawEditor(d.slug); }); }); });
          extra.appendChild(unpub);
        }
        var del = S.button('Delete', 'button-small');
        S.confirmClick(del, 'Click again to delete for good', function () { S.api('staff', 'doc-delete', { slug: d.slug }).then(function () { refreshOverview().then(function () { location.hash = '#documents'; }); }); });
        extra.appendChild(del);
        f.appendChild(extra);
      }
      grid.appendChild(f);

      var preview = el('section', 'doc-preview');
      preview.appendChild(el('p', 'doc-toc-title', 'Preview'));
      var pv = el('div', 'doc-text');
      preview.appendChild(pv);
      grid.appendChild(preview);
      function render() { pv.textContent = ''; S.renderText(pv, text.value); }
      var t;
      text.addEventListener('input', function () { clearTimeout(t); t = setTimeout(render, 200); });
      render();
      body.appendChild(grid);
    });
  }

  /* ---------- Routing ---------- */
  function route() {
    var h = location.hash.slice(1) || 'overview';
    var m;
    if ((m = h.match(/^modmail\/(.+)$/))) return drawConversation(decodeURIComponent(m[1]));
    if (h === 'modmail') return drawInbox();
    if (h === 'documents/new' || h === 'documents/new-constitution') return drawEditor(null);
    if ((m = h.match(/^documents\/(.+)$/))) return drawEditor(decodeURIComponent(m[1]));
    if (h === 'documents') return drawDocuments();
    if (h === 'activity') return drawActivity();
    drawOverview();
  }

  function refreshOverview() {
    return S.api('staff', 'overview').then(function (a) { if (a.success) overview = a; return a; });
  }

  S.user().then(function (u) {
    user = u;
    if (!u) { root.textContent = ''; root.appendChild(S.loginCard('Staff login', 'Log in with your Discord account. Access comes from your staff role in the Yellonia Discord server.')); return; }
    refreshOverview().then(function (a) {
      root.textContent = '';
      if (!a.success) {
        root.appendChild(S.accountBar(u));
        var box = el('div', 'login-card');
        box.appendChild(el('h2', null, a.notStaff ? 'Staff only' : 'Couldn\'t open the staff area'));
        box.appendChild(el('p', null, a.notStaff ? 'This area is for Yellonia staff. If you\'re staff and see this, check you have the staff role in the Discord server.' : a.msg));
        root.appendChild(box);
        return;
      }
      route();
      window.addEventListener('hashchange', route);
    });
  });
})();
