/* ==============================================================
   economy-common.js - shared by economy.html and company.html

   ECON.api(action, data)   talks to /api/economy (see api/_routes/economy.js)
   ECON.user()              the Discord login, or null
   ECON.chart(box, points)  draws a price chart (an SVG) into box
   ECON.money / price / percent / count   number formats
   ============================================================== */
(function () {
  var ECON = {};

  /* ---------- SETTINGS ---------- */
  ECON.CURRENCY = 'Y$';
  ECON.RANGES = ['1D', '3D', '1M', '6M', 'YTD', '1Y', '5Y', 'MAX'];

  /* ---------- HELPERS ---------- */
  ECON.el = function (tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  };
  ECON.link = function (text, href, className) { var a = ECON.el('a', className, text); a.href = href; return a; };
  ECON.message = function (target, kind, text) {
    target.textContent = text || '';
    target.className = 'form-message' + (kind ? ' form-message-' + kind : '');
  };

  function group(whole) { return Math.abs(whole).toLocaleString('en-US'); }
  ECON.money = function (n) { n = Math.round(Number(n) || 0); return (n < 0 ? '-' : '') + ECON.CURRENCY + group(n); };
  ECON.price = function (n) {
    n = Number(n) || 0;
    return ECON.CURRENCY + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  ECON.count = function (n) { return group(Math.floor(Number(n) || 0)); };
  /* Under 0.005% counts as no change, and gets no + sign (same rule as the game) */
  ECON.isFlat = function (p) { return !(Math.abs(Number(p) || 0) >= 0.005); };
  ECON.percent = function (p) {
    p = Number(p) || 0;
    if (ECON.isFlat(p)) return '0.00%';
    return (p > 0 ? '+' : '') + p.toFixed(2) + '%';
  };
  ECON.trend = function (p) { return ECON.isFlat(p) ? 'flat' : (p > 0 ? 'up' : 'down'); };
  ECON.day = function (seconds) { return seconds ? new Date(seconds * 1000).toISOString().slice(0, 10) : ''; };
  ECON.when = function (seconds) {
    if (!seconds) return '';
    var d = new Date(seconds * 1000);
    return d.toISOString().slice(0, 10) + ' ' + d.toISOString().slice(11, 16);
  };

  /* A square with the ticker in it (Roblox logos can't be shown outside the game) */
  ECON.monogram = function (ticker, size) {
    var m = ECON.el('span', 'econ-mono' + (size ? ' econ-mono-' + size : ''), ticker);
    m.setAttribute('aria-hidden', 'true');
    return m;
  };

  ECON.api = function (action, data) {
    return fetch('/api/economy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(Object.assign({ action: action }, data || {})),
    }).then(function (reply) {
      return reply.json().catch(function () { return { success: false, msg: 'Something went wrong. Please try again.' }; });
    }).catch(function () {
      return { success: false, msg: 'Couldn\'t reach the site. Check your connection and try again.' };
    });
  };

  var userPromise = null;
  ECON.user = function () {
    if (!userPromise) {
      userPromise = fetch('/api/auth/me', { credentials: 'same-origin' })
        .then(function (r) { return r.json(); })
        .then(function (a) { return a.user || null; })
        .catch(function () { return null; });
    }
    return userPromise;
  };

  ECON.loginButton = function (text) {
    return ECON.link(text || 'Log in with Discord', '/api/auth/login?next=' + encodeURIComponent(location.pathname + location.search + location.hash), 'button-discord');
  };

  /* ---------- THE CHART ---------- */
  /* points: [{ t: seconds, c: price }], oldest first. Draws a line, a soft fill under it,
     and shows the price under the pointer. */
  var SVG = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs) {
    var node = document.createElementNS(SVG, tag);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    return node;
  }

  ECON.chart = function (box, points, label) {
    box.textContent = '';
    if (!points || points.length < 2) {
      box.appendChild(ECON.el('p', 'econ-chart-empty', 'Not enough trading yet to draw a chart. It fills in as prices are recorded.'));
      return;
    }
    var W = Math.max(300, Math.round(box.getBoundingClientRect().width) || 800), H = W < 520 ? 200 : 260, PAD_T = 16, PAD_B = 28, PAD_L = 8, PAD_R = 64;
    var values = points.map(function (p) { return p.c; });
    var min = Math.min.apply(null, values), max = Math.max.apply(null, values);
    if (max - min < 1e-9) { var pad = Math.max(max * 0.02, 0.5); min -= pad; max += pad; }
    var x = function (i) { return PAD_L + (W - PAD_L - PAD_R) * (i / (points.length - 1)); };
    var y = function (v) { return PAD_T + (H - PAD_T - PAD_B) * (1 - (v - min) / (max - min)); };
    var first = points[0].c, last = points[points.length - 1].c;
    var trend = ECON.trend(first > 0 ? (last - first) / first * 100 : 0);

    var chart = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'econ-chart econ-chart-' + trend, role: 'img' });
    chart.setAttribute('aria-label', (label || 'Price chart') + ': from ' + ECON.price(points[0].c) + ' to ' + ECON.price(points[points.length - 1].c));

    var id = 'g' + Math.random().toString(36).slice(2, 8);
    var defs = svg('defs');
    var grad = svg('linearGradient', { id: id, x1: '0', y1: '0', x2: '0', y2: '1' });
    grad.appendChild(svg('stop', { offset: '0%', class: 'econ-chart-fill-top' }));
    grad.appendChild(svg('stop', { offset: '100%', class: 'econ-chart-fill-bottom' }));
    defs.appendChild(grad);
    chart.appendChild(defs);

    /* gridlines and price labels: top, middle, bottom */
    [max, (max + min) / 2, min].forEach(function (v) {
      chart.appendChild(svg('line', { x1: PAD_L, x2: W - PAD_R, y1: y(v), y2: y(v), class: 'econ-chart-grid' }));
      var label = svg('text', { x: W - PAD_R + 8, y: y(v) + 4, class: 'econ-chart-axis' });
      label.textContent = ECON.price(v);
      chart.appendChild(label);
    });
    /* first and last time */
    [[0, 'start'], [points.length - 1, 'end']].forEach(function (pair) {
      var tl = svg('text', { x: x(pair[0]), y: H - 8, 'text-anchor': pair[1], class: 'econ-chart-axis' });
      tl.textContent = ECON.when(points[pair[0]].t);
      chart.appendChild(tl);
    });

    var line = points.map(function (p, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.c).toFixed(1); }).join(' ');
    chart.appendChild(svg('path', { d: line + ' L' + x(points.length - 1).toFixed(1) + ' ' + (H - PAD_B) + ' L' + x(0).toFixed(1) + ' ' + (H - PAD_B) + ' Z', fill: 'url(#' + id + ')', class: 'econ-chart-area' }));
    chart.appendChild(svg('path', { d: line, class: 'econ-chart-line' }));
    chart.appendChild(svg('circle', { cx: x(points.length - 1), cy: y(points[points.length - 1].c), r: 4, class: 'econ-chart-dot' }));

    /* hover: a line and the price at that point */
    var cross = svg('line', { y1: PAD_T, y2: H - PAD_B, class: 'econ-chart-cross', visibility: 'hidden' });
    var spot = svg('circle', { r: 4, class: 'econ-chart-spot', visibility: 'hidden' });
    chart.appendChild(cross);
    chart.appendChild(spot);
    var tip = ECON.el('div', 'econ-chart-tip');
    tip.hidden = true;

    function show(clientX) {
      var rect = chart.getBoundingClientRect();
      var px = (clientX - rect.left) / rect.width * W;
      var i = Math.round((px - PAD_L) / (W - PAD_L - PAD_R) * (points.length - 1));
      i = Math.max(0, Math.min(points.length - 1, i));
      cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i));
      spot.setAttribute('cx', x(i)); spot.setAttribute('cy', y(points[i].c));
      cross.setAttribute('visibility', 'visible'); spot.setAttribute('visibility', 'visible');
      tip.hidden = false;
      tip.textContent = ECON.price(points[i].c) + ' · ' + ECON.when(points[i].t);
      tip.style.left = Math.min(Math.max(x(i) / W * 100, 10), 82) + '%';
    }
    function hide() { cross.setAttribute('visibility', 'hidden'); spot.setAttribute('visibility', 'hidden'); tip.hidden = true; }
    chart.addEventListener('pointermove', function (e) { show(e.clientX); });
    chart.addEventListener('pointerleave', hide);

    var wrap = ECON.el('div', 'econ-chart-wrap');
    wrap.appendChild(chart);
    wrap.appendChild(tip);
    box.appendChild(wrap);
  };

  /* Range buttons (1D ... MAX). onPick(range) runs when one is chosen. */
  ECON.rangeButtons = function (current, onPick) {
    var row = ECON.el('div', 'econ-ranges');
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', 'Chart range');
    ECON.RANGES.forEach(function (r) {
      var b = ECON.el('button', 'econ-range', r);
      b.type = 'button';
      b.setAttribute('aria-pressed', r === current ? 'true' : 'false');
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(row.children, function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        onPick(r);
      });
      row.appendChild(b);
    });
    return row;
  };

  window.ECON = ECON;
})();
