/* ==============================================================
   des/cases.js - the OIA and OFI case lists

   One script for five pages; the page's <main data-mode="..."> picks which:
     oia-officer      OIA: Officer Complaints
     oia-department   OIA: Department Complaints
     ofi-reported     OFI: Reported Investigations (fires the public reported)
     ofi-active       OFI: Active Investigations
     ofi-database     OFI Database (closed investigations, searchable)

   Click a case to open it on case.html. The server checks every request:
   OIA cases need the OIA role, OFI cases the OFI role (or Service Admin),
   and nobody ever sees a complaint about themselves.
   ============================================================== */
(function () {
  var el = DES.el;
  var main = document.querySelector('main[data-mode]');

  /* ---------- the five pages ---------- */
  var MODES = {
    'oia-officer': { kind: 'OFFICER', office: 'oia', section: 'Office of Internal Affairs', title: 'Officer Complaints',
      intro: 'Complaints about individual officers and firefighters, from the public and from inside DES.',
      tabs: [['open', 'Open'], ['new', 'New'], ['closed', 'Closed'], ['all', 'All']], create: 'New internal complaint', third: 'Officer' },
    'oia-department': { kind: 'DEPARTMENT', office: 'oia', section: 'Office of Internal Affairs', title: 'Department Complaints',
      intro: 'Complaints about a department as a whole: its policies, conduct or service.',
      tabs: [['open', 'Open'], ['new', 'New'], ['closed', 'Closed'], ['all', 'All']], create: 'New internal complaint', third: 'Department' },
    'ofi-reported': { kind: 'FIRE', office: 'ofi', section: 'Office of Fire Investigations', title: 'Reported Investigations',
      intro: 'Fires reported by the public. Open one to start an investigation, or dismiss it.',
      tabs: [['new', 'Reported']], third: 'Location' },
    'ofi-active': { kind: 'FIRE', office: 'ofi', section: 'Office of Fire Investigations', title: 'Active Investigations',
      intro: 'Fire investigations under way.',
      tabs: [['active', 'Active']], create: 'Open investigation', third: 'Location' },
    'ofi-database': { kind: 'FIRE', office: 'ofi', section: 'Office of Fire Investigations', title: 'OFI Database',
      intro: 'Every finished fire investigation and its cause.',
      tabs: [['closed', 'Finished'], ['all', 'All']], third: 'Location', causeFilter: true },
  };
  var mode = MODES[main.getAttribute('data-mode')];

  DES.requireMember().then(function (member) {
    if (!DES.hasRole(member, mode.office, 'service-admin')) {
      DES.noAccess(main, mode.kind === 'FIRE' ? 'Only the Office of Fire Investigations can open this page.' : 'Only the Office of Internal Affairs can open this page.');
      return;
    }
    build();
  });

  function build() {
    main.textContent = '';
    var head = el('div', 'page-head');
    var titles = el('div');
    titles.appendChild(el('div', 'label', mode.section));
    titles.appendChild(el('h1', null, mode.title));
    head.appendChild(titles);
    var createBtn = null;
    if (mode.create) { createBtn = el('button', 'btn btn-primary', mode.create); createBtn.type = 'button'; head.appendChild(createBtn); }
    main.appendChild(head);
    main.appendChild(el('p', 'dim case-intro', mode.intro));

    var createPanel = el('section', 'panel');
    createPanel.hidden = true;
    main.appendChild(createPanel);
    if (createBtn) createBtn.addEventListener('click', function () {
      createPanel.hidden = !createPanel.hidden;
      if (!createPanel.hidden) { buildCreate(createPanel); createPanel.querySelector('input').focus(); }
    });

    /* filters */
    var bar = el('form', 'toolbar');
    var state = { scope: mode.tabs[0][0], q: '', finding: '' };
    if (mode.tabs.length > 1) {
      var tabs = el('div', 'case-tabs');
      tabs.setAttribute('role', 'group');
      tabs.setAttribute('aria-label', 'Show');
      mode.tabs.forEach(function (t) {
        var b = el('button', 'case-tab', t[1]);
        b.type = 'button';
        b.setAttribute('aria-pressed', t[0] === state.scope ? 'true' : 'false');
        b.addEventListener('click', function () {
          state.scope = t[0];
          Array.prototype.forEach.call(tabs.children, function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
          run();
        });
        tabs.appendChild(b);
      });
      main.appendChild(tabs);
    }
    var wrap = el('label', 'tool');
    wrap.appendChild(el('span', 'label', 'Search'));
    var search = el('input');
    search.type = 'search';
    search.placeholder = 'Number, title, name or location';
    wrap.appendChild(search);
    bar.appendChild(wrap);
    var cause = null;
    if (mode.causeFilter) {
      var cwrap = el('label', 'tool');
      cwrap.appendChild(el('span', 'label', 'Cause'));
      cause = el('select');
      cause.appendChild(option('', 'Any cause'));
      cwrap.appendChild(cause);
      bar.appendChild(cwrap);
      cause.addEventListener('change', function () { state.finding = cause.value; run(); });
    }
    main.appendChild(bar);

    var results = el('section', 'panel');
    main.appendChild(results);

    var timer, filled = false;
    function run() {
      DES.act('cases', { kind: mode.kind, scope: state.scope, q: search.value.trim(), finding: state.finding || undefined }).then(function (answer) {
        results.textContent = '';
        if (!answer.success) { results.appendChild(el('p', 'panel-body', answer.msg)); return; }
        if (cause && !filled) { answer.findings.forEach(function (f) { cause.appendChild(option(f.key, f.name)); }); filled = true; }
        drawTable(results, answer.cases);
      });
    }
    search.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 200); });
    bar.addEventListener('submit', function (e) { e.preventDefault(); run(); });
    run();
  }

  function drawTable(panel, cases) {
    var headRow = el('div', 'panel-head');
    headRow.appendChild(el('h2', null, mode.title));
    headRow.appendChild(el('span', 'label', cases.length + (cases.length === 1 ? ' case' : ' cases')));
    panel.appendChild(headRow);

    var scroll = el('div', 'table-scroll');
    var table = el('table', 'data-table');
    var thead = el('thead');
    var tr = el('tr');
    ['Case', 'Title', mode.third, 'Status', 'Investigator', 'Received'].forEach(function (h) { tr.appendChild(el('th', null, h)); });
    thead.appendChild(tr);
    table.appendChild(thead);
    var tbody = el('tbody');
    if (!cases.length) {
      var none = el('tr');
      var td = el('td', 'table-empty', 'No cases here.');
      td.colSpan = 6;
      none.appendChild(td);
      tbody.appendChild(none);
    }
    cases.forEach(function (c) {
      var row = el('tr');
      var first = el('td');
      var link = el('a', 'row-link mono', c.number);
      link.href = '/des/case.html?id=' + encodeURIComponent(c.id);
      first.appendChild(link);
      row.appendChild(first);
      var title = el('td', 'wrap', c.title);
      if (c.internal) { title.appendChild(document.createTextNode(' ')); title.appendChild(el('span', 'chip', 'Internal')); }
      row.appendChild(title);
      var third = mode.kind === 'OFFICER' ? (c.accusedName || '—') : mode.kind === 'DEPARTMENT' ? (c.department || '—') : (c.location || '—');
      row.appendChild(el('td', 'wrap', third));
      var st = el('td');
      st.appendChild(statusChip(c));
      if (c.findingName) { st.appendChild(document.createTextNode(' ')); st.appendChild(el('span', 'dim', c.findingName)); }
      row.appendChild(st);
      row.appendChild(el('td', c.assignedName ? '' : 'dim', c.assignedName || 'Unassigned'));
      row.appendChild(el('td', 'mono', DES.day(c.createdAt)));
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    scroll.appendChild(table);
    panel.appendChild(scroll);
  }

  /* ---------- opening a case from inside DES ---------- */
  function buildCreate(panel) {
    panel.textContent = '';
    var h = el('div', 'panel-head');
    h.appendChild(el('h2', null, mode.create));
    panel.appendChild(h);
    var body = el('div', 'panel-body');
    var form = el('form', 'form');
    form.noValidate = true;

    var title = field(form, 'Title', 'input', 'A short summary, e.g. "Excessive force at the docks".');
    title.maxLength = 120;
    var accused = null, department = null, linkedCall = null;
    if (mode.kind === 'OFFICER') {
      accused = field(form, 'Officer', 'input', 'Their badge number is best. A name also works.');
      accused.maxLength = 120;
    }
    if (mode.kind === 'DEPARTMENT') {
      department = field(form, 'Department', 'select');
      department.appendChild(option('', 'Pick a department…'));
      department.appendChild(option('POLICE', 'Yellonia Police Department'));
      department.appendChild(option('FIRE', 'Yellonia Fire Department'));
    }
    var place = field(form, mode.kind === 'FIRE' ? 'Location' : 'Location (optional)', 'input');
    place.maxLength = 120;
    var when = field(form, 'When (optional)', 'input', 'In-game date and time, roughly.');
    when.maxLength = 60;
    if (mode.kind === 'FIRE') {
      linkedCall = field(form, 'CAD call (optional)', 'input', 'The call number, e.g. C-2026-00012.');
      linkedCall.classList.add('mono');
      linkedCall.maxLength = 20;
    }
    var description = field(form, 'What happened', 'textarea');
    description.rows = 5;
    description.maxLength = 4000;
    var evidence = field(form, 'Evidence links (optional)', 'textarea', 'One link per line: clips, screenshots. Up to 6.');
    evidence.rows = 2;

    var msg = el('p', 'message');
    form.appendChild(msg);
    var buttons = el('div', 'button-row');
    var save = el('button', 'btn btn-primary', 'Open case');
    save.type = 'submit';
    var cancel = el('button', 'btn', 'Cancel');
    cancel.type = 'button';
    cancel.addEventListener('click', function () { panel.hidden = true; });
    buttons.appendChild(save);
    buttons.appendChild(cancel);
    form.appendChild(buttons);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      save.disabled = true;
      DES.act('case-create', {
        kind: mode.kind, title: title.value.trim(), description: description.value.trim(), location: place.value.trim(), occurredAt: when.value.trim(),
        evidence: evidence.value, accused: accused ? accused.value.trim() : undefined, department: department ? department.value : undefined,
        linkedCall: linkedCall ? linkedCall.value.trim() : undefined,
      }).then(function (answer) {
        save.disabled = false;
        if (!answer.success) { DES.message(msg, 'error', answer.msg); return; }
        window.location.href = '/des/case.html?id=' + encodeURIComponent(answer.id);
      });
    });
    body.appendChild(form);
    panel.appendChild(body);
  }

  /* ---------- helpers ---------- */
  function statusChip(c) {
    var cls = { NEW: 'chip-amber', OPEN: 'chip-lime', CLOSED: 'chip-green', DISMISSED: '' }[c.status] || '';
    return el('span', 'chip ' + cls, c.statusName);
  }
  function option(value, text) { var o = el('option', null, text); o.value = value; return o; }
  function field(parent, labelText, tag, hint) {
    var wrap = el('div', 'field');
    var id = 'case-f-' + Math.random().toString(36).slice(2, 8);
    var label = el('label', null, labelText);
    label.htmlFor = id;
    var input = el(tag);
    input.id = id;
    wrap.appendChild(label);
    wrap.appendChild(input);
    if (hint) wrap.appendChild(el('span', 'field-hint', hint));
    parent.appendChild(wrap);
    return input;
  }
})();
