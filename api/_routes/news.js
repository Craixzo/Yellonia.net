/* ==============================================================
   api/news.js - everything the news pages read

   Asks the Centurion bot for news outlets and articles, and passes
   them to news.html, outlet.html and article.html.

   The site reads it at:
     /api/news?view=outlets                          every approved outlet
     /api/news?view=latest                           the newest articles
     /api/news?view=outlet&outlet=SLUG               one outlet's front page
     /api/news?view=article&outlet=SLUG&article=SLUG one article
     /api/news?view=preview&key=KEY                  an unpublished article, from a review link

   Until Centurion is connected (no CENTURION_URL setting), it answers
   with the PREVIEW content at the bottom of this file, so the pages
   can be seen and styled. Every preview answer has "preview": true.

   Written as a plain (request, response) function, so it runs on
   Vercel now and inside a small Node server later (e.g. on Railway).
   ============================================================== */

/* ---------- SETTINGS ---------- */
const CENTURION_URL = (process.env.CENTURION_URL || '').replace(/\/+$/, '');
const CACHE_SECONDS = 60;    // how long an answer is reused before asking Centurion again


/* ---------- HELPERS ---------- */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MEDIA = /^\/news\/media\/[a-f0-9]{32}\.(png|jpg|webp|gif)$/;

/* Turns the bot's image paths into full addresses, and drops anything else */
function fixImages(value) {
  if (Array.isArray(value)) return value.map(fixImages);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const key of Object.keys(value)) {
    const item = value[key];
    if ((key === 'icon' || key === 'cover' || key === 'src') && typeof item === 'string') {
      out[key] = MEDIA.test(item) ? CENTURION_URL + item : null;
    } else {
      out[key] = fixImages(item);
    }
  }
  return out;
}

function pathFor(query) {
  const view = String(query.view || '');
  const outlet = String(query.outlet || '');
  const article = String(query.article || '');
  if (view === 'outlets') return '/news/outlets';
  if (view === 'latest') return '/news/latest?limit=12';
  if (view === 'outlet' && SLUG.test(outlet)) return '/news/outlets/' + outlet;
  if (view === 'article' && SLUG.test(outlet) && SLUG.test(article)) return '/news/outlets/' + outlet + '/articles/' + article;
  if (view === 'preview' && /^[a-f0-9]{32}$/.test(String(query.key || ''))) return '/news/preview/' + query.key;
  return null;
}


/* ---------- THE FUNCTION ---------- */
module.exports = async (request, response) => {
  const query = request.query || Object.fromEntries(new URL(request.url, 'http://x').searchParams);
  const path = pathFor(query);
  if (!path) return response.status(400).json({ success: false, msg: 'Unknown news request.' });

  if (!CENTURION_URL) {
    const answer = preview(query);
    if (!answer) return response.status(404).json({ success: false, msg: 'Not found.' });
    response.setHeader('Cache-Control', 's-maxage=' + CACHE_SECONDS);
    return response.status(200).json(Object.assign({ success: true, preview: true }, answer));
  }

  try {
    const reply = await fetch(CENTURION_URL + path, { signal: AbortSignal.timeout(5000) });   // give up after 5 seconds
    const data = await reply.json();
    if (reply.status === 404) return response.status(404).json({ success: false, msg: 'Not found.' });
    if (!reply.ok || !data.success) throw new Error('Centurion answered ' + reply.status);
    response.setHeader('Cache-Control', String(query.view) === 'preview' ? 'no-store' : 's-maxage=' + CACHE_SECONDS + ', stale-while-revalidate=86400');
    return response.status(200).json(fixImages(data));
  } catch (error) {
    response.setHeader('Cache-Control', 's-maxage=15');
    return response.status(502).json({ success: false, msg: 'The news could not be loaded right now.' });
  }
};


/* ---------- PREVIEW CONTENT ----------
   Shown only while CENTURION_URL is not set. Made-up outlets and articles
   so the design can be checked before real outlets exist. */
