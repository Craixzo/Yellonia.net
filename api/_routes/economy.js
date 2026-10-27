/* ==============================================================
   api/economy.js - corporations and the stock market
   (economy.html and company.html)

   The page sends  POST /api/economy  with JSON { "action": ... }.

   Anyone, no login:
     market                      every corporation and the company types
     company   { ticker, range } one corporation, its chart and listing progress
     history   { ticker, range } just the chart points
     suggest   { name }          the ticker a name would get

   Needs a Discord login (the same login the newsroom uses):
     me                          your brokerage balance, shares, unpaid registrations, history
     preview   { ticker, amount, buying }
     trade     { ticker, amount, buying }   uses your brokerage balance
     list      { ticker }        take your corporation public
     register  { name, typeId, ticker, description, logoId }
     cancel    { ticker }        cancel an unpaid registration

   Centurion checks everything again (it's the one that holds the money),
   and finds your Roblox account from your Discord link.
   ============================================================== */

const { getSession, siteOrigin } = require('../_lib/session');
const { centurion } = require('../_lib/des');

const PUBLIC = ['market', 'company', 'history', 'suggest'];
const LOGIN = ['me', 'preview', 'trade', 'list', 'register', 'cancel'];

/* Only these fields are passed on to Centurion */
const FIELDS = ['ticker', 'range', 'name', 'amount', 'buying', 'typeId', 'description', 'logoId'];

/* The market list is the same for everyone, so it's kept for a few seconds */
const MARKET_SECONDS = 5;
let marketCache = null;

module.exports = async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') return response.status(405).json({ success: false, msg: 'Use POST.' });

  // Requests must come from this site's own pages
  const origin = request.headers.origin;
  if (origin && origin !== siteOrigin(request)) return response.status(403).json({ success: false, msg: 'Not allowed.' });

  let body = request.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (error) { body = {}; } }
  body = body || {};
  const action = String(body.action || '');
  if (!PUBLIC.includes(action) && !LOGIN.includes(action)) return response.status(400).json({ success: false, msg: 'Unknown action.' });

  const user = getSession(request);
  if (LOGIN.includes(action) && !user) return response.status(401).json({ success: false, needsLogin: true, msg: 'Please log in with Discord first.' });

  const payload = {};
  FIELDS.forEach((field) => { if (body[field] !== undefined) payload[field] = body[field]; });
  if (user) { payload.discordId = user.id; payload.discordName = user.name || user.username; }

  if (action === 'market') {
    if (marketCache && Date.now() - marketCache.at < MARKET_SECONDS * 1000) return response.status(200).json(marketCache.data);
    const data = await centurion('/economy/web/market', {});
    if (data.success) marketCache = { at: Date.now(), data };
    return response.status(200).json(data);
  }

  if (action === 'trade' || action === 'register' || action === 'list' || action === 'cancel') marketCache = null;
  return response.status(200).json(await centurion('/economy/web/' + action, payload));
};
