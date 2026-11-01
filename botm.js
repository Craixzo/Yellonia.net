/* ==============================================================
   botm.js - Branch of the Month, on every page that shows it

   Reads /api/botm once and fills in whichever of these the page has:
     <section id="botm-banner">     homepage banner (index.html)
     <section class="group" id="army"> etc.   badge on the winning branch (armed-forces.html)
     <div id="botm-standings">      this month's live standings (branch-of-the-month.html)
     <div id="botm-history">        Hall of Fame (branch-of-the-month.html)

   Nothing shows until Centurion has decided at least one month.
   ============================================================== */

(function () {

  /* ---------- SETTINGS ---------- */

  /* Centurion's branch key -> the id of that branch's section on armed-forces.html,
     its short display name and its motto/blurb for the homepage banner */
  var BRANCHES = {
    army:     { section: 'army',            short: 'Army',            blurb: 'The ground force of the Empire.' },
    navy:     { section: 'navy',            short: 'Navy',            blurb: 'Control of the sea, and the force that carries the fight ashore.' },
    airforce: { section: 'air-force',       short: 'Air Force',       blurb: 'Control of the skies.' },
    mpc:      { section: 'military-police', short: 'Military Police', blurb: 'Law and ceremony.' },
    specwar:  { section: 'special-forces',  short: 'Special Forces',  blurb: 'The missions the regular forces can\'t take on.' },
  };


  /* ---------- HELPERS ---------- */

  function info(key) { return BRANCHES[key] || { section: '', short: key, blurb: '' }; }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function plural(count) { return count + (count === 1 ? ' event' : ' events'); }

  function winnerNames(winners) {
    return winners.map(function (w) { return info(w.key).short; }).join(' & ');
  }

  /* Bar list: one row per branch, longest bar = highest count */
  function standingsList(standings, winners) {
    var list = el('ol', 'botm-standings-list');
    var top = standings.length ? standings[0].count : 0;
    standings.forEach(function (entry) {
      var row = el('li', 'botm-row');
      var isWinner = winners && winners.some(function (w) { return w.key === entry.key; });
      if (isWinner) row.classList.add('botm-row-win');
      row.appendChild(el('span', 'botm-row-name', info(entry.key).short));
      var bar = el('span', 'botm-row-bar');
      var fill = el('span', 'botm-row-fill');
      fill.style.width = (top ? Math.round(entry.count / top * 100) : 0) + '%';
      bar.appendChild(fill);
      row.appendChild(bar);
      row.appendChild(el('span', 'botm-row-count', String(entry.count)));
      list.appendChild(row);
    });
    return list;
  }


  /* ---------- 1. HOMEPAGE BANNER ---------- */
  function fillBanner(data) {
    var banner = document.getElementById('botm-banner');
    if (!banner || !data.holder || !data.holder.winners.length) return;
    var holder = data.holder;
    var first = info(holder.winners[0].key);

    banner.querySelector('[data-botm="month"]').textContent = holder.label;
    banner.querySelector('[data-botm="name"]').textContent = winnerNames(holder.winners);
    banner.querySelector('[data-botm="blurb"]').textContent = holder.winners.length > 1 ? 'Tied for the most events hosted.' : first.blurb;
    var link = banner.querySelector('[data-botm="link"]');
    if (link && first.section) link.href = 'armed-forces.html#' + first.section;
    banner.hidden = false;
  }


  /* ---------- 2. BADGE ON THE ARMED FORCES PAGE ---------- */
  function fillBadges(data) {
    if (!data.holder) return;
    data.holder.winners.forEach(function (winner) {
      var id = info(winner.key).section;
      var section = id && document.getElementById(id);
      if (section) {
        var heading = section.querySelector('h2');
        var badge = el('a', 'botm-badge', 'Branch of the Month · ' + data.holder.label);
        badge.href = 'branch-of-the-month.html';
        if (heading) heading.appendChild(badge);   /* inside the heading, so it stays in the left column */
      }
      var tile = id && document.querySelector('.af-tile[href="#' + id + '"]');
      if (tile) tile.classList.add('botm-tile');
    });
  }


  /* ---------- 3. LIVE STANDINGS ---------- */
  function fillStandings(data) {
    var box = document.getElementById('botm-standings');
    if (!box) return;
    box.textContent = '';
    /* Manual mode: nothing to show until the month's winner has been set */
    if (!data.current || !data.current.standings.length) {
      box.appendChild(el('p', 'botm-note', 'This month\'s Branch of the Month will be announced when the month ends.'));
      return;
    }
    var decided = data.current.decided;                         /* true once the month's winner has been set */
    var winners = decided && data.holder && data.holder.month === data.current.month ? data.holder.winners : null;
    box.appendChild(el('h2', null, data.current.label + (decided ? ' (final)' : ' so far')));
    box.appendChild(standingsList(data.current.standings, winners));
    box.appendChild(el('p', 'botm-note', decided
      ? 'This month\'s Branch of the Month has been decided.'
      : data.mode === 'automatic'
        ? 'Every event hosted counts. The month closes at midnight (Eastern) on the 1st.'
        : 'Events are logged by staff. The winner is announced when the month ends.'));
  }


  /* ---------- 4. HALL OF FAME ---------- */
  function fillHistory(data) {
    var box = document.getElementById('botm-history');
    if (!box) return;
    box.textContent = '';
    if (!data.history.length) {
      box.appendChild(el('p', 'botm-note', 'No Branch of the Month has been crowned yet.'));
      return;
    }

    /* Title count per branch */
    var titles = {};
    data.history.forEach(function (month) {
      month.winners.forEach(function (w) { titles[w.key] = (titles[w.key] || 0) + 1; });
    });
    var tally = el('ul', 'botm-tally');
    Object.keys(titles).sort(function (a, b) { return titles[b] - titles[a]; }).forEach(function (key) {
      var item = el('li');
      item.appendChild(el('strong', null, String(titles[key])));
      item.appendChild(el('span', null, info(key).short));
      tally.appendChild(item);
    });
    box.appendChild(tally);

    var grid = el('div', 'botm-history-grid');
    data.history.forEach(function (month) {
      var card = el('article', 'botm-card');
      card.appendChild(el('p', 'botm-card-month', month.label));
      card.appendChild(el('h3', null, month.winners.length ? winnerNames(month.winners) : 'No winner'));
      if (month.winners.length) card.appendChild(el('p', 'botm-card-count', plural(month.winners[0].count)));
      if (month.standings.length > 1) {                          /* only when other branches were counted too */
        var more = el('details');
        more.appendChild(el('summary', null, 'Full standings'));
        more.appendChild(standingsList(month.standings, month.winners));
        card.appendChild(more);
      }
      grid.appendChild(card);
    });
    box.appendChild(grid);
  }


  /* ---------- RUN ---------- */
  fetch('/api/botm')
    .then(function (reply) { return reply.json(); })
    .then(function (data) {
      fillBanner(data);
      fillBadges(data);
      fillStandings(data);
      fillHistory(data);
    })
    .catch(function () { /* leave everything hidden */ });
})();
