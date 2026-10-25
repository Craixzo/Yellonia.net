/* ==============================================================
   des/synapse.js - the "synapse grid" behind the Service Login page

   A faint square grid, with small glowing dots that travel along its
   lines, now and then turning a corner at a crossing, then fading out
   as new ones appear.

   Used by login.html: <canvas class="synapse" aria-hidden="true"></canvas>
   To use it on another page, add that canvas and this script.
   Visitors whose device asks for less motion get the still grid only.
   ============================================================== */
(function () {

  /* ---------- SETTINGS ---------- */
  var GRID = {
    spacing: 40,              /* size of each grid square, in pixels */
    lineColor: 'rgba(150, 170, 185, 0.045)',   /* the grid lines: keep them very faint */
    colors: ['#bed215', '#bed215', '#3f95ce', '#5db54a'],   /* dot colors (lime listed twice = more lime) */
    dots: 18,                 /* dots moving at once (half on phones) */
    speed: 3,              /* pixels per frame at 60 fps */
    turnChance: 0,         /* chance a dot turns a corner at each crossing */
    tail: 56,                 /* length of the fading tail, in pixels */
    size: 1.6,                /* dot radius */
    glow: 7,                  /* soft glow around each dot */
    life: [500, 1400],        /* how long a dot lives, in frames (shortest, longest) */
  };

  var canvas = document.querySelector('canvas.synapse');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var width = 0, height = 0, dots = [], running = false, last = 0;
  var DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function rgba(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function resize() {
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    dots = [];
    for (var i = 0; i < target(); i++) dots.push(newDot(true));
  }
  function target() { return width < 700 ? Math.round(GRID.dots / 2) : GRID.dots; }

  /* A dot starts on a random crossing and heads off along a line */
  function newDot(anyAge) {
    var s = GRID.spacing;
    var dir = DIRS[Math.floor(Math.random() * 4)];
    var life = GRID.life[0] + Math.random() * (GRID.life[1] - GRID.life[0]);
    return {
      x: Math.floor(Math.random() * (width / s + 1)) * s,
      y: Math.floor(Math.random() * (height / s + 1)) * s,
      dx: dir[0], dy: dir[1], moved: 0,
      age: anyAge ? Math.random() * life : 0, life: life,
      color: GRID.colors[Math.floor(Math.random() * GRID.colors.length)],
    };
  }

  function drawGrid() {
    var s = GRID.spacing;
    ctx.strokeStyle = GRID.lineColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var x = 0.5; x <= width; x += s) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
    for (var y = 0.5; y <= height; y += s) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
    ctx.stroke();
  }

  function step(dt) {
    ctx.clearRect(0, 0, width, height);
    drawGrid();
    var s = GRID.spacing;
    dots.forEach(function (d, i) {
      d.age += dt;
      var move = GRID.speed * dt;
      d.x += d.dx * move;
      d.y += d.dy * move;
      d.moved += move;
      /* reached a crossing: snap to it, and maybe turn */
      if (d.moved >= s) {
        d.moved -= s;
        d.x = Math.round(d.x / s) * s;
        d.y = Math.round(d.y / s) * s;
        if (Math.random() < GRID.turnChance) {
          var side = Math.random() < 0.5 ? 1 : -1;
          var ndx = d.dy * side, ndy = -d.dx * side;
          d.dx = ndx; d.dy = ndy;
        }
      }
      /* fade in, stay, fade out */
      var fade = Math.min(1, d.age / 60, (d.life - d.age) / 90);
      var off = d.x < -s || d.y < -s || d.x > width + s || d.y > height + s;
      if (fade <= 0 || off) { dots[i] = newDot(false); return; }

      /* tail, straight back along the line it's on (stops at the last corner) */
      var tail = Math.min(GRID.tail, d.moved + s);
      var tx = d.x - d.dx * tail, ty = d.y - d.dy * tail;
      var grad = ctx.createLinearGradient(tx, ty, d.x, d.y);
      grad.addColorStop(0, rgba(d.color, 0));
      grad.addColorStop(1, rgba(d.color, 0.55 * fade));
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(d.x, d.y);
      ctx.stroke();

      var g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, GRID.glow);
      g.addColorStop(0, rgba(d.color, 0.35 * fade));
      g.addColorStop(1, rgba(d.color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(d.x, d.y, GRID.glow, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba(d.color, 0.95 * fade);
      ctx.beginPath();
      ctx.arc(d.x, d.y, GRID.size, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function frame(now) {
    if (!running) return;
    var dt = last ? Math.min(3, (now - last) / 16.7) : 1;
    last = now;
    step(dt);
    requestAnimationFrame(frame);
  }
  function start() { if (running || still) return; running = true; last = 0; requestAnimationFrame(frame); }

  resize();
  if (still) drawGrid(); else start();

  var timer;
  window.addEventListener('resize', function () {
    clearTimeout(timer);
    timer = setTimeout(function () { resize(); if (still) drawGrid(); }, 150);
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden) running = false; else start(); });
})();
