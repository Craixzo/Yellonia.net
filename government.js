/* ==============================================================
   government.js - the live parts of the Government page

   CONTENTS
     1. PEOPLE ......... who holds each office (from the Roblox group)
     2. SEAT CHART ..... the Parliament chamber (from the Centurion bot)
   ============================================================== */


/* ---------- 1. PEOPLE ----------
   Every <div class="people" data-people="..."> on the page is filled with a card
   for each person holding that rank. The list comes from /api/government. */
(function () {
  var spots = document.querySelectorAll('.people[data-people]');
  if (!spots.length) return;

  var GROUP_LINK = 'https://www.roblox.com/groups/5801322';
  var NO_PICTURE = 'images/TYEcoatofarms.png';        /* shown when someone has no avatar picture */

  /* Builds one card: picture, name, title */
  function card(person, title) {
    var link = document.createElement('a');
    link.className = 'person';
    link.href = 'https://www.roblox.com/users/' + person.id + '/profile';
    link.target = '_blank';
    link.rel = 'noopener';

    var picture = document.createElement('img');
    picture.src = person.avatar || NO_PICTURE;
    picture.alt = '';
    picture.width = 72;
    picture.height = 72;
    picture.onerror = function () { picture.onerror = null; picture.src = NO_PICTURE; };

    var text = document.createElement('span');
    text.className = 'person-text';

    var name = document.createElement('span');
    name.className = 'person-name';
    name.textContent = person.displayName || person.username;

    var role = document.createElement('span');
    role.className = 'person-title';
    role.textContent = title;

    text.appendChild(name);
    text.appendChild(role);
    link.appendChild(picture);
    link.appendChild(text);
    return link;
  }

  /* Shown when a list is empty or couldn't be loaded */
  function notice(spot, words) {
    spot.textContent = '';
    var line = document.createElement('p');
    line.className = 'people-note';
    line.appendChild(document.createTextNode(words + ' '));
    var link = document.createElement('a');
    link.href = GROUP_LINK;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'See the Roblox group';
    line.appendChild(link);
    spot.appendChild(line);
  }

  function fill(data) {
    for (var i = 0; i < spots.length; i++) {
      var spot = spots[i];
      var list = data[spot.getAttribute('data-people')] || [];
      if (!list.length) { notice(spot, 'This office is currently vacant.'); continue; }
      spot.textContent = '';
      for (var j = 0; j < list.length; j++) {
        spot.appendChild(card(list[j], spot.getAttribute('data-title') || ''));
      }
    }
  }

  fetch('/api/government')
    .then(function (reply) { if (!reply.ok) throw new Error(); return reply.json(); })
    .then(fill)
    .catch(function () {
      for (var i = 0; i < spots.length; i++) notice(spots[i], 'The current holder is listed in our Roblox group.');
    });
})();


/* ---------- 2. SEAT CHART ----------
   Draws the chamber: two sides facing a central aisle, 4 columns of 10 seats each.
   Seats fill from the columns nearest the aisle outward. The counts come from /api/parliament. */
