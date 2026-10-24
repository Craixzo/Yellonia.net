/* ==============================================================
   api/des.js - logging in to the DES (Emergency Services) back-end

   The pages send  POST /api/des  with JSON like { "action": "login", ... }.

   Actions:
     login          Username + Badge ID + password  ->  sets the DES cookie
     me             who is logged in (or { member: null })
     logout         clears the DES cookie
     setup-status   (needs a Discord login) is this Discord account a DES member?
     set-password   (needs a Discord login) set or reset the DES password

   Back-end actions (need a DES login; Centurion checks the roles):
     personnel, member, member-add, member-update, member-remove,
     member-reinstate, member-unlock, member-signout, audit,
     subjects, subject, subject-add, subject-update, subject-remove,
     record-add, record-remove, warrant-issue, warrant-close, warrant-wanted, warrants,
     cad, cad-incident, cad-create, cad-update, cad-close, cad-reopen, cad-note, cad-link,
     cad-duty-on, cad-duty-off, cad-status, cad-assign, cad-clear,
     cases, case, case-create, case-update, case-assign, case-status, case-note, case-link, case-counts

   Setting a password needs a Discord login whose account matches the
   member's DES record, so nobody can set a password for someone else.
   ============================================================== */

const { getSession, siteOrigin } = require('./_lib/session');
const { setDesSession, clearDesSession, readDesSession, currentMember, centurion } = require('./_lib/des');

const ACTIONS = ['login', 'me', 'logout', 'setup-status', 'set-password'];
const MANAGE = ['personnel', 'member', 'member-add', 'member-update', 'member-remove',
  'member-reinstate', 'member-unlock', 'member-signout', 'audit',
  'subjects', 'subject', 'subject-add', 'subject-update', 'subject-remove',
  'record-add', 'record-remove', 'warrant-issue', 'warrant-close', 'warrant-wanted', 'warrants',
  'cad', 'cad-incident', 'cad-create', 'cad-update', 'cad-close', 'cad-reopen', 'cad-note', 'cad-link',
  'cad-duty-on', 'cad-duty-off', 'cad-status', 'cad-assign', 'cad-clear',
  'cases', 'case', 'case-create', 'case-update', 'case-assign', 'case-status', 'case-note', 'case-link', 'case-counts'];

/* Only these fields are passed on to Centurion, whatever else the page sends */
const FIELDS = ['id', 'former', 'discord', 'robloxUsername', 'badgeId', 'department', 'rank', 'unit', 'roles', 'reason', 'badge',
  'q', 'wantedOnly', 'username', 'characterName', 'flags', 'notes', 'subjectId', 'kind', 'charges', 'summary',
  'location', 'danger', 'onWantedList', 'served', 'note',
  'type', 'priority', 'description', 'caller', 'attach', 'disposition', 'text', 'remove', 'callsign', 'unitId', 'status',
  'scope', 'title', 'occurredAt', 'evidence', 'accused', 'linkedCall', 'memberId', 'finding', 'publicNote'];

module.exports = async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') return response.status(405).json({ success: false, msg: 'Use POST.' });

  // Requests must come from this site's own pages
  const origin = request.headers.origin;
  if (origin && origin !== siteOrigin(request)) return response.status(403).json({ success: false, msg: 'Not allowed.' });

  let body = request.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (error) { body = {}; } }
  body = body || {};
  if (MANAGE.includes(body.action)) {
    const session = readDesSession(request);
    if (!session) return response.status(401).json({ success: false, signedOut: true, msg: 'Please log in again.' });
    const payload = { session: { memberId: session.mid, tokenVersion: session.tv } };
    FIELDS.forEach((field) => { if (body[field] !== undefined) payload[field] = body[field]; });
    const answer = await centurion('/des/manage/' + body.action, payload);
    if (answer.signedOut) clearDesSession(response);
    return response.status(200).json(answer);
  }
  if (!ACTIONS.includes(body.action)) return response.status(400).json({ success: false, msg: 'Unknown action.' });

  if (body.action === 'logout') {
    clearDesSession(response);
    return response.status(200).json({ success: true });
  }

  if (body.action === 'me') {
    const member = await currentMember(request);
    if (!member) clearDesSession(response);
    return response.status(200).json({ success: true, member: member || null });
  }

  if (body.action === 'login') {
    const ip = String(request.headers['x-forwarded-for'] || '').split(',')[0].trim() || request.socket?.remoteAddress || '';
    const answer = await centurion('/des/auth/login', {
      username: String(body.username || '').slice(0, 40),
      badgeId: String(body.badgeId || '').slice(0, 20),
      password: String(body.password || '').slice(0, 200),
      ip: ip,
    });
    if (!answer.success) return response.status(200).json({ success: false, msg: answer.msg });
    setDesSession(response, answer.member);
    return response.status(200).json({ success: true, member: answer.member });
  }

  // setup-status and set-password: need a Discord login
  const user = getSession(request);
  if (!user) return response.status(401).json({ success: false, msg: 'Please log in with Discord first.' });

  if (body.action === 'setup-status') {
    return response.status(200).json(await centurion('/des/auth/setup-status', { discordId: user.id }));
  }

  // set-password
  const password = String(body.password || '');
  if (password !== String(body.confirm || '')) return response.status(200).json({ success: false, msg: 'The two passwords don\'t match.' });
  const answer = await centurion('/des/auth/set-password', { discordId: user.id, password: password.slice(0, 200) });
  if (answer.success) clearDesSession(response);   // any old DES session is no longer valid
  return response.status(200).json(answer);
};
