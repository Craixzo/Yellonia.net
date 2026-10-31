/* ==============================================================
   documents.js - Official Documents (documents.html)

   Every published document, grouped by category, with a search box.
   Documents are written by site admins in the staff area (staff.html).
   The Constitution has its own page (constitution.html) and is shown
   at the top here.
   ============================================================== */
(function () {
  var S = window.SITE;
  var el = S.el;
  var root = document.getElementById('documents-root');
  if (!root) return;

  /* Heading shown above each category's list */
  var HEADINGS = { Law: 'Laws', Decree: 'Decrees', Treaty: 'Treaties', Policy: 'Policies', Proclamation: 'Proclamations', Other: 'Other documents' };

  function href(d) { return d.slug === 'constitution' ? 'constitution.html' : 'document.html?d=' + encodeURIComponent(d.slug); }

  S.api('public', 'documents').then(function (a) {
    root.textContent = '';
    if (!a.success) { root.appendChild(el('p', 'form-message form-message-error', a.msg)); return; }
    var docs = a.documents;

    var constitution = docs.filter(function (d) { return d.slug === 'constitution'; })[0];
    var feature = S.link('', 'constitution.html', 'doc-feature');
    feature.appendChild(el('span', 'doc-feature-tag', 'Supreme law'));
    feature.appendChild(el('h2', null, constitution ? constitution.title : 'The Constitution'));
    feature.appendChild(el('p', null, constitution && constitution.summary ? constitution.summary : 'The founding law of Yellonia: how the state is organised and the rights of its people.'));
    feature.appendChild(el('span', 'doc-feature-go', constitution ? 'Read the Constitution →' : 'Coming soon'));
    root.appendChild(feature);

    var search = el('input'); search.type = 'search'; search.placeholder = 'Search documents'; search.className = 'doc-search';
    search.setAttribute('aria-label', 'Search documents');
    root.appendChild(search);
    var list = el('div', 'doc-library');
    root.appendChild(list);

    function draw() {
      list.textContent = '';
      var q = search.value.trim().toLowerCase();
      var rest = docs.filter(function (d) {
        if (d.slug === 'constitution') return false;
        return !q || (d.title + ' ' + (d.summary || '') + ' ' + d.category).toLowerCase().indexOf(q) !== -1;
      });
      if (!rest.length) { list.appendChild(el('p', 'form-note', docs.length > (constitution ? 1 : 0) ? 'No documents match.' : 'No other documents have been published yet.')); return; }
      var groups = {};
      rest.forEach(function (d) { (groups[d.category] = groups[d.category] || []).push(d); });
      a.categories.concat(Object.keys(groups).filter(function (c) { return a.categories.indexOf(c) === -1; })).forEach(function (c) {
        if (!groups[c]) return;
        var section = el('section', 'doc-group');
        section.appendChild(el('h3', null, HEADINGS[c] || c));
        var ul = el('ul', 'doc-items');
        groups[c].forEach(function (d) {
          var li = el('li');
          var link = S.link('', href(d), 'doc-item');
          link.appendChild(el('strong', null, d.title));
          if (d.summary) link.appendChild(el('span', 'doc-item-summary', d.summary));
          link.appendChild(el('span', 'doc-item-date', d.effectiveDate ? 'In force from ' + d.effectiveDate : 'Published ' + S.day(d.publishedAt || d.updatedAt)));
          li.appendChild(link);
          ul.appendChild(li);
        });
        section.appendChild(ul);
        list.appendChild(section);
      });
    }
    search.addEventListener('input', draw);
    draw();
  });
})();
