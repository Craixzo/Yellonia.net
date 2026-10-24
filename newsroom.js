/* ==============================================================
   newsroom.js - the logged-in news pages

     news-register.html   the form to register a news outlet
     newsroom.html        your outlets, their status, and their writers

   Each page says which one it is with <body data-newsroom="...">.
   Everything is added as plain text, so nothing typed can run as code.

   CONTENTS
     1. HELPERS
     2. ACCOUNT BAR + LOGIN CARD
     3. REGISTER PAGE
     4. NEWSROOM PAGE
     5. START
   ============================================================== */

(function () {

  /* ---------- 1. HELPERS ---------- */
  var page = document.body.getAttribute('data-newsroom');
  var root = document.getElementById('newsroom-root');
  if (!page || !root) return;

  var STATUS_TEXT = { PENDING: 'Waiting for review', APPROVED: 'Approved', DENIED: 'Not approved', SUSPENDED: 'Suspended' };
  var ACCENTS = ['#bed215', '#369cd3', '#5bbf49', '#d9534f', '#e8a33d', '#9b6dd6', '#dbdee1'];

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function link(text, href, className) {
    var a = el('a', className, text);
    a.href = href;
    return a;
  }

  function post(body) {
    return fetch('/api/newsroom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    }).then(function (reply) {
      return reply.json().catch(function () { return { success: false, msg: 'Something went wrong. Please try again.' }; });
    }).catch(function () {
      return { success: false, msg: 'Couldn\'t reach the site. Check your connection and try again.' };
    });
  }

  /* A message line under a form: kind is 'error' or 'ok' */
  function message(target, kind, text) {
    target.textContent = text || '';
    target.className = 'form-message' + (kind ? ' form-message-' + kind : '');
  }

  var here = location.pathname + location.search.replace(/[?&]login=failed/, '');
  var loginHref = '/api/auth/login?next=' + encodeURIComponent(here);


  /* ---------- 2. ACCOUNT BAR + LOGIN CARD ---------- */
  function accountBar(user) {
    var bar = el('div', 'account-bar');
    if (user.avatar) {
      var pic = el('img', 'account-avatar');
      pic.src = user.avatar;
      pic.alt = '';
      bar.appendChild(pic);
    }
    var who = el('span', null, 'Logged in as ');
    who.appendChild(el('strong', null, user.name));
    bar.appendChild(who);
    bar.appendChild(link('Log out', '/api/auth/logout', 'account-logout'));
    return bar;
  }

  function loginCard(text) {
    var card = el('div', 'login-card');
    if (new URLSearchParams(location.search).get('login') === 'failed') {
      card.appendChild(el('p', 'form-message form-message-error', 'Logging in didn\'t work. Please try again.'));
    }
    card.appendChild(el('p', null, text));
    card.appendChild(link('Log in with Discord', loginHref, 'button-discord'));
    card.appendChild(el('p', 'login-small', 'We only see your Discord name, ID and avatar. You must be a member of the Yellonia Discord server.'));
    return card;
  }


  /* ---------- 3. REGISTER PAGE ---------- */
  function field(labelText, input, hint) {
    var wrap = el('label', 'field');
    wrap.appendChild(el('span', 'field-label', labelText));
    wrap.appendChild(input);
    if (hint) wrap.appendChild(el('span', 'field-hint', hint));
    return wrap;
  }

  function input(name, max, placeholder) {
    var box = el('input');
    box.name = name;
    box.type = 'text';
    box.maxLength = max;
    if (placeholder) box.placeholder = placeholder;
    return box;
  }

  function registerPage(user) {
    var form = el('form', 'news-form');
    form.noValidate = true;

    var name = input('name', 60, 'The Concord Herald');
    name.required = true;
    var tagline = input('tagline', 120, 'News from the capital since 1923');
    var description = el('textarea');
    description.name = 'description';
    description.maxLength = 600;
    description.rows = 4;
    description.placeholder = 'What your outlet covers, and who it\'s for.';
    var sections = input('sections', 200, 'Politics, Military, Economy');

    form.appendChild(field('Name', name, 'Must be original. 3 to 60 characters.'));
    form.appendChild(field('Tagline', tagline, 'Optional. One short line under your name.'));
    form.appendChild(field('Description', description, 'Optional. Shown to the Ministry and on your outlet\'s card.'));
    form.appendChild(field('Sections', sections, 'Optional. Up to 8, separated by commas. You can change these later.'));

    /* Accent color: preset swatches plus a custom color */
    var colorWrap = el('div', 'field');
    colorWrap.appendChild(el('span', 'field-label', 'Accent color'));
    var swatches = el('div', 'swatches');
    var chosen = ACCENTS[1];
    var custom = el('input');
    custom.type = 'color';
    custom.value = chosen;
    custom.className = 'swatch-custom';
    custom.setAttribute('aria-label', 'Custom color');
    function pick(color) {
      chosen = color;
      custom.value = color;
      Array.prototype.forEach.call(swatches.querySelectorAll('.swatch'), function (s) {
        s.setAttribute('aria-pressed', s.getAttribute('data-color') === color ? 'true' : 'false');
      });
      preview.style.setProperty('--accent', color);
    }
    ACCENTS.forEach(function (color) {
      var swatch = el('button', 'swatch');
      swatch.type = 'button';
      swatch.style.background = color;
      swatch.setAttribute('data-color', color);
      swatch.setAttribute('aria-label', 'Accent color ' + color);
      swatch.addEventListener('click', function () { pick(color); });
      swatches.appendChild(swatch);
    });
    custom.addEventListener('input', function () { pick(custom.value); });
    swatches.appendChild(custom);
    colorWrap.appendChild(swatches);
    form.appendChild(colorWrap);

    /* A small live preview of the masthead */
    var preview = el('div', 'masthead-preview');
    var previewName = el('span', 'masthead-preview-name', 'Your outlet');
    var previewTagline = el('span', 'masthead-preview-tagline', '');
    preview.appendChild(previewName);
    preview.appendChild(previewTagline);
    form.appendChild(field('Preview', preview));
    name.addEventListener('input', function () { previewName.textContent = name.value.trim() || 'Your outlet'; });
    tagline.addEventListener('input', function () { previewTagline.textContent = tagline.value.trim(); });
    pick(chosen);

    form.appendChild(el('p', 'form-note', 'The Ministry of Commerce reviews every outlet before it goes live. You\'ll get a DM from Centurion with their decision. Logos and cover images are added from your newsroom once you\'re approved.'));

    var submit = el('button', 'button-primary', 'Send to the Ministry');
    submit.type = 'submit';
    form.appendChild(submit);
    var status = el('p', 'form-message');
    status.setAttribute('role', 'status');
    form.appendChild(status);

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (name.value.trim().length < 3) { message(status, 'error', 'Please give your outlet a name of at least 3 characters.'); name.focus(); return; }
      submit.disabled = true;
      message(status, null, 'Sending...');
      post({
        action: 'register',
        name: name.value,
        tagline: tagline.value,
        description: description.value,
        sections: sections.value,
        accentColor: chosen,
      }).then(function (result) {
        submit.disabled = false;
        if (!result.success) return message(status, 'error', result.msg);
        var done = el('div', 'login-card');
        done.appendChild(el('h2', null, 'Request sent'));
        done.appendChild(el('p', null, 'Your request for ' + name.value.trim() + ' is with the Ministry of Commerce. Centurion will DM you when they decide.'));
        done.appendChild(link('Go to your newsroom', '/newsroom.html', 'button-primary'));
        form.replaceWith(done);
      });
    });

    root.appendChild(form);
  }


  /* ---------- 4. NEWSROOM PAGE ---------- */
  function newsroomPage(user) {
    var list = el('div', 'newsroom-list');
    list.appendChild(el('p', 'news-loading', 'Loading your outlets...'));
    root.appendChild(list);

    post({ action: 'mine' }).then(function (result) {
      list.textContent = '';
      if (!result.success) { list.appendChild(el('p', 'form-message form-message-error', result.msg)); return; }
      if (!result.outlets.length) {
        var empty = el('div', 'login-card');
        empty.appendChild(el('p', null, 'You\'re not part of any news outlet yet.'));
        empty.appendChild(link('Start a news outlet', '/news-register.html', 'button-primary'));
        empty.appendChild(el('p', 'login-small', 'Want to write for an existing outlet? Ask its owner to add you by your Discord username.'));
        list.appendChild(empty);
        return;
      }
      result.outlets.forEach(function (outlet) { list.appendChild(outletCard(outlet, user)); });
    });
  }

  function outletCard(outlet, user) {
    var card = el('article', 'newsroom-card status-' + outlet.status.toLowerCase());
    var head = el('div', 'newsroom-card-head');
    var titles = el('div');
    titles.appendChild(el('h2', null, outlet.name));
    if (outlet.tagline) titles.appendChild(el('p', 'newsroom-tagline', outlet.tagline));
    head.appendChild(titles);
    var badge = outlet.memberStatus === 'PENDING' ? 'Your writer approval is pending' : STATUS_TEXT[outlet.status] || outlet.status;
    head.appendChild(el('span', 'status-badge', badge));
    card.appendChild(head);

    var role = el('p', 'newsroom-role', outlet.role === 'OWNER' ? 'You own this outlet.' : 'You write for this outlet.');
    card.appendChild(role);

    if (outlet.status === 'PENDING') {
      card.appendChild(el('p', null, 'The Ministry of Commerce is reviewing your request. Centurion will DM you when they decide.'));
    } else if (outlet.status === 'DENIED') {
      card.appendChild(el('p', null, 'The Ministry of Commerce didn\'t approve this outlet.' + (outlet.reviewNote ? ' Reason: ' + outlet.reviewNote : '')));
      card.appendChild(link('Register a new outlet', '/news-register.html', 'text-link'));
    } else if (outlet.status === 'SUSPENDED') {
      card.appendChild(el('p', null, 'This outlet has been suspended by the Ministry of Commerce.' + (outlet.reviewNote ? ' Reason: ' + outlet.reviewNote : '')));
    } else if (outlet.status === 'APPROVED') {
      var links = el('div', 'newsroom-links');
      links.appendChild(link('View front page', '/outlet.html?o=' + encodeURIComponent(outlet.slug), 'text-link'));
      if (outlet.role === 'OWNER') links.appendChild(link('Outlet settings', '/outlet-settings.html?o=' + encodeURIComponent(outlet.slug), 'text-link'));
      card.appendChild(links);
      if (outlet.memberStatus === 'ACTIVE') card.appendChild(articlesPanel(outlet));
      if (outlet.role === 'OWNER') card.appendChild(writersPanel(outlet));
      else if (outlet.memberStatus === 'ACTIVE') card.appendChild(leaveButton(outlet, user));
    }
    return card;
  }

  /* The outlet's articles (all of them for the owner, your own for a writer), and a button to write a new one */
  var ARTICLE_STATUS = { DRAFT: 'Draft', SUBMITTED: 'Waiting for review', PUBLISHED: 'Published', REJECTED: 'Not approved' };

  function articlesPanel(outlet) {
    var panel = el('section', 'writers');
    var head = el('div', 'panel-head');
    head.appendChild(el('h3', null, outlet.role === 'OWNER' ? 'Articles' : 'Your articles'));
    head.appendChild(link('Write a new article', '/editor.html?o=' + encodeURIComponent(outlet.slug), 'button-primary button-compact'));
    panel.appendChild(head);
    var list = el('ul', 'article-list');
    list.appendChild(el('li', 'writer-empty', 'Loading...'));
    panel.appendChild(list);

    post({ action: 'articles', outlet: outlet.slug }).then(function (result) {
      list.textContent = '';
      if (!result.success) { list.appendChild(el('li', 'form-message form-message-error', result.msg)); return; }
      if (!result.articles.length) { list.appendChild(el('li', 'writer-empty', 'No articles yet.')); return; }
      result.articles.forEach(function (article) {
        var row = el('li');
        var text = el('div', 'article-row-text');
        var title = link(article.headline, '/editor.html?o=' + encodeURIComponent(outlet.slug) + '&id=' + encodeURIComponent(article.id), 'article-row-title');
        text.appendChild(title);
        var meta = [ARTICLE_STATUS[article.status] || article.status];
        if (outlet.role === 'OWNER') meta.push('by ' + article.authorName);
        if (article.isCoverStory) meta.push('cover story');
        text.appendChild(el('span', 'article-row-meta', meta.join(' | ')));
        if (article.reviewNote) text.appendChild(el('span', 'article-row-note', 'Reason: ' + article.reviewNote));
        row.appendChild(text);
        if (article.status === 'PUBLISHED') {
          row.appendChild(link('View', '/article.html?o=' + encodeURIComponent(outlet.slug) + '&a=' + encodeURIComponent(article.slug), 'button-small'));
        }
        row.className = 'article-status-' + article.status.toLowerCase();
        list.appendChild(row);
      });
    });
    return panel;
  }

  /* Owner only: the writer list, remove buttons and the add form */
  function writersPanel(outlet) {
    var panel = el('section', 'writers');
    panel.appendChild(el('h3', null, 'Writers'));
    var status = el('p', 'form-message');
    status.setAttribute('role', 'status');

    var list = el('ul', 'writer-list');
    if (!outlet.writers.length) list.appendChild(el('li', 'writer-empty', 'No writers yet.'));
    function writerRow(writer) {
      var row = el('li');
      row.appendChild(el('span', 'writer-name', writer.name));
      row.appendChild(el('span', 'writer-status', writer.status === 'PENDING' ? 'Waiting for the Ministry' : 'Active'));
      var remove = el('button', 'button-small', 'Remove');
      remove.type = 'button';
      confirmClick(remove, 'Click again to remove', function () {
        post({ action: 'remove-writer', outlet: outlet.slug, writerId: writer.discordId }).then(function (result) {
          if (!result.success) { remove.disabled = false; return message(status, 'error', result.msg); }
          row.remove();
          message(status, 'ok', result.msg);
        });
      });
      row.appendChild(remove);
      return row;
    }
    outlet.writers.forEach(function (writer) { list.appendChild(writerRow(writer)); });
    panel.appendChild(list);

    var form = el('form', 'add-writer');
    var username = input('username', 40, 'Discord username');
    username.setAttribute('aria-label', 'Discord username of the writer to add');
    var add = el('button', 'button-primary', 'Add writer');
    add.type = 'submit';
    form.appendChild(username);
    form.appendChild(add);
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!username.value.trim()) return;
      add.disabled = true;
      message(status, null, 'Sending...');
      post({ action: 'add-writer', outlet: outlet.slug, username: username.value }).then(function (result) {
        add.disabled = false;
        if (!result.success) return message(status, 'error', result.msg);
        var empty = list.querySelector('.writer-empty');
        if (empty) empty.remove();
        list.appendChild(writerRow({ discordId: result.discordId, name: result.name, status: 'PENDING' }));
        username.value = '';
        message(status, 'ok', result.msg);
      });
    });
    panel.appendChild(form);
    panel.appendChild(el('p', 'field-hint', 'Writers must be in the Yellonia Discord server. The Ministry of Commerce approves each one.'));
    panel.appendChild(status);
    return panel;
  }

  function leaveButton(outlet, user) {
    var wrap = el('div', 'leave-wrap');
    var leave = el('button', 'button-small', 'Leave this outlet');
    leave.type = 'button';
    var status = el('p', 'form-message');
    confirmClick(leave, 'Click again to leave', function () {
      post({ action: 'remove-writer', outlet: outlet.slug, writerId: user.id }).then(function (result) {
        if (!result.success) return message(status, 'error', result.msg);
        wrap.closest('.newsroom-card').remove();
      });
    });
    wrap.appendChild(leave);
    wrap.appendChild(status);
    return wrap;
  }

  /* Asks for a second click instead of a pop-up confirmation */
  function confirmClick(button, confirmText, action) {
    var original = button.textContent, armed = false, timer;
    button.addEventListener('click', function () {
      if (!armed) {
        armed = true;
        button.textContent = confirmText;
        button.classList.add('button-armed');
        timer = setTimeout(function () { armed = false; button.textContent = original; button.classList.remove('button-armed'); }, 4000);
        return;
      }
      clearTimeout(timer);
      button.disabled = true;
      action();
    });
  }


  /* ---------- 5. START ---------- */
  fetch('/api/auth/me', { credentials: 'same-origin' })
    .then(function (reply) { return reply.json(); })
    .then(function (data) {
      root.textContent = '';
      if (!data.user) {
        root.appendChild(loginCard(page === 'register'
          ? 'Log in with Discord to register a news outlet.'
          : 'Log in with Discord to see your news outlets.'));
        return;
      }
      root.appendChild(accountBar(data.user));
      if (page === 'register') registerPage(data.user);
      else newsroomPage(data.user);
    })
    .catch(function () {
      root.textContent = '';
      root.appendChild(el('p', 'form-message form-message-error', 'This page couldn\'t load. Please try again in a minute.'));
    });
})();
