/* ==============================================================
   api/report.js - the public complaint and fire report forms

   Used by report.html. Needs a Discord login (the same login the
   newsroom uses), so every report is tied to a real account and
   people can check on their own reports.

   The page sends  POST /api/report  with JSON:
     { "action": "mine" }                 the reports this account has filed
     { "action": "submit", "kind": ... }  file a new one
        kind: "OFFICER"     complaint about an officer
              "DEPARTMENT"  complaint about a department
              "FIRE"        report a fire to Fire Investigations
     { "action": "crime", "type": ... }   report a crime: becomes a pending police call on the CAD board
     { "action": "crime-mine" }           the crime reports this account has sent, and the crime types

   Centurion checks everything again and limits how many reports one
   account can send. Only the reporter's own reports are ever returned,
   and only their status and outcome (never internal notes).
   ============================================================== */

const { getSession, siteOrigin } = require('../_lib/session');
const { centurion } = require('../_lib/des');

/* Only these fields are passed on to Centurion */
const FIELDS = ['kind', 'title', 'description', 'location', 'occurredAt', 'evidence', 'accused', 'department', 'type', 'suspect'];

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

  if (body.action === 'mine') {
    return response.status(200).json(await centurion('/des/public/mine', { discordId: user.id }));
  }

  if (body.action === 'submit') {
    const payload = { discordId: user.id, discordName: user.name || user.username };
    FIELDS.forEach((field) => { if (body[field] !== undefined) payload[field] = body[field]; });
    return response.status(200).json(await centurion('/des/public/report', payload));
  }

  if (body.action === 'crime-mine') {
    return response.status(200).json(await centurion('/des/public/crime-mine', { discordId: user.id }));
  }

  if (body.action === 'crime') {
    const payload = { discordId: user.id, discordName: user.name || user.username };
    FIELDS.forEach((field) => { if (body[field] !== undefined) payload[field] = body[field]; });
    return response.status(200).json(await centurion('/des/public/crime', payload));
  }

  return response.status(400).json({ success: false, msg: 'Unknown action.' });
};
