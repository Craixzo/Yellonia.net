/* ==============================================================
   afterimage-recorder.js - the recorder tab (afterimage-recorder.html)

   1. LINK ......... type the code from F7 > Link recorder in-game
   2. SHARE ........ share the Roblox window; the last ~30-60 seconds are kept in memory
   3. GO LIVE ...... (broadcaster role only) send the same screen to viewers through LiveKit

   On F8 the backend sends { type: "capture", code } down the websocket.
   This page then uploads the piece before and the current piece, and says
   where the last 30 seconds start. Nothing is uploaded at any other time.
   ============================================================== */

const AI = window.AI;
const el = AI.el;
const box = document.getElementById('ai-recorder');

/* ---------- SETTINGS ---------- */
const PIECE_SECONDS = 30;          /* the recorder starts a new piece this often */
const CLIP_SECONDS = 30;
const VIDEO_BITRATE = 4000000;     /* 4 Mbps: sharp at 1080p, about 15 MB per 30 seconds */
const STORE_KEY = 'ai-recorder';

const saved = () => { try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { return null; } };
const save = (v) => { try { v ? localStorage.setItem(STORE_KEY, JSON.stringify(v)) : localStorage.removeItem(STORE_KEY); } catch (e) { /* private mode */ } };

let session = null, link = saved(), stream = null, ws = null, wsTries = 0;
const history = [];   /* recent uploads, newest first */

/* ---------- PAGE ---------- */
function step(n, title, state) {
  const s = el('div', 'ai-step' + (state ? ' is-' + state : ''));
  const h = el('h2');
  h.appendChild(el('span', 'ai-step-num', state === 'done' ? '✓' : String(n)));
  h.appendChild(document.createTextNode(title));
  s.appendChild(h);
  return s;
}
function message() { const m = el('p', 'ai-form-message'); m.setAttribute('role', 'status'); return m; }
function say(m, kind, text) { m.textContent = text; m.className = 'ai-form-message' + (kind ? ' form-message-' + kind : ''); }

function render() {
  const steps = el('div', 'ai-steps');

  /* 1. LINK */
  const s1 = step(1, link ? 'Linked to ' + link.name : 'Link this tab to your Roblox account', link ? 'done' : 'active');
  if (!link) {
    s1.appendChild(el('p', null, 'In-game, press F7 and choose "Link recorder". Type the 6-character code here.'));
    const form = el('form', 'ai-code-form');
    const input = el('input'); input.placeholder = 'ABC123'; input.maxLength = 8; input.autocomplete = 'off'; input.setAttribute('aria-label', 'Code from the game');
    const go = el('button', 'button-primary', 'Link'); go.type = 'submit';
    form.appendChild(input); form.appendChild(go);
    const m = message();
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      go.disabled = true;
      const r = await AI.post('/recorder/pair', { code: input.value.trim() });
      go.disabled = false;
      if (!r.success) return say(m, 'error', r.msg);
      link = { token: r.token, name: r.name };
      save(link);
      connect();
      render();
    });
    s1.appendChild(form); s1.appendChild(m);
  } else {
    const row = el('div', 'ai-row');
    row.appendChild(el('span', 'ai-pill' + (ws && ws.readyState === 1 ? ' is-on' : ''), ws && ws.readyState === 1 ? 'Connected' : 'Connecting…'));
    const un = el('button', 'button-small', 'Unlink'); un.type = 'button';
    un.addEventListener('click', async () => {
      await AI.post('/recorder/unpair', {}, { 'X-Recorder-Token': link.token });
      link = null; save(null);
      if (ws) ws.close();
      render();
    });
    row.appendChild(un);
    s1.appendChild(row);
  }
  steps.appendChild(s1);

  /* 2. SHARE */
  const s2 = step(2, stream ? 'Sharing your screen' : 'Share your Roblox window', stream ? 'done' : (link ? 'active' : null));
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia || !window.MediaRecorder) {
    s2.appendChild(el('p', null, 'This browser can\'t share its screen. Use Chrome, Edge or Opera on a computer. (Phones and tablets can\'t do this.)'));
  } else if (!stream) {
    s2.appendChild(el('p', null, 'Pick the Roblox window. If it shows black, play Roblox in a window instead of fullscreen, or share your entire screen. Tick "Share system audio" if you want game sound.'));
    const go = el('button', 'button-primary', 'Share screen'); go.type = 'button'; go.disabled = !link;
    go.addEventListener('click', share);
    s2.appendChild(go);
  } else {
    s2.appendChild(el('p', null, 'Keep this tab open (it can be behind the game). Press F8 in-game to clip.'));
    const preview = el('video', 'ai-preview'); preview.muted = true; preview.autoplay = true; preview.playsInline = true; preview.srcObject = stream;
    s2.appendChild(preview);
    const row = el('div', 'ai-row'); row.style.marginTop = '12px';
    const stop = el('button', 'button-secondary', 'Stop sharing'); stop.type = 'button';
    stop.addEventListener('click', () => stream.getTracks().forEach((tr) => tr.stop()) || stopSharing());
    row.appendChild(stop);
    s2.appendChild(row);
  }
  if (history.length) {
    const list = el('ul', 'ai-status-list');
    history.forEach((h) => {
      const li = el('li');
      const a = el('a', null); a.href = 'afterimage-view.html?code=' + h.code; a.appendChild(el('code', null, h.code));
      li.appendChild(a);
      li.appendChild(el('span', 'ai-note', h.text));
      list.appendChild(li);
    });
    s2.appendChild(list);
  }
  steps.appendChild(s2);

  /* 3. GO LIVE (broadcasters) */
  if (session && session.canBroadcast) steps.appendChild(broadcastStep());

  box.replaceChildren(steps);
}


