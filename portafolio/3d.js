// Fran en 3D: el mismo Quito de la versión en papel, ahora de bulto. Cielo rosado, sol rojo,
// el volcán nevado y las lomas detrás; la calle con sus casas y faroles; y las seis salas del
// papel como edificios: la presentación, la fábrica del trabajo, la casa de la escritura, el
// muro de proyectos, el café de la mentoría y el sistema con la puerta de salida. Las casas,
// árboles, nubes y pájaros de alrededor se generan con una semilla.
// Flechas / WASD caminar (como en papel: ← → por la calle), Mayús correr, E / Enter abrir,
// 1–6 salas, arrastrar para mirar, tocar el suelo para ir caminando hasta ahí.
import * as THREE from "three";

const $ = (s) => document.querySelector(s);
const piezas = [...document.querySelectorAll("#piezas article")];
const MOVIL = matchMedia("(max-width: 640px)").matches;
const TACTIL = matchMedia("(pointer: coarse)").matches;
const QUIETO = matchMedia("(prefers-reduced-motion: reduce)").matches;
const salas = [...new Set(piezas.map((a) => a.dataset.sala))];
const C = { tinta: "#2b2925", tinta2: "#5b5852", papel: "#f3eee6", papel2: "#e9e3d9", gris: "#d8d2c9", gris2: "#c4bdb3", rojo: "#d33b2c", negro: "#1f1e1c", blanco: "#fbf9f5", luz: "#ecd2c0" };
// dónde empieza cada sala por la calle (eje x) y dónde queda cada pieza (frente a su objeto)
const X = { presentacion: 0, trabajo: 30, escritura: 72, proyectos: 108, mentoria: 146, sistema: 180 };
const SITIO = {
  perfil: [0, -3.2, 7.6], deuna: [33, -3.6, 5.3], kiosk: [41, -3.6, 5.8], control: [49, -3.6, 5.4],
  mercio: [73, -3.6, 4.4], newsletters: [82.75, -4.8, 6.6], juegos: [105.4, -4.8, 4.9], apps: [122, -3.6, 5.4],
  mentoria: [149, -3.4, 3.4], sistema: [180.5, -4, 4.4], salida: [193, -4.8, 6.3],
};
piezas.forEach((a) => { const s = SITIO[a.id] || [0, -3, 4]; a.px = s[0]; a.pz = s[1]; a.py = s[2]; });
const LIM = { x0: -16, x1: 208, z0: -2.1, z1: 12 };

function azar(semilla) { return () => { semilla |= 0; semilla = semilla + 0x6d2b79f5 | 0; let t = Math.imul(semilla ^ semilla >>> 15, 1 | semilla); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rnd = azar(2010);
const entre = (a, b) => a + rnd() * (b - a);

let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: $("#escena"), antialias: true, alpha: false, powerPreference: "high-performance" }); } catch (e) { renderer = null; }
if (!renderer) document.body.classList.add("sin-3d"); else arrancar();

