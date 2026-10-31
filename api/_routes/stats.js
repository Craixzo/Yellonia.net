/* ==============================================================
   api/stats.js - live member counts for the homepage stat strip

   Runs on Vercel's servers (not in the visitor's browser).
   The site reads it at:  /api/stats
   It answers with:       { "roblox": 1483, "discord": 950, "corporations": 12, "stocks": 8 }
   (corporations and stocks come from Centurion)
   ============================================================== */

/* ---------- SETTINGS ---------- */
const ROBLOX_GROUP_ID = '5801322';
const DISCORD_INVITE  = 'zYhWhzVcMX';          // the part after discord.gg/  (use an invite that never expires)
const CACHE_SECONDS   = 600;                   // how long the numbers are reused before asking again (600 = 10 minutes)


const { centurion } = require('../_lib/des');


/* ---------- HELPERS ---------- */
async function getJson(url) {
  const reply = await fetch(url, { headers: { 'User-Agent': 'yellonia-site' } });
  if (!reply.ok) throw new Error(url + ' answered ' + reply.status);
  return reply.json();
}


/* ---------- THE FUNCTION ---------- */
module.exports = async (request, response) => {
  // Ask Roblox and Discord at the same time; one failing doesn't stop the other
  const [roblox, discord, economy] = await Promise.allSettled([
    getJson('https://groups.roblox.com/v1/groups/' + ROBLOX_GROUP_ID),
    getJson('https://discord.com/api/v10/invites/' + DISCORD_INVITE + '?with_counts=true'),
    centurion('/site/public/counts', {}),
  ]);
  const counts = economy.status === 'fulfilled' && economy.value && economy.value.success ? economy.value : {};

  const stats = {
    roblox:  roblox.status  === 'fulfilled' ? roblox.value.memberCount               : null,
    discord: discord.status === 'fulfilled' ? discord.value.approximate_member_count : null,
    corporations: typeof counts.corporations === 'number' ? counts.corporations : null,
    stocks:       typeof counts.listed === 'number' ? counts.listed : null,
  };

  // Let Vercel reuse this answer so Roblox and Discord aren't asked on every page view
  response.setHeader('Cache-Control', 's-maxage=' + CACHE_SECONDS + ', stale-while-revalidate=86400');
  response.status(200).json(stats);
};
