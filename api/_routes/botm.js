/* ==============================================================
   api/botm.js - Branch of the Month

   Asks the Centurion bot who holds Branch of the Month, this month's
   event standings, and every past winner.

   The site reads it at:  /api/botm
   It answers with:
     { "live": true,
       "holder":  { "month": "2026-10", "label": "October 2026", "winners": [ { "key": "army", "name": "Yellonian Army", "count": 14 } ], "standings": [...] },
       "current": { "month": "2026-11", "label": "November 2026", "standings": [ { "key": "navy", "name": "Yellonian Navy", "count": 3 }, ... ] },
       "history": [ ...one entry per finished month, newest first... ] }

   "holder" is null until the first month has been decided.
   Uses the same CENTURION_URL environment variable as api/parliament.js.
   ============================================================== */

/* ---------- SETTINGS ---------- */
const CENTURION_URL = (process.env.CENTURION_URL || '').replace(/\/+$/, '');
const CACHE_SECONDS = 60;    // how long an answer is reused before asking Centurion again

let lastGood = null;         // the most recent answer Centurion gave


/* ---------- HELPERS ---------- */

/* Only lets through branch keys, names and whole-number counts */
function cleanScores(list) {
  if (!Array.isArray(list)) return [];
  return list.slice(0, 20).map(function (entry) {
    return {
      key:   String(entry && entry.key || '').slice(0, 30),
      name:  String(entry && entry.name || '').slice(0, 60),
      count: Math.max(0, Math.floor(Number(entry && entry.count) || 0)),
    };
  }).filter(function (entry) { return entry.key && entry.name; });
}

function cleanMonth(entry) {
  if (!entry || !/^\d{4}-\d{2}$/.test(entry.month)) return null;
  return {
    month:     entry.month,
    label:     String(entry.label || entry.month).slice(0, 30),
    winners:   cleanScores(entry.winners),
    standings: cleanScores(entry.standings),
  };
}

function clean(data) {
  if (!data || !data.current) return null;
  return {
    holder:  cleanMonth(data.holder),
    current: cleanMonth(data.current),
    history: (Array.isArray(data.history) ? data.history : []).slice(0, 60).map(cleanMonth).filter(Boolean),
  };
}


/* ---------- THE FUNCTION ---------- */
module.exports = async (request, response) => {
  let answer = null;
  let live = false;

  if (CENTURION_URL) {
    try {
      const reply = await fetch(CENTURION_URL + '/branch-of-the-month', { signal: AbortSignal.timeout(4000) });
      if (reply.ok) {
        answer = clean(await reply.json());
        if (answer) { live = true; lastGood = answer; }
      }
    } catch (error) { /* Centurion didn't answer; fall back below */ }
  }

  if (!answer) answer = lastGood || { holder: null, current: null, history: [] };

  response.setHeader('Cache-Control', 's-maxage=' + CACHE_SECONDS + ', stale-while-revalidate=86400');
  response.status(200).json(Object.assign({ live: live }, answer));
};
