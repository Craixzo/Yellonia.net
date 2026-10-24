/* ==============================================================
   api/_lib/des.js - DES (Emergency Services) back-end logins

   Separate from the Discord login. After a DES login the browser gets
   a "des_session" cookie holding the member's id and a version number,
   signed with SESSION_SECRET so it can't be faked or edited. Every
   back-end request checks it with Centurion, so a member who is removed,
   suspended or changes their password is logged out everywhere at once.
   ============================================================== */

const crypto = require('crypto');
const { readCookies, addCookie } = require('./session');

const COOKIE = 'des_session';
const SESSION_HOURS = 12;
const CENTURION_URL = (process.env.CENTURION_URL || '').replace(/\/+$/, '');

const secret = () => {
  const value = process.env.SESSION_SECRET || '';
  if (value.length < 32) throw new Error('SESSION_SECRET is missing or shorter than 32 characters.');
  return value;
};
const b64 = (buffer) => Buffer.from(buffer).toString('base64url');
const sign = (text) => b64(crypto.createHmac('sha256', secret()).update('des:' + text).digest());

/* Strict: the cookie is never sent when another site links or posts here */
function desCookie(value, maxAgeSeconds) {
  return COOKIE + '=' + encodeURIComponent(value) + '; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=' + maxAgeSeconds;
}

function setDesSession(response, member) {
  const data = b64(JSON.stringify({ mid: member.id, tv: member.tokenVersion, exp: Date.now() + SESSION_HOURS * 3600000 }));
  addCookie(response, desCookie(data + '.' + sign(data), SESSION_HOURS * 3600));
}

function clearDesSession(response) {
  addCookie(response, desCookie('', 0));
}

/* The cookie's contents if it's genuine and not expired, else null (nothing is trusted yet) */
function readDesSession(request) {
  try {
    const raw = readCookies(request)[COOKIE];
    if (!raw) return null;
    const [data, signature] = raw.split('.');
    const expected = sign(data);
    if (!signature || signature.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const session = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (!session.exp || session.exp < Date.now() || typeof session.mid !== 'string') return null;
    return session;
  } catch (error) {
    return null;
  }
}

/* Calls a protected Centurion route */
async function centurion(path, payload) {
  if (!CENTURION_URL || !process.env.CENTURION_API_KEY) return { success: false, msg: 'The DES system isn\'t connected to Centurion yet.' };
  try {
    const reply = await fetch(CENTURION_URL + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: process.env.CENTURION_API_KEY },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    });
    const data = await reply.json();
    if (data.msg === 'Unauthorized') {
      console.error('[des] Centurion rejected the API key; check CENTURION_API_KEY matches API_KEY on Railway.');
      return { success: false, msg: 'The DES system couldn\'t reach Centurion. Please tell a developer.' };
    }
    return data;
  } catch (error) {
    return { success: false, msg: 'Centurion didn\'t answer. Please try again in a minute.' };
  }
}

/* The logged-in, still-active member (checked with Centurion), or null */
async function currentMember(request) {
  const session = readDesSession(request);
  if (!session) return null;
  const answer = await centurion('/des/auth/me', { memberId: session.mid, tokenVersion: session.tv });
  return answer.success ? answer.member : null;
}

module.exports = { setDesSession, clearDesSession, readDesSession, currentMember, centurion };
