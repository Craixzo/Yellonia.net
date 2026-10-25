/* ==============================================================
   api/newsroom.js - actions for logged-in users, passed on to Centurion

   The page sends  POST /api/newsroom  with JSON like { "action": "register", ... }.
   This adds the logged-in user's Discord ID (from their login cookie, never
   from the page) and the Centurion API key, then asks the bot.

   Actions:  mine, register, add-writer, remove-writer,
             upload, outlet-settings, outlet-update,
             articles, article, article-save, article-submit, article-delete

   Every answer also has "mediaBase": the address uploaded images are shown from.
   ============================================================== */

const { getSession, siteOrigin } = require('../_lib/session');

const CENTURION_URL = (process.env.CENTURION_URL || '').replace(/\/+$/, '');
const ACTIONS = ['mine', 'register', 'add-writer', 'remove-writer',
  'upload', 'outlet-settings', 'outlet-update',
  'articles', 'article', 'article-save', 'article-submit', 'article-delete'];

/* Only these fields are passed on, whatever else the page sends */
const FIELDS = ['name', 'tagline', 'description', 'sections', 'accentColor', 'outlet', 'username', 'writerId',
  'id', 'headline', 'summary', 'section', 'body', 'coverFile', 'coverCaption', 'isCoverStory', 'iconFile', 'data'];

module.exports = async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') return response.status(405).json({ success: false, msg: 'Use POST.' });

  // Requests must come from this site's own pages
  const origin = request.headers.origin;
  if (origin && origin !== siteOrigin(request)) return response.status(403).json({ success: false, msg: 'Not allowed.' });

  const user = getSession(request);
  if (!user) return response.status(401).json({ success: false, msg: 'Please log in with Discord first.' });

  let body = request.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (error) { body = {}; } }
  body = body || {};
  if (!ACTIONS.includes(body.action)) return response.status(400).json({ success: false, msg: 'Unknown action.' });
  if (!CENTURION_URL || !process.env.CENTURION_API_KEY) return response.status(503).json({ success: false, msg: 'The newsroom isn\'t connected to Centurion yet.' });

  const payload = { discordId: user.id };
  FIELDS.forEach((field) => { if (body[field] !== undefined) payload[field] = body[field]; });

  try {
    const reply = await fetch(CENTURION_URL + '/news/manage/' + body.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: process.env.CENTURION_API_KEY },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    });
    const data = await reply.json();
    if (data.msg === 'Unauthorized') {
      console.error('[newsroom] Centurion rejected the API key; check CENTURION_API_KEY matches API_KEY on Railway.');
      return response.status(502).json({ success: false, msg: 'The newsroom couldn\'t reach Centurion. Please tell a developer.' });
    }
    data.mediaBase = CENTURION_URL + '/news/media/';
    return response.status(200).json(data);
  } catch (error) {
    return response.status(502).json({ success: false, msg: 'Centurion didn\'t answer. Please try again in a minute.' });
  }
};
