/* ==============================================================
   api/wanted.js - the public Most Wanted list

   Asks Centurion for the warrants staff have put on the public list,
   and passes them to the Most Wanted page (wanted.html) and to the
   Emergency Services home. No login needed; it only ever shows what
   staff chose to make public, and only in-game information.

   The site reads it at:  /api/wanted
   Answers with:          { "wanted": [ ... ], "updatedAt": "..." }

   Written as a plain (request, response) function, so it runs on
   Vercel now and inside a small Node server later (e.g. on Railway).
   ============================================================== */

const CENTURION_URL = (process.env.CENTURION_URL || '').replace(/\/+$/, '');
const CACHE_SECONDS = 30;

const DANGER = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' };

let lastGood = null;

function text(value, max) { return typeof value === 'string' ? value.trim().slice(0, max) : null; }

/* Only lets through what the page expects (in-game fields only) */
function clean(data) {
  if (!data || !Array.isArray(data.wanted)) return null;
  return data.wanted.slice(0, 60).map(function (w) {
    var avatar = text(w.avatar, 300);
    return {
      number: text(w.number, 20),
      username: text(w.username, 20),
      characterName: text(w.characterName, 40),
      /* only Roblox's own avatar images are passed through */
      avatar: avatar && /^https:\/\/[a-z0-9.-]*rbxcdn\.com\//i.test(avatar) ? avatar : null,
      charges: Array.isArray(w.charges) ? w.charges.slice(0, 25).map(function (c) { return text(c, 80); }).filter(Boolean) : [],
      summary: text(w.summary, 1000),
      danger: DANGER[w.danger] ? w.danger : 'MEDIUM',
      dangerName: DANGER[w.danger] || 'Medium',
      issuedAt: text(w.issuedAt, 40),
    };
  }).filter(function (w) { return w.username && w.number; });
}

module.exports = async (request, response) => {
  var wanted = null;
  if (CENTURION_URL) {
    try {
      var reply = await fetch(CENTURION_URL + '/des/wanted', { signal: AbortSignal.timeout(4000) });
      if (reply.ok) { var data = clean(await reply.json()); if (data) { wanted = data; lastGood = data; } }
    } catch (error) { /* fall back to the last good list */ }
  }
  response.setHeader('Cache-Control', 's-maxage=' + CACHE_SECONDS + ', stale-while-revalidate=86400');
  response.status(200).json({ wanted: wanted || lastGood || [], updatedAt: new Date().toISOString() });
};
