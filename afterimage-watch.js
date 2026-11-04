/* ==============================================================
   afterimage-watch.js - watch a live video broadcast (afterimage-watch.html?room=bc-...)

   Anyone logged in with Discord can watch. Broadcasters go live from the
   recorder page (afterimage-recorder.html), step 3.
   ============================================================== */

const AI = window.AI;
const el = AI.el;
const box = document.getElementById('ai-watch');
const room = new URLSearchParams(location.search).get('room') || '';

function stop(title, text) {
  document.getElementById('ai-title').textContent = title;
  document.getElementById('ai-dot').textContent = 'Broadcast';
  box.replaceChildren(el('p', null, text));
}

(async () => {
  const s = await AI.session();
  if (!s.success) return stop('Afterimage isn\'t connected', s.msg || '');
  if (!s.loggedIn) {
    document.getElementById('ai-title').textContent = 'Log in to watch';
    return box.replaceChildren(AI.loginCard('Log in to watch', 'Broadcasts are for Yellonia members. Log in with the Discord account you use in the Yellonia server.'));
  }
  const list = await AI.get('/broadcasts');
  const info = list.success && list.broadcasts.find((b) => b.room === room);
  if (!info) return stop('This broadcast has ended', 'Find what\'s live now on the Afterimage page.');
  document.getElementById('ai-title').textContent = info.title;
  document.getElementById('ai-sub').textContent = info.name + ' · started ' + AI.ago(info.startedAt);
  document.getElementById('ai-dot').textContent = 'Live broadcast';
  document.title = info.title + ' | Afterimage | Yellonia';

  const r = await AI.post('/broadcast/watch', { room });
  if (!r.success) return stop('Can\'t watch this broadcast', r.msg);

  const video = el('video');
  video.autoplay = true; video.playsInline = true; video.controls = true;
  const note = el('p', 'ai-note', 'Connecting…');
  box.replaceChildren(video, note);

  const { Room, RoomEvent, Track } = await import('livekit-client');
  const lk = new Room({ adaptiveStream: true });
  lk.on(RoomEvent.TrackSubscribed, (track) => {
    if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) track.attach(video);
    note.textContent = '';
  });
  lk.on(RoomEvent.ParticipantDisconnected, () => { note.textContent = 'The broadcaster left. This page will show them again if they come back.'; });
  lk.on(RoomEvent.Disconnected, () => { note.textContent = 'Disconnected. Refresh to reconnect.'; });
  lk.on(RoomEvent.AudioPlaybackStatusChanged, () => {
    if (!lk.canPlaybackAudio) {
      const b = el('button', 'button-small', 'Turn sound on'); b.type = 'button';
      b.addEventListener('click', () => { lk.startAudio(); b.remove(); });
      box.appendChild(b);
    }
  });
  try { await lk.connect(r.url, r.token); } catch (e) { note.textContent = 'Couldn\'t connect to the broadcast.'; }
})();