(function () {
  var chart = document.getElementById('chamber-seats');
  if (!chart) return;
  var partyList = document.getElementById('chamber-parties');
  var note = document.getElementById('chamber-note');

  var COLUMNS = 4;            /* columns on each side of the aisle */
  var ROWS = 10;              /* seats in each column */
  var FADE_GAP = 12;          /* milliseconds between one seat appearing and the next */
  var SAVED = 'yellonia-parliament';   /* where the last live answer is remembered in the browser */

  /* Used only if the site can't be reached at all and nothing was remembered */
  var BUILT_IN = { totalSeats: 80, openSeats: 17, live: false, parties: [{ name: 'Fulcrum Party', color: '#bed215', seats: 17 }] };

  /* The order seats are filled in: column nearest the aisle first, top to bottom,
     alternating left side then right side. Later columns take the overflow.
     Each entry is { side: 'left' or 'right', column: 0 (nearest aisle) to 3, row: 0 to 9 }. */
  function fillOrder() {
    var order = [];
    for (var column = 0; column < COLUMNS; column++) {
      for (var row = 0; row < ROWS; row++) {
        order.push({ side: 'left', column: column, row: row });
        order.push({ side: 'right', column: column, row: row });
      }
    }
    return order;
  }

  function draw(data) {
    var order = fillOrder();
    var open = Math.min(data.openSeats, order.length);

    /* Work out what each seat in the fill order holds */
    var holders = [];
    data.parties.forEach(function (party) {
      for (var n = 0; n < party.seats && holders.length < open; n++) holders.push(party);
    });

    /* Build the two sides as grids */
    chart.textContent = '';
    var sides = { left: document.createElement('div'), right: document.createElement('div') };
    sides.left.className = 'chamber-side';
    sides.right.className = 'chamber-side';
    var aisle = document.createElement('div');
    aisle.className = 'chamber-aisle';
    chart.appendChild(sides.left);
    chart.appendChild(aisle);
    chart.appendChild(sides.right);

    order.forEach(function (place, index) {
      var seat = document.createElement('span');
      seat.className = 'seat';
      var party = holders[index];
      if (party) {
        seat.classList.add('seat-held');
        seat.style.background = party.color;
        seat.title = party.name;
      } else if (index < open) {
        seat.classList.add('seat-open');
        seat.title = 'Open seat';
      } else {
        seat.title = 'Not in use';
      }
      /* On the left side the column nearest the aisle is the rightmost one */
      var gridColumn = place.side === 'left' ? COLUMNS - place.column : place.column + 1;
      seat.style.gridColumn = gridColumn;
      seat.style.gridRow = place.row + 1;
      seat.style.setProperty('--seat-order', index);
      sides[place.side].appendChild(seat);
    });

    /* The key beside the chart */
    partyList.textContent = '';
    function line(color, label, count, outlined) {
      var item = document.createElement('li');
      var swatch = document.createElement('span');
      swatch.className = 'seat' + (outlined ? ' seat-open' : ' seat-held');
      if (color) swatch.style.background = color;
      var name = document.createElement('span');
      name.className = 'chamber-party-name';
      name.textContent = label;
      var number = document.createElement('span');
      number.className = 'chamber-party-seats';
      number.textContent = count;
      item.appendChild(swatch);
      item.appendChild(name);
      item.appendChild(number);
      partyList.appendChild(item);
    }
    data.parties.forEach(function (party) { if (party.seats > 0) line(party.color, party.name, party.seats, false); });
    var unfilled = open - holders.length;
    if (unfilled > 0) line('', 'Open, not yet filled', unfilled, true);
    var unused = data.totalSeats - open;
    if (unused > 0) {
      var item = document.createElement('li');
      var swatch = document.createElement('span');
      swatch.className = 'seat';
      var name = document.createElement('span');
      name.className = 'chamber-party-name';
      name.textContent = 'Not in use';
      var number = document.createElement('span');
      number.className = 'chamber-party-seats';
      number.textContent = unused;
      item.appendChild(swatch); item.appendChild(name); item.appendChild(number);
      partyList.appendChild(item);
    }
    note.textContent = holders.length + ' of ' + open + ' open seats are held.';

    /* Fade the seats in once the chart is on screen */
    var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still || !('IntersectionObserver' in window)) { chart.classList.add('chamber-go'); return; }
    chart.style.setProperty('--seat-gap', FADE_GAP + 'ms');
    chart.classList.add('chamber-waiting');
    var watcher = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { watcher.disconnect(); chart.classList.add('chamber-go'); }
    }, { threshold: 0.3 });
    watcher.observe(chart);
  }

  /* Remembering the last live answer, so a short outage doesn't empty the chamber */
  function remember(data) { try { localStorage.setItem(SAVED, JSON.stringify(data)); } catch (error) {} }
  function recall() { try { return JSON.parse(localStorage.getItem(SAVED)); } catch (error) { return null; } }

  fetch('/api/parliament')
    .then(function (reply) { if (!reply.ok) throw new Error(); return reply.json(); })
    .then(function (data) {
      if (data.live) remember(data);
      draw(data.live ? data : (recall() || data));
    })
    .catch(function () { draw(recall() || BUILT_IN); });
})();
