/* ==============================================================
   economy.js - the Economy page (economy.html)

   1. STOCK MARKET    every listed corporation and its price
   2. CORPORATIONS    every corporation, as cards
   3. REGISTER        the form to register one (Discord login)
   4. PORTFOLIO       your brokerage balance, shares, unpaid registrations
                      and recent history (Discord login)

   Prices refresh every 20 seconds while the page is open.
   ============================================================== */
(function () {
  var E = window.ECON;
  var el = E.el;
  var marketRoot = document.getElementById('market-root');
  var statsRoot = document.getElementById('market-stats');
  var corpsRoot = document.getElementById('corps-root');
  var registerRoot = document.getElementById('register-root');
  var portfolioRoot = document.getElementById('portfolio-root');
  if (!marketRoot) return;

  /* ---------- SETTINGS ---------- */
  var REFRESH_SECONDS = 20;

  var types = [];
  var user = null;

  /* ---------- 1. STOCK MARKET ---------- */
  function drawMarket(companies) {
    var listed = companies.filter(function (c) { return c.state !== 'Raising'; });
    var cap = listed.reduce(function (sum, c) { return sum + c.marketCap; }, 0);

    statsRoot.textContent = '';
    [['Corporations', E.count(companies.length)], ['Stocks listed', E.count(listed.length)], ['Raising', E.count(companies.length - listed.length)], ['Market value', E.money(cap)]].forEach(function (s) {
      var tile = el('div', 'market-stat');
      tile.appendChild(el('span', 'market-stat-label', s[0]));
      tile.appendChild(el('strong', null, s[1]));
      statsRoot.appendChild(tile);
    });

    marketRoot.textContent = '';
    if (!listed.length) {
      marketRoot.appendChild(el('p', 'form-note', 'Nothing is listed yet.'));
      return;
    }
    var scroll = el('div', 'econ-table-scroll');
    var table = el('table', 'econ-table');
    var head = el('tr');
    [['Corporation', ''], ['Price', 'num'], ['24h', 'num'], ['Market value', 'num hide-small'], ['Status', 'hide-small']].forEach(function (h) {
      var th = el('th', h[1], h[0]);
      th.scope = 'col';
      head.appendChild(th);
    });
    var thead = el('thead'); thead.appendChild(head); table.appendChild(thead);
    var tbody = el('tbody');
    listed.forEach(function (c) {
      var tr = el('tr');
      var first = el('td');
      var a = E.link('', 'company.html?t=' + encodeURIComponent(c.ticker), 'econ-row-link');
      a.appendChild(E.monogram(c.ticker));
      var names = el('span', 'econ-row-names');
      names.appendChild(el('strong', null, c.name));
      names.appendChild(el('span', 'econ-ticker', c.ticker + ' · ' + c.typeName));
      a.appendChild(names);
      first.appendChild(a);
      tr.appendChild(first);
      tr.appendChild(el('td', 'num mono', E.price(c.price)));
      tr.appendChild(el('td', 'num mono econ-' + E.trend(c.changePct), E.percent(c.changePct)));
      tr.appendChild(el('td', 'num mono hide-small', E.money(c.marketCap)));
      var st = el('td', 'hide-small');
      st.appendChild(el('span', 'econ-chip econ-chip-' + c.state.toLowerCase(), c.stateName));
      tr.appendChild(st);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    scroll.appendChild(table);
    marketRoot.appendChild(scroll);
  }

  /* ---------- 2. CORPORATIONS ---------- */
  function drawCorps(companies) {
    corpsRoot.textContent = '';
    if (!companies.length) {
      corpsRoot.appendChild(el('p', 'form-note', 'No corporations yet. Be the first to register one.'));
      return;
    }
    var grid = el('div', 'corp-grid');
    companies.slice().sort(function (a, b) { return b.memberCount - a.memberCount || a.name.localeCompare(b.name); }).forEach(function (c) {
      var card = E.link('', 'company.html?t=' + encodeURIComponent(c.ticker), 'corp-card');
      var top = el('div', 'corp-card-top');
      top.appendChild(E.monogram(c.ticker));
      top.appendChild(el('span', 'econ-chip econ-chip-' + c.state.toLowerCase(), c.stateName));
      card.appendChild(top);
      card.appendChild(el('h3', null, c.name));
      card.appendChild(el('p', 'corp-card-type', c.ticker + ' · ' + c.typeName));
      if (c.description) card.appendChild(el('p', 'corp-card-desc', c.description));
      var meta = el('p', 'corp-card-meta');
      meta.textContent = c.levelName + ' · ' + E.count(c.memberCount) + (c.memberCount === 1 ? ' member' : ' members') +
        (c.state === 'Raising' ? ' · raising at ' + E.price(c.price) + ' a share' : ' · ' + E.price(c.price));
      card.appendChild(meta);
      grid.appendChild(card);
    });
    corpsRoot.appendChild(grid);
  }

  /* ---------- 3. REGISTER ---------- */
  function field(labelText, input, hint) {
    var wrap = el('label', 'field');
    wrap.appendChild(el('span', 'field-label', labelText));
    wrap.appendChild(input);
    if (hint) wrap.appendChild(el('span', 'field-hint', hint));
    return wrap;
  }

  function loginCard(title, text) {
    var card = el('div', 'login-card');
    card.appendChild(el('h3', null, title));
    card.appendChild(el('p', null, text));
    card.appendChild(E.loginButton());
    card.appendChild(el('p', 'login-small', 'Your Discord account needs to be linked to your Roblox account (verify in the Yellonia Discord server).'));
    return card;
  }

  function drawRegister(me) {
    registerRoot.textContent = '';
    if (!user) {
      registerRoot.appendChild(loginCard('Log in to register a corporation', 'Corporations belong to your Roblox account, which we find through your Discord login.'));
      return;
    }
    if (!me || !me.linked) {
      registerRoot.appendChild(el('p', 'report-notice', me && me.success === false ? me.msg : 'Your Discord isn\'t linked to a Roblox account yet. Verify in the Yellonia Discord server, then come back.'));
      return;
    }
    if (me.pending && me.pending.length) {
      var p = me.pending[0];
      registerRoot.appendChild(el('p', 'report-notice', p.name + ' (' + p.ticker + ') is reserved for you and waiting for its ' + E.money(p.cost) +
        ' founding fee. Join the game with that much in your Wallet and Bank and it opens automatically. You can cancel it under Your Portfolio.'));
      return;
    }

    var form = el('form', 'news-form econ-register');
    form.noValidate = true;
    var intro = el('p', 'form-note', 'The founding fee is taken from your Wallet and Bank the next time you join the game. Roblox\'s text filter checks the name then; if it isn\'t allowed, the registration is cancelled and you aren\'t charged.');
    form.appendChild(intro);

    var name = el('input'); name.type = 'text'; name.maxLength = 40; name.autocomplete = 'off'; name.placeholder = 'e.g. Hermes Bank International';
    form.appendChild(field('Name', name, '3-40 characters: letters, numbers, spaces and . , & \' -'));

    var type = el('select');
    var none = el('option', null, 'Pick a type'); none.value = ''; type.appendChild(none);
    types.forEach(function (t) {
      var o = el('option', null, t.Name + ' · ' + E.money(t.CreationCost));
      o.value = t.Id;
      type.appendChild(o);
    });
    var typeHint = el('span', 'field-hint', 'Decides the founding fee and how many shares there are.');
    var typeField = field('Type', type);
    typeField.appendChild(typeHint);
    form.appendChild(typeField);
    type.addEventListener('change', function () {
      var t = types.filter(function (x) { return x.Id === type.value; })[0];
      typeHint.textContent = t ? t.Description + ' Fee ' + E.money(t.CreationCost) + '. ' + E.count(t.SharesIssued) + ' shares; you get ' + E.count(t.FounderShares) + ', others buy in at ' + E.price(t.IPOPrice) + ' while you raise money.' : 'Decides the founding fee and how many shares there are.';
    });

    var ticker = el('input'); ticker.type = 'text'; ticker.maxLength = 5; ticker.autocomplete = 'off'; ticker.className = 'mono';
    form.appendChild(field('Ticker (optional)', ticker, '2-5 letters, e.g. KLBR. Leave it empty and one is made from the name.'));
    ticker.addEventListener('input', function () { ticker.value = ticker.value.toUpperCase().replace(/[^A-Z]/g, ''); });
    name.addEventListener('blur', function () {
      if (ticker.value || name.value.trim().length < 3) return;
      E.api('suggest', { name: name.value.trim() }).then(function (a) { if (a.success && a.ticker && !ticker.value) ticker.placeholder = a.ticker; });
    });

    var desc = el('textarea'); desc.rows = 3; desc.maxLength = 400;
    form.appendChild(field('Description (optional)', desc));

    var logo = el('input'); logo.type = 'text'; logo.maxLength = 20; logo.autocomplete = 'off'; logo.inputMode = 'numeric';
    form.appendChild(field('Logo decal ID (optional)', logo, 'From the Roblox website. Shown in-game; you can change it later from the Company Dashboard.'));

    var msg = el('p', 'form-message'); msg.setAttribute('role', 'status');
    form.appendChild(msg);
    var send = el('button', 'button-primary', 'Reserve my corporation'); send.type = 'submit';
    form.appendChild(send);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (name.value.trim().length < 3) { E.message(msg, 'error', 'Give it a name (3-40 characters).'); name.focus(); return; }
      if (!type.value) { E.message(msg, 'error', 'Pick a type.'); type.focus(); return; }
      send.disabled = true;
      E.message(msg, '', 'Reserving…');
      E.api('register', { name: name.value.trim(), typeId: type.value, ticker: ticker.value, description: desc.value.trim(), logoId: logo.value.replace(/\D/g, '') }).then(function (a) {
        send.disabled = false;
        if (a.needsLogin) { location.reload(); return; }
        if (!a.success) { E.message(msg, 'error', a.msg); return; }
        loadMine();
      });
    });
    registerRoot.appendChild(form);
  }

  /* ---------- 4. PORTFOLIO ---------- */
  function tile(label, value, extra) {
    var t = el('div', 'market-stat' + (extra ? ' ' + extra : ''));
    t.appendChild(el('span', 'market-stat-label', label));
    t.appendChild(el('strong', null, value));
    return t;
  }

  var HISTORY_WORDS = { buy: 'Bought', sell: 'Sold', founded: 'Founded', deposit: 'Deposited into brokerage', withdraw: 'Withdrew from brokerage', rejected: 'Registration cancelled' };
  var WHERE = { GAME: 'in-game', WEB: 'website', DISCORD: 'Discord' };

  function drawPortfolio(me) {
    portfolioRoot.textContent = '';
    if (!user) {
      portfolioRoot.appendChild(loginCard('Log in to see your portfolio', 'See your shares and trade with your brokerage balance.'));
      return;
    }
    if (!me || !me.linked) {
      portfolioRoot.appendChild(el('p', 'report-notice', me && me.success === false ? me.msg : 'Your Discord isn\'t linked to a Roblox account yet. Verify in the Yellonia Discord server, then come back.'));
      return;
    }

    var bar = el('div', 'account-bar');
    bar.appendChild(el('span', null, 'Roblox account: '));
    bar.appendChild(el('strong', null, me.linked.name));
    portfolioRoot.appendChild(bar);

    var stats = el('div', 'market-stats');
    stats.appendChild(tile('Brokerage balance', E.money(me.cash), 'market-stat-gold'));
    stats.appendChild(tile('Shares worth', E.money(me.holdingsValue)));
    stats.appendChild(tile('Total', E.money(me.cash + me.holdingsValue)));
    portfolioRoot.appendChild(stats);
    portfolioRoot.appendChild(el('p', 'form-note', 'To add or take out brokerage Y$, open the market in-game: Portfolio tab. Selling here pays into this balance.'));

    /* unpaid registrations */
    (me.pending || []).forEach(function (p) {
      var box = el('div', 'econ-pending');
      box.appendChild(el('strong', null, p.name + ' (' + p.ticker + ')'));
      box.appendChild(el('p', null, 'Waiting for its ' + E.money(p.cost) + ' founding fee. It\'s taken from your Wallet and Bank when you next join the game.'));
      var cancel = el('button', 'button-small', 'Cancel registration');
      cancel.type = 'button';
      var armed = false;
      cancel.addEventListener('click', function () {
        if (!armed) { armed = true; cancel.textContent = 'Click again to cancel'; cancel.classList.add('button-armed'); return; }
        cancel.disabled = true;
        E.api('cancel', { ticker: p.ticker }).then(function () { loadMine(); });
      });
      box.appendChild(cancel);
      portfolioRoot.appendChild(box);
    });

    /* shares */
    portfolioRoot.appendChild(el('h3', 'econ-subhead', 'Your shares'));
    if (!me.holdings.length) {
      portfolioRoot.appendChild(el('p', 'form-note', 'You don\'t own any shares yet. Pick a corporation in the Stock Market above.'));
    } else {
      var scroll = el('div', 'econ-table-scroll');
      var table = el('table', 'econ-table');
      var head = el('tr');
      [['Corporation', ''], ['Shares', 'num'], ['Price', 'num'], ['Value', 'num'], ['24h', 'num hide-small']].forEach(function (h) { var th = el('th', h[1], h[0]); th.scope = 'col'; head.appendChild(th); });
      var thead = el('thead'); thead.appendChild(head); table.appendChild(thead);
      var tbody = el('tbody');
      me.holdings.forEach(function (h) {
        var tr = el('tr');
        var td = el('td');
        var a = E.link('', 'company.html?t=' + encodeURIComponent(h.ticker), 'econ-row-link');
        a.appendChild(E.monogram(h.ticker));
        var n = el('span', 'econ-row-names'); n.appendChild(el('strong', null, h.name)); n.appendChild(el('span', 'econ-ticker', h.ticker));
        a.appendChild(n); td.appendChild(a); tr.appendChild(td);
        tr.appendChild(el('td', 'num mono', E.count(h.youOwn)));
        tr.appendChild(el('td', 'num mono', E.price(h.price)));
        tr.appendChild(el('td', 'num mono', E.money(h.youOwn * h.price)));
        tr.appendChild(el('td', 'num mono hide-small econ-' + E.trend(h.changePct), E.percent(h.changePct)));
        tbody.appendChild(tr);
      });
      table.appendChild(tbody); scroll.appendChild(table); portfolioRoot.appendChild(scroll);
    }

    /* history */
    portfolioRoot.appendChild(el('h3', 'econ-subhead', 'Recent history'));
    if (!me.history.length) {
      portfolioRoot.appendChild(el('p', 'form-note', 'Nothing yet.'));
    } else {
      var list = el('ul', 'econ-history');
      me.history.slice(0, 15).forEach(function (h) {
        var li = el('li');
        var what = (HISTORY_WORDS[h.kind] || h.kind) + (h.kind === 'buy' || h.kind === 'sell' ? ' ' + E.count(h.shares) + ' ' + h.ticker : (h.ticker ? ' ' + h.ticker : ''));
        li.appendChild(el('span', 'econ-history-what', what));
        var money = h.kind === 'rejected' ? '' : ((h.kind === 'sell' || h.kind === 'withdraw') ? '+' : '-') + E.money(h.total);
        li.appendChild(el('span', 'mono econ-history-money ' + (h.kind === 'sell' || h.kind === 'withdraw' ? 'econ-up' : ''), money));
        li.appendChild(el('span', 'econ-history-when', E.when(h.at) + ' · ' + (WHERE[h.source] || h.source) + (h.note ? ' · ' + h.note : '')));
        list.appendChild(li);
      });
      portfolioRoot.appendChild(list);
    }
  }

  /* ---------- LOADING ---------- */
  function loadMarket() {
    return E.api('market').then(function (a) {
      if (!a.success) {
        marketRoot.textContent = '';
        marketRoot.appendChild(el('p', 'form-message form-message-error', a.msg || 'Couldn\'t load the market.'));
        corpsRoot.textContent = '';
        return;
      }
      types = (a.types && a.types.types) || types;
      drawMarket(a.companies);
      drawCorps(a.companies);
    });
  }

  function loadMine() {
    if (!user) { drawRegister(null); drawPortfolio(null); return Promise.resolve(); }
    return E.api('me').then(function (me) {
      drawRegister(me);
      drawPortfolio(me);
    });
  }

  E.user().then(function (u) {
    user = u;
    return loadMarket();
  }).then(loadMine);

  setInterval(function () { if (!document.hidden) loadMarket(); }, REFRESH_SECONDS * 1000);
})();
