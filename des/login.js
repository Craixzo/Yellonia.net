/* des/login.js - the Service Login form */
(function () {
  var params = new URLSearchParams(location.search);
  var next = DES.safeNext(params.get('next'));
  var form = document.getElementById('login-form');
  var msg = document.getElementById('login-message');
  var button = form.querySelector('button[type="submit"]');

  /* Filled in after setting a password */
  if (params.get('u')) form.username.value = params.get('u');
  if (params.get('b')) form.badge.value = params.get('b');
  (form.username.value ? (form.badge.value ? form.password : form.badge) : form.username).focus();

  /* TEMPORARY: typing AveYellonia as the Badge ID shows the preview button (see preview.js) */
  if (window.DES_PREVIEW) {
    var door = document.createElement('button');
    door.type = 'button';
    door.className = 'btn';
    door.textContent = 'Enter Via Backdoor';
    door.hidden = true;
    button.parentNode.insertBefore(door, button.nextSibling);
    form.badge.addEventListener('input', function () {
      door.hidden = form.badge.value.trim().toLowerCase() !== DES_PREVIEW.TRIGGER;
    });
    door.addEventListener('click', function () { DES_PREVIEW.enter(); location.replace(next); });
  }

  /* Already logged in: go straight on */
  DES.post('me').then(function (answer) { if (answer.member) location.replace(next); });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!form.username.value.trim() || !form.badge.value.trim() || !form.password.value) {
      return DES.message(msg, 'error', 'Fill in all three boxes.');
    }
    button.disabled = true;
    DES.message(msg, null, 'Checking…');
    DES.post('login', { username: form.username.value.trim(), badgeId: form.badge.value.trim(), password: form.password.value })
      .then(function (answer) {
        button.disabled = false;
        if (!answer.success) {
          form.password.value = '';
          form.password.focus();
          return DES.message(msg, 'error', answer.msg);
        }
        DES.message(msg, 'ok', 'Logged in.');
        location.replace(next);
      });
  });
})();
