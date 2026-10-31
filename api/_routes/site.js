/* ==============================================================
   api/site.js - job board, official documents, contact (modmail)
   and the staff area

   The pages send  POST /api/site  with JSON { "scope": ..., "action": ... }.

   scope "public" (no login):  documents, document, jobs, job, counts
   scope "user"   (Discord login):
       me, modmail-mine, modmail-thread, modmail-send,
       jobs-me, job-apply, job-withdraw, job-post, job-update, job-close, job-apps, job-decide
   scope "staff"  (Discord login + a staff role, checked by Centurion):
       overview, modmail-inbox, modmail-thread, modmail-reply, modmail-close,
       docs, doc, doc-save, doc-status, doc-delete, job-remove

   Centurion checks everything again, including who is staff or an officer
   (from their roles in the Yellonia Discord server).
   ============================================================== */

const { getSession, siteOrigin } = require('../_lib/session');
const { centurion } = require('../_lib/des');

const ACTIONS = {
  public: ['documents', 'document', 'jobs', 'job', 'counts'],
  user: ['me', 'modmail-mine', 'modmail-thread', 'modmail-send', 'jobs-me', 'job-apply', 'job-withdraw', 'job-post', 'job-update', 'job-close', 'job-apps', 'job-decide'],
  staff: ['overview', 'modmail-inbox', 'modmail-thread', 'modmail-reply', 'modmail-close', 'docs', 'doc', 'doc-save', 'doc-status', 'doc-delete', 'job-remove'],
};

/* Only these fields are passed on to Centurion */
const FIELDS = ['id', 'slug', 'number', 'scope', 'subject', 'body', 'internal', 'category', 'title', 'organisation', 'description',
  'requirements', 'applyOnSite', 'howToApply', 'days', 'message', 'applicationId', 'accept', 'note', 'summary', 'effectiveDate',
  'publish', 'originalSlug'];

/* Public lists are the same for everyone, so they're kept for a few seconds */
const CACHE_SECONDS = 15;
const cache = {};

module.exports = async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') return response.status(405).json({ success: false, msg: 'Use POST.' });

  // Requests must come from this site's own pages
  const origin = request.headers.origin;
  if (origin && origin !== siteOrigin(request)) return response.status(403).json({ success: false, msg: 'Not allowed.' });

  let body = request.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (error) { body = {}; } }
  body = body || {};
  const scope = String(body.scope || '');
  const action = String(body.action || '');
  if (!ACTIONS[scope] || !ACTIONS[scope].includes(action)) return response.status(400).json({ success: false, msg: 'Unknown action.' });

  const payload = {};
  FIELDS.forEach((field) => { if (body[field] !== undefined) payload[field] = body[field]; });
  /* the inbox filter is also called "scope"; pass it under that name */
  if (body.filter !== undefined) payload.scope = body.filter; else delete payload.scope;

  const user = getSession(request);
  if (scope !== 'public' && !user) return response.status(401).json({ success: false, needsLogin: true, msg: 'Please log in with Discord first.' });
  if (user) { payload.discordId = user.id; payload.discordName = user.name || user.username; }

  if (scope === 'public' && (action === 'documents' || action === 'jobs' || action === 'counts') && !payload.category) {
    const hit = cache[action];
    if (hit && Date.now() - hit.at < CACHE_SECONDS * 1000) return response.status(200).json(hit.data);
    const data = await centurion('/site/public/' + action, payload);
    if (data.success) cache[action] = { at: Date.now(), data };
    return response.status(200).json(data);
  }

  if (action.startsWith('job-') || action.startsWith('doc-')) { delete cache.jobs; delete cache.documents; delete cache.counts; }
  return response.status(200).json(await centurion('/site/' + scope + '/' + action, payload));
};
