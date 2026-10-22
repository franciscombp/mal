/* ══════════════════════════════════════════════════════════════
   Guagua de pan · el juego, en 3D y en tres actos
     1. Amasar: bolitas y chorizos de masa cruda, que se pegan
        donde caen. Hay moldes (guagua, caballito, chanchito,
        gallinita) para el que no quiera empezar de cero.
     2. Hornear: la masa se infla y se dora mientras corre el
        termómetro. Hay que sacarla a tiempo: antes queda blanca,
        después se quema.
     3. Decorar: manga de crema, rosetas, grageas, pasas y una
        carita de yeso en blanco. La cara también se dibuja.

   Cómo está hecho:
     · Todo es una lista de números. La masa (`a`) son piezas; la
       decoración (`o`) son operaciones; la cocción (`k`) es un
       entero. Eso viaja comprimido en el enlace, después del `#`:
       quien lo abre vuelve a amasar, hornear y decorar la misma
       guagua en su teléfono. No hay servidor.
     · La crema es un tubo con sección de boquilla de estrella que
       se apoya sobre lo que tocaste, siguiendo la normal.
     · El mordisco y el horno los hace el shader: uno descarta lo
       que cae en la mordida y pinta de miga el revés; el otro
       mezcla la masa cruda con el dorado (y con el carbón).
   ══════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const avisa = (t, tipo) => (window.malDS && window.malDS.aviso ? window.malDS.aviso(t, tipo) : null);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const Q = 100;                       // las coordenadas viajan en centésimas
const ent = (v) => Math.round(v * Q);
const DIRECCION = 'franciscombp.github.io/mal/guagua';

/* ─── la despensa ──────────────────────────────────────────── */
const CREMAS = [
  { n: 'Merengue', c: '#fff6ea' },
  { n: 'Rosa', c: '#f6a3c3' },
  { n: 'Fucsia', c: '#e01b6a' },
  { n: 'Mora', c: '#7d3c98' },
  { n: 'Celeste', c: '#8fd0f2' },
  { n: 'Pistacho', c: '#93c84a' },
  { n: 'Yema', c: '#ffcf3d' },
  { n: 'Chocolate', c: '#4a2614' },
];
const BOQUILLAS = [0.026, 0.05, 0.085, 0.13];   // pincel, fina, media, gruesa
const GROSORES = [0.1, 0.17, 0.26];             // los chorizos de masa
const TAMANOS = [0.7, 1, 1.35];                 // las caritas
const GRAGEAS = ['#e01b6a', '#ffcf3d', '#8fd0f2', '#93c84a', '#ffffff', '#7d3c98', '#ff8a3d'];
const MAX_BOCADOS = 16;              // lo que cabe en el shader
const BOCADOS_TALLER = 7;            // el resto se lo come quien la recibe
const MAX_PIEZAS = 60;
const MORDIDA = 0.36;

const NOMBRES = {
  guagua: ['Rosita', 'Michita', 'Carmita', 'Panchito', 'Lucho', 'Toñito', 'Charito', 'Juanchito',
    'Maruja', 'Chabelita', 'Kevin', 'Britany', 'Dayana', 'Jefferson', 'Mayerli', 'Brayan',
    'Pepita', 'Don Gustavo', 'Michael Steven', 'Fernandita', 'Anahí', 'Cuchito'],
  caballito: ['Rayo', 'Canela', 'Trueno', 'Galletón', 'Pegaso', 'Relámpago', 'Pancho Villa', 'Pinto', 'Bolívar', 'Palomo'],
  chanchito: ['Chicharrón', 'Hornado', 'Peppa', 'Don Fritada', 'Manteca', 'Lechoncito', 'Gordo Bonito'],
  gallinita: ['Cocoroca', 'Doña Clueca', 'Pollita', 'Josefina', 'Turuleca', 'Caldo de Gallina'],
  libre: ['Bicho', 'Engendro', 'Criatura', 'Experimento 7', 'La Cosa', 'Pan Mutante', 'Nuevo Animal', 'Sin Nombre'],
};
const MENSAJES = [
  'Para que el 2 de noviembre no te agarre sin guagua.',
  'Con colada morada sabe mejor. La colada la pones tú.',
  'Amasada, horneada y decorada con mis propias manos. Más o menos.',
  'Una guagua para ti y otra para mí, que yo también tengo hambre.',
  'Va con cariño. Si llega mordida, fue el cartero.',
];

