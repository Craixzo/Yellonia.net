/* ==============================================================
   des/preview.js - TEMPORARY "backdoor" preview of the back-end

   Typing AveYellonia as the Badge ID on the login page shows an
   "Enter Via Backdoor" button. It opens every back-end page filled
   with SAMPLE data. Nothing here is real, nothing is sent to
   Centurion, and nothing can be changed.

   TO REMOVE IT LATER: delete this file, and delete the line
   <script src="/des/preview.js"></script> from each des/*.html page.
   Everything else keeps working without it.
   ============================================================== */
window.DES_PREVIEW = (function () {
  var KEY = 'des-preview';
  var TRIGGER = 'aveyellonia';

  function on() { try { return sessionStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function enter() { try { sessionStorage.setItem(KEY, '1'); } catch (e) {} }
  function leave() { try { sessionStorage.removeItem(KEY); } catch (e) {} }

  /* ---- sample data ---- */
  var ALL_ROLES = ['officer', 'dispatcher', 'supervisor', 'oia', 'ofi', 'local-admin', 'service-admin'];
  var DEPTS = [{ key: 'POLICE', name: 'Yellonia Police Department', short: 'YPD' }, { key: 'FIRE', name: 'Yellonia Fire Department', short: 'YFD' }];
  function d(key) { return DEPTS.filter(function (x) { return x.key === key; })[0]; }
  function ago(days) { return new Date(Date.now() - days * 86400000).toISOString(); }

  var ME = { id: 'preview-me', username: 'Craixzo', badgeId: '1001', department: 'POLICE', departmentName: d('POLICE').name, departmentShort: 'YPD',
    rank: 'Chief', unit: 'Command Staff', roles: ALL_ROLES, tokenVersion: 0, lastLoginAt: new Date().toISOString() };

  var PEOPLE = [
    ['preview-me', 'Craixzo', '1001', 'POLICE', 'Chief', 'Command Staff', 420, true],
    ['p2', 'BrownMJ', '1288', 'POLICE', 'Deputy Chief', 'Command Staff', 380, true],
    ['p3', 'DavisJK', '2101', 'POLICE', 'Lieutenant', 'Patrol Bureau', 300, true],
    ['p4', 'KingMS', '2318', 'POLICE', 'Sergeant', 'Patrol Bureau / A Shift', 210, true],
    ['p5', 'MillerTW', '2456', 'POLICE', 'Officer II', 'Patrol Bureau / B Shift', 120, true],
    ['p6', 'ParkerAR', '2551', 'POLICE', 'Officer I', 'K9 Unit', 14, false],
    ['p7', 'Abutalee', '5101', 'FIRE', 'Fire Chief', 'Command Staff', 400, true],
    ['p8', 'ColeSL', '5205', 'FIRE', 'Firefighter', 'Yeloria Fire Division', 60, true],
  ].map(function (r) {
    return { id: r[0], username: r[1], badgeId: r[2], department: r[3], departmentShort: d(r[3]).short, rank: r[4], unit: r[5],
      joinedAt: ago(r[6]), leftAt: null, status: 'ACTIVE', roles: r[0] === 'preview-me' ? ALL_ROLES : ['officer'], setUp: r[7], locked: r[1] === 'KingMS',
      leaveReason: null, manageable: true };
  });
  var FORMER = [
    { id: 'f1', username: 'GarciaMA', badgeId: '2121', department: 'POLICE', departmentShort: 'YPD', rank: 'Captain', unit: 'Traffic Unit', joinedAt: ago(500), leftAt: ago(40), status: 'FORMER', roles: ['officer'], setUp: true, locked: false, leaveReason: 'Transferred to the Army', manageable: true },
    { id: 'f2', username: 'TaylorJM', badgeId: '5573', department: 'FIRE', departmentShort: 'YFD', rank: 'Firefighter', unit: null, joinedAt: ago(200), leftAt: ago(12), status: 'FORMER', roles: ['officer'], setUp: true, locked: false, leaveReason: 'Inactivity', manageable: true },
  ];
  var AUDIT = [
    ['Logged in', 'Craixzo (1001)', '1001', 'from 203.0.113.7'],
    ['Member updated', 'Craixzo (1001)', '2456', 'MillerTW: rank Officer I → Officer II'],
    ['Account locked', 'KingMS (2318)', '2318', 'from 198.51.100.4'],
    ['Login failed', 'KingMS (2318)', '2318', 'from 198.51.100.4'],
    ['Member removed', 'BrownMJ (1288)', '2121', 'GarciaMA · Transferred to the Army'],
    ['Password set', 'ParkerAR (2551)', '2551', 'verified with Discord'],
    ['Member added', 'Discord 900000000000000001', '2551', 'ParkerAR · POLICE · Officer I · officer'],
  ].map(function (a, i) { return { at: ago(i * 0.7), action: a[0], by: a[1], target: a[2], detail: a[3] }; });

  var NOT_SAVED = { success: false, msg: 'Preview: nothing is saved. Log in for real to make changes.' };

  /* Answers what /api/des would, from the sample data */
  function answer(action, data) {
    if (action === 'me') return { success: true, member: ME };
    if (action === 'logout') { leave(); return { success: true }; }
    if (action === 'personnel') return { success: true, members: data.former ? FORMER : PEOPLE, departments: DEPTS, canAdd: true };
    if (action === 'member') {
      var m = PEOPLE.concat(FORMER).filter(function (x) { return x.id === data.id; })[0];
      if (!m) return { success: false, msg: 'That member doesn\'t exist.' };
      var copy = Object.assign({}, m, { departmentName: d(m.department).name, discordId: '000000000000000000', lastLoginAt: ago(1), passwordSetAt: m.setUp ? ago(10) : null });
      return { success: true, member: copy, manageable: true, self: m.id === 'preview-me',
        grantable: ALL_ROLES.map(function (k) { return { key: k, name: (window.DES ? DES.ROLE_NAMES[k] : k) }; }),
        departments: DEPTS.map(function (x) { return { key: x.key, name: x.name }; }),
        history: AUDIT.filter(function (a) { return a.target === m.badgeId; }).map(function (a) { return { action: a.action, detail: a.detail, at: a.at }; }) };
    }
    if (action === 'audit') return { success: true, entries: data.badge ? AUDIT.filter(function (a) { return a.target === data.badge; }) : AUDIT };
    return NOT_SAVED;
  }

  return { on: on, enter: enter, leave: leave, answer: answer, TRIGGER: TRIGGER };
})();
