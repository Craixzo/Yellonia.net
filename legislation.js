/* ==============================================================
   legislation.js - the Bills and laws page (legislation.html)

   Reads bills from two places and shows them as one list:
     bills.json          bills typed into the file in the site's repo
     /api/legislation    bills added in Discord with /bill-add
   If both have a bill with the same number, the Discord one is shown.
   Party colors come from the Parliament seat chart (/api/parliament).

   CONTENTS
     1. SETTINGS AND HELPERS
     2. ONE BILL
     3. SEARCH AND FILTERS
     4. START
   ============================================================== */

(function () {

  /* ---------- 1. SETTINGS AND HELPERS ---------- */
  var root = document.getElementById('bills');
  if (!root) return;
  var listEl = document.getElementById('bill-list');
  var countEl = document.getElementById('bill-count');
  var searchEl = document.getElementById('bill-search');
  var filterEl = document.getElementById('bill-filters');

  /* The words shown for each status, and the filter buttons (in order) */
  var STATUS = {
    pending:   'In Parliament',
    passed:    'Passed by Parliament',
    signed:    'Signed into law',
    vetoed:    'Vetoed',
    failed:    'Failed',
    withdrawn: 'Withdrawn',
  };
  var FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'signed', label: 'Laws' },
    { value: 'pending', label: 'In Parliament' },
    { value: 'passed', label: 'Passed' },
    { value: 'vetoed', label: 'Vetoed' },
    { value: 'failed', label: 'Failed' },
  ];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  var bills = [], partyColors = {}, filter = 'all';

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function niceDate(value) {
    var parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    return parts ? MONTHS[Number(parts[2]) - 1] + ' ' + Number(parts[3]) + ', ' + parts[1] : '';
  }

  /* The most recent date on a bill, for sorting newest first */
  function latest(bill) { return bill.signed || bill.passed || bill.introduced || ''; }

  function getJson(url) {
    return fetch(url).then(function (reply) { return reply.ok ? reply.json() : null; }).catch(function () { return null; });
  }

  function anchor(bill) { return 'bill-' + String(bill.number).toLowerCase().replace(/[^a-z0-9]+/g, '-'); }


  /* ---------- 2. ONE BILL ---------- */
  function billCard(bill) {
    var card = el('article', 'bill bill-' + bill.status);
    card.id = anchor(bill);

    var top = el('div', 'bill-top');
    var number = el('a', 'bill-number', 'Bill ' + bill.number);
    number.href = '#' + card.id;
    number.title = 'Link to this bill';
    top.appendChild(number);
    top.appendChild(el('span', 'bill-status', STATUS[bill.status] || STATUS.pending));
    card.appendChild(top);

    card.appendChild(el('h2', 'bill-title', bill.title));
    if (bill.summary) card.appendChild(el('p', 'bill-summary', bill.summary));

    /* Who and when */
    var facts = el('dl', 'bill-facts');
    function fact(label, value, color) {
      if (!value) return;
      var item = el('div');
      item.appendChild(el('dt', null, label));
      var dd = el('dd', null, value);
      if (color) { dd.classList.add('bill-party'); dd.style.setProperty('--party', color); }
      item.appendChild(dd);
      facts.appendChild(item);
    }
    fact('Introduced by', bill.sponsor);
    fact('Party', bill.party, bill.party && partyColors[bill.party.toLowerCase()]);
    fact('Introduced', niceDate(bill.introduced));
    fact('Passed Parliament', niceDate(bill.passed));
    fact(bill.status === 'vetoed' ? 'Vetoed' : 'Signed by the Emperor', niceDate(bill.signed));
    if (facts.children.length) card.appendChild(facts);

    /* The vote, as a bar split into for / against / abstain */
    if (bill.votes) {
      var total = bill.votes.for + bill.votes.against + bill.votes.abstain;
      var vote = el('div', 'bill-vote');
      var bar = el('div', 'vote-bar');
      bar.setAttribute('role', 'img');
      bar.setAttribute('aria-label', bill.votes.for + ' for, ' + bill.votes.against + ' against, ' + bill.votes.abstain + ' abstaining');
      [['for', bill.votes.for], ['against', bill.votes.against], ['abstain', bill.votes.abstain]].forEach(function (part) {
        if (!part[1] || !total) return;
        var piece = el('span', 'vote-' + part[0]);
        piece.style.width = (part[1] / total * 100) + '%';
        bar.appendChild(piece);
      });
      vote.appendChild(bar);
      var key = el('p', 'vote-key');
      [['for', bill.votes.for, 'for'], ['against', bill.votes.against, 'against'], ['abstain', bill.votes.abstain, 'abstaining']].forEach(function (part) {
        var item = el('span', 'vote-key-' + part[0]);
        item.appendChild(el('strong', null, String(part[1])));
        item.appendChild(document.createTextNode(' ' + part[2]));
        key.appendChild(item);
      });
      vote.appendChild(key);
      card.appendChild(vote);
    }

    /* Full text (opens and closes), and/or a link to it */
    if (bill.text || bill.link) {
      var more = el('div', 'bill-more');
      if (bill.text) {
        var details = el('details', 'bill-text');
        details.appendChild(el('summary', null, 'Read the full text'));
        bill.text.split(/\n+/).forEach(function (paragraph) {
          if (paragraph.trim()) details.appendChild(el('p', null, paragraph.trim()));
        });
        more.appendChild(details);
      }
      if (bill.link) {
        var link = el('a', 'text-link', 'Open the full text');
        link.href = bill.link;
        link.target = '_blank';
        link.rel = 'noopener';
        more.appendChild(link);
      }
      card.appendChild(more);
    }
    return card;
  }


  /* ---------- 3. SEARCH AND FILTERS ---------- */
  FILTERS.forEach(function (option) {
    var chip = el('button', 'bill-filter', option.label);
    chip.type = 'button';
    chip.setAttribute('data-filter', option.value);
    chip.setAttribute('aria-pressed', option.value === filter ? 'true' : 'false');
    chip.addEventListener('click', function () {
      filter = option.value;
      Array.prototype.forEach.call(filterEl.children, function (c) { c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'); });
      draw();
    });
    filterEl.appendChild(chip);
  });
  searchEl.addEventListener('input', draw);

  function draw() {
    var words = searchEl.value.toLowerCase().split(/\s+/).filter(Boolean);
    var shown = bills.filter(function (bill) {
      if (filter !== 'all' && bill.status !== filter) return false;
      var haystack = [bill.number, bill.title, bill.summary, bill.sponsor, bill.party, bill.text].join(' ').toLowerCase();
      return words.every(function (word) { return haystack.indexOf(word) !== -1; });
    });

    listEl.textContent = '';
    if (!bills.length) {
      listEl.appendChild(el('p', 'bill-empty', 'No bills have been recorded yet.'));
    } else if (!shown.length) {
      listEl.appendChild(el('p', 'bill-empty', 'No bills match your search.'));
    }
    shown.forEach(function (bill) { listEl.appendChild(billCard(bill)); });
    var laws = bills.filter(function (b) { return b.status === 'signed'; }).length;
    countEl.textContent = bills.length
      ? (shown.length === bills.length ? bills.length + ' bill' + (bills.length === 1 ? '' : 's') : shown.length + ' of ' + bills.length + ' bills') + ' | ' + laws + ' signed into law'
      : '';
  }

  /* Opens and scrolls to a bill when the address ends in #bill-NUMBER */
  function showLinked() {
    var target = location.hash && document.getElementById(location.hash.slice(1));
    if (!target) return;
    var details = target.querySelector('details');
    if (details) details.open = true;
    target.classList.add('bill-linked');
    target.scrollIntoView({ block: 'start' });
  }
  window.addEventListener('hashchange', showLinked);


  /* ---------- 4. START ---------- */
  Promise.all([getJson('bills.json'), getJson('/api/legislation'), getJson('/api/parliament')]).then(function (answers) {
    var fromFile = answers[0] && Array.isArray(answers[0].bills) ? answers[0].bills : [];
    var fromDiscord = answers[1] && Array.isArray(answers[1].bills) ? answers[1].bills : [];
    ((answers[2] && answers[2].parties) || []).forEach(function (party) { partyColors[String(party.name).toLowerCase()] = party.color; });

    var byNumber = {};
    fromFile.concat(fromDiscord).forEach(function (bill) {     /* Discord bills come second, so they replace file bills with the same number */
      if (!bill || !bill.number || !bill.title) return;
      bill.number = String(bill.number);
      if (!STATUS[bill.status]) bill.status = 'pending';
      if (bill.votes) bill.votes = { for: Number(bill.votes.for) || 0, against: Number(bill.votes.against) || 0, abstain: Number(bill.votes.abstain) || 0 };
      if (bill.link && !/^https:\/\//.test(bill.link)) bill.link = null;
      byNumber[bill.number.toLowerCase()] = bill;
    });
    bills = Object.keys(byNumber).map(function (key) { return byNumber[key]; });
    bills.sort(function (a, b) { return latest(b).localeCompare(latest(a)) || String(b.number).localeCompare(String(a.number), undefined, { numeric: true }); });

    root.classList.remove('is-loading');
    draw();
    showLinked();
  });
})();
