/* ==============================================================
   api/government.js - who currently holds the top offices

   Reads the Roblox group and reports who holds each rank, so the
   Government page updates itself when someone's rank changes.

   The site reads it at:  /api/government
   It answers with:
     { "emperor":    [ { id, username, displayName, avatar } ],
       "chancellor": [ ... ], "viceroys": [ ... ], "cabinet": [ ... ] }

   Written as a plain (request, response) function, so it runs on
   Vercel now and inside a small Node server later (e.g. on Railway).
   ============================================================== */

/* ---------- SETTINGS ---------- */
const GROUP_ID = '5801322';

/* Which Roblox group rank fills which spot on the page.
   The text on the right must match the rank's name in the group exactly. */
const ROLES = {
  emperor:    'Emperor',
  chancellor: 'Chancellor of Yellonia',
  viceroys:   'Viceroys',
  cabinet:    'Government Leadership',
};

const CACHE_SECONDS = 600;   // how long an answer is reused before asking Roblox again (600 = 10 minutes)


/* ---------- HELPERS ---------- */
async function getJson(url) {
  const reply = await fetch(url, {
    headers: { 'User-Agent': 'yellonia-site' },
    signal: AbortSignal.timeout(6000),          // give up after 6 seconds
  });
  if (!reply.ok) throw new Error(url + ' answered ' + reply.status);
  return reply.json();
}

async function membersOf(roleId) {
  const list = await getJson(
    'https://groups.roblox.com/v1/groups/' + GROUP_ID + '/roles/' + roleId + '/users?limit=100&sortOrder=Asc'
  );
  return list.data.map(function (user) {
    return { id: user.userId, username: user.username, displayName: user.displayName, avatar: null };
  });
}


/* ---------- THE FUNCTION ---------- */
module.exports = async (request, response) => {
  const people = { emperor: [], chancellor: [], viceroys: [], cabinet: [] };
  let complete = true;

  try {
    // 1. Find the ranks by name
    const roles = (await getJson('https://groups.roblox.com/v1/groups/' + GROUP_ID + '/roles')).roles;

    // 2. Ask who holds each one (one failing doesn't stop the others)
    await Promise.all(Object.keys(ROLES).map(async function (spot) {
      const role = roles.find(function (r) { return r.name === ROLES[spot]; });
      if (!role) { complete = false; return; }
      try { people[spot] = await membersOf(role.id); } catch (error) { complete = false; }
    }));

    // 3. Fetch everyone's avatar picture in one request (the page still works without them)
    const everyone = [].concat(people.emperor, people.chancellor, people.viceroys, people.cabinet);
    const ids = Array.from(new Set(everyone.map(function (p) { return p.id; })));
    if (ids.length) {
      try {
        const thumbs = await getJson(
          'https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=' + ids.join(',') +
          '&size=150x150&format=Png&isCircular=false'
        );
        const byId = {};
        thumbs.data.forEach(function (t) { if (t.state === 'Completed') byId[t.targetId] = t.imageUrl; });
        everyone.forEach(function (p) { p.avatar = byId[p.id] || null; });
      } catch (error) { /* no avatars this time */ }
    }
  } catch (error) {
    complete = false;   // Roblox didn't answer at all: send empty lists
  }

  // A complete answer is reused for 10 minutes; an incomplete one is retried after 30 seconds
  response.setHeader('Cache-Control', 's-maxage=' + (complete ? CACHE_SECONDS : 30) + ', stale-while-revalidate=86400');
  response.status(200).json(people);
};