async function arrancar() {
  // los letreros se pintan con las fuentes del papel: hay que esperarlas (sin colgarse si no llegan)
  await Promise.race([
    Promise.all(['800 100px "Syne"', '600 30px "JetBrains Mono"', 'italic 40px "PT Serif"', '700 40px "Inter"'].map((f) => document.fonts.load(f))).catch(() => {}),
    new Promise((r) => setTimeout(r, 2500)),
  ]);
  renderer.setPixelRatio(Math.min(devicePixelRatio, MOVIL ? 1.6 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const escena = new THREE.Scene();
  const NIEBLA = new THREE.Color("#efe3da");
  escena.fog = new THREE.FogExp2(NIEBLA, MOVIL ? .0065 : .0052);
  const camara = new THREE.PerspectiveCamera(MOVIL ? 50 : 36, 1, .1, 1400);
  escena.add(new THREE.HemisphereLight("#ffffff", "#d9cec2", 2.5));
  const sol = new THREE.DirectionalLight("#fff3e8", 1.5); sol.position.set(30, 60, 45); escena.add(sol);

  // ── material y trazo de papel ──
  const mats = new Map();
  const mat = (c, extra = {}) => { const k = c + JSON.stringify(extra); if (!mats.has(k)) mats.set(k, new THREE.MeshLambertMaterial({ color: c, ...extra })); return mats.get(k); };
  const LINEA = new THREE.LineBasicMaterial({ color: C.tinta });
  const LINEA_SUAVE = new THREE.LineBasicMaterial({ color: "#a39c92" });
  const CASCO = new THREE.MeshBasicMaterial({ color: C.tinta, side: THREE.BackSide });
  const borde = (m, suave = false) => { m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 25), suave ? LINEA_SUAVE : LINEA)); return m; };
  const casco = (m, g = .06) => { const c = new THREE.Mesh(m.geometry, CASCO); c.scale.setScalar(1 + g); m.add(c); return m; };
  const poner = (m, padre) => { (padre || escena).add(m); return m; };
  // caja apoyada en y (no centrada), con su trazo
  function caja(w, h, d, color, x, y, z, { padre, sinBorde, suave } = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color)); m.position.set(x, y + h / 2, z);
    if (!sinBorde) borde(m, suave); return poner(m, padre);
  }
  function cil(rArriba, rAbajo, h, color, x, y, z, { seg = 18, padre, trazo = true } = {}) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rArriba, rAbajo, h, seg), mat(color)); m.position.set(x, y + h / 2, z);
    if (trazo) borde(m); return poner(m, padre);
  }
  function prisma(puntos, fondo, color, x, y, z, { padre, rotY = 0 } = {}) {
    const forma = new THREE.Shape(puntos.map(([a, b]) => new THREE.Vector2(a, b)));
    const g = new THREE.ExtrudeGeometry(forma, { depth: fondo, bevelEnabled: false }); g.translate(0, 0, -fondo / 2);
    const m = new THREE.Mesh(g, mat(color)); m.position.set(x, y, z); m.rotation.y = rotY; borde(m); return poner(m, padre);
  }
  const linea = (pts, material = LINEA, padre) => poner(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(...p))), material), padre);

  // ── letreros pintados en canvas, con las fuentes del papel ──
  function lienzo(w, h, pintar) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const x = c.getContext("2d"); pintar(x, w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  function cartel(w, h, tex, x, y, z, { padre, rotY = 0, opaco = false } = {}) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: !opaco, fog: true }));
    m.position.set(x, y, z); m.rotation.y = rotY; return poner(m, padre);
  }
  const fuente = { mono: (px, peso = 600) => `${peso} ${px}px "JetBrains Mono", ui-monospace, monospace`, display: (px) => `800 ${px}px "Syne", "Arial Black", sans-serif`, serif: (px) => `italic ${px}px "PT Serif", Georgia, serif`, texto: (px, peso = 700) => `${peso} ${px}px "Inter", system-ui, sans-serif` };
  function escribir(x, texto, px, py, { f, color = C.tinta, espacio = 0, alinear = "left", ancho = 1, max = 0 } = {}) {
    x.save(); x.font = f; x.fillStyle = color; x.textAlign = alinear; x.textBaseline = "alphabetic";
    if ("letterSpacing" in x) x.letterSpacing = espacio + "px";
    if (max) ancho = Math.min(ancho, max / x.measureText(texto).width);
    x.translate(px, py); x.scale(ancho, 1); x.fillText(texto, 0, 0); x.restore();
  }
  // el titular de cada sala, como en el papel: número, nombre grande, bajada en cursiva y nota
  const titular = (kicker, titulo, bajada, nota, lineas = 1) => lienzo(1024, 520 + (lineas - 1) * 160, (x) => {
    const extra = (lineas - 1) * 160;
    escribir(x, kicker, 8, 60, { f: fuente.mono(30), color: C.tinta2, espacio: 6 });
    [].concat(titulo).forEach((l, i) => escribir(x, l, 4, 220 + i * 160, { f: fuente.display(150), ancho: 1.12, max: 1010 }));
    if (lineas > 1) { x.fillStyle = C.rojo; x.fillRect(8, 250 + extra, 120, 8); }
    if (bajada) escribir(x, bajada, 8, 320 + extra, { f: fuente.serif(46), color: C.tinta2 });
    if (nota) escribir(x, nota, 8, 410 + extra, { f: fuente.mono(26), color: C.tinta2, espacio: 5 });
  });
  const etiqueta = (nombre, rubro) => lienzo(512, 240, (x, w, h) => {
    x.fillStyle = C.blanco; x.fillRect(0, 0, w, h);
    escribir(x, nombre, w / 2, 112, { f: fuente.texto(60), alinear: "center" });
    escribir(x, rubro, w / 2, 182, { f: fuente.mono(28), color: C.tinta2, espacio: 6, alinear: "center" });
  });

  // ── el cielo, el sol, el volcán y las lomas: el fondo del papel ──
  // el cielo es un degradado de pantalla, como el del papel: rosado arriba, blanquecino al horizonte
  escena.background = lienzo(4, 512, (x) => { const g = x.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, "#e9c2b4"); g.addColorStop(.55, "#f0dcd3"); g.addColorStop(1, "#efe3da"); x.fillStyle = g; x.fillRect(0, 0, 4, 512); });
  const disco = (color, r) => lienzo(256, 256, (x) => { x.fillStyle = color; x.beginPath(); x.arc(128, 128, r, 0, Math.PI * 2); x.fill(); });
  const solRojo = new THREE.Sprite(new THREE.SpriteMaterial({ map: disco("#d94b3d", 120), fog: false, depthWrite: false }));
  solRojo.scale.setScalar(52); solRojo.position.set(30, 92, -660); escena.add(solRojo);
  const lejano = (color) => new THREE.MeshBasicMaterial({ color, fog: false }); // el fondo, plano como en el papel
  function loma(x, z, r, sy, color) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), lejano(color)); m.scale.y = sy; m.position.set(x, -2, z); escena.add(m); }
  loma(-70, -330, 170, .13, "#dcd5cd"); loma(170, -360, 190, .11, "#e2dbd3"); loma(330, -320, 150, .14, "#d9d2ca"); loma(70, -280, 110, .12, "#d2cbc3");
  // el volcán: un cono con la nieve pintada arriba, con su borde en zigzag como en el papel
  function volcan(x, z, r, h, nieve) {
    const g = new THREE.ConeGeometry(r, h, 96, 12); const pos = g.attributes.position, col = [];
    const roca = new THREE.Color("#d6cfc7"), blanco = new THREE.Color("#fbf9f5");
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / h + .5, ang = Math.atan2(pos.getZ(i), pos.getX(i));
      const c = y > 1 - nieve + Math.abs(((ang * 8 / Math.PI) % 2 + 2) % 2 - 1) * .06 ? blanco : roca; col.push(c.r, c.g, c.b);
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false })); m.position.set(x, h / 2 - 2, z); escena.add(m);
  }
  volcan(130, -640, 150, 78, .3); volcan(-90, -600, 100, 48, .2);

  // nubes de algodón y pájaros en V
  const nubes = [];
  for (let i = 0; i < (MOVIL ? 8 : 13); i++) {
    const g = new THREE.Group(); const s = entre(4, 9);
    for (let j = 0; j < 5; j++) { const b = new THREE.Mesh(new THREE.SphereGeometry(s * entre(.6, 1), 20, 14), lejano("#fbf9f5")); b.position.set((j - 2) * s * .8, j % 2 ? s * .35 : 0, entre(-1, 1) * s * .3); b.scale.y = .8; g.add(b); }
    g.position.set(entre(-120, 320), entre(38, 62), entre(-340, -240)); escena.add(g); nubes.push(g);
  }
  const pajaros = [];
  for (let i = 0; i < 9; i++) {
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.7, .3, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(.7, .3, 0)]);
    const p = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: C.tinta2, fog: false }));
    p.position.set(entre(-40, 220), entre(24, 40), entre(-90, -50)); p.userData.v = entre(2, 4); p.userData.f = rnd() * 6; escena.add(p); pajaros.push(p);
  }

  // ── la calle ──
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), mat("#f1ece4")); suelo.rotation.x = -Math.PI / 2; escena.add(suelo);
  caja(360, .02, .07, C.tinta, 95, 0, -1.6, { sinBorde: true }); // la raya del pie de las fachadas, como en el papel
  caja(360, .02, .05, "#9d968c", 95, 0, 4.6, { sinBorde: true }); // el bordillo
  const sombraTex = lienzo(128, 128, (x) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, "rgba(60,40,30,.32)"); g.addColorStop(1, "rgba(60,40,30,0)"); x.fillStyle = g; x.fillRect(0, 0, 128, 128); });
  const sombra = (w, d) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: sombraTex, transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = .01; escena.add(m); return m; };

  // colisiones simples: círculos (x, z, r) que Fran no atraviesa
  const tope = [];
  function arbol(x, z, s = 1) {
    cil(.09 * s, .12 * s, 2.2 * s, C.blanco, x, 0, z);
    const copa = casco(new THREE.Mesh(new THREE.SphereGeometry(1.2 * s, 28, 20), mat(C.blanco)), .04); copa.scale.y = 1.15; copa.position.set(x, 2.2 * s + 1.1 * s, z); escena.add(copa);
    tope.push([x, z, .45 * s]);
  }
  function farol(x, z) {
    cil(.06, .08, 4.6, "#77716a", x, 0, z, { trazo: false });
    const brazo = new THREE.Mesh(new THREE.TorusGeometry(.45, .05, 8, 16, Math.PI / 2), mat("#77716a")); brazo.position.set(x + .45, 4.6, z); escena.add(brazo);
    cil(.26, .2, .55, C.papel2, x + .9, 3.9, z, { seg: 6 });
    tope.push([x, z, .25]);
  }
  for (let x = -10; x < 205; x += 17) farol(x, 4.2);

  // casas de Quito, procedurales: blancas, con techo a dos aguas o plano, ventanas pequeñas
  function casa(x, z, w, h, d, { rot = 0, techo = rnd() < .6 } = {}) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; escena.add(g);
    const tono = [C.papel, "#ece6dc", "#e6e0d6", "#f6f2ec"][Math.floor(rnd() * 4)];
    caja(w, h, d, tono, 0, 0, 0, { padre: g, suave: true });
    if (techo) prisma([[-w / 2 - .2, 0], [w / 2 + .2, 0], [0, Math.min(2.6, w * .32)]], d + .3, C.papel2, 0, h, 0, { padre: g });
    else caja(w + .2, .25, d + .2, C.papel2, 0, h, 0, { padre: g, suave: true });
    const pisos = Math.max(1, Math.floor(h / 2.6)), cols = Math.max(1, Math.floor(w / 1.9));
    for (let p = 0; p < pisos; p++) for (let c = 0; c < cols; c++) {
      if (rnd() < .3) continue;
      caja(.42, .62, .05, "#c9c1b6", -w / 2 + (c + .5) * (w / cols), .9 + p * 2.4, d / 2 + .03, { padre: g, sinBorde: true });
    }
    return g;
  }
  for (const [z0, alto, paso] of [[-17, [4, 9], 1], [-30, [5, 11], 1], [-46, [6, 13], 1.2]]) {
    for (let x = -80; x < 290;) { const w = entre(3.5, 7) * paso; casa(x + w / 2, z0 + entre(-2, 2), w, entre(...alto), entre(4, 7)); x += w + entre(.4, 3); }
  }
  for (let x = -60; x < 270;) { const w = entre(4, 7); casa(x + w / 2, 33 + entre(-1.5, 1.5), w, entre(3.5, 6), 5, { rot: Math.PI }); x += w + entre(1, 4); }
  // la plaza de enfrente: árboles al azar, lejos de la vereda
  for (let i = 0; i < (MOVIL ? 14 : 26); i++) arbol(entre(-30, 230), entre(-24, -12), entre(.9, 1.4));
  for (let i = 0; i < 16; i++) arbol(entre(-30, 230), entre(29, 31), entre(.9, 1.3));

  // ── las salas ──
  // 01 · Presentación: la tarjeta, el retrato en su caballete, el quiosco de EL MERCIO. y una bici
  {
    const x0 = X.presentacion;
    cil(.05, .05, 1.2, C.tinta, x0 - 3.9, 0, -3.2, { trazo: false }); cil(.05, .05, 1.2, C.tinta, x0 + 3.9, 0, -3.2, { trazo: false });
    caja(9, 6.2, .22, C.blanco, x0, 1.2, -3.2);
    cartel(8.2, 5.29, titular("01 · PRESENTACIÓN", ["Francisco", "Maldonado"], "Diseño producto. Y escribo sobre él.", "DESDE 2010 · QUITO, ECUADOR", 2), x0, 4.2, -3.08);
    // el caballete con el retrato
    const xc = x0 + 8;
    for (const [dx, dz, inc] of [[-1.1, 0, .18], [1.1, 0, -.18], [0, -.9, 0]]) {
      const pata = cil(.05, .05, 5, C.tinta, xc + dx, 0, -3.4 + dz, { trazo: false }); pata.rotation.z = inc; if (dz) pata.rotation.x = .2;
    }
    caja(3.8, .14, .7, C.blanco, xc, 2.55, -3.25);
    caja(3, 3.5, .18, C.blanco, xc, 2.7, -3.45);
    const foto = cartel(2.3, 2.75, new THREE.Texture(), xc, 4.45, -3.35, { opaco: true });
    const img = new Image(); img.crossOrigin = "anonymous";
    img.onload = () => { foto.material.map = lienzo(460, 550, (x) => { x.filter = "grayscale(1) contrast(1.05)"; const s = Math.max(460 / img.width, 550 / img.height); x.drawImage(img, (460 - img.width * s) / 2, (550 - img.height * s) / 2, img.width * s, img.height * s); }); foto.material.needsUpdate = true; };
    img.src = "../img/francisco-maldonado.jpg";
    // el quiosco
    const xq = x0 + 15.5;
    caja(4.2, 3.3, 2.2, C.blanco, xq, 0, -4.6);
    caja(4.9, .22, 2.9, C.papel2, xq, 3.3, -4.5);
    for (const dx of [-2.25, 2.25]) cil(.07, .07, 3.3, C.blanco, xq + dx, 0, -3.3);
    cartel(3.8, 2.1, lienzo(760, 420, (x, w, h) => {
      x.fillStyle = C.blanco; x.fillRect(0, 0, w, h); x.strokeStyle = C.tinta; x.lineWidth = 4; x.strokeRect(6, 6, w - 12, h - 12);
      escribir(x, "EL MERCIO.", w / 2, 110, { f: `700 84px "PT Serif", Georgia, serif`, alinear: "center" });
      x.fillStyle = C.tinta; x.fillRect(40, 140, w - 80, 3);
      escribir(x, "Las noticias, el entretenimiento", w / 2, 210, { f: fuente.serif(38), color: C.tinta2, alinear: "center" });
      escribir(x, "y la desinformación de ayer.", w / 2, 258, { f: fuente.serif(38), color: C.tinta2, alinear: "center" });
      escribir(x, "DESDE 2009", w / 2, 360, { f: fuente.mono(26), color: C.tinta2, espacio: 6, alinear: "center" });
    }), xq, 1.9, -3.48, { opaco: true });
    // la bici
    const xb = x0 + 19.5, zb = -2.7;
    for (const dx of [-.8, .8]) { const r = new THREE.Mesh(new THREE.TorusGeometry(.42, .04, 8, 32), mat(C.tinta)); r.position.set(xb + dx, .44, zb); escena.add(r); }
    linea([[xb - .8, .44, zb], [xb - .1, .44, zb], [xb + .3, 1.05, zb], [xb - .45, 1.05, zb], [xb - .8, .44, zb]]);
    linea([[xb - .1, .44, zb], [xb - .5, 1.2, zb]]); linea([[xb + .3, 1.05, zb], [xb + .8, .44, zb]]); linea([[xb + .3, 1.05, zb], [xb + .25, 1.35, zb], [xb + .5, 1.4, zb]]);
  }

  // 02 · Trabajo: la fábrica de techo en sierra, con los tres casos en pedestales bajo lámparas
  const lampara = (x, alto, abajo) => {
    linea([[x, alto + .5, -3.6], [x, 7.6, -3.6]], LINEA_SUAVE);
    cil(.22, .62, .42, C.negro, x, alto, -3.6, { seg: 6, trazo: false });
    const haz = new THREE.Mesh(new THREE.CylinderGeometry(.55, 1.9, alto - abajo, 28, 1, true), new THREE.MeshBasicMaterial({ color: C.luz, transparent: true, opacity: .38, depthWrite: false, side: THREE.DoubleSide }));
    haz.position.set(x, abajo + (alto - abajo) / 2, -3.7); escena.add(haz);
  };
  const pedestal = (x, nombre, rubro) => { caja(2.8, 1.7, 1.4, C.blanco, x, 0, -3.7); cartel(2.6, 1.22, etiqueta(nombre, rubro), x, .85, -2.99, { opaco: true }); };
  const pantalla = (pintar) => lienzo(256, 460, (x, w, h) => { x.fillStyle = C.blanco; x.fillRect(0, 0, w, h); pintar(x, w, h); });
  {
    const x0 = X.trabajo;
    caja(32, 7, 6, C.papel, x0 + 6, 0, -8);
    for (let i = 0; i < 5; i++) prisma([[0, 0], [6.4, 0], [6.4, 2.5]], 6, C.papel, x0 - 10 + i * 6.4, 7, -8);
    cartel(8.6, 4.37, titular("02 · TRABAJO", "Trabajo", "Lo que hace cuando le pagan.", "3 EXPEDIENTES"), x0 - 4.6, 3.9, -4.98);
    // Deuna!: el teléfono con el QR
    pedestal(x0 + 3, "Deuna!", "FINTECH"); lampara(x0 + 3, 6.3, 1.7);
    caja(1.35, 2.35, .24, C.negro, x0 + 3, 1.75, -3.8);
    cartel(1.12, 2.0, pantalla((x, w) => {
      x.fillStyle = C.tinta; for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) if ((i * 7 + j * 13 + i * j) % 3 === 0 || (i < 3 && j < 3) || (i > 5 && j < 3) || (i < 3 && j > 5)) x.fillRect(48 + i * 18, 70 + j * 18, 16, 16);
      x.fillStyle = C.rojo; x.beginPath(); x.roundRect(48, 300, 160, 56, 28); x.fill();
      escribir(x, "PAGAR", w / 2, 338, { f: fuente.mono(24, 700), color: "#fff", espacio: 4, alinear: "center" });
      x.beginPath(); x.arc(220, 48, 20, 0, 7); x.fill();
    }), x0 + 3, 2.93, -3.67);
    // KFC Kiosk: la pantalla grande sobre su poste
    pedestal(x0 + 11, "KFC Kiosk", "AUTOSERVICIO"); lampara(x0 + 11, 7.1, 1.7);
    cil(.1, .1, 1.1, C.gris2, x0 + 11, 1.7, -3.8);
    caja(2, 2.7, .26, C.negro, x0 + 11, 2.8, -3.8);
    cartel(1.75, 2.42, pantalla((x, w) => {
      x.strokeStyle = C.tinta; x.lineWidth = 3; x.strokeRect(28, 30, w - 56, 26);
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) x.strokeRect(28 + i * 104, 80 + j * 120, 96, 110);
      x.fillStyle = C.rojo; x.fillRect(28, 340, w - 56, 50);
    }), x0 + 11, 4.15, -3.66);
    // Control Point: el lector de mano
    pedestal(x0 + 19, "Control Point", "LOGÍSTICA"); lampara(x0 + 19, 6.3, 1.7);
    caja(1.3, 2.7, .26, C.negro, x0 + 19, 1.75, -3.8);
    cartel(1.05, 1.3, pantalla((x) => {
      for (let i = 0; i < 4; i++) { x.strokeStyle = C.tinta; x.lineWidth = 6; x.strokeRect(40, 50 + i * 95, 54, 54); x.fillStyle = "#cfc8be"; x.fillRect(116, 74 + i * 95, 100, 8); if (i < 3) { x.fillStyle = C.rojo; x.fillRect(48, 58 + i * 95, 38, 38); } }
    }), x0 + 19, 3.6, -3.66);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) caja(.28, .16, .04, C.blanco, x0 + 18.65 + i * .35, 2.2 + j * .26, -3.66, { sinBorde: true });
    caja(.5, .12, .04, C.rojo, x0 + 19, 1.95, -3.66, { sinBorde: true });
  }

  // 03 · Escritura: la casa con el escritorio de EL MERCIO. y los dos newsletters colgados
  {
    const x0 = X.escritura;
    caja(26, 6.2, 6, C.blanco, x0 + 2, 0, -8);
    caja(26, .9, .06, C.papel2, x0 + 2, 0, -4.97);
    prisma([[-14, 0], [14, 0], [13, 1.2], [-13, 1.2]], 7.2, C.papel2, x0 + 2, 6.2, -8);
    cartel(8.6, 4.37, titular("03 · ESCRITURA", "Escritura", "Un periódico y dos newsletters.", ""), x0 - 6.4, 3.6, -4.95);
    // el escritorio
    const xe = x0 + 1;
    caja(3.9, .12, 1.4, C.blanco, xe, 1.55, -3.7);
    for (const [dx, dz] of [[-1.8, -.6], [1.8, -.6], [-1.8, .6], [1.8, .6]]) cil(.04, .04, 1.55, C.tinta, xe + dx, 0, -3.7 + dz, { trazo: false });
    cil(.05, .05, .35, C.tinta, xe - .2, 1.67, -3.9, { trazo: false });
    caja(2.1, 1.35, .12, C.negro, xe - .2, 2.0, -3.95);
    cartel(1.86, 1.13, lienzo(512, 312, (x, w, h) => {
      x.fillStyle = C.blanco; x.fillRect(0, 0, w, h);
      escribir(x, "EL MERCIO.", 40, 90, { f: `700 64px "PT Serif", Georgia, serif` });
      x.fillStyle = C.tinta; x.fillRect(40, 118, 430, 4);
      x.fillStyle = "#cfc8be"; for (let i = 0; i < 4; i++) x.fillRect(40, 150 + i * 32, i % 2 ? 220 : 300, 10);
      x.strokeStyle = C.tinta2; x.lineWidth = 4; x.strokeRect(330, 200, 140, 50);
    }), xe - .2, 2.675, -3.88, { opaco: true });
    const flexo = new THREE.Group(); flexo.position.set(xe + 1.4, 1.67, -3.95); escena.add(flexo);
    linea([[0, 0, 0], [.35, .8, 0], [.1, 1.35, 0]], LINEA, flexo);
    const pantallita = casco(new THREE.Mesh(new THREE.BoxGeometry(.45, .35, .35), mat(C.negro)), .03); pantallita.position.set(.12, 1.4, 0); pantallita.rotation.z = -.7; flexo.add(pantallita);
    cil(.13, .12, .28, C.blanco, xe + 1.25, 1.67, -3.4);
    // los newsletters
    const cuadro = (x, fondo, tinta, titulo1, titulo2, pie, franja) => {
      linea([[x - 1.1, 4.9, -4.8], [x, 5.9, -4.8], [x + 1.1, 4.9, -4.8]], LINEA_SUAVE);
      caja(2.5, 3.3, .12, C.gris, x, 1.65, -4.85);
      cartel(2.25, 3.05, lienzo(360, 488, (c, w, h) => {
        c.fillStyle = fondo; c.fillRect(0, 0, w, h); if (franja) { c.fillStyle = C.rojo; c.fillRect(0, 0, w, 14); }
        escribir(c, "NEWSLETTER", 22, 62, { f: fuente.mono(18), color: tinta, espacio: 4 });
        escribir(c, titulo1, 22, 140, { f: `700 44px "PT Serif", Georgia, serif`, color: tinta });
        escribir(c, titulo2, 22, 190, { f: `700 44px "PT Serif", Georgia, serif`, color: tinta });
        c.fillStyle = tinta; c.globalAlpha = .4; c.fillRect(22, 222, w - 44, 2); c.globalAlpha = 1;
        escribir(c, pie, 22, h - 32, { f: fuente.mono(18), color: tinta, espacio: 4 });
      }), x, 3.3, -4.78, { opaco: true });
    };
    cuadro(x0 + 8.5, C.blanco, C.tinta, "Mal", "Pensamientos", "LOS LUNES", true);
    cuadro(x0 + 13, C.negro, "#f4efe7", "Todo", "Mal", "SIN CALENDARIO", false);
    // el muro bajo con el gato, y el árbol
    caja(5.6, 1.5, 1, C.papel, x0 - 16, 0, -3.7); caja(6, .18, 1.2, C.papel2, x0 - 16, 1.5, -3.7);
    const gato = new THREE.Group(); gato.position.set(x0 - 17.2, 1.68, -3.6); escena.add(gato);
    const parte = (geo, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, mat(C.negro)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); gato.add(m); return m; };
    parte(new THREE.SphereGeometry(.32, 16, 12), 0, .3, 0, 1, 1.15, .9); parte(new THREE.SphereGeometry(.22, 16, 12), .1, .74, .05);
    for (const dx of [-.08, .2]) { const o = parte(new THREE.ConeGeometry(.07, .16, 8), dx, .95, .05); o.rotation.z = -dx; }
    const cola = parte(new THREE.TorusGeometry(.25, .04, 6, 16, Math.PI), -.35, .2, 0); cola.rotation.z = Math.PI / 2;
    arbol(x0 - 11.6, -3.3, 1.15);
  }

  // 04 · Proyectos: el mural de UNA, el muro con los juegos y el pedestal de las apps
  {
    const x0 = X.proyectos;
    caja(7.4, 4.6, .25, C.papel, x0 - 12.2, 0, -4.4);
    cartel(7.1, 4.3, lienzo(820, 500, (x, w, h) => {
      x.fillStyle = "#ece6dc"; x.fillRect(0, 0, w, h);
      escribir(x, "UNA.RED · EL HUB DE MAL", w / 2, 50, { f: fuente.mono(22), color: C.tinta2, espacio: 5, alinear: "center" });
      const cx = w / 2, cy = 270, nodos = [[-260, -110, "MEDIOS"], [-120, -170, ""], [120, -165, "APPS"], [270, -40, ""], [200, 130, ""], [10, 190, ""], [-210, 150, "JUEGOS"]];
      x.strokeStyle = "#a39c92"; x.lineWidth = 2;
      for (const [dx, dy] of nodos) { x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + dx, cy + dy); x.stroke(); }
      for (const [dx, dy, t] of nodos) { x.fillStyle = C.rojo; x.beginPath(); x.arc(cx + dx, cy + dy, 11, 0, 7); x.fill(); x.strokeStyle = C.tinta; x.stroke(); if (t) escribir(x, t, cx + dx, cy + dy - 22, { f: fuente.mono(16), color: C.tinta2, alinear: "center" }); }
      x.fillStyle = C.blanco; x.beginPath(); x.arc(cx, cy, 40, 0, 7); x.fill(); x.lineWidth = 3; x.strokeStyle = C.tinta; x.stroke();
      escribir(x, "UNA", cx, cy + 9, { f: fuente.mono(24, 700), alinear: "center", espacio: 3 });
    }), x0 - 12.2, 2.3, -4.26, { opaco: true });
    caja(26.5, 7.4, 1.2, C.papel, x0 + 6.75, 0, -5.6); caja(27, .3, 1.5, C.papel2, x0 + 6.75, 7.4, -5.6);
    cartel(8.6, 4.37, titular("04 · PROYECTOS", "Proyectos", "Juegos y apps, en el navegador.", ""), x0 - .9, 4.9, -4.98);
    // los siete juegos, como teselas oscuras con su dibujo
    const iconos = [
      (x) => { x.beginPath(); x.arc(64, 28, 10, 0, 7); x.moveTo(64, 38); x.lineTo(64, 70); x.moveTo(44, 50); x.lineTo(84, 50); x.moveTo(64, 70); x.lineTo(46, 92); x.moveTo(64, 70); x.lineTo(82, 92); x.moveTo(30, 96); x.lineTo(98, 96); },
      (x) => { x.moveTo(64, 20); x.lineTo(100, 40); x.lineTo(100, 80); x.lineTo(64, 100); x.lineTo(28, 80); x.lineTo(28, 40); x.closePath(); x.moveTo(28, 40); x.lineTo(64, 60); x.lineTo(100, 40); x.moveTo(64, 60); x.lineTo(64, 100); },
      (x) => { x.moveTo(24, 56); x.lineTo(104, 56); x.arc(64, 56, 40, 0, Math.PI); x.moveTo(54, 40); x.quadraticCurveTo(50, 28, 58, 18); },
      (x) => { x.rect(30, 46, 68, 46); x.moveTo(22, 46); x.lineTo(106, 46); x.moveTo(52, 36); x.lineTo(76, 36); },
      (x) => { x.rect(34, 30, 60, 66); x.moveTo(34, 54); x.lineTo(94, 54); },
      (x) => { x.moveTo(30, 96); x.lineTo(30, 40); x.lineTo(44, 54); x.lineTo(84, 54); x.lineTo(98, 40); x.lineTo(98, 96); x.closePath(); x.moveTo(52, 74); x.arc(50, 74, 2, 0, 7); x.moveTo(80, 74); x.arc(78, 74, 2, 0, 7); },
      (x) => { for (const [a, b] of [[40, 50], [64, 40], [88, 50]]) { x.moveTo(a + 9, b); x.arc(a, b, 9, 0, 7); } x.moveTo(22, 92); x.quadraticCurveTo(40, 66, 58, 92); x.moveTo(46, 88); x.quadraticCurveTo(64, 60, 82, 88); x.moveTo(70, 92); x.quadraticCurveTo(88, 66, 106, 92); },
    ];
    iconos.forEach((dib, i) => {
      const fila = i < 4 ? 0 : 1, col = i < 4 ? i : i - 4, x = x0 - 3.9 + col * 2.05 + fila * 1.02, y = fila ? 1.75 : 3.05;
      caja(1.8, 1.2, .2, C.negro, x, y, -4.9, { sinBorde: true });
      cartel(1.6, 1.0, lienzo(160, 100, (c) => { c.fillStyle = C.negro; c.fillRect(0, 0, 160, 100); c.translate(16, -10); c.scale(1, .95); c.strokeStyle = i === 0 ? C.rojo : "#f4efe7"; c.lineWidth = 4; c.lineCap = "round"; c.beginPath(); dib(c); c.stroke(); }), x, y + .6, -4.79, { opaco: true });
    });
    caja(3, .9, .1, C.blanco, x0 - 3.4, .65, -4.85);
    cartel(2.9, .82, lienzo(380, 108, (x, w, h) => { x.fillStyle = C.blanco; x.fillRect(0, 0, w, h); escribir(x, "Juegos", 18, 46, { f: fuente.texto(34) }); escribir(x, "9 · EN EL NAVEGADOR", 18, 88, { f: fuente.mono(18), color: C.tinta2, espacio: 4 }); }), x0 - 3.4, 1.1, -4.79, { opaco: true });
    // las apps
    pedestal(x0 + 14, "Apps", "5 HERRAMIENTAS"); lampara(x0 + 14, 6.6, 1.7);
    caja(1.4, 2.5, .24, C.negro, x0 + 14, 1.75, -3.8);
    cartel(1.17, 2.12, pantalla((x, w) => {
      for (let i = 0; i < 5; i++) { x.fillStyle = i === 0 ? C.rojo : "#e3ddd3"; x.strokeStyle = C.tinta; x.lineWidth = 3; x.beginPath(); x.roundRect(40 + (i % 3) * 62, 50 + Math.floor(i / 3) * 62, 50, 50, 10); x.fill(); x.stroke(); }
      x.fillStyle = "#cfc8be"; for (let i = 0; i < 3; i++) x.fillRect(40, 220 + i * 34, i === 1 ? 120 : 170, 8);
      x.fillRect(w / 2 - 40, 420, 80, 8);
    }), x0 + 14, 3.0, -3.67);
  }

  // 05 · Mentoría: el café con su mesita, dos sillas, dos tazas y la ventana del toldo rojo
  {
    const x0 = X.mentoria;
    caja(22, 6.5, 1.2, C.papel, x0 + 5, 0, -5.6);
    cartel(8.6, 4.37, titular("05 · MENTORÍA", "Mentoría", "Gratis, y sin adornos.", ""), x0 - 1.4, 3.9, -4.98);
    // la ventana
    caja(5.4, 3.7, .16, "#f6efe4", x0 + 11, 1.9, -4.95);
    for (const dx of [-.9, .9]) caja(.06, 3.7, .05, C.tinta2, x0 + 11 + dx, 1.9, -4.85, { sinBorde: true });
    caja(5.4, .06, .05, C.tinta2, x0 + 11, 3.75, -4.85, { sinBorde: true });
    caja(5.9, .14, .5, C.blanco, x0 + 11, 1.8, -4.7);
    prisma([[-3.2, 0], [3.2, 0], [2.8, .9], [-2.8, .9]], 1.4, C.rojo, x0 + 11, 5.7, -4.5);
    // la mesa, las sillas y las tazas
    const xm = x0 + 3.2;
    cil(.95, .95, .07, C.blanco, xm, 1.5, -3.6, { seg: 32 }); cil(.05, .05, 1.5, C.tinta, xm, 0, -3.6, { trazo: false }); cil(.5, .5, .05, C.tinta, xm, 0, -3.6, { trazo: false });
    const silla = (x, lado) => {
      cil(.42, .42, .06, C.tinta, x, .95, -3.6, { seg: 20, trazo: false });
      for (const [dx, dz] of [[-.28, -.28], [.28, -.28], [-.28, .28], [.28, .28]]) cil(.025, .025, .95, C.tinta, x + dx, 0, -3.6 + dz, { trazo: false });
      linea([[x + lado * .35, 1, -3.85], [x + lado * .42, 2.1, -3.85], [x + lado * .42, 2.1, -3.35], [x + lado * .35, 1, -3.35]]);
    };
    silla(xm - 1.6, -1); silla(xm + 1.6, 1);
    cil(.16, .14, .32, C.blanco, xm - .45, 1.57, -3.6); cil(.16, .14, .32, C.rojo, xm + .45, 1.57, -3.6);
    for (const dx of [-.45, .45]) { const asa = new THREE.Mesh(new THREE.TorusGeometry(.08, .02, 6, 12), mat(C.tinta)); asa.position.set(xm + dx + .19, 1.75, -3.6); escena.add(asa); }
    const humo = linea(Array.from({ length: 12 }, (_, i) => [xm + .45 + Math.sin(i * .9) * .07, 2.0 + i * .07, -3.6]), LINEA_SUAVE);
    // la planta
    const xp = x0 - 9.5;
    const maceta = new THREE.Mesh(new THREE.CylinderGeometry(1.25, .9, 1.6, 4, 1), mat(C.blanco)); maceta.rotation.y = Math.PI / 4; maceta.position.set(xp, .8, -3.4); borde(maceta); escena.add(maceta);
    for (let i = 0; i < 7; i++) {
      const a = -1.1 + i * .37, hoja = casco(new THREE.Mesh(new THREE.SphereGeometry(.22, 12, 10), mat(C.blanco)), .08);
      hoja.scale.set(1, 6, .6); hoja.position.set(xp + Math.sin(a) * .9, 1.6 + Math.cos(a) * 1.1, -3.4); hoja.rotation.z = -a; escena.add(hoja);
      if (i % 2 === 0) { const b = new THREE.Mesh(new THREE.SphereGeometry(.1, 10, 8), mat(C.rojo)); b.position.set(xp + Math.sin(a) * 2.1, 1.6 + Math.cos(a) * 2.4, -3.4); escena.add(b); }
    }
    // el campanario del fondo
    const xt = x0 + 22;
    caja(3, 11, 3, C.papel, xt, 0, -14, { suave: true });
    const punta = new THREE.Mesh(new THREE.ConeGeometry(2.3, 3.8, 4), mat(C.papel2)); punta.rotation.y = Math.PI / 4; punta.position.set(xt, 12.9, -14); borde(punta); escena.add(punta);
    caja(.7, 1.3, .05, "#c9c1b6", xt, 7.6, -12.47, { sinBorde: true });
    escena.userData.humo = humo;
  }

  // 06 · Sistema: el archivador de los cuatro temas, las muestras de color y la puerta a UNA
  {
    const x0 = X.sistema;
    caja(26, 7.6, 1.2, C.papel, x0 + 7, 0, -5.6);
    cartel(8.6, 4.37, titular("06 · SISTEMA", "Sistema", "Un sistema de diseño, cuatro temas.", ""), x0 - 1.4, 5.1, -4.98);
    // el poste de luz con su letrero
    const xp = x0 - 12;
    cil(.13, .16, 8.6, C.blanco, xp, 0, -2.9); caja(3, .16, .16, C.blanco, xp, 7.6, -2.9);
    caja(2.1, .7, .1, C.blanco, xp + 1.2, 3.8, -2.82);
    cartel(1.95, .6, lienzo(390, 120, (x, w, h) => { x.fillStyle = C.blanco; x.fillRect(0, 0, w, h); escribir(x, "UNA →", w / 2, 78, { f: fuente.mono(44, 700), alinear: "center", espacio: 6 }); }), xp + 1.2, 4.15, -2.76, { opaco: true });
    for (const dz of [-.2, .2]) linea(Array.from({ length: 20 }, (_, i) => { const t = i / 19; return [xp - 1.3 - t * 26, 7.7 - Math.sin(t * Math.PI) * 1.2 - t * .5, -2.9 + dz]; }), LINEA_SUAVE);
    // el archivador
    const xa = x0 + .5;
    caja(4.6, 3.2, 1.3, C.blanco, xa, 0, -4.2);
    ["MAL", "MERCIO", "APPS", "JUEGOS"].forEach((t, i) => {
      const y = 2.38 - i * .74;
      caja(4.2, .62, .1, C.blanco, xa, y, -3.5);
      cartel(1.1, .28, lienzo(220, 56, (x, w, h) => { x.fillStyle = C.blanco; x.fillRect(0, 0, w, h); x.strokeStyle = C.tinta; x.lineWidth = 3; x.strokeRect(2, 2, w - 4, h - 4); escribir(x, t, w / 2, 38, { f: fuente.mono(24), alinear: "center", espacio: 4 }); }), xa, y + .43, -3.44, { opaco: true });
      caja(.8, .06, .04, C.tinta, xa, y + .14, -3.43, { sinBorde: true });
    });
    // las muestras de los cuatro temas
    [["#d33b2c", "MAL"], ["#1f1e1c", "MERCIO"], ["#1f7a3d", "APPS"], ["#a3327a", "JUEGOS"]].forEach(([col, t], i) => {
      const x = x0 + 4.6 + (i % 2) * 1.15, y = i < 2 ? 3.15 : 1.75;
      caja(1, 1.25, .06, C.blanco, x, y, -4.95);
      caja(.74, .7, .02, col, x, y + .4, -4.9, { sinBorde: true });
      cartel(.8, .16, lienzo(160, 32, (c) => { c.fillStyle = C.blanco; c.fillRect(0, 0, 160, 32); escribir(c, t, 80, 24, { f: fuente.mono(18), color: C.tinta2, alinear: "center", espacio: 3 }); }), x, y + .19, -4.89, { opaco: true });
    });
    // la puerta, entreabierta, con su letrero
    const xd = x0 + 13;
    caja(3, 4.8, .3, C.negro, xd, 0, -4.95);
    const bisagra = new THREE.Group(); bisagra.position.set(xd - 1.15, 0, -4.75); bisagra.rotation.y = -1.1; escena.add(bisagra);
    caja(2.3, 4.5, .12, C.blanco, 1.15, 0, 0, { padre: bisagra });
    const pomo = new THREE.Mesh(new THREE.SphereGeometry(.07, 10, 8), mat(C.tinta)); pomo.position.set(2.05, 2.2, .1); bisagra.add(pomo);
    caja(3.8, .8, .1, C.blanco, xd, 5.2, -4.9);
    cartel(3.6, .7, lienzo(720, 140, (x, w, h) => { x.fillStyle = C.blanco; x.fillRect(0, 0, w, h); escribir(x, "SALIDA · UNA →", w / 2, 90, { f: fuente.mono(46, 700), alinear: "center", espacio: 6 }); }), xd, 5.6, -4.84, { opaco: true });
  }

  // ── los puntos rojos del papel: marcan cada pieza y laten ──
  const punto = lienzo(128, 128, (x) => { x.fillStyle = C.rojo; x.beginPath(); x.arc(64, 64, 26, 0, 7); x.fill(); x.strokeStyle = "rgba(211,59,44,.45)"; x.lineWidth = 5; x.beginPath(); x.arc(64, 64, 46, 0, 7); x.stroke(); });
  const aro = lienzo(128, 128, (x) => { x.strokeStyle = C.rojo; x.lineWidth = 6; x.beginPath(); x.arc(64, 64, 56, 0, 7); x.stroke(); });
  const marcas = piezas.map((a, i) => {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: punto, depthWrite: false })); m.scale.setScalar(.9); m.position.set(a.px, a.py, a.pz + .3); escena.add(m);
    const r = new THREE.Sprite(new THREE.SpriteMaterial({ map: aro, depthWrite: false, transparent: true })); r.position.copy(m.position); escena.add(r);
    return { m, r, fase: i * .7, vista: false };
  });

  // ── Fran, de bulto: como el de papel (papel.css): pelo largo negro, gafas, suéter gris ──
  const mf = (color, rugoso) => new THREE.MeshLambertMaterial({ color });
  const PIEL = mf("#be8a69"), PELO = mf("#1d1b19"), SUETER = mf("#8e8b85"), PANTALON = mf("#2e2c29"), ZAPATO = mf("#1d1b19"), SUELA = mf("#ece7dd"), GAFAS = mf("#a88743"), OJO = mf("#1a1210");
  const RUBOR = new THREE.MeshLambertMaterial({ color: "#e8917f", transparent: true, opacity: .6 });
  const pieza = (geo, m, x = 0, y = 0, z = 0, conCasco = true) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); if (conCasco) casco(o, .07); return o; };
  const fran = new THREE.Group();
  const cuerpo = new THREE.Group(); fran.add(cuerpo);
  const piernas = [-1, 1].map((l) => {
    const p = new THREE.Group(); p.position.set(l * .12, .86, 0);
    p.add(pieza(new THREE.CapsuleGeometry(.1, .52, 6, 14), PANTALON, 0, -.4, 0));
    const zap = pieza(new THREE.SphereGeometry(.13, 18, 12), ZAPATO, 0, -.79, .06); zap.scale.set(.95, .55, 1.5); p.add(zap);
    const sue = pieza(new THREE.SphereGeometry(.13, 18, 8, 0, Math.PI * 2, Math.PI * .55, Math.PI * .45), SUELA, 0, -.8, .06, false); sue.scale.set(1, .6, 1.55); p.add(sue);
    cuerpo.add(p); return p;
  });
  const torso = pieza(new THREE.CapsuleGeometry(.27, .44, 8, 20), SUETER, 0, 1.22, 0); torso.scale.set(1, 1, .78); cuerpo.add(torso);
  const brazos = [-1, 1].map((l) => {
    const b = new THREE.Group(); b.position.set(l * .32, 1.47, 0); b.rotation.z = l * .08;
    b.add(pieza(new THREE.CapsuleGeometry(.075, .44, 6, 12), SUETER, 0, -.27, 0));
    b.add(pieza(new THREE.SphereGeometry(.07, 14, 10), PIEL, 0, -.56, 0));
    cuerpo.add(b); return b;
  });
  const cabeza = new THREE.Group(); cabeza.position.set(0, 1.86, 0); cuerpo.add(cabeza);
  cabeza.add(pieza(new THREE.CapsuleGeometry(.055, .08, 4, 10), PIEL, 0, -.2, 0, false));
  const craneo = pieza(new THREE.SphereGeometry(.25, 32, 22), PIEL); craneo.scale.set(.96, 1.08, 1); cabeza.add(craneo);
  // el pelo: casquete, la melena que cae por la espalda hasta media espalda y dos mechones al frente
  const casquete = pieza(new THREE.SphereGeometry(.272, 32, 16, 0, Math.PI * 2, 0, Math.PI * .56), PELO, 0, .02, -.02); casquete.scale.set(1.02, 1.08, 1.05); cabeza.add(casquete);
  const melena = pieza(new THREE.CapsuleGeometry(.23, .62, 8, 20), PELO, 0, -.42, -.14); melena.scale.set(1.12, 1, .55); cabeza.add(melena);
  for (const l of [-1, 1]) {
    const mechon = pieza(new THREE.CapsuleGeometry(.07, .5, 6, 10), PELO, l * .235, -.24, .02); mechon.rotation.z = l * .06; cabeza.add(mechon);
    cabeza.add(pieza(new THREE.SphereGeometry(.03, 12, 10), OJO, l * .09, .02, .235, false));
    const aroG = pieza(new THREE.TorusGeometry(.075, .012, 8, 28), GAFAS, l * .095, .02, .25, false); cabeza.add(aroG);
    const r = pieza(new THREE.SphereGeometry(.05, 12, 10), RUBOR, l * .15, -.07, .2, false); r.scale.set(1, .6, .4); cabeza.add(r);
    const ceja = pieza(new THREE.CapsuleGeometry(.012, .07, 4, 6), PELO, l * .095, .12, .24, false); ceja.rotation.z = Math.PI / 2; cabeza.add(ceja);
  }
  const puente = pieza(new THREE.CylinderGeometry(.01, .01, .05, 6), GAFAS, 0, .03, .255, false); puente.rotation.z = Math.PI / 2; cabeza.add(puente);
  const nariz = pieza(new THREE.SphereGeometry(.038, 12, 10), PIEL, 0, -.04, .255, false); nariz.scale.set(1, 1, .8); cabeza.add(nariz);
  const boca = pieza(new THREE.TorusGeometry(.04, .01, 6, 16, Math.PI), mf("#5a2a22"), 0, -.12, .23, false); boca.rotation.z = Math.PI; cabeza.add(boca);
  escena.add(fran);
  const sombraFran = sombra(1.4, 1);

  // ── estado ──
  const teclas = new Set();
  let x = -4, z = -.6, rumbo = Math.PI / 2, vel = 0, paso = 0, objetivo = null, abrirAlLlegar = -1, cercana = -1, enCurso = false;
  let mirar = 0, inclina = 0, arrastre = null, ultimoArrastre = -1e9;

  // ── interfaz ──
  const hoja = $("#hoja"), globo = $("#globo"), portada = $("#portada"), pista = $("#pista");
  pista.textContent = TACTIL ? "Toca el suelo para caminar · arrastra para mirar · toca un punto rojo para abrirlo"
    : "← → por la calle · ↑ ↓ hacia el fondo · Mayús correr · E abrir · arrastra para mirar";
  const listaSalas = $("#salas");
  salas.forEach((s, i) => {
    const li = document.createElement("li"); const b = document.createElement("button");
    b.type = "button"; b.textContent = `0${i + 1} ${s}`; b.dataset.sala = s; b.title = `${s} (${i + 1})`;
    b.addEventListener("click", () => irASala(i)); li.append(b); listaSalas.append(li);
  });
  const botonesSala = [...listaSalas.querySelectorAll("button")];
  let abierta = -1;
  function abrir(i) {
    abierta = i; const a = piezas[i]; marcas[i].vista = true;
    $("#hoja-sala").textContent = `0${salas.indexOf(a.dataset.sala) + 1} · ${a.dataset.sala}`;
    const c = $("#hoja-cuerpo"); c.innerHTML = a.innerHTML;
    const h = c.querySelector("h2"); if (h) h.id = "hoja-t";
    $("#hoja-n").textContent = `${i + 1} / ${piezas.length}`;
    $("#ant").disabled = i === 0; $("#sig").disabled = i === piezas.length - 1;
    if (!hoja.open) hoja.showModal();
    hoja.scrollTop = 0;
    history.replaceState(null, "", "#" + a.id);
  }
  const cerrar = () => { if (hoja.open) hoja.close(); };
  hoja.addEventListener("close", () => { abierta = -1; history.replaceState(null, "", location.pathname + location.search); });
  hoja.addEventListener("click", (e) => { if (e.target === hoja) cerrar(); });
  $("#cerrar").addEventListener("click", cerrar);
  const irA = (i, yAbrir = false) => { objetivo = { x: piezas[i].px, z: -1.3 }; abrirAlLlegar = yAbrir ? i : -1; };
  $("#ant").addEventListener("click", () => { if (abierta > 0) { irA(abierta - 1); abrir(abierta - 1); } });
  $("#sig").addEventListener("click", () => { if (abierta < piezas.length - 1) { irA(abierta + 1); abrir(abierta + 1); } });
  globo.addEventListener("click", () => { if (cercana >= 0) abrir(cercana); });
  function irASala(i) { const k = piezas.findIndex((a) => a.dataset.sala === salas[i]); if (k >= 0) { empezar(); irA(k); } }
  function empezar() { if (enCurso) return; enCurso = true; portada.classList.add("ida"); setTimeout(() => pista.classList.add("ida"), 12000); }
  $("#empezar").addEventListener("click", empezar);

  const MOVER = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyA", "KeyD", "KeyW", "KeyS"], ABRIR = ["KeyE", "Enter", "Space"];
  addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (hoja.open) {
      if (e.code === "ArrowLeft" && !e.target.closest?.("a")) $("#ant").click();
      else if (e.code === "ArrowRight" && !e.target.closest?.("a")) $("#sig").click();
      return;
    }
    if (e.target.closest?.("a, button") && (e.code === "Enter" || e.code === "Space")) return;
    if (!enCurso) { if (ABRIR.includes(e.code) || MOVER.includes(e.code)) { e.preventDefault(); empezar(); } return; }
    if (MOVER.includes(e.code)) { teclas.add(e.code); objetivo = null; abrirAlLlegar = -1; e.preventDefault(); pista.classList.add("ida"); }
    else if (ABRIR.includes(e.code)) { if (cercana >= 0) { e.preventDefault(); abrir(cercana); } }
    else if (/^Digit[1-9]$/.test(e.code)) { const i = +e.code.slice(5) - 1; if (i < salas.length) irASala(i); }
    else if (e.code === "Home") { irA(0); e.preventDefault(); }
    else if (e.code === "End") { irA(piezas.length - 1); e.preventDefault(); }
    if (e.shiftKey) teclas.add("Shift");
  });
  addEventListener("keyup", (e) => { teclas.delete(e.code); if (e.key === "Shift") teclas.delete("Shift"); });
  addEventListener("blur", () => teclas.clear());

  const lienzoEscena = $("#escena");
  const rayo = new THREE.Raycaster(), ndc = new THREE.Vector2(), plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), tocado = new THREE.Vector3();
  lienzoEscena.addEventListener("pointerdown", (e) => {
    if (!enCurso) { empezar(); return; }
    arrastre = { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, movio: false, id: e.pointerId };
    lienzoEscena.setPointerCapture?.(e.pointerId);
  });
  lienzoEscena.addEventListener("pointermove", (e) => {
    if (!arrastre || e.pointerId !== arrastre.id) return;
    const dx = e.clientX - arrastre.x, dy = e.clientY - arrastre.y; arrastre.x = e.clientX; arrastre.y = e.clientY;
    if (Math.hypot(e.clientX - arrastre.x0, e.clientY - arrastre.y0) > 8) arrastre.movio = true;
    if (arrastre.movio) { mirar = Math.max(-1.3, Math.min(1.3, mirar - dx * .005)); inclina = Math.max(-.3, Math.min(.7, inclina + dy * .004)); ultimoArrastre = performance.now(); }
  });
  const soltar = (e) => {
    if (!arrastre || e.pointerId !== arrastre.id) return;
    const fue = arrastre; arrastre = null;
    if (fue.movio || e.type === "pointercancel") return;
    ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    rayo.setFromCamera(ndc, camara);
    const m = rayo.intersectObjects(marcas.map((k) => k.m))[0];
    if (m) irA(marcas.findIndex((k) => k.m === m.object), true);
    else if (rayo.ray.intersectPlane(plano, tocado)) {
      // un toque en la fachada de una sala lleva a su pieza más cercana
      objetivo = { x: Math.max(LIM.x0, Math.min(LIM.x1, tocado.x)), z: Math.max(LIM.z0, Math.min(LIM.z1, tocado.z)) }; abrirAlLlegar = -1;
    }
    pista.classList.add("ida");
  };
  lienzoEscena.addEventListener("pointerup", soltar);
  lienzoEscena.addEventListener("pointercancel", soltar);

  function masCercana() {
    let k = 0, d = Infinity;
    piezas.forEach((a, i) => { const e = Math.hypot(a.px - x, a.pz - z); if (e < d) { d = e; k = i; } });
    return [k, d];
  }
  function medir() { renderer.setSize(innerWidth, innerHeight, false); camara.aspect = innerWidth / innerHeight; camara.updateProjectionMatrix(); }
  addEventListener("resize", medir); medir();

  const deHash = piezas.findIndex((a) => "#" + a.id === location.hash);
  if (deHash >= 0) { x = piezas[deHash].px; z = -1.3; rumbo = Math.PI; empezar(); requestAnimationFrame(() => abrir(deHash)); }

  // ── el bucle ──
  const camPos = new THREE.Vector3(), mira = new THREE.Vector3(), vista = new THREE.Vector3(), tmp = new THREE.Vector3();
  let antes = performance.now(), salaActual = "", primera = true;
  const angulo = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const YAW = .22; // la cámara mira la calle casi de frente, como el papel, con un poco de sesgo para la profundidad
  function cuadro(ahora) {
    const dt = Math.min(.05, (ahora - antes) / 1000); antes = ahora;
    const t = ahora / 1000;
    const yaw = YAW + mirar;

    // movimiento relativo a la cámara: ← → recorre la calle, ↑ ↓ va hacia el fondo o la plaza
    let ix = 0, iz = 0;
    if (!hoja.open) {
      if (teclas.has("ArrowLeft") || teclas.has("KeyA")) ix -= 1;
      if (teclas.has("ArrowRight") || teclas.has("KeyD")) ix += 1;
      if (teclas.has("ArrowUp") || teclas.has("KeyW")) iz += 1;
      if (teclas.has("ArrowDown") || teclas.has("KeyS")) iz -= 1;
    }
    let corre = teclas.has("Shift"), avance = 0, quiere = rumbo;
    if (ix || iz) {
      const mx = Math.cos(yaw) * ix - Math.sin(yaw) * iz, mz = -Math.sin(yaw) * ix - Math.cos(yaw) * iz;
      quiere = Math.atan2(mx, mz); avance = 1;
    } else if (objetivo) {
      const dx = objetivo.x - x, dz = objetivo.z - z, d = Math.hypot(dx, dz);
      if (d < .15) {
        objetivo = null; avance = 0;
        rumbo = abrirAlLlegar >= 0 || Math.abs(z + 1.3) < .3 ? Math.PI : rumbo; // de frente a la pieza
        if (abrirAlLlegar >= 0) { const k = abrirAlLlegar; abrirAlLlegar = -1; abrir(k); }
      } else { quiere = Math.atan2(dx, dz); avance = Math.min(1, d / 1.2); corre = d > 12; }
    }
    const dif = angulo(quiere - rumbo);
    rumbo += dif * Math.min(1, dt * 10);
    vel += (avance * Math.max(0, Math.cos(dif)) * (corre ? 7.5 : 3.6) - vel) * Math.min(1, dt * 8);
    x += Math.sin(rumbo) * vel * dt; z += Math.cos(rumbo) * vel * dt;
    x = Math.max(LIM.x0, Math.min(LIM.x1, x)); z = Math.max(LIM.z0, Math.min(LIM.z1, z));
    for (const [cx, cz, r] of tope) { const dx = x - cx, dz = z - cz, d = Math.hypot(dx, dz); if (d < r + .3 && d > 0) { x = cx + dx / d * (r + .3); z = cz + dz / d * (r + .3); } }
    const rapidez = Math.abs(vel);

    // la pose
    paso += rapidez * dt * 2.5;
    const amp = Math.min(1, rapidez / 3) * (rapidez > 4.5 ? .85 : .6);
    const sp = Math.sin(paso);
    piernas[0].rotation.x = sp * amp; piernas[1].rotation.x = -sp * amp;
    brazos[0].rotation.x = -sp * amp * .9; brazos[1].rotation.x = sp * amp * .9;
    cuerpo.position.y = Math.abs(sp) * .05 * Math.min(1, rapidez / 2) + (QUIETO ? 0 : Math.sin(t * 2) * .01);
    cuerpo.rotation.x = Math.min(.12, vel * .018);
    melena.rotation.x = -Math.min(.25, vel * .04);
    fran.rotation.y = rumbo;
    fran.position.set(x, 0, z);
    sombraFran.position.set(x, .012, z);

    // cámara: de frente a la calle, siguiendo a Fran; arrastrar la gira y luego vuelve
    if (performance.now() - ultimoArrastre > 2200 && !arrastre) { mirar *= 1 - Math.min(1, dt * .9); inclina *= 1 - Math.min(1, dt * .9); }
    const dist = (MOVIL ? 27 : 25) * (1 + Math.max(0, inclina) * .3), alto = (MOVIL ? 5.5 : 5.2) + inclina * 9;
    mira.set(x + (MOVIL ? 0 : 2), 3.1, Math.min(z, 4) - 2);
    camPos.set(mira.x + Math.sin(yaw) * dist, alto + 1, mira.z + Math.cos(yaw) * dist);
    const k = primera ? 1 : Math.min(1, dt * 3.5);
    camara.position.lerp(camPos, k); vista.lerp(mira, k); primera = false;
    camara.lookAt(vista);

    // vida: nubes, pájaros, puntos que laten, humo del café
    if (!QUIETO) {
      for (const n of nubes) { n.position.x += dt * .8; if (n.position.x > 340) n.position.x = -140; }
      for (const p of pajaros) {
        p.position.x += dt * p.userData.v; if (p.position.x > 260) p.position.x = -60;
        const a = p.geometry.attributes.position, f = Math.sin(t * 6 + p.userData.f) * .3; a.setY(0, .3 + f); a.setY(2, .3 + f); a.needsUpdate = true;
      }
      if (escena.userData.humo) escena.userData.humo.position.x = Math.sin(t * 1.3) * .04;
    }
    for (const [i, mk] of marcas.entries()) {
      const fase = ((t * .8 + mk.fase) % 1);
      mk.r.scale.setScalar(.9 + fase * 1.1); mk.r.material.opacity = (1 - fase) * (mk.vista ? .25 : .7);
      mk.m.material.opacity = mk.vista ? .55 : 1; mk.m.material.transparent = true;
      mk.m.position.y = piezas[i].py + (QUIETO ? 0 : Math.sin(t * 2 + mk.fase) * .06);
    }

    // la pieza que tiene delante
    const [k2, d2] = masCercana();
    cercana = d2 < 3.4 ? k2 : -1;
    if (cercana >= 0 && !hoja.open && enCurso) {
      if (globo.hidden || globo.dataset.i !== String(cercana)) { globo.dataset.i = cercana; $("#globo-t").textContent = piezas[cercana].dataset.nombre; }
      globo.hidden = false;
      tmp.set(piezas[cercana].px, piezas[cercana].py + .8, piezas[cercana].pz + .3).project(camara);
      globo.style.transform = `translate(${(tmp.x * .5 + .5) * innerWidth}px, ${(-tmp.y * .5 + .5) * innerHeight}px)`;
    } else globo.hidden = true;
    // la sala: la de la pieza más cercana por la calle
    let ks = 0, ds = Infinity; piezas.forEach((a, i) => { const e = Math.abs(a.px - x); if (e < ds) { ds = e; ks = i; } });
    const sala = piezas[ks].dataset.sala;
    if (sala !== salaActual) { salaActual = sala; botonesSala.forEach((b) => b.setAttribute("aria-current", b.dataset.sala === sala ? "true" : "false")); }

    renderer.render(escena, camara);
    requestAnimationFrame(cuadro);
  }
  requestAnimationFrame(cuadro);
}
