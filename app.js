(() => {
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const KEY_USERS = 'pool8.users', KEY_SESSION = 'pool8.session', KEY_LAST = 'pool8.last';
const START_COINS = 1100000;

const read = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
const users = () => read(KEY_USERS, {});
const fmt = n => n.toLocaleString('es-CO');

/* ================= PANTALLAS ================= */
function show(id) {
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  document.body.dataset.mode = id;
}

let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600);
}

/* ================= FONDO DE PARTÍCULAS ================= */
const cv = $('#fx'), cx = cv.getContext('2d');
let W = 0, H = 0, parts = [];
const PAL = {
  loader: ['90,255,170', '60,200,255', '255,255,255'],
  login: ['255,255,255', '255,220,120', '255,160,60'],
  home: ['255,255,255', '255,220,120', '255,160,60']
};
function resize() {
  W = cv.width = innerWidth; H = cv.height = innerHeight;
  parts = Array.from({ length: Math.min(46, Math.floor(W / 28)) }, () => ({
    x: Math.random() * W, y: Math.random() * H, r: 3 + Math.random() * 22,
    vy: .15 + Math.random() * .55, vx: (Math.random() - .5) * .3, a: .06 + Math.random() * .2, c: Math.floor(Math.random() * 3)
  }));
}
function loop() {
  cx.clearRect(0, 0, W, H);
  const pal = PAL[document.body.dataset.mode] || PAL.login;
  for (const p of parts) {
    p.y -= p.vy; p.x += p.vx;
    if (p.y < -30) { p.y = H + 30; p.x = Math.random() * W; }
    const g = cx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
    g.addColorStop(0, `rgba(${pal[p.c]},${p.a * 1.6})`); g.addColorStop(1, `rgba(${pal[p.c]},0)`);
    cx.fillStyle = g; cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 7); cx.fill();
  }
  requestAnimationFrame(loop);
}
addEventListener('resize', resize); resize(); loop();

/* ================= CARGA ================= */
const STEPS = [
  [0, 'Preparando la mesa...'], [20, 'Puliendo los tacos...'], [42, 'Acomodando las bolas...'],
  [65, 'Cargando tu perfil...'], [88, '¡Todo listo!']
];
const HINTS = [
  'Consejo: usa el efecto para controlar la bola blanca.',
  'La mesa Felizin apuesta 1.000.000 y paga 2.000.000.',
  'Gana partidas para conseguir cajas y piezas de taco.',
  'En las mesas Azul, Roja y Felizin se canta la tronera de la 8.',
  'Sube de nivel con cada partida; ganar da más experiencia.'
];
function runLoader(total = 5200) {
  const fill = $('#fill'), pct = $('#pct'), step = $('#step'), hint = $('#hint'), bar = $('#bar');
  let h = 0; hint.textContent = HINTS[0];
  const hi = setInterval(() => {
    hint.style.opacity = 0;
    setTimeout(() => { h = (h + 1) % HINTS.length; hint.textContent = HINTS[h]; hint.style.opacity = 1; }, 350);
  }, 1700);
  const t0 = performance.now();
  (function frame(now) {
    const t = Math.min(1, (now - t0) / total);
    const p = (t * t * (3 - 2 * t)) * 100; // arranca suave, termina suave
    fill.style.width = p + '%'; pct.textContent = Math.floor(p) + '%'; bar.setAttribute('aria-valuenow', Math.floor(p));
    for (const [at, txt] of STEPS) if (p >= at) step.textContent = txt;
    if (t < 1) requestAnimationFrame(frame);
    else { clearInterval(hi); setTimeout(openLogin, 700); }
  })(t0);
}

/* ================= AVATARES / FOTO DE PERFIL ================= */
const BALL_COL = { 1: '#f5c400', 3: '#e0201c', 5: '#f07a00', 8: '#161616', 9: '#f5c400', 11: '#e0201c' };
function paintAvatar(el, photo, name) {
  el.classList.remove('av-photo', 'av-ball', 'av-stripe', 'av-letter');
  el.style.backgroundImage = ''; el.style.removeProperty('--c'); el.textContent = '';
  if (photo && photo.startsWith('data:image')) { el.classList.add('av-photo'); el.style.backgroundImage = `url(${photo})`; }
  else if (photo && photo.startsWith('ball:')) {
    const n = +photo.slice(5); el.classList.add('av-ball'); if (n > 8) el.classList.add('av-stripe');
    el.style.setProperty('--c', BALL_COL[n] || '#333'); el.textContent = n;
  } else {
    el.classList.add('av-letter'); const nm = (name || '?').trim() || '?';
    let hh = 0; for (const c of nm) hh = (hh * 31 + c.charCodeAt(0)) % 360;
    el.style.setProperty('--h', hh); el.textContent = nm[0].toUpperCase();
  }
}

