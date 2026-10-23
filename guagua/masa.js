/* ══════════════════════════════════════════════════════════════
   La masa: lo que una guagua de pan es, sin pantalla.
   Este módulo no toca el DOM ni WebGL: lo comparten el juego (guagua.js)
   y el servidor MCP (mcp/), que amasa guaguas desde un chat de IA.
     · la despensa: cremas, boquillas, masas, nombres, mensajes y vales;
     · los moldes y la geometría de cada pieza (Three.js, solo cálculo);
     · el enlace: la receta comprimida que viaja después del `#`;
     · «Sorpréndeme» y la carita, que necesitan tirar rayos contra el pan:
       para eso reciben una `sonda` (el visor en el juego, `Sonda` aquí).
   ══════════════════════════════════════════════════════════════ */
import * as THREE from './vendor/three.module.min.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const Q = 100;                       // las coordenadas viajan en centésimas
const ent = (v) => Math.round(v * Q);
const DIRECCION = 'franciscombp.github.io/mal/guagua';
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
/* Las masas: la natural y las teñidas que se ven en las panaderías.
   Cada una con su tono tostado (cantos y base) y su dorado (arriba). */
const MASAS = [
  { n: 'Natural', tostado: '#6a300c', dorado: '#d8913f' },
  { n: 'Cacao', tostado: '#140905', dorado: '#4b2a19' },
  { n: 'Mora', tostado: '#230b26', dorado: '#62295e' },
  { n: 'Añil', tostado: '#101a28', dorado: '#3d5675' },
  { n: 'Achiote', tostado: '#6e1f08', dorado: '#d0552a' },
  { n: 'Verde', tostado: '#1a2e0c', dorado: '#5f8f35' },
];
const TAMANOS = [0.7, 1, 1.35];                 // las caritas
const GRAGEAS = ['#e01b6a', '#ffcf3d', '#8fd0f2', '#93c84a', '#ffffff', '#7d3c98', '#ff8a3d'];
const MAX_BOCADOS = 16;              // lo que cabe en el shader
const BOCADOS_TALLER = 7;            // el resto se lo come quien la recibe
const MAX_PIEZAS = 60;
const MORDIDA = 0.36;
const NOMBRES = {
  guagua: ['Rosita', 'Carmita', 'Panchito', 'Lucho', 'Toñito', 'Charito', 'Juanita', 'Maruja', 'Chabelita',
    'Pepita', 'Martita', 'Manuelito', 'Lolita', 'Teresita', 'Anita', 'Pachita', 'Tomasito', 'Clarita', 'Inesita'],
  caballito: ['Rayo', 'Canela', 'Trueno', 'Lucero', 'Pegaso', 'Pinto', 'Bayo', 'Palomo', 'Azabache', 'Galope'],
  chanchito: ['Rosado', 'Bellota', 'Lechoncito', 'Gordito', 'Cachito', 'Tomasín', 'Trufa'],
  gallinita: ['Cocoroca', 'Pinta', 'Pollita', 'Josefina', 'Plumita', 'Clueca'],
  libre: ['Criatura', 'Animalito', 'Sorpresa', 'Bichito', 'Invento', 'Misterio'],
};
NOMBRES.tradicional = NOMBRES.guagua;
NOMBRES.guaguau = ['Firulais', 'Canelo', 'Pulgoso', 'Tobi', 'Manchas', 'Pelusa', 'Bobby', 'Chocolate', 'Lazarillo'];
NOMBRES.dormilon = ['Dormilón', 'Siesta', 'Pelusa', 'Canelo', 'Ñaño', 'Motita', 'Bollito', 'Lobita'];
const MENSAJES = [
  'Para que este 2 de noviembre no te falte guagua.',
  'Con colada morada sabe mejor. Te la mando para acompañar.',
  'La amasé, la horneé y la decoré pensando en ti.',
  'Para recordar juntos a los que extrañamos.',
  'Para compartir en la mesa, como en casa.',
];
/* Dedicada a quien ya no está: Finados también es para recordar. */
const MENSAJES_MEMORIA = [
  'Para que en tu mesa del cielo nunca falte pan.',
  'Te recordamos cada 2 de noviembre, y todos los días.',
  'La amasé pensando en ti, como cuando la hacíamos juntos.',
  'Con colada morada, como te gustaba.',
];
const MENSAJE_GUAGUAU = 'Para que en el cielo de los guaguaus de pan nunca te falte nada.';
/* Lo que puede venir con un regalo, para que quien la recibe responda. */
const VALES = [
  null,
  {
    sello: ['VALE POR', 'una guagua', 'de verdad'], texto: 'Y vale por una guagua de verdad.',
    titulo: 'Vale por una guagua de verdad', detalle: 'Cóbralo: avisa que ya es hora.',
    pista: 'Quien la reciba podrá cobrarlo con un mensaje.', boton: 'Cobrar el vale',
    cobrar: (d) => `Hola${d ? ' ' + d : ''}, vengo a cobrar mi vale por una guagua de verdad. ¿Cuándo nos vemos?`,
  },
  {
    sello: ['INVITACIÓN', 'a una colada', 'morada'], texto: 'Y viene con invitación a una colada morada.',
    titulo: 'Invitación a una colada morada', detalle: 'Responde y pónganse de acuerdo.',
    pista: 'Quien la reciba podrá aceptar con un mensaje.', boton: 'Aceptar la invitación',
    cobrar: (d) => `Hola${d ? ' ' + d : ''}, acepto la invitación a la colada morada. ¿Cuándo y dónde?`,
  },
  {
    sello: ['PÁSALA', 'amasa una para', 'alguien más'], texto: 'Viene con una tarea: pasarla a alguien más.',
    titulo: 'Pásala', detalle: 'Esta guagua viaja: amásale una a otra persona para que siga la cadena.',
    pista: 'Quien la reciba tendrá que amasarle una a otra persona.', boton: null,
  },
];
const enMemoria = (e) => e.t === 'm';
/* Casi todo se decora de pie; el perrito de pan se queda echado y se mira desde arriba. */
const echada = (e) => e.f === 'guaguau' || e.f === 'dormilon';
/* El dormilón duerme: ojitos cerrados y nada de glaseado encima. */
const dormida = (e) => e.f === 'dormilon';
const posturaDe = (e) => (echada(e) ? { dePie: 0, cabeceo: 0.95 } : { dePie: 1, cabeceo: 0.2 });
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
const bolita = (c, s, rot, punta) => [0, ent(c.x), ent(c.y), ent(c.z), ent(s.x), ent(s.y), ent(s.z), Math.round((rot || 0) * 100)]
  .concat(punta ? [0, Math.round(punta * 100)] : []);
