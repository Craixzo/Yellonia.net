/* ==============================================================
   des/posts.js - Posts: the members-only notice board

   Everyone reads posts for all of DES and for their own department.
   Supervisors, PIOs and admins can post. Authors edit and remove their
   own posts; admins can pin, edit and remove posts in their department.
   Pinned posts stay at the top (and on the dashboard).

   DES.drawPost() is also used by the dashboard (dashboard.js).
   ============================================================== */
(function () {
  var el = DES.el;
  var main = document.getElementById('posts');

  /* One post, as a card. onChange reloads the list after an edit. */
  DES.drawPost = function (p, onChange) {
    var card = el('article', 'post-card' + (p.pinned ? ' is-pinned' : ''));
    var top = el('div', 'post-top');
    if (p.pinned) top.appendChild(el('span', 'chip chip-lime', 'Pinned'));
    top.appendChild(el('span', 'chip', p.departmentShort || 'All of DES'));
    top.appendChild(el('span', 'dim post-meta', p.authorName + ' · ' + DES.day(p.createdAt)));
    card.appendChild(top);
    card.appendChild(el('h3', 'post-title', p.title));
    card.appendChild(el('p', 'post-body', p.body));
    if (onChange && (p.canChange || p.canPin)) {
      var row = el('div', 'button-row');
      if (p.canPin) {
        var pin = button(p.pinned ? 'Unpin' : 'Pin');
        pin.addEventListener('click', function () { DES.act('post-pin', { id: p.id, pinned: !p.pinned }).then(onChange); });
        row.appendChild(pin);
      }
      if (p.canChange) {
        var edit = button('Edit');
        edit.addEventListener('click', function () {
          card.textContent = '';
          card.appendChild(postForm(p, function () { onChange(); }, function () { onChange(); }));
        });
        row.appendChild(edit);
        var remove = button('Remove', 'btn-danger');
        DES.confirmClick(remove, 'Click again to remove', function () { DES.act('post-remove', { id: p.id }).then(onChange); });
        row.appendChild(remove);
      }
      card.appendChild(row);
    }
    return card;
  };

  if (!main) return;   /* loaded by the dashboard only for DES.drawPost */

  var state = { targets: [] };
  DES.requireMember().then(function () { load(); });

  function load() {
    DES.act('posts', {}).then(function (answer) {
      main.textContent = '';
      var head = el('div', 'page-head');
      var titles = el('div');
      titles.appendChild(el('div', 'label', 'Communications'));
      titles.appendChild(el('h1', null, 'Posts'));
      head.appendChild(titles);
      main.appendChild(head);
      if (!answer.success) { main.appendChild(el('p', 'message message-error', answer.msg)); return; }
      state.targets = answer.targets;

      if (answer.canPost) {
        var panel = el('section', 'panel');
        var h = el('div', 'panel-head');
        h.appendChild(el('h2', null, 'New post'));
        panel.appendChild(h);
        var body = el('div', 'panel-body');
        body.appendChild(postForm(null, load));
        panel.appendChild(body);
        main.appendChild(panel);
      }

      var list = el('div', 'post-list');
      if (!answer.posts.length) list.appendChild(el('p', 'dim', 'No posts yet.'));
      answer.posts.forEach(function (p) { list.appendChild(DES.drawPost(p, load)); });
      main.appendChild(list);
    });
  }

  /* The new-post form, or the edit form for an existing post */
  function postForm(p, onSaved, onCancel) {
    var form = el('form', 'form');
    form.noValidate = true;
    var title = field(form, 'Title', 'input');
    title.maxLength = 120;
    var where = null;
    var targets = state.targets.length ? state.targets : [{ key: p && p.department || '', name: p && p.departmentShort || 'All of DES' }];
    if (targets.length > 1) {
      where = field(form, 'Who sees it', 'select');
      targets.forEach(function (t) { var o = el('option', null, t.name); o.value = t.key; where.appendChild(o); });
    }
    var text = field(form, 'Post', 'textarea');
    text.rows = p ? 5 : 4;
    text.maxLength = 4000;
    if (p) { title.value = p.title; text.value = p.body; if (where) where.value = p.department || ''; }
    var msg = el('p', 'message');
    form.appendChild(msg);
    var row = el('div', 'button-row');
    var save = el('button', 'btn btn-primary btn-small', p ? 'Save' : 'Post');
    save.type = 'submit';
    row.appendChild(save);
    if (onCancel) { var cancel = button('Cancel'); cancel.addEventListener('click', onCancel); row.appendChild(cancel); }
    form.appendChild(row);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      save.disabled = true;
      var data = { title: title.value.trim(), body: text.value.trim() };
      if (where) data.department = where.value;
      if (p) data.id = p.id;
      DES.act(p ? 'post-update' : 'post-create', data).then(function (answer) {
        save.disabled = false;
        if (!answer.success) { DES.message(msg, 'error', answer.msg); return; }
        onSaved();
      });
    });
    return form;
  }

  function button(text, extra) { var b = el('button', 'btn btn-small' + (extra ? ' ' + extra : ''), text); b.type = 'button'; return b; }
  function field(parent, labelText, tag) {
    var wrap = el('div', 'field');
    var id = 'post-f-' + Math.random().toString(36).slice(2, 8);
    var label = el('label', null, labelText);
    label.htmlFor = id;
    var input = el(tag);
    input.id = id;
    wrap.appendChild(label);
    wrap.appendChild(input);
    parent.appendChild(wrap);
    return input;
  }
})();
