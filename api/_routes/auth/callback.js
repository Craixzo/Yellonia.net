/* api/auth/callback.js - where Discord sends the visitor back after logging in.
   This exact address must be listed under Redirects in the Discord Developer Portal. */

const { STATE_COOKIE, readCookies, cookie, addCookie, siteOrigin, setSession, redirect } = require('../../_lib/session');

module.exports = async (request, response) => {
  const query = request.query || {};
  const [state, next] = String(readCookies(request)[STATE_COOKIE] || '').split('|');
  addCookie(response, cookie(STATE_COOKIE, '', 0));
  const back = next || '/newsroom.html';
  const failed = back + (back.includes('?') ? '&' : '?') + 'login=failed';

  if (query.error || !query.code || !state || query.state !== state) return redirect(response, failed);

  try {
    const token = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: String(query.code),
        redirect_uri: siteOrigin(request) + '/api/auth/callback',
      }),
      signal: AbortSignal.timeout(8000),
    }).then((reply) => reply.json());
    if (!token.access_token) throw new Error('No access token');

    const user = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: 'Bearer ' + token.access_token },
      signal: AbortSignal.timeout(8000),
    }).then((reply) => reply.json());
    if (!user.id) throw new Error('No user');

    setSession(response, user);
    return redirect(response, back);
  } catch (error) {
    console.error('[auth] login failed', error.message);
    return redirect(response, failed);
  }
};
