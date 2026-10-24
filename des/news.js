/* ==============================================================
   des/news.js - DES News

   DES's own outlet in Yellonia News. Its stories appear in the News
   section of the Emergency Services page and on Yellonia News.

   - A Service Admin sets the outlet up once (it starts approved).
   - PIOs, supervisors and admins join as writers with one click.
   - Articles are written in the normal newsroom editor, which uses
     your Discord login, and are reviewed by the Ministry of Commerce
     before they go live, like every other outlet.
   ============================================================== */
(function () {
  var el = DES.el;
  var main = document.getElementById('news');
  var flash;

  var STATUS = { DRAFT: ['Draft', ''], SUBMITTED: ['Waiting for review', 'chip-amber'], PUBLISHED: ['Published', 'chip-green'], REJECTED: ['Sent back', 'chip-red'] };

  DES.requireMember().then(function () { load(); });

  function load(okText) {
    DES.act('news-status', {}).then(function (answer) {
      main.textContent = '';
      var head = el('div', 'page-head');
      var titles = el('div');
      titles.appendChild(el('div', 'label', 'Communications'));
      titles.appendChild(el('h1', null, 'DES News'));
      head.appendChild(titles);
      main.appendChild(head);
      flash = el('p', 'message flash');
      flash.setAttribute('role', 'status');
      main.appendChild(flash);
      if (okText) say('ok', okText);
      if (!answer.success) { say('error', answer.msg); return; }
      if (!answer.canWrite) { DES.noAccess(main, 'Only PIOs, supervisors and admins can write for DES News.'); return; }
      if (!answer.exists) { drawSetup(answer); return; }
      if (!answer.approved) { main.appendChild(note('An outlet called "' + answer.slug + '" exists but isn\'t approved. Ask the Ministry of Commerce to approve or remove it.')); return; }
      drawOutlet(answer);
    });
  }

  function say(kind, text) {
    flash.textContent = text || '';
    flash.className = 'message flash' + (kind ? ' message-' + kind : '');
  }

  function act(action, data) {
    return DES.act(action, data || {}).then(function (answer) {
      if (!answer.success) { say('error', answer.msg); return; }
      load(answer.msg);
    });
  }

  function drawSetup(s) {
    var panel = el('section', 'panel panel-body');
    panel.appendChild(el('h2', null, 'DES News isn\'t set up yet'));
    panel.appendChild(el('p', 'dim', 'This creates "' + s.name + '" in Yellonia News, already approved. Its stories show up in the News section of the Emergency Services page.'));
    if (s.canSetup) {
      var go = el('button', 'btn btn-primary', 'Set up DES News');
      go.type = 'button';
      go.addEventListener('click', function () { go.disabled = true; act('news-setup'); });
      panel.appendChild(go);
      panel.appendChild(el('p', 'field-hint', 'You become the outlet\'s owner: you can change its look and pick the cover story in the newsroom.'));
    } else {
      panel.appendChild(el('p', null, 'A Service Admin needs to set it up first.'));
    }
    main.appendChild(panel);
  }

  function drawOutlet(s) {
    var grid = el('div', 'case-grid');
    var left = el('div', 'stack');
    var right = el('div', 'stack');
    grid.appendChild(left);
    grid.appendChild(right);
    main.appendChild(grid);

    /* writing */
    var write = panel(left, 'Write');
    var wbody = el('div', 'panel-body');
    if (s.isWriter) {
      wbody.appendChild(el('p', null, 'Write and edit articles in the newsroom editor. It uses your Discord login. Each article is reviewed by the Ministry of Commerce before it\'s published.'));
      var row = el('div', 'button-row');
      var newArticle = el('a', 'btn btn-primary', 'Write a new article');
      newArticle.href = '/editor.html?o=' + encodeURIComponent(s.slug);
      row.appendChild(newArticle);
      var front = el('a', 'btn', 'See the outlet');
      front.href = '/outlet.html?o=' + encodeURIComponent(s.slug);
      row.appendChild(front);
      wbody.appendChild(row);
    } else {
      wbody.appendChild(el('p', null, 'Join as a writer to write articles for DES News.'));
      var join = el('button', 'btn btn-primary', 'Join as a writer');
      join.type = 'button';
      join.addEventListener('click', function () { join.disabled = true; act('news-join'); });
      wbody.appendChild(join);
    }
    write.appendChild(wbody);

    /* articles */
    var arts = panel(left, 'Articles');
    var scroll = el('div', 'table-scroll');
    var table = el('table', 'data-table');
    var tr = el('tr');
    ['Headline', 'Author', 'Status', 'Updated'].forEach(function (h) { tr.appendChild(el('th', null, h)); });
    var thead = el('thead');
    thead.appendChild(tr);
    table.appendChild(thead);
    var tbody = el('tbody');
    if (!s.articles.length) {
      var none = el('tr');
      var td = el('td', 'table-empty', 'No articles yet.');
      td.colSpan = 4;
      none.appendChild(td);
      tbody.appendChild(none);
    }
    s.articles.forEach(function (a) {
      var row = el('tr');
      var cell = el('td', 'wrap');
      if (a.mine && s.isWriter) {
        var link = el('a', 'row-link', a.headline);
        link.href = '/editor.html?o=' + encodeURIComponent(s.slug) + '&id=' + encodeURIComponent(a.id);
        cell.appendChild(link);
      } else if (a.status === 'PUBLISHED') {
        var read = el('a', 'row-link', a.headline);
        read.href = '/article.html?o=' + encodeURIComponent(s.slug) + '&a=' + encodeURIComponent(a.slug);
        cell.appendChild(read);
      } else {
        cell.textContent = a.headline;
      }
      row.appendChild(cell);
      row.appendChild(el('td', null, a.authorName));
      var st = el('td');
      var info = STATUS[a.status] || [a.status, ''];
      st.appendChild(el('span', 'chip ' + info[1], info[0]));
      row.appendChild(st);
      row.appendChild(el('td', 'mono', DES.day(a.publishedAt || a.updatedAt)));
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    scroll.appendChild(table);
    arts.appendChild(scroll);

    /* writers */
    var people = panel(right, 'Writers');
    var list = el('ul', 'access-list');
    s.writers.forEach(function (w) {
      var li = el('li');
      li.appendChild(el('span', null, w.name + (w.me ? ' (you)' : '')));
      if (w.role === 'OWNER') li.appendChild(el('span', 'chip chip-lime', 'Owner'));
      else if (w.me) {
        var leave = el('button', 'btn btn-small', 'Leave');
        leave.type = 'button';
        DES.confirmClick(leave, 'Click again to leave', function () { act('news-remove', {}); });
        li.appendChild(leave);
      } else if (s.canSetup) {
        var remove = el('button', 'btn btn-small btn-danger', 'Remove');
        remove.type = 'button';
        DES.confirmClick(remove, 'Confirm', function () { act('news-remove', { discord: w.discordId }); });
        li.appendChild(remove);
      }
      list.appendChild(li);
    });
    people.appendChild(list);
    people.appendChild(el('p', 'panel-note dim', 'Anyone who leaves DES stops being a writer automatically.'));
  }

  function panel(parent, title) {
    var p = el('section', 'panel');
    var h = el('div', 'panel-head');
    h.appendChild(el('h2', null, title));
    p.appendChild(h);
    parent.appendChild(p);
    return p;
  }
  function note(text) { var p = el('section', 'panel panel-body'); p.appendChild(el('p', null, text)); return p; }
})();
