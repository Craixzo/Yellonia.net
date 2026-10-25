/* ==============================================================
   api/apply.js - the public application form (apply.html)

   Needs a Discord login (the same login the newsroom uses).

   The page sends  POST /api/apply  with JSON:
     { "action": "status" }                    the form's questions, and this account's applications
     { "action": "submit", "department": ... } send an application
     { "action": "withdraw", "number": ... }   withdraw an open application

   Centurion checks everything again: one open application at a time,
   a wait after being declined, and the Roblox username must exist.
   ============================================================== */

const { getSession, siteOrigin } = require('../_lib/session');
const { centurion } = require('../_lib/des');

/* Only these fields are passed on to Centurion */
const FIELDS = ['department', 'robloxUsername', 'answers', 'number'];

module.exports = async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') return response.status(405).json({ success: false, msg: 'Use POST.' });

  // Requests must come from this site's own pages
  const origin = request.headers.origin;
  if (origin && origin !== siteOrigin(request)) return response.status(403).json({ success: false, msg: 'Not allowed.' });

  const user = getSession(request);
  if (!user) return response.status(401).json({ success: false, needsLogin: true, msg: 'Please log in with Discord first.' });

  let body = request.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (error) { body = {}; } }
  body = body || {};

  const payload = { discordId: user.id, discordName: user.name || user.username };
  FIELDS.forEach((field) => { if (body[field] !== undefined) payload[field] = body[field]; });

  if (body.action === 'status') return response.status(200).json(await centurion('/des/public/apply-status', payload));
  if (body.action === 'submit') return response.status(200).json(await centurion('/des/public/apply', payload));
  if (body.action === 'withdraw') return response.status(200).json(await centurion('/des/public/apply-withdraw', payload));
  return response.status(400).json({ success: false, msg: 'Unknown action.' });
};