/* ---------- RECORDING IN PIECES ---------- */
const MIME = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
let rec = null, chunks = [], pieceStart = 0, pieceTimer = null, previous = null;   /* previous = { blob, seconds } */
let rotating = null;   /* while one piece is closing and the next opening */

function startPiece() {
  chunks = [];
  rec = new MediaRecorder(stream, { mimeType: MIME || undefined, videoBitsPerSecond: VIDEO_BITRATE });
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  rec.start(1000);
  pieceStart = performance.now();
  pieceTimer = setTimeout(() => {
    rotating = stopPiece().then((piece) => { previous = piece; if (stream) startPiece(); rotating = null; });
  }, PIECE_SECONDS * 1000);
}

function stopPiece() {
  clearTimeout(pieceTimer);
  return new Promise((resolve) => {
    if (!rec || rec.state === 'inactive') return resolve(null);
    const mine = chunks, seconds = (performance.now() - pieceStart) / 1000;
    rec.onstop = () => resolve({ blob: new Blob(mine, { type: MIME || 'video/webm' }), seconds });
    rec.stop();
  });
}

async function share() {
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: true });
  } catch (e) {
    stream = null;
    return;
  }
  stream.getVideoTracks()[0].addEventListener('ended', stopSharing);
  previous = null;
  startPiece();
  sendStatus();
  render();
}

function stopSharing() {
  stopPiece();
  rec = null;
  stream = null;
  previous = null;
  stopBroadcast();
  sendStatus();
  render();
}

async function capture(code) {
  if (!stream) return;
  if (rotating) await rotating;
  const before = previous;
  const current = await stopPiece();
  startPiece();                       /* keep recording straight away */
  previous = current;                 /* so a second F8 soon after still has footage */
  if (!current) return;
  const entry = { code, text: 'Uploading video…' };
  history.unshift(entry); history.splice(6);
  render();

  const parts = before ? [before, current] : [current];
  const total = parts.reduce((s, p) => s + p.seconds, 0);
  const offset = Math.max(0, total - CLIP_SECONDS);
  for (let i = 0; i < parts.length; i++) {
    const r = await AI.post('/clips/' + code + '/video/' + (before ? i : 1), parts[i].blob, { 'X-Recorder-Token': link.token });
    if (!r.success) { entry.text = 'Video upload failed: ' + r.msg; return render(); }
  }
  const done = await AI.post('/clips/' + code + '/video-done', { offset }, { 'X-Recorder-Token': link.token });
  entry.text = done.success ? 'Video sent. It\'ll be ready in a few seconds.' : 'Video upload failed: ' + done.msg;
  render();
}


