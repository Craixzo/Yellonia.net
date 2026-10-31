/* ==============================================================
   document.js - one official document (document.html?d=<slug>),
   and the Constitution (constitution.html)

   Which document: the page's <main data-slug="..."> if it has one
   (constitution.html uses data-slug="constitution"), otherwise ?d= in the address.
   Draws a contents list from the "## " headings, which stays beside the
   text on wide screens and highlights the part you're reading.
   ============================================================== */
(function () {
  var S = window.SITE;
  var el = S.el;
  var root = document.getElementById('doc-root');
  if (!root) return;
  var main = root.closest('main');
  var slug = (main && main.getAttribute('data-slug')) || new URLSearchParams(location.search).get('d') || '';
  var isConstitution = slug === 'constitution';

  S.api('public', 'document', { slug: slug }).then(function (a) {
    root.textContent = '';
    if (!a.success) {
      var box = el('div', 'doc-missing');
      box.appendChild(el('h2', null, isConstitution ? 'The Constitution hasn\'t been published yet' : 'Document not found'));
      box.appendChild(el('p', null, isConstitution ? 'It will appear here once it\'s published.' : 'It may have been moved or withdrawn.'));
      box.appendChild(S.link('Browse official documents', 'documents.html', 'text-link'));
      root.appendChild(box);
      return;
    }
    var d = a.document;
    document.title = d.title + ' | Yellonia';

    if (!isConstitution) {
      var head = el('header', 'doc-head');
      head.appendChild(el('span', 'doc-feature-tag', d.category));
      head.appendChild(el('h1', null, d.title));
      if (d.summary) head.appendChild(el('p', 'doc-summary', d.summary));
      root.appendChild(head);
    } else {
      var titleEl = document.getElementById('constitution-title');
      if (titleEl) titleEl.textContent = d.title;
      var sub = document.getElementById('constitution-summary');
      if (sub && d.summary) sub.textContent = d.summary;
    }

    var meta = el('p', 'doc-meta');
    meta.textContent = (d.effectiveDate ? 'In force from ' + d.effectiveDate + ' · ' : '') + 'Last updated ' + S.day(d.updatedAt);
    root.appendChild(meta);

    var layout = el('div', 'doc-layout');
    var nav = el('nav', 'doc-toc'); nav.setAttribute('aria-label', 'Contents');
    var text = el('div', 'doc-text');
    layout.appendChild(nav);
    layout.appendChild(text);
    root.appendChild(layout);

    var headings = S.renderText(text, d.body);
    if (headings.length < 2) { nav.remove(); layout.classList.add('doc-layout-single'); return; }

    nav.appendChild(el('p', 'doc-toc-title', 'Contents'));
    var ol = el('ol');
    var links = {};
    headings.forEach(function (h) {
      var li = el('li');
      var link = S.link(h.text, '#' + h.id);
      links[h.id] = link;
      li.appendChild(link);
      ol.appendChild(li);
    });
    nav.appendChild(ol);

    /* Highlight the section being read */
    if ('IntersectionObserver' in window) {
      var current = null;
      var watcher = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          if (current) current.removeAttribute('aria-current');
          current = links[entry.target.id];
          if (current) current.setAttribute('aria-current', 'true');
        });
      }, { rootMargin: '-15% 0px -75% 0px' });
      headings.forEach(function (h) { var t = document.getElementById(h.id); if (t) watcher.observe(t); });
    }
    if (location.hash) { var target = document.getElementById(location.hash.slice(1)); if (target) target.scrollIntoView(); }
  });
})();