/** Recorta la imagen al centro (cuadrada) y la reduce a 256x256 para guardarla ligera. */
function fileToAvatar(file) {
  return new Promise((res, rej) => {
    if (!file || !file.type.startsWith('image/')) return rej(new Error('Elige un archivo de imagen.'));
    if (file.size > 8 * 1024 * 1024) return rej(new Error('La imagen pesa más de 8 MB.'));
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const s = Math.min(img.width, img.height), c = document.createElement('canvas');
      c.width = c.height = 256;
      c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 256, 256);
      URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', .88));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('No se pudo leer la imagen.')); };
    img.src = url;
  });
}

/* ================= HASH DE CONTRASEÑA ================= */
async function hash(pw, salt) {
  const data = new TextEncoder().encode(salt + ':' + pw);
  if (window.crypto && crypto.subtle) {
    const b = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  let h = 5381; for (const c of data) h = ((h << 5) + h + c) >>> 0; // respaldo simple
  return 'x' + h.toString(16);
}

/* ================= LOGIN / REGISTRO ================= */
let regPhoto = '';
const tabs = $('.tabs');
function setTab(t) {
  tabs.dataset.on = t;
  $$('.tab').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  $('#formIn').classList.toggle('hidden', t !== 'in'); $('#formUp').classList.toggle('hidden', t !== 'up');
  $('#inErr').textContent = ''; $('#upErr').textContent = '';
}
$$('.tab').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
$$('.eye').forEach(b => b.addEventListener('click', () => {
  const i = $('#' + b.dataset.eye), v = i.type === 'password';
  i.type = v ? 'text' : 'password'; b.textContent = v ? 'Ocultar' : 'Mostrar';
}));
function err(id, msg) {
  const e = $(id); e.textContent = msg; e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake');
}

function openLogin() {
  show('login'); setTab('in');
  const last = localStorage.getItem(KEY_LAST); if (last) $('#inUser').value = last;
  const ses = read(KEY_SESSION, null), u = ses && users()[ses];
  $('#quick').classList.toggle('hidden', !u);
  if (u) { $('#quickName').textContent = u.name; paintAvatar($('#quickAv'), u.photo, u.name); }
  repaintReg();
}
$('#quick').addEventListener('click', () => { const ses = read(KEY_SESSION, null); if (ses && users()[ses]) enter(ses); });

// foto en el formulario de registro
function repaintReg() {
  paintAvatar($('#upAvatar'), regPhoto, $('#upUser').value || '?');
  $$('#presets .avatar').forEach(b => b.classList.toggle('sel', b.dataset.p === regPhoto));
}
[1, 3, 5, 8, 9, 11].forEach(n => {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'avatar'; b.dataset.p = 'ball:' + n;
  b.title = 'Bola ' + n; paintAvatar(b, 'ball:' + n); $('#presets').append(b);
  b.addEventListener('click', () => { regPhoto = 'ball:' + n; repaintReg(); });
});
async function pickFile(file, apply) {
  try { apply(await fileToAvatar(file)); } catch (e) { toast(e.message); }
}
$('#upAvatar').addEventListener('click', () => $('#upFile').click());
$('#upFile').addEventListener('change', e => { pickFile(e.target.files[0], d => { regPhoto = d; repaintReg(); }); e.target.value = ''; });
$('#upRemove').addEventListener('click', () => { regPhoto = ''; repaintReg(); });
$('#upUser').addEventListener('input', repaintReg);
const pick = $('.pick');
['dragenter', 'dragover'].forEach(ev => pick.addEventListener(ev, e => { e.preventDefault(); pick.classList.add('drag'); }));
['dragleave', 'drop'].forEach(ev => pick.addEventListener(ev, e => { e.preventDefault(); pick.classList.remove('drag'); }));
pick.addEventListener('drop', e => pickFile(e.dataTransfer.files[0], d => { regPhoto = d; repaintReg(); }));

$('#formUp').addEventListener('submit', async e => {
  e.preventDefault();
  const name = $('#upUser').value.trim(), p1 = $('#upPass').value, p2 = $('#upPass2').value, all = users(), key = name.toLowerCase();
  if (!/^[A-Za-z0-9_]{3,14}$/.test(name)) return err('#upErr', 'El usuario debe tener 3 a 14 letras, números o _.');
  if (all[key]) return err('#upErr', 'Ese usuario ya existe. Prueba con otro.');
  if (p1.length < 4) return err('#upErr', 'La contraseña debe tener al menos 4 caracteres.');
  if (p1 !== p2) return err('#upErr', 'Las contraseñas no coinciden.');
  const salt = Math.random().toString(36).slice(2);
  all[key] = { name, salt, hash: await hash(p1, salt), photo: regPhoto, created: Date.now(), level: 1, xp: 0, coins: START_COINS, games: 0, wins: 0 }; normalize(all[key]);
  if (!write(KEY_USERS, all)) return err('#upErr', 'No hay espacio para guardar la cuenta. Prueba con otra foto.');
  $('#formUp').reset(); regPhoto = '';
  write(KEY_SESSION, key); localStorage.setItem(KEY_LAST, name);
  enter(key);
});

$('#formIn').addEventListener('submit', async e => {
  e.preventDefault();
  const name = $('#inUser').value.trim(), pw = $('#inPass').value, u = users()[name.toLowerCase()];
  if (!name || !pw) return err('#inErr', 'Escribe tu usuario y contraseña.');
  if (!u || u.hash !== await hash(pw, u.salt)) return err('#inErr', 'Usuario o contraseña incorrectos.');
  if ($('#inRemember').checked) { write(KEY_SESSION, name.toLowerCase()); localStorage.setItem(KEY_LAST, u.name); }
  else localStorage.removeItem(KEY_SESSION);
  $('#inPass').value = '';
  enter(name.toLowerCase());
});

/* ================= CUENTA / PERFIL ================= */
const P8 = window.Pool8;
const PREFIX = 'pool8fz-';
let cur = null, acc = null, game = null, net = null;

function normalize(u) {
  const n = (v, d) => (Number.isFinite(+v) && v !== null && v !== '' && v !== undefined ? +v : d);
  u.level = Math.max(1, n(u.level, 1)); u.xp = n(u.xp, 0); u.coins = n(u.coins, START_COINS);
  u.games = n(u.games, 0); u.wins = n(u.wins, 0); u.streak = n(u.streak, 0); u.best = n(u.best, 0);
  u.cue = n(u.cue, 0); u.earned = n(u.earned, 0); u.lastGift = n(u.lastGift, -1);
  if (!Array.isArray(u.boxes)) u.boxes = [];
  if (!Array.isArray(u.pieces)) u.pieces = [];
  while (u.pieces.length < P8.CUES.length) u.pieces.push(0);
  if (!Array.isArray(u.friends)) u.friends = [];
  if (!u.guest || typeof u.guest !== 'object') u.guest = P8.mkProfile('Jugador 2');
  if (!P8.owned(u, u.cue)) u.cue = 0;
  return u;
}
/** Guarda la cuenta activa al instante en el navegador. */
function save() {
  if (!cur || !acc) return;
  const all = users(); all[cur] = acc;
  if (!write(KEY_USERS, all)) toast('No se pudo guardar (almacenamiento lleno).');
}
try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { }

/* ---------- ventanas ---------- */
function openModal(html) { $('#mbox').innerHTML = html; $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); $('#mbox').innerHTML = ''; }
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function enter(key) {
  const all = users(); if (!all[key]) return;
  cur = key; acc = normalize(all[key]);
  if (acc.coins < 100) { acc.coins = 500; toast('Te regalamos 500 monedas para seguir jugando.'); }
  save(); show('home'); refreshHome();
}
function refreshHome() {
  const u = acc;
  paintAvatar($('#homeAvatar'), u.photo, u.name);
  $('#homeName').textContent = u.name;
  const nd = P8.need(u);
  $('#homeLvl').textContent = `Nv. ${u.level}  ${u.xp}/${nd}`;
  $('#homeCoins').textContent = fmt(u.coins);
  $('#stGames').textContent = u.games; $('#stWins').textContent = u.wins;
  $('#stRate').textContent = (u.games ? Math.round(u.wins * 100 / u.games) : 0) + '%';
  $('#stSince').textContent = new Date(u.created || Date.now()).toLocaleDateString('es-CO', { month: 'short', year: 'numeric' });
  const bn = $('#boxN'); bn.textContent = u.boxes.length; bn.classList.toggle('hidden', !u.boxes.length);
  $('#tables').innerHTML = P8.TABLES.map((t, i) => `
    <div class="tcard ${t.tier === 3 ? 'vip' : ''}" style="--tc:${P8.hex(t.trim)};--tf:${P8.hex(t.felt)};--tw:${P8.hex(t.wood)}">
      <h4>${t.name}</h4><div class="mini"></div>
      <div class="trow"><span>Apuesta</span><b>${fmt(t.bet)}</b></div>
      <div class="trow"><span>Premio</span><b>${fmt(t.bet * 2)}</b></div>
      <div class="trow"><span>Jugadores</span><span>2 (1 vs 1)</span></div>
      <div class="trow"><span>Caja</span><span>${P8.TIER[t.tier]}</span></div>
      <div class="trow"><span>Regla</span><span>${t.call ? '8 cantada' : '8 libre'}</span></div>
      <button class="btn" type="button" data-t="${i}">${u.coins >= t.bet ? 'JUGAR' : 'Faltan monedas'}</button>
    </div>`).join('');
  $('#homeXp').style.width = '0';
  requestAnimationFrame(() => { $('#homeXp').style.width = Math.min(100, u.xp * 100 / nd) + '%'; });
}

