/* ==============================================================
   api/parliament.js - the seats in Parliament

   Asks the Centurion bot for the current parties and seat counts,
   and passes them to the Government page.

   The site reads it at:  /api/parliament
   It answers with:
     { "totalSeats": 80, "openSeats": 17, "live": true,
       "parties": [ { "name": "Fulcrum Party", "color": "#bed215", "seats": 17 } ] }

   "live" is true when the numbers came from Centurion just now, and
   false when this file's built-in copy (below) was used instead.

   Written as a plain (request, response) function, so it runs on
   Vercel now and inside a small Node server later (e.g. on Railway).
   ============================================================== */

/* ---------- SETTINGS ---------- */

/* Centurion's web address. Leave it out and the built-in copy below is used.
   Set it as an environment variable named CENTURION_URL (in Vercel: Settings > Environment Variables),
   for example  https://centurion.up.railway.app  */
const CENTURION_URL = (process.env.CENTURION_URL || '').replace(/\/+$/, '');

const TOTAL_SEATS = 80;      // every seat in the chamber
const OPEN_SEATS  = 17;      // how many can currently be held
const CACHE_SECONDS = 30;    // how long an answer is reused before asking Centurion again

/* Built-in copy: shown until Centurion is connected, and if it has never answered */
const BUILT_IN = {
  parties: [
    { name: 'Fulcrum Party', color: '#bed215', seats: 17 },
  ],
};

let lastGood = null;         // the most recent answer Centurion gave (kept while this function stays running)


/* ---------- HELPERS ---------- */

/* Only lets through what the page expects: a name, a hex color and a whole number of seats */
function clean(data) {
  if (!data || !Array.isArray(data.parties)) return null;
  const parties = [];
  let used = 0;
  for (const party of data.parties.slice(0, 20)) {
    const name  = String(party.name || '').trim().slice(0, 40);
    const color = /^#[0-9a-fA-F]{6}$/.test(party.color) ? party.color : '#949ba4';
    const seats = Math.max(0, Math.floor(Number(party.seats) || 0));
    if (!name) continue;
    const fits = Math.min(seats, OPEN_SEATS - used);     // never show more than the open seats
    used += fits;
    parties.push({ name: name, color: color, seats: fits });
  }
  return { parties: parties };
}


/* ---------- THE FUNCTION ---------- */
module.exports = async (request, response) => {
  let answer = null;
  let live = false;

  if (CENTURION_URL) {
    try {
      const reply = await fetch(CENTURION_URL + '/parliament', { signal: AbortSignal.timeout(4000) });   // give up after 4 seconds
      if (reply.ok) {
        answer = clean(await reply.json());
        if (answer) { live = true; lastGood = answer; }
      }
    } catch (error) { /* Centurion didn't answer; fall through to the saved copies */ }
  }

  if (!answer) answer = lastGood || clean(BUILT_IN);

  response.setHeader('Cache-Control', 's-maxage=' + CACHE_SECONDS + ', stale-while-revalidate=86400');
  response.status(200).json({
    totalSeats: TOTAL_SEATS,
    openSeats: OPEN_SEATS,
    live: live,
    parties: answer.parties,
  });
};
