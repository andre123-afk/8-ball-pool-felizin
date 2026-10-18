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
  all[key] = { name, salt, hash: await hash(p1, salt), photo: regPhoto, created: Date.now(), level: 1, xp: 0, coins: START_COINS, games: 0, wins: 0 };
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

/* ================= PERFIL ================= */
let cur = null;
const TABLES = [
  { n: 'Mesa Verde', bet: 100, box: 'Bronce', rule: '8 libre', c: '#c89a50', f: '#1d8a48', w: '#68391a' },
  { n: 'Mesa Azul', bet: 500, box: 'Plata', rule: '8 cantada', c: '#c7ccd8', f: '#1f66bd', w: '#42342a' },
  { n: 'Mesa Roja', bet: 2000, box: 'Oro', rule: '8 cantada', c: '#f0c040', f: '#a5242f', w: '#2c211f' },
  { n: 'Felizin', bet: 1000000, box: 'Diamante', rule: '8 cantada', c: '#ffe27a', f: '#5c248a', w: '#ac821e', vip: true }
];
function enter(key) {
  cur = key; const u = users()[key]; if (!u) return;
  paintAvatar($('#homeAvatar'), u.photo, u.name);
  $('#homeName').textContent = u.name;
  const need = 80 + u.level * 40;
  $('#homeLvl').textContent = `Nv. ${u.level}  ${u.xp}/${need}`;
  $('#homeCoins').textContent = fmt(u.coins);
  $('#stGames').textContent = u.games; $('#stWins').textContent = u.wins;
  $('#stRate').textContent = (u.games ? Math.round(u.wins * 100 / u.games) : 0) + '%';
  $('#stSince').textContent = new Date(u.created).toLocaleDateString('es-CO', { month: 'short', year: 'numeric' });
  $('#tables').innerHTML = TABLES.map(t => `
    <div class="tcard ${t.vip ? 'vip' : ''}" style="--tc:${t.c};--tf:${t.f};--tw:${t.w}">
      <h4>${t.n}</h4><div class="mini"></div>
      <div class="trow"><span>Apuesta</span><b>${fmt(t.bet)}</b></div>
      <div class="trow"><span>Premio</span><b>${fmt(t.bet * 2)}</b></div>
      <div class="trow"><span>Jugadores</span><span>2 (1 vs 1)</span></div>
      <div class="trow"><span>Caja</span><span>${t.box}</span></div>
      <div class="trow"><span>Regla</span><span>${t.rule}</span></div>
      <button class="btn" type="button" data-t="${t.n}">JUGAR</button>
    </div>`).join('');
  show('home');
  requestAnimationFrame(() => { $('#homeXp').style.width = Math.min(100, u.xp * 100 / need) + '%'; });
}
$('#tables').addEventListener('click', e => {
  const b = e.target.closest('[data-t]'); if (b) toast(`Abre el juego Pool8 (Java) para jugar en ${b.dataset.t}.`);
});
function setPhoto(photo) {
  const all = users(); if (!all[cur]) return;
  all[cur].photo = photo;
  if (!write(KEY_USERS, all)) return toast('No se pudo guardar la foto.');
  paintAvatar($('#homeAvatar'), photo, all[cur].name); toast(photo ? 'Foto de perfil actualizada.' : 'Foto quitada.');
}
const pickHome = () => $('#homeFile').click();
$('#homeAvatar').addEventListener('click', pickHome);
$('#homePhoto').addEventListener('click', pickHome);
$('#homeFile').addEventListener('change', e => { pickFile(e.target.files[0], setPhoto); e.target.value = ''; });
$('#homeLogout').addEventListener('click', () => {
  localStorage.removeItem(KEY_SESSION); cur = null; openLogin(); toast('Sesión cerrada.');
});

runLoader();
})();
