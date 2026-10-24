/* ==============================================================
   structure.js - the chart on structure.html

   Draws the chain of command as boxes joined by lines. Visitors can
   drag the chart to move around, zoom with the + and - buttons (or
   Ctrl + mouse wheel, or two fingers on a phone), and click a box to
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
       color:   emperor, cabinet, parliament, court, security, ministry,
                staff, military, division, service
       stackLeaves: true lists this box's single boxes (ones with nothing
                under them) in one column first, before the others.
     Boxes whose children have no children of their own are listed in a
     column under their parent, to keep the chart narrow. */
  function units(list, link, color) {        /* shortcut for a list of single boxes */
    return list.map(function (name) { return { name: name, link: link, color: color || 'division' }; });
  }

  var CHART = {
    name: 'The Emperor', note: 'Head of state', link: 'government.html#emperor', color: 'emperor',
    children: [
      { name: 'Imperial Cabinet', note: 'Chaired by the Chancellor', link: 'government.html#cabinet', color: 'cabinet',
        children: [
          { name: 'Ministry of Defense', link: 'government.html#ministries', color: 'ministry', stackLeaves: true,
            children: [
              { name: 'Joint Staff', link: 'armed-forces.html', color: 'staff' },
              { name: 'Officer Candidate School', link: 'armed-forces.html', color: 'staff' },
              { name: 'Judge Advocate General\'s Corps', link: 'armed-forces.html', color: 'staff' },
              { name: 'Army', link: 'armed-forces.html#army', color: 'military',
                children: units(['1st Infantry Division', '3rd Armored Division'], 'armed-forces.html#army') },
              { name: 'Special Forces', link: 'armed-forces.html#special-forces', color: 'military',
                children: units(['1st Special Forces Group', '2nd Special Forces Group', '3rd Special Forces Group', '4th Special Forces Group',
                                 '5th Special Forces Group', '6th Special Forces Group', '7th Special Forces Group', 'Ceres Special Missions Unit'], 'armed-forces.html#special-forces') },
              { name: 'Navy', link: 'armed-forces.html#navy', color: 'military',
                children: [
                  { name: '2nd Fleet', link: 'armed-forces.html#navy', color: 'division',
                    children: units(['Carrier Strike Group', 'Destroyer Squadron', 'Submarine element'], 'armed-forces.html#navy', 'service') },
                  { name: '6th Marine Division', link: 'armed-forces.html#navy', color: 'division',
                    children: units(['9th Aerial Wing', '19th Armored Wing', '69th Underwater Wing'], 'armed-forces.html#navy', 'service') },
                ] },
              { name: 'Air Force', link: 'armed-forces.html#air-force', color: 'military',
                children: units(['4th Air Combat Division', '9th Helicopter Operations Division'], 'armed-forces.html#air-force') },
              { name: 'Military Police', link: 'armed-forces.html#military-police', color: 'military',
                children: units(['Ceremonial Guard', 'Ground Police', 'Air Police', 'Coast Guard'], 'armed-forces.html#military-police') },
            ] },
          { name: 'Ministry of Justice', link: 'government.html#ministries', color: 'ministry' },
          { name: 'Ministry of Commerce', link: 'government.html#ministries', color: 'ministry' },
          { name: 'Ministry of Foreign Affairs', link: 'government.html#ministries', color: 'ministry',
            children: [
              { name: 'Department of Political Affairs', color: 'service' },
              { name: 'Diplomatic Security Unit', color: 'service' },
            ] },
          { name: 'Ministry of Internal Affairs', link: 'government.html#ministries', color: 'ministry',
            children: [
              { name: 'Police Department', link: 'emergency-services.html#police', color: 'service' },
              { name: 'Fire Service', link: 'emergency-services.html#fire', color: 'service' },
              { name: 'Postal Service', color: 'service' },
              { name: 'Parks and Wildlife', link: 'emergency-services.html#parks', color: 'service' },
            ] },
          { name: 'Ministry of Science', link: 'government.html#ministries', color: 'ministry',
            children: [
              { name: 'Department of Space Exploration', color: 'service' },
              { name: 'Department of Special Projects', color: 'service' },
            ] },
        ] },
      { name: 'State Security Directorate', note: 'Answers to the Emperor', link: 'https://ssd-secure-portal.vercel.app/', color: 'security' },
      { name: 'Parliament', note: '80 seats, chaired by the Speaker', link: 'government.html#parliament', color: 'parliament' },
      { name: 'Imperial Supreme Court', note: 'Interprets the law', link: 'government.html#court', color: 'court' },
    ],
  };

  /* Sizes, in pixels at normal zoom */
  var BOX_W = 210, BOX_H = 72;     /* box size */
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

  measure(CHART);
  place(CHART, 0, 0);
  var chartW = CHART.width;
  var chartH = placed.reduce(function (max, n) { return Math.max(max, n.y + BOX_H); }, 0);


  /* ---------- 3. DRAWING ---------- */
  stage.style.width = chartW + 'px';
  stage.style.height = chartH + 'px';
  lines.setAttribute('width', chartW);
  lines.setAttribute('height', chartH);
  lines.setAttribute('viewBox', '0 0 ' + chartW + ' ' + chartH);
  lines.innerHTML = links.map(function (d) { return '<path d="' + d + '"/>'; }).join('');

  placed.forEach(function (node) {
    var box = document.createElement(node.link ? 'a' : 'div');
    box.className = 'chart-box chart-' + (node.color || 'ministry');
    if (node.link) box.href = node.link;
    if (node.link && /^https?:/.test(node.link)) { box.target = '_blank'; box.rel = 'noopener'; }
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
    if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; }
  }, true);

  /* Ctrl (or Cmd) + mouse wheel zooms. A plain wheel still scrolls the page. */
  viewport.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    var rect = viewport.getBoundingClientRect();
    zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - rect.left, e.clientY - rect.top);
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
    fade: 0.07,           /* how quickly trails disappear; higher = shorter trails */
    runFor: 20000,        /* stops after this many milliseconds (20 s) without anyone touching the chart; dragging or zooming starts it again */
    phoneMax: 120,        /* fewer particles on small screens */
  };

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas = viewport.querySelector('.chart-flow');
  if (canvas && canvas.getContext && !reduceMotion && FLOW.opacity > 0) {
    var ctx = canvas.getContext('2d');
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    var width = 0, height = 0, particles = [], time = Math.random() * 100, running = false, visible = true;
    var activeUntil = Date.now() + FLOW.runFor, clearFrames = 0;

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
      return { x: Math.random() * width, y: Math.random() * height, life: 200 + Math.random() * 400, color: FLOW.colors[Math.floor(Math.random() * FLOW.colors.length)] };
    }

    function resize() {
      width = viewport.clientWidth; height = viewport.clientHeight;
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      var count = Math.min(width < 600 ? FLOW.phoneMax : FLOW.maxParticles, Math.round(width * height * FLOW.density));
      particles = [];
      for (var i = 0; i < count; i++) particles.push(newParticle());
    }

    function frame() {
      if (!running) return;
      /* fade the old trails a little (keeps the canvas see-through, so the dotted grid shows) */
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, ' + FLOW.fade + ')';
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';

      /* Time's up: draw nothing new, let the trails fade away, then stop completely */
      if (Date.now() > activeUntil) {
        if (++clearFrames > 90) { ctx.clearRect(0, 0, width, height); running = false; return; }
        requestAnimationFrame(frame);
        return;
      }
      clearFrames = 0;
      ctx.globalAlpha = FLOW.opacity;
      ctx.lineWidth = 1.2;
      time += FLOW.drift * 16;
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        var angle = noise(p.x * FLOW.scale, p.y * FLOW.scale, time) * Math.PI * 2.5;
        var nx = p.x + Math.cos(angle) * FLOW.speed, ny = p.y + Math.sin(angle) * FLOW.speed;
        ctx.strokeStyle = p.color;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny); ctx.stroke();
        p.x = nx; p.y = ny; p.life--;
        if (p.life <= 0 || nx < -10 || ny < -10 || nx > width + 10 || ny > height + 10) particles[i] = newParticle();
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
      var should = visible && !document.hidden && (Date.now() <= activeUntil || clearFrames > 0);
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
