/* 8 Ball Pool · Felizin — motor del juego en canvas (física, tacos, efecto, apuestas, online) */
(() => {
'use strict';

const W = 1180, H = 700, TX = 135, TY = 140, TW = 860, TH = 430, R = 12;
const AIM = 0, MOVE = 1, PLACE = 2, OVER = 3;
const D = Math.PI / 180;

/* ---------- datos ---------- */
const TABLES = [
  { name: 'Mesa Verde', bet: 100, felt: [24, 128, 66], wood: [104, 60, 28], trim: [200, 160, 80], call: false, tier: 0 },
  { name: 'Mesa Azul', bet: 500, felt: [30, 100, 180], wood: [66, 44, 32], trim: [190, 195, 205], call: true, tier: 1 },
  { name: 'Mesa Roja', bet: 2000, felt: [165, 36, 48], wood: [44, 32, 30], trim: [230, 190, 70], call: true, tier: 2 },
  { name: 'Felizin', bet: 1000000, felt: [92, 36, 138], wood: [172, 130, 30], trim: [255, 232, 130], call: true, tier: 3 }
];
const TIER = ['Bronce', 'Plata', 'Oro', 'Diamante'];
const TIERC = [[205, 127, 50], [205, 210, 220], [255, 200, 40], [110, 220, 255]];
const CUES = [
  { name: 'Clásico', a: [238, 202, 142], b: [122, 72, 32], f: 0, e: 0, aim: 0, need: 0 },
  { name: 'Ébano', a: [96, 76, 70], b: [16, 12, 12], f: 1, e: 1, aim: 1, need: 5 },
  { name: 'Fuego', a: [255, 176, 40], b: [190, 30, 10], f: 2, e: 1, aim: 1, need: 6 },
  { name: 'Hielo', a: [224, 246, 255], b: [70, 140, 220], f: 1, e: 3, aim: 2, need: 6 },
  { name: 'Dorado', a: [255, 228, 112], b: [170, 120, 20], f: 3, e: 2, aim: 2, need: 8 },
  { name: 'Galaxia', a: [140, 80, 230], b: [20, 200, 230], f: 4, e: 3, aim: 3, need: 10 }
];
const BC = [[255, 255, 255], [255, 205, 0], [0, 60, 180], [220, 30, 30], [90, 30, 140], [240, 120, 0], [0, 120, 50], [130, 20, 20], [20, 20, 20]];
const CREAM = [250, 250, 244];
const P = [[TX - 4, TY - 4], [TX + TW / 2, TY - 16], [TX + TW + 4, TY - 4], [TX - 4, TY + TH + 4], [TX + TW / 2, TY + TH + 16], [TX + TW + 4, TY + TH + 4]];
const prad = i => (i === 1 || i === 4) ? 22 : 24;
const TRX = 1052, TRW = 34, TRY = TY - 6, TRH = TH + 12;
const SLR = { x: 22, y: TY, w: 40, h: TH }, PMR = { x: 1106, y: TY + 32, w: 40, h: TH - 48 };
const MENUB = { x: 14, y: 14, w: 50, h: 50 }, EMB = { x: 16, y: 616, w: 48, h: 48 }, CUEB = { x: 1089, y: 92, w: 52, h: 52 };
const AV = [{ x: 500, y: 10, w: 58, h: 58 }, { x: 642, y: 10, w: 58, h: 58 }];
const SPX = 1115, SPY = 46, SPR = 30;
const inR = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

/* ---------- utilidades ---------- */
const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const hex = c => '#' + c.map(v => (v | 0).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const WHITE = [255, 255, 255], BLACK = [0, 0, 0];
const fmt = n => Math.round(n).toLocaleString('es-CO');
const F = (s, b) => `${b ? 'bold ' : ''}${s}px "Trebuchet MS",Arial,sans-serif`;
const cleanName = s => { s = String(s || '').replace(/[^A-Za-z0-9_ ]/g, '').trim(); return s.length > 14 ? s.slice(0, 14) : s || 'Jugador'; };

function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle(arr, rnd) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

const need = p => 80 + p.level * 40;
const owned = (acc, i) => i === 0 || (acc.pieces[i] | 0) >= CUES[i].need;
function mkProfile(name) { return { name, level: 1, xp: 0, games: 0, wins: 0, streak: 0, best: 0, cue: 0, earned: 0 }; }
function record(p, won, tbl) {
  p.games++; let gain;
  if (won) { p.wins++; p.streak++; p.best = Math.max(p.best, p.streak); gain = 100 + tbl * 50 + Math.min(p.streak, 5) * 10; }
  else { p.streak = 0; gain = 35; }
  p.xp += gain; let ups = 0;
  while (p.xp >= need(p)) { p.xp -= need(p); p.level++; ups++; }
  return { gain, ups };
}

/* ---------- dibujo ---------- */
function circ(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); }
function rr(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }
function lg(g, x0, y0, x1, y1, stops) { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; }
function txt(g, s, x, y, font, color, align = 0) {
  g.font = font; g.textAlign = align === 1 ? 'center' : align === 2 ? 'right' : 'left';
  g.fillStyle = 'rgba(0,0,0,.47)'; g.fillText(s, x + 1, y + 1); g.fillStyle = color; g.fillText(s, x, y);
}
function arcJ(g, x, y, w, h, s, e) { g.beginPath(); g.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, -s * D, -(s + e) * D, e > 0); }

function drawBall(g, x, y, id, r) {
  g.fillStyle = 'rgba(0,0,0,.33)'; circ(g, x + r * .22, y + r * .32, r); g.fill();
  const c = id === 0 ? CREAM : BC[id > 8 ? id - 8 : id];
  g.fillStyle = rgb(id > 8 || id === 0 ? CREAM : c); circ(g, x, y, r); g.fill();
  if (id > 8) { g.save(); circ(g, x, y, r); g.clip(); g.fillStyle = rgb(c); g.fillRect(x - r, y - r * .58, 2 * r + 1, r * 1.16); g.restore(); }
  if (id > 0) {
    g.fillStyle = rgb(CREAM); circ(g, x, y, r * .48); g.fill();
    g.fillStyle = '#000'; g.font = `bold ${Math.max(6, Math.round(r * .72))}px Arial,sans-serif`; g.textAlign = 'center';
    g.fillText('' + id, x, y + r * .27);
  }
  const gr = g.createRadialGradient(x - r * .35, y - r * .4, 0, x - r * .35, y - r * .4, r * 1.55);
  gr.addColorStop(0, 'rgba(255,255,255,.75)'); gr.addColorStop(.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,.47)');
  g.fillStyle = gr; circ(g, x, y, r); g.fill();
}

function drawCueShape(g, bx, by, tx, ty, c, wb, wt) {
  const dx = tx - bx, dy = ty - by, len = Math.hypot(dx, dy); if (!len) return;
  const ux = dx / len, uy = dy / len, px = -uy, py = ux;
  g.beginPath(); g.moveTo(bx + px * wb, by + py * wb); g.lineTo(tx + px * wt, ty + py * wt); g.lineTo(tx - px * wt, ty - py * wt); g.lineTo(bx - px * wb, by - py * wb); g.closePath();
  g.fillStyle = lg(g, tx, ty, bx, by, [[0, rgb(c.a)], [1, rgb(c.b)]]); g.fill();
  g.lineWidth = 2; g.lineCap = 'butt';
  for (let k = 0; k < 3; k++) {
    const t = .10 + k * .035, w = wb + (wt - wb) * t, cx = bx + dx * t, cy = by + dy * t;
    g.strokeStyle = k === 1 ? '#fff' : rgb(mix(c.a, WHITE, .4)); g.beginPath(); g.moveTo(cx + px * w, cy + py * w); g.lineTo(cx - px * w, cy - py * w); g.stroke();
  }
  g.strokeStyle = 'rgba(255,255,255,.27)'; g.lineWidth = 1; g.beginPath(); g.moveTo(bx + px * wb * .45, by + py * wb * .45); g.lineTo(tx + px * wt * .45, ty + py * wt * .45); g.stroke();
  g.lineWidth = wt * 2 + .5;
  g.strokeStyle = '#f5f5eb'; g.beginPath(); g.moveTo(bx + dx * .955, by + dy * .955); g.lineTo(bx + dx * .985, by + dy * .985); g.stroke();
  g.strokeStyle = '#3c8cdc'; g.beginPath(); g.moveTo(bx + dx * .985, by + dy * .985); g.lineTo(tx, ty); g.stroke();
}

function star(g, cx, cy, r, lvl) {
  g.beginPath();
  for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr_ = k % 2 === 0 ? r : r * .48, x = cx + Math.cos(a) * rr_, y = cy + Math.sin(a) * rr_; k ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.closePath(); g.fillStyle = lg(g, cx, cy - r, cx, cy + r, [[0, 'rgb(255,236,120)'], [1, 'rgb(220,150,20)']]); g.fill();
  g.strokeStyle = 'rgb(90,55,0)'; g.lineWidth = 1.2; g.stroke();
  txt(g, '' + lvl, cx, cy + r * .32, F(Math.max(8, r * .8), 1), '#fff', 1);
}
function drawAvatar(g, x, y, s, p) {
  let h = 0; for (const ch of p.name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  g.fillStyle = lg(g, x, y, x, y + s, [[0, `hsl(${h},75%,64%)`], [1, `hsl(${h},70%,30%)`]]); rr(g, x, y, s, s, s / 4); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.82)'; g.lineWidth = 2; g.stroke();
  txt(g, p.name.slice(0, 1).toUpperCase(), x + s / 2, y + s / 2 + s / 6, F(s * 5 / 9, 1), '#fff', 1);
  star(g, x + s - 4, y + s - 4, Math.max(10, s * .24), p.level);
}
function diamond(g, cx, cy) {
  g.beginPath(); g.moveTo(cx, cy - 5.5); g.lineTo(cx + 4, cy); g.lineTo(cx, cy + 5.5); g.lineTo(cx - 4, cy); g.closePath();
  g.fillStyle = lg(g, cx, cy - 5, cx, cy + 5, [[0, 'rgb(255,252,235)'], [1, 'rgb(190,180,150)']]); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.47)'; g.lineWidth = 1; g.stroke();
}
function drawFace(g, cx, cy, r, k) {
  const base = k === 3 ? [240, 90, 60] : k === 4 ? [120, 170, 240] : k === 5 ? [40, 110, 220] : [255, 210, 50];
  g.fillStyle = lg(g, cx, cy - r, cx, cy + r, [[0, rgb(mix(base, WHITE, .5))], [1, rgb(mix(base, BLACK, .25))]]); circ(g, cx, cy, r); g.fill();
  g.strokeStyle = 'rgb(60,35,0)'; g.fillStyle = 'rgb(60,35,0)'; g.lineWidth = r * .09; g.lineCap = 'round'; circ(g, cx, cy, r); g.stroke();
  const ex = r * .38, ey = r * .2, er = r * .1, dot = (x, y) => { circ(g, x, y, er); g.fill(); };
  switch (k) {
    case 0: dot(cx - ex, cy - ey); dot(cx + ex, cy - ey); arcJ(g, cx - r * .5, cy - r * .3, r, r * .9, 200, 140); g.stroke(); break;
    case 1: arcJ(g, cx - ex - er * 1.4, cy - ey - er, er * 2.8, er * 2, 0, 180); g.stroke(); arcJ(g, cx + ex - er * 1.4, cy - ey - er, er * 2.8, er * 2, 0, 180); g.stroke();
      g.fillStyle = 'rgb(120,20,20)'; arcJ(g, cx - r * .5, cy - r * .1, r, r * .75, 180, 180); g.closePath(); g.fill(); break;
    case 2: g.fillStyle = '#000'; rr(g, cx - r * .72, cy - r * .32, r * .6, r * .36, 6); g.fill(); rr(g, cx + r * .12, cy - r * .32, r * .6, r * .36, 6); g.fill();
      g.strokeStyle = '#000'; g.lineWidth = r * .08; g.beginPath(); g.moveTo(cx - r * .12, cy - r * .22); g.lineTo(cx + r * .12, cy - r * .22); g.stroke();
      g.strokeStyle = 'rgb(60,35,0)'; arcJ(g, cx - r * .45, cy - r * .1, r * .9, r * .7, 200, 140); g.stroke(); break;
    case 3: dot(cx - ex, cy - ey * .4); dot(cx + ex, cy - ey * .4);
      g.beginPath(); g.moveTo(cx - ex - r * .2, cy - r * .5); g.lineTo(cx - ex + r * .15, cy - r * .3); g.moveTo(cx + ex + r * .2, cy - r * .5); g.lineTo(cx + ex - r * .15, cy - r * .3); g.stroke();
      arcJ(g, cx - r * .4, cy + r * .2, r * .8, r * .5, 20, 140); g.stroke(); break;
    case 4: dot(cx - ex, cy - ey); dot(cx + ex, cy - ey); arcJ(g, cx - r * .4, cy + r * .25, r * .8, r * .5, 20, 140); g.stroke();
      g.fillStyle = 'rgb(80,160,255)'; g.beginPath(); g.ellipse(cx + ex, cy + r * .15, er * .6, er, 0, 0, Math.PI * 2); g.fill(); break;
    default: txt(g, 'GG', cx, cy + r * .3, F(r * .95, 1), '#fff', 1);
  }
}
function drawFlame(g, x, y, s) {
  g.beginPath(); g.moveTo(x, y - s); g.bezierCurveTo(x + s * .9, y - s * .3, x + s * .8, y + s * .8, x, y + s * .9);
  g.bezierCurveTo(x - s * .8, y + s * .8, x - s * .9, y - s * .1, x - s * .2, y - s * .5); g.bezierCurveTo(x - s * .1, y - s * .2, x + s * .1, y - s * .4, x, y - s); g.closePath();
  g.fillStyle = lg(g, x, y - s, x, y + s, [[0, 'rgb(255,230,80)'], [1, 'rgb(240,60,10)']]); g.fill();
}

