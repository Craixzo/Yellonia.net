/* ==============================================================
   des/criminal.js - the Criminal Database (search)

   Search in-game subjects by Roblox username or character name, and
   add a new subject. Everything here is IN-GAME roleplay only.
   ============================================================== */
(function () {
  var el = DES.el;
  var main = document.getElementById('criminal');

  DES.requireMember().then(function () { build(); });

  function build() {
    main.textContent = '';

    var head = el('div', 'page-head');
    var titles = el('div');
    titles.appendChild(el('div', 'label', 'Department Database'));
    titles.appendChild(el('h1', null, 'Criminal Database'));
    head.appendChild(titles);
    var addBtn = el('button', 'btn btn-primary', 'Add subject');
    head.appendChild(addBtn);
    main.appendChild(head);

    main.appendChild(roleplayNote());

    /* search bar */
    var bar = el('form', 'toolbar');
    var wrap = el('label', 'tool');
    wrap.appendChild(el('span', 'label', 'Search'));
    var search = el('input');
    search.type = 'search';
    search.placeholder = 'Roblox username or character name';
    wrap.appendChild(search);
    bar.appendChild(wrap);
    var wanted = el('label', 'check');
    wanted.style.alignSelf = 'flex-end';
    wanted.style.marginBottom = '8px';
    var wantedBox = el('input');
    wantedBox.type = 'checkbox';
    wanted.appendChild(wantedBox);
    wanted.appendChild(el('span', null, 'On Most Wanted only'));
    bar.appendChild(wanted);
    main.appendChild(bar);

    var results = el('section', 'panel');
    main.appendChild(results);

    var addPanel = el('section', 'panel');
    addPanel.hidden = true;
    main.appendChild(addPanel);
    buildAddForm(addPanel);

    addBtn.addEventListener('click', function () {
      addPanel.hidden = !addPanel.hidden;
      if (!addPanel.hidden) addPanel.querySelector('input').focus();
    });

    var timer;
    function run() {
      DES.act('subjects', { q: search.value.trim(), wantedOnly: wantedBox.checked }).then(function (answer) {
        results.textContent = '';
        if (!answer.success) { results.appendChild(note(answer.msg)); return; }
        drawResults(results, answer.subjects, search.value.trim());
      });
    }
    search.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 200); });
    wantedBox.addEventListener('change', run);
    bar.addEventListener('submit', function (e) { e.preventDefault(); run(); });
    run();
  }

  function drawResults(panel, subjects, q) {
    var headRow = el('div', 'panel-head');
    headRow.appendChild(el('h2', null, q ? 'Results' : 'Recently updated'));
    headRow.appendChild(el('span', 'label', subjects.length + (subjects.length === 1 ? ' subject' : ' subjects')));
    panel.appendChild(headRow);

    if (!subjects.length) {
      panel.appendChild(note(q ? 'No subjects match. Use "Add subject" to create a record.' : 'No subjects yet.'));
      return;
    }
    var list = el('ul', 'subject-list');
    subjects.forEach(function (s) {
      var li = el('li');
      var link = el('a', 'subject-row');
      link.href = '/des/subject.html?id=' + encodeURIComponent(s.id);
      var av = el('span', 'subject-av');
      av.textContent = s.username.slice(0, 2).toUpperCase();
      link.appendChild(av);
      var text = el('div', 'subject-row-text');
      var name = el('div', 'subject-row-name');
      name.appendChild(el('strong', null, s.username));
      if (s.characterName) name.appendChild(el('span', 'dim', ' · ' + s.characterName));
      text.appendChild(name);
      var tags = el('div', 'subject-row-tags');
      if (s.activeWarrants) tags.appendChild(el('span', 'chip chip-red', s.activeWarrants + (s.activeWarrants === 1 ? ' active warrant' : ' active warrants')));
      s.flags.forEach(function (f) { tags.appendChild(el('span', 'chip chip-amber', f.name)); });
      if (!s.activeWarrants && !s.flags.length) tags.appendChild(el('span', 'dim', 'No active warrants'));
      text.appendChild(tags);
      link.appendChild(text);
      li.appendChild(link);
      list.appendChild(li);
    });
    panel.appendChild(list);
  }

  function buildAddForm(panel) {
    panel.appendChild(headOf('Add a subject'));
    var body = el('div', 'panel-body');
    var form = el('form', 'form');
    form.noValidate = true;

    var username = field(form, 'Roblox username', 'input', 'Must be a real Roblox account. The record is tied to it.');
    username.classList.add('mono');
    var character = field(form, 'Character name (optional)', 'input', 'Their in-character name, if different.');
    var flags = flagPicker(form);
    var notes = field(form, 'Notes (optional)', 'textarea', 'In-game context only.');
    notes.rows = 3;

    var msg = el('p', 'message');
    msg.setAttribute('role', 'status');
    form.appendChild(msg);
    var submit = el('button', 'btn btn-primary', 'Add subject');
    submit.type = 'submit';
    form.appendChild(submit);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!username.value.trim()) return DES.message(msg, 'error', 'Enter a Roblox username.');
      submit.disabled = true;
      DES.message(msg, null, 'Checking the username on Roblox…');
      DES.act('subject-add', {
        username: username.value.trim(), characterName: character.value.trim(),
        flags: flags.filter(function (b) { return b.checked; }).map(function (b) { return b.value; }),
        notes: notes.value.trim(),
      }).then(function (a) {
        submit.disabled = false;
        if (!a.success) return DES.message(msg, 'error', a.msg);
        location.href = '/des/subject.html?id=' + encodeURIComponent(a.id);
      });
    });
    body.appendChild(form);
    panel.appendChild(body);
  }

  /* small builders */
  function headOf(title) { var h = el('div', 'panel-head'); h.appendChild(el('h2', null, title)); return h; }
  function note(text) { var p = el('div', 'panel-body'); p.appendChild(el('p', 'dim', text)); return p; }
  function roleplayNote() {
    var box = el('p', 'rp-note');
    box.textContent = 'In-game records only. Enter Roblox usernames and in-character details, never real-world personal information.';
    return box;
  }
  var n = 0;
  function field(form, labelText, tag, hint) {
    var wrap = el('div', 'field');
    var input = el(tag);
    input.id = 'c' + (++n);
    var label = el('label', null, labelText);
    label.htmlFor = input.id;
    wrap.appendChild(label);
    wrap.appendChild(input);
    if (hint) wrap.appendChild(el('span', 'field-hint', hint));
    form.appendChild(wrap);
    return input;
  }
  function flagPicker(form) {
    var set = el('fieldset', 'role-picker');
    set.appendChild(el('legend', null, 'Flags (optional)'));
    var opts = [['armed', 'Armed'], ['flight-risk', 'Flight risk'], ['violent', 'Violent'], ['gang', 'Gang affiliation']];
    var boxes = opts.map(function (o) {
      var lab = el('label', 'check');
      var box = el('input');
      box.type = 'checkbox';
      box.value = o[0];
      lab.appendChild(box);
      lab.appendChild(el('span', null, o[1]));
      set.appendChild(lab);
      return box;
    });
    form.appendChild(set);
    return boxes;
  }
})();