const chorizo = (r, pts) => [1, ent(r)].concat(...pts.map((p) => [ent(p.x), ent(p.y), ent(p.z)]));
/* El color de masa va aparte para no tocar las piezas de siempre: la bolita
   lleva un noveno número; el chorizo teñido es el tipo 3, [3, grosor, masa, x, y, z…]. */
const masaDe = (p) => (p[0] === 0 ? p[8] || 0 : p[0] === 3 ? p[2] : 0);
const iniPuntos = (p) => (p[0] === 3 ? 3 : 2);
function conMasa(p, m) {
  if (p[0] === 0) return p[9] ? p.slice(0, 8).concat([m, p[9]]) : m ? p.slice(0, 8).concat([m]) : p.slice(0, 8);
  const pts = p.slice(iniPuntos(p));
  return m ? [3, p[1], m].concat(pts) : [1, p[1]].concat(pts);
}
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
  return [bolita(CUERPO.c, CUERPO.s), bolita(CABEZA.c, CABEZA.s)].concat(brazos);
}
const MOLDES = {
  // la guagua de panadería: un pan alargado, envuelto como una criatura,
  // con la cabeza redonda en la punta.
  guagua() {
    return [
      bolita(CUERPO.c, CUERPO.s),                          // el cuerpo, un huevo de pan
      bolita(CABEZA.c, CABEZA.s),                          // la cabeza redonda encima
    ];
  },
  // la de panadería: más larga, y el bulto de los pies termina en colita cónica
  tradicional() {
    return [
      bolita(V(0, 1.75, 0), V(0.66, 1.6, 0.5), 0, 0.38), // el cuerpo envuelto, que se afina en colita
      bolita(V(0, 3.38, 0), V(0.27, 0.14, 0.27)),          // el cuello
      bolita(V(0, 3.78, 0.04), V(0.46, 0.48, 0.42)),       // la cabeza
    ];
  },
  // un perrito echado, con la panza en la lata, visto desde arriba: la cabeza
  // hacia abajo, mirando a quien lo ve, las patas de adelante a los lados y
  // la cola enroscada arriba. El lomo va girado para que se afine hacia la cola.
  guaguau() {
    return [
      bolita(V(0, 1.95, 0.05), V(0.66, 1.2, 0.48), Math.PI, 0.3),                 // el lomo
      chorizo(0.11, [V(0.05, 2.9, -0.2), V(0.12, 3.35, -0.2), V(0.4, 3.6, -0.2)]),  // la cola
      bolita(V(0.55, 2.65, -0.18), V(0.24, 0.4, 0.15), 0.35),                     // las patas de atrás
      bolita(V(-0.55, 2.65, -0.18), V(0.24, 0.4, 0.15), -0.35),
      chorizo(0.14, [V(0.4, 1.3, -0.17), V(0.36, 0.25, -0.17)]),                  // las de adelante
      chorizo(0.14, [V(-0.4, 1.3, -0.17), V(-0.36, 0.25, -0.17)]),
      bolita(V(0, 0.5, 0.12), V(0.52, 0.5, 0.42)),                                // la cabeza
      bolita(V(0, 0.05, 0.02), V(0.26, 0.22, 0.2)),                               // el hocico
      bolita(V(0.46, 0.58, 0.08), V(0.16, 0.32, 0.1), -0.25),                     // las orejas caídas
      bolita(V(-0.46, 0.58, 0.08), V(0.16, 0.32, 0.1), 0.25),
    ];
  },
  // un perrito dormido, hecho un ovillo: el cuerpo es una media dona gruesa
  // y la cabeza descansa en la abertura, con las orejas caídas y la cola metida
  dormilon() {
    // el cuerpo es un pan redondo: un anillo grueso cerrado, con apenas un
    // hoyito al centro, más alto que la cabeza; la cabeza se apoya abajo a la
    // izquierda, fuera del anillo, con una oreja plana en el plato y la otra
    // doblada encima; la cola asoma por abajo a la derecha
    const anillo = [];
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2;
      anillo.push(V(Math.cos(a) * 0.62, 1.82 + Math.sin(a) * 0.62, 0.3));
    }
    anillo.push(anillo[0].clone());
    return [
      chorizo(0.66, anillo),                                          // el cuerpo, con apenas un hoyito
      bolita(V(-0.5, 0.64, 0.1), V(0.54, 0.48, 0.4)),                 // la cabeza, pegada al cuerpo y mirando al frente
      bolita(V(-1.06, 0.74, -0.1), V(0.32, 0.2, 0.09), 0.2),          // la oreja plana en el plato
      bolita(V(-0.34, 1.0, 0.52), V(0.2, 0.32, 0.1), 0.7),            // la oreja doblada, apoyada en el cuerpo
      chorizo(0.11, [V(0.5, 0.78, -0.08), V(0.88, 0.42, -0.1), V(1.15, 0.5, -0.1)]),  // la cola, desde debajo del cuerpo
    ];
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
/* Con `punta`, la mitad de abajo se afina hacia una punta redonda:
   así sale la colita cónica de la guagua tradicional. */
function elipsoide(c, s, rotZ, punta = 0) {
  const g = new THREE.SphereGeometry(1, 64, 48);
  if (punta) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const f = 1 - punta * Math.max(0, -p.getY(i)) ** 1.8;
      p.setX(i, p.getX(i) * f); p.setZ(i, p.getZ(i) * f);
    }
    g.computeVertexNormals();
  }
  g.scale(s.x, s.y, s.z);
  if (rotZ) g.rotateZ(rotZ);
  g.translate(c.x, c.y, c.z);
  return g;
}
function tubo(puntos, r, estrias = 6) {
  if (puntos.length === 2) puntos = [puntos[0], puntos[0].clone().lerp(puntos[1], 0.5), puntos[1]];
  // si el último punto repite al primero, es un anillo: la curva se cierra y no lleva tapas
  const cerrado = puntos.length > 3 && puntos[0].distanceTo(puntos[puntos.length - 1]) < 1e-6;
  if (cerrado) puntos = puntos.slice(0, -1);
  const curva = new THREE.CatmullRomCurve3(puntos, cerrado, 'centripetal');
  const L = Math.max(curva.getLength(), 1e-3);
  const n = limita(Math.ceil(L / (r * 0.3)), 8, 700);
  const rad = estrias ? 18 : 24;
  const marcos = curva.computeFrenetFrames(n, cerrado);
  const pos = new Float32Array((n + 1) * (rad + 1) * 3);
  const P = new THREE.Vector3();
  let k = 0;
  for (let i = 0; i <= n; i++) {
    const u = i / n, s = u * L;
    curva.getPointAt(u, P);
    const N = marcos.normals[i], B = marcos.binormals[i];
    const borde = cerrado ? 1 : Math.min(1, Math.min(s, L - s) / (r * 1.05));
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
const PISO = -0.3, BLANDO = 0.07;
function aplanar(g) {
  const p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const d = p.getZ(i) - PISO;
    if (d > BLANDO * 8) continue;
    const pendiente = 1 / (1 + Math.exp(-d / BLANDO));
    p.setZ(i, PISO + BLANDO * Math.log1p(Math.exp(d / BLANDO)));
    if (n) {                       // la normal sigue a la superficie aplastada
      const nx = n.getX(i) * pendiente, ny = n.getY(i) * pendiente, nz = n.getZ(i);
      const l = Math.hypot(nx, ny, nz);
      if (l < 1e-6) n.setXYZ(i, 0, 0, -1); else n.setXYZ(i, nx / l, ny / l, nz / l);
    }
  }
  p.needsUpdate = true;
  if (n) n.needsUpdate = true;
  g.computeBoundingBox(); g.computeBoundingSphere();
  return g;
}
function geometriaPieza(p) {
  if (p[0] === 0) return aplanar(elipsoide(V(p[1], p[2], p[3]).divideScalar(Q), V(p[4], p[5], p[6]).divideScalar(Q), p[7] / 100, (p[9] || 0) / 100));
  const pts = [];
  for (let i = iniPuntos(p); i < p.length; i += 3) pts.push(V(p[i], p[i + 1], p[i + 2]).divideScalar(Q));
  const r = p[1] / Q;
  if (pts.length < 2) return aplanar(elipsoide(pts[0], V(r * 1.2, r * 1.2, r * 1.1)));
  return aplanar(tubo(pts, r, 0));
}
function moverPieza(p, dx, dy) {
  const o = p.slice();
  const ini = p[0] === 0 ? 1 : iniPuntos(p), fin = p[0] === 0 ? 4 : p.length;
  for (let i = ini; i < fin; i += 3) { o[i] += dx; o[i + 1] += dy; }
  return o;
}
/* Una base que mira hacia `n` y tiene el arriba lo más parecido posible al arriba del mundo. */
function base(n) {
  const z = n.clone().normalize();
  let y = V(0, 1, 0).addScaledVector(z, -z.y);
  if (y.lengthSq() < 1e-4) y = V(0, 0, -1).addScaledVector(z, z.z);
  y.normalize();
  const x = y.clone().cross(z);
  return { x, y, z, m: new THREE.Matrix4().makeBasis(x, y, z) };
}
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
const PASOS = { op: { 0: [3, 3], 2: [2, 6] }, pieza: { 1: [2, 3], 3: [3, 3] } };
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
  if (globalThis.CompressionStream) {
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
  // la semilla de las grageas es un entero grande; lo demás, coordenadas
  const semilla = (y, v, i) => i === 1 && y[0] === 2 && Number.isInteger(v) && v >= 0 && v < 2 ** 31;
  const lista = (x, max) => (Array.isArray(x) ? x.slice(0, max).filter((y) => Array.isArray(y) && y.every((v, i) => num(v) || semilla(y, v, i))) : []);
  const a = lista(d.a, MAX_PIEZAS).filter((p) => {
    puntos += p.length;
    if (p[0] === 0) {
      return p.length >= 8 && p.length <= 10 && (p.length === 8 || (MASAS[p[8]] && Number.isInteger(p[8])))
        && (p.length < 10 || (p[9] >= 0 && p[9] <= 90)) && p[4] > 0 && p[5] > 0 && p[6] > 0;
    }
    if (p[0] === 1) return p.length >= 5 && (p.length - 2) % 3 === 0 && p[1] > 0;
    if (p[0] === 3) return p.length >= 6 && (p.length - 3) % 3 === 0 && p[1] > 0 && MASAS[p[2]] && Number.isInteger(p[2]);
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
    t: d.t === 'm' ? 'm' : '',
    l: d.t !== 'm' && Number.isInteger(d.l) && VALES[d.l] ? d.l : 0,
  };
}
function punto(k) {
  if (k < 0.75) return { t: 'Cruda', f: 'Salió antes de tiempo: por dentro todavía está cruda.' };
  if (k < 0.92) return { t: 'Blanquita', f: 'Le faltó un poquito de horno. Quedó blanquita.' };
  if (k <= 1.08) return { t: '¡En su punto!', f: 'En su punto: dorada y esponjosa.' };
  if (k <= 1.25) return { t: 'Tostadita', f: 'Tostadita y crocante, como la prefieren algunos.' };
  return { t: 'Quemada', f: 'Se pasó de horno. La próxima vez, sácala un poco antes.' };
}
/* Hay cara si hay pasas, una máscara de las de antes o puntitos de chocolate finos. */
const tieneCara = (e) => e.o.some((op) => op[0] === 4 || op[0] === 5 || (op[0] === 0 && op[1] === 7 && op[2] <= 1));
const queEs = (e) => ({ guagua: 'una guagua', tradicional: 'una guagua', guaguau: 'un guaguau', dormilon: 'un perrito dormilón', caballito: 'un caballito', chanchito: 'un chanchito', gallinita: 'una gallinita' }[e.f] || 'un animalito');
const nombreDe = (e) => e.n || ({ guagua: 'Guagua', tradicional: 'Guagua', guaguau: 'Guaguau', dormilon: 'Dormilón', caballito: 'Caballito', chanchito: 'Chanchito', gallinita: 'Gallinita' }[e.f] || 'Animalito');
/* El chorro de la manga se apoya sobre lo que tocaste, levantado
   medio grosor por la normal, para que quede encima y no adentro. */
const puntoDeCrema = (hit, r) => hit.p.clone().addScaledVector(hit.n, r * 0.55);
const pn = (hit) => [ent(hit.p.x), ent(hit.p.y), ent(hit.p.z), ent(hit.n.x), ent(hit.n.y), ent(hit.n.z)];
function caraPintada(hit, tam, sonda, dormido = false) {
  const T = (TAMANOS[tam] || 1) * 0.5;           // medio ancho de la cara
  const { x, y, z } = base(hit.n);
  const ops = [];
  const sobre = (u, v, r) => {
    const q = hit.p.clone().addScaledVector(x, u * T).addScaledVector(y, v * T).addScaledVector(z, 0.8);
    const h = sonda.rayoLocal(q, z.clone().negate(), false);
    return h && puntoDeCrema(h, r);
  };
  const punto = (crema, boq, u, v) => {
    const c = sobre(u, v, BOQUILLAS[boq]);
    if (c) ops.push([0, crema, boq, ent(c.x), ent(c.y), ent(c.z)]);
  };
  const linea = (crema, boq, puntos) => {
    const op = [0, crema, boq];
    puntos.forEach(([u, v]) => { const c = sobre(u, v, BOQUILLAS[boq]); if (c) op.push(ent(c.x), ent(c.y), ent(c.z)); });
    if (op.length > 6) ops.push(op);
  };
  const ojo = tam === 0 ? 0 : 1;
  if (dormido) {                                 // dormido: dos arquitos cerrados y la nariz redonda
    [-0.3, 0.3].forEach((u) => linea(7, 0, Array.from({ length: 6 }, (_, i) => {
      const t = i / 5;
      return [u - 0.14 + t * 0.28, 0.14 - Math.sin(t * Math.PI) * 0.07];   // «︶», relajados
    })));
    punto(7, 1, 0, -0.26);
  } else {
    punto(7, ojo, -0.3, 0.12);                   // los ojos, de chocolate
    punto(7, ojo, 0.3, 0.12);
  }
  if (!dormido) linea(7, 0, [[-0.02, -0.02], [0.03, -0.1], [-0.03, -0.12]]);   // la naricita
  if (!dormido) linea(2, 0, Array.from({ length: 9 }, (_, i) => {       // la sonrisa (dormido no sonríe)
    const t = i / 8;
    return [-0.26 + t * 0.52, -0.3 - Math.sin(t * Math.PI) * 0.1];
  }));
  return ops;
}
function chapitas(hit, tam, ops, sonda) {
  const T = (TAMANOS[tam] || 1) * 0.5;
  const { x, y, z } = base(hit.n);
  [-0.48, 0.48].forEach((u) => {
    const q = hit.p.clone().addScaledVector(x, u * T).addScaledVector(y, -0.16 * T).addScaledVector(z, 0.8);
    const h = sonda.rayoLocal(q, z.clone().negate(), false);
    if (h) { const c = puntoDeCrema(h, BOQUILLAS[1]); ops.push([0, 1, 1, ent(c.x), ent(c.y), ent(c.z)]); }
  });
  return ops;
}
/* Para el que no se anima: una decoración de panadería, distinta cada
   vez, sobre la forma que sea. Se diseña de frente y se proyecta
   sobre la masa con rayos, como si se la pintara con plantilla. */
function sorpresa(estado, sonda, opciones = {}) {
  const r = azar(opciones.semilla != null ? opciones.semilla : Math.floor(Math.random() * 1e9));
  const col = () => Math.floor(r() * 7);           // sin el chocolate, que es para dibujar
  const ops = [];
  const golpe = (x, y) => sonda.deFrente(x, y);
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
  /* Glaseado fino, como en las panaderías: franjas de rulos, zigzags,
     ondas, espirales y puntitos en el cuerpo, sin tocar la cabeza. */
  const cabezas = estado.a.filter((p) => p[0] === 0 && Math.min(p[4], p[5]) > 25);
  // la cabeza es la bolita grande más alta; en el perrito echado, la más baja
  const abajo = echada(estado);
  const alta = cabezas.length ? cabezas.reduce((a, b) => ((abajo ? b[2] < a[2] : b[2] > a[2]) ? b : a)) : null;
  // de frente (guagua) la cabeza va arriba; de perfil (animalito), a un lado
  const centro = (min.x + max.x) / 2;
  // el dormilón duerme de frente aunque la cabeza esté a un lado
  const deFrente = alta && (dormida(estado) || Math.abs(alta[1] / Q * esc - centro) < An * 0.15);
  let x0 = min.x, x1 = max.x;
  if (alta && !deFrente) {
    const borde = (alta[1] - Math.sign(alta[1] / Q * esc - centro) * alta[4] * 0.9) / Q * esc;
    if (alta[1] / Q * esc > centro) x1 = borde; else x0 = borde;
  }
  const techo = deFrente && !abajo ? Math.min(max.y - Al * 0.12, (alta[2] - alta[5] * 0.95) / Q * esc) : max.y - Al * (alta ? 0.1 : 0.25);
  const piso = deFrente && abajo ? (alta[2] + alta[5] * 0.95) / Q * esc : min.y + Al * 0.1, Ax = x1 - x0;
  const pedidas = (opciones.cremas || []).filter((i) => CREMAS[i] && i !== 7);
  const colores = pedidas.length ? pedidas.slice(0, 3) : [1, 2, 3, 4, 5, 6, 0].sort(() => r() - 0.5).slice(0, 3);
  const franjas = dormida(estado) || opciones.soloCara ? 0 : Math.max(2, Math.min(5, Math.round((techo - piso) / 0.45)));
  const alto = (techo - piso) / franjas;
  const amp = Math.min(alto * 0.3, 0.14);
  for (let f = 0; f < franjas; f++) {
    const y = piso + alto * (f + 0.5), c = colores[f % colores.length];
    const w = r() < 0.85 ? 0 : 1;
    switch (Math.floor(r() * 5)) {
      case 0: linea(c, w, (t, i) => [x0 + Ax * t, y + (i % 2 ? amp : -amp)], 22); break;
      case 1: linea(c, w, (t) => [x0 + Ax * t, y + Math.sin(t * Math.PI * 8) * amp], 60); break;
      case 2: linea(c, w, (t) => {
        const a = t * Math.PI * 2 * 7;
        return [x0 + Ax * t + Math.cos(a) * amp * 0.7, y + Math.sin(a) * amp];
      }, 110); break;
      case 3: for (let i = 1; i < 9; i++) {
        const h = golpe(x0 + Ax * i / 9, y);
        if (h) ops.push([1, i % 2 ? c : colores[(f + 1) % colores.length], 0, ...pn(h)]);
      } break;
      default: [0.3, 0.7].forEach((u) => {
        const cx = x0 + Ax * u;
        linea(c, w, (t) => {
          const a = t * Math.PI * 2 * 2.5, rr = amp * 1.1 * t;
          return [cx + Math.cos(a) * rr, y + Math.sin(a) * rr];
        }, 40);
      });
    }
  }
  if (franjas && r() < 0.5) {
    const g = [2, Math.floor(r() * 1e9)];
    for (let i = 0; i < 8; i++) {
      const h = golpe(x0 + Ax * (0.2 + r() * 0.6), piso + (techo - piso) * r());
      if (h) g.push(...pn(h));
    }
    if (g.length > 2) ops.push(g);
  }

  /* La cara va en la bolita más alta que sea cabeza de verdad. Si está
     al centro, es una guagua: se le pintan ojos, nariz y sonrisa. Si está a un lado, es un animal mirando hacia allá. */
  if (!alta || tieneCara(estado)) return ops;
  const cab = alta;
  const cx = cab[1] / Q * esc, cy = cab[2] / Q * esc, rx = cab[4] / Q, ry = cab[5] / Q;
  if (deFrente) {
    const h = golpe(cx, cy - ry * 0.05);
    if (!h) return ops;
    caraPintada(h, rx > 0.6 ? 2 : 1, sonda, dormida(estado)).forEach((op) => ops.push(op));
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

/* ─── la sonda: rayos contra el pan, sin dibujarlo ─────────── */
/* Arma las piezas como el visor del juego (infladas y hundidas en la
   lata según la cocción) y responde `rayoLocal` y `deFrente` igual que
   él, en las coordenadas de la figura acostada. */
export class Sonda {
  constructor(e) {
    this.raiz = new THREE.Group();
    this.pan = new THREE.Group();
    this.raiz.add(this.pan);
    const inflado = 1 + 0.05 * limita(e.k / 100, 0, 1);
    this.pan.scale.setScalar(inflado);
    this.pan.position.z = PISO * (1 - inflado);
    e.a.forEach((p, i) => {
      const m = new THREE.Mesh(geometriaPieza(p), new THREE.MeshBasicMaterial());
      m.userData.pieza = i;
      this.pan.add(m);
    });
    this.raiz.updateMatrixWorld(true);
    this.raycaster = new THREE.Raycaster();
  }
  rayoLocal(p, dir) {
    this.raycaster.set(p.clone(), dir.clone().normalize());
    const h = this.raycaster.intersectObjects(this.pan.children, false)[0];
    if (!h) return null;
    const n = h.face.normal.clone().transformDirection(h.object.matrixWorld);
    if (n.dot(dir) > 0) n.negate();
    return { p: h.point.clone(), n: n.normalize(), pieza: h.object.userData.pieza };
  }
  deFrente(x, y) { return this.rayoLocal(V(x, y, 10), V(0, 0, -1)); }
}

/* ─── amasar por encargo: de unos datos a una receta ──────── */
/* Lo usan el MCP y el juego cuando llega un enlace con `?molde=…`: así
   cualquier IA (o cualquiera) arma una guagua escribiendo solo la dirección. */
const COCCION = { blanquita: 85, punto: 100, tostada: 118, quemada: 140 };
const indiceCrema = (nombre) => CREMAS.findIndex((c) => c.n.toLowerCase() === String(nombre || '').trim().toLowerCase());
const esVerdad = (v) => v === true || v === 1 || v === '1' || v === 'true' || v === 'si' || v === 'sí';
function amasarReceta(args = {}) {
  const molde = MOLDES[args.molde] ? args.molde : 'guagua';
  const dedicada = esVerdad(args.dedicada);
  const vale = Number(args.vale) || 0;
  const e = {
    v: 3, f: molde, a: MOLDES[molde](), k: COCCION[args.coccion] || 100, o: [],
    n: String(args.nombre || elige(NOMBRES[molde] || NOMBRES.guagua)).slice(0, 40),
    p: String(args.para || '').slice(0, 40), d: String(args.de || '').slice(0, 40), m: '',
    t: dedicada ? 'm' : '', l: !dedicada && VALES[vale] ? vale : 0,
  };
  e.m = String(args.mensaje || (e.t === 'm' ? (echada(e) ? MENSAJE_GUAGUAU : elige(MENSAJES_MEMORIA)) : elige(MENSAJES))).slice(0, 160);
  if (args.decoracion !== 'ninguna') {
    const lista = Array.isArray(args.colores) ? args.colores : String(args.colores || '').split(',');
    const cremas = lista.map(indiceCrema).filter((i) => i >= 0);
    const semilla = args.semilla != null && args.semilla !== '' && isFinite(Number(args.semilla)) ? Number(args.semilla) : undefined;
    e.o = sorpresa(e, new Sonda(e), { cremas, semilla, soloCara: args.decoracion === 'carita' });
  }
  return sano(e);
}

export {
  amasarReceta, COCCION, dormida, DIRECCION, V, Q, ent, CREMAS, BOQUILLAS, GROSORES, MASAS, TAMANOS, GRAGEAS, MAX_BOCADOS, BOCADOS_TALLER, MAX_PIEZAS, MORDIDA, NOMBRES, MENSAJES, MENSAJES_MEMORIA, MENSAJE_GUAGUAU, VALES, enMemoria, echada, posturaDe, azar, elige, limita, bolita, chorizo, masaDe, iniPuntos, conMasa, SG, G, C, frenteDe, CUERPO, CABEZA, guaguaConBrazos, MOLDES, elipsoide, tubo, PISO, aplanar, geometriaPieza, moverPieza, base, b64, exprimir, PASOS, aDeltas, deDeltas, codificar, decodificar, deLaPrimeraHornada, sano, punto, tieneCara, queEs, nombreDe, puntoDeCrema, pn, caraPintada, chapitas, sorpresa,
};