/* ---------- elegir modo de juego ---------- */
$('#tables').addEventListener('click', e => {
  const b = e.target.closest('[data-t]'); if (!b) return;
  const i = +b.dataset.t, t = P8.TABLES[i];
  if (acc.coins < t.bet) return toast(`No tienes monedas suficientes para ${t.name} (apuesta ${fmt(t.bet)}).`);
  openModal(`<h2>${t.name}</h2><p>Apuesta ${fmt(t.bet)} · Premio ${fmt(t.bet * 2)}</p>
    <div class="grid2" style="margin-top:12px">
      <button class="opt" id="mLocal">Local<small>2 jugadores en este equipo</small></button>
      <button class="opt" id="mHost">Crear partida online<small>Tu amigo se une con tu usuario</small></button>
    </div>
    <div class="mrow"><button class="btn ghost" id="mJoin">Unirme a un amigo</button><button class="btn ghost" id="mX">Cancelar</button></div>`);
  $('#mLocal').onclick = () => launchGame({ mode: 0, tbl: i, seed: Math.floor(Math.random() * 2 ** 31) });
  $('#mHost').onclick = () => hostOnline(i);
  $('#mJoin').onclick = openOnline;
  $('#mX').onclick = closeModal;
});

/* ---------- partida ---------- */
function launchGame(o) {
  closeModal(); show('play');
  game = new P8.Game({
    canvas: $('#board'), acc, save, mode: o.mode, tbl: o.tbl, seed: o.seed, conn: o.conn || null,
    onEnd: html => {
      setTimeout(endNet, 1500);
      openModal(`<h2>Resultado</h2>${html}<div class="mrow"><button class="btn" id="mOk">Continuar</button></div>`);
      $('#mOk').onclick = () => { closeModal(); if (game) game.destroy(); game = null; enter(cur); };
    },
    onMenu: () => {
      openModal(`<h2>Pausa</h2><p>Si abandonas pierdes la apuesta.</p><div class="mrow"><button class="btn ghost" id="mOut">Abandonar partida</button><button class="btn" id="mGo">Continuar</button></div>`);
      $('#mGo').onclick = closeModal;
      $('#mOut').onclick = () => { closeModal(); game && game.forfeit(); };
    },
    onProfile: (p, editable) => profileModal(p, editable),
    onCue: who => cueModal(game.cueOf[who], i => game.setCue(who, i))
  });
}

