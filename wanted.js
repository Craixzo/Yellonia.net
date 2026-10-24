/* ==============================================================
   wanted.js - the public Most Wanted list

   Used by wanted.html (the whole list) and by the Most Wanted section
   on emergency-services.html (the first few, via data-limit).
   ============================================================== */
(function () {
  var box = document.getElementById('wanted-list');
  if (!box) return;
  var limit = Number(box.getAttribute('data-limit')) || 0;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  fetch('/api/wanted')
    .then(function (reply) { return reply.ok ? reply.json() : { wanted: [] }; })
    .catch(function () { return { wanted: [] }; })
    .then(function (data) {
      var list = data.wanted || [];
      box.textContent = '';
      if (!list.length) { box.appendChild(el('p', 'wanted-empty', 'Nobody is on the Most Wanted list right now.')); return; }
      var grid = el('div', 'wanted-cards');
      (limit ? list.slice(0, limit) : list).forEach(function (w) {
        var card = el('article', 'wanted-card wanted-' + String(w.danger).toLowerCase());
        var photo = el('div', 'wanted-photo');
        photo.setAttribute('data-initials', w.username);
        if (w.avatar) { var img = el('img'); img.alt = 'Roblox avatar of ' + w.username; img.onerror = function () { var box = this.parentNode; box.textContent = (box.getAttribute('data-initials') || '?').slice(0, 2).toUpperCase(); }; img.src = w.avatar; img.loading = 'lazy'; photo.appendChild(img); }
        else photo.textContent = w.username.slice(0, 2).toUpperCase();
        card.appendChild(photo);
        var text = el('div', 'wanted-text');
        text.appendChild(el('span', 'wanted-danger', w.dangerName + ' risk'));
        text.appendChild(el('h3', null, w.characterName || w.username));
        if (w.characterName) text.appendChild(el('p', 'wanted-user', 'Roblox: ' + w.username));
        if (w.charges.length) {
          var ul = el('ul', 'wanted-charges');
          w.charges.forEach(function (c) { ul.appendChild(el('li', null, c)); });
          text.appendChild(ul);
        }
        if (w.summary) text.appendChild(el('p', 'wanted-summary', w.summary));
        text.appendChild(el('p', 'wanted-number', 'Warrant ' + w.number));
        card.appendChild(text);
        grid.appendChild(card);
      });
      box.appendChild(grid);
      if (limit && list.length > limit) {
        var more = el('a', 'text-link', 'See all ' + list.length + ' on the Most Wanted list');
        more.href = 'wanted.html';
        box.appendChild(more);
      }
    });
})();
