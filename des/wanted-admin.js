/* ==============================================================
   des/wanted-admin.js - the Wanted List (staff), wanted-admin.html

   Every active warrant. Everyone can see it; supervisors, Internal
   Affairs and admins can put a warrant on or off the public Most
   Wanted page, mark it served or recall it. New warrants are issued
   from a subject's record in the Criminal Database.
   ============================================================== */
(function () {
  var el = DES.el;
  var main = document.getElementById('wanted-admin');
  var filter = 'all';

  DES.requireMember().then(load);

  function load() {
    DES.act('warrants', {}).then(function (answer) {
      if (!answer.success) return DES.noAccess(main, answer.msg);
      draw(answer);
    });
  }

  function draw(answer) {
    main.textContent = '';
    var head = el('div', 'page-head');
    var titles = el('div');
    titles.appendChild(el('div', 'label', 'Dispatch Operations'));
    titles.appendChild(el('h1', null, 'Wanted List'));
    titles.appendChild(el('p', 'dim', 'Active warrants. Issue new ones from a subject\'s record in the Criminal Database.'));
    head.appendChild(titles);
    var links = el('div', 'button-row');
    var db = el('a', 'btn', 'Criminal Database'); db.href = '/des/criminal.html'; links.appendChild(db);
    var pub = el('a', 'btn', 'Public Most Wanted page'); pub.href = '/wanted.html'; pub.target = '_blank'; pub.rel = 'noopener'; links.appendChild(pub);
    head.appendChild(links);
    main.appendChild(head);

    var flash = el('p', 'message');
    flash.setAttribute('role', 'status');

    /* filter buttons */
    var bar = el('div', 'button-row');
    [['all', 'All active'], ['wanted', 'On Most Wanted'], ['private', 'Not on Most Wanted']].forEach(function (f) {
      var b = el('button', 'btn btn-small' + (filter === f[0] ? ' btn-primary' : ''), f[1]);
      b.type = 'button';
      b.setAttribute('aria-pressed', filter === f[0] ? 'true' : 'false');
      b.addEventListener('click', function () { filter = f[0]; draw(answer); });
      bar.appendChild(b);
    });
    main.appendChild(bar);
    main.appendChild(flash);

    var list = answer.warrants.filter(function (w) {
      return filter === 'all' || (filter === 'wanted' ? w.onWantedList : !w.onWantedList);
    });
    var grid = el('div', 'wanted-grid');
    if (!list.length) {
      var none = el('p', 'panel panel-body dim', answer.warrants.length ? 'No warrants match that filter.' : 'There are no active warrants.');
      grid.appendChild(none);
    }
    list.forEach(function (w) {
      var card = el('article', 'panel wanted-card');
      var top = el('div', 'wanted-top');
      var av = el('div', 'subject-av');
      av.setAttribute('data-initials', w.username);
      if (w.avatar) { var img = el('img'); img.alt = ''; img.onerror = function () { var box = this.parentNode; box.textContent = (box.getAttribute('data-initials') || '?').slice(0, 2).toUpperCase(); }; img.src = w.avatar; av.appendChild(img); } else av.textContent = w.username.slice(0, 2).toUpperCase();
      top.appendChild(av);
      var who = el('div');
      var name = el('a', 'row-link', w.username);
      name.href = '/des/subject.html?id=' + encodeURIComponent(w.subjectId);
      who.appendChild(name);
      if (w.characterName) who.appendChild(el('div', 'dim', w.characterName));
      who.appendChild(el('div', 'mono dim', w.number));
      top.appendChild(who);
      card.appendChild(top);

      var chips = el('div', 'chips');
      chips.appendChild(el('span', 'chip danger-' + w.danger.toLowerCase(), w.dangerName + ' risk'));
      if (w.onWantedList) chips.appendChild(el('span', 'chip chip-red', 'Most Wanted'));
      card.appendChild(chips);
      card.appendChild(el('p', 'rec-summary', w.summary));
      if (w.charges.length) {
        var ul = el('ul', 'charge-list');
        w.charges.forEach(function (c) { ul.appendChild(el('li', null, c)); });
        card.appendChild(ul);
      }
      card.appendChild(el('p', 'rec-meta', 'Issued ' + DES.day(w.issuedAt) + ' by ' + w.issuedByName));

      if (answer.canManage) {
        var row = el('div', 'button-row');
        row.appendChild(action(w.onWantedList ? 'Remove from Most Wanted' : 'Add to Most Wanted', 'warrant-wanted', { id: w.id, onWantedList: !w.onWantedList }));
        row.appendChild(action('Mark served', 'warrant-close', { id: w.id, served: true }));
        row.appendChild(action('Recall', 'warrant-close', { id: w.id, served: false }));
        card.appendChild(row);
      }
      grid.appendChild(card);
    });
    main.appendChild(grid);

    function action(text, name, data) {
      var b = el('button', 'btn btn-small', text);
      b.type = 'button';
      b.addEventListener('click', function () {
        b.disabled = true;
        DES.act(name, data).then(function (a) {
          b.disabled = false;
          if (!a.success) return DES.message(flash, 'error', a.msg);
          DES.message(flash, 'ok', a.msg);
          setTimeout(load, 600);
        });
      });
      return b;
    }
  }
})();
