/* ==============================================================
   contact.js - Contact Staff (contact.html)

   Modmail: message the Yellonia staff team privately. The same
   conversation works here and in Discord (DM Centurion): staff replies
   arrive in both places.

   contact.html            your conversations, and a new message form
   contact.html#MM-0001    one conversation, with a reply box
   ============================================================== */
(function () {
  var S = window.SITE;
  var el = S.el;
  var root = document.getElementById('contact-root');
  if (!root) return;
  var user = null;

  function drawHome() {
    root.textContent = '';
    root.appendChild(S.accountBar(user));
    var grid = el('div', 'contact-grid');

    var formBox = el('section', 'contact-panel');
    formBox.appendChild(el('h2', null, 'New message'));
    var f = el('form', 'news-form'); f.noValidate = true;
    var subject = S.input(100, 'e.g. Ban appeal, partnership, website problem');
    f.appendChild(S.field('Subject', subject));
    var body = S.textarea(7, 3000);
    f.appendChild(S.field('Message', body, 'Only staff see this. Include usernames, links and times if they help.'));
    var msg = el('p', 'form-message'); msg.setAttribute('role', 'status'); f.appendChild(msg);
    var send = el('button', 'button-primary', 'Send to staff'); send.type = 'submit'; f.appendChild(send);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (subject.value.trim().length < 3) { S.message(msg, 'error', 'Give it a subject.'); subject.focus(); return; }
      if (body.value.trim().length < 5) { S.message(msg, 'error', 'Write your message.'); body.focus(); return; }
      send.disabled = true; S.message(msg, '', 'Sending…');
      S.api('user', 'modmail-send', { subject: subject.value.trim(), body: body.value.trim() }).then(function (a) {
        send.disabled = false;
        if (!a.success) { S.message(msg, 'error', a.msg); return; }
        location.hash = a.number;
      });
    });
    formBox.appendChild(f);
    grid.appendChild(formBox);

    var listBox = el('section', 'contact-panel');
    listBox.appendChild(el('h2', null, 'Your conversations'));
    var list = el('div'); list.appendChild(el('p', 'news-loading', 'Loading…'));
    listBox.appendChild(list);
    grid.appendChild(listBox);
    root.appendChild(grid);

    S.api('user', 'modmail-mine').then(function (a) {
      list.textContent = '';
      if (!a.success) { list.appendChild(el('p', 'form-message form-message-error', a.msg)); return; }
      if (!a.threads.length) { list.appendChild(el('p', 'form-note', 'Nothing yet. Your conversations with staff will show here.')); return; }
      a.threads.forEach(function (t) {
        var row = S.link('', '#' + t.number, 'mm-row' + (t.status === 'OPEN' && !t.waiting ? ' mm-row-new' : ''));
        var top = el('span', 'mm-row-top');
        top.appendChild(el('span', 'report-number', t.number));
        top.appendChild(el('span', 'mm-status mm-status-' + t.status.toLowerCase(), t.status === 'OPEN' ? (t.waiting ? 'Waiting for staff' : 'Staff replied') : 'Closed'));
        row.appendChild(top);
        row.appendChild(el('strong', null, t.subject));
        row.appendChild(el('span', 'job-foot', 'Updated ' + S.when(t.updatedAt)));
        list.appendChild(row);
      });
    });
  }

  function drawThread(number) {
    root.textContent = '';
    root.appendChild(S.link('← All conversations', '#', 'text-link job-back'));
    var box = el('div'); root.appendChild(box);
    S.api('user', 'modmail-thread', { number: number }).then(function (a) {
      if (!a.success) { box.appendChild(el('p', 'form-message form-message-error', a.msg)); return; }
      var t = a.thread;
      var head = el('div', 'mm-head');
      head.appendChild(el('span', 'report-number', t.number));
      head.appendChild(el('h2', null, t.subject));
      head.appendChild(el('span', 'mm-status mm-status-' + t.status.toLowerCase(), t.statusName));
      box.appendChild(head);
      box.appendChild(S.modmailMessages(t.messages));
      if (t.status !== 'OPEN') { box.appendChild(el('p', 'report-notice', 'This conversation is closed. Start a new one if you need anything else.')); return; }
      box.appendChild(S.modmailReply(function (text) { return S.api('user', 'modmail-send', { number: t.number, body: text }); }, function () { drawThread(number); }, 'Reply'));
    });
  }


  function route() {
    var n = location.hash.slice(1).toUpperCase();
    if (/^MM-\d+$/.test(n)) drawThread(n); else drawHome();
  }

  S.user().then(function (u) {
    user = u;
    if (!u) { root.textContent = ''; root.appendChild(S.loginCard('Log in to message staff', 'Messages are tied to your Discord account, so staff can reply to you here and by Discord DM.')); return; }
    route();
    window.addEventListener('hashchange', route);
  });
})();
