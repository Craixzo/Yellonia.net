/* ==============================================================
   news.js - draws the three news pages

     news.html     the directory: latest stories and every outlet
     outlet.html   one outlet's front page      (outlet.html?o=SLUG)
     article.html  one article                  (article.html?o=SLUG&a=SLUG)

   Each page says which one it is with <body data-news="...">.
   The content comes from /api/news. Everything is added as plain
   text, so nothing an outlet writes can run as code on the site.

   CONTENTS
     1. HELPERS
     2. SHARED PIECES (story cards, outlet badges, notices)
     3. DIRECTORY PAGE
     4. OUTLET FRONT PAGE
     5. ARTICLE PAGE
     6. START
   ============================================================== */

(function () {

  /* ---------- 1. HELPERS ---------- */
  var page = document.body.getAttribute('data-news');
  var root = document.getElementById('news-root');
  if (!page || !root) return;

  var params = new URLSearchParams(location.search);
  var DEFAULT_ACCENT = '#bed215';

  /* Makes an element: el('h2', 'my-class', 'Some text') */
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function img(src, alt, className) {
    var picture = el('img', className);
    picture.src = src;
    picture.alt = alt || '';
    picture.loading = 'lazy';
    picture.onerror = function () { picture.remove(); };
    return picture;
  }

  function date(value) {
    if (!value) return '';
    return new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  function outletLink(slug) { return 'outlet.html?o=' + encodeURIComponent(slug); }
  function articleLink(outletSlug, articleSlug) { return 'article.html?o=' + encodeURIComponent(outletSlug) + '&a=' + encodeURIComponent(articleSlug); }
  function sectionId(name) { return 'section-' + String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-'); }

  function load(query) {
    return fetch('/api/news?' + query).then(function (reply) {
      if (reply.status === 404) return { notFound: true };
      if (!reply.ok) throw new Error();
      return reply.json();
    });
  }


  /* ---------- 2. SHARED PIECES ---------- */

  /* A notice in place of the page: not found, could not load, or empty */
  function notice(title, text, linkText, linkHref) {
    root.textContent = '';
    var box = el('section', 'news-notice');
    box.appendChild(el('h1', null, title));
    box.appendChild(el('p', null, text));
    if (linkText) {
      var link = el('a', 'news-notice-link', linkText);
      link.href = linkHref;
      box.appendChild(link);
    }
    root.appendChild(box);
  }

  /* Shown above the content while the site is showing made-up preview articles */
  function previewBanner(data) {
    if (!data.preview) return null;
    return el('p', 'news-preview', 'Preview: these outlets and articles are made-up examples. Real ones appear here once Centurion is connected.');
  }

  /* An outlet's name with its square icon, used on story cards */
  function outletBadge(outlet) {
    var badge = el('a', 'news-badge');
    badge.href = outletLink(outlet.slug);
    badge.style.setProperty('--accent', outlet.accentColor || DEFAULT_ACCENT);
    if (outlet.icon) badge.appendChild(img(outlet.icon, '', 'news-badge-icon'));
    badge.appendChild(el('span', null, outlet.name));
    return badge;
  }

  /* One story. size: 'lead', 'side', 'card' or 'line' */
  function story(article, outletSlug, size, outlet) {
    var item = el('article', 'story story-' + size);
    var href = articleLink(outletSlug, article.slug);

    if (article.cover && size !== 'line') {
      var pictureLink = el('a', 'story-image');
      pictureLink.href = href;
      pictureLink.tabIndex = -1;
      pictureLink.appendChild(img(article.cover, ''));
      item.appendChild(pictureLink);
    }

    var text = el('div', 'story-text');
    if (outlet) text.appendChild(outletBadge(outlet));
    else if (article.section) text.appendChild(el('span', 'story-section', article.section));

    var heading = el(size === 'lead' ? 'h2' : 'h3', 'story-headline');
    var link = el('a', null, article.headline);
    link.href = href;
    heading.appendChild(link);
    text.appendChild(heading);

    if (article.summary && size !== 'line') text.appendChild(el('p', 'story-summary', article.summary));

    var meta = el('p', 'story-meta');
    meta.textContent = (size === 'lead' && article.authorName ? 'By ' + article.authorName + '  |  ' : '') + date(article.publishedAt);
    text.appendChild(meta);

    item.appendChild(text);
    return item;
  }


  /* ---------- 3. DIRECTORY PAGE ---------- */
  function directory() {
    Promise.all([load('view=latest'), load('view=outlets')]).then(function (answers) {
      var latest = answers[0], outlets = answers[1];
      root.textContent = '';
      var banner = previewBanner(latest);
      if (banner) root.appendChild(banner);

      /* Latest stories */
      var latestSection = el('section', 'page news-section');
      latestSection.id = 'latest';
      latestSection.appendChild(el('h2', 'news-section-title', 'Latest stories'));
      if (!latest.articles || !latest.articles.length) {
        latestSection.appendChild(el('p', 'news-empty', 'No stories have been published yet.'));
      } else {
        var grid = el('div', 'story-grid');
        latest.articles.forEach(function (article) { grid.appendChild(story(article, article.outlet.slug, 'card', article.outlet)); });
        latestSection.appendChild(grid);
      }
      root.appendChild(latestSection);

      /* Every outlet */
      var outletSection = el('section', 'page news-section');
      outletSection.id = 'outlets';
      outletSection.appendChild(el('h2', 'news-section-title', 'News outlets'));
      if (!outlets.outlets || !outlets.outlets.length) {
        outletSection.appendChild(el('p', 'news-empty', 'No news outlets have been registered yet.'));
      } else {
        var list = el('div', 'outlet-grid');
        outlets.outlets.forEach(function (outlet) {
          var card = el('a', 'outlet-card');
          card.href = outletLink(outlet.slug);
          card.style.setProperty('--accent', outlet.accentColor || DEFAULT_ACCENT);
          var cover = el('div', 'outlet-card-cover');
          if (outlet.cover) cover.appendChild(img(outlet.cover, ''));
          card.appendChild(cover);
          var body = el('div', 'outlet-card-body');
          if (outlet.icon) body.appendChild(img(outlet.icon, '', 'outlet-card-icon'));
          body.appendChild(el('h3', null, outlet.name));
          if (outlet.tagline) body.appendChild(el('p', 'outlet-card-tagline', outlet.tagline));
          body.appendChild(el('p', 'outlet-card-meta', outlet.articleCount + (outlet.articleCount === 1 ? ' article' : ' articles')));
          card.appendChild(body);
          list.appendChild(card);
        });
        outletSection.appendChild(list);
      }
      root.appendChild(outletSection);
    }).catch(function () {
      notice('The news could not be loaded', 'Please try again in a minute.', 'Back to the homepage', 'index.html');
    });
  }


  /* ---------- 4. OUTLET FRONT PAGE ---------- */

  /* The top of every outlet page: cover image, icon, name, tagline, date, sections */
  function masthead(outlet, sections, onFront) {
    var head = el('header', 'masthead' + (outlet.cover ? ' masthead-cover' : ''));
    if (outlet.cover) head.appendChild(img(outlet.cover, '', 'masthead-image'));

    var inner = el('div', 'masthead-inner');
    var top = el('div', 'masthead-top');
    top.appendChild(el('span', null, date(new Date().toISOString())));
    var home = el('a', null, 'Yellonia News');
    home.href = 'news.html';
    top.appendChild(home);
    inner.appendChild(top);

    var title = el('a', 'masthead-title');
    title.href = outletLink(outlet.slug);
    if (outlet.icon) title.appendChild(img(outlet.icon, '', 'masthead-icon'));
    title.appendChild(el('span', null, outlet.name));
    inner.appendChild(title);
    if (outlet.tagline) inner.appendChild(el('p', 'masthead-tagline', outlet.tagline));
    head.appendChild(inner);

    /* Section links: on the front page they jump down; elsewhere they go to the front page */
    if (sections.length) {
      var nav = el('nav', 'paper-sections');
      nav.setAttribute('aria-label', outlet.name + ' sections');
      sections.forEach(function (name) {
        var link = el('a', null, name);
        link.href = (onFront ? '' : outletLink(outlet.slug)) + '#' + sectionId(name);
        nav.appendChild(link);
      });
      head.appendChild(nav);
    }
    return head;
  }

  function paperShell(outlet) {
    root.textContent = '';
    root.className = 'paper';
    root.style.setProperty('--accent', outlet.accentColor || DEFAULT_ACCENT);
  }

  function front() {
    var slug = params.get('o') || '';
    load('view=outlet&outlet=' + encodeURIComponent(slug)).then(function (data) {
      if (data.notFound) return notice('Outlet not found', 'This news outlet doesn\'t exist, or isn\'t open yet.', 'See every outlet', 'news.html#outlets');
      var outlet = data.outlet, articles = data.articles || [];
      document.title = outlet.name + ' | Yellonia News';

      paperShell(outlet);
      var banner = previewBanner(data);
      if (banner) root.appendChild(banner);

      if (!articles.length) {
        root.appendChild(masthead(outlet, [], true));
        var empty = el('div', 'paper-body');
        empty.appendChild(el('p', 'paper-empty', outlet.name + ' hasn\'t published any stories yet.'));
        root.appendChild(empty);
        return;
      }

      /* Lead story: the one marked as the cover story, or else the newest.
         The next four go in the column beside it. */
      var lead = articles.filter(function (a) { return a.isCoverStory; })[0] || articles[0];
      var rest = articles.filter(function (a) { return a !== lead; });
      var sideStories = rest.slice(0, 4);        /* the "Latest" column */

      /* Sections that have stories, in the outlet's chosen order, then any others */
      var named = (outlet.sections || []).filter(function (name) { return rest.some(function (a) { return a.section === name; }); });
      rest.forEach(function (a) { if (a.section && named.indexOf(a.section) === -1) named.push(a.section); });

      root.appendChild(masthead(outlet, named, true));
      var body = el('div', 'paper-body');

      var top = el('section', 'paper-top');
      top.appendChild(story(lead, outlet.slug, 'lead'));
      var side = el('div', 'paper-side');
      if (sideStories.length) side.appendChild(el('h2', 'paper-side-title', 'Latest'));
      sideStories.forEach(function (a) { side.appendChild(story(a, outlet.slug, 'side')); });
      top.appendChild(side);
      body.appendChild(top);

      /* One block per section */
      named.forEach(function (name) {
        var inSection = rest.filter(function (a) { return a.section === name; });
        if (!inSection.length) return;
        var block = el('section', 'paper-block');
        block.id = sectionId(name);
        block.appendChild(el('h2', 'paper-block-title', name));
        var grid = el('div', 'paper-grid');
        inSection.slice(0, 6).forEach(function (a) { grid.appendChild(story(a, outlet.slug, 'card')); });
        block.appendChild(grid);
        body.appendChild(block);
      });

      /* Stories with no section */
      var loose = rest.slice(4).filter(function (a) { return !a.section; });
      if (loose.length) {
        var block = el('section', 'paper-block');
        block.appendChild(el('h2', 'paper-block-title', 'More stories'));
        var grid = el('div', 'paper-grid');
        loose.slice(0, 9).forEach(function (a) { grid.appendChild(story(a, outlet.slug, 'card')); });
        block.appendChild(grid);
        body.appendChild(block);
      }

      root.appendChild(body);
    }).catch(function () {
      notice('This outlet could not be loaded', 'Please try again in a minute.', 'Back to Yellonia News', 'news.html');
    });
  }


  /* ---------- 5. ARTICLE PAGE ---------- */
  function article() {
    var outletSlug = params.get('o') || '', articleSlug = params.get('a') || '', previewKey = params.get('preview');
    var query = previewKey
      ? 'view=preview&key=' + encodeURIComponent(previewKey)
      : 'view=article&outlet=' + encodeURIComponent(outletSlug) + '&article=' + encodeURIComponent(articleSlug);
    load(query).then(function (data) {
      if (data.notFound) return notice('Article not found', 'This article doesn\'t exist, or has been taken down.', 'Back to Yellonia News', 'news.html');
      var outlet = data.outlet, item = data.article;
      document.title = item.headline + ' | ' + outlet.name;

      paperShell(outlet);
      var banner = previewBanner(data);
      if (banner) root.appendChild(banner);
      if (previewKey) {
        var STATUS = { DRAFT: 'a draft', SUBMITTED: 'waiting for review', REJECTED: 'not approved', PUBLISHED: 'published' };
        root.appendChild(el('p', 'news-preview', 'Review copy: this article is ' + (STATUS[data.status] || 'not published') + '. Only people with this link can see it.'));
      }
      root.appendChild(masthead(outlet, outlet.sections || [], false));

      var piece = el('article', 'paper-article');
      var head = el('header', 'article-head');
      if (item.section) head.appendChild(el('p', 'story-section', item.section));
      head.appendChild(el('h1', 'article-headline', item.headline));
      if (item.summary) head.appendChild(el('p', 'article-dek', item.summary));
      var byline = el('p', 'article-byline');
      byline.appendChild(el('span', 'article-author', 'By ' + item.authorName));
      byline.appendChild(el('span', null, date(item.publishedAt)));
      head.appendChild(byline);
      piece.appendChild(head);

      if (item.cover) {
        var figure = el('figure', 'article-cover');
        figure.appendChild(img(item.cover, item.coverCaption || ''));
        if (item.coverCaption) figure.appendChild(el('figcaption', null, item.coverCaption));
        piece.appendChild(figure);
      }

      var text = el('div', 'article-body');
      (item.body || []).forEach(function (block) {
        if (block.type === 'p') text.appendChild(el('p', null, block.text));
        else if (block.type === 'h2') text.appendChild(el('h2', null, block.text));
        else if (block.type === 'quote') {
          var quote = el('blockquote');
          quote.appendChild(el('p', null, block.text));
          if (block.by) quote.appendChild(el('cite', null, block.by));
          text.appendChild(quote);
        } else if (block.type === 'img' && block.src) {
          var picture = el('figure');
          picture.appendChild(img(block.src, block.caption || ''));
          if (block.caption) picture.appendChild(el('figcaption', null, block.caption));
          text.appendChild(picture);
        }
      });
      piece.appendChild(text);
      root.appendChild(piece);

      if (data.more && data.more.length) {
        var more = el('section', 'paper-block paper-more');
        more.appendChild(el('h2', 'paper-block-title', 'More from ' + outlet.name));
        var grid = el('div', 'paper-grid');
        data.more.forEach(function (a) { grid.appendChild(story(a, outlet.slug, 'card')); });
        more.appendChild(grid);
        root.appendChild(more);
      }
    }).catch(function () {
      notice('This article could not be loaded', 'Please try again in a minute.', 'Back to Yellonia News', 'news.html');
    });
  }


  /* ---------- 6. START ---------- */
  if (page === 'directory') directory();
  else if (page === 'outlet') front();
  else if (page === 'article') article();
})();