/* ---------- fondo (mesa) ---------- */
function buildBg(t, tblIdx) {
  const cvs = document.createElement('canvas'); cvs.width = W; cvs.height = H; const g = cvs.getContext('2d');
  g.fillStyle = lg(g, 0, 0, 0, H, [[0, 'rgb(24,34,58)'], [1, 'rgb(8,12,22)']]); g.fillRect(0, 0, W, H);
  g.fillStyle = lg(g, 0, 0, 0, 86, [[0, 'rgb(36,50,84)'], [1, 'rgb(16,22,40)']]); g.fillRect(0, 0, W, 86);
  g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 86, W, 5);
  const fx = TX - 46, fy = TY - 46, fw = TW + 92, fh = TH + 92;
  g.fillStyle = 'rgba(0,0,0,.47)'; rr(g, fx + 6, fy + 10, fw, fh, 46); g.fill();
  g.fillStyle = lg(g, fx, fy, fx, fy + fh, [[0, rgb(mix(t.wood, WHITE, .2))], [1, rgb(mix(t.wood, BLACK, .35))]]); rr(g, fx, fy, fw, fh, 46); g.fill();
  g.save(); rr(g, fx, fy, fw, fh, 46); g.clip();
  const rnd = mulberry(tblIdx * 31 + 5);
  for (let i = 0; i < 260; i++) {
    const y = fy + rnd() * fh, x = fx + rnd() * fw;
    g.strokeStyle = rnd() < .25 ? `rgba(255,255,255,${(10 + rnd() * 14) / 255})` : `rgba(0,0,0,${(8 + rnd() * 22) / 255})`;
    g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 60 + rnd() * 240, y + rnd() * 5 - 2); g.stroke();
  }
  g.restore();
  g.strokeStyle = 'rgba(255,255,255,.31)'; g.lineWidth = 2; rr(g, fx + 1, fy + 1, fw - 2, fh - 2, 46); g.stroke();
  g.fillStyle = 'rgba(0,0,0,.63)'; rr(g, TX - 21, TY - 21, TW + 42, TH + 42, 10); g.fill();
  g.strokeStyle = rgb(t.trim); g.lineWidth = 2.5; g.stroke();
  const rg = g.createRadialGradient(TX + TW / 2, TY + TH / 2, 0, TX + TW / 2, TY + TH / 2, TW * .56);
  rg.addColorStop(0, rgb(mix(t.felt, WHITE, .24))); rg.addColorStop(.65, rgb(t.felt)); rg.addColorStop(1, rgb(mix(t.felt, BLACK, .3)));
  g.fillStyle = rg; g.fillRect(TX - 18, TY - 18, TW + 36, TH + 36);
  const nr = mulberry(99);
  for (let i = 0; i < 32000; i++) { const a = (6 + nr() * 14) / 255; g.fillStyle = nr() < .5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`; g.fillRect(TX + nr() * TW, TY + nr() * TH, 1, 1); }
  g.font = 'italic bold 40px Georgia,serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.13)'; g.fillText(t.name.toUpperCase(), TX + TW * .125, TY + TH / 2 + 14);
  g.strokeStyle = 'rgba(255,255,255,.24)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(TX + TW / 4, TY); g.lineTo(TX + TW / 4, TY + TH); g.stroke();
  arcJ(g, TX + TW / 4 - 70, TY + TH / 2 - 70, 140, 140, -90, -180); g.stroke();
  for (const f of [.25, .5, .72]) { g.fillStyle = 'rgba(255,255,255,.43)'; circ(g, TX + TW * f, TY + TH / 2, 3); g.fill(); }
  const nose = mix(t.felt, WHITE, .12), base = mix(t.felt, BLACK, .55);
  const hs = [[TX + 30, TX + TW / 2 - 26], [TX + TW / 2 + 26, TX + TW - 30]];
  for (const h of hs) {
    g.fillStyle = lg(g, 0, TY, 0, TY - 16, [[0, rgb(nose)], [1, rgb(base)]]); g.beginPath(); g.moveTo(h[0], TY); g.lineTo(h[1], TY); g.lineTo(h[1] - 16, TY - 16); g.lineTo(h[0] + 16, TY - 16); g.closePath(); g.fill();
    g.fillStyle = lg(g, 0, TY + TH, 0, TY + TH + 16, [[0, rgb(nose)], [1, rgb(base)]]); g.beginPath(); g.moveTo(h[0], TY + TH); g.lineTo(h[1], TY + TH); g.lineTo(h[1] - 16, TY + TH + 16); g.lineTo(h[0] + 16, TY + TH + 16); g.closePath(); g.fill();
  }
  g.fillStyle = lg(g, TX, 0, TX - 16, 0, [[0, rgb(nose)], [1, rgb(base)]]); g.beginPath(); g.moveTo(TX, TY + 30); g.lineTo(TX, TY + TH - 30); g.lineTo(TX - 16, TY + TH - 46); g.lineTo(TX - 16, TY + 46); g.closePath(); g.fill();
  g.fillStyle = lg(g, TX + TW, 0, TX + TW + 16, 0, [[0, rgb(nose)], [1, rgb(base)]]); g.beginPath(); g.moveTo(TX + TW, TY + 30); g.lineTo(TX + TW, TY + TH - 30); g.lineTo(TX + TW + 16, TY + TH - 46); g.lineTo(TX + TW + 16, TY + 46); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.2)'; g.lineWidth = 1.2;
  for (const h of hs) { g.beginPath(); g.moveTo(h[0], TY); g.lineTo(h[1], TY); g.moveTo(h[0], TY + TH); g.lineTo(h[1], TY + TH); g.stroke(); }
  g.beginPath(); g.moveTo(TX, TY + 30); g.lineTo(TX, TY + TH - 30); g.moveTo(TX + TW, TY + 30); g.lineTo(TX + TW, TY + TH - 30); g.stroke();
  for (let i = 0; i < 6; i++) {
    const r = prad(i), px = P[i][0], py = P[i][1];
    g.fillStyle = 'rgba(0,0,0,.43)'; circ(g, px, py + 3, r + 8); g.fill();
    g.fillStyle = lg(g, px, py - r, px, py + r, [[0, 'rgb(90,60,38)'], [1, 'rgb(28,18,12)']]); circ(g, px, py, r + 6); g.fill();
    g.strokeStyle = rgb(t.trim); g.lineWidth = 2; g.stroke();
    const pg = g.createRadialGradient(px, py + 3, 0, px, py + 3, r + 2); pg.addColorStop(0, '#000'); pg.addColorStop(.7, 'rgb(4,4,6)'); pg.addColorStop(1, 'rgb(40,34,30)');
    g.fillStyle = pg; circ(g, px, py, r); g.fill();
  }
  for (let k = 1; k < 8; k++) if (k !== 4) { diamond(g, TX + TW * k / 8, TY - 33); diamond(g, TX + TW * k / 8, TY + TH + 33); }
  for (let k = 1; k < 4; k++) { diamond(g, TX - 33, TY + TH * k / 4); diamond(g, TX + TW + 33, TY + TH * k / 4); }
  g.fillStyle = lg(g, TX + TW + 38, 0, TRX + 6, 0, [[0, 'rgb(40,42,50)'], [1, 'rgb(150,155,165)']]); g.fillRect(TX + TW + 38, TRY + 14, TRX - (TX + TW + 38) + 6, 24);
  g.fillStyle = lg(g, TRX, 0, TRX + TRW, 0, [[0, 'rgb(170,175,185)'], [1, 'rgb(60,64,74)']]); rr(g, TRX, TRY, TRW, TRH, 24); g.fill();
  g.fillStyle = lg(g, TRX, 0, TRX + TRW, 0, [[0, 'rgb(8,8,12)'], [1, 'rgb(44,46,54)']]); rr(g, TRX + 5, TRY + 5, TRW - 10, TRH - 10, 18); g.fill();
  g.fillStyle = lg(g, PMR.x, 0, PMR.x + PMR.w, 0, [[0, 'rgb(20,22,28)'], [1, 'rgb(60,62,70)']]); rr(g, PMR.x, PMR.y, PMR.w, PMR.h, 14); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.31)'; g.lineWidth = 1; g.stroke();
  for (let y = PMR.y + 10; y < PMR.y + PMR.h - 8; y += 8) { const len = ((y - PMR.y) / 8 | 0) % 5 === 0 ? 24 : 12; g.strokeStyle = 'rgba(255,255,255,.24)'; g.beginPath(); g.moveTo(PMR.x + 8, y); g.lineTo(PMR.x + 8 + len, y); g.stroke(); }
  g.fillStyle = lg(g, SLR.x, 0, SLR.x + SLR.w, 0, [[0, 'rgb(18,20,26)'], [1, 'rgb(58,60,68)']]); rr(g, SLR.x, SLR.y, SLR.w, SLR.h, 14); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.31)'; g.stroke();
  return cvs;
}

/* ================= JUEGO ================= */
class Ball { constructor(i) { this.id = i; this.x = 0; this.y = 0; this.vx = 0; this.vy = 0; this.sp = 0; this.ss = 0; this.alive = true; } }
const grpOf = id => id === 8 ? -2 : id < 8 ? 0 : 1;

class Game {
  constructor(o) {
    this.o = o; this.cv = o.canvas; this.g = this.cv.getContext('2d');
    this.mode = o.mode; this.tbl = o.tbl; this.T = TABLES[o.tbl]; this.me = o.mode === 2 ? 1 : 0;
    this.acc = o.acc; this.conn = o.conn || null;
    this.pl = [null, null]; this.pl[this.me] = this.acc;
    if (o.mode === 0) this.pl[1] = this.acc.guest; else this.pl[1 - this.me] = mkProfile('Rival');
    this.cueOf = [this.pl[0].cue | 0, this.pl[1].cue | 0];
    this.emote = [-1, -1]; this.emoteT = [0, 0];
    this.balls = Array.from({ length: 16 }, (_, i) => new Ball(i));
    this.potted = []; this.tray = [];
    this.turn = 0; this.state = AIM; this.firstHit = -1; this.pocket8 = -1; this.called = -1; this.grp = [-1, -1];
    this.clearBefore = false; this.dragging = false; this.spinDrag = false; this.emoteOpen = false; this.broke = false;
    this.ang = 0; this.power = 0; this.sx = 0; this.sy = 0; this.dx0 = 0; this.dy0 = 0; this.mx = 0; this.my = 0;
    this.msg = '¡Rompe la mesa!'; this.shooter = 0; this.pendingEnd = null; this.idle = 0; this.acc16 = 0; this.last = 0; this.dead = false;

    const b0 = this.balls[0]; b0.x = TX + TW * .25; b0.y = TY + TH / 2;
    const rnd = mulberry(o.seed);
    const sol = shuffle([1, 2, 3, 4, 5, 6, 7], rnd), str = shuffle([9, 10, 11, 12, 13, 14, 15], rnd);
    const order = new Array(15).fill(0);
    order[10] = sol.shift(); order[14] = str.shift(); order[4] = 8;
    const rest = shuffle(sol.concat(str), rnd); let ri = 0;
    for (let i = 0; i < 15; i++) if (!order[i]) order[i] = rest[ri++];
    let n = 0;
    for (let r = 0; r < 5; r++) for (let k = 0; k <= r; k++) {
      const b = this.balls[order[n++]];
      b.x = TX + TW * .72 + r * (2 * R * .866 + .3); b.y = TY + TH / 2 + (k - r / 2) * (2 * R + .3);
    }
    this.acc.coins = Math.max(0, this.acc.coins - this.T.bet); o.save();
    this.bg = buildBg(this.T, this.tbl);
    this.bind();
    if (this.conn) {
      this.send({ t: 'P', p: this.pubProfile() });
    }
    this.raf = requestAnimationFrame(t => this.frame(t));
  }

  pubProfile() { const a = this.acc; return { name: a.name, level: a.level, games: a.games, wins: a.wins, earned: a.earned, streak: a.streak, best: a.best, cue: a.cue | 0, xp: a.xp }; }
  send(m) { try { if (this.conn && this.conn.open) this.conn.send(m); } catch (e) { } }

  /* ---------- reglas ---------- */
  remaining(g) { let c = 0; for (let i = 1; i < 16; i++) if (this.balls[i].alive && grpOf(i) === g) c++; return c; }
  mine() { return this.mode === 0 || this.turn === this.me; }
  needCall() { return this.T.call && this.grp[this.turn] >= 0 && this.remaining(this.grp[this.turn]) === 0 && this.balls[8].alive; }
  moving() { return this.balls.some(b => b.alive && (b.vx !== 0 || b.vy !== 0)); }

  mouth(b) {
    for (let i = 0; i < 6; i++) {
      const d = Math.hypot(b.x - P[i][0], b.y - P[i][1]);
      if (d < (i === 1 || i === 4 ? 38 : 40) && (P[i][0] - b.x) * b.vx + (P[i][1] - b.y) * b.vy > 0) return true;
    }
    return false;
  }
  step() {
    const balls = this.balls;
    for (let s = 0; s < 4; s++) {
      for (const b of balls) if (b.alive) { b.x += b.vx; b.y += b.vy; }
      for (const b of balls) {
        if (!b.alive) continue;
        for (let i = 0; i < 6; i++) if (Math.hypot(b.x - P[i][0], b.y - P[i][1]) < prad(i)) { b.alive = false; b.vx = b.vy = 0; this.potted.push(b.id); if (b.id === 8) this.pocket8 = i; break; }
        if (!b.alive || this.mouth(b)) continue;
        if (b.x < TX + R) { b.x = TX + R; b.vx = Math.abs(b.vx) * .8; b.vy += b.ss * b.vx * .15; b.ss *= .6; }
        if (b.x > TX + TW - R) { b.x = TX + TW - R; b.vx = -Math.abs(b.vx) * .8; b.vy -= b.ss * b.vx * .15; b.ss *= .6; }
        if (b.y < TY + R) { b.y = TY + R; b.vy = Math.abs(b.vy) * .8; b.vx -= b.ss * b.vy * .15; b.ss *= .6; }
        if (b.y > TY + TH - R) { b.y = TY + TH - R; b.vy = -Math.abs(b.vy) * .8; b.vx += b.ss * b.vy * .15; b.ss *= .6; }
      }
      for (let i = 0; i < 16; i++) for (let j = i + 1; j < 16; j++) {
        const a = balls[i], b = balls[j]; if (!a.alive || !b.alive) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d >= 2 * R || d === 0) continue;
        const nx = dx / d, ny = dy / d, ov = (2 * R - d) / 2;
        a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
        const rv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny; if (rv <= 0) continue;
        const c = a.id === 0 ? a : b.id === 0 ? b : null;
        const pvx = c ? c.vx : 0, pvy = c ? c.vy : 0, imp = rv * .985;
        a.vx -= imp * nx; a.vy -= imp * ny; b.vx += imp * nx; b.vy += imp * ny;
        if (c) {
          if (this.firstHit < 0) this.firstHit = c === a ? b.id : a.id;
          const sp0 = Math.hypot(pvx, pvy);
          if (sp0 > 0) { c.vx += pvx / sp0 * c.sp * rv * .5; c.vy += pvy / sp0 * c.sp * rv * .5; }
          c.sp = 0;
        }
      }
      for (const b of balls) {
        if (!b.alive) continue;
        const sp = Math.hypot(b.vx, b.vy); if (sp === 0) continue;
        const n = sp * .9995 - .012;
        if (n < .05) { b.vx = b.vy = 0; } else { b.vx *= n / sp; b.vy *= n / sp; }
      }
    }
    balls[0].sp *= .995; balls[0].ss *= .995;
  }

  shoot(a, pw, ssx, ssy, call, cx, cy) {
    const c = this.balls[0];
    c.alive = true; c.x = cx; c.y = cy;
    c.vx = Math.cos(a) * pw * 8; c.vy = Math.sin(a) * pw * 8;
    c.sp = -ssy; c.ss = ssx; this.called = call; this.broke = true;
    this.clearBefore = this.grp[this.turn] >= 0 && this.remaining(this.grp[this.turn]) === 0;
    this.potted = []; this.firstHit = -1; this.pocket8 = -1; this.state = MOVE; this.msg = '';
    this.shooter = this.turn; this.pendingEnd = null; this.idle = 0;
  }

  endShot() {
    const m = this.turn, cueIn = this.potted.includes(0), p8 = this.potted.includes(8);
    for (const id of this.potted) if (id > 0 && id !== 8) this.tray.push(id);
    const fh = this.firstHit;
    const foul = cueIn || fh < 0 || (this.clearBefore ? fh !== 8 : (fh === 8 || (this.grp[m] >= 0 && grpOf(fh) !== this.grp[m])));
    if (p8) { this.finish(this.clearBefore && !cueIn && (!this.T.call || this.pocket8 === this.called) ? m : 1 - m); return; }
    if (this.grp[m] < 0 && !foul) for (const id of this.potted) if (id > 0) { this.grp[m] = grpOf(id); this.grp[1 - m] = 1 - this.grp[m]; break; }
    let own = false;
    for (const id of this.potted) if (id > 0 && this.grp[m] >= 0 && grpOf(id) === this.grp[m]) own = true;
    this.called = -1; this.state = AIM;
    if (foul) {
      this.turn = 1 - this.turn; this.state = PLACE; this.msg = '¡Falta! Bola en mano para el jugador ' + (this.turn + 1);
      const c = this.balls[0]; c.alive = true; c.vx = c.vy = 0; c.x = TX + TW * .25; c.y = TY + TH / 2;
    } else if (!own) { this.turn = 1 - this.turn; this.msg = ''; }
    else this.msg = '¡Bien! Sigues tirando';
    if (this.needCall() && this.mine()) this.msg = 'Elige la tronera para la bola 8 (toca una tronera)';
  }

  finish(winner, note) {
    if (this.state === OVER) return;
    this.state = OVER; this.stop();
    const t = this.T, a = this.acc;
    const iWon = this.mode === 0 ? winner === 0 : winner === this.me;
    const rec = record(a, iWon, this.tbl);
    let h = '';
    if (note) h += `<p class="rnote">${note}</p>`;
    if (this.mode === 0) h += `<h2>¡Gana el jugador ${winner + 1}!</h2>`;
    else h += iWon ? '<h2 class="win">¡HAS GANADO!</h2>' : '<h2 class="lose">Has perdido</h2>';
    if (iWon) {
      a.coins += t.bet * 2; a.earned += t.bet; a.boxes.push(t.tier);
      h += `<p>+${fmt(t.bet * 2)} monedas (ganancia neta ${fmt(t.bet)})<br>Caja de ${TIER[t.tier]} conseguida</p>`;
    } else h += `<p>Pierdes ${fmt(t.bet)} monedas</p>`;
    h += `<p>Experiencia: +${rec.gain} XP</p>`;
    if (rec.ups > 0) h += `<p><b>¡Subes al nivel ${a.level}!</b></p>`;
    if (iWon && a.streak >= 2) h += `<p>Racha de ${a.streak} victorias</p>`;
    if (this.mode === 0) {
      const gr = record(this.acc.guest, winner === 1, this.tbl);
      h += `<p>${this.acc.guest.name}: ${winner === 1 ? '+victoria' : '+partida'}${gr.ups > 0 ? ', ¡nivel ' + this.acc.guest.level + '!' : ''}</p>`;
    }
    h += `<p>Monedas: <b>${fmt(a.coins)}</b></p>`;
    this.o.save();
    setTimeout(() => { try { this.conn && this.conn.close(); } catch (e) { } }, 600);
    this.o.onEnd(h);
  }

  forfeit() {
    if (this.state === OVER) return;
    this.send({ t: 'F' });
    this.finish(this.mode === 0 ? 1 : 1 - this.me);
  }

  onMsg(m) {
    if (!m || this.state === OVER) return;
    try {
      if (m.t === 'D') { this.finish(this.mode === 0 ? 0 : this.me, 'Tu rival se desconectó.'); return; }
      if (m.t === 'F') { this.finish(this.me, 'Tu rival abandonó la partida.'); return; }
      if (m.t === 'S' && !this.mine() && this.state !== MOVE) this.shoot(m.a, m.pw, m.sx, m.sy, m.call, m.cx, m.cy);
      else if (m.t === 'END' && this.state === MOVE && this.shooter !== this.me) this.pendingEnd = { m, at: performance.now() };
      else if (m.t === 'P') {
        const r = this.pl[1 - this.me], p = m.p;
        r.name = cleanName(p.name); r.level = p.level | 0; r.games = p.games | 0; r.wins = p.wins | 0; r.earned = +p.earned || 0; r.streak = p.streak | 0; r.best = p.best | 0; r.cue = p.cue | 0; r.xp = p.xp | 0;
        this.cueOf[1 - this.me] = r.cue;
      } else if (m.t === 'C') { this.cueOf[1 - this.me] = m.c | 0; this.pl[1 - this.me].cue = m.c | 0; }
      else if (m.t === 'E') { this.emote[1 - this.me] = m.e | 0; this.emoteT[1 - this.me] = Date.now() + 2800; }
    } catch (e) { }
  }
  applyEnd(m) {
    for (const [id, x, y, al] of m.b) { const b = this.balls[id]; b.x = x; b.y = y; b.alive = !!al; b.vx = b.vy = 0; }
    this.potted = m.po; this.firstHit = m.fh; this.pocket8 = m.p8;
    this.endShot();
  }

  /* ---------- bucle ---------- */
  frame(t) {
    if (this.dead) return;
    if (!this.last) this.last = t;
    this.acc16 += Math.min(100, t - this.last); this.last = t;
    while (this.acc16 >= 1000 / 60) {
      this.acc16 -= 1000 / 60;
      if (this.state === MOVE) {
        this.step();
        if (!this.moving()) {
          if (this.mode === 0 || this.shooter === this.me) {
            this.send({ t: 'END', m: 1, b: this.balls.map(b => [b.id, +b.x.toFixed(3), +b.y.toFixed(3), b.alive ? 1 : 0]), po: this.potted, fh: this.firstHit, p8: this.pocket8 });
            this.endShot();
          } else if (!this.pendingEnd && ++this.idle > 60 * 8) this.endShot();
        }
        if (this.pendingEnd && (!this.moving() || performance.now() - this.pendingEnd.at > 1500)) { const m = this.pendingEnd.m; this.pendingEnd = null; this.applyEnd(m); }
        if (this.state === OVER) return;
      }
    }
    this.paint();
    this.raf = requestAnimationFrame(t2 => this.frame(t2));
  }
  stop() { this.dead = true; cancelAnimationFrame(this.raf); }
  destroy() {
    this.stop();
    const c = this.cv; c.removeEventListener('pointerdown', this.h1); c.removeEventListener('pointermove', this.h2); c.removeEventListener('pointerup', this.h3); c.removeEventListener('pointercancel', this.h3);
  }

  /* ---------- entrada ---------- */
  pos(e) { const r = this.cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; }
  validSpot(x, y) {
    if (x < TX + R || x > TX + TW - R || y < TY + R || y > TY + TH - R) return false;
    for (let i = 1; i < 16; i++) if (this.balls[i].alive && Math.hypot(this.balls[i].x - x, this.balls[i].y - y) < 2 * R) return false;
    return true;
  }
  setSpin() { this.sx = (this.mx - SPX) / SPR; this.sy = (this.my - SPY) / SPR; const l = Math.hypot(this.sx, this.sy); if (l > .9) { this.sx *= .9 / l; this.sy *= .9 / l; } }
  bind() {
    const c = this.cv; c.style.touchAction = 'none';
    this.h1 = e => this.down(e); this.h2 = e => this.move(e); this.h3 = e => this.up(e);
    c.addEventListener('pointerdown', this.h1); c.addEventListener('pointermove', this.h2); c.addEventListener('pointerup', this.h3); c.addEventListener('pointercancel', this.h3);
  }
  aimAt(x, y) { const b = this.balls[0]; this.ang = Math.atan2(y - b.y, x - b.x); }
  move(e) {
    [this.mx, this.my] = this.pos(e);
    if (this.state === AIM && this.mine() && !this.dragging && !this.spinDrag && e.pointerType === 'mouse' && this.mx > TX - 60 && this.mx < TX + TW + 60) this.aimAt(this.mx, this.my);
    if (this.spinDrag) this.setSpin();
    if (this.dragging) this.power = Math.max(0, Math.min(1, -((this.mx - this.dx0) * Math.cos(this.ang) + (this.my - this.dy0) * Math.sin(this.ang)) / 220));
  }
  down(e) {
    e.preventDefault(); try { this.cv.setPointerCapture(e.pointerId); } catch (x) { }
    [this.mx, this.my] = this.pos(e); const mx = this.mx, my = this.my;
    if (inR(MENUB, mx, my)) { this.o.onMenu(); return; }
    for (let p = 0; p < 2; p++) if (inR(AV[p], mx, my)) { this.o.onProfile(this.pl[p], this.mode === 0 ? p === 0 : p === this.me); return; }
    if (inR(EMB, mx, my)) { this.emoteOpen = !this.emoteOpen; return; }
    if (this.emoteOpen) {
      this.emoteOpen = false;
      for (let i = 0; i < 6; i++) if (Math.hypot(mx - (100 + i * 50), my - 572) < 24) { const p = this.mode === 0 ? this.turn : this.me; this.emote[p] = i; this.emoteT[p] = Date.now() + 2800; this.send({ t: 'E', e: i }); }
      return;
    }
    if (this.state === MOVE || this.state === OVER) return;
    if (Math.hypot(mx - SPX, my - SPY) < SPR + 4) { if (this.mine()) { this.spinDrag = true; this.setSpin(); } return; }
    if (inR(CUEB, mx, my)) { if (this.mine()) this.o.onCue(this.mode === 0 ? this.turn : this.me); return; }
    if (!this.mine()) return;
    if (this.needCall()) for (let i = 0; i < 6; i++) if (Math.hypot(mx - P[i][0], my - P[i][1]) < 34) { this.called = i; this.msg = ''; return; }
    if (this.state === PLACE) { if (this.validSpot(mx, my)) { this.balls[0].x = mx; this.balls[0].y = my; this.state = AIM; this.msg = ''; } return; }
    if (e.pointerType !== 'mouse' && mx > TX - 60 && mx < TX + TW + 60) this.aimAt(mx, my);
    this.dragging = true; this.dx0 = mx; this.dy0 = my;
  }
  up() {
    this.spinDrag = false;
    if (!this.dragging) return;
    this.dragging = false;
    if (this.power > .03) {
      if (this.needCall() && this.called < 0) this.msg = '¡Antes debes elegir la tronera de la 8!';
      else {
        const c = this.balls[0], cu = CUES[this.cueOf[this.turn]];
        const pw = this.power * (1 + .02 * cu.f), ssx = this.sx * (1 + .06 * cu.e), ssy = this.sy * (1 + .06 * cu.e);
        this.send({ t: 'S', a: this.ang, pw, sx: ssx, sy: ssy, call: this.called, cx: c.x, cy: c.y });
        this.shoot(this.ang, pw, ssx, ssy, this.called, c.x, c.y);
        this.sx = 0; this.sy = 0;
      }
    }
    this.power = 0;
  }
  setCue(p, c) { this.cueOf[p] = c; this.pl[p].cue = c; this.o.save(); if (this.mode !== 0) this.send({ t: 'C', c }); }

  /* ---------- dibujo ---------- */
  paint() {
    const g = this.g, balls = this.balls;
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(this.bg, 0, 0);
    this.drawSideTools(g);
    for (let i = 0; i < this.tray.length; i++) drawBall(g, TRX + TRW / 2, TRY + TRH - 18 - i * 22.5, this.tray[i], 10);
    if (this.called >= 0) { g.strokeStyle = '#ff0'; g.lineWidth = 3; circ(g, P[this.called][0], P[this.called][1], 32); g.stroke(); }
    if (this.needCall() && this.mine() && this.called < 0) { g.strokeStyle = 'rgba(255,255,0,.5)'; g.lineWidth = 2; for (const p of P) { circ(g, p[0], p[1], 32); g.stroke(); } }
    for (let i = 1; i < 16; i++) if (balls[i].alive) drawBall(g, balls[i].x, balls[i].y, i, R);
    const c = balls[0];
    if (this.state === PLACE && this.mine() && c.alive) { c.x = Math.max(TX + R, Math.min(TX + TW - R, this.mx)); c.y = Math.max(TY + R, Math.min(TY + TH - R, this.my)); }
    if (c.alive) drawBall(g, c.x, c.y, 0, R);
    if (this.state === AIM && this.mine()) this.drawCue(g);
    this.drawHud(g);
  }
  drawSideTools(g) {
    const h = (PMR.h - 20) * this.power;
    if (h > 0) { g.save(); g.beginPath(); g.rect(PMR.x + 4, PMR.y + 10, PMR.w - 8, PMR.h - 20); g.clip(); g.fillStyle = lg(g, 0, PMR.y + PMR.h, 0, PMR.y, [[0, 'rgb(60,220,80)'], [1, 'rgb(235,40,30)']]); g.fillRect(PMR.x + 4, PMR.y + PMR.h - 10 - h, PMR.w - 8, h); g.restore(); }
    const who = this.mode === 0 ? this.turn : this.me;
    g.save(); rr(g, SLR.x, SLR.y, SLR.w, SLR.h, 14); g.clip();
    const tip = SLR.y + 30 + this.power * 150;
    drawCueShape(g, SLR.x + 20, tip - 420, SLR.x + 20, tip, CUES[this.cueOf[who]], 6, 2.4); g.restore();
    g.fillStyle = 'rgba(0,0,0,.47)'; circ(g, SPX + 2, SPY + 3, SPR); g.fill();
    const rg = g.createRadialGradient(SPX - 9, SPY - 11, 0, SPX - 9, SPY - 11, SPR * 1.5); rg.addColorStop(0, '#fff'); rg.addColorStop(.6, 'rgb(235,235,230)'); rg.addColorStop(1, 'rgb(150,150,150)');
    g.fillStyle = rg; circ(g, SPX, SPY, SPR); g.fill(); g.strokeStyle = 'rgba(255,255,255,.86)'; g.lineWidth = 3; g.stroke();
    g.fillStyle = 'rgb(200,30,30)'; circ(g, SPX + this.sx * SPR, SPY + this.sy * SPR, 5); g.fill();
    g.fillStyle = lg(g, 0, CUEB.y, 0, CUEB.y + CUEB.h, [[0, 'rgb(70,150,230)'], [1, 'rgb(25,70,140)']]); rr(g, CUEB.x, CUEB.y, CUEB.w, CUEB.h, 12); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
    drawCueShape(g, CUEB.x + 8, CUEB.y + CUEB.h - 10, CUEB.x + CUEB.w - 8, CUEB.y + 10, CUES[this.cueOf[who]], 3, 1.4);
    txt(g, 'Tacos', CUEB.x + CUEB.w / 2, CUEB.y + CUEB.h + 15, F(12), '#fff', 1);
  }
  drawCue(g) {
    const c = this.balls[0], ux = Math.cos(this.ang), uy = Math.sin(this.ang), cu = CUES[this.cueOf[this.turn]];
    let x = c.x, y = c.y, tgt = null;
    for (let s = 0; s < 1500; s++) {
      x += ux * 2; y += uy * 2;
      if (x < TX + R || x > TX + TW - R || y < TY + R || y > TY + TH - R) break;
      for (let i = 1; i < 16; i++) if (this.balls[i].alive && Math.hypot(this.balls[i].x - x, this.balls[i].y - y) < 2 * R) { tgt = this.balls[i]; break; }
      if (tgt) break;
    }
    g.lineWidth = 1.6; g.strokeStyle = 'rgba(255,255,255,.75)';
    g.beginPath(); g.moveTo(c.x + ux * R, c.y + uy * R); g.lineTo(x, y); g.stroke(); circ(g, x, y, R); g.stroke();
    if (tgt) {
      const dx = tgt.x - x, dy = tgt.y - y, l = Math.hypot(dx, dy) || 1, nx = dx / l, ny = dy / l;
      g.strokeStyle = 'rgba(255,230,120,.82)'; g.beginPath(); g.moveTo(tgt.x, tgt.y); g.lineTo(tgt.x + nx * (70 + cu.aim * 30), tgt.y + ny * (70 + cu.aim * 30)); g.stroke();
      let tx = -ny, ty = nx; if (tx * ux + ty * uy < 0) { tx = -tx; ty = -ty; }
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + tx * (40 + cu.aim * 20), y + ty * (40 + cu.aim * 20)); g.stroke();
    }
    const gap = R + 6 + this.power * 120, tipX = c.x - ux * gap, tipY = c.y - uy * gap;
    g.strokeStyle = 'rgba(0,0,0,.24)'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(tipX + 4, tipY + 6); g.lineTo(tipX - ux * 330 + 4, tipY - uy * 330 + 6); g.stroke();
    drawCueShape(g, tipX - ux * 340, tipY - uy * 340, tipX, tipY, cu, 6.5, 2.4);
  }
  groupText(p) {
    if (this.grp[p] < 0) return 'mesa abierta';
    if (this.remaining(this.grp[p]) === 0) return 'bola 8';
    return this.grp[p] === 0 ? 'lisas 1-7' : 'rayadas 9-15';
  }
  drawSlots(g, p, x0, cy) {
    for (let i = 0; i < 8; i++) {
      const cx = x0 + i * 26;
      g.fillStyle = 'rgb(6,8,14)'; circ(g, cx, cy, 11); g.fill(); g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 1.2; g.stroke();
      if (this.grp[p] < 0) continue;
      const id = i === 7 ? 8 : (this.grp[p] === 0 ? i + 1 : i + 9);
      if (i === 7 && this.remaining(this.grp[p]) > 0) { g.globalAlpha = .3; drawBall(g, cx, cy, 8, 10); g.globalAlpha = 1; }
      else if (this.balls[id].alive) drawBall(g, cx, cy, id, 10);
    }
  }
  drawHud(g) {
    const t = this.T;
    g.fillStyle = lg(g, 0, MENUB.y, 0, MENUB.y + 50, [[0, 'rgb(70,220,90)'], [1, 'rgb(20,140,40)']]); rr(g, MENUB.x, MENUB.y, 50, 50, 12); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); g.fillStyle = '#fff';
    for (let i = 0; i < 3; i++) { rr(g, MENUB.x + 10, MENUB.y + 12 + i * 11, 30, 6, 4); g.fill(); }
    txt(g, t.name, 76, 28, F(16, 1), 'rgb(255,225,120)', 0);
    txt(g, 'Apuesta: ' + fmt(t.bet), 76, 46, F(12), '#fff', 0);
    txt(g, 'Premio: ' + fmt(t.bet * 2), 76, 63, F(12), '#fff', 0);
    txt(g, 'Monedas', 1075, 26, F(12), 'rgb(200,210,230)', 2);
    txt(g, fmt(this.acc.coins), 1075, 48, F(16, 1), 'rgb(255,225,120)', 2);
    for (let p = 0; p < 2; p++) {
      const a = AV[p], act = this.turn === p && this.state !== OVER;
      drawAvatar(g, a.x, a.y, a.w, this.pl[p]);
      if (act) { g.strokeStyle = 'rgb(60,255,80)'; g.lineWidth = 4; rr(g, a.x - 3, a.y - 3, a.w + 6, a.h + 6, 18); g.stroke(); }
      const nm = this.pl[p].name + (this.mode !== 0 && p === this.me ? ' (tú)' : '');
      if (p === 0) { txt(g, nm, 490, 28, F(16, 1), '#fff', 2); this.drawSlots(g, 0, 300, 54); }
      else { txt(g, nm, 710, 28, F(16, 1), '#fff', 0); this.drawSlots(g, 1, 720, 54); }
      if (Date.now() < this.emoteT[p]) {
        const bx = a.x + 2, by = a.y + 72;
        g.fillStyle = 'rgba(255,255,255,.92)'; rr(g, bx - 4, by - 4, 70, 70, 20); g.fill(); g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 1; g.stroke();
        drawFace(g, bx + 31, by + 31, 28, this.emote[p]);
      }
    }
    g.fillStyle = 'rgba(0,0,0,.35)'; rr(g, 566, 10, 68, 58, 16); g.fill();
    drawBall(g, 588, 39, 3, 14); drawBall(g, 614, 39, 11, 14);
    g.fillStyle = lg(g, 0, EMB.y, 0, EMB.y + 48, [[0, 'rgb(255,215,70)'], [1, 'rgb(220,140,10)']]); circ(g, EMB.x + 24, EMB.y + 24, 24); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); drawFace(g, EMB.x + 24, EMB.y + 24, 17, 0);
    if (this.emoteOpen) {
      g.fillStyle = 'rgba(10,14,28,.92)'; rr(g, 76, 540, 290, 64, 32); g.fill(); g.strokeStyle = 'rgba(255,255,255,.47)'; g.lineWidth = 1; g.stroke();
      for (let i = 0; i < 6; i++) drawFace(g, 100 + i * 50, 572, 20, i);
    }
    const who = (this.broke ? 'Va el jugador ' : 'Saca el jugador ') + (this.turn + 1) + '  ·  ' + this.pl[this.turn].name + '  ·  ' + this.groupText(this.turn);
    g.fillStyle = lg(g, 0, 636, 0, 672, [[0, 'rgba(10,14,28,.9)'], [1, 'rgba(30,40,70,.9)']]); rr(g, W / 2 - 270, 636, 540, 36, 18); g.fill();
    g.strokeStyle = 'rgb(60,255,80)'; g.lineWidth = 2; g.stroke();
    txt(g, who, W / 2, 660, F(16, 1), '#fff', 1);
    if (this.msg) txt(g, this.msg, W / 2, 692, F(14, 1), '#ff0', 1);
    if (this.mode !== 0 && this.state === MOVE && this.shooter !== this.me) txt(g, 'Tiro del rival...', W / 2, 692, F(14, 1), 'rgb(200,210,230)', 1);
  }
}

window.Pool8 = { Game, TABLES, CUES, TIER, TIERC, drawCueShape, fmt, hex, rgb, owned, mkProfile, record, need, cleanName };
})();