/* ==============================================================
   des/personnel.js - the Personnel Database and Former Personnel lists

   personnel.html uses it with data-mode="active", former.html with
   data-mode="former". Filters, search, sorting and pages all happen
   here in the browser; Centurion decides who may see which list.
   ============================================================== */
(function () {
  var el = DES.el;
  var main = document.getElementById('personnel');
  var former = main.getAttribute('data-mode') === 'former';
  var PAGE_SIZE = 20;

  var members = [], shown = [], page = 0;
  var state = { search: '', dept: '', unit: '', rank: '', flag: '', sort: 'badge' };

  DES.requireMember().then(function (me) {
    if (former && !DES.hasRole(me, 'supervisor', 'oia', 'local-admin', 'service-admin')) {
      return DES.noAccess(main, 'Former Personnel is for supervisors, Internal Affairs and admins.');
    }
    DES.act('personnel', { former: former }).then(function (answer) {
      if (!answer.success) return DES.noAccess(main, answer.msg);
      members = answer.members;
      build(answer);
    });
  });

  function build(answer) {
    main.textContent = '';

    /* Heading row */
    var head = el('div', 'page-head');
    var titles = el('div');
    titles.appendChild(el('div', 'label', 'Department Database'));
    titles.appendChild(el('h1', null, former ? 'Former Personnel' : 'Personnel Database'));
    head.appendChild(titles);
    if (answer.canAdd && !former) {
      var add = el('a', 'btn btn-primary', 'Add member');
      add.href = '/des/admin.html#add';
      head.appendChild(add);
    }
    main.appendChild(head);

    /* Filters */
    var bar = el('div', 'toolbar');
    var search = control(bar, 'input', 'Search', 'Name, Badge ID or unit');
    search.type = 'search';
    search.addEventListener('input', function () { state.search = search.value.toLowerCase().trim(); refresh(); });

    var dept = control(bar, 'select', 'Department');
    option(dept, '', 'All departments');
    answer.departments.forEach(function (d) { option(dept, d.key, d.name); });
    dept.addEventListener('change', function () { state.dept = dept.value; refresh(); });

    var unit = control(bar, 'select', 'Unit');
    option(unit, '', 'All units');
    unique('unit').forEach(function (u) { option(unit, u, u); });
    unit.addEventListener('change', function () { state.unit = unit.value; refresh(); });

    var rank = control(bar, 'select', 'Rank');
    option(rank, '', 'All ranks');
    unique('rank').forEach(function (r) { option(rank, r, r); });
    rank.addEventListener('change', function () { state.rank = rank.value; refresh(); });

    if (!former && members.some(function (m) { return m.setUp !== undefined; })) {
      var flag = control(bar, 'select', 'Account');
      option(flag, '', 'All accounts');
      option(flag, 'setup', 'Not set up yet');
      option(flag, 'locked', 'Locked');
      flag.addEventListener('change', function () { state.flag = flag.value; refresh(); });
    }

    var sort = control(bar, 'select', 'Sort by');
    option(sort, 'badge', 'Badge ID');
    option(sort, 'name', 'Name');
    option(sort, 'joined', former ? 'Date left' : 'Date joined');
    sort.addEventListener('change', function () { state.sort = sort.value; refresh(); });

    main.appendChild(bar);

    /* Table */
    var panel = el('section', 'panel');
    var scroll = el('div', 'table-scroll');
    var table = el('table', 'data-table');
    var thead = el('thead');
    var tr = el('tr');
    (former ? ['Name', 'Rank', 'Department', 'Unit', 'Badge', 'Joined', 'Left', 'Served', 'Reason']
            : ['Name', 'Rank', 'Department', 'Unit', 'Badge', 'Joined', 'Service', ''])
      .forEach(function (h) { var th = el('th', null, h); th.scope = 'col'; tr.appendChild(th); });
    thead.appendChild(tr);
    table.appendChild(thead);
    var tbody = el('tbody');
    table.appendChild(tbody);
    scroll.appendChild(table);
    panel.appendChild(scroll);

    var foot = el('div', 'table-foot');
    var count = el('span', 'label');
    var pager = el('div', 'pager');
    foot.appendChild(count);
    foot.appendChild(pager);
    panel.appendChild(foot);
    main.appendChild(panel);

    function refresh() { page = 0; filter(); draw(); }

    function filter() {
      shown = members.filter(function (m) {
        if (state.dept && m.department !== state.dept) return false;
        if (state.unit && m.unit !== state.unit) return false;
        if (state.rank && m.rank !== state.rank) return false;
        if (state.flag === 'setup' && m.setUp !== false) return false;
        if (state.flag === 'locked' && !m.locked) return false;
        if (state.search) {
          var hay = [m.username, m.badgeId, m.unit, m.rank].join(' ').toLowerCase();
          if (hay.indexOf(state.search) === -1) return false;
        }
        return true;
      });
      shown.sort(function (a, b) {
        if (state.sort === 'name') return a.username.localeCompare(b.username);
        if (state.sort === 'joined') return String(former ? b.leftAt : a.joinedAt).localeCompare(String(former ? a.leftAt : b.joinedAt));
        return String(a.badgeId).localeCompare(String(b.badgeId), undefined, { numeric: true });
      });
    }

    function draw() {
      tbody.textContent = '';
      var slice = shown.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
      if (!slice.length) {
        var empty = el('tr');
        var td = el('td', 'table-empty', members.length ? 'Nobody matches those filters.' : (former ? 'Nobody has left yet.' : 'No members yet.'));
        td.colSpan = 9;
        empty.appendChild(td);
        tbody.appendChild(empty);
      }
      slice.forEach(function (m) {
        var row = el('tr');
        var nameCell = el('td');
        var link = el('a', 'row-link', m.username);
        link.href = '/des/member.html?id=' + encodeURIComponent(m.id);
        nameCell.appendChild(link);
        row.appendChild(nameCell);
        row.appendChild(el('td', null, m.rank));
        row.appendChild(el('td', null, m.departmentShort));
        row.appendChild(el('td', 'dim', m.unit || '—'));
        row.appendChild(el('td', 'mono', m.badgeId));
        row.appendChild(el('td', 'mono dim', DES.day(m.joinedAt)));
        if (former) {
          row.appendChild(el('td', 'mono dim', DES.day(m.leftAt)));
          row.appendChild(el('td', 'dim', DES.service(m.joinedAt, m.leftAt)));
          row.appendChild(el('td', 'dim wrap', m.leaveReason || '—'));
        } else {
          row.appendChild(el('td', 'dim', DES.service(m.joinedAt)));
          var flags = el('td');
          if (m.setUp === false) flags.appendChild(el('span', 'chip chip-amber', 'Not set up'));
          if (m.locked) flags.appendChild(el('span', 'chip chip-red', 'Locked'));
          row.appendChild(flags);
        }
        tbody.appendChild(row);
      });

      count.textContent = shown.length === members.length
        ? members.length + (members.length === 1 ? ' member' : ' members')
        : shown.length + ' of ' + members.length + ' members';

      /* Page buttons */
      pager.textContent = '';
      var pages = Math.ceil(shown.length / PAGE_SIZE);
      if (pages < 2) return;
      for (var i = 0; i < pages; i++) {
        (function (n) {
          var b = el('button', 'pager-btn' + (n === page ? ' current' : ''), String(n + 1));
          b.type = 'button';
          b.setAttribute('aria-label', 'Page ' + (n + 1));
          if (n === page) b.setAttribute('aria-current', 'page');
          b.addEventListener('click', function () { page = n; draw(); main.scrollIntoView({ block: 'start' }); });
          pager.appendChild(b);
        })(i);
      }
    }

    refresh();
  }

  /* A labelled filter control */
  function control(bar, tag, labelText, placeholder) {
    var wrap = el('label', 'tool');
    wrap.appendChild(el('span', 'label', labelText));
    var input = el(tag);
    if (placeholder) input.placeholder = placeholder;
    wrap.appendChild(input);
    bar.appendChild(wrap);
    return input;
  }
  function option(select, value, text) { var o = el('option', null, text); o.value = value; select.appendChild(o); }
  function unique(key) {
    return members.map(function (m) { return m[key]; }).filter(function (v, i, all) { return v && all.indexOf(v) === i; }).sort();
  }
})();
