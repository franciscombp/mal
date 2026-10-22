/* ══════════════════════════════════════════════════════════════
   Guagua de pan · el juego
   Una guagua recién salida del horno, una manga de crema y la
   vitrina donde se guardan las que haces y las que te regalan.

   Cómo está hecho:
     · La guagua es una lista de operaciones (`ops`), no un dibujo.
       Cada trazo de manga, roseta, puñado de grageas o mordisco es
       un arreglo de números. Eso es lo que viaja en el enlace: quien
       lo abre no recibe una imagen, recibe la receta y la vuelve a
       hornear en su teléfono.
     · Todo se dibuja en un espacio lógico de 600 × 750. La capa de
       la guagua es transparente: la masa se pinta normal, la crema
       con `source-atop` (solo cae sobre pan) y el mordisco con
       `destination-out` (lo que se come, desaparece).
     · No hay servidor. La vitrina vive en `localStorage` y el regalo
       va dentro del enlace, después del `#`, así que ni siquiera
       llega a GitHub.
   ══════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const W = 600, H = 750;            // el espacio lógico de la guagua
  const RES = 2;                     // píxeles por unidad en pantalla
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const avisa = (t, tipo) => window.malDS && window.malDS.aviso ? window.malDS.aviso(t, tipo) : null;

  /* ─── la despensa ──────────────────────────────────────────── */
  const CREMAS = [
    { n: 'Merengue', c: '#fff6ea' },
    { n: 'Rosa', c: '#f6a3c3' },
    { n: 'Fucsia', c: '#e01b6a' },
    { n: 'Mora', c: '#7d3c98' },
    { n: 'Celeste', c: '#8fd0f2' },
    { n: 'Pistacho', c: '#93c84a' },
    { n: 'Yema', c: '#ffcf3d' },
    { n: 'Chocolate', c: '#6b3a1f' },
  ];
  const BOQUILLAS = [8, 15, 24];
  const GRAGEAS = ['#e01b6a', '#ffcf3d', '#8fd0f2', '#93c84a', '#ffffff', '#7d3c98', '#ff8a3d'];
  const FORMAS = ['guagua', 'caballito'];
  const CARAS = ['Sin cara', 'De yeso', 'Dormida', 'Pícara', 'De pasas'];

  const NOMBRES = {
    guagua: ['Rosita', 'Michita', 'Carmita', 'Panchito', 'Lucho', 'Toñito', 'Charito', 'Juanchito',
      'Maruja', 'Chabelita', 'Kevin', 'Britany', 'Dayana', 'Jefferson', 'Mayerli', 'Brayan',
      'Pepita', 'Don Gustavo', 'Michael Steven', 'Fernandita', 'Anahí', 'Cuchito'],
    caballito: ['Rayo', 'Canela', 'Trueno', 'Galletón', 'Pegaso', 'Relámpago', 'Pancho Villa',
      'Pinto', 'Tormenta', 'Chocolatín', 'Bolívar', 'Palomo'],
  };
  const MENSAJES = [
    'Para que el 2 de noviembre no te agarre sin guagua.',
    'Con colada morada sabe mejor. La colada la pones tú.',
    'Hecha con mis propias manos (y un poquito de crema de más).',
    'Una guagua para ti y otra para mí, que yo también tengo hambre.',
    'Va con cariño. Si llega mordida, fue el cartero.',
  ];

  /* ─── utilidades ───────────────────────────────────────────── */
  function azar(semilla) {          // mulberry32: el mismo número, la misma grajea
    let a = semilla >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const elige = (arr, r) => arr[Math.floor((r || Math.random)() * arr.length)];
  function tono(hex, k) {           // k < 0 oscurece, k > 0 aclara
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const f = k < 0 ? 0 : 255, a = Math.abs(k);
    r = Math.round(r + (f - r) * a); g = Math.round(g + (f - g) * a); b = Math.round(b + (f - b) * a);
    return `rgb(${r},${g},${b})`;
  }
  const escala = (ctx) => ctx.getTransform().a;   // las sombras de canvas no obedecen a la transformación

  function lienzo(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  /* ─── la masa ──────────────────────────────────────────────── */
  function elipse(cx, cy, rx, ry, rot) {
    const p = new Path2D();
    p.ellipse(cx, cy, rx, ry, rot || 0, 0, Math.PI * 2);
    return p;
  }
  function capsula(x1, y1, x2, y2, r) {
    const p = new Path2D();
    const a = Math.atan2(y2 - y1, x2 - x1);
    p.arc(x2, y2, r, a - Math.PI / 2, a + Math.PI / 2);
    p.arc(x1, y1, r, a + Math.PI / 2, a + Math.PI * 1.5);
    p.closePath();
    return p;
  }

  /* Cada forma es una pila de bollitos de masa, del de abajo al de
     arriba. `c` es el centro y `r` el radio aproximado, para el brillo. */
  const MOLDES = {
    guagua: [
      { p: elipse(300, 478, 168, 236), c: [300, 478], r: 236 },
      { p: elipse(300, 196, 116, 112), c: [300, 196], r: 116 },
      { p: capsula(182, 372, 336, 452, 30), c: [259, 412], r: 90 },
      { p: capsula(418, 372, 264, 452, 30), c: [341, 412], r: 90 },
    ],
    caballito: [
      { p: capsula(122, 372, 70, 486, 22), c: [96, 430], r: 70 },
      { p: capsula(190, 440, 176, 600, 30), c: [183, 520], r: 90 },
      { p: capsula(252, 450, 250, 612, 30), c: [251, 530], r: 90 },
      { p: capsula(366, 450, 368, 612, 30), c: [367, 530], r: 90 },
      { p: capsula(424, 440, 440, 600, 30), c: [432, 520], r: 90 },
      { p: elipse(300, 400, 200, 110), c: [300, 400], r: 200 },
      { p: capsula(420, 362, 462, 238, 56), c: [441, 300], r: 110 },
      { p: capsula(452, 176, 446, 128, 17), c: [449, 152], r: 30 },
      { p: elipse(498, 220, 90, 56, 0.4), c: [498, 220], r: 90 },
    ],
  };

  function bollito(ctx, pieza, abajo) {
    const k = escala(ctx);
    const [cx, cy] = pieza.c, r = pieza.r;
    // la sombra que el bollito deja sobre el de abajo (y solo sobre él)
    if (abajo) {
      ctx.save();
      ctx.clip(abajo);
      ctx.shadowColor = 'rgba(70,30,5,.45)';
      ctx.shadowBlur = 14 * k; ctx.shadowOffsetY = 6 * k;
      ctx.fillStyle = '#b8682a';
      ctx.fill(pieza.p);
      ctx.restore();
    }
    ctx.save();
    const g = ctx.createRadialGradient(cx - r * .3, cy - r * .35, r * .05, cx, cy, r * 1.15);
    g.addColorStop(0, '#f6c477');
    g.addColorStop(.5, '#dc903f');
    g.addColorStop(1, '#a3561c');
    ctx.fillStyle = g;
    ctx.fill(pieza.p);
    ctx.clip(pieza.p);
    // el canto: oscuro abajo a la derecha, luz arriba a la izquierda
    const aro = new Path2D();
    aro.rect(-W, -H, W * 3, H * 3);
    aro.addPath(pieza.p);
    ctx.shadowColor = 'rgba(95,40,8,.7)';
    ctx.shadowBlur = 22 * k; ctx.shadowOffsetX = -6 * k; ctx.shadowOffsetY = -9 * k;
    ctx.fillStyle = '#000';
    ctx.fill(aro, 'evenodd');
    ctx.shadowColor = 'rgba(255,226,170,.55)';
    ctx.shadowBlur = 16 * k; ctx.shadowOffsetX = 5 * k; ctx.shadowOffsetY = 7 * k;
    ctx.fill(aro, 'evenodd');
    ctx.shadowColor = 'transparent';
    // el barniz de huevo
    const b = ctx.createRadialGradient(cx - r * .35, cy - r * .45, 0, cx - r * .35, cy - r * .45, r * .7);
    b.addColorStop(0, 'rgba(255,240,205,.5)');
    b.addColorStop(1, 'rgba(255,240,205,0)');
    ctx.fillStyle = b;
    ctx.fill(pieza.p);
    // poros del pan
    const rnd = azar(cx * 7 + cy);
    ctx.fillStyle = 'rgba(110,50,10,.18)';
    for (let i = 0; i < r * .9; i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, .8 + rnd() * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function mascara(ctx) {
    const k = escala(ctx);
    const m = elipse(300, 200, 66, 74);
    ctx.save();
    ctx.shadowColor = 'rgba(60,25,5,.45)';
    ctx.shadowBlur = 10 * k; ctx.shadowOffsetY = 4 * k;
    const g = ctx.createRadialGradient(285, 180, 5, 300, 200, 80);
    g.addColorStop(0, '#fffaf2');
    g.addColorStop(1, '#ecd8c3');
    ctx.fillStyle = g;
    ctx.fill(m);
    ctx.restore();
    ctx.save();
    ctx.clip(m);
    ctx.fillStyle = 'rgba(240,110,140,.35)';
    ctx.beginPath(); ctx.arc(262, 222, 15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(338, 222, 15, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // pelito pintado
    ctx.save();
    ctx.strokeStyle = '#4a2a14'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(282, 132); ctx.quadraticCurveTo(300, 150, 300, 128);
    ctx.quadraticCurveTo(302, 150, 320, 134); ctx.stroke();
    ctx.restore();
  }
  function ojo(ctx, x, y) {
    ctx.fillStyle = '#2a1a12';
    ctx.beginPath(); ctx.ellipse(x, y, 7, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x - 2, y - 3, 2.4, 0, Math.PI * 2); ctx.fill();
  }
  function pasa(ctx, x, y, rx, ry, rot) {
    const g = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, rx * 1.2);
    g.addColorStop(0, '#6b3a2a'); g.addColorStop(1, '#2a120a');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); ctx.fill();
  }

  function cara(ctx, n) {
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (n >= 1 && n <= 3) mascara(ctx);
    if (n === 1) {                         // de yeso, la clásica
      ojo(ctx, 278, 192); ojo(ctx, 322, 192);
      ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(278, 182, 12, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
      ctx.beginPath(); ctx.arc(322, 182, 12, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
      ctx.fillStyle = '#d6264f';
      ctx.beginPath(); ctx.ellipse(300, 236, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
    } else if (n === 2) {                  // dormida
      ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(278, 190, 10, Math.PI * .15, Math.PI * .85); ctx.stroke();
      ctx.beginPath(); ctx.arc(322, 190, 10, Math.PI * .15, Math.PI * .85); ctx.stroke();
      ctx.fillStyle = '#c23a52';
      ctx.beginPath(); ctx.ellipse(300, 236, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
    } else if (n === 3) {                  // pícara: guiña y saca la lengua
      ojo(ctx, 278, 192);
      ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(312, 194); ctx.quadraticCurveTo(322, 184, 332, 194); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(280, 230); ctx.quadraticCurveTo(300, 246, 320, 230); ctx.stroke();
      ctx.fillStyle = '#ef6f8e';
      ctx.beginPath(); ctx.ellipse(306, 244, 8, 10, .2, 0, Math.PI * 2); ctx.fill();
    } else if (n === 4) {                  // de pasas, la de la casa
      pasa(ctx, 272, 188, 10, 8, .3); pasa(ctx, 328, 188, 10, 8, -.3);
      pasa(ctx, 300, 214, 6, 5);
      for (let i = 0; i < 5; i++) pasa(ctx, 270 + i * 15, 242 + Math.sin(i / 4 * Math.PI) * 9, 6, 5, i);
    }
    ctx.restore();
  }

  function caraCaballo(ctx) {
    pasa(ctx, 506, 200, 9, 8);
    ctx.fillStyle = 'rgba(90,40,10,.55)';
    ctx.beginPath(); ctx.ellipse(562, 248, 5, 7, .5, 0, Math.PI * 2); ctx.fill();
  }

  function masa(ctx, forma, n) {
    const piezas = MOLDES[forma] || MOLDES.guagua;
    let abajo = null;
    piezas.forEach((pz) => {
      bollito(ctx, pz, abajo);
      if (!abajo) abajo = new Path2D();
      abajo.addPath(pz.p);
    });
    if (forma === 'caballito') caraCaballo(ctx);
    else cara(ctx, n);
  }

  /* ─── la crema ─────────────────────────────────────────────── */
  function camino(pts) {
    const p = new Path2D();
    p.moveTo(pts[0], pts[1]);
    if (pts.length === 2) { p.lineTo(pts[0] + .1, pts[1]); return p; }
    for (let i = 2; i < pts.length - 2; i += 2) {
      const mx = (pts[i] + pts[i + 2]) / 2, my = (pts[i + 1] + pts[i + 3]) / 2;
      p.quadraticCurveTo(pts[i], pts[i + 1], mx, my);
    }
    p.lineTo(pts[pts.length - 2], pts[pts.length - 1]);
    return p;
  }

  function manga(ctx, color, w, pts) {
    const p = camino(pts);
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'source-atop';
    const capa = (estilo, ancho, dx, dy) => {
      ctx.save(); ctx.translate(dx, dy);
      ctx.strokeStyle = estilo; ctx.lineWidth = ancho; ctx.stroke(p);
      ctx.restore();
    };
    capa('rgba(70,28,6,.32)', w * 1.08, w * .14, w * .24);
    capa(tono(color, -.2), w, 0, 0);
    capa(color, w * .74, -w * .06, -w * .08);
    capa('rgba(255,255,255,.62)', Math.max(1.5, w * .2), -w * .17, -w * .22);
    ctx.restore();
  }

  function roseta(ctx, color, w, x, y) {
    const R = w * 1.15 + 6;
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(70,28,6,.3)';
    ctx.beginPath(); ctx.arc(x + R * .12, y + R * .22, R * 1.02, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      const px = x + Math.cos(a) * R * .55, py = y + Math.sin(a) * R * .55;
      ctx.fillStyle = tono(color, -.2);
      ctx.beginPath(); ctx.arc(px, py, R * .48, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(px - R * .05, py - R * .07, R * .36, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = tono(color, -.1);
    ctx.beginPath(); ctx.arc(x, y, R * .42, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = Math.max(1.5, R * .1); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x - R * .05, y - R * .05, R * .22, Math.PI * .9, Math.PI * 2.1); ctx.stroke();
    ctx.restore();
  }

  function grageas(ctx, semilla, pts) {
    const rnd = azar(semilla);
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.lineCap = 'round';
    for (let i = 0; i < pts.length; i += 2) {
      for (let j = 0; j < 3; j++) {
        const a = rnd() * Math.PI * 2, d = rnd() * 16;
        const x = pts[i] + Math.cos(a) * d, y = pts[i + 1] + Math.sin(a) * d;
        const rot = rnd() * Math.PI, l = 4 + rnd() * 3;
        const dx = Math.cos(rot) * l, dy = Math.sin(rot) * l;
        const col = GRAGEAS[Math.floor(rnd() * GRAGEAS.length)];
        ctx.strokeStyle = 'rgba(70,28,6,.3)'; ctx.lineWidth = 4.5;
        ctx.beginPath(); ctx.moveTo(x - dx + 1, y - dy + 2); ctx.lineTo(x + dx + 1, y + dy + 2); ctx.stroke();
        ctx.strokeStyle = col; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx, y + dy); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(x - dx * .6, y - dy * .6 - 1); ctx.lineTo(x + dx * .3, y + dy * .3 - 1); ctx.stroke();
      }
    }
    ctx.restore();
  }

  function dientes(x, y, R) {
    const p = new Path2D();
    p.arc(x, y, R, 0, Math.PI * 2);
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2;
      p.moveTo(x + Math.cos(a) * R + R * .16, y + Math.sin(a) * R);
      p.arc(x + Math.cos(a) * R, y + Math.sin(a) * R, R * .16, 0, Math.PI * 2);
    }
    return p;
  }
  const MORDIDA = 40;
  function mordisco(ctx, x, y) {
    ctx.save();
    // la miga que queda a la vista en el borde
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = '#f4dfb4';
    ctx.fill(dientes(x, y, 46));
    ctx.fillStyle = 'rgba(180,120,60,.35)';
    const rnd = azar(x * 13 + y);
    for (let i = 0; i < 14; i++) {
      const a = rnd() * Math.PI * 2, d = 44 + rnd() * 6;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 1 + rnd() * 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fill(dientes(x, y, MORDIDA));
    ctx.restore();
  }

  /* Una operación: [tipo, …]. Así viaja en el enlace.
       0 manga     [0, color, boquilla, x, y, x, y…]
       1 roseta    [1, color, boquilla, x, y]
       2 grageas   [2, semilla, x, y, x, y…]
       3 mordisco  [3, x, y]                                   */
  function aplicar(ctx, op) {
    const t = op[0];
    if (t === 0) manga(ctx, CREMAS[op[1]].c, BOQUILLAS[op[2]], op.slice(3));
    else if (t === 1) roseta(ctx, CREMAS[op[1]].c, BOQUILLAS[op[2]], op[3], op[4]);
    else if (t === 2) grageas(ctx, op[1], op.slice(2));
    else if (t === 3) mordisco(ctx, op[1], op[2]);
  }

  /* La guagua entera en un canvas transparente de w × h. */
  function hornear(estado, w, extra) {
    const c = lienzo(w, Math.round(w * H / W));
    const ctx = c.getContext('2d');
    ctx.scale(w / W, w / W);
    masa(ctx, estado.f, estado.c);
    estado.o.forEach((op) => aplicar(ctx, op));
    (extra || []).forEach((op) => aplicar(ctx, op));
    return c;
  }

  /* ─── el enlace ────────────────────────────────────────────── */
  const b64 = {
    de(bytes) {
      let s = '';
      for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    },
    a(txt) {
      const s = atob(txt.replace(/-/g, '+').replace(/_/g, '/'));
      const u = new Uint8Array(s.length);
      for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
      return u;
    },
  };
  async function exprimir(bytes, modo) {
    const flujo = new Blob([bytes]).stream().pipeThrough(
      modo === 'in' ? new DecompressionStream('deflate-raw') : new CompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(flujo).arrayBuffer());
  }
  // Los trazos van en diferencias: números chicos, que se comprimen mejor.
  function aDeltas(op) {
    const ini = op[0] === 0 ? 3 : op[0] === 2 ? 2 : op.length;
    const o = op.slice(0, ini);
    let px = 0, py = 0;
    for (let i = ini; i < op.length; i += 2) {
      o.push(op[i] - px, op[i + 1] - py);
      px = op[i]; py = op[i + 1];
    }
    return o;
  }
  function deDeltas(op) {
    const ini = op[0] === 0 ? 3 : op[0] === 2 ? 2 : op.length;
    const o = op.slice(0, ini);
    let px = 0, py = 0;
    for (let i = ini; i < op.length; i += 2) {
      px += op[i]; py += op[i + 1];
      o.push(px, py);
    }
    return o;
  }
  async function codificar(datos) {
    const plano = Object.assign({}, datos, { o: datos.o.map(aDeltas) });
    const bytes = new TextEncoder().encode(JSON.stringify(plano));
    if (window.CompressionStream) {
      try { return 'z' + b64.de(await exprimir(bytes)); } catch (e) { /* sin compresión, entonces */ }
    }
    return 'j' + b64.de(bytes);
  }
  async function decodificar(txt) {
    let bytes = b64.a(txt.slice(1));
    if (txt[0] === 'z') bytes = await exprimir(bytes, 'in');
    const d = JSON.parse(new TextDecoder().decode(bytes));
    return sano(Object.assign(d, { o: (d.o || []).map(deDeltas) }));
  }
  /* Lo que llega por un enlace lo escribió cualquiera: se filtra todo. */
  function sano(d) {
    const num = (v) => typeof v === 'number' && isFinite(v);
    const txt = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
    const o = Array.isArray(d.o) ? d.o.slice(0, 1500).filter((op) => Array.isArray(op) && op.every(num)).filter((op) => {
      const t = op[0];
      if (t === 0) return op.length >= 5 && op.length % 2 === 1 && CREMAS[op[1]] && BOQUILLAS[op[2]] !== undefined;
      if (t === 1) return op.length === 5 && CREMAS[op[1]] && BOQUILLAS[op[2]] !== undefined;
      if (t === 2) return op.length >= 4 && op.length % 2 === 0;
      if (t === 3) return op.length === 3;
      return false;
    }) : [];
    return {
      v: 1,
      f: FORMAS.includes(d.f) ? d.f : 'guagua',
      c: Number.isInteger(d.c) && d.c >= 0 && d.c < CARAS.length ? d.c : 0,
      n: txt(d.n, 40), p: txt(d.p, 40), d: txt(d.d, 40), m: txt(d.m, 160),
      o,
    };
  }

  /* ─── la panadera opina ────────────────────────────────────── */
  function veredicto(e) {
    const cuenta = (t) => e.o.filter((op) => op[0] === t).length;
    const trazos = cuenta(0), rosetas = cuenta(1), grag = cuenta(2), bocados = cuenta(3);
    const colores = new Set(e.o.filter((op) => op[0] < 2).map((op) => op[1])).size;
    const total = e.o.length;
    let frase;
    if (!total) frase = '¿Y la crema? Así pelada parece pan de la tienda de la esquina.';
    else if (bocados >= 3) frase = 'Eso ya no es una guagua, es la evidencia. Regálala igual: es la intención.';
    else if (bocados) frase = 'Regalar una guagua mordida es amor del verdadero. O hambre.';
    else if (total > 70) frase = 'Eso ya no es guagua, es pastel de primera comunión. Me encanta.';
    else if (colores >= 6) frase = 'Más colores que el mercado de San Roque un sábado. Así me gusta.';
    else if (grag > trazos + rosetas) frase = 'Más grageas que pan. Esta guagua va a dejar la mesa como confeti.';
    else if (colores === 1 && trazos > 4) frase = 'Elegante, monocromática. Una guagua que podría tener un cargo público.';
    else if (e.f === 'caballito') frase = 'Un caballito bien enjaezado. Que no se le vaya galopando al vecino.';
    else frase = elige([
      'Bien bonita le quedó, mijo. La abuelita estaría orgullosa.',
      'Esta guagua tiene cara de que va a salir candidata.',
      'Linda. Ojalá la colada esté igual de espesa.',
      'Así mismo se decoraban en el horno de la calle Rocafuerte.',
    ]);
    let nota = Math.min(10, 5 + Math.min(colores, 3) + (rosetas ? 1 : 0) + (grag ? 1 : 0) - (total < 4 ? 2 : 0));
    nota = Math.max(1, nota);
    const descuento = nota === 10 ? 'Diez. No le bajo nada.' : `${nota}/10. Le bajé ${10 - nota} ${10 - nota === 1 ? 'punto' : 'puntos'} porque no trajo colada.`;
    return { frase, nota, descuento };
  }

  /* ─── el calendario ────────────────────────────────────────── */
  function faltan() {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    let fin = new Date(hoy.getFullYear(), 10, 2);
    if (hoy > fin) fin = new Date(hoy.getFullYear() + 1, 10, 2);
    return Math.round((fin - hoy) / 86400000);
  }
  function rotuloFinados() {
    const d = faltan();
    if (d === 0) return 'Hoy es Día de Difuntos';
    if (d === 1) return 'Mañana es Día de Difuntos';
    if (d > 300) return 'Ya pasó Finados, pero la guagua no tiene temporada';
    return `Faltan ${d} días para Finados`;
  }

  /* ─── la tarjeta para regalar (1080 × 1350) ───────────────── */
  function envolver(ctx, texto, x, y, ancho, alto, max) {
    const palabras = texto.split(/\s+/);
    const lineas = [];
    let l = '';
    palabras.forEach((p) => {
      const prueba = l ? l + ' ' + p : p;
      if (ctx.measureText(prueba).width > ancho && l) { lineas.push(l); l = p; } else l = prueba;
    });
    if (l) lineas.push(l);
    lineas.slice(0, max).forEach((ln, i) => ctx.fillText(i === max - 1 && lineas.length > max ? ln + '…' : ln, x, y + i * alto));
    return Math.min(lineas.length, max);
  }
  function colada(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // vapor
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    [-40, 0, 40].forEach((dx) => {
      ctx.beginPath(); ctx.moveTo(dx, -40);
      ctx.bezierCurveTo(dx + 22, -70, dx - 22, -100, dx, -135); ctx.stroke();
    });
    // la taza
    ctx.fillStyle = '#f5ece0';
    ctx.beginPath(); ctx.moveTo(-95, -20); ctx.lineTo(95, -20); ctx.lineTo(78, 110);
    ctx.quadraticCurveTo(0, 135, -78, 110); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#f5ece0'; ctx.lineWidth = 16;
    ctx.beginPath(); ctx.arc(102, 40, 32, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    ctx.fillStyle = '#e01b6a';
    ctx.fillRect(-88, 30, 176, 12);
    // la colada, morada y con fruta
    ctx.fillStyle = '#4b1450';
    ctx.beginPath(); ctx.ellipse(0, -20, 95, 24, 0, 0, Math.PI * 2); ctx.fill();
    const rnd = azar(9);
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = elige(['#a1236a', '#d9415f', '#ffcf3d', '#6d1f6f'], rnd);
      ctx.beginPath(); ctx.arc((rnd() - .5) * 150, -20 + (rnd() - .5) * 26, 4 + rnd() * 5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  async function tarjeta(e) {
    try { await Promise.all([document.fonts.load('800 80px Syne'), document.fonts.load('600 30px Inter'), document.fonts.load('italic 400 30px Inter')]); } catch (err) { /* sin fuentes, igual sale */ }
    const c = lienzo(1080, 1350);
    const ctx = c.getContext('2d');
    const fondo = ctx.createLinearGradient(0, 0, 0, 1350);
    fondo.addColorStop(0, '#2e0f36'); fondo.addColorStop(1, '#5a1c50');
    ctx.fillStyle = fondo; ctx.fillRect(0, 0, 1080, 1350);
    // un mantel de puntos y estrellitas
    const rnd = azar(e.o.length + 7);
    ctx.fillStyle = 'rgba(255,201,60,.08)';
    for (let y = 30; y < 1350; y += 54) for (let x = (y / 54 % 2) * 27 + 20; x < 1080; x += 54) {
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,201,60,.55)';
    for (let i = 0; i < 18; i++) {
      const x = rnd() * 1080, y = 250 + rnd() * 900, r = 3 + rnd() * 5;
      ctx.beginPath();
      for (let j = 0; j < 8; j++) {
        const a = j / 8 * Math.PI * 2, d = j % 2 ? r * .35 : r * 1.6;
        ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
      }
      ctx.closePath(); ctx.fill();
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffc93c';
    ctx.font = '600 30px Inter, system-ui, sans-serif';
    ctx.fillText('2 DE NOVIEMBRE · DÍA DE DIFUNTOS', 540, 104);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 84px Syne, Inter, system-ui, sans-serif';
    ctx.fillText(e.d ? 'Te regalo' : 'Una guagua', 540, 196);
    ctx.fillText(e.d ? 'una guagua' : 'para ti', 540, 282);
    // la guagua, sobre su sombra
    const g = hornear(e, 1200);
    const alto = 760, ancho = alto * W / H, gx = 540 - ancho / 2 - 60, gy = 320;
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.ellipse(gx + ancho / 2, gy + alto - 30, ancho * .36, 26, 0, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(g, gx, gy, ancho, alto);
    colada(ctx, 870, 960, .9);
    // el nombre, en cinta
    const nombre = '«' + (e.n || (e.f === 'caballito' ? 'Caballito' : 'Guagua')) + '»';
    ctx.font = '800 46px Syne, Inter, system-ui, sans-serif';
    const an = Math.min(900, ctx.measureText(nombre).width + 80);
    ctx.fillStyle = '#e01b6a';
    ctx.beginPath(); ctx.roundRect(540 - an / 2, 1078, an, 76, 38); ctx.fill();
    ctx.fillStyle = '#b01254';
    ctx.beginPath(); ctx.roundRect(540 - an / 2, 1146, an, 8, 4); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(nombre, 540, 1132, 860);
    let y = 1206;
    const quien = [e.p && 'Para ' + e.p, e.d && 'de ' + e.d].filter(Boolean).join(' · ');
    if (quien) {
      ctx.font = '600 34px Inter, system-ui, sans-serif'; ctx.fillStyle = '#ffffff';
      ctx.fillText(quien, 540, y, 960); y += 46;
    }
    if (e.m) {
      ctx.font = 'italic 400 30px Inter, system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.82)';
      y += 40 * envolver(ctx, e.m, 540, y, 900, 40, quien ? 1 : 2);
    }
    ctx.font = '600 24px Inter, system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,201,60,.9)';
    ctx.fillText('Decora la tuya en una.red/guagua', 540, 1322);
    return c;
  }
  const aBlob = (c) => new Promise((ok) => c.toBlob(ok, 'image/png'));

  /* ─── la vitrina ───────────────────────────────────────────── */
  const CLAVE = 'guagua:vitrina', BORRADOR = 'guagua:borrador';
  const almacen = {
    leer(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } },
    poner(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  };
  const vitrina = () => almacen.leer(CLAVE, []);
  function guardarEnVitrina(item) {
    const lista = vitrina().filter((x) => x.id !== item.id && !(item.t === 'recibida' && x.e === item.e));
    lista.unshift(item);
    if (!almacen.poner(CLAVE, lista.slice(0, 80))) avisa('No hay espacio en la vitrina de este navegador.', 'error');
  }
  const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  /* ─── el sonido de morder ──────────────────────────────────── */
  let audio = null;
  function crunch() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const dur = .16, n = Math.floor(audio.sampleRate * dur);
      const buf = audio.createBuffer(1, n, audio.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) {
        const env = Math.pow(1 - i / n, 2.5);
        d[i] = (Math.random() * 2 - 1) * env * (Math.random() < .3 ? 1 : .35);
      }
      const src = audio.createBufferSource(); src.buffer = buf;
      const f = audio.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800 + Math.random() * 1200; f.Q.value = .8;
      const g = audio.createGain(); g.gain.value = .35;
      src.connect(f).connect(g).connect(audio.destination);
      src.start();
    } catch (e) { /* sin audio, se come en silencio */ }
    if (navigator.vibrate) navigator.vibrate(18);
  }

  /* ─── un lienzo que se toca ────────────────────────────────── */
  function mesa(canvas) {
    canvas.width = W * RES; canvas.height = H * RES;
    const ctx = canvas.getContext('2d');
    return {
      ctx,
      /* `ops` sirve para abrir los mordiscos también en la sombra: si no,
         por el hueco se ve la sombra del pan y parece una mancha gris. */
      pintar(capa, ops) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.shadowColor = 'rgba(30,10,0,.4)'; ctx.shadowBlur = 26 * RES; ctx.shadowOffsetY = 12 * RES;
        ctx.drawImage(capa, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        const huecos = (ops || []).filter((op) => op[0] === 3);
        if (!huecos.length) return;
        ctx.save();
        ctx.scale(canvas.width / W, canvas.height / H);
        ctx.globalCompositeOperation = 'destination-out';
        huecos.forEach((op) => ctx.fill(dientes(op[1], op[2], MORDIDA)));
        ctx.restore();
      },
      punto(ev) {
        const r = canvas.getBoundingClientRect();
        return [Math.round((ev.clientX - r.left) / r.width * W), Math.round((ev.clientY - r.top) / r.height * H)];
      },
    };
  }

  /* ══════════════════ EL TALLER ═══════════════════════════════ */
  const estado = {
    f: 'guagua', c: 1, n: '', o: [],
    herramienta: 'manga', crema: 1, boquilla: 1,
    id: null,          // si se está editando una de la vitrina
    p: '', d: '', m: '',
  };
  let horneada = null;   // la capa con todo lo ya aplicado
  let enCurso = null;    // la operación que el dedo está haciendo
  let pendiente = false;
  let m = null;

  const receta = () => ({ v: 1, f: estado.f, c: estado.c, n: estado.n, o: estado.o, p: estado.p, d: estado.d, m: estado.m });

  function rehornear() {
    horneada = hornear(estado, W * RES);
    dibujar();
  }
  function dibujar() {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => {
      pendiente = false;
      if (!enCurso) { m.pintar(horneada, estado.o); return; }
      const t = lienzo(horneada.width, horneada.height);
      const tc = t.getContext('2d');
      tc.drawImage(horneada, 0, 0);
      tc.scale(RES, RES);
      aplicar(tc, enCurso);
      m.pintar(t, estado.o);
    });
  }
  function fijar(op) {
    estado.o.push(op);
    const ctx = horneada.getContext('2d');
    ctx.save(); ctx.setTransform(RES, 0, 0, RES, 0, 0);
    aplicar(ctx, op);
    ctx.restore();
    guardarBorrador();
    actualizarEtiqueta();
  }
  function guardarBorrador() {
    almacen.poner(BORRADOR, { f: estado.f, c: estado.c, n: estado.n, o: estado.o, id: estado.id, p: estado.p, d: estado.d, m: estado.m });
  }
  function actualizarEtiqueta() {
    const n = estado.o.length;
    $('#lienzo').setAttribute('aria-label', `${estado.f === 'caballito' ? 'Un caballito' : 'Una guagua'} de pan con ${n} ${n === 1 ? 'decoración' : 'decoraciones'}. Dibuja con el dedo o el ratón para ponerle crema.`);
    $('#deshacer').disabled = !n;
  }

  function taller() {
    m = mesa($('#lienzo'));
    const lz = $('#lienzo');

    lz.addEventListener('pointerdown', (ev) => {
      if (ev.button > 0) return;
      ev.preventDefault();
      lz.setPointerCapture(ev.pointerId);
      const [x, y] = m.punto(ev);
      const h = estado.herramienta;
      if (h === 'manga') enCurso = [0, estado.crema, estado.boquilla, x, y];
      else if (h === 'grageas') enCurso = [2, Math.floor(Math.random() * 1e9), x, y];
      else if (h === 'roseta') { fijar([1, estado.crema, estado.boquilla, x, y]); dibujar(); }
      else if (h === 'mordisco') { fijar([3, x, y]); crunch(); dibujar(); }
      dibujar();
    });
    lz.addEventListener('pointermove', (ev) => {
      if (!enCurso) return;
      const [x, y] = m.punto(ev);
      const lx = enCurso[enCurso.length - 2], ly = enCurso[enCurso.length - 1];
      const min = enCurso[0] === 2 ? 14 : 4;
      if (Math.hypot(x - lx, y - ly) < min) return;
      if (enCurso.length > 1200) { fijar(enCurso); enCurso = enCurso[0] === 0 ? [0, enCurso[1], enCurso[2], lx, ly, x, y] : [2, enCurso[1] + 1, x, y]; }
      else enCurso.push(x, y);
      dibujar();
    });
    const soltar = () => {
      if (!enCurso) return;
      const op = enCurso; enCurso = null;
      fijar(op); dibujar();
    };
    lz.addEventListener('pointerup', soltar);
    lz.addEventListener('pointercancel', soltar);

    // herramientas
    $$('[data-herramienta]').forEach((b) => b.addEventListener('click', () => {
      estado.herramienta = b.dataset.herramienta;
      $$('[data-herramienta]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      $('#taller').dataset.herramienta = estado.herramienta;
    }));
    const cremas = $('#cremas');
    CREMAS.forEach((cr, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'crema';
      b.style.setProperty('--crema', cr.c);
      b.setAttribute('aria-label', cr.n);
      b.setAttribute('aria-pressed', String(i === estado.crema));
      b.title = cr.n;
      b.addEventListener('click', () => {
        estado.crema = i;
        $$('.crema', cremas).forEach((x, j) => x.setAttribute('aria-pressed', String(j === i)));
        if (estado.herramienta !== 'manga' && estado.herramienta !== 'roseta') $('[data-herramienta="manga"]').click();
      });
      cremas.appendChild(b);
    });
    $$('[data-boquilla]').forEach((b) => b.addEventListener('click', () => {
      estado.boquilla = +b.dataset.boquilla;
      $$('[data-boquilla]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    }));
    $$('[data-forma]').forEach((b) => b.addEventListener('click', () => {
      if (estado.f === b.dataset.forma) return;
      if (estado.o.length && !confirm('Cambiar de molde bota la crema que ya pusiste. ¿Seguimos?')) return;
      estado.f = b.dataset.forma; estado.o = [];
      estado.n = elige(NOMBRES[estado.f]);
      sincronizarControles(); rehornear(); guardarBorrador(); actualizarEtiqueta();
    }));
    $$('[data-cara]').forEach((b) => b.addEventListener('click', () => {
      estado.c = +b.dataset.cara;
      sincronizarControles(); rehornear(); guardarBorrador();
    }));

    $('#deshacer').addEventListener('click', deshacer);
    document.addEventListener('keydown', (ev) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z' && !ev.target.closest('input,textarea')) { ev.preventDefault(); deshacer(); }
    });
    $('#sorpresa').addEventListener('click', () => {
      sorpresa().forEach((op) => estado.o.push(op));
      rehornear(); guardarBorrador(); actualizarEtiqueta();
    });
    $('#de-nuevo').addEventListener('click', () => {
      if (estado.o.length && !confirm('¿Botamos esta y sacamos una guagua nueva del horno?')) return;
      nueva();
    });
    $('#regalar').addEventListener('click', abrirRegalo);
    $('#guardar').addEventListener('click', () => {
      guardarMia();
      avisa('Guardada en tu vitrina.', 'ok');
      pintarVitrina('mia');
    });
  }

  function deshacer() {
    if (!estado.o.length) return;
    estado.o.pop();
    rehornear(); guardarBorrador(); actualizarEtiqueta();
  }
  function nueva() {
    Object.assign(estado, { o: [], id: null, n: elige(NOMBRES[estado.f]), p: '', d: estado.d, m: '' });
    sincronizarControles(); rehornear(); guardarBorrador(); actualizarEtiqueta();
  }
  async function guardarMia() {
    if (!estado.id) estado.id = nuevoId();
    guardarEnVitrina({ id: estado.id, t: 'mia', e: await codificar(receta()), f: Date.now() });
    guardarBorrador();
    pintarVitrina();
  }

  function sincronizarControles() {
    $$('[data-forma]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.forma === estado.f)));
    $$('[data-cara]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.cara === estado.c)));
    $('#caras').hidden = estado.f !== 'guagua';
  }

  /* Para el que no se anima: una decoración de panadería, distinta cada vez. */
  function sorpresa() {
    const r = azar(Math.floor(Math.random() * 1e9));
    const col = () => Math.floor(r() * CREMAS.length);
    const ops = [];
    const linea = (c, w, fn, a, b, n) => {
      const op = [0, c, w];
      for (let i = 0; i <= n; i++) { const [x, y] = fn(a + (b - a) * i / n, i); op.push(Math.round(x), Math.round(y)); }
      ops.push(op);
    };
    if (estado.f === 'guagua') {
      const c1 = col(), c2 = col(), c3 = col();
      // el borde de encaje alrededor del cuerpo
      linea(c1, 0, (t) => [300 + Math.cos(t) * (142 + Math.sin(t * 14) * 8), 478 + Math.sin(t) * (208 + Math.sin(t * 14) * 8)],
        Math.PI * .08, Math.PI * .92, 80);
      // el cuello
      linea(c2, 1, (t) => [t, 318 + Math.sin((t - 200) / 200 * Math.PI) * 18], 200, 400, 24);
      // zigzag de la falda
      linea(c3, 1, (t, i) => [t, 560 + (i % 2 ? -16 : 16)], 175, 425, 14);
      for (let x = 196; x <= 404; x += 26) ops.push([1, x % 52 < 26 ? c2 : c1, 0, x, 620 + Math.sin(x) * 2]);
      ops.push([1, col(), 2, 300, 412]);
      const g = [2, Math.floor(r() * 1e9)];
      for (let i = 0; i < 8; i++) g.push(Math.round(240 + r() * 120), Math.round(660 + r() * 30));
      ops.push(g);
      if (!estado.c) { estado.c = 1 + Math.floor(r() * 4); sincronizarControles(); }
    } else {
      const c1 = col(), c2 = col();
      // la montura
      linea(c1, 2, (t) => [t, 380 - Math.sin((t - 210) / 170 * Math.PI) * 30], 210, 380, 20);
      linea(c2, 0, (t) => [t, 420 - Math.sin((t - 200) / 190 * Math.PI) * 32], 200, 390, 24);
      // la crin
      linea(c2, 1, (t, i) => [t + (i % 2 ? 14 : -10), 380 - (t - 410) * 2.7], 412, 462, 12);
      [[180, 580], [251, 592], [367, 592], [438, 580]].forEach(([x, y]) => ops.push([1, col(), 1, x, y]));
      const g = [2, Math.floor(r() * 1e9)];
      for (let i = 0; i < 6; i++) g.push(Math.round(150 + r() * 80), Math.round(400 + r() * 50));
      ops.push(g);
    }
    return ops;
  }

  /* ─── regalar ──────────────────────────────────────────────── */
  let ultimoEnlace = '', ultimaTarjeta = null;
  async function abrirRegalo() {
    const v = veredicto(estado);
    $('#panadera-frase').textContent = v.frase;
    $('#panadera-nota').textContent = 'Nota de la panadera: ' + v.descuento;
    $('#r-nombre').value = estado.n;
    $('#r-para').value = estado.p;
    $('#r-de').value = estado.d || almacen.leer('guagua:firma', '');
    $('#r-mensaje').value = estado.m || elige(MENSAJES);
    window.malDS.abrir('#d-regalar');
    await refrescarTarjeta();
  }
  let reloj = null;
  function leerFormulario() {
    estado.n = $('#r-nombre').value.trim().slice(0, 40);
    estado.p = $('#r-para').value.trim().slice(0, 40);
    estado.d = $('#r-de').value.trim().slice(0, 40);
    estado.m = $('#r-mensaje').value.trim().slice(0, 160);
    if (estado.d) almacen.poner('guagua:firma', estado.d);
  }
  async function refrescarTarjeta() {
    leerFormulario();
    const c = await tarjeta(receta());
    ultimaTarjeta = c;
    const img = $('#r-vista');
    img.src = c.toDataURL('image/jpeg', .82);
    ultimoEnlace = location.origin + location.pathname + '#r=' + await codificar(receta());
    guardarBorrador();
  }
  const textoRegalo = () => {
    const quien = estado.d ? estado.d + ' te regaló' : 'Te regalaron';
    const que = (estado.f === 'caballito' ? 'un caballito de pan' : 'una guagua de pan') + (estado.n ? ' que se llama ' + estado.n : '');
    return `${quien} ${que} por el Día de Difuntos. Ábrela aquí:`;
  };
  function regalo() {
    $$('#d-regalar input, #d-regalar textarea').forEach((x) => x.addEventListener('input', () => {
      clearTimeout(reloj); reloj = setTimeout(refrescarTarjeta, 350);
    }));
    const listo = async () => { clearTimeout(reloj); await refrescarTarjeta(); await guardarMia(); };
    $('#r-compartir').addEventListener('click', async () => {
      await listo();
      const texto = textoRegalo();
      try {
        const blob = await aBlob(ultimaTarjeta);
        const archivo = new File([blob], 'guagua-de-pan.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
          await navigator.share({ files: [archivo], title: 'Una guagua de pan', text: texto + ' ' + ultimoEnlace });
          return;
        }
        if (navigator.share) { await navigator.share({ title: 'Una guagua de pan', text: texto, url: ultimoEnlace }); return; }
      } catch (e) {
        if (e && e.name === 'AbortError') return;
      }
      copiar(ultimoEnlace);
    });
    $('#r-whatsapp').addEventListener('click', async () => {
      await listo();
      window.open('https://wa.me/?text=' + encodeURIComponent(textoRegalo() + ' ' + ultimoEnlace), '_blank', 'noopener');
    });
    $('#r-copiar').addEventListener('click', async () => { await listo(); copiar(ultimoEnlace); });
    $('#r-descargar').addEventListener('click', async () => {
      await listo();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(await aBlob(ultimaTarjeta));
      a.download = 'guagua-' + (estado.n || 'de-pan').toLowerCase().replace(/[^a-z0-9áéíóúñü]+/gi, '-') + '.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    });
  }
  async function copiar(texto) {
    try { await navigator.clipboard.writeText(texto); avisa('Enlace copiado. Pégalo donde quieras.', 'ok'); }
    catch (e) { prompt('Copia el enlace de tu guagua:', texto); }
  }

  /* ══════════════════ LA VITRINA ══════════════════════════════ */
  let pestana = 'mia';
  const fecha = (t) => new Date(t).toLocaleDateString('es-EC', { day: 'numeric', month: 'short' });
  async function pintarVitrina(cual) {
    if (cual) pestana = cual;
    $$('[data-vitrina]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.vitrina === pestana)));
    const rej = $('#vitrina-rej');
    const todas = vitrina();
    const lista = todas.filter((x) => x.t === pestana);
    $('#cuenta-mia').textContent = todas.filter((x) => x.t === 'mia').length;
    $('#cuenta-recibida').textContent = todas.filter((x) => x.t === 'recibida').length;
    rej.textContent = '';
    $('#vitrina-vacia').hidden = !!lista.length;
    $('#vitrina-vacia').textContent = pestana === 'mia'
      ? 'Todavía no has guardado ninguna. La primera siempre sale chueca: es parte de la tradición.'
      : 'Nadie te ha regalado una todavía. Regala tú primero: así funciona el karma de la guagua.';
    for (const item of lista) {
      let e;
      try { e = await decodificar(item.e); } catch (err) { continue; }
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'pieza';
      const c = hornear(e, 240);
      c.className = 'pieza__img'; c.setAttribute('aria-hidden', 'true');
      const t = document.createElement('span'); t.className = 'pieza__nombre';
      t.textContent = e.n || (e.f === 'caballito' ? 'Caballito' : 'Guagua');
      const s = document.createElement('span'); s.className = 'pieza__meta';
      s.textContent = item.t === 'recibida' ? (e.d ? 'de ' + e.d : 'regalada') + ' · ' + fecha(item.f) : (e.p ? 'para ' + e.p + ' · ' : '') + fecha(item.f);
      b.append(c, t, s);
      b.addEventListener('click', () => abrirPieza(item, e));
      rej.appendChild(b);
    }
  }
  let piezaActual = null;
  function abrirPieza(item, e) {
    piezaActual = { item, e };
    $('#p-titulo').textContent = e.n || (e.f === 'caballito' ? 'Caballito' : 'Guagua');
    const quien = [e.p && 'Para ' + e.p, e.d && 'de ' + e.d].filter(Boolean).join(' · ');
    $('#p-quien').textContent = quien;
    $('#p-quien').hidden = !quien;
    $('#p-mensaje').textContent = e.m || '';
    $('#p-mensaje').hidden = !e.m;
    const lz = $('#p-lienzo');
    const pm = mesa(lz);
    pm.pintar(hornear(e, W * RES), e.o);
    $('#p-editar').hidden = item.t !== 'mia';
    window.malDS.abrir('#d-pieza');
  }
  function vitrinaControles() {
    $$('[data-vitrina]').forEach((b) => b.addEventListener('click', () => pintarVitrina(b.dataset.vitrina)));
    $('#p-editar').addEventListener('click', () => {
      const { item, e } = piezaActual;
      Object.assign(estado, { f: e.f, c: e.c, n: e.n, o: e.o, p: e.p, d: e.d, m: e.m, id: item.id });
      sincronizarControles(); rehornear(); guardarBorrador(); actualizarEtiqueta();
      $('#d-pieza').close();
      $('#taller').scrollIntoView({ behavior: quieto ? 'auto' : 'smooth' });
    });
    $('#p-regalar').addEventListener('click', async () => {
      const { item } = piezaActual;
      const enlace = location.origin + location.pathname + '#r=' + item.e;
      if (navigator.share) {
        try { await navigator.share({ title: 'Una guagua de pan', text: 'Te regalo esta guagua de pan por el Día de Difuntos:', url: enlace }); return; }
        catch (err) { if (err && err.name === 'AbortError') return; }
      }
      copiar(enlace);
    });
    $('#p-borrar').addEventListener('click', () => {
      if (!confirm('¿Sacamos esta guagua de la vitrina? No hay vuelta atrás.')) return;
      almacen.poner(CLAVE, vitrina().filter((x) => x.id !== piezaActual.item.id));
      if (estado.id === piezaActual.item.id) estado.id = null;
      $('#d-pieza').close();
      pintarVitrina();
    });
  }

  /* ══════════════════ CUANDO TE LLEGA UNA ═════════════════════ */
  let recibida = null, bocados = [];
  async function recibir(cod) {
    let e;
    try { e = await decodificar(cod); }
    catch (err) { avisa('Esa guagua se rompió en el camino. Pide que te la vuelvan a mandar.', 'error'); return false; }
    recibida = e; bocados = [];
    document.body.classList.add('modo-regalo');
    $('#regalo').hidden = false;
    $('#regalo-titulo').textContent = e.d ? `${e.d} te regaló ${e.f === 'caballito' ? 'un caballito' : 'una guagua'}` : `Te regalaron ${e.f === 'caballito' ? 'un caballito' : 'una guagua'}`;
    $('#regalo-nombre').textContent = '«' + (e.n || (e.f === 'caballito' ? 'Caballito' : 'Guagua')) + '»';
    $('#regalo-para').textContent = e.p ? 'Para ' + e.p : '';
    $('#regalo-para').hidden = !e.p;
    $('#regalo-mensaje').textContent = e.m || '';
    $('#regalo-mensaje').hidden = !e.m;
    const rm = mesa($('#regalo-lienzo'));
    const pintar = () => rm.pintar(hornear(e, W * RES, bocados), e.o.concat(bocados));
    pintar();
    $('#regalo-lienzo').onpointerdown = (ev) => {
      ev.preventDefault();
      if (bocados.length >= 9) return;
      bocados.push([3, ...rm.punto(ev)]);
      crunch(); pintar();
      const n = bocados.length;
      const pista = $('#regalo-pista');
      if (n === 1) pista.textContent = 'Crunch. Otro más.';
      else if (n === 4) pista.textContent = 'Ya va la mitad. ¿Y la colada?';
      else if (n === 7) pista.textContent = 'Deja algo para el resto de la familia.';
      else if (n === 9) {
        pista.textContent = 'Te la acabaste. Ahora te toca regalar una.';
        $('#regalo-devolver').classList.add('latido');
      }
    };
    // a la vitrina, sin preguntar: es tuya
    guardarEnVitrina({ id: nuevoId(), t: 'recibida', e: cod, f: Date.now() });
    pintarVitrina('recibida');
    window.scrollTo(0, 0);
    return true;
  }
  function regaloControles() {
    $('#regalo-devolver').addEventListener('click', () => {
      const para = recibida && recibida.d;
      cerrarRegalo();
      nueva();
      estado.p = para || '';
      guardarBorrador();
      avisa(para ? `Decora una para ${para}.` : 'A decorar la tuya.', 'ok');
    });
    $('#regalo-taller').addEventListener('click', cerrarRegalo);
  }
  function cerrarRegalo() {
    document.body.classList.remove('modo-regalo');
    $('#regalo').hidden = true;
    history.replaceState(null, '', location.pathname);
    $('#taller').scrollIntoView();
  }

  /* ─── arranque ─────────────────────────────────────────────── */
  async function arrancar() {
    $('#cuenta').textContent = rotuloFinados();
    const b = almacen.leer(BORRADOR, null);
    if (b && Array.isArray(b.o)) {
      const s = sano(b);
      Object.assign(estado, s, { id: typeof b.id === 'string' ? b.id : null });
    } else {
      estado.n = elige(NOMBRES.guagua);
    }
    taller(); regalo(); vitrinaControles(); regaloControles();
    sincronizarControles(); rehornear(); actualizarEtiqueta();
    pintarVitrina();
    const leerHash = () => {
      const h = location.hash.match(/^#r=([zj][A-Za-z0-9_-]+)$/);
      if (h) recibir(h[1]);
    };
    leerHash();
    window.addEventListener('hashchange', leerHash);
  }

  window.guagua = { hornear, tarjeta, codificar, decodificar, veredicto, receta, estado, sorpresa };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
})();
