/* ==============================================================
   api/_routes/afterimage.js - the Afterimage pages' pass to the Railway backend

   GET /api/afterimage
     Not logged in:  { success: true, loggedIn: false, base }
     Logged in:      { success: true, loggedIn: true, base, ticket, exp, name, canBroadcast }

   The ticket proves to Afterimage (on Railway) who this is, for 15 minutes.
   It's signed with AFTERIMAGE_SECRET, which must match TICKET_SECRET on Railway.
   Centurion says whether they can broadcast (a role in SITE_SETTINGS.broadcasterRoleIds)
   and which Roblox account RoWifi has for them. The Roblox ID goes inside the
   ticket only, so a page can't read or change it.

   VERCEL ENVIRONMENT VARIABLES
     AFTERIMAGE_URL     e.g. https://afterimage-production.up.railway.app
     AFTERIMAGE_SECRET  the same long random text as TICKET_SECRET on Railway
   ============================================================== */

const crypto = require('crypto');
const { getSession } = require('../_lib/session');
const { centurion } = require('../_lib/des');

const TICKET_MINUTES = 15;
const CACHE_MS = 60 * 1000;
const cache = new Map();   /* Discord ID -> { at, info } so RoWifi isn't asked on every page load */

const base = () => (process.env.AFTERIMAGE_URL || '').replace(/\/+$/, '');

function makeTicket(payload) {
  const secret = process.env.AFTERIMAGE_SECRET || '';
  if (secret.length < 24) throw new Error('AFTERIMAGE_SECRET is missing or too short.');
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return data + '.' + crypto.createHmac('sha256', secret).update('afterimage:' + data).digest('base64url');
}

async function infoFor(user) {
  const hit = cache.get(user.id);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.info;
  const reply = await centurion('/site/user/afterimage', { discordId: user.id, discordName: user.name || user.username });
  const info = reply && reply.success
    ? { canBroadcast: !!reply.canBroadcast, robloxId: reply.robloxId || null, name: reply.name || user.name || user.username }
    : { canBroadcast: false, robloxId: null, name: user.name || user.username };   /* Centurion down: still let them watch */
  cache.set(user.id, { at: Date.now(), info });
  return info;
}

module.exports = async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET') return response.status(405).json({ success: false, msg: 'Use GET.' });
  if (!base()) return response.status(200).json({ success: false, msg: 'Afterimage isn\'t connected yet (AFTERIMAGE_URL is missing).' });

  const user = getSession(request);
  if (!user) return response.status(200).json({ success: true, loggedIn: false, base: base() });

  try {
    const info = await infoFor(user);
    const exp = Date.now() + TICKET_MINUTES * 60000;
    const ticket = makeTicket({ did: user.id, name: info.name, robloxId: info.robloxId, canBroadcast: info.canBroadcast, exp });
    return response.status(200).json({ success: true, loggedIn: true, base: base(), ticket, exp, name: info.name, canBroadcast: info.canBroadcast });
  } catch (error) {
    console.error('[afterimage]', error);
    return response.status(500).json({ success: false, msg: 'Afterimage isn\'t set up properly yet. Please tell a developer.' });
  }
};