function profileModal(p, editable) {
  const rows = [['Nivel', `${p.level} (${p.xp}/${P8.need(p)} XP)`], ['Partidas jugadas', p.games], ['Victorias', p.wins], ['Derrotas', p.games - p.wins],
    ['% de victorias', (p.games ? Math.round(p.wins * 100 / p.games) : 0) + '%'], ['Ganancias totales', fmt(p.earned)], ['Racha actual', p.streak], ['Mejor racha', p.best], ['Taco', P8.CUES[Math.min(p.cue | 0, P8.CUES.length - 1)].name]];
  const canAdd = game && game.mode !== 0 && !editable && !acc.friends.some(f => f.name.toLowerCase() === p.name.toLowerCase());
  openModal(`<h2>${esc(p.name)}</h2>${rows.map(r => `<div class="stat"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('')}
    <div class="mrow">${canAdd ? '<button class="btn ghost" id="mAdd">Agregar amigo</button>' : ''}<button class="btn" id="mX">Cerrar</button></div>`);
  $('#mX').onclick = closeModal;
  const a = $('#mAdd'); if (a) a.onclick = () => { acc.friends.push({ name: p.name }); save(); closeModal(); toast(p.name + ' fue agregado a tus amigos.'); };
}

function cueModal(curIdx, onPick) {
  openModal(`<h2>Tacos</h2>${P8.CUES.map((c, i) => {
    const own = P8.owned(acc, i);
    return `<div class="cuerow ${i === curIdx ? 'sel' : ''} ${own ? '' : 'lock'}" data-i="${i}"><canvas width="300" height="80"></canvas>
      <div><b>${c.name}</b><br>Fuerza ${c.f} · Efecto ${c.e} · Puntería ${c.aim}<br>${own ? (i === curIdx ? 'EQUIPADO' : 'Toca para elegir') : `Bloqueado: ${Math.min(acc.pieces[i], c.need)}/${c.need} piezas (cajas)`}</div></div>`;
  }).join('')}<div class="mrow"><button class="btn" id="mX">Cerrar</button></div>`);
  $$('.cuerow').forEach(r => {
    const i = +r.dataset.i, g = r.querySelector('canvas').getContext('2d');
    P8.drawCueShape(g, 16, 60, 284, 20, P8.CUES[i], 10, 4);
    r.addEventListener('click', () => { if (!P8.owned(acc, i)) return; onPick(i); closeModal(); });
  });
  $('#mX').onclick = closeModal;
}

/* ---------- cajas, regalo, tacos ---------- */
function openBox() {
  if (!acc.boxes.length) return toast('No tienes cajas. ¡Gana partidas para conseguirlas!');
  const tier = acc.boxes.shift(), rg = [[50, 200], [300, 1000], [1500, 5000], [50000, 250000]][tier];
  const c = rg[0] + Math.floor(Math.random() * (rg[1] - rg[0] + 1)); acc.coins += c;
  let h = `<h2>Caja de ${P8.TIER[tier]}</h2><p>+${fmt(c)} monedas</p>`;
  const n = Math.random() * 100 < 55 + tier * 15 ? 1 + (tier >= 2 ? 1 : 0) + (tier === 3 ? 1 : 0) : 0;
  const pool = []; for (let i = 1; i < P8.CUES.length; i++) if (!P8.owned(acc, i)) pool.push(i);
  for (let k = 0; k < n; k++) {
    if (!pool.length) { const x = 500 * (tier + 1); acc.coins += x; h += `<p>+${fmt(x)} monedas extra (ya tienes todos los tacos)</p>`; break; }
    const i = pool[Math.floor(Math.random() * pool.length)]; acc.pieces[i]++;
    h += `<p>+1 pieza del taco <b>${P8.CUES[i].name}</b> (${Math.min(acc.pieces[i], P8.CUES[i].need)}/${P8.CUES[i].need})</p>`;
    if (acc.pieces[i] >= P8.CUES[i].need) { h += '<p><b>¡Taco desbloqueado!</b></p>'; pool.splice(pool.indexOf(i), 1); }
  }
  if (!n) h += '<p>Esta vez no salieron piezas de taco.</p>';
  save(); refreshHome();
  openModal(h + '<div class="mrow"><button class="btn" id="mX">Genial</button></div>'); $('#mX').onclick = closeModal;
}
function dailyGift() {
  const day = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 864e5);
  if (acc.lastGift === day) return toast('Ya recogiste el regalo de hoy. ¡Vuelve mañana!');
  acc.lastGift = day; const c = 5000 + acc.level * 500; acc.coins += c; acc.boxes.push(0); save(); refreshHome();
  toast(`Regalo diario: +${fmt(c)} monedas y una caja de Bronce.`);
}
$('#actBoxes').addEventListener('click', openBox);
$('#actGift').addEventListener('click', dailyGift);
$('#actCues').addEventListener('click', () => cueModal(acc.cue, i => { acc.cue = i; save(); toast('Taco equipado: ' + P8.CUES[i].name); }));
$('#actOnline').addEventListener('click', () => openOnline());

/* ---------- online con amigos (WebRTC vía PeerJS) ---------- */
const pubProfile = () => ({ name: acc.name, level: acc.level, games: acc.games, wins: acc.wins, earned: acc.earned, streak: acc.streak, best: acc.best, cue: acc.cue | 0, xp: acc.xp });
function endNet() { try { net && net.peer && net.peer.destroy(); } catch (e) { } net = null; }
function netFail(msg) { endNet(); openModal(`<h2>Online</h2><p>${msg}</p><div class="mrow"><button class="btn" id="mX">Cerrar</button></div>`); $('#mX').onclick = closeModal; }
const havePeer = () => { if (typeof Peer === 'undefined') { toast('No se pudo cargar el servicio online. Revisa tu internet.'); return false; } return true; };

function openOnline() {
  const draw = () => {
    openModal(`<h2>Jugar con amigos</h2>
      <p>Tu usuario online: <b>${esc(acc.name)}</b>. Tus amigos te encuentran con ese nombre cuando tienes una sala abierta.</p>
      <h3>Crear partida</h3>
      <div class="grid2">${P8.TABLES.map((t, i) => `<button class="opt ${acc.coins >= t.bet ? '' : 'off'}" data-h="${i}">${t.name}<small>Apuesta ${fmt(t.bet)}</small></button>`).join('')}</div>
      <h3>Unirme a un amigo</h3>
      <div style="display:flex;gap:8px"><input id="fJoin" maxlength="14" placeholder="Usuario de tu amigo"><button class="btn" id="bJoin">Unirme</button></div>
      <h3>Mis amigos</h3>
      <div id="fList">${acc.friends.length ? acc.friends.map((f, k) => `<div class="frow"><b>${esc(f.name)}</b><button class="go" data-j="${k}">Unirme</button><button data-d="${k}">Quitar</button></div>`).join('') : '<p>Aún no tienes amigos agregados.</p>'}</div>
      <div style="display:flex;gap:8px;margin-top:10px"><input id="fAdd" maxlength="14" placeholder="Agregar amigo por usuario"><button class="btn ghost" id="bAdd">Agregar</button></div>
      <div class="mrow"><button class="btn" id="mX">Cerrar</button></div>`);
    $('#mX').onclick = closeModal;
    $$('[data-h]').forEach(b => b.onclick = () => hostOnline(+b.dataset.h));
    $('#bJoin').onclick = () => joinOnline($('#fJoin').value);
    $$('[data-j]').forEach(b => b.onclick = () => joinOnline(acc.friends[+b.dataset.j].name));
    $$('[data-d]').forEach(b => b.onclick = () => { acc.friends.splice(+b.dataset.d, 1); save(); draw(); });
    $('#bAdd').onclick = () => {
      const n = $('#fAdd').value.trim();
      if (!/^[A-Za-z0-9_]{3,14}$/.test(n)) return toast('Usuario no válido.');
      if (!acc.friends.some(f => f.name.toLowerCase() === n.toLowerCase())) { acc.friends.push({ name: n }); save(); }
      draw();
    };
  };
  draw();
}

function hostOnline(tbl) {
  if (!havePeer()) return;
  const t = P8.TABLES[tbl];
  if (acc.coins < t.bet) return toast('No tienes monedas suficientes para esa mesa.');
  const seed = Math.floor(Math.random() * 2 ** 31);
  endNet();
  openModal(`<div class="wait"><h2>${t.name}</h2><div class="spin"></div><p id="wMsg">Abriendo sala...</p>
    <p>Pídele a tu amigo que entre a <b>Jugar con amigos</b> y escriba tu usuario:<br><b style="font-size:22px;color:var(--gold)">${esc(acc.name)}</b></p>
    <div class="mrow" style="justify-content:center"><button class="btn ghost" id="mX">Cancelar</button></div></div>`);
  $('#mX').onclick = () => { endNet(); closeModal(); };
  const peer = new Peer(PREFIX + acc.name.toLowerCase()); net = { peer, conn: null };
  peer.on('open', () => { const w = $('#wMsg'); if (w) w.textContent = 'Sala abierta. Esperando a tu amigo...'; });
  peer.on('error', e => netFail(e.type === 'unavailable-id' ? 'Ya tienes una sala abierta (otra pestaña o dispositivo). Ciérrala e inténtalo de nuevo.' : 'Error de conexión (' + e.type + '). Revisa tu internet.'));
  peer.on('connection', conn => {
    if (net.conn || game) { conn.close(); return; }
    net.conn = conn;
    conn.on('open', () => conn.send({ t: 'T', tbl, seed, p: pubProfile() }));
    conn.on('data', d => {
      if (game) return game.onMsg(d);
      if (d && d.t === 'P') { launchGame({ mode: 1, tbl, seed, conn }); game.onMsg(d); }
      else if (d && d.t === 'NC') { toast('Tu amigo no tiene monedas para esa mesa.'); net && (net.conn = null); }
    });
    conn.on('close', () => { if (game) game.onMsg({ t: 'D' }); else if (net) net.conn = null; });
  });
}

function joinOnline(friend) {
  if (!havePeer()) return;
  friend = String(friend || '').trim();
  if (!/^[A-Za-z0-9_]{3,14}$/.test(friend)) return toast('Escribe el usuario de tu amigo.');
  if (friend.toLowerCase() === acc.name.toLowerCase()) return toast('No puedes unirte a ti mismo.');
  endNet();
  openModal(`<div class="wait"><h2>Online</h2><div class="spin"></div><p>Buscando la sala de <b>${esc(friend)}</b>...</p><div class="mrow" style="justify-content:center"><button class="btn ghost" id="mX">Cancelar</button></div></div>`);
  $('#mX').onclick = () => { endNet(); closeModal(); };
  const peer = new Peer(); net = { peer, conn: null }; let to;
  peer.on('error', e => { clearTimeout(to); netFail(e.type === 'peer-unavailable' ? `${esc(friend)} no tiene una sala abierta ahora mismo.` : 'Error de conexión (' + e.type + '). Revisa tu internet.'); });
  peer.on('open', () => {
    const conn = peer.connect(PREFIX + friend.toLowerCase(), { reliable: true }); net.conn = conn;
    to = setTimeout(() => { if (!game) netFail('No se pudo conectar con ' + esc(friend) + '. Puede que su red bloquee la conexión directa.'); }, 15000);
    conn.on('data', d => {
      if (game) return game.onMsg(d);
      if (d && d.t === 'T') {
        clearTimeout(to);
        const t = P8.TABLES[d.tbl];
        if (!t) return netFail('Mesa no válida.');
        if (acc.coins < t.bet) { conn.send({ t: 'NC' }); return netFail(`No tienes monedas para ${t.name} (apuesta ${fmt(t.bet)}).`); }
        launchGame({ mode: 2, tbl: d.tbl, seed: d.seed, conn }); game.onMsg({ t: 'P', p: d.p });
      }
    });
    conn.on('close', () => { clearTimeout(to); if (game) game.onMsg({ t: 'D' }); else netFail('La sala se cerró.'); });
  });
}

/* ---------- foto y sesión ---------- */
function setPhoto(photo) {
  acc.photo = photo; save();
  paintAvatar($('#homeAvatar'), photo, acc.name); toast(photo ? 'Foto de perfil actualizada.' : 'Foto quitada.');
}
const pickHome = () => $('#homeFile').click();
$('#homeAvatar').addEventListener('click', pickHome);
$('#homePhoto').addEventListener('click', pickHome);
$('#homeFile').addEventListener('change', e => { pickFile(e.target.files[0], setPhoto); e.target.value = ''; });
$('#homeLogout').addEventListener('click', () => {
  save(); localStorage.removeItem(KEY_SESSION); cur = null; acc = null; openLogin(); toast('Sesión cerrada.');
});
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal' && !game) closeModal(); });

runLoader();
})();