function preview(query) {
  const IMG = 'images/yeloria.png';
  const ICON = 'images/TYEcoatofarms.png';
  const outlets = [
    { slug: 'concord-herald', name: 'The Concord Herald', tagline: 'News from the capital since 1923', description: 'Politics, government and life in the capital.', accentColor: '#369cd3', icon: ICON, cover: IMG, sections: ['Politics', 'Military', 'Economy', 'Culture'] },
    { slug: 'echelon-dispatch', name: 'Echelon Dispatch', tagline: 'The state of Echelon, every day', description: 'Local news from the state of Echelon.', accentColor: '#5bbf49', icon: ICON, cover: null, sections: ['Local', 'Sport'] },
  ];
  const p = (text) => ({ type: 'p', text: text });
  const articles = {
    'concord-herald': [
      { slug: 'fulcrum-party-takes-every-seat', headline: 'Fulcrum Party takes all 17 open seats after uncontested election', summary: 'With no other party on the ballot, the Fulcrum Party will hold every open seat in Parliament for the coming term.', section: 'Politics', cover: IMG, coverCaption: 'The Parliament Building in the capital.', authorName: 'Preview Writer', isCoverStory: true, publishedAt: '2026-10-22T15:00:00.000Z',
        body: [p('This is preview text, shown until Centurion is connected. Real articles replace it automatically.'), p('Articles are made of paragraphs, sub-headings, quotes and pictures. This paragraph shows how ordinary body text looks: a serif face at a comfortable reading size, with generous spacing between lines.'), { type: 'h2', text: 'What happens next' }, p('Sub-headings like the one above break a long article into parts.'), { type: 'quote', text: 'A quote looks like this, set apart from the text around it.', by: 'A Yellonian official' }, { type: 'img', src: IMG, caption: 'Pictures can sit inside the article, with a caption.' }, p('The article ends here, followed by more stories from the same outlet.')] },
      { slug: 'ceremonial-guard-new-post', headline: 'Ceremonial Guard takes up new post at the National Museum', summary: 'The Guard will stand watch at the museum entrance during opening hours.', section: 'Military', cover: IMG, coverCaption: null, authorName: 'Preview Writer', isCoverStory: false, publishedAt: '2026-10-21T12:00:00.000Z', body: [p('Preview article.')] },
      { slug: 'stock-market-opens-higher', headline: 'Stock market opens higher as new corporations list', summary: 'Three new corporations joined the exchange this week.', section: 'Economy', cover: null, coverCaption: null, authorName: 'Preview Writer', isCoverStory: false, publishedAt: '2026-10-20T09:00:00.000Z', body: [p('Preview article.')] },
      { slug: 'capital-lantern-festival', headline: 'Lanterns line the reflecting pool for the autumn festival', summary: 'Citizens gathered along the capital\'s reflecting pool for an evening of music.', section: 'Culture', cover: IMG, coverCaption: null, authorName: 'Preview Writer', isCoverStory: false, publishedAt: '2026-10-19T20:00:00.000Z', body: [p('Preview article.')] },
      { slug: 'supreme-court-hearing', headline: 'Imperial Supreme Court to hear first case of the term', summary: 'Five judges will sit for the hearing next week.', section: 'Politics', cover: null, coverCaption: null, authorName: 'Preview Writer', isCoverStory: false, publishedAt: '2026-10-18T14:00:00.000Z', body: [p('Preview article.')] },
      { slug: 'second-fleet-exercise', headline: '2nd Fleet completes exercise off the coast', summary: 'The Carrier Strike Group returned to port after a week at sea.', section: 'Military', cover: IMG, coverCaption: null, authorName: 'Preview Writer', isCoverStory: false, publishedAt: '2026-10-17T10:00:00.000Z', body: [p('Preview article.')] },
    ],
    'echelon-dispatch': [
      { slug: 'echelon-road-works', headline: 'Road works begin on Echelon\'s main avenue', summary: 'Traffic will be diverted for two weeks.', section: 'Local', cover: null, coverCaption: null, authorName: 'Preview Writer', isCoverStory: false, publishedAt: '2026-10-21T08:00:00.000Z', body: [p('Preview article.')] },
    ],
  };
  const summary = (a) => { const s = Object.assign({}, a); delete s.body; return s; };
  const view = String(query.view || '');

  if (view === 'outlets') return { outlets: outlets.map((o) => Object.assign({}, o, { articleCount: articles[o.slug].length, lastPublishedAt: articles[o.slug][0].publishedAt })) };
  if (view === 'latest') {
    const all = [];
    outlets.forEach((o) => articles[o.slug].forEach((a) => all.push(Object.assign(summary(a), { outlet: { slug: o.slug, name: o.name, icon: o.icon, accentColor: o.accentColor } }))));
    all.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    return { articles: all.slice(0, 12) };
  }
  const outlet = outlets.find((o) => o.slug === query.outlet);
  if (!outlet) return null;
  if (view === 'outlet') return { outlet: outlet, articles: articles[outlet.slug].map(summary) };
  const article = articles[outlet.slug].find((a) => a.slug === query.article);
  if (!article) return null;
  return { outlet: outlet, article: article, more: articles[outlet.slug].filter((a) => a !== article).slice(0, 4).map(summary) };
}
