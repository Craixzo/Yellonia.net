/* ==============================================================
   afterimage-hub.js - the Afterimage hub (afterimage.html)

   CONTENTS
     1. OPEN A CLIP ...... the code box
     2. LIVE NOW ......... game-data live events + video broadcasts (needs a Discord login)
     3. LATEST CLIPS ..... newest clips (anyone)
   ============================================================== */
(function () {
  var el = AI.el;
  function $(id) { return document.getElementById(id); }

  /* ---------- 1. OPEN A CLIP ---------- */
  $('ai-code-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var code = $('ai-code-input').value.trim().toLowerCase().replace(/[\s_.]+/g, '-').replace(/[^a-z-]/g, '');
    if (!/^[a-z]{2,12}-[a-z]{2,12}-[a-z]{2,12}$/.test(code)) {
      $('ai-code-message').textContent = 'Codes are three words with dashes, like neon-harbor-falcon.';
      $('ai-code-message').className = 'ai-form-message form-message-error';
      return;
    }
    location.href = 'afterimage-view.html?code=' + code;
  });


  /* ---------- 2. LIVE NOW ---------- */
  function liveCard(kicker, title, sub, href, locked, lockedText, isVideo) {
    var card = el('div', 'ai-live-card' + (locked ? ' is-locked' : '') + (isVideo ? ' is-video' : ''));
    var top = el('div', 'ai-live-top');
    top.appendChild(el('span', 'ai-live-dot', locked ? 'Live · locked' : 'Live'));
    top.appendChild(el('span', 'ai-type', kicker));
    card.appendChild(top);
    card.appendChild(el('h3', null, title));
    card.appendChild(el('p', 'ai-meta', sub));
    var foot = el('div', 'ai-live-foot');
    if (locked) foot.appendChild(el('span', 'ai-locked', lockedText));
    else { var a = el('a', 'button-primary ai-watch', 'Watch'); a.href = href; foot.appendChild(a); }
    card.appendChild(foot);
    return card;
  }

  function loadLive() {
    var box = $('ai-live');
    AI.session().then(function (s) {
      if (!s.success) { box.replaceChildren(el('p', 'ai-note', s.msg)); return; }
      if (!s.loggedIn) {
        box.replaceChildren(AI.loginCard('Log in to watch live', 'Live events are for Yellonia members. Log in with the Discord account you use in the Yellonia server.'));
        return;
      }
      Promise.all([AI.get('/live'), AI.get('/broadcasts')]).then(function (r) {
        var live = r[0], casts = r[1], cards = [];
        if (live.success) {
          $('ai-live-note').textContent = 'Live views run ' + live.delay + ' seconds behind the game. You can\'t watch a server you\'re playing in.';
          live.live.forEach(function (l) {
            cards.push(liveCard('Game view', l.event, l.place + ' · ' + l.players + ' players · started ' + AI.ago(l.startedAt),
              'afterimage-view.html?live=' + encodeURIComponent(l.id), l.locked, 'You\'re in this server'));
          });
        }
        if (casts.success) {
          casts.broadcasts.forEach(function (b) {
            cards.push(liveCard('Broadcast', b.title, b.name + ' · started ' + AI.ago(b.startedAt),
              'afterimage-watch.html?room=' + encodeURIComponent(b.room), false, '', true));
          });
        }
        if (!cards.length) cards.push(el('p', 'ai-note', live.success ? 'Nothing is live right now. Officers start a live event in-game with :afterlive on.' : live.msg));
        box.replaceChildren.apply(box, cards);
      });
    });
  }


  /* ---------- 3. LATEST CLIPS ---------- */
  function clipCard(c, base) {
    var a = el('a', 'ai-clip');
    a.href = 'afterimage-view.html?code=' + c.code;
    var thumb;
    if (c.video === 'ready') {
      thumb = el('video', 'ai-clip-thumb');
      thumb.muted = true; thumb.preload = 'metadata'; thumb.playsInline = true;
      thumb.src = base + '/clips/' + c.code + '/video#t=3';
      a.addEventListener('mouseenter', function () { thumb.play().catch(function () {}); });
      a.addEventListener('mouseleave', function () { thumb.pause(); });
    } else {
      thumb = el('div', 'ai-clip-thumb ai-clip-thumb-3d');
      var big = el('strong', null, c.kills + (c.kills === 1 ? ' kill' : ' kills'));
      thumb.appendChild(big);
      if (c.longestKill) thumb.appendChild(el('span', null, 'Longest ' + AI.distance(c.longestKill)));
    }
    a.appendChild(thumb);
    a.appendChild(el('span', 'ai-clip-len', (c.video === 'ready' ? 'VIDEO · ' : '3D · ') + AI.clock(c.duration)));
    var body = el('span', 'ai-clip-body');
    body.appendChild(el('strong', null, c.event || c.place));
    body.appendChild(el('span', 'ai-meta', 'By ' + c.by + ' · ' + AI.ago(c.createdAt)));
    body.appendChild(el('code', null, c.code));
    a.appendChild(body);
    return a;
  }

  function loadClips() {
    var box = $('ai-clips');
    AI.session().then(function (s) {
      if (!s.base) { box.replaceChildren(el('p', 'ai-note', s.msg || 'Afterimage isn\'t connected yet.')); return; }
      AI.get('/clips?limit=24').then(function (r) {
        if (!r.success) { box.replaceChildren(el('p', 'ai-note', r.msg)); return; }
        $('ai-days').textContent = r.days;
        if (!r.clips.length) { box.replaceChildren(el('p', 'ai-note', 'No clips yet. Press F8 in-game to make the first one.')); return; }
        box.replaceChildren.apply(box, r.clips.map(function (c) { return clipCard(c, s.base); }));
      });
    });
  }

  loadLive();
  loadClips();
  setInterval(loadLive, 30000);
})();
