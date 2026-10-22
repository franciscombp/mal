/* ══════════════════════════════════════════════════════════════
   UMBRAL · motor
   Un puzle isométrico de geometría imposible, en un solo <canvas>.

   La idea central: la proyección isométrica aplasta la diagonal
   (1, 1, 1) en un punto. Dos bordes de camino que caen en el mismo
   punto de la pantalla y se VEN tocándose cuentan como conectados,
   aunque en 3D estén lejos. Para saber qué se ve, el motor pinta la
   escena en un lienzo oculto donde cada camino tiene un color-id, y
   mira los píxeles. Ese mismo lienzo sirve para saber qué se tocó.
   ══════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const NIVELES = window.UMBRAL_NIVELES;
  const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lienzo = document.getElementById('lienzo');
  const ctx = lienzo.getContext('2d');
  const idl = document.createElement('canvas');
  const idc = idl.getContext('2d', { willReadFrequently: true });
  const $ = (id) => document.getElementById(id);

  /* ─── vectores ─────────────────────────────────────────────── */
  const v3 = (x, y, z) => ({ x, y, z });
  const suma = (a, b) => v3(a.x + b.x, a.y + b.y, a.z + b.z);
  const resta = (a, b) => v3(a.x - b.x, a.y - b.y, a.z - b.z);
  const escala = (a, k) => v3(a.x * k, a.y * k, a.z * k);
  const mezcla = (a, b, t) => v3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);
  const cruz = (a, b) => v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
  const punto = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
  const unidad = (a) => escala(a, 1 / (Math.hypot(a.x, a.y, a.z) || 1));
  const iguales = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z) < 1e-6;
  const EJES = { x: v3(1, 0, 0), y: v3(0, 1, 0), z: v3(0, 0, 1) };
  const DIRS = { 'x+': v3(1, 0, 0), 'x-': v3(-1, 0, 0), 'y+': v3(0, 1, 0), 'y-': v3(0, -1, 0) };
  const VISTA = unidad(v3(1, 1, 1));
  const LUZ = unidad(v3(0.45, 0.2, 1));

  function girar(v, eje, c, s) {
    if (eje === 'z') return v3(v.x * c - v.y * s, v.x * s + v.y * c, v.z);
    if (eje === 'x') return v3(v.x, v.y * c - v.z * s, v.y * s + v.z * c);
    return v3(v.z * s + v.x * c, v.y, v.z * c - v.x * s);
  }
  function cosSen(grados) {
    // En los ángulos rectos, valores exactos: así las celdas en reposo caen en enteros.
    if (grados % 90 === 0) {
      const k = (((grados / 90) % 4) + 4) % 4;
      return [[1, 0], [0, 1], [-1, 0], [0, -1]][k];
    }
    const a = (grados * Math.PI) / 180;
    return [Math.cos(a), Math.sin(a)];
  }

  /* Transformación de un grupo en su estado `valor` (grados o pasos). */
  function transformador(g, valor) {
    if (!g) return { p: (q) => q, v: (q) => q };
    if (g.tipo === 'gira') {
      const [c, s] = cosSen(valor === undefined ? g.ang : valor);
      const P = v3(...g.piv);
      return { p: (q) => suma(girar(resta(q, P), g.eje, c, s), P), v: (q) => girar(q, g.eje, c, s) };
    }
    const d = escala(EJES[g.eje], valor === undefined ? g.t : valor);
    return { p: (q) => suma(q, d), v: (q) => q };
  }
  const valorDe = (g) => (g.tipo === 'gira' ? g.ang : g.t);
  /* Lleva un punto que estaba en el grupo en el estado a al estado b. */
  function arrastrar(g, a, b, p) {
    if (g.tipo === 'gira') {
      const [c, s] = cosSen(b - a);
      const P = v3(...g.piv);
      return suma(girar(resta(p, P), g.eje, c, s), P);
    }
    return suma(p, escala(EJES[g.eje], b - a));
  }

  /* ─── cámara ───────────────────────────────────────────────── */
  let W = 0, H = 0, DPR = 1, S = 40, OX = 0, OY = 0;
  const proy = (p) => ({ x: OX + (p.x - p.y) * S, y: OY + ((p.x + p.y) / 2 - p.z) * S });
  /* De la pantalla al plano perpendicular a `eje` que pasa por `o`. */
  function desproyectar(sx, sy, eje, o) {
    const a = (sx - OX) / S, b = (sy - OY) / S;
    if (eje === 'z') { const xy = 2 * (b + o.z); return v3((a + xy) / 2, (xy - a) / 2, o.z); }
    if (eje === 'x') { const y = o.x - a; return v3(o.x, y, (o.x + y) / 2 - b); }
    const x = a + o.y; return v3(x, o.y, (x + o.y) / 2 - b);
  }

  /* ─── sólidos ──────────────────────────────────────────────── */
  const CARAS_CAJA = [[4, 5, 7, 6], [0, 2, 3, 1], [1, 3, 7, 5], [0, 4, 6, 2], [2, 6, 7, 3], [0, 1, 5, 4]];
  function caja(x, y, z, w, d, h) {
    const vs = [];
    for (let i = 0; i < 8; i++) vs.push(v3(x + (i & 1) * w, y + ((i >> 1) & 1) * d, z + ((i >> 2) & 1) * h));
    return { vs, caras: CARAS_CAJA };
  }
  function piramide(x, y, z, h) {
    const vs = [v3(x, y, z), v3(x + 1, y, z), v3(x + 1, y + 1, z), v3(x, y + 1, z), v3(x + 0.5, y + 0.5, z + h)];
    return { vs, caras: [[0, 3, 2, 1], [0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4]] };
  }
  /* Una escalera son columnas de alturas crecientes: así se ordenan bien. */
  function escalera(pz) {
    const n = 4, d = DIRS[pz.dir], r = [];
    for (let i = 0; i < n; i++) {
      const a = d.x + d.y > 0 ? i / n : (n - 1 - i) / n;
      const box = d.x !== 0 ? caja(pz.x + a, pz.y, pz.z, 1 / n, 1, (i + 1) / n) : caja(pz.x, pz.y + a, pz.z, 1, 1 / n, (i + 1) / n);
      r.push(box);
    }
    return r;
  }
  function solidosDe(pz) {
    if (pz.t === 'esc') return escalera(pz);
    if (pz.t === 'techo') return [piramide(pz.x, pz.y, pz.z, 0.9)];
    return [caja(pz.x, pz.y, pz.z, 1, 1, 1)];
  }

  /* ─── color ────────────────────────────────────────────────── */
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const rgb = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
  function sombra(base, n) {
    const d = Math.max(0, punto(n, LUZ));
    const k = 0.5 + 0.55 * d;
    return rgb(base.map((v) => Math.min(255, v * k + (d > 0.85 ? 10 : 0))));
  }

  /* ─── estado ───────────────────────────────────────────────── */
  let nivel = null, indice = 0, piezas = [], grupos = {}, paleta = null;
  let nodos = [], porClave = new Map(), metaPz = null, inicioPz = null;
  let quien = null;            // el personaje
  let arrastre = null;         // { g, v0, valor, ... } mientras se mueve una manija
  let animando = null;         // { g, de, a, t, dur }
  let ganado = false, depurar = false, toques = [];
  let tiempo = 0;

  function cargar(i) {
    indice = Math.max(0, Math.min(NIVELES.length - 1, i));
    nivel = NIVELES[indice];
    paleta = Object.fromEntries(Object.entries(nivel.paleta).map(([k, v]) => [k, typeof v === 'string' ? hex(v) : v]));
    document.body.classList.toggle('noche', !!nivel.paleta.noche);
    document.querySelector('meta[name="theme-color"]').content = nivel.paleta.fondo[0];
    grupos = {};
    for (const [id, g] of Object.entries(nivel.grupos)) grupos[id] = { id, ...g };
    piezas = nivel.piezas.map((p, i) => ({ ...p, i, solidos: solidosDe(p) }));
    const es = (pz, c) => pz.t === 'cubo' && pz.x === c[0] && pz.y === c[1] && pz.z === c[2];
    metaPz = piezas.find((pz) => es(pz, nivel.meta));
    inicioPz = piezas.find((pz) => es(pz, nivel.inicio));
    arrastre = animando = null;
    ganado = false;
    toques = [];
    encuadrar();
    construir();
    const n = nodoDePieza(inicioPz);
    quien = { nodo: n, pos: { ...n.pos }, ruta: [], seg: null, mira: 1, paso: 0, brillo: 0 };
    interfaz();
  }

  /* ─── el grafo: qué se puede caminar y qué se ve unido ──────── */
  const claveCelda = (x, y, z) => `${x},${y},${z}`;
  function nodoDePieza(pz) { return nodos.find((n) => n.pz === pz); }

  function construir() {
    const ocup = new Map();
    for (const pz of piezas) {
      const T = transformador(grupos[pz.g]);
      const c = T.p(v3(pz.x + 0.5, pz.y + 0.5, pz.z + 0.5));
      pz.cel = v3(Math.floor(c.x + 1e-6), Math.floor(c.y + 1e-6), Math.floor(c.z + 1e-6));
      if (pz.t === 'esc') {
        const d = T.v(DIRS[pz.dir]);
        pz.dirAct = v3(Math.round(d.x), Math.round(d.y), Math.round(d.z));
        pz.erguida = T.v(EJES.z).z > 0.9 && pz.dirAct.z === 0;
      }
      ocup.set(claveCelda(pz.cel.x, pz.cel.y, pz.cel.z), pz);
    }
    nodos = [];
    porClave = new Map();
    for (const pz of piezas) {
      pz.nodo = null;
      if (pz.pisable === false || pz.t === 'techo') continue;
      const { x, y, z } = pz.cel;
      if (ocup.has(claveCelda(x, y, z + 1))) continue;
      let n;
      if (pz.t === 'cubo') {
        const h = z + 1, cx = x + 0.5, cy = y + 0.5;
        n = { pz, clave: `t:${x},${y},${h}`, pos: v3(cx, cy, h),
          puertos: [v3(x + 1, cy, h), v3(x, cy, h), v3(cx, y + 1, h), v3(cx, y, h)] };
      } else if (pz.t === 'esc' && pz.erguida) {
        const d = pz.dirAct, c = v3(x + 0.5, y + 0.5, z + 0.5);
        n = { pz, clave: `e:${x},${y},${z}`, pos: c,
          puertos: [v3(c.x - d.x / 2, c.y - d.y / 2, z), v3(c.x + d.x / 2, c.y + d.y / 2, z + 1)] };
      } else continue;
      n.id = nodos.length + 1;
      n.vecinos = [];
      pz.nodo = n;
      nodos.push(n);
      porClave.set(n.clave, n);
    }
    pintarIds();
    const cubetas = new Map();
    for (const n of nodos)
      for (const p of n.puertos) {
        const k = `${Math.round((p.x - p.z) * 2)},${Math.round((p.y - p.z) * 2)}`;
        if (!cubetas.has(k)) cubetas.set(k, []);
        cubetas.get(k).push({ n, p });
      }
    for (const lista of cubetas.values())
      for (let i = 0; i < lista.length; i++)
        for (let j = i + 1; j < lista.length; j++) {
          const a = lista[i], b = lista[j];
          if (a.n === b.n) continue;
          const real = iguales(a.p, b.p);
          if (!real && !(seVe(a) && seVe(b))) continue;
          a.n.vecinos.push({ n: b.n, de: a.p, a: b.p, ilusion: !real });
          b.n.vecinos.push({ n: a.n, de: b.p, a: a.p, ilusion: !real });
        }
  }

  /* El borde de un camino se ve si, justo al lado, el píxel es suyo. */
  function seVe({ n, p }) {
    const s = proy(p), c = proy(n.pos);
    return idEn(s.x + (c.x - s.x) * 0.3, s.y + (c.y - s.y) * 0.3) === n.id;
  }
  let idDatos = null;
  function idEn(x, y) {
    x = Math.round(x); y = Math.round(y);
    if (!idDatos || x < 0 || y < 0 || x >= idl.width || y >= idl.height) return 0;
    const k = (y * idl.width + x) * 4, d = idDatos.data;
    if (d[k + 2] !== 200 || d[k + 3] < 255) return 0;
    return (d[k] >> 2) | ((d[k + 1] >> 2) << 6);
  }

  /* ─── la escena como lista de cosas con profundidad ──────────── */
  function escena(conIds) {
    const items = [];
    for (const pz of piezas) {
      const g = grupos[pz.g];
      const T = arrastre && arrastre.g === g ? transformador(g, arrastre.valor)
        : animando && animando.g === g ? transformador(g, animando.valor) : transformador(g);
      const base = paleta[pz.c || 'p'];
      for (const so of pz.solidos) {
        const vs = so.vs.map(T.p);
        let cx = 0, cy = 0, cz = 0;
        for (const v of vs) { cx += v.x; cy += v.y; cz += v.z; }
        const prof = (cx + cy + cz) / vs.length + (pz.zb || 0);
        items.push({ prof, tipo: 'solido', pz, vs, caras: so.caras, base });
      }
    }
    if (!conIds) {
      for (const g of Object.values(grupos)) items.push(manijaItem(g));
      if (metaPz) {
        const T = transformador(grupos[metaPz.g], grupoValor(grupos[metaPz.g]));
        const p = T.p(v3(metaPz.x + 0.5, metaPz.y + 0.5, metaPz.z + 1));
        items.push({ prof: p.x + p.y + p.z + 0.05, tipo: 'meta', p });
      }
      if (quien) {
        const p = quien.pos;
        items.push({ prof: p.x + p.y + p.z + 0.1, tipo: 'quien', p });
      }
    }
    items.sort((a, b) => a.prof - b.prof);
    return items;
  }
  const grupoValor = (g) => (!g ? 0 : arrastre && arrastre.g === g ? arrastre.valor : animando && animando.g === g ? animando.valor : valorDe(g));

  function pintarCaras(c, it, colorDe) {
    for (const cara of it.caras) {
      const a = it.vs[cara[0]], b = it.vs[cara[1]], d = it.vs[cara[2]];
      const n = unidad(cruz(resta(b, a), resta(d, a)));
      if (punto(n, VISTA) <= 1e-4) continue;
      const col = colorDe(n, it);
      c.beginPath();
      cara.forEach((k, j) => { const s = proy(it.vs[k]); j ? c.lineTo(s.x, s.y) : c.moveTo(s.x, s.y); });
      c.closePath();
      c.fillStyle = col;
      c.fill();
      if (!colorDe.sinBorde) { c.strokeStyle = col; c.lineWidth = 0.6; c.stroke(); }
    }
  }

  function pintarIds() {
    idl.width = Math.max(1, Math.round(W));
    idl.height = Math.max(1, Math.round(H));
    idc.clearRect(0, 0, idl.width, idl.height);
    const colorId = (n, it) => {
      const nodo = it.pz.nodo;
      let id = 0;
      if (nodo) {
        if (it.pz.t === 'cubo' && n.z > 0.9) id = nodo.id;
        // En la escalera cuentan huellas y contrahuellas, no los costados.
        if (it.pz.t === 'esc' && (n.z > 0.9 || Math.abs(punto(n, it.pz.dirAct)) > 0.9)) id = nodo.id;
      }
      return `rgb(${(id & 63) << 2},${(id >> 6) << 2},${id ? 200 : 0})`;
    };
    colorId.sinBorde = true;
    for (const it of escena(true)) pintarCaras(idc, it, colorId);
    idDatos = idc.getImageData(0, 0, idl.width, idl.height);
  }

  /* ─── encuadre: que quepa el nivel en todas sus posiciones ──── */
  function estadosDe(g) {
    if (g.tipo === 'gira') {
      const lo = g.min ?? 0, hi = g.max ?? 270, r = [];
      for (let a = lo; a <= hi; a += 90) r.push(a);
      return r;
    }
    const r = [];
    for (let t = g.min; t <= g.max; t++) r.push(t);
    return r;
  }
  function encuadrar() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = lienzo.clientWidth; H = lienzo.clientHeight;
    lienzo.width = Math.round(W * DPR); lienzo.height = Math.round(H * DPR);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const pz of piezas) {
      const g = grupos[pz.g];
      for (const val of g ? estadosDe(g) : [0]) {
        const T = transformador(g, g ? val : undefined);
        for (const so of pz.solidos)
          for (const v of so.vs) {
            const q = T.p(v), sx = q.x - q.y, sy = (q.x + q.y) / 2 - q.z;
            x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy - 1.2); y1 = Math.max(y1, sy);
          }
      }
    }
    const arriba = 70, abajo = 70, lado = 24;
    S = Math.max(14, Math.min(72, (W - lado * 2) / (x1 - x0), (H - arriba - abajo) / (y1 - y0)));
    OX = W / 2 - ((x0 + x1) / 2) * S;
    OY = arriba + (H - arriba - abajo) / 2 - ((y0 + y1) / 2) * S;
  }

  /* ─── manijas ──────────────────────────────────────────────── */
  function manijaPos(g) {
    if (g.tipo === 'gira') return v3(...g.manija);
    return transformador(g, grupoValor(g)).p(v3(...g.manija));
  }
  function manijaItem(g) {
    const p = manijaPos(g);
    return { prof: p.x + p.y + p.z + 0.2, tipo: 'manija', g, p };
  }
  function pintarManija(it) {
    const g = it.g, p = it.p, acento = rgb(paleta.o), claro = rgb(paleta.p);
    ctx.save();
    if (g.tipo === 'gira') {
      const r = g.radio || 0.8, val = grupoValor(g);
      const e = EJES[g.eje];
      const u = g.eje === 'z' ? EJES.x : g.eje === 'x' ? EJES.y : EJES.z;
      const w = cruz(e, u);
      const anillo = [];
      for (let k = 0; k <= 32; k++) {
        const a = (k / 32) * Math.PI * 2;
        anillo.push(proy(suma(p, suma(escala(u, Math.cos(a) * r), escala(w, Math.sin(a) * r)))));
      }
      ctx.beginPath();
      anillo.forEach((s, j) => (j ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y)));
      ctx.lineWidth = Math.max(3, S * 0.12);
      ctx.strokeStyle = acento;
      ctx.stroke();
      const [c, s] = cosSen(val);
      for (let k = 0; k < 4; k++) {
        const [ck, sk] = cosSen(k * 90);
        const dir = suma(escala(u, c * ck - s * sk), escala(w, s * ck + c * sk));
        const a = proy(p), b = proy(suma(p, escala(dir, r)));
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        ctx.lineWidth = Math.max(2, S * 0.06); ctx.stroke();
        const pomo = proy(suma(p, escala(dir, r * 1.18)));
        if (k === 0) {
          ctx.beginPath(); ctx.arc(pomo.x, pomo.y, Math.max(4, S * 0.13), 0, Math.PI * 2);
          ctx.fillStyle = claro; ctx.fill(); ctx.stroke();
        }
      }
      const cs = proy(p);
      ctx.beginPath(); ctx.arc(cs.x, cs.y, Math.max(3, S * 0.09), 0, Math.PI * 2);
      ctx.fillStyle = acento; ctx.fill();
    } else {
      const s = proy(p), r = Math.max(7, S * 0.22);
      ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.fillStyle = claro; ctx.fill();
      ctx.lineWidth = Math.max(2.5, S * 0.08); ctx.strokeStyle = acento; ctx.stroke();
      const d = proy(suma(p, EJES[g.eje])), dx = d.x - s.x, dy = d.y - s.y, l = Math.hypot(dx, dy);
      ctx.lineWidth = Math.max(1.5, S * 0.04);
      for (const k of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s.x + (dx / l) * r * 0.35 * k - (dy / l) * r * 0.45, s.y + (dy / l) * r * 0.35 * k + (dx / l) * r * 0.45);
        ctx.lineTo(s.x + (dx / l) * r * 0.35 * k + (dy / l) * r * 0.45, s.y + (dy / l) * r * 0.35 * k - (dx / l) * r * 0.45);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  function manijaEn(x, y) {
    let mejor = null, dmin = Infinity;
    for (const g of Object.values(grupos)) {
      const s = proy(manijaPos(g));
      const alcance = g.tipo === 'gira' ? (g.radio || 0.8) * S * 1.35 + 10 : S * 0.45 + 12;
      const d = Math.hypot(x - s.x, y - s.y);
      if (d < alcance && d < dmin) { dmin = d; mejor = g; }
    }
    return mejor;
  }

  /* ─── el personaje ─────────────────────────────────────────── */
  function pintarQuien(p) {
    const s = proy(p), k = S / 48;
    const bob = quien.seg ? Math.abs(Math.sin(quien.paso * Math.PI)) * 2.5 * k : Math.sin(tiempo * 2) * 0.6 * k;
    const sube = quien.brillo * 30 * k;
    ctx.save();
    ctx.translate(s.x, s.y - bob - sube);
    ctx.scale(quien.mira * k, k);
    ctx.globalAlpha = 1 - quien.brillo * 0.8;
    ctx.fillStyle = 'rgba(0,0,0,.12)';
    ctx.beginPath(); ctx.ellipse(0, bob / k + sube / k, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
    // túnica
    ctx.fillStyle = '#fbfaf7';
    ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.lineTo(3.5, -24); ctx.lineTo(-3.5, -24); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e4e0d8';
    ctx.beginPath(); ctx.moveTo(1, 0); ctx.lineTo(9, 0); ctx.lineTo(3.5, -24); ctx.lineTo(1, -24); ctx.closePath(); ctx.fill();
    // bufanda
    ctx.fillStyle = rgb(paleta.o);
    ctx.fillRect(-4.5, -25, 9, 3.5);
    ctx.beginPath(); ctx.moveTo(-4, -22); ctx.lineTo(-9, -15); ctx.lineTo(-6, -14); ctx.lineTo(-1.5, -22); ctx.fill();
    // cabeza
    ctx.fillStyle = '#fbfaf7';
    ctx.beginPath(); ctx.arc(0, -29, 5, 0, Math.PI * 2); ctx.fill();
    // gorro
    ctx.beginPath(); ctx.moveTo(-6, -30); ctx.lineTo(6, -30); ctx.lineTo(0.5, -46); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e4e0d8';
    ctx.beginPath(); ctx.moveTo(1, -30); ctx.lineTo(6, -30); ctx.lineTo(0.5, -46); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2b2a33';
    ctx.beginPath(); ctx.arc(2.2, -28.5, 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function pintarMeta(p) {
    const s = proy(p);
    const pulso = quieto ? 0.6 : 0.5 + 0.5 * Math.sin(tiempo * 2.4);
    ctx.save();
    const esq = [v3(-0.32, -0.32, 0), v3(0.32, -0.32, 0), v3(0.32, 0.32, 0), v3(-0.32, 0.32, 0)].map((d) => proy(suma(p, d)));
    ctx.beginPath(); esq.forEach((q, j) => (j ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.closePath();
    ctx.fillStyle = `rgba(255,255,255,${0.55 + 0.35 * pulso})`;
    ctx.fill();
    const alto = S * 1.6;
    const grad = ctx.createLinearGradient(0, s.y, 0, s.y - alto);
    grad.addColorStop(0, `rgba(255,255,255,${0.35 + 0.25 * pulso})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(esq[3].x, esq[3].y); ctx.lineTo(esq[0].x, esq[0].y); ctx.lineTo(esq[1].x, esq[1].y);
    ctx.lineTo(esq[1].x, esq[1].y - alto); ctx.lineTo(esq[3].x, esq[3].y - alto);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  /* ─── dibujo ───────────────────────────────────────────────── */
  function pintar() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const [f0, f1] = paleta.fondo;
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, f0); grad.addColorStop(1, f1);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.beginPath(); ctx.arc(W * 0.78, H * 0.22, Math.min(W, H) * 0.16, 0, Math.PI * 2); ctx.fill();

    const colorCara = (n, it) => sombra(it.base, n);
    for (const it of escena(false)) {
      if (it.tipo === 'solido') pintarCaras(ctx, it, colorCara);
      else if (it.tipo === 'manija') pintarManija(it);
      else if (it.tipo === 'meta') pintarMeta(it.p);
      else if (it.tipo === 'quien') pintarQuien(it.p);
    }
    for (const t of toques) {
      ctx.strokeStyle = `rgba(255,255,255,${1 - t.t})`;
      ctx.lineWidth = 2;
      const r = 0.2 + t.t * 0.3;
      const esq = [v3(-r, -r, 0), v3(r, -r, 0), v3(r, r, 0), v3(-r, r, 0)].map((d) => proy(suma(t.p, d)));
      ctx.beginPath(); esq.forEach((q, j) => (j ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.closePath(); ctx.stroke();
    }
    if (depurar) pintarDepuracion();
  }

  function pintarDepuracion() {
    ctx.save();
    ctx.lineWidth = 2;
    for (const n of nodos) {
      const a = proy(n.pos);
      for (const v of n.vecinos) {
        const b = proy(v.n.pos);
        ctx.strokeStyle = v.ilusion ? '#ff2d7a' : '#1f6feb';
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(a.x, a.y, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  /* ─── caminar ──────────────────────────────────────────────── */
  function ruta(desde, hasta) {
    if (desde === hasta) return [];
    const previo = new Map([[desde, null]]), cola = [desde];
    while (cola.length) {
      const n = cola.shift();
      for (const v of n.vecinos) {
        if (previo.has(v.n)) continue;
        previo.set(v.n, n);
        if (v.n === hasta) {
          const r = [];
          for (let k = hasta; k !== desde; k = previo.get(k)) r.unshift(k);
          return r;
        }
        cola.push(v.n);
      }
    }
    return null;
  }

  function siguienteTramo() {
    const sig = quien.ruta.shift();
    if (!sig) { quien.seg = null; llegar(); return; }
    const v = quien.nodo.vecinos.find((e) => e.n === sig);
    if (!v) { quien.ruta = []; quien.seg = null; return; }
    const l1 = Math.hypot(...Object.values(resta(v.de, quien.nodo.pos)));
    const l2 = Math.hypot(...Object.values(resta(sig.pos, v.a)));
    quien.seg = { de: quien.nodo, a: sig, p0: quien.nodo.pos, p1: v.de, p2: v.a, p3: sig.pos, t: 0, l1, l2 };
    const d = resta(sig.pos, quien.nodo.pos);
    const sx = d.x - d.y;
    if (Math.abs(sx) > 0.01) quien.mira = sx > 0 ? 1 : -1;
    sonido.paso(v.ilusion);
  }

  function avanzar(dt) {
    const seg = quien.seg;
    if (!seg) return;
    const vel = 3.2;
    seg.t += (dt * vel) / (seg.l1 + seg.l2);
    quien.paso += dt * 3.2;
    const corte = seg.l1 / (seg.l1 + seg.l2);
    if (seg.t < corte) quien.pos = mezcla(seg.p0, seg.p1, seg.t / corte);
    else quien.pos = mezcla(seg.p2, seg.p3, Math.min(1, (seg.t - corte) / (1 - corte)));
    if (seg.t >= 1) {
      quien.nodo = seg.a;
      quien.pos = { ...seg.a.pos };
      if (quien.pendiente) {
        const r = ruta(quien.nodo, quien.pendiente);
        quien.pendiente = null;
        if (r) quien.ruta = r;
      }
      siguienteTramo();
    }
  }

  function llegar() {
    if (!ganado && metaPz && quien.nodo.pz === metaPz) {
      ganado = true;
      sonido.ganar();
      guardarAvance(indice + 1);
      setTimeout(() => { $('fin').hidden = false; $('fin-siguiente').focus(); }, quieto ? 200 : 1400);
      interfaz();
    }
  }

  function irA(n) {
    if (ganado || !n) return;
    if (quien.seg) { quien.pendiente = n; return; }
    const r = ruta(quien.nodo, n);
    toques.push({ p: n.pos, t: 0 });
    if (!r) { sonido.no(); return; }
    quien.ruta = r;
    siguienteTramo();
  }

  /* ─── mover grupos ─────────────────────────────────────────── */
  const montado = (g) => quien && quien.nodo && quien.nodo.pz.g === g.id;

  function soltar(a, destino) {
    const g = a.g;
    const dur = quieto ? 0.01 : 0.18 + Math.min(0.35, Math.abs(destino - a.valor) / (g.tipo === 'gira' ? 360 : 6));
    animando = { g, de: a.valor, a: destino, valor: a.valor, t: 0, dur, v0: a.v0, pos0: a.pos0, lleva: a.lleva };
  }

  /* Tras moverse, el personaje busca el nodo que ahora tiene debajo. */
  function recolocar(p) {
    let mejor = null, d = Infinity;
    for (const n of nodos) {
      const e = Math.hypot(n.pos.x - p.x, n.pos.y - p.y, n.pos.z - p.z);
      if (e < d) { d = e; mejor = n; }
    }
    if (mejor) quien.nodo = mejor;
  }

  /* ─── entrada ──────────────────────────────────────────────── */
  function xy(e) { const r = lienzo.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }

  lienzo.addEventListener('pointerdown', (e) => {
    sonido.despertar();
    if (ganado || animando) return;
    const [x, y] = xy(e);
    const g = manijaEn(x, y);
    if (g && !quien.seg) {
      lienzo.setPointerCapture(e.pointerId);
      const v0 = valorDe(g);
      arrastre = { g, v0, valor: v0, x0: x, y0: y, movido: false, pos0: { ...quien.pos }, lleva: montado(g) };
      if (g.tipo === 'gira') {
        arrastre.a0 = anguloEn(g, desproyectar(x, y, g.eje, v3(...g.manija)));
      }
      return;
    }
    const id = idEn(x, y);
    let n = id ? nodos.find((k) => k.id === id) : null;
    if (!n) {
      let d = S * 0.7;
      for (const k of nodos) {
        const s = proy(k.pos), e2 = Math.hypot(s.x - x, s.y - y);
        if (e2 < d) { d = e2; n = k; }
      }
    }
    irA(n);
  });

  function anguloEn(g, q) {
    const d = resta(q, v3(...g.manija));
    if (g.eje === 'z') return Math.atan2(d.y, d.x);
    if (g.eje === 'x') return Math.atan2(d.z, d.y);
    return Math.atan2(d.x, d.z);
  }

  lienzo.addEventListener('pointermove', (e) => {
    const [x, y] = xy(e);
    if (!arrastre) {
      lienzo.style.cursor = manijaEn(x, y) ? 'grab' : 'pointer';
      return;
    }
    lienzo.style.cursor = 'grabbing';
    const a = arrastre, g = a.g;
    if (Math.hypot(x - a.x0, y - a.y0) > 4) a.movido = true;
    let val;
    if (g.tipo === 'gira') {
      const q = desproyectar(x, y, g.eje, v3(...g.manija));
      let d = ((anguloEn(g, q) - a.a0) * 180) / Math.PI;
      d = ((d + 540) % 360) - 180;
      // Acumula vueltas: si el ángulo salta de -180 a 180, sigue la cuenta.
      if (a.ultimo !== undefined) {
        while (d - a.ultimo > 180) d -= 360;
        while (d - a.ultimo < -180) d += 360;
      }
      a.ultimo = d;
      val = a.v0 + d;
      if (a.lleva && g.eje !== 'z') val = a.v0 + Math.max(-8, Math.min(8, d * 0.15));
      if (g.min !== undefined) val = Math.max(g.min - 8, Math.min(g.max + 8, val));
    } else {
      const s0 = proy(v3(0, 0, 0)), s1 = proy(EJES[g.eje]);
      const ax = s1.x - s0.x, ay = s1.y - s0.y;
      val = a.v0 + ((x - a.x0) * ax + (y - a.y0) * ay) / (ax * ax + ay * ay);
      val = Math.max(g.min - 0.15, Math.min(g.max + 0.15, val));
    }
    a.valor = val;
    if (a.lleva) quien.pos = arrastrar(g, a.v0, val, a.pos0);
  });

  function finArrastre() {
    if (!arrastre) return;
    const a = arrastre, g = a.g;
    arrastre = null;
    lienzo.style.cursor = 'pointer';
    let destino;
    if (g.tipo === 'gira') {
      if (!a.movido) destino = g.min !== undefined ? (a.v0 === g.max ? g.min : g.max) : a.v0 + 90;
      else destino = Math.round(a.valor / 90) * 90;
      if (a.lleva && g.eje !== 'z') { destino = a.v0; sonido.no(); }
      if (g.min !== undefined) destino = Math.max(g.min, Math.min(g.max, destino));
    } else {
      destino = Math.max(g.min, Math.min(g.max, Math.round(a.valor)));
    }
    soltar(a, destino);
  }
  lienzo.addEventListener('pointerup', finArrastre);
  lienzo.addEventListener('pointercancel', finArrastre);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'd' && e.altKey) { depurar = !depurar; }
    if (e.key === 'r' && !e.metaKey && !e.ctrlKey) cargar(indice);
  });

  /* ─── bucle ────────────────────────────────────────────────── */
  let antes = performance.now();
  function cuadro(ahora) {
    const dt = Math.min(0.05, (ahora - antes) / 1000);
    antes = ahora;
    tiempo += dt;
    if (animando) {
      const an = animando;
      an.t = Math.min(1, an.t + dt / an.dur);
      const k = 1 - Math.pow(1 - an.t, 3);
      an.valor = an.de + (an.a - an.de) * k;
      if (an.lleva) quien.pos = arrastrar(an.g, an.v0, an.valor, an.pos0);
      if (an.t >= 1) {
        animando = null;
        asentarDesde(an);
      }
    }
    avanzar(dt);
    if (ganado) quien.brillo = Math.min(1, quien.brillo + dt * 0.8);
    toques = toques.filter((t) => (t.t += dt * 2) < 1);
    pintar();
    requestAnimationFrame(cuadro);
  }
  /* Al terminar de soltar: fija el valor y lleva al pasajero. */
  function asentarDesde(an) {
    const g = an.g;
    const lleva = an.lleva;
    const pos = lleva ? arrastrar(g, an.v0, an.a, an.pos0) : null;
    if (g.tipo === 'gira') g.ang = g.min === undefined ? ((an.a % 360) + 360) % 360 : an.a;
    else g.t = an.a;
    construir();
    if (lleva) recolocar(pos);
    else quien.nodo = porClave.get(quien.nodo.clave) || quien.nodo;
    quien.pos = { ...quien.nodo.pos };
    if (an.a !== an.v0) sonido.encaje();
  }

  /* ─── sonido: unas notas suaves, nada más ───────────────────── */
  const sonido = (() => {
    let ac = null, activo = true, nota = 0;
    const escala5 = [0, 2, 4, 7, 9, 12, 14, 16];
    try { activo = localStorage.getItem('umbral.sonido') !== 'no'; } catch (e) { /* sin almacenamiento */ }
    function tono(f, dur, vol, tipo = 'sine', retraso = 0) {
      if (!ac || !activo) return;
      const t = ac.currentTime + retraso, o = ac.createOscillator(), gn = ac.createGain();
      o.type = tipo; o.frequency.value = f;
      gn.gain.setValueAtTime(0, t);
      gn.gain.linearRampToValueAtTime(vol, t + 0.02);
      gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(gn).connect(ac.destination);
      o.start(t); o.stop(t + dur + 0.05);
    }
    const f = (semi) => 392 * Math.pow(2, semi / 12);
    return {
      despertar() {
        if (ac) return;
        try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; }
      },
      paso(ilusion) {
        nota = (nota + 1 + (Math.random() * 2 | 0)) % escala5.length;
        tono(f(escala5[nota]), ilusion ? 0.9 : 0.35, ilusion ? 0.06 : 0.025);
        if (ilusion) tono(f(escala5[nota] + 7), 1.1, 0.035, 'sine', 0.08);
      },
      encaje() { tono(f(-5), 0.25, 0.05, 'triangle'); tono(f(0), 0.4, 0.03, 'sine', 0.05); },
      no() { tono(f(-7), 0.18, 0.03, 'triangle'); },
      ganar() { [0, 4, 7, 12, 16].forEach((s, i) => tono(f(s), 1.6, 0.04, 'sine', i * 0.12)); },
      get activo() { return activo; },
      alternar() {
        activo = !activo;
        try { localStorage.setItem('umbral.sonido', activo ? 'si' : 'no'); } catch (e) { /* sin almacenamiento */ }
        return activo;
      },
    };
  })();

  /* ─── avance e interfaz ────────────────────────────────────── */
  function avance() {
    try { return Math.max(0, parseInt(localStorage.getItem('umbral.avance') || '0', 10) || 0); } catch (e) { return 0; }
  }
  function guardarAvance(n) {
    try { if (n > avance()) localStorage.setItem('umbral.avance', String(n)); } catch (e) { /* sin almacenamiento */ }
  }
  const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  function interfaz() {
    $('nivel-num').textContent = ROMANOS[indice] || String(indice + 1);
    $('nivel-nombre').textContent = nivel.nombre;
    const pista = $('pista');
    pista.textContent = nivel.pista;
    pista.classList.remove('ver');
    void pista.offsetWidth;
    pista.classList.add('ver');
    const lista = $('niveles');
    const hasta = Math.max(avance(), indice);
    lista.replaceChildren(...NIVELES.map((nv, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = ROMANOS[i] || String(i + 1);
      b.title = nv.nombre;
      b.setAttribute('aria-label', `Nivel ${i + 1}: ${nv.nombre}`);
      if (i === indice) b.setAttribute('aria-current', 'true');
      b.disabled = i > hasta;
      b.addEventListener('click', () => cargar(i));
      return b;
    }));
    $('fin').hidden = true;
    const ultimo = indice === NIVELES.length - 1;
    $('fin-titulo').textContent = ultimo ? 'Fin del camino' : 'Umbral cruzado';
    $('fin-texto').textContent = ultimo ? 'Gracias por mirar con atención.' : `Has terminado «${nivel.nombre}».`;
    $('fin-siguiente').textContent = ultimo ? 'Volver a empezar' : 'Siguiente';
    $('sonido').setAttribute('aria-pressed', String(sonido.activo));
  }
  $('fin-siguiente').addEventListener('click', () => cargar(indice === NIVELES.length - 1 ? 0 : indice + 1));
  $('reiniciar').addEventListener('click', () => cargar(indice));
  $('sonido').addEventListener('click', () => { sonido.despertar(); $('sonido').setAttribute('aria-pressed', String(sonido.alternar())); });

  let espera = null;
  window.addEventListener('resize', () => {
    clearTimeout(espera);
    espera = setTimeout(() => {
      encuadrar();
      if (!arrastre && !animando) {
        const clave = quien.nodo.clave;
        construir();
        quien.nodo = porClave.get(clave) || quien.nodo;
      }
    }, 80);
  });

  /* ─── para pruebas: resolver por fuerza bruta ──────────────── */
  function resolver() {
    const gs = Object.values(grupos);
    const guardado = gs.map(valorDe);
    const fijar = (cfg) => { gs.forEach((g, i) => (g.tipo === 'gira' ? (g.ang = cfg[i]) : (g.t = cfg[i]))); construir(); };
    const alcanzables = (n) => { const r = new Set([n]), c = [n]; while (c.length) for (const v of c.shift().vecinos) if (!r.has(v.n)) { r.add(v.n); c.push(v.n); } return r; };
    const inicio = { cfg: guardado.slice(), clave: quien.nodo.clave };
    const visto = new Set(), cola = [{ ...inicio, pasos: [] }];
    let resultado = null;
    while (cola.length && !resultado) {
      const e = cola.shift();
      const k = e.cfg.join('|') + '#' + e.clave;
      if (visto.has(k)) continue;
      visto.add(k);
      fijar(e.cfg);
      const n = porClave.get(e.clave);
      if (!n) continue;
      const zona = alcanzables(n);
      if ([...zona].some((m) => m.pz === metaPz)) { resultado = [...e.pasos, 'caminar a la meta']; break; }
      for (const m of zona) {
        gs.forEach((g, i) => {
          for (const val of estadosDe(g)) {
            if (val === e.cfg[i]) continue;
            const encima = m.pz.g === g.id;
            if (encima && g.tipo === 'gira' && g.eje !== 'z') continue;
            const cfg = e.cfg.slice(); cfg[i] = val;
            let clave = m.clave;
            if (encima) {
              const p = arrastrar(g, e.cfg[i], val, m.pos), z = Math.round(p.z * 2) / 2;
              clave = `${z % 1 ? 'e' : 't'}:${Math.floor(p.x)},${Math.floor(p.y)},${Math.floor(z)}`;
            }
            cola.push({ cfg, clave, pasos: [...e.pasos, `ir a ${m.clave}`, `${g.id} → ${val}`] });
          }
        });
      }
    }
    fijar(guardado);
    return resultado;
  }

  window.umbral = {
    cargar, resolver,
    get nodos() { return nodos; },
    get grupos() { return grupos; },
    get quien() { return quien; },
    get indice() { return indice; },
    proy, irA, idEn,
    depurar(v) { depurar = v; },
  };

  const params = new URLSearchParams(location.search);
  const pedido = parseInt(params.get('nivel') || '', 10);
  cargar(Number.isFinite(pedido) ? pedido - 1 : Math.min(avance(), NIVELES.length - 1));
  requestAnimationFrame(cuadro);
})();
