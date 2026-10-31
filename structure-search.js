/* ==============================================================
   structure-search.js - the search box on the structure chart

   Type any part of Yellonia (a ministry, a division, "police"...) and
   pick a result: the chart moves to that box and makes it flash.
   Enter picks the first result; the arrow keys move through the list.
   Load it after structure.js on structure.html.
   ============================================================== */
(function () {
  var viewport = document.getElementById('chart');
  var controls = viewport && viewport.querySelector('.chart-controls');
  if (!controls || !window.STRUCTURE_CHART) return;

  /* Every named box on the chart, with the chain of boxes above it */
  var boxes = Array.prototype.slice.call(viewport.querySelectorAll('.chart-box:not(.chart-redacted)'));
  var items = boxes.map(function (box) {
    var name = box.querySelector('strong').textContent;
    var note = box.querySelector('span') ? box.querySelector('span').textContent : '';
    return { box: box, name: name, note: note, text: (name + ' ' + note).toLowerCase() };
  });

  /* ---------- The search box ---------- */
  var wrap = document.createElement('div');
  wrap.className = 'chart-search';
  wrap.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>' +
    '<input type="search" placeholder="Find a part of Yellonia…" aria-label="Find a part of Yellonia on the chart" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="chart-search-results">' +
    '<ul class="chart-search-results" id="chart-search-results" role="listbox" hidden></ul>';
  controls.insertBefore(wrap, controls.firstChild);
  var input = wrap.querySelector('input');
  var list = wrap.querySelector('ul');
  var shown = [], active = -1;

  /* Keys and the mouse wheel inside the search box shouldn't move the chart */
  ['keydown', 'wheel', 'pointerdown'].forEach(function (type) {
    wrap.addEventListener(type, function (e) { e.stopPropagation(); }, { passive: true });
  });

  function score(item, words) {
    var total = 0;
    for (var i = 0; i < words.length; i++) {
      var at = item.text.indexOf(words[i]);
      if (at === -1) return -1;
      total += at === 0 ? 3 : (item.text.charAt(at - 1) === ' ' ? 2 : 1);
    }
    return total;
  }

  function search() {
    var words = input.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    list.textContent = ''; shown = []; active = -1;
    if (!words.length) { close(); return; }
    shown = items
      .map(function (item) { return { item: item, s: score(item, words) }; })
      .filter(function (r) { return r.s >= 0; })
      .sort(function (a, b) { return b.s - a.s || a.item.name.length - b.item.name.length; })
      .slice(0, 8)
      .map(function (r) { return r.item; });
    if (!shown.length) {
      var none = document.createElement('li');
      none.className = 'chart-search-none';
      none.textContent = 'Nothing on the chart matches that.';
      list.appendChild(none);
    }
    shown.forEach(function (item, i) {
      var li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.id = 'chart-search-' + i;
      li.className = 'chart-search-item ' + item.box.className.replace('chart-box', '').trim();
      var strong = document.createElement('strong'); strong.textContent = item.name; li.appendChild(strong);
      if (item.note) { var span = document.createElement('span'); span.textContent = item.note; li.appendChild(span); }
      li.addEventListener('mousedown', function (e) { e.preventDefault(); pick(i); });
      list.appendChild(li);
    });
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function close() {
    list.hidden = true; active = -1;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }

  function highlight(i) {
    var options = list.querySelectorAll('[role="option"]');
    if (!options.length) return;
    active = (i + options.length) % options.length;
    Array.prototype.forEach.call(options, function (o, n) { o.classList.toggle('is-active', n === active); });
    input.setAttribute('aria-activedescendant', options[active].id);
  }

  function pick(i) {
    var item = shown[i];
    if (!item) return;
    close();
    input.value = item.name;
    window.STRUCTURE_CHART.focus(item.box);
    boxes.forEach(function (b) { b.classList.remove('chart-found'); });
    void item.box.offsetWidth;                 /* restarts the flash if the same box is picked again */
    item.box.classList.add('chart-found');
    setTimeout(function () { item.box.classList.remove('chart-found'); }, 2600);
  }

  input.addEventListener('input', search);
  input.addEventListener('focus', function () { if (input.value.trim()) search(); });
  input.addEventListener('blur', function () { setTimeout(close, 100); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (list.hidden) search(); highlight(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); highlight(active - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(active >= 0 ? active : 0); }
    else if (e.key === 'Escape') { if (!list.hidden) close(); else { input.value = ''; input.blur(); } }
  });

  /* Pressing "/" anywhere on the page jumps to the search box */
  document.addEventListener('keydown', function (e) {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    var tag = (document.activeElement && document.activeElement.tagName) || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag) || document.activeElement.isContentEditable) return;
    e.preventDefault();
    input.focus();
  });
})();
