/* des/setup.js - setting (or resetting) a DES password after a Discord check */
(function () {
  var root = document.getElementById('setup-root');
  var el = DES.el;

  function heading(title, text) {
    root.textContent = '';
    root.appendChild(el('h1', null, title));
    root.appendChild(el('p', null, text));
  }

  function backLink() {
    var links = el('div', 'auth-links');
    var back = el('a', null, 'Back to Service Login');
    back.href = 'login.html';
    links.appendChild(back);
    root.appendChild(links);
  }

  /* Step 1: are they logged in with Discord? (the same login the newsroom uses) */
  fetch('/api/auth/me', { credentials: 'same-origin' })
    .then(function (reply) { return reply.json(); })
    .then(function (me) {
      if (!me.user) {
        heading('Set up your account', 'First, confirm who you are by logging in with Discord.');
        var go = el('a', 'btn btn-discord', 'Continue with Discord');
        go.href = '/api/auth/login?next=' + encodeURIComponent('/des/setup.html');
        root.appendChild(go);
        return backLink();
      }
      /* Step 2: is this Discord account a DES member? */
      DES.post('setup-status').then(function (status) {
        if (!status.success) { heading('Something went wrong', status.msg); return backLink(); }
        if (!status.eligible) {
          heading('No DES account found', 'The Discord account ' + (me.user.username || '') + ' isn\'t linked to an active member of the Police or Fire Department. Ask your department\'s admin to add you, then come back.');
          return backLink();
        }
        passwordForm(status);
      });
    })
    .catch(function () { heading('This page couldn\'t load', 'Please try again in a minute.'); });

  function passwordForm(status) {
    heading(status.hasPassword ? 'Reset your password' : 'Choose your password',
      status.departmentName + '. You\'ll log in with your username, Badge ID and this password.');

    var form = el('form', 'form');
    form.noValidate = true;

    function field(id, label, value, opts) {
      var wrap = el('div', 'field');
      var lab = el('label', null, label);
      lab.htmlFor = id;
      var input = el('input', opts && opts.mono ? 'mono' : '');
      input.id = id;
      if (value !== undefined) { input.value = value; input.readOnly = true; }
      if (opts && opts.type) input.type = opts.type;
      if (opts && opts.auto) input.autocomplete = opts.auto;
      wrap.appendChild(lab);
      wrap.appendChild(input);
      if (opts && opts.hint) wrap.appendChild(el('span', 'field-hint', opts.hint));
      form.appendChild(wrap);
      return input;
    }

    field('username', 'Username', status.username, { auto: 'username' });
    field('badge', 'Badge ID', status.badgeId, { mono: true });
    var pass = field('password', 'New password', undefined, { type: 'password', auto: 'new-password', hint: 'At least 10 characters. It can\'t contain your username or Badge ID.' });
    var confirm = field('confirm', 'Type it again', undefined, { type: 'password', auto: 'new-password' });
    var msg = el('p', 'message');
    msg.setAttribute('role', 'alert');
    form.appendChild(msg);
    var button = el('button', 'btn btn-primary', status.hasPassword ? 'Change password' : 'Set password');
    button.type = 'submit';
    form.appendChild(button);
    root.appendChild(form);
    backLink();
    pass.focus();

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (pass.value.length < 10) return DES.message(msg, 'error', 'Use at least 10 characters.');
      if (pass.value !== confirm.value) return DES.message(msg, 'error', 'The two passwords don\'t match.');
      button.disabled = true;
      DES.message(msg, null, 'Saving…');
      DES.post('set-password', { password: pass.value, confirm: confirm.value }).then(function (answer) {
        button.disabled = false;
        if (!answer.success) return DES.message(msg, 'error', answer.msg);
        heading('All set', answer.msg);
        var go = el('a', 'btn btn-primary', 'Go to Service Login');
        go.href = 'login.html?u=' + encodeURIComponent(answer.username) + '&b=' + encodeURIComponent(answer.badgeId);
        root.appendChild(go);
      });
    });
  }
})();
