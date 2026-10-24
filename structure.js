/* ==============================================================
   structure.js - the chart on structure.html

   Draws the chain of command as boxes joined by lines. Visitors can
   drag the chart to move around, zoom with the + and - buttons (or
   the mouse wheel, or two fingers on a phone), and click a box to
   open that part of the site.

   CONTENTS
     1. THE CHART: who sits under whom. Edit this to change the chart.
     2. LAYOUT: works out where each box goes
     3. DRAWING
     4. MOVING AND ZOOMING
     5. BACKGROUND: the drifting lines behind the chart
   ============================================================== */

(function () {

  /* ---------- 1. THE CHART ----------
     Each box:  { name, note, link, color, children: [ ...boxes under it ] }
       note:    the small line under the name (optional)
       link:    the page it opens when clicked (optional). Links to other
                websites (starting with https://) open in a new tab.
       color:   emperor, viceroy, management, management-team, cabinet, parliament, court, security, ministry,
                staff, staff-unit, military, division, service, unit, parliament-unit
       redacted: true draws a blacked-out box with no name or link.
       beside:  true puts the box next to its parent, joined by a short line
                (used for the Viceroys). 'far-left' puts it at the far left
                edge of the chart instead (used for the Management Team).
       id:      a short name used by CROSS_LINKS below (optional)
       stackLeaves: true lists this box's single boxes (ones with nothing
                under them) in one column first, before the others.
     Boxes whose children have no children of their own are listed in a
     column under their parent, to keep the chart narrow. */
  function units(list, link, color) {        /* shortcut for a list of single boxes */
    return list.map(function (name) { return { name: name, link: link, color: color || 'division' }; });
  }

  var CHART = {
    name: 'The Emperor', note: 'Head of state', link: '#emperor', color: 'emperor',
    children: [
      { name: 'The Viceroys', note: 'Stand beside the Emperor', link: '#emperor', color: 'viceroy', beside: true },
      { name: 'Management Team', note: 'Stands beside the Emperor', color: 'management', beside: 'far-left',
        children: [
          { name: 'Community Engagement Team', color: 'management-team' },
          { name: 'Moderation Team', color: 'management-team' },
        ] },
      { name: 'Imperial Cabinet', note: 'Chaired by the Chancellor', link: '#cabinet', color: 'cabinet',
        children: [
          { name: 'Ministry of Defense', link: '#ministries', color: 'ministry', stackLeaves: true,
            children: [
              { name: 'Joint Staff', link: '#armed-forces', color: 'staff',
                children: units(['Nuclear Arms Command', 'Logistics Command', 'Personnel Management Command', 'Joint Forces Command'], '#armed-forces', 'staff-unit') },
              { name: 'Officer Candidate School', link: '#armed-forces', color: 'staff' },
              { name: 'Judge Advocate General\'s Corps', id: 'jagc', link: '#armed-forces', color: 'staff' },
              { name: 'Army', link: '#army', color: 'military',
                children: units(['1st Infantry Division', '3rd Armored Division'], '#army') },
              { name: 'Special Forces', link: '#special-forces', color: 'military',
                children: units(['1st Special Forces Group', '2nd Special Forces Group', '3rd Special Forces Group', '4th Special Forces Group',
                                 '5th Special Forces Group', '6th Special Forces Group', '7th Special Forces Group', 'Ceres Special Missions Unit'], '#special-forces') },
              { name: 'Navy', link: '#navy', color: 'military',
                children: [
                  { name: '2nd Fleet', link: '#navy', color: 'division',
                    children: units(['Carrier Strike Group', 'Destroyer Squadron', 'Submarine element'], '#navy', 'service') },
                  { name: '6th Marine Division', link: '#navy', color: 'division',
                    children: units(['9th Aerial Wing', '19th Armored Wing', '69th Underwater Wing'], '#navy', 'service') },
                ] },
              { name: 'Air Force', link: '#air-force', color: 'military',
                children: units(['4th Air Combat Division', '9th Helicopter Operations Division'], '#air-force') },
              { name: 'Military Police', link: '#military-police', color: 'military',
                children: units(['Ceremonial Guard', 'Ground Police', 'Air Police', 'Coast Guard'], '#military-police') },
            ] },
          { name: 'Ministry of Justice', id: 'moj', link: '#ministries', color: 'ministry',
            children: [
              { name: 'Department of Prosecutional Affairs', color: 'service' },
              { name: 'Department of Judgementation', color: 'service' },
              { name: 'Department of Transcription & Documentation', color: 'service' },
            ] },
          { name: 'Ministry of Commerce', link: '#ministries', color: 'ministry',
            children: [
              { name: 'Department of Corporate Registry', color: 'service' },
            ] },
          { name: 'Ministry of Foreign Affairs', link: '#ministries', color: 'ministry',
            children: [
              { name: 'Department of Political Affairs', color: 'service' },
              { name: 'Department of Legal Affairs', id: 'legal', color: 'service' },
              { name: 'Diplomatic Security Unit', color: 'service' },
            ] },
          { name: 'Ministry of Internal Affairs', link: '#ministries', color: 'ministry', stackLeaves: true,
            children: [
              { name: 'Police Department', link: 'emergency-services.html#police', color: 'service',
                children: units(['Yeloria Police Division', 'Counter-Terrorism and Special Response Command'], 'emergency-services.html#police', 'unit') },
              { name: 'Fire Department', link: 'emergency-services.html#fire', color: 'service',
                children: units(['Yeloria Fire Division'], 'emergency-services.html#fire', 'unit') },
              { name: 'Postal Service', color: 'service' },
              { name: 'Parks and Wildlife', link: 'emergency-services.html#parks', color: 'service' },
            ] },
          { name: 'Ministry of Science', link: '#ministries', color: 'ministry',
            children: [
              { name: 'Department of Energy', color: 'service' },
              { name: 'Department of Space Exploration', color: 'service' },
              { name: 'Department of Special Projects', color: 'service' },
            ] },
        ] },
      { name: 'State Security Directorate', note: 'Answers to the Emperor', link: 'https://ssd-secure-portal.vercel.app/', color: 'security', stackLeaves: true,
        children: [
          { redacted: true }, { redacted: true }, { redacted: true }, { redacted: true },
          { name: 'Imperial Guard', color: 'security',
            children: [
              { name: '1st IG-Regiment "Emperor"', color: 'unit' },
              { name: '2nd IG-Regiment "Viceroys"', color: 'unit' },
              { name: '3rd IG-Regiment "Governance"', color: 'unit' },
              { name: '8th IG-Regiment "Grandslayers"', color: 'unit' },
            ] },
        ] },
      { name: 'Parliament', note: '80 seats, chaired by the Speaker', link: '#parliament', color: 'parliament',
        children: [
          { name: 'Committees of Parliament', link: '#parliament', color: 'parliament-unit' },
        ] },
      { name: 'Imperial Supreme Court', note: 'Interprets the law', link: '#court', color: 'court' },
    ],
  };

  /* Extra lines between boxes in different branches (dashed, with a label).
     "from" and "to" are the id of a box above. labelAt moves the label along
     the line (0 = at "from", 1 = at "to"; 0.5 is the middle) if a box covers it. */
  var CROSS_LINKS = [
    { from: 'moj', to: 'legal', label: 'MoJ advises its members' },
    { from: 'moj', to: 'jagc', label: 'Works with the MoJ', labelAt: 0.93 },
  ];

  /* Sizes, in pixels at normal zoom */
  var BOX_W = 210, BOX_H = 82;     /* box size */
  var GAP_X = 28;                  /* space between boxes side by side */
  var GAP_Y = 70;                  /* space between levels */
  var STACK_GAP = 14;              /* space between boxes in a column */
  var STACK_INDENT = 22;           /* how far a column sits to the right of its line */

  var viewport = document.getElementById('chart');
  if (!viewport) return;
  var stage = viewport.querySelector('.chart-stage');
  var lines = viewport.querySelector('.chart-lines');


  /* ---------- 2. LAYOUT ---------- */
  var placed = [];          /* every box with its x, y */
  var links = [];           /* every line, as SVG path data */

  /* stackLeaves: gathers the single boxes into one column (an invisible group) placed first */
  (function group(node) {
    if (!node.children) return;
    node.children.forEach(group);
    if (!node.stackLeaves) return;
    var single = node.children.filter(function (c) { return !c.children || !c.children.length; });
    if (!single.length) return;
    var rest = node.children.filter(function (c) { return single.indexOf(c) === -1; });
    node.children = [{ virtual: true, children: single }].concat(rest);
  })(CHART);

  function stacks(node) {
    return node.children && node.children.length && node.children.every(function (c) { return !c.children || !c.children.length; }) && node !== CHART;
  }

  /* Returns the width a box and everything under it needs */
  function measure(node) {
    if (stacks(node)) { node.width = BOX_W + STACK_INDENT; return node.width; }
    if (!node.children || !node.children.length) { node.width = BOX_W; return node.width; }
    var total = 0;
    node.children.forEach(function (child, i) { total += measure(child) + (i ? GAP_X : 0); });
    node.width = Math.max(BOX_W, total);
    return node.width;
  }

  function place(node, left, top) {
    var x = left + (stacks(node) ? 0 : (node.width - BOX_W) / 2);
    node.x = x; node.y = top;
    if (!node.virtual) placed.push(node);
    if (!node.children || !node.children.length) return;

    if (stacks(node)) {
      /* a column down the left side, joined by one line (an invisible group starts right at the top) */
      var lineX = x + 14, y = node.virtual ? top : top + BOX_H + STACK_GAP, lastMid = 0;
      node.children.forEach(function (child) {
        child.x = x + STACK_INDENT; child.y = y; child.small = true;
        placed.push(child);
        lastMid = y + BOX_H / 2;
        links.push('M' + lineX + ' ' + lastMid + 'H' + child.x);
        y += BOX_H + STACK_GAP;
      });
      links.push('M' + lineX + ' ' + (node.virtual ? top : top + BOX_H) + 'V' + lastMid);
      return;
    }

    /* side by side underneath, joined by an elbow line */
    var childLeft = left + (node.width - childrenWidth(node)) / 2;
    var childTop = top + BOX_H + GAP_Y;
    var midY = top + BOX_H + GAP_Y / 2;
    var fromX = x + BOX_W / 2;
    node.children.forEach(function (child) {
      place(child, childLeft, childTop);
      var toX = child.virtual ? child.x + 14 : child.x + BOX_W / 2;
      links.push('M' + fromX + ' ' + (top + BOX_H) + 'V' + midY + 'H' + toX + 'V' + childTop);
      childLeft += child.width + GAP_X;
    });
  }

  function childrenWidth(node) {
    return node.children.reduce(function (sum, c, i) { return sum + c.width + (i ? GAP_X : 0); }, 0);
  }

  /* Boxes marked "beside" are set aside now and placed next to their parent afterwards */
  var besides = [];
  (function pull(node) {
    if (!node.children) return;
    node.children = node.children.filter(function (c) { if (c.beside) { besides.push({ box: c, parent: node }); return false; } return true; });
    node.children.forEach(pull);
  })(CHART);

  /* beside: 'far-left' boxes go at the far left edge of the chart; others go just right of their parent */
  var farLeft = besides.filter(function (item) { return item.box.beside === 'far-left'; });
  var nextTo = besides.filter(function (item) { return item.box.beside !== 'far-left'; });
  var leftSpace = farLeft.reduce(function (sum, item) { return sum + measure(item.box) + GAP_X * 3; }, 0);

  measure(CHART);
  place(CHART, leftSpace, 0);

  var leftX = 0;
  farLeft.forEach(function (item) {
    place(item.box, leftX, item.parent.y);
    links.push('M' + item.parent.x + ' ' + (item.parent.y + BOX_H / 2) + 'H' + (item.box.x + BOX_W));
    leftX += item.box.width + GAP_X * 3;
  });
  nextTo.forEach(function (item, i) {
    var parent = item.parent;
    measure(item.box);
    place(item.box, parent.x + (BOX_W + GAP_X * 2) * (i + 1), parent.y);
    links.push('M' + (parent.x + BOX_W) + ' ' + (parent.y + BOX_H / 2) + 'H' + item.box.x);
  });
  var chartW = placed.reduce(function (max, n) { return Math.max(max, n.x + BOX_W); }, leftSpace + CHART.width);
  var chartH = placed.reduce(function (max, n) { return Math.max(max, n.y + BOX_H); }, 0);


  /* ---------- 3. DRAWING ---------- */
  stage.style.width = chartW + 'px';
  stage.style.height = chartH + 'px';
  lines.setAttribute('width', chartW);
  lines.setAttribute('height', chartH);
  lines.setAttribute('viewBox', '0 0 ' + chartW + ' ' + chartH);
  /* All lines sit in one layer underneath the boxes */
  var byId = {};
  placed.forEach(function (n) { if (n.id) byId[n.id] = n; });
  var cross = CROSS_LINKS.map(function (c) {
    var a = byId[c.from], b = byId[c.to];
    if (!a || !b) return '';
    var ax = a.x + BOX_W / 2, ay = a.y + BOX_H / 2, bx = b.x + BOX_W / 2, by = b.y + BOX_H / 2;
    var bend = Math.max(120, Math.abs(by - ay) * 0.6 + 80);       /* curves down and across, between the rows */
    var d = 'M' + ax + ' ' + ay + 'C' + ax + ' ' + (ay + bend) + ' ' + bx + ' ' + (by + bend) + ' ' + bx + ' ' + by;
    var s = c.labelAt === undefined ? 0.5 : c.labelAt, r = 1 - s;     /* the point on the curve where the label goes */
    var mx = r * r * r * ax + 3 * r * r * s * ax + 3 * r * s * s * bx + s * s * s * bx;
    var my = r * r * r * ay + 3 * r * r * s * (ay + bend) + 3 * r * s * s * (by + bend) + s * s * s * by + 18;
    return '<path class="cross-link" d="' + d + '"/>' +
      '<text class="cross-label" x="' + mx + '" y="' + my + '" text-anchor="middle">' + c.label.replace(/[<&]/g, '') + '</text>';
  }).join('');
  lines.innerHTML = links.map(function (d) { return '<path d="' + d + '"/>'; }).join('') + cross;

  placed.forEach(function (node) {
    if (node.redacted) {                                 /* a blacked-out box */
      var hidden = document.createElement('div');
      hidden.className = 'chart-box chart-redacted';
      hidden.setAttribute('aria-label', 'Redacted');
      hidden.style.left = node.x + 'px'; hidden.style.top = node.y + 'px';
      hidden.style.width = BOX_W + 'px'; hidden.style.height = BOX_H + 'px';
      hidden.innerHTML = '<strong>REDACTED</strong><span aria-hidden="true"></span>';
      stage.appendChild(hidden);
      return;
    }
    var box = document.createElement(node.link ? 'a' : 'div');
    box.className = 'chart-box chart-' + (node.color || 'ministry');
    if (node.link) box.href = node.link;
    if (/^https?:/.test(node.link || '')) { box.target = '_blank'; box.rel = 'noopener'; }
    box.style.left = node.x + 'px';
    box.style.top = node.y + 'px';
    box.style.width = BOX_W + 'px';
    box.style.height = BOX_H + 'px';
    var name = document.createElement('strong');      /* the colored band at the top */
    name.textContent = node.name;
    box.appendChild(name);
    var note = document.createElement('span');          /* the line under it */
    note.textContent = node.note || '';
    box.appendChild(note);
    box.draggable = false;
    stage.appendChild(box);
  });


  /* ---------- 4. MOVING AND ZOOMING ---------- */
  var view = { x: 0, y: 0, scale: 1 };
  var MIN = 0.3, MAX = 1.8;

  function apply() {
    stage.style.transform = 'translate(' + view.x + 'px,' + view.y + 'px) scale(' + view.scale + ')';
  }

  /* Starts at full size (readable), at the top of the chart, centered on the Emperor */
  function start() {
    var w = viewport.clientWidth;
    view.scale = w < 600 ? 0.85 : 1;
    view.x = w / 2 - (CHART.x + BOX_W / 2) * view.scale;
    view.y = viewport.querySelector('.chart-controls').offsetHeight + 24;   /* just below the buttons */
    apply();
  }

  /* Zooms out until the whole chart fits in the window */
  function fit() {
    var w = viewport.clientWidth, h = viewport.clientHeight;
    view.scale = Math.max(MIN, Math.min(1, (w - 40) / chartW, (h - 40) / chartH));
    view.x = (w - chartW * view.scale) / 2;
    view.y = Math.max(20, (h - chartH * view.scale) / 2);
    apply();
  }

  function zoomAt(factor, cx, cy) {
    var next = Math.min(MAX, Math.max(MIN, view.scale * factor));
    var k = next / view.scale;
    view.x = cx - (cx - view.x) * k;
    view.y = cy - (cy - view.y) * k;
    view.scale = next;
    apply();
  }

  function zoomCenter(factor) { zoomAt(factor, viewport.clientWidth / 2, viewport.clientHeight / 2); }

  /* Dragging with a mouse or one finger; pinching with two fingers */
  var pointers = {}, dragged = false, last = null, pinch = null;

  viewport.addEventListener('pointerdown', function (e) {
    if (e.target.closest('.chart-controls')) return;
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(pointers);
    if (ids.length === 1) { dragged = false; last = { x: e.clientX, y: e.clientY }; }
    if (ids.length === 2) { pinch = distance(); }
    viewport.classList.add('is-dragging');
  });

  window.addEventListener('pointermove', function (e) {
    if (!pointers[e.pointerId]) return;
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(pointers);
    if (ids.length === 2 && pinch) {
      var now = distance(), rect = viewport.getBoundingClientRect();
      var a = pointers[ids[0]], b = pointers[ids[1]];
      zoomAt(now / pinch, (a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top);
      pinch = now; dragged = true;
      return;
    }
    if (ids.length === 1 && last) {
      var dx = e.clientX - last.x, dy = e.clientY - last.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) dragged = true;
      view.x += dx; view.y += dy; last = { x: e.clientX, y: e.clientY };
      apply();
    }
  });

  function release(e) {
    if (!pointers[e.pointerId]) return;
    delete pointers[e.pointerId];
    var ids = Object.keys(pointers);
    pinch = null;
    last = ids.length === 1 ? pointers[ids[0]] : null;
    if (!ids.length) viewport.classList.remove('is-dragging');
  }
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);

  function distance() {
    var ids = Object.keys(pointers), a = pointers[ids[0]], b = pointers[ids[1]];
    return Math.hypot(a.x - b.x, a.y - b.y) || 1;
  }

  /* A drag that ends on a box shouldn't open its link */
  viewport.addEventListener('click', function (e) {
    if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; return; }
    /* In full screen, a box that jumps further down this page leaves full screen first */
    var box = e.target.closest('a.chart-box');
    if (!box || box.getAttribute('href').charAt(0) !== '#' || !isFull()) return;
    e.preventDefault();
    var target = box.getAttribute('href');
    if (document.fullscreenElement) document.exitFullscreen();
    else { viewport.classList.remove('is-full'); fullChanged(); }
    setTimeout(function () { location.hash = target; }, 150);
  }, true);

  /* The mouse wheel (or two fingers on a trackpad) zooms in and out where the pointer is */
  viewport.addEventListener('wheel', function (e) {
    e.preventDefault();
    var rect = viewport.getBoundingClientRect();
    var amount = e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY;          /* some mice count lines, not pixels */
    var factor = Math.exp(-Math.max(-300, Math.min(300, amount)) * 0.0015);
    zoomAt(factor, e.clientX - rect.left, e.clientY - rect.top);
  }, { passive: false });

  /* Arrow keys move the chart when it has focus */
  viewport.addEventListener('keydown', function (e) {
    var step = 60, moves = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (e.key === '+' || e.key === '=') { zoomCenter(1.2); return; }
    if (e.key === '-') { zoomCenter(1 / 1.2); return; }
    if (!moves[e.key] || e.target !== viewport) return;
    e.preventDefault();
    view.x += moves[e.key][0]; view.y += moves[e.key][1]; apply();
  });

  viewport.querySelector('[data-zoom="in"]').addEventListener('click', function () { zoomCenter(1.2); });
  viewport.querySelector('[data-zoom="out"]').addEventListener('click', function () { zoomCenter(1 / 1.2); });
  viewport.querySelector('[data-zoom="reset"]').addEventListener('click', start);
  viewport.querySelector('[data-zoom="fit"]').addEventListener('click', fit);

  /* Full screen. Uses the browser's real full screen where it exists. Phones that don't
     have it (like iPhone) get the chart stretched over the whole window instead. */
  var fullButton = viewport.querySelector('[data-zoom="full"]');
  function isFull() { return document.fullscreenElement === viewport || viewport.classList.contains('is-full'); }
  function fullChanged() {
    var on = isFull();
    fullButton.textContent = on ? 'Exit full screen' : 'Full screen';
    fullButton.setAttribute('aria-pressed', on ? 'true' : 'false');
    document.documentElement.classList.toggle('chart-full-open', viewport.classList.contains('is-full'));
    lastWidth = viewport.clientWidth;
    start();
  }
  fullButton.addEventListener('click', function () {
    if (isFull()) {
      if (document.fullscreenElement) document.exitFullscreen();
      else { viewport.classList.remove('is-full'); fullChanged(); }
    } else if (viewport.requestFullscreen) {
      viewport.requestFullscreen().catch(function () { viewport.classList.add('is-full'); fullChanged(); });
    } else {
      viewport.classList.add('is-full'); fullChanged();
    }
  });
  document.addEventListener('fullscreenchange', fullChanged);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && viewport.classList.contains('is-full')) { viewport.classList.remove('is-full'); fullChanged(); }
  });

  start();
  var lastWidth = viewport.clientWidth;      /* phones resize the window while scrolling; only refit when the width changes */
  window.addEventListener('resize', function () { if (viewport.clientWidth !== lastWidth) { lastWidth = viewport.clientWidth; start(); } });


  /* ---------- 5. BACKGROUND ----------
     Faint particles drifting along a slowly changing "current" (Perlin noise),
     leaving short trails. It sits behind the boxes and doesn't move with them.
     To go easy on computers and phones it fades out and stops after a while
     (FLOW.runFor), pauses while the chart is off screen or the tab is hidden,
     and is switched off for visitors whose device asks for less motion. */
  var FLOW = {
    colors: ['#bed215', '#3f95ce', '#5db54a'],   /* the flag colors */
    opacity: 0.35,        /* how strong the lines are; 0 hides them */
    density: 1 / 9000,    /* particles per square pixel of chart */
    maxParticles: 260,
    speed: 0.6,           /* how fast particles move */
    scale: 0.0011,        /* how wide the swirls are; smaller = wider */
    drift: 0.00012,       /* how fast the current itself changes */
    trail: 70,            /* how long each line's tail is, in steps */
    runFor: 20000,        /* stops after this many milliseconds (20 s) without anyone touching the chart; dragging or zooming starts it again */
    phoneMax: 120,        /* fewer particles on small screens */
    fadeIn: 1500,         /* milliseconds to fade in when it starts */
    fadeOut: 4000,        /* milliseconds to fade out when it stops */
  };

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas = viewport.querySelector('.chart-flow');
  if (canvas && canvas.getContext && !reduceMotion && FLOW.opacity > 0) {
    var ctx = canvas.getContext('2d');
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    var width = 0, height = 0, particles = [], time = Math.random() * 100, running = false, visible = true;
    var activeUntil = Date.now() + FLOW.runFor, strength = 0, lastFrame = 0;

    /* Classic Perlin noise in 3D (x, y and time), written out so no library is needed */
    var perm = new Uint8Array(512);
    (function () {
      var p = [];
      for (var i = 0; i < 256; i++) p[i] = i;
      for (var j = 255; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var s = p[j]; p[j] = p[k]; p[k] = s; }
      for (var n = 0; n < 512; n++) perm[n] = p[n & 255];
    })();
    function fadeCurve(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function lerp(a, b, t) { return a + t * (b - a); }
    function grad(hash, x, y, z) {
      var h = hash & 15, u = h < 8 ? x : y, v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
      return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
    }
    function noise(x, y, z) {
      var X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
      x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
      var u = fadeCurve(x), v = fadeCurve(y), w = fadeCurve(z);
      var A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z, B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;
      return lerp(
        lerp(lerp(grad(perm[AA], x, y, z), grad(perm[BA], x - 1, y, z), u), lerp(grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z), u), v),
        lerp(lerp(grad(perm[AA + 1], x, y, z - 1), grad(perm[BA + 1], x - 1, y, z - 1), u), lerp(grad(perm[AB + 1], x, y - 1, z - 1), grad(perm[BB + 1], x - 1, y - 1, z - 1), u), v),
        w);
    }

    function newParticle() {
      var x = Math.random() * width, y = Math.random() * height;
      return { x: x, y: y, trail: [x, y], life: 200 + Math.random() * 400, color: FLOW.colors[Math.floor(Math.random() * FLOW.colors.length)] };
    }

    function resize() {
      width = viewport.clientWidth; height = viewport.clientHeight;
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      var count = Math.min(width < 600 ? FLOW.phoneMax : FLOW.maxParticles, Math.round(width * height * FLOW.density));
      particles = [];
      for (var i = 0; i < count; i++) particles.push(newParticle());
    }

    function frame(now) {
      if (!running) return;
      var dt = Math.min(100, now - (lastFrame || now)); lastFrame = now;

      /* Fades in when it starts and slowly out when time's up, instead of switching off at once */
      var target = Date.now() <= activeUntil ? 1 : 0;
      var step = dt / (target ? FLOW.fadeIn : FLOW.fadeOut);
      strength = target ? Math.min(1, strength + step) : Math.max(0, strength - step);

      ctx.clearRect(0, 0, width, height);
      if (!target && strength === 0) { running = false; lastFrame = 0; return; }   /* fully faded out: stop completely */

      /* Move each particle along the current, remembering its last few points */
      time += FLOW.drift * 16;
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        if (p.life <= 0) {                     /* finished: its tail shrinks away, then it starts again elsewhere */
          p.trail.splice(0, 2);
          if (p.trail.length < 4) particles[i] = newParticle();
          continue;
        }
        var angle = noise(p.x * FLOW.scale, p.y * FLOW.scale, time) * Math.PI * 2.5;
        p.x += Math.cos(angle) * FLOW.speed; p.y += Math.sin(angle) * FLOW.speed;
        p.trail.push(p.x, p.y);
        if (p.trail.length > FLOW.trail * 2) p.trail.splice(0, 2);
        p.life--;
        if (p.x < -10 || p.y < -10 || p.x > width + 10 || p.y > height + 10) p.life = 0;
      }

      /* Draw each trail in four parts, faintest at the tail */
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      for (var part = 0; part < 4; part++) {
        ctx.globalAlpha = FLOW.opacity * strength * (part + 1) / 4;
        for (var k = 0; k < FLOW.colors.length; k++) {
          ctx.strokeStyle = FLOW.colors[k];
          ctx.beginPath();
          for (var n = 0; n < particles.length; n++) {
            var q = particles[n];
            if (q.color !== FLOW.colors[k]) continue;
            var points = q.trail.length / 2;
            if (points < 2) continue;
            var from = Math.floor(points * part / 4), to = Math.min(points - 1, Math.floor(points * (part + 1) / 4));
            if (to <= from) continue;
            ctx.moveTo(q.trail[from * 2], q.trail[from * 2 + 1]);
            for (var s = from + 1; s <= to; s++) ctx.lineTo(q.trail[s * 2], q.trail[s * 2 + 1]);
          }
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(frame);
    }

    /* Touching the chart starts the background again */
    function wake() { activeUntil = Date.now() + FLOW.runFor; update(); }
    viewport.addEventListener('pointerdown', wake);
    viewport.addEventListener('wheel', wake, { passive: true });
    viewport.addEventListener('keydown', wake);

    function update() {
      var should = visible && !document.hidden && (Date.now() <= activeUntil || strength > 0);
      if (should && !running) { running = true; requestAnimationFrame(frame); }
      if (!should) running = false;
    }

    resize();
    if (window.ResizeObserver) new ResizeObserver(resize).observe(viewport);
    else window.addEventListener('resize', resize);
    if (window.IntersectionObserver) new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; update(); }).observe(viewport);
    document.addEventListener('visibilitychange', update);
    update();
  }
})();
