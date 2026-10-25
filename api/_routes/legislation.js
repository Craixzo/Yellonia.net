/* ==============================================================
   api/legislation.js - bills added through Centurion

   Asks the Centurion bot for the bills added with /bill-add, and
   passes them to the Bills and laws page (legislation.html).
   Bills typed into bills.json are read by the page directly; this
   file only handles the ones from Centurion.

   The site reads it at:  /api/legislation
   It answers with:       { "live": true, "bills": [ ... ] }

   "live" is true when the list came from Centurion just now, and
   false when Centurion couldn't be reached (the last list it gave
   is used instead, or an empty one).

   Written as a plain (request, response) function, so it runs on
   Vercel now and inside a small Node server later (e.g. on Railway).
   ============================================================== */

/* ---------- SETTINGS ---------- */
const CENTURION_URL = (process.env.CENTURION_URL || '').replace(/\/+$/, '');   /* same setting as api/parliament.js */
const CACHE_SECONDS = 30;    /* how long an answer is reused before asking Centurion again */

let lastGood = null;         /* the most recent list Centurion gave */

const STATUSES = ['pending', 'passed', 'signed', 'vetoed', 'failed', 'withdrawn'];


/* ---------- HELPERS ---------- */
function text(value, max) { return typeof value === 'string' ? value.trim().slice(0, max) : null; }
function date(value) { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null; }
function count(value) { return Math.max(0, Math.min(1000, Math.floor(Number(value) || 0))); }

/* Only lets through what the page expects */
function clean(data) {
  if (!data || !Array.isArray(data.bills)) return null;
  return data.bills.slice(0, 1000).map(function (bill) {
    const link = text(bill.link, 300);
    return {
      number: text(bill.number, 20),
      title: text(bill.title, 150),
      status: STATUSES.indexOf(bill.status) !== -1 ? bill.status : 'pending',
      summary: text(bill.summary, 600),
      text: text(bill.text, 6000),
      link: link && /^https:\/\//.test(link) ? link : null,
      sponsor: text(bill.sponsor, 60),
      party: text(bill.party, 40),
      votes: bill.votes ? { for: count(bill.votes.for), against: count(bill.votes.against), abstain: count(bill.votes.abstain) } : null,
      introduced: date(bill.introduced),
      passed: date(bill.passed),
      signed: date(bill.signed),
    };
  }).filter(function (bill) { return bill.number && bill.title; });
}


/* ---------- THE FUNCTION ---------- */
module.exports = async (request, response) => {
  let bills = null;
  let live = false;

  if (CENTURION_URL) {
    try {
      const reply = await fetch(CENTURION_URL + '/legislation', { signal: AbortSignal.timeout(4000) });   /* give up after 4 seconds */
      if (reply.ok) {
        bills = clean(await reply.json());
        if (bills) { live = true; lastGood = bills; }
      }
    } catch (error) { /* Centurion didn't answer; fall back to the last list */ }
  }

  response.setHeader('Cache-Control', 's-maxage=' + CACHE_SECONDS + ', stale-while-revalidate=86400');
  response.status(200).json({ live: live, bills: bills || lastGood || [] });
};