/* ─── utilidades ───────────────────────────────────────────── */
function azar(semilla) {            // mulberry32: el mismo número, la misma grajea
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
const limita = (v, a, b) => Math.min(b, Math.max(a, v));
function lienzo(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

/* ══════════════════ LA MASA ═════════════════════════════════
   Una pieza es un arreglo de enteros (centésimas):
     bolita   [0, x, y, z, rx, ry, rz, giro×100]
     chorizo  [1, grosor×100, x, y, z, x, y, z…]               */
const bolita = (c, s, rot) => [0, ent(c.x), ent(c.y), ent(c.z), ent(s.x), ent(s.y), ent(s.z), Math.round((rot || 0) * 100)];
const chorizo = (r, pts) => [1, ent(r)].concat(...pts.map((p) => [ent(p.x), ent(p.y), ent(p.z)]));

/* Los moldes se dibujaron primero en un papel de 600 × 750; `G` y `C`
   pasan esas medidas al espacio 3D, con el pie sobre la lata (y = 0). */
const SG = 0.0062, SC = 0.0066;
const G = (x, y, z) => V((x - 300) * SG, (714 - y) * SG, z || 0);
const C = (x, y, z) => V((x - 300) * SC, 1.6 - (y - 400) * SC, z || 0);
function frenteDe(c, s, x, y) {      // la z de la cara de adelante de un elipsoide
  const k = 1 - ((x - c.x) / s.x) ** 2 - ((y - c.y) / s.y) ** 2;
  return c.z + s.z * Math.sqrt(Math.max(0, k));
}
const CUERPO = { c: V(0, 1.463, 0), s: V(1.042, 1.463, 0.62) };
const CABEZA = { c: V(0, 3.212, 0.03), s: V(0.72, 0.69, 0.52) };

/* La guagua de la primera versión traía los brazos cruzados; solo se
   usa para abrir los enlaces de entonces, que pueden tener crema encima. */
function guaguaConBrazos() {
  const brazos = [[[182, 372], [336, 452]], [[418, 372], [264, 452]]].map(([a, b]) => {
    const A = G(a[0], a[1]), B = G(b[0], b[1]);
    A.z = frenteDe(CUERPO.c, CUERPO.s, A.x, A.y) - 0.05; B.z = frenteDe(CUERPO.c, CUERPO.s, B.x, B.y) - 0.05;
    return chorizo(30 * SG, [A, B]);
  });
  return MOLDES.guagua().concat(brazos);
}

const MOLDES = {
  // la guagua simple: cuerpo y cabeza. Los brazos, si los quiere, se los amasa.
  guagua() {
    return [bolita(CUERPO.c, CUERPO.s), bolita(CABEZA.c, CABEZA.s)];
  },
  caballito() {
    const pata = (a, b, z) => chorizo(30 * SC, [C(a[0], a[1], z), C(b[0], b[1], z)]);
    return [
      chorizo(22 * SC, [C(122, 372, -0.1), C(70, 486, -0.1)]),
      pata([190, 440], [176, 600], -0.17), pata([424, 440], [440, 600], -0.17),
      pata([252, 450], [250, 612], 0.17), pata([366, 450], [368, 612], 0.17),
      bolita(C(300, 400), V(200 * SC, 110 * SC, 0.6)),
      chorizo(50 * SC, [C(420, 362), C(462, 238)]),
      chorizo(17 * SC, [C(452, 176), C(446, 128)]),
      bolita(C(498, 220), V(90 * SC, 56 * SC, 0.4), -0.4),
    ];
  },
  chanchito() {
    const pata = (x, z) => chorizo(0.17, [V(x, 0.7, z), V(x - 0.03, 0.17, z)]);
    return [
      pata(-0.7, -0.25), pata(0.62, -0.25), pata(-0.7, 0.25), pata(0.62, 0.25),
      bolita(V(0, 1.15, 0), V(1.25, 0.82, 0.72)),
      chorizo(0.06, [V(-1.18, 1.32, 0), V(-1.42, 1.48, 0), V(-1.52, 1.34, 0), V(-1.4, 1.26, 0), V(-1.46, 1.6, 0)]),
      bolita(V(1.12, 1.45, 0.05), V(0.6, 0.55, 0.52)),
      bolita(V(1.66, 1.36, 0.05), V(0.17, 0.2, 0.22)),
      chorizo(0.1, [V(0.98, 1.88, 0.18), V(0.8, 2.18, 0.18)]),
      chorizo(0.1, [V(0.98, 1.88, -0.12), V(0.8, 2.18, -0.12)]),
    ];
  },
  gallinita() {
    return [
      chorizo(0.07, [V(0.12, 0.55, 0.2), V(0.06, 0.08, 0.2)]),
      chorizo(0.07, [V(0.12, 0.55, -0.2), V(0.06, 0.08, -0.2)]),
      chorizo(0.12, [V(-0.75, 1.45, 0), V(-1.12, 2.08, 0)]),
      chorizo(0.1, [V(-0.8, 1.3, 0), V(-1.28, 1.78, 0)]),
      bolita(V(0, 1.2, 0), V(1.0, 0.78, 0.68)),
      bolita(V(0.75, 2.02, 0), V(0.45, 0.45, 0.42)),
      bolita(V(1.2, 2.0, 0), V(0.15, 0.09, 0.1)),
      bolita(V(1.08, 1.74, 0), V(0.07, 0.13, 0.06)),
      chorizo(0.07, [V(0.52, 2.42, 0), V(0.62, 2.58, 0), V(0.74, 2.46, 0), V(0.86, 2.6, 0), V(0.96, 2.45, 0)]),
      bolita(V(-0.08, 1.24, 0.5), V(0.55, 0.34, 0.2), -0.25),
    ];
  },
  libre() { return []; },
};

/* ─── geometrías ───────────────────────────────────────────── */
function elipsoide(c, s, rotZ) {
  const g = new THREE.SphereGeometry(1, 64, 48);
  g.scale(s.x, s.y, s.z);
  if (rotZ) g.rotateZ(rotZ);
  g.translate(c.x, c.y, c.z);
  return g;
}
/* Un tubo a lo largo de unos puntos, con las puntas redondas. Con
   `estrias` es crema de boquilla de estrella (y se retuerce un poco
   a lo largo); sin ellas, un chorizo de masa. Los marcos se
   transportan en paralelo, así que no se tuerce de golpe en las curvas. */
function tubo(puntos, r, estrias = 6) {
  if (puntos.length === 2) puntos = [puntos[0], puntos[0].clone().lerp(puntos[1], 0.5), puntos[1]];
  const curva = new THREE.CatmullRomCurve3(puntos, false, 'centripetal');
  const L = Math.max(curva.getLength(), 1e-3);
  const n = limita(Math.ceil(L / (r * 0.3)), 8, 700);
  const rad = estrias ? 18 : 24;
  const marcos = curva.computeFrenetFrames(n, false);
  const pos = new Float32Array((n + 1) * (rad + 1) * 3);
  const P = new THREE.Vector3();
  let k = 0;
  for (let i = 0; i <= n; i++) {
    const u = i / n, s = u * L;
    curva.getPointAt(u, P);
    const N = marcos.normals[i], B = marcos.binormals[i];
    const borde = Math.min(1, Math.min(s, L - s) / (r * 1.05));
    const tapa = Math.sqrt(1 - (1 - borde) ** 2);
    for (let j = 0; j <= rad; j++) {
      const a = (j / rad) * Math.PI * 2;
      const rr = r * tapa * (estrias ? 1 + 0.13 * Math.cos(estrias * a + s * (2.2 / r)) : 1);
      const ca = Math.cos(a) * rr, sa = Math.sin(a) * rr;
      pos[k++] = P.x + ca * N.x + sa * B.x;
      pos[k++] = P.y + ca * N.y + sa * B.y;
      pos[k++] = P.z + ca * N.z + sa * B.z;
    }
  }
  const idx = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < rad; j++) {
      const a = i * (rad + 1) + j, b = a + rad + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);   // hacia afuera: el revés es miga
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  // uv para los poros: a lo largo y alrededor
  const uv = new Float32Array((n + 1) * (rad + 1) * 2);
  for (let i = 0, q = 0; i <= n; i++) for (let j = 0; j <= rad; j++) { uv[q++] = (i / n) * L * 0.6; uv[q++] = j / rad; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
function geometriaPieza(p) {
  if (p[0] === 0) return elipsoide(V(p[1], p[2], p[3]).divideScalar(Q), V(p[4], p[5], p[6]).divideScalar(Q), p[7] / 100);
  const pts = [];
  for (let i = 2; i < p.length; i += 3) pts.push(V(p[i], p[i + 1], p[i + 2]).divideScalar(Q));
  const r = p[1] / Q;
  if (pts.length < 2) return elipsoide(pts[0], V(r * 1.2, r * 1.2, r * 1.1));
  return tubo(pts, r, 0);
}
function moverPieza(p, dx, dy) {
  const o = p.slice();
  const ini = p[0] === 0 ? 1 : 2, fin = p[0] === 0 ? 4 : p.length;
  for (let i = ini; i < fin; i += 3) { o[i] += dx; o[i + 1] += dy; }
  return o;
}
/* El dorado del horno, horneado en los vértices: más tostado en los
   cantos y abajo, más claro donde le daba el calor de frente. */
const TOSTADO = new THREE.Color('#6a300c'), DORADO = new THREE.Color('#d8913f');
function dorar(g) {
  const n = g.attributes.normal, p = g.attributes.position;
  const col = new Float32Array(n.count * 3);
  const L = V(0.25, 0.55, 0.8).normalize(), c = new THREE.Color();
  for (let i = 0; i < n.count; i++) {
    const t = 0.5 + 0.5 * (n.getX(i) * L.x + n.getY(i) * L.y + n.getZ(i) * L.z);
    const piso = limita(p.getY(i) / 0.35, 0, 1);
    c.copy(TOSTADO).lerp(DORADO, THREE.MathUtils.smoothstep(t, 0.1, 0.95) * (0.55 + 0.45 * piso));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

/* ─── los poros del pan, en una textura que se repite ─────── */
let _poros = null;
function poros() {
  if (_poros) return _poros;
  const c = lienzo(256, 256), x = c.getContext('2d'), r = azar(7);
  x.fillStyle = '#fff'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 500; i++) {
    x.fillStyle = `rgba(120,60,20,${0.04 + r() * 0.12})`;
    x.beginPath(); x.arc(r() * 256, r() * 256, 0.6 + r() * 1.8, 0, Math.PI * 2); x.fill();
  }
  _poros = new THREE.CanvasTexture(c);
  _poros.wrapS = _poros.wrapT = THREE.RepeatWrapping;
  _poros.repeat.set(4, 3);
  _poros.colorSpace = THREE.SRGBColorSpace;
  return _poros;
}

/* ─── la carita de yeso ───────────────────────────────────────
   Sale en blanco: la cara se dibuja con el pincel y las pasas. Los
   estilos 1 a 3 son las caras pintadas de la primera versión, para
   que los enlaces que ya se mandaron se sigan viendo igual.       */
function ojo(ctx, x, y) {
  ctx.fillStyle = '#2a1a12';
  ctx.beginPath(); ctx.ellipse(x, y, 7, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x - 2, y - 3, 2.4, 0, Math.PI * 2); ctx.fill();
}
const _caras = {};
function texturaCara(n) {
  if (_caras[n]) return _caras[n];
  // La máscara es una esfera achatada: el frente cae en u = 0,25 y v = 0,5.
  const c = lienzo(1024, 512), ctx = c.getContext('2d');
  ctx.fillStyle = '#f2e0cc'; ctx.fillRect(0, 0, 1024, 512);
  const g = ctx.createRadialGradient(240, 230, 10, 256, 256, 200);
  g.addColorStop(0, '#fffaf2'); g.addColorStop(1, '#f2e0cc');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 512);
  ctx.save();
  ctx.translate(256, 256); ctx.scale(2.4, 2.4); ctx.translate(-300, -200);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.fillStyle = 'rgba(240,110,140,.3)';
  ctx.filter = 'blur(2px)';
  ctx.beginPath(); ctx.arc(262, 222, 14, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(338, 222, 14, 0, Math.PI * 2); ctx.fill();
  ctx.filter = 'none';
  if (n >= 1) {
    ctx.strokeStyle = '#4a2a14'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(282, 142); ctx.quadraticCurveTo(300, 158, 300, 138);
    ctx.quadraticCurveTo(302, 158, 320, 144); ctx.stroke();
  }
  if (n === 1) {
    ojo(ctx, 278, 192); ojo(ctx, 322, 192);
    ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(278, 182, 12, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
    ctx.beginPath(); ctx.arc(322, 182, 12, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
    ctx.fillStyle = '#d6264f';
    ctx.beginPath(); ctx.ellipse(300, 232, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
  } else if (n === 2) {
    ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(278, 190, 10, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    ctx.beginPath(); ctx.arc(322, 190, 10, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    ctx.fillStyle = '#c23a52';
    ctx.beginPath(); ctx.ellipse(300, 232, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
  } else if (n === 3) {
    ojo(ctx, 278, 192);
    ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(312, 194); ctx.quadraticCurveTo(322, 184, 332, 194); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(280, 226); ctx.quadraticCurveTo(300, 242, 320, 226); ctx.stroke();
    ctx.fillStyle = '#ef6f8e';
    ctx.beginPath(); ctx.ellipse(306, 240, 8, 10, 0.2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return (_caras[n] = t);
}
const CARITA = V(0.4, 0.45, 0.15);   // la máscara, a tamaño 1
/* Una base que mira hacia `n` y tiene el arriba lo más parecido posible al arriba del mundo. */
function base(n) {
  const z = n.clone().normalize();
  let y = V(0, 1, 0).addScaledVector(z, -z.y);
  if (y.lengthSq() < 1e-4) y = V(0, 0, -1).addScaledVector(z, z.z);
  y.normalize();
  const x = y.clone().cross(z);
  return { x, y, z, m: new THREE.Matrix4().makeBasis(x, y, z) };
}
function caritaEn(p, n, tam) {
  const s = CARITA.clone().multiplyScalar(TAMANOS[tam] || 1);
  const b = base(n);
  return { s, b, centro: p.clone().addScaledVector(b.z, -s.z * 0.25) };
}

/* ══════════════════ LA CREMA ════════════════════════════════ */
function espiral(R) {                 // la roseta: un chorro que sube dando vueltas
  const pts = [];
  for (let i = 0; i <= 64; i++) {
    const t = i / 64, a = t * 2.4 * Math.PI * 2, rad = R * (1 - t * 0.88);
    pts.push(V(Math.cos(a) * rad, Math.sin(a) * rad, R * 0.1 + t * R * 1.15));
  }
  return pts;
}

/* ─── los materiales, que se hornean y se pueden morder ───── */
function comestible(mat, U, horno) {
  mat.side = THREE.DoubleSide;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uBocados = U.uBocados;
    sh.uniforms.uNBocados = U.uNBocados;
    sh.uniforms.uCoccion = U.uCoccion;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMundo;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 mundo = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          mundo = instanceMatrix * mundo;
        #endif
        vMundo = (modelMatrix * mundo).xyz;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vMundo;
        uniform vec4 uBocados[${MAX_BOCADOS}];
        uniform int uNBocados;
        uniform float uCoccion;`)
      .replace('void main() {', `void main() {
        for (int i = 0; i < ${MAX_BOCADOS}; i++) {
          if (i >= uNBocados) break;
          vec3 d = vMundo - uBocados[i].xyz;
          float dientes = 1.0 + 0.08 * sin(16.0 * atan(d.y, d.x + d.z * 0.7));
          if (length(d) < uBocados[i].w * dientes) discard;
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        ${horno ? `
        diffuseColor.rgb = mix(vec3(0.86, 0.76, 0.56), diffuseColor.rgb, smoothstep(0.05, 1.0, uCoccion));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.025, 0.012, 0.006), smoothstep(1.1, 1.55, uCoccion) * 0.92);` : ''}
        if (!gl_FrontFacing) diffuseColor.rgb = vec3(0.93, 0.80, 0.56);`);
  };
  mat.customProgramCacheKey = () => (horno ? 'comestible-horno' : 'comestible');
  return mat;
}
function materiales(U) {
  return {
    pan: comestible(new THREE.MeshPhysicalMaterial({
      vertexColors: true, map: poros(), bumpMap: poros(), bumpScale: 0.5,
      roughness: 0.62, clearcoat: 0.22, clearcoatRoughness: 0.5,
    }), U, true),
    previa: new THREE.MeshPhysicalMaterial({ color: '#f1e4c8', roughness: 0.85, transparent: true, opacity: 0.75 }),
    cremas: CREMAS.map((c) => comestible(new THREE.MeshPhysicalMaterial({
      color: c.c, roughness: 0.45, clearcoat: 0.25, clearcoatRoughness: 0.35,
    }), U)),
    grageas: comestible(new THREE.MeshStandardMaterial({ roughness: 0.3 }), U),
    pasa: comestible(new THREE.MeshPhysicalMaterial({ color: '#2e140a', roughness: 0.35, clearcoat: 0.6 }), U),
    caras: {},
  };
}

/* ─── el entorno: una habitación difusa para los brillos ──── */
const _entornos = new WeakMap();
function entorno(renderer) {
  if (!_entornos.has(renderer)) {
    const pm = new THREE.PMREMGenerator(renderer);
    _entornos.set(renderer, pm.fromScene(new RoomEnvironment(), 0.04).texture);
    pm.dispose();
  }
  return _entornos.get(renderer);
}

/* ══════════════════ EL VISOR ════════════════════════════════
   Un lienzo con su guagua. Se gira arrastrando fuera de ella (o
   con el clic derecho), se acerca pellizcando o con la rueda. Lo
   que pasa al tocarla lo decide quien lo usa: el taller amasa o
   pinta, el regalo muerde, la vitrina solo deja mirar.           */
class Visor {
  constructor(canvas, op = {}) {
    this.op = op;
    this.canvas = canvas;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: !!op.foto });
    r.setPixelRatio(op.foto ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 0.95;
    this.U = {
      uBocados: { value: Array.from({ length: MAX_BOCADOS }, () => new THREE.Vector4()) },
      uNBocados: { value: 0 },
      uCoccion: { value: 1 },
    };
    this.mat = materiales(this.U);

    const s = this.scene = new THREE.Scene();
    s.environment = entorno(r);
    s.environmentIntensity = 0.5;
    this.cielo = new THREE.HemisphereLight('#fff1dc', '#5a1c50', 1.1);
    s.add(this.cielo);
    const sol = new THREE.DirectionalLight('#fff4e6', 2.3);
    sol.position.set(3, 7, 6);
    sol.castShadow = true;
    sol.shadow.mapSize.set(1024, 1024);
    Object.assign(sol.shadow.camera, { left: -3, right: 3, top: 4.5, bottom: -1, near: 1, far: 20 });
    sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.02; sol.shadow.radius = 4;
    s.add(sol);
    this.sol = sol;
    const contra = new THREE.DirectionalLight('#ffc4e1', 0.8);
    contra.position.set(-5, 3, -4);
    s.add(contra);
    this.brasa = new THREE.PointLight('#ff7a1a', 0, 12, 1.5);
    this.brasa.position.set(0, 0.6, 2.6);
    s.add(this.brasa);

    if (op.plato !== false) {
      // el plato, para decorar y para servir
      this.plato = new THREE.Group();
      const loza = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.05, 0.12, 72),
        new THREE.MeshPhysicalMaterial({ color: '#fbf7f2', roughness: 0.25, clearcoat: 0.8 }));
      loza.position.y = -0.06; loza.receiveShadow = true;
      const filete = new THREE.Mesh(new THREE.TorusGeometry(2.12, 0.025, 8, 96),
        new THREE.MeshStandardMaterial({ color: '#e01b6a', roughness: 0.4 }));
      filete.rotation.x = Math.PI / 2; filete.position.y = 0.005;
      this.plato.add(loza, filete);
      // la lata, para amasar y para el horno
      this.lata = new THREE.Group();
      const metal = new THREE.MeshStandardMaterial({ color: '#5b5f66', roughness: 0.45, metalness: 0.75 });
      const fondo = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.06, 2.6), metal);
      fondo.position.y = -0.03; fondo.receiveShadow = true;
      this.lata.add(fondo);
      [[0, 1.3, 4.8, 0.06], [0, -1.3, 4.8, 0.06], [2.4, 0, 0.06, 2.6], [-2.4, 0, 0.06, 2.6]].forEach(([x, z, w, d]) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), metal);
        b.position.set(x, 0.02, z);
        this.lata.add(b);
      });
      s.add(this.plato, this.lata);
      this.usar('plato');
    }

    this.camara = new THREE.PerspectiveCamera(30, 0.8, 0.1, 60);
    this.figura = new THREE.Group();
    this.pan = new THREE.Group();
    this.adornos = new THREE.Group();
    this.figura.add(this.pan, this.adornos);
    s.add(this.figura);

    this.objetivo = V(0, 1.9, 0);
    this.giro = op.giro != null ? op.giro : -0.25;
    this.cabeceo = 0.2;
    this.dist = 10.5;
    this.piezas = [];
    this.ops = []; this.objetos = []; this.extra = [];
    this.previa = null; this.piezaPrevia = null;
    this.raycaster = new THREE.Raycaster();

    if (!op.foto) {
      this.gestos();
      new ResizeObserver(() => this.medir()).observe(canvas);
      this.medir();
    }
  }

  medir() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camara.aspect = w / h;
    this.camara.updateProjectionMatrix();
    this.dibujar();
  }
  usar(cual) {
    if (!this.plato) return;
    this.plato.visible = cual === 'plato';
    this.lata.visible = cual === 'lata';
  }
  /* El horno: luz de brasa, la masa se infla y se dora. */
  hornear(k, encendido) {
    this.U.uCoccion.value = k;
    const inflado = 1 + 0.05 * limita(k, 0, 1);
    this.pan.scale.set(inflado, inflado, inflado);
    this.brasa.intensity = encendido ? 9 : 0;
    this.cielo.color.set(encendido ? '#ffb070' : '#fff1dc');
    this.dibujar();
  }

  /* ─── cargar una guagua entera ─────────────────────────── */
  vaciar(grupo) {
    grupo.children.slice().forEach((o) => {
      grupo.remove(o);
      if (o.geometry) o.geometry.dispose();
      if (o.isInstancedMesh) o.dispose();
    });
  }
  cargar(e, opciones = {}) {
    this.vaciar(this.adornos);
    this.ops = []; this.objetos = []; this.extra = []; this.previa = null;
    this.ponerMasa(e.a);
    this.hornear(e.k / 100, false);
    e.o.forEach((op) => this.agregar(op, true));
    this.actualizarBocados();
    if (opciones.encuadrar !== false) this.encuadrar();
    this.dibujar();
  }
  ponerMasa(piezas) {
    this.vaciar(this.pan);
    this.piezaPrevia = null;
    this.piezas = piezas.slice();
    this.piezas.forEach((p, i) => this.pan.add(this.mallaPieza(p, i)));
    this.dibujar();
  }
  mallaPieza(p, i) {
    const o = this.malla(dorar(geometriaPieza(p)), this.mat.pan);
    o.userData.pieza = i;
    return o;
  }
  cambiarPieza(i, p) {
    const vieja = this.pan.children.find((o) => o.userData.pieza === i);
    if (vieja) { this.pan.remove(vieja); vieja.geometry.dispose(); }
    this.piezas[i] = p;
    this.pan.add(this.mallaPieza(p, i));
    this.dibujar();
  }
  previaPieza(p) {
    if (this.piezaPrevia) { this.scene.remove(this.piezaPrevia); this.piezaPrevia.geometry.dispose(); this.piezaPrevia = null; }
    if (p) {
      this.piezaPrevia = new THREE.Mesh(geometriaPieza(p), this.mat.previa);
      this.piezaPrevia.castShadow = true;
      this.figura.updateMatrixWorld();
      this.piezaPrevia.applyMatrix4(this.figura.matrixWorld);
      this.scene.add(this.piezaPrevia);
    }
    this.dibujar();
  }
  /* El encuadre sale del tamaño de lo que hay: un caballito pide más
     lejos que una gallinita. */
  encuadrar() {
    const caja = new THREE.Box3();
    this.piezas.forEach((p) => caja.union(new THREE.Box3().setFromBufferAttribute(geometriaPieza(p).attributes.position)));
    if (caja.isEmpty()) { this.objetivo.set(0, 1.6, 0); this.dist = 10.5; return; }
    const c = caja.getCenter(V()), t = caja.getSize(V());
    this.objetivo.set(0, c.y, 0);
    const vert = (t.y / 2 + 0.9) / Math.tan(THREE.MathUtils.degToRad(15));
    const horiz = (Math.max(Math.abs(caja.min.x), Math.abs(caja.max.x), Math.abs(caja.min.z), Math.abs(caja.max.z)) + 0.7)
      / (Math.tan(THREE.MathUtils.degToRad(15)) * Math.min(1, this.camara.aspect || 0.8));
    this.dist = limita(Math.max(vert, horiz), 6, 14);
  }
  malla(g, m) {
    const o = new THREE.Mesh(g, m);
    o.castShadow = true; o.receiveShadow = true;
    return o;
  }

  /* ─── la decoración ─────────────────────────────────────
     0 manga [0, crema, boquilla, x, y, z…]
     1 roseta [1, crema, boquilla, x, y, z, nx, ny, nz]
     2 grageas [2, semilla, x, y, z, nx, ny, nz…]
     3 mordisco [3, x, y, z]
     4 carita [4, tamaño, estilo, x, y, z, nx, ny, nz]
     5 pasa [5, x, y, z, nx, ny, nz]                          */
  construir(op) {
    const t = op[0];
    const pn = (i) => [V(op[i], op[i + 1], op[i + 2]).divideScalar(Q), V(op[i + 3], op[i + 4], op[i + 5]).normalize()];
    if (t === 0) {
      const r = BOQUILLAS[op[2]];
      const pts = [];
      for (let i = 3; i < op.length; i += 3) pts.push(V(op[i] / Q, op[i + 1] / Q, op[i + 2] / Q));
      if (pts.length < 2) {                         // un toque: un copito
        const g = new THREE.SphereGeometry(r * 1.3, 24, 16);
        g.translate(pts[0].x, pts[0].y, pts[0].z);
        return this.malla(g, this.mat.cremas[op[1]]);
      }
      return this.malla(tubo(pts, r), this.mat.cremas[op[1]]);
    }
    if (t === 1) {
      const R = BOQUILLAS[op[2]] * 2.3;
      const o = this.malla(tubo(espiral(R), R * 0.45, 7), this.mat.cremas[op[1]]);
      const [p, n] = pn(3);
      o.quaternion.setFromUnitVectors(V(0, 0, 1), n);
      o.position.copy(p).addScaledVector(n, -R * 0.15);
      return o;
    }
    if (t === 2) {
      const rnd = azar(op[1]);
      const puntos = (op.length - 2) / 6;
      const g = new THREE.CapsuleGeometry(0.022, 0.075, 3, 8);
      const im = new THREE.InstancedMesh(g, this.mat.grageas, puntos * 3);
      im.castShadow = true;
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), giro = new THREE.Quaternion(), c = new THREE.Color();
      let k = 0;
      for (let i = 2; i < op.length; i += 6) {
        const [p, n] = pn(i);
        const { x: t1, y: t2 } = base(n);
        for (let j = 0; j < 3; j++) {
          const a = rnd() * Math.PI * 2, d = rnd() * 0.11;
          const pos = p.clone().addScaledVector(t1, Math.cos(a) * d).addScaledVector(t2, Math.sin(a) * d).addScaledVector(n, 0.02);
          q.setFromUnitVectors(V(0, 1, 0), t1);      // acostada sobre el pan, en cualquier dirección
          giro.setFromAxisAngle(n, rnd() * Math.PI);
          q.premultiply(giro);
          m.compose(pos, q, V(1, 1, 1));
          im.setMatrixAt(k, m);
          im.setColorAt(k, c.set(GRAGEAS[Math.floor(rnd() * GRAGEAS.length)]));
          k++;
        }
      }
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      return im;
    }
    if (t === 4) {
      const [p, n] = pn(3);
      const { s, b, centro } = caritaEn(p, n, op[1]);
      const estilo = op[2];
      if (!this.mat.caras[estilo]) {
        this.mat.caras[estilo] = comestible(new THREE.MeshPhysicalMaterial({
          map: texturaCara(estilo), roughness: 0.5, clearcoat: 0.4, clearcoatRoughness: 0.3,
        }), this.U);
      }
      const g = new THREE.SphereGeometry(1, 48, 32);
      g.scale(s.x, s.y, s.z);
      const o = this.malla(g, this.mat.caras[estilo]);
      o.quaternion.setFromRotationMatrix(b.m);
      o.position.copy(centro);
      return o;
    }
    if (t === 5) {
      const [p, n] = pn(1);
      const g = new THREE.SphereGeometry(1, 16, 12);
      g.scale(0.065, 0.05, 0.035);
      const o = this.malla(g, this.mat.pasa);
      o.quaternion.setFromRotationMatrix(base(n).m);
      o.position.copy(p).addScaledVector(n, 0.012);
      return o;
    }
    return null;                                    // el mordisco no es un objeto
  }
  agregar(op, sinDibujar) {
    const o = this.construir(op);
    if (o) this.adornos.add(o);
    this.ops.push(op); this.objetos.push(o);
    if (op[0] === 3) this.actualizarBocados();
    if (!sinDibujar) this.dibujar();
  }
  quitarUltimo() {
    const op = this.ops.pop(), o = this.objetos.pop();
    if (o) { this.adornos.remove(o); o.geometry.dispose(); if (o.isInstancedMesh) o.dispose(); }
    if (op && op[0] === 3) this.actualizarBocados();
    this.dibujar();
  }
  vistaPrevia(op) {
    if (this.previa) { this.adornos.remove(this.previa); this.previa.geometry.dispose(); this.previa = null; }
    if (op) { this.previa = this.construir(op); if (this.previa) this.adornos.add(this.previa); }
    this.dibujar();
  }
  morder(op) { this.extra.push(op); this.actualizarBocados(); this.dibujar(); }
  bocados() { return this.ops.concat(this.extra).filter((op) => op[0] === 3).slice(0, MAX_BOCADOS); }
  actualizarBocados() { this.U.uNBocados.value = this.bocados().length; }

  /* ─── tocar la guagua ──────────────────────────────────── */
  rayo(origen, dir, soloPan) {
    this.raycaster.set(origen, dir);
    const blancos = soloPan ? this.pan.children : this.pan.children.concat(this.adornos.children.filter((o) => !o.isInstancedMesh && o !== this.previa));
    const h = this.raycaster.intersectObjects(blancos, false)[0];
    if (!h) return null;
    const n = h.face.normal.clone().transformDirection(h.object.matrixWorld);
    if (n.dot(dir) > 0) n.negate();
    const inv = this.figura.quaternion.clone().invert();
    return { p: this.figura.worldToLocal(h.point.clone()), n: n.applyQuaternion(inv).normalize(), pieza: h.object.userData.pieza };
  }
  apuntar(ev) {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    this.ubicar();
    this.raycaster.setFromCamera(ndc, this.camara);
    return this.raycaster.ray.clone();
  }
  tocar(ev, soloPan) {
    const ray = this.apuntar(ev);
    return this.rayo(ray.origin, ray.direction, soloPan);
  }
  /* Donde el dedo cruza el plano z = cte de la figura (para amasar en el aire). */
  alPlano(ev, z) {
    const ray = this.apuntar(ev).applyMatrix4(this.figura.matrixWorld.clone().invert());
    return ray.intersectPlane(new THREE.Plane(V(0, 0, 1), -z), V());
  }
  /* Para «Sorpréndeme»: tirar un rayo de frente, como si la figura no estuviera girada. */
  deFrente(x, y, soloPan = true) {
    const g = this.figura.rotation.y;
    this.figura.rotation.y = 0; this.figura.updateMatrixWorld();
    const h = this.rayo(V(x, y, 10), V(0, 0, -1), soloPan);
    this.figura.rotation.y = g; this.figura.updateMatrixWorld();
    return h;
  }

  gestos() {
    const c = this.canvas, ptrs = new Map();
    let modo = null, pellizco = null;
    const separacion = () => { const [a, b] = [...ptrs.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      c.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 2) {
        if (modo === 'pinta' && this.op.cancela) this.op.cancela();
        modo = 'pellizco'; pellizco = { d: separacion(), dist: this.dist };
        return;
      }
      if (ptrs.size > 2) return;
      if (e.button === 2) { modo = this.fijo ? 'nada' : 'gira'; return; }
      if (this.op.toca && this.op.toca(e)) { modo = this.op.arrastra ? 'pinta' : 'nada'; return; }
      modo = this.fijo ? 'nada' : 'gira';
      if (modo === 'gira') c.classList.add('girando');
    });
    c.addEventListener('pointermove', (e) => {
      const prev = ptrs.get(e.pointerId);
      if (!prev) return;
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (modo === 'gira') {
        this.giro += dx * 0.012;
        this.cabeceo = limita(this.cabeceo + dy * 0.006, -0.05, 0.95);
        this.dibujar();
      } else if (modo === 'pinta') {
        this.op.arrastra(e);
      } else if (modo === 'pellizco' && ptrs.size === 2) {
        this.dist = limita(pellizco.dist * pellizco.d / Math.max(10, separacion()), 4.5, 15);
        this.dibujar();
      }
    });
    const suelta = (e) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.delete(e.pointerId);
      if (modo === 'pinta' && this.op.suelta) this.op.suelta(e);
      if (!ptrs.size) modo = null;
      else if (modo === 'pellizco') modo = 'nada';
      c.classList.remove('girando');
    };
    c.addEventListener('pointerup', suelta);
    c.addEventListener('pointercancel', suelta);
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.dist = limita(this.dist * (1 + e.deltaY * 0.001), 4.5, 15);
      this.dibujar();
    }, { passive: false });
  }
  girar(a, absoluto) {
    const de = this.giro, hasta = absoluto ? a : de + a, t0 = performance.now(), dur = quieto ? 1 : 380;
    const paso = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      this.giro = de + (hasta - de) * (1 - (1 - k) ** 3);
      this.dibujar();
      if (k < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }

  /* ─── pintar ───────────────────────────────────────────── */
  ubicar() {
    const o = this.objetivo;
    this.figura.rotation.y = this.giro;
    this.figura.updateMatrixWorld();
    this.camara.position.set(o.x, o.y + Math.sin(this.cabeceo) * this.dist, o.z + Math.cos(this.cabeceo) * this.dist);
    this.camara.lookAt(o);
    // los mordiscos viven en la figura: se llevan al mundo en cada cuadro
    this.bocados().forEach((op, i) => {
      const p = this.figura.localToWorld(V(op[1] / Q, op[2] / Q, op[3] / Q));
      this.U.uBocados.value[i].set(p.x, p.y, p.z, MORDIDA);
    });
  }
  dibujar() {
    if (this.op.foto) { this.ubicar(); this.renderer.render(this.scene, this.camara); return; }
    if (this._pendiente) return;
    this._pendiente = true;
    requestAnimationFrame(() => {
      this._pendiente = false;
      this.ubicar();
      this.renderer.render(this.scene, this.camara);
    });
  }
}

/* ─── la foto: la misma guagua, de frente y sin plato ─────── */
let estudio = null;
function foto(e, w, h, extra) {
  if (!estudio) estudio = new Visor(lienzo(w, h), { foto: true, plato: false, giro: -0.22 });
  estudio.renderer.setSize(w, h, false);
  estudio.camara.aspect = w / h;
  estudio.camara.updateProjectionMatrix();
  estudio.cabeceo = 0.12;
  estudio.cargar(e);
  (extra || []).forEach((op) => estudio.extra.push(op));
  estudio.actualizarBocados();
  estudio.dibujar();
  const c = lienzo(w, h);
  c.getContext('2d').drawImage(estudio.canvas, 0, 0, w, h);
  return c;
}

/* ══════════════════ EL ENLACE ═══════════════════════════════ */
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
/* Los trazos van en diferencias: números chicos, que se comprimen mejor.
   `PASOS` dice, por tipo, dónde empiezan los puntos y cuánto mide cada uno. */
const PASOS = { op: { 0: [3, 3], 2: [2, 6] }, pieza: { 1: [2, 3] } };
function aDeltas(x, tabla) {
  const p = tabla[x[0]];
  if (!p) return x.slice();
  const o = x.slice();
  for (let i = x.length - 1; i >= p[0] + p[1]; i--) o[i] = x[i] - x[i - p[1]];
  return o;
}
function deDeltas(x, tabla) {
  if (!Array.isArray(x)) return x;
  const p = tabla[x[0]];
  if (!p) return x.slice();
  const o = x.slice();
  for (let i = p[0] + p[1]; i < o.length; i++) o[i] += o[i - p[1]];
  return o;
}
async function codificar(d) {
  const plano = Object.assign({}, d, { a: d.a.map((x) => aDeltas(x, PASOS.pieza)), o: d.o.map((x) => aDeltas(x, PASOS.op)) });
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
  const o = (Array.isArray(d.o) ? d.o : []).map((x) => deDeltas(x, PASOS.op));
  if (d.v === 2) return sano(deLaPrimeraHornada(d, o));
  if (d.v !== 3) throw new Error('otra hornada');
  return sano(Object.assign(d, { a: (Array.isArray(d.a) ? d.a : []).map((x) => deDeltas(x, PASOS.pieza)), o }));
}
/* Los enlaces de la primera versión 3D: molde fijo, cara pintada y
   tres boquillas. Se traducen a la receta de ahora. */
function deLaPrimeraHornada(d, o) {
  const f = d.f === 'caballito' ? 'caballito' : 'guagua';
  const ops = o.map((op) => (Array.isArray(op) && (op[0] === 0 || op[0] === 1) ? [op[0], op[1], op[2] + 1, ...op.slice(3)] : op));
  const cara = [];
  if (f === 'guagua' && d.c >= 1 && d.c <= 3) cara.push([4, 1, d.c, 0, 320, 52, 0, 0, 100]);
  if (f === 'guagua' && d.c === 4) {
    const pasa = (x, y) => { const p = G(x, y); p.z = frenteDe(CABEZA.c, CABEZA.s, p.x, p.y); cara.push([5, ent(p.x), ent(p.y), ent(p.z), 0, 0, 100]); };
    pasa(272, 188); pasa(328, 188); pasa(300, 214);
    for (let i = 0; i < 5; i++) pasa(270 + i * 15, 242 + Math.sin(i / 4 * Math.PI) * 9);
  }
  return Object.assign({}, d, { v: 3, a: f === 'guagua' ? guaguaConBrazos() : MOLDES[f](), k: 100, o: cara.concat(ops), f });
}
/* Lo que llega por un enlace lo escribió cualquiera: se filtra todo. */
function sano(d) {
  const num = (v) => typeof v === 'number' && isFinite(v) && Math.abs(v) <= 3000;
  const txt = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
  let puntos = 0;
  const lista = (x, max) => (Array.isArray(x) ? x.slice(0, max).filter((y) => Array.isArray(y) && y.every(num)) : []);
  const a = lista(d.a, MAX_PIEZAS).filter((p) => {
    puntos += p.length;
    if (p[0] === 0) return p.length === 8 && p[4] > 0 && p[5] > 0 && p[6] > 0;
    if (p[0] === 1) return p.length >= 5 && (p.length - 2) % 3 === 0 && p[1] > 0;
    return false;
  });
  const o = lista(d.o, 800).filter((op) => {
    const t = op[0];
    puntos += op.length;
    if (puntos > 60000) return false;
    if (t === 0) return op.length >= 6 && (op.length - 3) % 3 === 0 && CREMAS[op[1]] && BOQUILLAS[op[2]] !== undefined;
    if (t === 1) return op.length === 9 && CREMAS[op[1]] && BOQUILLAS[op[2]] !== undefined;
    if (t === 2) return op.length >= 8 && (op.length - 2) % 6 === 0;
    if (t === 3) return op.length === 4;
    if (t === 4) return op.length === 9 && TAMANOS[op[1]] && op[2] >= 0 && op[2] <= 3 && Number.isInteger(op[2]);
    if (t === 5) return op.length === 7;
    return false;
  });
  return {
    v: 3, a, o,
    k: num(d.k) ? limita(Math.round(d.k), 0, 160) : 100,
    f: typeof d.f === 'string' && MOLDES[d.f] ? d.f : 'libre',
    n: txt(d.n, 40), p: txt(d.p, 40), d: txt(d.d, 40), m: txt(d.m, 160),
  };
}

/* ─── el horno opina, y la panadera también ───────────────── */
function punto(k) {
  if (k < 0.75) return { t: 'Cruda', f: 'La sacaste cruda, mijo. Eso todavía es masa de amasar.' };
  if (k < 0.92) return { t: 'Blanquita', f: 'Le faltó horno: está más blanca que oficinista en invierno.' };
  if (k <= 1.08) return { t: '¡En su punto!', f: 'En su punto: dorada como para foto de calendario.' };
  if (k <= 1.25) return { t: 'Tostadita', f: 'Tostadita, como le gusta al abuelo. Crocante por fuera.' };
  return { t: 'Quemada', f: 'Se te quemó. Igual se come: la parte negra da suerte.' };
}
function veredicto(e) {
  const cuenta = (t) => e.o.filter((op) => op[0] === t).length;
  const trazos = cuenta(0), rosetas = cuenta(1), grag = cuenta(2), bocados = cuenta(3);
  const colores = new Set(e.o.filter((op) => op[0] < 2).map((op) => op[1])).size;
  const k = e.k / 100, total = e.o.length;
  const cara = cuenta(4) || cuenta(5);
  let frase;
  if (k > 1.25) frase = punto(k).f;
  else if (!total) frase = '¿Y la crema? Así pelada parece pan de la tienda de la esquina.';
  else if (bocados >= 3) frase = 'Eso ya no es una guagua, es la evidencia. Regálala igual: es la intención.';
  else if (bocados) frase = 'Regalar una guagua mordida es amor del verdadero. O hambre.';
  else if (k < 0.92) frase = punto(k).f;
  else if (total > 70) frase = 'Eso ya no es guagua, es pastel de primera comunión. Me encanta.';
  else if (colores >= 6) frase = 'Más colores que el mercado de San Roque un sábado. Así me gusta.';
  else if (grag > trazos + rosetas) frase = 'Más grageas que pan. Esta guagua va a dejar la mesa como confeti.';
  else if (e.f === 'libre' && e.a.length > 3) frase = 'No sé qué animal es, pero lo quiero. Yo tampoco hubiera sabido amasarlo.';
  else if (!cara && e.f === 'guagua') frase = 'Bonita, pero sin carita. Una guagua sin cara es un pan con ropa.';
  else if (e.f === 'caballito') frase = 'Un caballito bien enjaezado. Que no se le vaya galopando al vecino.';
  else frase = elige([
    'Bien bonita le quedó, mijo. La abuelita estaría orgullosa.',
    'Esta guagua tiene cara de que va a salir candidata.',
    'Linda. Ojalá la colada esté igual de espesa.',
    'Así mismo se decoraban en el horno de la calle Rocafuerte.',
  ]);
  const horno = k >= 0.92 && k <= 1.08 ? 1 : k > 1.25 || k < 0.75 ? -2 : 0;
  const nota = Math.max(1, Math.min(10, 4 + Math.min(colores, 3) + (rosetas ? 1 : 0) + (grag ? 1 : 0) + (cara ? 1 : 0) + horno - (total < 4 ? 2 : 0)));
  const razon = k > 1.25 ? 'por quemada' : k < 0.92 ? 'por blanquita' : 'porque no trajo colada';
  const descuento = nota === 10 ? 'Diez. No le bajo nada.' : `${nota}/10. Le bajé ${10 - nota} ${10 - nota === 1 ? 'punto' : 'puntos'} ${razon}.`;
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
  const lineas = [];
  let l = '';
  texto.split(/\s+/).forEach((p) => {
    const prueba = l ? l + ' ' + p : p;
    if (ctx.measureText(prueba).width > ancho && l) { lineas.push(l); l = p; } else l = prueba;
  });
  if (l) lineas.push(l);
  lineas.slice(0, max).forEach((ln, i) => ctx.fillText(i === max - 1 && lineas.length > max ? ln + '…' : ln, x, y + i * alto));
}
function colada(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  [-40, 0, 40].forEach((dx) => {
    ctx.beginPath(); ctx.moveTo(dx, -40);
    ctx.bezierCurveTo(dx + 22, -70, dx - 22, -100, dx, -135); ctx.stroke();
  });
  ctx.fillStyle = '#f5ece0';
  ctx.beginPath(); ctx.moveTo(-95, -20); ctx.lineTo(95, -20); ctx.lineTo(78, 110);
  ctx.quadraticCurveTo(0, 135, -78, 110); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#f5ece0'; ctx.lineWidth = 16;
  ctx.beginPath(); ctx.arc(102, 40, 32, -Math.PI / 2, Math.PI / 2); ctx.stroke();
  ctx.fillStyle = '#e01b6a';
  ctx.fillRect(-88, 30, 176, 12);
  ctx.fillStyle = '#4b1450';
  ctx.beginPath(); ctx.ellipse(0, -20, 95, 24, 0, 0, Math.PI * 2); ctx.fill();
  const rnd = azar(9);
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = elige(['#a1236a', '#d9415f', '#ffcf3d', '#6d1f6f'], rnd);
    ctx.beginPath(); ctx.arc((rnd() - 0.5) * 150, -20 + (rnd() - 0.5) * 26, 4 + rnd() * 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
const queEs = (e) => ({ guagua: 'una guagua', caballito: 'un caballito', chanchito: 'un chanchito', gallinita: 'una gallinita' }[e.f] || 'un animalito');
const nombreDe = (e) => e.n || ({ guagua: 'Guagua', caballito: 'Caballito', chanchito: 'Chanchito', gallinita: 'Gallinita' }[e.f] || 'Animalito');
async function tarjeta(e) {
  try { await Promise.all([document.fonts.load('800 80px Syne'), document.fonts.load('600 30px Inter'), document.fonts.load('italic 400 30px Inter')]); } catch (err) { /* sin fuentes, igual sale */ }
  const c = lienzo(1080, 1350);
  const ctx = c.getContext('2d');
  const fondo = ctx.createLinearGradient(0, 0, 0, 1350);
  fondo.addColorStop(0, '#2e0f36'); fondo.addColorStop(1, '#5a1c50');
  ctx.fillStyle = fondo; ctx.fillRect(0, 0, 1080, 1350);
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
      const a = j / 8 * Math.PI * 2, d = j % 2 ? r * 0.35 : r * 1.6;
      ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
    }
    ctx.closePath(); ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffc93c';
  ctx.font = '600 30px Inter, system-ui, sans-serif';
  ctx.fillText('2 DE NOVIEMBRE · DÍA DE DIFUNTOS', 540, 104);
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 84px Syne, Inter, system-ui, sans-serif';
  const que = queEs(e);
  ctx.fillText(e.d ? 'Te regalo' : que.charAt(0).toUpperCase() + que.slice(1), 540, 196, 1000);
  ctx.fillText(e.d ? que : 'para ti', 540, 282, 1000);
  const alto = 780, ancho = alto * 0.8, gx = 540 - ancho / 2 - 60, gy = 300;
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.ellipse(gx + ancho / 2, gy + alto - 70, ancho * 0.34, 24, 0, 0, Math.PI * 2); ctx.fill();
  ctx.drawImage(foto(e, 800, 1000), gx, gy, ancho, alto);
  colada(ctx, 870, 960, 0.9);
  const nombre = '«' + nombreDe(e) + '»';
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
    envolver(ctx, e.m, 540, y, 900, 40, quien ? 1 : 2);
  }
  ctx.font = '600 24px Inter, system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,201,60,.9)';
  ctx.fillText('Amasa y decora la tuya en ' + DIRECCION, 540, 1322);
  return c;
}
const aBlob = (c) => new Promise((ok) => c.toBlob(ok, 'image/png'));

/* ─── la vitrina ───────────────────────────────────────────── */
const CLAVE = 'guagua:vitrina3d', BORRADOR = 'guagua:borrador-amasado';
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

/* El enlace lleva la piel con la que se abrió (?marca=mercio), pero
   nunca el modo incrustado: quien lo recibe lo abre a pantalla entera. */
function direccion() {
  const m = new URLSearchParams(location.search).get('marca');
  return location.origin + location.pathname + (m ? '?marca=' + encodeURIComponent(m) : '');
}

/* ─── el sonido de morder ──────────────────────────────────── */
let audio = null;
function crunch() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const dur = 0.16, n = Math.floor(audio.sampleRate * dur);
    const buf = audio.createBuffer(1, n, audio.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.5) * (Math.random() < 0.3 ? 1 : 0.35);
    const src = audio.createBufferSource(); src.buffer = buf;
    const f = audio.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800 + Math.random() * 1200; f.Q.value = 0.8;
    const g = audio.createGain(); g.gain.value = 0.35;
    src.connect(f).connect(g).connect(audio.destination);
    src.start();
  } catch (e) { /* sin audio, se come en silencio */ }
  if (navigator.vibrate) navigator.vibrate(18);
}
function ding() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const o = audio.createOscillator(), g = audio.createGain();
    o.frequency.value = 1320; o.type = 'sine';
    g.gain.setValueAtTime(0.25, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.9);
    o.connect(g).connect(audio.destination);
    o.start(); o.stop(audio.currentTime + 0.9);
  } catch (e) { /* sin campanita */ }
}

/* ══════════════════ EL TALLER ═══════════════════════════════ */
const estado = {
  etapa: 'amasar',
  f: 'guagua', a: [], k: 0, o: [],
  mano: 'bolita', grosor: 1,
  herramienta: 'manga', crema: 1, boquilla: 2, tamano: 1,
  id: null, n: '', p: '', d: '', m: '',
};
let taller = null;       // el visor del taller
let trazo = null;        // lo que el dedo está haciendo al decorar
let amase = null;        // …y al amasar
let historia = [];       // las masas de antes, para deshacer al amasar
const receta = () => ({ v: 3, f: estado.f, a: estado.a, k: estado.k, o: estado.o, n: estado.n, p: estado.p, d: estado.d, m: estado.m });

function guardarBorrador() {
  almacen.poner(BORRADOR, Object.assign(receta(), { id: estado.id, etapa: estado.etapa }));
}
function actualizarEtiqueta() {
  const n = estado.etapa === 'amasar' ? estado.a.length : estado.o.length;
  const que = estado.etapa === 'amasar' ? `Masa cruda en 3D con ${n} ${n === 1 ? 'pieza' : 'piezas'}. Arrastra para poner bolitas y chorizos.`
    : `${queEs(estado)} de pan en 3D con ${n} ${n === 1 ? 'decoración' : 'decoraciones'}. Arrastra sobre ella para decorarla y fuera de ella para girarla.`;
  $('#lienzo').setAttribute('aria-label', que.charAt(0).toUpperCase() + que.slice(1));
  $('#deshacer').disabled = estado.etapa === 'amasar' ? !historia.length : estado.etapa === 'horno' || !estado.o.length;
}
function recargar() { taller.cargar(estado); actualizarEtiqueta(); }

/* ─── 1. amasar ───────────────────────────────────────────── */
function recordar() {
  historia.push(JSON.stringify(estado.a));
  if (historia.length > 50) historia.shift();
}
function cambiarMasa(a, molde) {
  estado.a = a;
  if (molde) estado.f = molde;
  guardarBorrador(); actualizarEtiqueta();
}
/* Al amasar no se gira: lo que cae en la lata se arma de frente. Lo
   que se pone encima de otra pieza se pega a su superficie. */
function tocarMasa(ev) {
  const mano = estado.mano;
  const hit = taller.tocar(ev, true);
  if (mano === 'mover' || mano === 'quitar') {
    if (!hit || hit.pieza == null) return true;
    if (mano === 'quitar') {
      recordar();
      const a = estado.a.filter((_, i) => i !== hit.pieza);
      taller.ponerMasa(a); cambiarMasa(a);
      return true;
    }
    const z = estado.a[hit.pieza][estado.a[hit.pieza][0] === 0 ? 3 : 4] / Q;
    amase = { mano, i: hit.pieza, z, desde: taller.alPlano(ev, z), original: estado.a[hit.pieza], movido: false };
    return true;
  }
  if (estado.a.length >= MAX_PIEZAS) { avisa('Ya no cabe más masa en la lata.'); return true; }
  if (mano === 'bolita') {
    const c = hit ? hit.p.clone() : taller.alPlano(ev, 0);
    if (!c) return true;
    amase = { mano, c, sobre: !!hit, pieza: null };
    estirarBolita(c);
  } else {
    const r = GROSORES[estado.grosor];
    const p = hit ? hit.p.clone().addScaledVector(hit.n, -r * 0.35) : taller.alPlano(ev, 0);
    if (!p) return true;
    amase = { mano, r, pts: [p] };
    taller.previaPieza(chorizo(r, amase.pts));
  }
  return true;
}
function estirarBolita(q) {
  const { c } = amase;
  const dx = Math.abs(q.x - c.x), dy = Math.abs(q.y - c.y), d = Math.hypot(dx, dy);
  // hacia el lado se hace ancha; hacia arriba, alta; en diagonal, redonda
  const rx = Math.max(dx, d * 0.6, 0.12), ry = Math.max(dy, d * 0.6, 0.12);
  const rz = Math.min(0.75, Math.min(rx, ry) * 0.7);
  const z = amase.sobre ? c.z - rz * 0.35 : 0;
  amase.pieza = bolita(V(c.x, c.y, z), V(rx, ry, rz));
  taller.previaPieza(amase.pieza);
}
function arrastrarMasa(ev) {
  if (!amase) return;
  if (amase.mano === 'bolita') {
    const q = taller.alPlano(ev, amase.c.z);
    if (q) estirarBolita(q);
  } else if (amase.mano === 'chorizo') {
    const hit = taller.tocar(ev, true);
    const ultimo = amase.pts[amase.pts.length - 1];
    const p = hit ? hit.p.clone().addScaledVector(hit.n, -amase.r * 0.35) : taller.alPlano(ev, 0);
    if (!p || p.distanceTo(ultimo) < amase.r * 0.5 || amase.pts.length > 120) return;
    amase.pts.push(p);
    taller.previaPieza(chorizo(amase.r, amase.pts));
  } else if (amase.mano === 'mover') {
    const q = taller.alPlano(ev, amase.z);
    if (!q || !amase.desde) return;
    if (!amase.movido) { recordar(); amase.movido = true; }
    const p = moverPieza(amase.original, ent(q.x - amase.desde.x), ent(q.y - amase.desde.y));
    estado.a[amase.i] = p;
    taller.cambiarPieza(amase.i, p);
  }
}
function soltarMasa() {
  if (!amase) return;
  const m = amase; amase = null;
  taller.previaPieza(null);
  if (m.mano === 'bolita' && m.pieza) {
    recordar();
    const a = estado.a.concat([m.pieza]);
    taller.ponerMasa(a); cambiarMasa(a);
  } else if (m.mano === 'chorizo') {
    recordar();
    const p = m.pts.length > 1 ? chorizo(m.r, m.pts) : bolita(m.pts[0], V(m.r * 1.3, m.r * 1.3, m.r * 1.1));
    const a = estado.a.concat([p]);
    taller.ponerMasa(a); cambiarMasa(a);
  } else if (m.mano === 'mover' && m.movido) {
    cambiarMasa(estado.a);
  }
}

/* ─── 2. hornear ──────────────────────────────────────────── */
let horneando = null;
const KMAX = 1.6, SEGUNDOS = 6;       // en 6 s llega al punto; después se quema
function prenderHorno() {
  if (!estado.a.length) { avisa('Primero amasa algo: el horno no hornea aire.'); return; }
  irA('horno');
  estado.k = 0; estado.o = [];
  taller.cargar(estado);
  $('#horno-fin').hidden = true;
  $('#sacar').hidden = false;
  $('#sacar').disabled = false;
  $('.mesa').classList.add('en-horno');
  const t0 = performance.now();
  const paso = (t) => {
    if (!horneando) return;
    const k = Math.min(KMAX, ((t - t0) / 1000) / SEGUNDOS);
    estado.k = Math.round(k * 100);
    taller.hornear(k, true);
    if (!quieto) taller.giro += 0.004;
    termometro(k);
    if (k >= KMAX) { sacarDelHorno(); return; }
    horneando = requestAnimationFrame(paso);
  };
  horneando = requestAnimationFrame(paso);
}
function termometro(k) {
  $('#termo').style.width = (k / KMAX * 100) + '%';
  $('#horno-estado').textContent = punto(k).t;
  $('#termo').parentElement.setAttribute('aria-valuenow', Math.round(k * 100));
}
function sacarDelHorno() {
  if (!horneando) return;
  cancelAnimationFrame(horneando);
  horneando = null;
  ding();
  const k = estado.k / 100;
  taller.hornear(k, false);
  $('.mesa').classList.remove('en-horno');
  $('#sacar').hidden = true;
  $('#horno-fin').hidden = false;
  $('#horno-veredicto').textContent = punto(k).f;
  $('#horno-estado').textContent = punto(k).t;
  $('[data-ir="decorar"]').disabled = estado.k < 50;
  guardarBorrador();
}
function apagarHorno() {
  if (horneando) cancelAnimationFrame(horneando);
  horneando = null;
  $('.mesa').classList.remove('en-horno');
}

/* ─── 3. decorar ──────────────────────────────────────────── */
function fijar(op) {
  estado.o.push(op);
  taller.agregar(op);
  guardarBorrador();
  actualizarEtiqueta();
}
/* El chorro de la manga se apoya sobre lo que tocaste, levantado
   medio grosor por la normal, para que quede encima y no adentro. */
const puntoDeCrema = (hit, r) => hit.p.clone().addScaledVector(hit.n, r * 0.55);
const pn = (hit) => [ent(hit.p.x), ent(hit.p.y), ent(hit.p.z), ent(hit.n.x), ent(hit.n.y), ent(hit.n.z)];
function tocarDecorar(ev) {
  const hit = taller.tocar(ev);
  if (!hit) return false;
  const h = estado.herramienta;
  if (h === 'manga') {
    const q = puntoDeCrema(hit, BOQUILLAS[estado.boquilla]);
    trazo = [0, estado.crema, estado.boquilla, ent(q.x), ent(q.y), ent(q.z)];
    taller.vistaPrevia(trazo);
  } else if (h === 'grageas') {
    trazo = [2, Math.floor(Math.random() * 1e9), ...pn(hit)];
    taller.vistaPrevia(trazo);
  } else if (h === 'roseta') {
    fijar([1, estado.crema, estado.boquilla, ...pn(hit)]);
  } else if (h === 'pasa') {
    fijar([5, ...pn(hit)]);
  } else if (h === 'carita') {
    fijar([4, estado.tamano, 0, ...pn(hit)]);
  } else if (h === 'mordisco') {
    if (estado.o.filter((op) => op[0] === 3).length >= BOCADOS_TALLER) {
      avisa('Ya está bien mordida. Deja algo para quien la reciba.');
    } else { fijar([3, ent(hit.p.x), ent(hit.p.y), ent(hit.p.z)]); crunch(); }
  }
  return true;
}
function arrastrarDecorar(ev) {
  if (!trazo) return;
  const hit = taller.tocar(ev);
  if (!hit) return;
  const op = trazo;
  if (op[0] === 0) {
    const r = BOQUILLAS[op[2]], q = puntoDeCrema(hit, r);
    const u = V(op[op.length - 3], op[op.length - 2], op[op.length - 1]).divideScalar(Q);
    const d = q.distanceTo(u);
    if (d < Math.max(r * 0.6, 0.025)) return;
    if (d > 0.7 || op.length > 1200) {            // saltó a otra pieza: otro chorro
      fijar(op);
      trazo = [0, op[1], op[2], ent(q.x), ent(q.y), ent(q.z)];
    } else op.push(ent(q.x), ent(q.y), ent(q.z));
  } else {
    const u = V(op[op.length - 6], op[op.length - 5], op[op.length - 4]).divideScalar(Q);
    if (hit.p.distanceTo(u) < 0.14) return;
    if (op.length > 600) { fijar(op); trazo = [2, op[1] + 1]; }
    trazo.push(...pn(hit));
  }
  taller.vistaPrevia(trazo);
}
function soltarDecorar() {
  if (!trazo) return;
  const op = trazo; trazo = null;
  taller.vistaPrevia(null);
  fijar(op);
}

/* ─── las etapas ──────────────────────────────────────────── */
const PISTAS = {
  amasar: 'Bolita: arrastra hacia el lado para hacerla ancha y hacia arriba para hacerla alta. Chorizo: arrastra el dedo como si lo estiraras. Lo que pones encima de otra pieza se pega.',
  horno: 'Mírala dorarse y sácala a tiempo. Antes queda blanca; después, carbón.',
  decorar: 'Arrastra sobre la guagua para decorarla. Arrastra fuera de ella para girarla y pellizca (o usa la rueda) para acercarte. La cara también se dibuja: carita de yeso, pasas y el pincel.',
};
function irA(etapa) {
  if (etapa !== 'horno') apagarHorno();
  estado.etapa = etapa;
  $('#taller').dataset.etapa = etapa;
  $$('[data-etapa]').forEach((s) => { s.hidden = s.dataset.etapa !== etapa; });
  $$('[data-ir]').forEach((b) => {
    const i = ['amasar', 'horno', 'decorar'].indexOf(b.dataset.ir), j = ['amasar', 'horno', 'decorar'].indexOf(etapa);
    if (b.dataset.ir === etapa) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    b.classList.toggle('hecha', i < j);
  });
  $('[data-ir="decorar"]').disabled = estado.k < 50;
  $('#mesa-pista').textContent = PISTAS[etapa];
  taller.fijo = etapa === 'amasar';
  taller.usar(etapa === 'decorar' ? 'plato' : 'lata');
  if (etapa === 'amasar') {
    taller.hornear(0, false);
    taller.cabeceo = 0.12;
    taller.girar(0, true);
  } else if (etapa === 'decorar') {
    taller.hornear(estado.k / 100, false);
    taller.cabeceo = 0.2;
  }
  $('#sorpresa').hidden = etapa === 'horno';
  guardarBorrador(); actualizarEtiqueta();
}
function volverAAmasar() {
  if (estado.etapa === 'amasar') return;
  if (estado.o.length && !confirm('Volver a amasar bota la decoración y la masa vuelve a estar cruda. ¿Seguimos?')) return;
  estado.o = []; estado.k = 0;
  taller.cargar(estado, { encuadrar: false });
  irA('amasar');
}
function aDecorar() {
  if (estado.k < 50) return;
  taller.cargar(estado);
  irA('decorar');
}

function montarTaller() {
  try {
    taller = new Visor($('#lienzo'), {
      toca: (ev) => (estado.etapa === 'amasar' ? tocarMasa(ev) : estado.etapa === 'decorar' ? tocarDecorar(ev) : false),
      arrastra: (ev) => (estado.etapa === 'amasar' ? arrastrarMasa(ev) : arrastrarDecorar(ev)),
      suelta: () => (estado.etapa === 'amasar' ? soltarMasa() : soltarDecorar()),
      cancela: () => { trazo = null; amase = null; taller.vistaPrevia(null); taller.previaPieza(null); },
    });
  } catch (err) {
    $('#sin-3d').hidden = false;
    return false;
  }
  const grupoDe = (sel, clave, num) => $$(sel).forEach((b) => b.addEventListener('click', () => {
    const v = b.getAttribute(sel.slice(1, -1));
    estado[clave] = num ? +v : v;
    $$(sel).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    if (clave === 'herramienta' || clave === 'mano') $('#taller').dataset.herramienta = estado[clave];
  }));
  grupoDe('[data-mano]', 'mano');
  grupoDe('[data-grosor]', 'grosor', true);
  grupoDe('[data-herramienta]', 'herramienta');
  grupoDe('[data-boquilla]', 'boquilla', true);
  grupoDe('[data-tamano]', 'tamano', true);
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
  $$('[data-molde]').forEach((b) => b.addEventListener('click', () => {
    const f = b.dataset.molde;
    if (estado.a.length && !confirm(f === 'libre' ? '¿Vaciamos la lata?' : 'Eso bota la masa que tienes. ¿Seguimos?')) return;
    recordar();
    const a = MOLDES[f]();
    estado.n = elige(NOMBRES[f]);
    taller.ponerMasa(a); cambiarMasa(a, f);
    taller.encuadrar(); taller.dibujar();
  }));
  $$('[data-ir]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.ir === 'amasar') volverAAmasar();
    else if (b.dataset.ir === 'horno') { if (estado.etapa !== 'horno') prenderHorno(); }
    else aDecorar();
  }));
  $('#al-horno').addEventListener('click', prenderHorno);
  $('#sacar').addEventListener('click', sacarDelHorno);
  $('#a-decorar').addEventListener('click', aDecorar);
  $('#otra-vez').addEventListener('click', volverAAmasar);
  $('#a-amasar').addEventListener('click', volverAAmasar);
  $('#girar-izq').addEventListener('click', () => taller.girar(-Math.PI / 4));
  $('#girar-der').addEventListener('click', () => taller.girar(Math.PI / 4));
  $('#deshacer').addEventListener('click', deshacer);
  document.addEventListener('keydown', (ev) => {
    if (ev.target.closest('input,textarea')) return;
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') { ev.preventDefault(); deshacer(); }
  });
  $('#lienzo').addEventListener('keydown', (ev) => {
    if (taller.fijo) return;
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); taller.girar(-Math.PI / 8); }
    if (ev.key === 'ArrowRight') { ev.preventDefault(); taller.girar(Math.PI / 8); }
  });
  $('#sorpresa').addEventListener('click', () => {
    if (estado.etapa === 'amasar') {
      const f = elige(['guagua', 'caballito', 'chanchito', 'gallinita'].filter((x) => x !== estado.f));
      $(`[data-molde="${f}"]`).click();
      return;
    }
    sorpresa().forEach((op) => { estado.o.push(op); taller.agregar(op, true); });
    taller.dibujar(); guardarBorrador(); actualizarEtiqueta();
  });
  $('#de-nuevo').addEventListener('click', () => {
    if (estado.o.length && !confirm('¿Empezamos otra desde la masa?')) return;
    nueva();
  });
  $('#regalar').addEventListener('click', abrirRegalo);
  $('#guardar').addEventListener('click', async () => {
    await guardarMia();
    avisa('Guardada en tu vitrina.', 'ok');
    pintarVitrina('mia');
  });
  return true;
}

function deshacer() {
  if (estado.etapa === 'amasar') {
    if (!historia.length) return;
    const a = JSON.parse(historia.pop());
    taller.ponerMasa(a); cambiarMasa(a);
    return;
  }
  if (estado.etapa !== 'decorar' || !estado.o.length) return;
  estado.o.pop();
  taller.quitarUltimo();
  guardarBorrador(); actualizarEtiqueta();
}
function nueva(molde = 'guagua') {
  Object.assign(estado, { a: MOLDES[molde](), f: molde, k: 0, o: [], id: null, n: elige(NOMBRES[molde]), p: '', m: '' });
  historia = [];
  sincronizarControles();
  taller.cargar(estado);
  irA('amasar');
}
async function guardarMia() {
  if (!estado.id) estado.id = nuevoId();
  guardarEnVitrina({ id: estado.id, t: 'mia', e: await codificar(receta()), f: Date.now() });
  guardarBorrador();
  pintarVitrina();
}
function sincronizarControles() {
  const marcar = (sel, v) => $$(sel).forEach((b) => b.setAttribute('aria-pressed', String(b.getAttribute(sel.slice(1, -1)) === String(v))));
  marcar('[data-mano]', estado.mano);
  marcar('[data-grosor]', estado.grosor);
  marcar('[data-herramienta]', estado.herramienta);
  marcar('[data-boquilla]', estado.boquilla);
  marcar('[data-tamano]', estado.tamano);
}

/* Para el que no se anima: una decoración de panadería, distinta cada
   vez, sobre la forma que sea. Se diseña de frente y se proyecta
   sobre la masa con rayos, como si se la pintara con plantilla. */
function sorpresa() {
  const r = azar(Math.floor(Math.random() * 1e9));
  const col = () => Math.floor(r() * 7);           // sin el chocolate, que es para dibujar
  const ops = [];
  const golpe = (x, y) => taller.deFrente(x, y);
  const caja = new THREE.Box3();
  estado.a.forEach((p) => caja.union(new THREE.Box3().setFromBufferAttribute(geometriaPieza(p).attributes.position)));
  if (caja.isEmpty()) return ops;
  const esc = 1 + 0.05 * limita(estado.k / 100, 0, 1);
  caja.min.multiplyScalar(esc); caja.max.multiplyScalar(esc);
  const { min, max } = caja, An = max.x - min.x, Al = max.y - min.y;
  const linea = (c, w, fn, n) => {
    let op = null;
    for (let i = 0; i <= n; i++) {
      const [x, y] = fn(i / n, i);
      const h = golpe(x, y);
      if (!h) { if (op && op.length > 6) ops.push(op); op = null; continue; }
      const q = puntoDeCrema(h, BOQUILLAS[w]);
      if (!op) op = [0, c, w];
      op.push(ent(q.x), ent(q.y), ent(q.z));
    }
    if (op && op.length > 6) ops.push(op);
  };
  const c1 = col(), c2 = col(), c3 = col();
  linea(c1, 2, (t, i) => [min.x + An * t, min.y + Al * 0.45 + (i % 2 ? 1 : -1) * Al * 0.025], 26);
  linea(c2, 1, (t) => [min.x + An * t, min.y + Al * 0.32 + Math.sin(t * Math.PI * 6) * Al * 0.02], 40);
  for (let i = 1; i < 8; i++) {
    const h = golpe(min.x + An * i / 8, min.y + Al * 0.22);
    if (h) ops.push([1, i % 2 ? c3 : c1, 1, ...pn(h)]);
  }
  const g = [2, Math.floor(r() * 1e9)];
  for (let i = 0; i < 10; i++) {
    const h = golpe(min.x + An * (0.2 + r() * 0.6), min.y + Al * (0.55 + r() * 0.15));
    if (h) g.push(...pn(h));
  }
  if (g.length > 2) ops.push(g);

  /* La cara va en la bolita más alta que sea cabeza de verdad. Si está
     al centro, es una guagua: carita de yeso con ojos de pasa y boca
     de pincel. Si está a un lado, es un animal mirando hacia allá. */
  const cabezas = estado.a.filter((p) => p[0] === 0 && Math.min(p[4], p[5]) > 25);
  if (!cabezas.length || estado.o.some((op) => op[0] === 4 || op[0] === 5)) return ops;
  const cab = cabezas.reduce((a, b) => (b[2] > a[2] ? b : a));
  const cx = cab[1] / Q * esc, cy = cab[2] / Q * esc, rx = cab[4] / Q, ry = cab[5] / Q;
  const centro = (min.x + max.x) / 2;
  if (Math.abs(cx - centro) < An * 0.15) {
    const h = golpe(cx, cy - ry * 0.05);
    if (!h) return ops;
    const tam = rx > 0.6 ? 1 : 0;
    ops.push([4, tam, 0, ...pn(h)]);
    const { s, b, centro: m } = caritaEn(h.p, h.n, tam);
    const sobre = (u, v) => {                      // un punto en la cara de la máscara
      const z = s.z * Math.sqrt(Math.max(0, 1 - u * u - v * v));
      return m.clone().addScaledVector(b.x, u * s.x).addScaledVector(b.y, v * s.y).addScaledVector(b.z, z);
    };
    [-0.32, 0.32].forEach((u) => { const p = sobre(u, 0.15); ops.push([5, ent(p.x), ent(p.y), ent(p.z), ent(b.z.x), ent(b.z.y), ent(b.z.z)]); });
    const boca = [0, 2, 0];
    for (let i = 0; i <= 8; i++) {
      const u = -0.28 + i * 0.07, v = -0.32 - Math.sin(i / 8 * Math.PI) * 0.12;
      const p = sobre(u, v).addScaledVector(b.z, 0.02);
      boca.push(ent(p.x), ent(p.y), ent(p.z));
    }
    ops.push(boca);
  } else {
    const lado = cx > centro ? 1 : -1;
    const h = golpe(cx + lado * rx * 0.25, cy + ry * 0.15);
    if (h) ops.push([5, ...pn(h)]);
    const boca = [0, 7, 0];
    for (let i = 0; i <= 5; i++) {
      const hh = golpe(cx + lado * rx * (0.3 + i * 0.07), cy - ry * (0.3 + Math.sin(i / 5 * Math.PI) * 0.08));
      if (hh) { const q = puntoDeCrema(hh, BOQUILLAS[0]); boca.push(ent(q.x), ent(q.y), ent(q.z)); }
    }
    if (boca.length > 6) ops.push(boca);
  }
  return ops;
}

/* ─── regalar ──────────────────────────────────────────────── */
let ultimoEnlace = '', ultimaTarjeta = null, reloj = null;
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
function leerFormulario() {
  estado.n = $('#r-nombre').value.trim().slice(0, 40);
  estado.p = $('#r-para').value.trim().slice(0, 40);
  estado.d = $('#r-de').value.trim().slice(0, 40);
  estado.m = $('#r-mensaje').value.trim().slice(0, 160);
  if (estado.d) almacen.poner('guagua:firma', estado.d);
}
async function refrescarTarjeta() {
  leerFormulario();
  ultimaTarjeta = await tarjeta(receta());
  $('#r-vista').src = ultimaTarjeta.toDataURL('image/jpeg', 0.82);
  ultimoEnlace = direccion() + '#r=' + await codificar(receta());
  guardarBorrador();
}
const textoRegalo = () => {
  const quien = estado.d ? estado.d + ' te regaló' : 'Te regalaron';
  const que = queEs(estado) + ' de pan' + (estado.n ? ' que se llama ' + estado.n : '');
  return `${quien} ${que}, directo del horno, por el Día de Difuntos. Ábrelo aquí:`;
};
async function copiar(texto) {
  try { await navigator.clipboard.writeText(texto); avisa('Enlace copiado. Pégalo donde quieras.', 'ok'); }
  catch (e) { prompt('Copia el enlace de tu guagua:', texto); }
}
function montarRegalo() {
  $$('#d-regalar input, #d-regalar textarea').forEach((x) => x.addEventListener('input', () => {
    clearTimeout(reloj); reloj = setTimeout(refrescarTarjeta, 350);
  }));
  const listo = async () => { clearTimeout(reloj); await refrescarTarjeta(); await guardarMia(); };
  $('#r-compartir').addEventListener('click', async () => {
    await listo();
    const texto = textoRegalo();
    try {
      const archivo = new File([await aBlob(ultimaTarjeta)], 'guagua-de-pan.png', { type: 'image/png' });
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

/* ══════════════════ LA VITRINA ══════════════════════════════ */
let pestana = 'mia', visorPieza = null, piezaActual = null;
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
    const c = foto(e, 240, 300);
    c.className = 'pieza__img'; c.setAttribute('aria-hidden', 'true');
    const t = document.createElement('span'); t.className = 'pieza__nombre';
    t.textContent = nombreDe(e);
    const s = document.createElement('span'); s.className = 'pieza__meta';
    s.textContent = item.t === 'recibida' ? (e.d ? 'de ' + e.d : 'regalada') + ' · ' + fecha(item.f) : (e.p ? 'para ' + e.p + ' · ' : '') + fecha(item.f);
    b.append(c, t, s);
    b.addEventListener('click', () => abrirPieza(item, e));
    rej.appendChild(b);
  }
}
function abrirPieza(item, e) {
  piezaActual = { item, e };
  $('#p-titulo').textContent = nombreDe(e);
  const quien = [e.p && 'Para ' + e.p, e.d && 'de ' + e.d].filter(Boolean).join(' · ');
  $('#p-quien').textContent = quien;
  $('#p-quien').hidden = !quien;
  $('#p-mensaje').textContent = e.m || '';
  $('#p-mensaje').hidden = !e.m;
  $('#p-editar').hidden = item.t !== 'mia';
  window.malDS.abrir('#d-pieza');
  if (!visorPieza) visorPieza = new Visor($('#p-lienzo'));
  visorPieza.giro = -0.25;
  visorPieza.cargar(e);
  visorPieza.medir();
}
function montarVitrina() {
  $$('[data-vitrina]').forEach((b) => b.addEventListener('click', () => pintarVitrina(b.dataset.vitrina)));
  $('#p-editar').addEventListener('click', () => {
    const { item, e } = piezaActual;
    Object.assign(estado, { f: e.f, a: e.a, k: e.k, o: e.o.slice(), n: e.n, p: e.p, d: e.d, m: e.m, id: item.id });
    historia = [];
    taller.cargar(estado);
    irA('decorar');
    $('#d-pieza').close();
    $('#taller').scrollIntoView({ behavior: quieto ? 'auto' : 'smooth' });
  });
  $('#p-regalar').addEventListener('click', async () => {
    const enlace = direccion() + '#r=' + piezaActual.item.e;
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
let recibida = null, visorRegalo = null, mordidas = 0;
async function recibir(cod) {
  let e;
  try { e = await decodificar(cod); }
  catch (err) { avisa('Esa guagua se rompió en el camino. Pide que te la vuelvan a mandar.', 'error'); return; }
  recibida = e; mordidas = 0;
  document.body.classList.add('modo-regalo');
  $('#regalo').hidden = false;
  $('#regalo-titulo').textContent = e.d ? `${e.d} te regaló ${queEs(e)}` : `Te regalaron ${queEs(e)}`;
  $('#regalo-nombre').textContent = '«' + nombreDe(e) + '»';
  $('#regalo-para').textContent = e.p ? 'Para ' + e.p : '';
  $('#regalo-para').hidden = !e.p;
  $('#regalo-mensaje').textContent = e.m || '';
  $('#regalo-mensaje').hidden = !e.m;
  $('#regalo-pista').textContent = 'Gírala arrastrando a un lado. Tócala para darle un mordisco.';
  $('#regalo-devolver').classList.remove('latido');
  if (!visorRegalo) {
    visorRegalo = new Visor($('#regalo-lienzo'), {
      toca(ev) {
        const hit = visorRegalo.tocar(ev);
        if (!hit) return false;
        if (visorRegalo.bocados().length >= MAX_BOCADOS) return true;
        visorRegalo.morder([3, ent(hit.p.x), ent(hit.p.y), ent(hit.p.z)]);
        crunch();
        mordidas++;
        const pista = $('#regalo-pista');
        if (visorRegalo.bocados().length >= MAX_BOCADOS || mordidas === 9) {
          pista.textContent = 'Te la acabaste. Ahora te toca amasar una.';
          $('#regalo-devolver').classList.add('latido');
        } else if (mordidas === 1) pista.textContent = 'Crunch. Otro más.';
        else if (mordidas === 4) pista.textContent = 'Ya va la mitad. ¿Y la colada?';
        else if (mordidas === 6) pista.textContent = 'Deja algo para el resto de la familia.';
        return true;
      },
    });
  }
  visorRegalo.giro = -0.25;
  visorRegalo.cargar(e);
  visorRegalo.medir();
  guardarEnVitrina({ id: nuevoId(), t: 'recibida', e: cod, f: Date.now() });
  pintarVitrina('recibida');
  window.scrollTo(0, 0);
}
function montarRecibir() {
  $('#regalo-devolver').addEventListener('click', () => {
    const para = recibida && recibida.d;
    cerrarRegalo();
    nueva();
    estado.p = para || '';
    guardarBorrador();
    avisa(para ? `Amasa una para ${para}.` : 'A amasar la tuya.', 'ok');
  });
  $('#regalo-taller').addEventListener('click', cerrarRegalo);
}
function cerrarRegalo() {
  document.body.classList.remove('modo-regalo');
  $('#regalo').hidden = true;
  history.replaceState(null, '', location.pathname + location.search);
  taller.medir();
  $('#taller').scrollIntoView();
}

/* ─── arranque ─────────────────────────────────────────────── */
function arrancar() {
  $('#cuenta').textContent = rotuloFinados();
  if (!montarTaller()) return;
  montarRegalo(); montarVitrina(); montarRecibir();
  const b = almacen.leer(BORRADOR, null);
  if (b && Array.isArray(b.a)) {
    Object.assign(estado, sano(b), { id: typeof b.id === 'string' ? b.id : null });
    sincronizarControles();
    taller.cargar(estado);
    irA(b.etapa === 'decorar' && estado.k >= 50 ? 'decorar' : 'amasar');
  } else {
    nueva('guagua');
  }
  pintarVitrina();
  const leerHash = () => {
    const h = location.hash.match(/^#r=([zj][A-Za-z0-9_-]+)$/);
    if (h) recibir(h[1]);
  };
  leerHash();
  window.addEventListener('hashchange', leerHash);
}

window.guagua = {
  tarjeta, foto, codificar, decodificar, veredicto, receta, estado, sorpresa, MOLDES,
  irA, prenderHorno, sacarDelHorno, aDecorar, get taller() { return taller; },
};
arrancar();
