/* ==============================================================
   afterimage-common.js - shared by every Afterimage page
   (afterimage.html, afterimage-view.html, afterimage-recorder.html, afterimage-watch.html)

   AI.session()              { loggedIn, base, ticket, name, canBroadcast } (refreshes the ticket by itself)
   AI.get(path) / AI.post(path, data)   talk to the Afterimage backend on Railway
   AI.wsUrl(query)           the backend's websocket address
   AI.distance(studs)        "84 studs · 23.5 m"
   AI.clock(seconds)         "01:05"
   AI.ago(ms)                "3 min ago"
   ============================================================== */
(function () {
  var AI = {};

  /* ---------- SETTINGS ---------- */
  AI.METERS_PER_STUD = 0.28;    /* Roblox's own figure for character scale */

  var sessionPromise = null, sessionAt = 0;
  AI.session = function () {
    /* tickets last 15 minutes; get a new one after 10 */
    if (!sessionPromise || Date.now() - sessionAt > 10 * 60000) {
      sessionAt = Date.now();
      sessionPromise = fetch('/api/afterimage', { credentials: 'same-origin' })
        .then(function (r) { return r.json(); })
        .catch(function () { return { success: false, msg: 'Couldn\'t reach the site. Check your connection.' }; });
    }
    return sessionPromise;
  };

  function call(method, path, data, extraHeaders) {
    return AI.session().then(function (s) {
      if (!s.base) return { success: false, msg: s.msg || 'Afterimage isn\'t connected yet.' };
      var headers = Object.assign({}, extraHeaders || {});
      if (s.ticket) headers.Authorization = 'Bearer ' + s.ticket;
      var options = { method: method, headers: headers };
      if (data !== undefined) {
        if (data instanceof Blob) { headers['Content-Type'] = 'application/octet-stream'; options.body = data; }
        else { headers['Content-Type'] = 'application/json'; options.body = JSON.stringify(data); }
      }
      return fetch(s.base + path, options)
        .then(function (r) { return r.json().catch(function () { return { success: false, msg: 'Afterimage sent back something odd. Try again.' }; }); })
        .catch(function () { return { success: false, msg: 'Couldn\'t reach Afterimage. It may be restarting; try again in a minute.' }; });
    });
  }
  AI.get = function (path) { return call('GET', path); };
  AI.post = function (path, data, headers) { return call('POST', path, data === undefined ? {} : data, headers); };

  AI.wsUrl = function (query) {
    return AI.session().then(function (s) {
      return s.base.replace(/^http/, 'ws') + '/ws?' + query + (s.ticket ? '&ticket=' + encodeURIComponent(s.ticket) : '');
    });
  };

  AI.distance = function (studs) {
    if (!studs) return '';
    return Math.round(studs) + ' studs · ' + (studs * AI.METERS_PER_STUD).toFixed(1) + ' m';
  };
  AI.clock = function (s) {
    s = Math.max(0, Math.floor(s || 0));
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  };
  AI.ago = function (ms) {
    var m = Math.round((Date.now() - ms) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min ago';
    var h = Math.round(m / 60);
    if (h < 24) return h + ' h ago';
    return Math.round(h / 24) + ' d ago';
  };
  AI.daysLeft = function (expiresAt) { return Math.max(0, Math.ceil((expiresAt - Date.now()) / 86400000)); };

  AI.el = function (tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  };

  AI.loginCard = function (title, text) {
    var card = AI.el('div', 'login-card');
    card.appendChild(AI.el('h2', null, title));
    card.appendChild(AI.el('p', null, text));
    var a = AI.el('a', 'button-discord', 'Log in with Discord');
    a.href = '/api/auth/login?next=' + encodeURIComponent(location.pathname + location.search + location.hash);
    card.appendChild(a);
    card.appendChild(AI.el('p', 'login-small', 'We only see your Discord name, ID and avatar.'));
    return card;
  };

  window.AI = AI;
})();
