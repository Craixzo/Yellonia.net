/* des/dashboard.js - the back-end dashboard: who you are and what you can open */
(function () {
  var el = DES.el;
  var main = document.getElementById('dashboard');

  DES.requireMember().then(function (member) {
    main.textContent = '';

    var top = el('div');
    top.appendChild(el('div', 'label', member.departmentName));
    top.appendChild(el('h1', null, 'Welcome, ' + member.rank + ' ' + member.username));
    main.appendChild(top);

    var grid = el('div', 'dash-grid');

    /* Your record */
    var you = el('section', 'panel');
    var head = el('div', 'panel-head');
    head.appendChild(el('h2', null, 'Your record'));
    you.appendChild(head);
    var body = el('div', 'panel-body');
    var kv = el('dl', 'kv');
    [['Username', member.username], ['Badge ID', member.badgeId], ['Department', member.departmentShort], ['Rank', member.rank], ['Unit', member.unit || '—'],
      ['Last login', member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleString() : '—']].forEach(function (row) {
      kv.appendChild(el('dt', null, row[0]));
      kv.appendChild(el('dd', null, row[1]));
    });
    body.appendChild(kv);
    var chips = el('div', 'chips');
    chips.style.marginTop = '14px';
    member.roles.forEach(function (role) { chips.appendChild(el('span', 'chip chip-lime', DES.ROLE_NAMES[role] || role)); });
    body.appendChild(chips);
    you.appendChild(body);
    grid.appendChild(you);

    /* Your access, by section (the home page's tiles link to these) */
    DES.MENU.forEach(function (section) {
      var panel = el('section', 'panel access-section');
      panel.id = section.id;
      var h = el('div', 'panel-head');
      h.appendChild(el('h2', null, section.title));
      panel.appendChild(h);
      var list = el('ul', 'access-list');
      var items = section.items.filter(function (item) { return DES.canSee(item, member.roles); });
      if (!items.length) {
        var none = el('li', 'access-none', 'Your role doesn\'t include this section.');
        list.appendChild(none);
      }
      items.forEach(function (item) {
        var li = el('li');
        if (item.page) {
          var a = el('a', null, item.name);
          a.href = item.page;
          li.appendChild(a);
        } else {
          li.appendChild(el('span', null, item.name));
          li.appendChild(el('span', 'soon-tag', 'Coming in ' + item.soon));
        }
        list.appendChild(li);
      });
      panel.appendChild(list);
      grid.appendChild(panel);
    });

    main.appendChild(grid);

    /* Opened from a home page tile (e.g. #database): bring that section into view */
    if (location.hash) {
      var target = document.getElementById(location.hash.slice(1));
      if (target) target.scrollIntoView({ block: 'start' });
    }
  });
})();
