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

  /* Sample Criminal Database (in-game roleplay records) */
  var FLAGS = [{ key: 'armed', name: 'Armed' }, { key: 'flight-risk', name: 'Flight risk' }, { key: 'violent', name: 'Violent' }, { key: 'gang', name: 'Gang affiliation' }];
  function flag(k) { return FLAGS.filter(function (f) { return f.key === k; })[0]; }
  var SUBJECTS = [
    { id: 's1', robloxUserId: '1', username: 'HarbourRat', characterName: 'Johnny Doe', notes: 'Known to hang around the docks.', flags: [flag('armed'), flag('violent')], createdAt: ago(30),
      records: [
        { id: 'r1', kind: 'ARREST', kindName: 'Arrest', charges: ['Assault', 'Resisting arrest'], summary: 'Fight outside the 4th Street bar. Resisted when cuffed.', location: '4th Street', officerName: 'Sergeant KingMS', createdAt: ago(12) },
        { id: 'r2', kind: 'CITATION', kindName: 'Citation', charges: ['Speeding'], summary: 'Clocked at 90 on Kingsway.', location: 'Kingsway', officerName: 'Officer II MillerTW', createdAt: ago(25) },
      ],
      warrants: [{ id: 'w1', number: 'W-2026-0007', charges: ['Felony assault'], summary: 'Wanted for an assault at the harbour.', danger: 'HIGH', dangerName: 'High', status: 'ACTIVE', onWantedList: true, issuedByName: 'Lieutenant DavisJK', issuedAt: ago(3) }] },
    { id: 's2', robloxUserId: '2', username: 'QuickSilverYL', characterName: null, notes: null, flags: [flag('flight-risk')], createdAt: ago(10),
      records: [{ id: 'r3', kind: 'WARNING', kindName: 'Warning', charges: [], summary: 'Verbal warning for reckless driving near Capital Park.', location: 'Capital Park', officerName: 'Officer I ParkerAR', createdAt: ago(9) }],
      warrants: [{ id: 'w2', number: 'W-2026-0006', charges: ['Evading police', 'Grand theft auto'], summary: 'Fled a traffic stop in a stolen car.', danger: 'MEDIUM', dangerName: 'Medium', status: 'ACTIVE', onWantedList: false, issuedByName: 'Sergeant KingMS', issuedAt: ago(5) }] },
    { id: 's3', robloxUserId: '3', username: 'Bricklayer_99', characterName: 'Sam Mason', notes: null, flags: [], createdAt: ago(60),
      records: [{ id: 'r4', kind: 'NOTE', kindName: 'Note', charges: [], summary: 'Witness to the Northgate fire. Cooperative.', location: '58 Northgate Ave', officerName: 'Lieutenant DavisJK', createdAt: ago(40) }],
      warrants: [] },
  ];
  function subjectRow(s) {
    return { id: s.id, robloxUserId: s.robloxUserId, username: s.username, characterName: s.characterName, flags: s.flags,
      activeWarrants: s.warrants.filter(function (w) { return w.status === 'ACTIVE'; }).length, createdAt: s.createdAt };
  }

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
    if (action === 'subjects') {
      var q = String(data.q || '').toLowerCase();
      var rows = SUBJECTS.filter(function (s) { return !q || (s.username + ' ' + (s.characterName || '')).toLowerCase().indexOf(q) !== -1; });
      if (data.wantedOnly === true) rows = rows.filter(function (s) { return s.warrants.some(function (w) { return w.onWantedList; }); });
      return { success: true, subjects: rows.map(subjectRow), canAdd: true, flags: FLAGS };
    }
    if (action === 'subject') {
      var s = SUBJECTS.filter(function (x) { return x.id === data.id; })[0];
      if (!s) return { success: false, msg: 'That record doesn\'t exist.' };
      return { success: true,
        subject: { id: s.id, robloxUserId: s.robloxUserId, username: s.username, characterName: s.characterName, avatar: null, notes: s.notes, flags: s.flags, createdAt: s.createdAt },
        records: s.records, warrants: s.warrants, allFlags: FLAGS,
        recordKinds: [{ key: 'ARREST', name: 'Arrest' }, { key: 'CITATION', name: 'Citation' }, { key: 'WARNING', name: 'Warning' }, { key: 'NOTE', name: 'Note' }],
        dangerLevels: [{ key: 'LOW', name: 'Low' }, { key: 'MEDIUM', name: 'Medium' }, { key: 'HIGH', name: 'High' }],
        can: { record: true, warrant: true, edit: true, remove: true } };
    }
    if (action === 'warrants') {
      var list = [];
      SUBJECTS.forEach(function (s) { s.warrants.forEach(function (w) {
        if (w.status === 'ACTIVE') list.push(Object.assign({}, w, { subjectId: s.id, username: s.username, characterName: s.characterName, avatar: null }));
      }); });
      return { success: true, warrants: list, canManage: true };
    }
    if (action === 'audit') return { success: true, entries: data.badge ? AUDIT.filter(function (a) { return a.target === data.badge; }) : AUDIT };
    if (action === 'cases') return casesList(data);
    if (action === 'case') return caseOne(data);
    if (action === 'case-counts') return { success: true, counts: { OFFICER: { new: 1, open: 1 }, DEPARTMENT: { new: 0, open: 1 }, FIRE: { new: 1, open: 1 } } };
    if (action === 'cad') return cadBoard(data);
    return NOT_SAVED;
  }


  /* ---- sample OIA / OFI cases ---- */
  var FINDING_NAMES = { SUSTAINED: 'Sustained', NOT_SUSTAINED: 'Not sustained', EXONERATED: 'Exonerated', UNFOUNDED: 'Unfounded', WITHDRAWN: 'Withdrawn',
    RESOLVED: 'Resolved', POLICY_CHANGED: 'Policy changed', NO_ACTION: 'No action needed',
    ACCIDENTAL: 'Accidental', NATURAL: 'Natural', INCENDIARY: 'Incendiary (arson)', UNDETERMINED: 'Undetermined' };
  var FINDING_KEYS = { OFFICER: ['SUSTAINED', 'NOT_SUSTAINED', 'EXONERATED', 'UNFOUNDED', 'WITHDRAWN'], DEPARTMENT: ['RESOLVED', 'POLICY_CHANGED', 'NO_ACTION', 'WITHDRAWN'],
    FIRE: ['ACCIDENTAL', 'NATURAL', 'INCENDIARY', 'UNDETERMINED'] };
  var CASES = [
    ['k1', 'OIA-2026-0007', 'OFFICER', 'NEW', 'Rude during a traffic stop', 'Sergeant KingMS (#2318)', 'POLICE', 'Main St', null, null, 0.2],
    ['k2', 'OIA-2026-0006', 'OFFICER', 'OPEN', 'Excessive force at the docks', 'Sergeant KingMS (#2318)', 'POLICE', 'Harbour Rd', 'Lieutenant DavisJK', null, 2],
    ['k3', 'OIA-2026-0003', 'OFFICER', 'CLOSED', 'Vehicle left blocking a junction', 'Officer II MillerTW (#2456)', 'POLICE', 'Central Ave', 'Lieutenant DavisJK', 'NOT_SUSTAINED', 12],
    ['k4', 'OIA-2026-0005', 'DEPARTMENT', 'OPEN', 'Slow response times in the north', null, 'POLICE', null, 'Chief Craixzo', null, 4],
    ['k5', 'OFI-2026-0004', 'FIRE', 'NEW', 'House fire on Harbour Road', null, 'FIRE', 'Harbour Rd 12', null, null, 0.1],
    ['k6', 'OFI-2026-0003', 'FIRE', 'OPEN', 'Warehouse fire, possible arson', null, 'FIRE', 'North warehouses', 'Fire Chief Abutalee', null, 3],
    ['k7', 'OFI-2026-0002', 'FIRE', 'CLOSED', 'Car fire on Yeloria Bridge', null, 'FIRE', 'Yeloria Bridge', 'Firefighter ColeSL', 'ACCIDENTAL', 9],
    ['k8', 'OFI-2026-0001', 'FIRE', 'CLOSED', 'Shop fire on Main St', null, 'FIRE', 'Main St', 'Fire Chief Abutalee', 'INCENDIARY', 20],
  ].map(function (r) {
    var fire = r[2] === 'FIRE';
    var names = fire ? { NEW: 'Reported', OPEN: 'Active investigation', CLOSED: 'Closed', DISMISSED: 'Dismissed' } : { NEW: 'Received', OPEN: 'Under investigation', CLOSED: 'Closed', DISMISSED: 'Dismissed' };
    return { id: r[0], number: r[1], kind: r[2], kindName: { OFFICER: 'Officer complaint', DEPARTMENT: 'Department complaint', FIRE: 'Fire investigation' }[r[2]],
      status: r[3], statusName: names[r[3]], title: r[4], accusedName: r[5], department: d(r[6]).short, location: r[7], assignedName: r[8],
      finding: r[9], findingName: r[9] ? FINDING_NAMES[r[9]] : null, internal: false, createdAt: ago(r[10]), updatedAt: ago(r[10]), closedAt: r[3] === 'CLOSED' ? ago(r[10] - 1) : null };
  });
  function casesList(data) {
    var scope = { new: ['NEW'], active: ['OPEN'], open: ['NEW', 'OPEN'], closed: ['CLOSED', 'DISMISSED'] }[data.scope] || ['NEW', 'OPEN', 'CLOSED', 'DISMISSED'];
    var q = String(data.q || '').toLowerCase();
    var rows = CASES.filter(function (c) {
      return c.kind === data.kind && scope.indexOf(c.status) !== -1 && (!data.finding || c.finding === data.finding)
        && (!q || (c.number + ' ' + c.title + ' ' + (c.location || '') + ' ' + (c.accusedName || '')).toLowerCase().indexOf(q) !== -1);
    });
    return { success: true, cases: rows, findings: FINDING_KEYS[data.kind].map(function (k) { return { key: k, name: FINDING_NAMES[k] }; }), departments: DEPTS };
  }
  function caseOne(data) {
    var c = CASES.filter(function (x) { return x.id === data.id; })[0];
    if (!c) return { success: false, msg: 'That case doesn\'t exist, or you can\'t open it.' };
    var officer = c.kind === 'OFFICER' ? PEOPLE.filter(function (p) { return c.accusedName && c.accusedName.indexOf(p.username) !== -1; })[0] : null;
    var full = Object.assign({}, c, {
      description: 'Sample case for the preview. In a real case, this is what the person who filed it wrote, word for word.',
      occurredAt: 'Saturday evening', departmentName: d(c.kind === 'FIRE' ? 'FIRE' : 'POLICE').name, departmentKey: c.kind === 'FIRE' ? 'FIRE' : 'POLICE',
      evidence: ['https://medal.tv/example-clip'], accusedText: officer ? officer.username : null,
      accused: officer ? { id: officer.id, name: officer.rank + ' ' + officer.username, badgeId: officer.badgeId, department: officer.departmentShort, status: 'ACTIVE' } : null,
      linkedCall: c.kind === 'FIRE' ? 'C-2026-00041' : null, submitterName: 'Concerned Citizen', submitterDiscordId: '000000000000000000',
      assignedTo: c.assignedName ? 'preview-me' : null, publicNote: c.status === 'CLOSED' ? 'Thank you for your report.' : null,
      subjects: c.id === 'k6' ? [{ id: 's1', username: 'HarbourRat', characterName: 'Johnny Doe', flags: ['Armed', 'Violent'], activeWarrants: 1 }] : [],
      history: officer ? CASES.filter(function (o) { return o.id !== c.id && o.accusedName === c.accusedName; }) : [],
      log: [{ id: 'l1', kind: 'SYSTEM', text: 'Filed through the public form by Concerned Citizen.', actorName: 'Website', createdAt: c.createdAt }].concat(c.assignedName ?
        [{ id: 'l2', kind: 'SYSTEM', text: 'Assigned to ' + c.assignedName + '.', actorName: c.assignedName, createdAt: c.createdAt },
         { id: 'l3', kind: 'NOTE', text: 'Spoke to the reporter. Waiting on the clip from the second witness.', actorName: c.assignedName, createdAt: c.updatedAt }] : []),
    });
    return { success: true, case: full, investigators: [{ id: 'preview-me', name: 'Chief Craixzo (#1001)' }], me: 'preview-me',
      findings: FINDING_KEYS[c.kind].map(function (k) { return { key: k, name: FINDING_NAMES[k] }; }), departments: DEPTS };
  }

  /* ---- sample CAD board ---- */
  function mins(n) { return new Date(Date.now() - n * 60000).toISOString(); }
  var UNIT_STATUS = { AVAILABLE: 'Available', ENROUTE: 'En route', ONSCENE: 'On scene', BUSY: 'Busy', OOS: 'Out of service' };
  var CAD_UNITS = [
    ['u1', '1A-12', 'p4', 'Sergeant KingMS', 'POLICE', 'ONSCENE', 'c1', 6],
    ['u2', '1A-15', 'p5', 'Officer II MillerTW', 'POLICE', 'ENROUTE', 'c1', 2],
    ['u3', 'K9-3', 'p6', 'Officer I ParkerAR', 'POLICE', 'AVAILABLE', null, 25],
    ['u4', 'E-1', 'p8', 'Firefighter ColeSL', 'FIRE', 'ONSCENE', 'c2', 11],
  ].map(function (r) {
    return { id: r[0], callsign: r[1], memberId: r[2], memberName: r[3], department: r[4], deptShort: d(r[4]).short,
      status: r[5], statusName: UNIT_STATUS[r[5]], incidentId: r[6], since: mins(r[7]) };
  });
  var CALLS = [
    { id: 'c1', number: 'C-2026-00042', priority: 1, priorityName: 'Emergency', type: 'Shots fired', location: 'Harbour Rd & 3rd St', status: 'ACTIVE', createdAt: mins(8),
      caller: 'Anonymous', description: 'Caller reports several shots near the docks. Suspect seen running towards the warehouses in a dark hoodie.', subjects: ['s1'],
      log: [[8, 'SYSTEM', 'Call created: P1 Shots fired at Harbour Rd & 3rd St.', 'Dispatcher DavisJK'], [7, 'ASSIGN', '1A-12 assigned, en route.', 'Dispatcher DavisJK'],
        [6, 'STATUS', '1A-12 on scene.', '1A-12 (Sergeant KingMS)'], [5, 'NOTE', 'Shell casings found by the north warehouse. Suspect not in sight.', '1A-12 (Sergeant KingMS)'],
        [4, 'SYSTEM', 'Linked record: HarbourRat.', 'Dispatcher DavisJK'], [2, 'ASSIGN', '1A-15 assigned, en route.', 'Dispatcher DavisJK']] },
    { id: 'c2', number: 'C-2026-00041', priority: 2, priorityName: 'Urgent', type: 'Vehicle fire', location: 'Yeloria Bridge, eastbound', status: 'ACTIVE', createdAt: mins(14),
      caller: 'BrownMJ', description: null, subjects: [],
      log: [[14, 'SYSTEM', 'Call created: P2 Vehicle fire at Yeloria Bridge, eastbound.', 'Dispatcher DavisJK'], [13, 'ASSIGN', 'E-1 assigned, en route.', 'Dispatcher DavisJK'], [11, 'STATUS', 'E-1 on scene.', 'E-1 (Firefighter ColeSL)']] },
    { id: 'c3', number: 'C-2026-00043', priority: 3, priorityName: 'Routine', type: 'Suspicious person', location: 'Central Park, by the fountain', status: 'PENDING', createdAt: mins(1),
      caller: 'Park visitor', description: 'Someone looking into parked cars.', subjects: [],
      log: [[1, 'SYSTEM', 'Call created: P3 Suspicious person at Central Park, by the fountain.', 'Dispatcher DavisJK']] },
  ];
  var CLOSED = [{ id: 'c0', number: 'C-2026-00040', priority: 3, priorityName: 'Routine', type: 'Traffic stop', location: 'Main St', status: 'CLOSED',
    disposition: 'Citation issued', createdAt: mins(50), closedAt: mins(38), subjects: [], caller: null, description: null,
    log: [[50, 'ASSIGN', '1A-15 self-initiated, on scene.', '1A-15 (Officer II MillerTW)'], [38, 'SYSTEM', 'Call closed: Citation issued. Cleared 1A-15.', '1A-15 (Officer II MillerTW)']] }];

  function callRow(c) {
    return { id: c.id, number: c.number, priority: c.priority, priorityName: c.priorityName, type: c.type, location: c.location, status: c.status,
      disposition: c.disposition || null, createdAt: c.createdAt, updatedAt: c.createdAt, closedAt: c.closedAt || null,
      units: CAD_UNITS.filter(function (u) { return u.incidentId === c.id; }).map(function (u) { return { id: u.id, callsign: u.callsign, status: u.status }; }),
      subjectCount: c.subjects.length };
  }
  function cadBoard(data) {
    var answer = { success: true, incidents: CALLS.slice().sort(function (a, b) { return a.priority - b.priority; }).map(callRow), recent: CLOSED.map(callRow), units: CAD_UNITS,
      me: { unit: null, canDispatch: true, department: 'POLICE', defaultCallsign: 'YPD-1001' },
      callTypes: { POLICE: ['Traffic stop', 'Shots fired', 'Suspicious person', 'Other'], FIRE: ['Structure fire', 'Vehicle fire', 'Medical emergency', 'Other'] },
      departments: { POLICE: 'YPD', FIRE: 'YFD' }, priorities: { 1: 'Emergency', 2: 'Urgent', 3: 'Routine', 4: 'Low' }, unitStatus: UNIT_STATUS,
      now: new Date().toISOString() };
    if (data.id) {
      var c = CALLS.concat(CLOSED).filter(function (x) { return x.id === data.id; })[0];
      answer.incident = c ? Object.assign(callRow(c), {
        description: c.description, caller: c.caller, units: CAD_UNITS.filter(function (u) { return u.incidentId === c.id; }),
        subjects: c.subjects.map(function (id) {
          var s = SUBJECTS.filter(function (x) { return x.id === id; })[0];
          var active = s.warrants.filter(function (w) { return w.status === 'ACTIVE'; });
          return { id: s.id, username: s.username, characterName: s.characterName, flags: s.flags.map(function (f) { return f.name || f; }),
            activeWarrants: active.length, danger: active.length ? active[0].danger : null };
        }),
        log: c.log.map(function (l, n) { return { id: c.id + n, kind: l[1], text: l[2], actorName: l[3], createdAt: mins(l[0]) }; }),
        canWork: true, canDispatch: true }) : null;
    }
    return answer;
  }

  return { on: on, enter: enter, leave: leave, answer: answer, TRIGGER: TRIGGER };
})();
