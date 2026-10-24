/* ==============================================================
   des-home.js - the News section on emergency-services.html

   Shows the latest stories from the DES outlet in Yellonia News.
   The outlet is set by data-outlet on <div class="des-news">.
   If the outlet doesn't exist yet, "No news yet." stays.
   ============================================================== */

(function () {
  var box = document.querySelector('.des-news[data-outlet]');
  if (!box) return;
  var slug = box.getAttribute('data-outlet');

  fetch('/api/news?view=outlet&outlet=' + encodeURIComponent(slug))
    .then(function (reply) { return reply.ok ? reply.json() : null; })
    .then(function (data) {
      if (!data || !data.articles || !data.articles.length) return;
      box.textContent = '';
      var grid = document.createElement('div');
      grid.className = 'unit-grid';
      data.articles.slice(0, 3).forEach(function (article) {
        var card = document.createElement('a');
        card.className = 'unit des-news-card';
        card.href = 'article.html?o=' + encodeURIComponent(slug) + '&a=' + encodeURIComponent(article.slug);
        var title = document.createElement('h3');
        title.textContent = article.headline;
        card.appendChild(title);
        if (article.summary) {
          var summary = document.createElement('p');
          summary.textContent = article.summary;
          card.appendChild(summary);
        }
        grid.appendChild(card);
      });
      box.appendChild(grid);
      var more = document.createElement('a');
      more.className = 'text-link';
      more.href = 'outlet.html?o=' + encodeURIComponent(slug);
      more.textContent = 'All DES news';
      box.appendChild(more);
    })
    .catch(function () { /* keep "No news yet." */ });
})();