/* ---------- WEBSOCKET: waits for F8 ---------- */
function sendStatus() {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'status', sharing: !!stream }));
}

async function connect() {
  if (!link) return;
  const url = (await AI.session()).base.replace(/^http/, 'ws') + '/ws?kind=recorder&token=' + encodeURIComponent(link.token);
  ws = new WebSocket(url);
  ws.onopen = () => { wsTries = 0; sendStatus(); render(); };
  ws.onmessage = (msg) => {
    const m = JSON.parse(msg.data);
    if (m.type === 'capture') capture(m.code);
    if (m.type === 'error') { link = null; save(null); render(); }
  };
  ws.onclose = () => {
    render();
    if (!link) return;
    wsTries++;
    setTimeout(connect, Math.min(30000, 1000 * 2 ** wsTries));
  };
}


/* ---------- 3. GO LIVE (LiveKit) ---------- */
let room = null, beatTimer = null;

function broadcastStep() {
  const live = !!room;
  const s = step(3, live ? 'You\'re live' : 'Go live (optional)', live ? 'active' : null);
  if (!session.broadcasts) {
    s.appendChild(el('p', null, 'Broadcasts aren\'t switched on yet. A developer needs to add LiveKit on Railway.'));
    return s;
  }
  s.appendChild(el('p', null, live
    ? 'Members can watch you from the Afterimage page. Your clips keep working while you\'re live.'
    : 'Send what you\'re sharing to the Afterimage page so members can watch. Share your screen first.'));
  if (live) {
    const row = el('div', 'ai-row');
    row.appendChild(el('span', 'ai-pill is-live', 'Live'));
    const stop = el('button', 'button-secondary', 'End broadcast'); stop.type = 'button';
    stop.addEventListener('click', stopBroadcast);
    row.appendChild(stop);
    s.appendChild(row);
    return s;
  }
  const row = el('div', 'ai-field-inline');
  const title = el('input'); title.placeholder = 'What are you streaming? e.g. 5th SFG vs Ceres SMU'; title.maxLength = 80; title.setAttribute('aria-label', 'Broadcast title');
  const go = el('button', 'button-primary', 'Go live'); go.type = 'button'; go.disabled = !stream;
  const m = message();
  go.addEventListener('click', async () => {
    go.disabled = true;
    say(m, null, 'Starting…');
    try { await startBroadcast(title.value.trim()); } catch (e) { say(m, 'error', e.message || 'Couldn\'t go live.'); go.disabled = false; return; }
    render();
  });
  row.appendChild(title); row.appendChild(go);
  s.appendChild(row); s.appendChild(m);
  return s;
}

async function startBroadcast(title) {
  const r = await AI.post('/broadcast/start', { title });
  if (!r.success) throw new Error(r.msg);
  const { Room, Track } = await import('livekit-client');
  room = new Room({ adaptiveStream: false, dynacast: true });
  await room.connect(r.url, r.token);
  const video = stream.getVideoTracks()[0];
  await room.localParticipant.publishTrack(video, { source: Track.Source.ScreenShare, name: 'screen', simulcast: true });
  const audio = stream.getAudioTracks()[0];
  if (audio) await room.localParticipant.publishTrack(audio, { source: Track.Source.ScreenShareAudio, name: 'screen-audio' });
  beatTimer = setInterval(() => AI.post('/broadcast/beat'), 20000);
}

function stopBroadcast() {
  if (!room) return;
  clearInterval(beatTimer);
  room.disconnect();
  room = null;
  AI.post('/broadcast/stop');
  render();
}
window.addEventListener('beforeunload', () => { if (room) AI.post('/broadcast/stop'); });


/* ---------- START ---------- */
(async () => {
  session = await AI.session();
  if (!session.success) { box.replaceChildren(el('p', 'ai-note', session.msg)); return; }
  if (!session.loggedIn) { box.replaceChildren(AI.loginCard('Log in to use the recorder', 'Log in with the Discord account you use in the Yellonia server.')); return; }
  const me = await AI.get('/me');
  if (me.success) session = Object.assign({}, session, { broadcasts: me.broadcasts });
  if (link) connect();
  render();
})();
