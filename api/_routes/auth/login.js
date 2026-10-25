/* api/auth/login.js - sends the visitor to Discord to log in.
   Link to it as  /api/auth/login?next=/newsroom.html  to come back to that page afterwards. */

const crypto = require('crypto');
const { STATE_COOKIE, cookie, addCookie, siteOrigin, safeNext, redirect } = require('../../_lib/session');

module.exports = (request, response) => {
  const query = request.query || {};
  if (!process.env.DISCORD_CLIENT_ID) return response.status(500).send('Login is not set up yet (DISCORD_CLIENT_ID is missing).');

  // A random value Discord sends back, so a login can't be started by another site
  const state = crypto.randomBytes(16).toString('hex');
  addCookie(response, cookie(STATE_COOKIE, state + '|' + safeNext(query.next), 600));

  const url = new URL('https://discord.com/oauth2/authorize');
  url.searchParams.set('client_id', process.env.DISCORD_CLIENT_ID);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', siteOrigin(request) + '/api/auth/callback');
  url.searchParams.set('scope', 'identify');          // only the user's ID, name and avatar
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'none');            // skip the approval screen for people who already approved
  redirect(response, url.toString());
};
