/* ==============================================================
   company.js - one corporation (company.html?t=KLBR)

   1. HEADER     name, ticker, price and today's change
   2. CHART      with the 1D ... MAX range buttons
   3. TRADE      buy and sell with your brokerage balance (Discord login)
   4. DETAILS    treasury, shares, level, listing progress, announcements

   The price refreshes every 15 seconds while the page is open.
   ============================================================== */
(function () {
  var E = window.ECON;
  var el = E.el;
  var root = document.getElementById('company-root');
  if (!root) return;

  /* ---------- SETTINGS ---------- */
  var REFRESH_SECONDS = 15;

  var ticker = (new URLSearchParams(location.search).get('t') || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
  var range = '1D';
  var user = null;
  var me = null;
  var parts = {};

  if (!ticker) { root.textContent = ''; root.appendChild(el('p', 'form-message form-message-error', 'No corporation picked.')); return; }

  /* ---------- 1. HEADER ---------- */
  function drawHeader(c) {
    document.title = c.name + ' (' + c.ticker + ') | Yellonia';
    var head = el('header', 'company-head');
    head.appendChild(E.monogram(c.ticker, 'large'));
    var names = el('div', 'company-names');
    var h1 = el('h1', null, c.name);
    names.appendChild(h1);
    var sub = el('p', 'company-sub');
    sub.appendChild(el('span', 'mono', c.ticker));
    sub.appendChild(document.createTextNode(' · ' + c.typeName + ' · '));
    sub.appendChild(el('span', 'econ-chip econ-chip-' + c.state.toLowerCase(), c.stateName));
    if (c.system) sub.appendChild(document.createTextNode(' · founding company'));
    names.appendChild(sub);
    head.appendChild(names);

    var quote = el('div', 'company-quote');
    parts.price = el('strong', 'company-price mono', E.price(c.price));
    parts.change = el('span', 'company-change mono econ-' + E.trend(c.changePct), E.percent(c.changePct) + ' today');
    quote.appendChild(parts.price);
    quote.appendChild(parts.change);
    if (c.state === 'Raising') quote.appendChild(el('span', 'company-note', 'Fixed price until it lists'));
    head.appendChild(quote);
    return head;
  }

  function updateQuote(c) {
    if (!parts.price) return;
    parts.price.textContent = E.price(c.price);
    parts.change.textContent = E.percent(c.changePct) + ' today';
    parts.change.className = 'company-change mono econ-' + E.trend(c.changePct);
  }

  /* ---------- 2. CHART ---------- */
  function drawChart(points) {
    var box = el('section', 'company-chart');
    box.setAttribute('aria-label', 'Price chart');
    parts.chart = el('div');
    box.appendChild(E.rangeButtons(range, function (r) { range = r; loadChart(); }));
    box.appendChild(parts.chart);
    parts.points = points;
    return box;
  }

  function loadChart() {
    E.api('history', { ticker: ticker, range: range }).then(function (a) {
      if (a.success && parts.chart) { parts.points = a.points; E.chart(parts.chart, a.points, ticker + ' price'); }
    });
  }

  /* ---------- 3. TRADE ---------- */
  function drawTrade(c) {
    var box = el('section', 'trade-box');
    box.appendChild(el('h2', null, 'Trade ' + c.ticker));

    if (!user) {
      box.appendChild(el('p', null, 'Log in to buy and sell with your brokerage balance.'));
      box.appendChild(E.loginButton());
      box.appendChild(el('p', 'login-small', 'Or trade in-game, or on Discord with /buy and /sell.'));
      return box;
    }
    if (!me || !me.linked) {
      box.appendChild(el('p', 'report-notice', me && me.success === false ? me.msg : 'Your Discord isn\'t linked to a Roblox account yet. Verify in the Yellonia Discord server, then come back.'));
      return box;
    }

    var balance = el('dl', 'trade-balance');
    function row(term, value) { balance.appendChild(el('dt', null, term)); var dd = el('dd', 'mono', value); balance.appendChild(dd); return dd; }
    parts.cash = row('Brokerage balance', E.money(me.cash));
    parts.owned = row('You own', E.count(c.youOwn) + ' shares');
    box.appendChild(balance);

    var form = el('form', 'trade-form');
    form.noValidate = true;
    var label = el('label', 'field');
    label.appendChild(el('span', 'field-label', 'Shares'));
    var amount = el('input');
    amount.type = 'number'; amount.min = '1'; amount.max = '1000'; amount.step = '1'; amount.value = '10'; amount.inputMode = 'numeric';
    label.appendChild(amount);
    form.appendChild(label);

    var estimate = el('p', 'trade-estimate', '');
    estimate.setAttribute('aria-live', 'polite');
    form.appendChild(estimate);

    var buttons = el('div', 'trade-buttons');
    var buy = el('button', 'button-primary trade-buy', 'Buy'); buy.type = 'button';
    var sell = el('button', 'button-secondary trade-sell', 'Sell'); sell.type = 'button';
    var max = el('button', 'button-small', 'Max I can buy'); max.type = 'button';
    buttons.appendChild(buy); buttons.appendChild(sell); buttons.appendChild(max);
    form.appendChild(buttons);
    var msg = el('p', 'form-message'); msg.setAttribute('role', 'status');
    form.appendChild(msg);
    box.appendChild(form);
    box.appendChild(el('p', 'form-note trade-help', 'A 2% fee goes to the corporation\'s treasury on every trade. Add brokerage Y$ in-game (market → Portfolio).'));

    var token = 0;
    function preview() {
      var n = Math.floor(Number(amount.value) || 0);
      if (n < 1) { estimate.textContent = ''; return; }
      var mine = ++token;
      Promise.all([E.api('preview', { ticker: ticker, amount: n, buying: true }), E.api('preview', { ticker: ticker, amount: n, buying: false })]).then(function (both) {
        if (mine !== token) return;
        var b = both[0], s = both[1];
        if (!b.success) { estimate.textContent = b.msg; return; }
        estimate.textContent = 'Buying ' + E.count(n) + ' costs ' + E.money(b.total) + ' · selling ' + E.count(n) + ' pays ' + E.money(s.total || 0);
        max.dataset.max = b.maxAffordable;
      });
    }
    var timer;
    amount.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(preview, 250); });
    preview();

    max.addEventListener('click', function () {
      var n = Number(max.dataset.max || 0);
      if (n > 0) { amount.value = String(n); preview(); } else { E.message(msg, 'error', 'Your brokerage balance can\'t cover a share yet.'); }
    });

    function trade(buying) {
      var n = Math.floor(Number(amount.value) || 0);
      if (n < 1) { E.message(msg, 'error', 'Enter how many shares.'); amount.focus(); return; }
      buy.disabled = sell.disabled = true;
      E.message(msg, '', buying ? 'Buying…' : 'Selling…');
      E.api('trade', { ticker: ticker, amount: n, buying: buying }).then(function (a) {
        buy.disabled = sell.disabled = false;
        if (a.needsLogin) { location.reload(); return; }
        if (!a.success) { E.message(msg, 'error', a.msg); return; }
        E.message(msg, 'ok', a.msg);
        me.cash = a.cash;
        parts.cash.textContent = E.money(a.cash);
        parts.owned.textContent = E.count(a.company.youOwn) + ' shares';
        updateQuote(a.company);
        drawDetails(a.company, null, true);
        loadChart();
        preview();
      });
    }
    buy.addEventListener('click', function () { trade(true); });
    sell.addEventListener('click', function () { trade(false); });
    return box;
  }

  /* ---------- 4. DETAILS ---------- */
  function drawDetails(c, extra, keep) {
    if (!parts.details) return;
    var box = parts.details;
    box.textContent = '';

    var grid = el('dl', 'company-facts');
    function fact(term, value) { var w = el('div'); w.appendChild(el('dt', null, term)); w.appendChild(el('dd', 'mono', value)); grid.appendChild(w); }
    fact('Market value', E.money(c.marketCap));
    fact('Treasury', E.money(c.treasury));
    fact('Shares held', E.count(c.sharesHeld) + ' of ' + E.count(c.sharesIssued));
    fact('Shareholders', E.count(c.holders));
    fact('Level', c.levelName);
    fact('Members', E.count(c.memberCount));
    if (c.listedAt) fact('Listed', E.day(c.listedAt));
    else if (c.createdAt) fact('Founded', E.day(c.createdAt));
    box.appendChild(grid);

    if (c.state === 'Suspended') box.appendChild(el('p', 'report-notice', 'Suspended: the treasury can\'t cover sales right now. Buying still works and refills it.'));

    if (c.description) {
      box.appendChild(el('h2', 'econ-subhead', 'About'));
      box.appendChild(el('p', 'company-desc', c.description));
    }

    var listing = extra ? extra.listing : (keep ? parts.lastListing : null);
    if (extra) parts.lastListing = extra.listing;
    if (c.state === 'Raising' && listing) {
      box.appendChild(el('h2', 'econ-subhead', 'Before it can list'));
      if (listing.met) {
        box.appendChild(el('p', null, 'It meets every rule. The founder can take it public.'));
      } else {
        var ul = el('ul', 'listing-missing');
        listing.missing.forEach(function (m) { ul.appendChild(el('li', null, m)); });
        box.appendChild(ul);
        box.appendChild(el('p', 'form-note', 'A qualifying shareholder owns at least 25 shares and has spent at least ' + E.money(5000) + ' on them.'));
      }
      if (me && me.linked && me.founded && me.founded.indexOf(c.ticker) !== -1) {
        var go = el('button', 'button-primary', 'Take it public');
        go.type = 'button';
        go.disabled = !listing.met;
        var note = el('p', 'form-message');
        go.addEventListener('click', function () {
          go.disabled = true;
          E.api('list', { ticker: ticker }).then(function (a) {
            if (!a.success) { E.message(note, 'error', a.msg); go.disabled = false; return; }
            load();
          });
        });
        box.appendChild(go);
        box.appendChild(note);
      }
    }

    var announcements = extra ? extra.announcements : (keep ? parts.lastAnnouncements : []);
    if (extra) parts.lastAnnouncements = extra.announcements;
    if (announcements && announcements.length) {
      box.appendChild(el('h2', 'econ-subhead', 'Announcements'));
      var list = el('ul', 'company-announcements');
      announcements.forEach(function (a) {
        var li = el('li');
        li.appendChild(el('p', null, a.text));
        li.appendChild(el('span', 'econ-history-when', (a.userName ? a.userName + ' · ' : '') + E.day(a.at)));
        list.appendChild(li);
      });
      box.appendChild(list);
    }
  }

  /* ---------- LOADING ---------- */
  function load() {
    E.api('company', { ticker: ticker, range: range }).then(function (a) {
      root.textContent = '';
      if (!a.success) { root.appendChild(el('p', 'form-message form-message-error', a.msg || 'Couldn\'t load that corporation.')); return; }
      parts = {};
      var c = a.company;
      root.appendChild(drawHeader(c));
      var layout = el('div', 'company-layout');
      var left = el('div', 'company-main');
      layout.appendChild(left);
      var right = el('div', 'company-side');
      right.appendChild(drawTrade(c));
      layout.appendChild(right);
      parts.details = el('div', 'company-details');
      layout.appendChild(parts.details);
      root.appendChild(layout);
      left.appendChild(drawChart(a.history.points));   /* after it's on the page, so the chart knows its width */
      E.chart(parts.chart, parts.points, ticker + ' price');
      drawDetails(c, a);
    });
  }

  E.user().then(function (u) {
    user = u;
    if (!u) return null;
    return E.api('me').then(function (m) { me = m; });
  }).then(load);

  /* Redraw the chart at the new width when the window is resized */
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { if (parts.chart && parts.points) E.chart(parts.chart, parts.points, ticker + ' price'); }, 150);
  });

  /* Keep the price fresh without redrawing the trade box */
  setInterval(function () {
    if (document.hidden) return;
    E.api('history', { ticker: ticker, range: range }).then(function (a) {
      if (!a.success || !parts.chart) return;
      updateQuote({ price: a.price, changePct: a.changePct });
      parts.points = a.points;
      E.chart(parts.chart, a.points, ticker + ' price');
    });
  }, REFRESH_SECONDS * 1000);
})();
