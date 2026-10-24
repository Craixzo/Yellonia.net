/* ==============================================================
   api/_lib/session.js - logins, shared by the functions in api/

   (Files in folders starting with "_" are helpers, not web addresses.)

   Someone who logs in with Discord gets a cookie holding their Discord
   ID and name, signed with SESSION_SECRET so it can't be faked or edited.
   ============================================================== */

const crypto = require('crypto');

const COOKIE = 'yn_session';
const STATE_COOKIE = 'yn_oauth_state';
const SESSION_DAYS = 7;

const secret = () => {
  const value = process.env.SESSION_SECRET || '';
  if (value.length < 32) throw new Error('SESSION_SECRET is missing or shorter than 32 characters.');
  return value;
};

const b64 = (buffer) => Buffer.from(buffer).toString('base64url');
const sign = (text) => b64(crypto.createHmac('sha256', secret()).update(text).digest());

function readCookies(request) {
  const out = {};
  String(request.headers.cookie || '').split(';').forEach((part) => {
    const at = part.indexOf('=');
    if (at > 0) out[part.slice(0, at).trim()] = decodeURIComponent(part.slice(at + 1).trim());
  });
  return out;
}

function cookie(name, value, maxAgeSeconds) {
  return name + '=' + encodeURIComponent(value) + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=' + maxAgeSeconds;
}

function addCookie(response, text) {
  const existing = response.getHeader('Set-Cookie');
  response.setHeader('Set-Cookie', [].concat(existing || [], text));
}

/* The site's own address, e.g. https://yellonianet.vercel.app */
function siteOrigin(request) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, '');
  return 'https://' + (request.headers['x-forwarded-host'] || request.headers.host);
}

/* Only allows going back to a page on this site */
function safeNext(value) {
  const next = String(value || '/newsroom.html');
  return next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : '/newsroom.html';
}

function setSession(response, user) {
  const data = b64(JSON.stringify({
    id: user.id,
    name: user.global_name || user.username,
    username: user.username,
    avatar: user.avatar || null,
    exp: Date.now() + SESSION_DAYS * 86400000,
  }));
  addCookie(response, cookie(COOKIE, data + '.' + sign(data), SESSION_DAYS * 86400));
}

/* The logged-in user, or null */
function getSession(request) {
  try {
    const raw = readCookies(request)[COOKIE];
    if (!raw) return null;
    const [data, signature] = raw.split('.');
    const expected = sign(data);
    if (!signature || signature.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const user = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (!user.exp || user.exp < Date.now() || !/^\d{15,22}$/.test(user.id)) return null;
    return user;
  } catch (error) {
    return null;
  }
}

function clearSession(response) {
  addCookie(response, cookie(COOKIE, '', 0));
}

function redirect(response, location) {
  response.statusCode = 302;
  response.setHeader('Location', location);
  response.setHeader('Cache-Control', 'no-store');
  response.end();
}

module.exports = { COOKIE, STATE_COOKIE, readCookies, cookie, addCookie, siteOrigin, safeNext, setSession, getSession, clearSession, redirect };
