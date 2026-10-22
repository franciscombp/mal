/* ══════════════════════════════════════════════════════════════
   Guagua de pan · el juego, en 3D
   Una guagua recién salida del horno que se gira con el dedo, una
   manga de crema y la vitrina donde se guardan las que haces y las
   que te regalan.

   Cómo está hecho:
     · La guagua es una lista de operaciones (`ops`), no un dibujo.
       Cada trazo de manga, roseta, puñado de grageas o mordisco es
       un arreglo de números enteros (centésimas de unidad, en el
       espacio de la figura). Eso es lo que viaja en el enlace: quien
       lo abre recibe la receta y la vuelve a hornear en su teléfono.
     · La crema es un tubo con la sección de una boquilla de estrella
       que se retuerce un poco a lo largo, y termina en punta. Se
       apoya sobre el pan siguiendo la normal de donde tocaste, así
       que también se puede poner crema encima de la crema.
     · El mordisco no corta la malla: el shader descarta lo que cae
       dentro de la mordida y pinta de miga las caras de atrás, que
       quedan a la vista por el hueco.
     · No hay servidor. La vitrina vive en `localStorage` y el regalo
       va dentro del enlace, después del `#`.
   ══════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const avisa = (t, tipo) => (window.malDS && window.malDS.aviso ? window.malDS.aviso(t, tipo) : null);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const Q = 100;                       // las coordenadas viajan en centésimas
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
  { n: 'Chocolate', c: '#6b3a1f' },
];
const BOQUILLAS = [0.05, 0.085, 0.13];   // radio del chorro, en unidades
const GRAGEAS = ['#e01b6a', '#ffcf3d', '#8fd0f2', '#93c84a', '#ffffff', '#7d3c98', '#ff8a3d'];
const FORMAS = ['guagua', 'caballito'];
const CARAS = ['Sin cara', 'De yeso', 'Dormida', 'Pícara', 'De pasas'];
const MAX_BOCADOS = 16;              // lo que cabe en el shader
const BOCADOS_TALLER = 7;            // el resto se lo come quien la recibe
const MORDIDA = 0.36;

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
   Las piezas se dibujaron primero en un papel de 600 × 750 (la
   versión plana del juego); `G` y `C` pasan esas medidas al espacio
   3D, con el pie de la figura sobre el plato (y = 0).            */
const SG = 0.0062, SC = 0.0066;
const G = (x, y, z) => V((x - 300) * SG, (714 - y) * SG, z || 0);
const C = (x, y, z) => V((x - 300) * SC, 1.6 - (y - 400) * SC, z || 0);

const CUERPO = { c: V(0, 1.463, 0), s: V(1.042, 1.463, 0.62) };
const CABEZA = { c: V(0, 3.212, 0.03), s: V(0.72, 0.69, 0.52) };
function frente(el, x, y) {          // la z de la cara de adelante de un elipsoide
  const k = 1 - ((x - el.c.x) / el.s.x) ** 2 - ((y - el.c.y) / el.s.y) ** 2;
  return el.c.z + el.s.z * Math.sqrt(Math.max(0, k));
}

function elipsoide(c, s, rotZ) {
  const g = new THREE.SphereGeometry(1, 72, 54);
  g.scale(s.x, s.y, s.z);
  if (rotZ) g.rotateZ(rotZ);
  g.translate(c.x, c.y, c.z);
  return g;
}
function cilindroEntre(a, b, r, aplastar) {
  const g = new THREE.CapsuleGeometry(r, a.distanceTo(b), 12, 28);
  if (aplastar) g.scale(1, 1, aplastar);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()));
  const m = a.clone().add(b).multiplyScalar(0.5);
  g.translate(m.x, m.y, m.z);
  return g;
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

function moldeGuagua() {
  const piezas = [elipsoide(CUERPO.c, CUERPO.s), elipsoide(CABEZA.c, CABEZA.s)];
  [[[182, 372], [336, 452]], [[418, 372], [264, 452]]].forEach(([a, b]) => {
    const A = G(a[0], a[1]), B = G(b[0], b[1]);
    A.z = frente(CUERPO, A.x, A.y) - 0.03; B.z = frente(CUERPO, B.x, B.y) - 0.03;
    piezas.push(cilindroEntre(A, B, 30 * SG, 0.85));
  });
  return piezas;
}
function moldeCaballito() {
  const pata = (a, b, z) => cilindroEntre(C(a[0], a[1], z), C(b[0], b[1], z), 30 * SC);
  return [
    cilindroEntre(C(122, 372, -0.1), C(70, 486, -0.1), 22 * SC),
    pata([190, 440], [176, 600], -0.17),
    pata([424, 440], [440, 600], -0.17),
    pata([252, 450], [250, 612], 0.17),
    pata([366, 450], [368, 612], 0.17),
    elipsoide(C(300, 400), V(200 * SC, 110 * SC, 0.6)),
    cilindroEntre(C(420, 362), C(462, 238), 56 * SC, 0.85),
    cilindroEntre(C(452, 176), C(446, 128), 17 * SC),
    elipsoide(C(498, 220), V(90 * SC, 56 * SC, 0.4), -0.4),
  ];
}
const OBJETIVO = { guagua: V(0, 1.95, 0), caballito: V(0.1, 1.8, 0) };

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

/* ─── las caras, pintadas en la máscara de yeso ───────────── */
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
  ctx.fillStyle = 'rgba(240,110,140,.35)';
  ctx.filter = 'blur(2px)';
  ctx.beginPath(); ctx.arc(262, 222, 14, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(338, 222, 14, 0, Math.PI * 2); ctx.fill();
  ctx.filter = 'none';
  ctx.strokeStyle = '#4a2a14'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(282, 142); ctx.quadraticCurveTo(300, 158, 300, 138);
  ctx.quadraticCurveTo(302, 158, 320, 144); ctx.stroke();
  if (n === 1) {                         // de yeso, la clásica
    ojo(ctx, 278, 192); ojo(ctx, 322, 192);
    ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(278, 182, 12, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
    ctx.beginPath(); ctx.arc(322, 182, 12, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
    ctx.fillStyle = '#d6264f';
    ctx.beginPath(); ctx.ellipse(300, 232, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
  } else if (n === 2) {                  // dormida
    ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(278, 190, 10, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    ctx.beginPath(); ctx.arc(322, 190, 10, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    ctx.fillStyle = '#c23a52';
    ctx.beginPath(); ctx.ellipse(300, 232, 6, 7, 0, 0, Math.PI * 2); ctx.fill();
  } else if (n === 3) {                  // pícara: guiña y saca la lengua
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

/* ══════════════════ LA CREMA ════════════════════════════════
   Un tubo con sección de boquilla de estrella: seis estrías que
   giran despacio a lo largo del chorro, y las puntas redondeadas.
   Los marcos se transportan en paralelo (los de Frenet de three),
   así que el tubo no se tuerce de golpe en las curvas.           */
function tubo(puntos, r, estrias = 6) {
  const curva = new THREE.CatmullRomCurve3(puntos, false, 'centripetal');
  const L = curva.getLength();
  const n = limita(Math.ceil(L / (r * 0.3)), 6, 700);
  const rad = 18;
  const marcos = curva.computeFrenetFrames(n, false);
  const pos = new Float32Array((n + 1) * (rad + 1) * 3);
  const P = new THREE.Vector3();
  let k = 0;
  for (let i = 0; i <= n; i++) {
    const u = i / n, s = u * L;
    curva.getPointAt(u, P);
    const N = marcos.normals[i], B = marcos.binormals[i];
    const borde = Math.min(1, Math.min(s, L - s) / (r * 1.1));
    const tapa = Math.sqrt(1 - (1 - borde) ** 2);
    for (let j = 0; j <= rad; j++) {
      const a = (j / rad) * Math.PI * 2;
      const rr = r * tapa * (1 + 0.13 * Math.cos(estrias * a + s * (2.2 / r)));
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
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
function espiral(R) {                 // la roseta: un chorro que sube dando vueltas
  const pts = [];
  for (let i = 0; i <= 64; i++) {
    const t = i / 64, a = t * 2.4 * Math.PI * 2, rad = R * (1 - t * 0.88);
    pts.push(V(Math.cos(a) * rad, Math.sin(a) * rad, R * 0.1 + t * R * 1.15));
  }
  return pts;
}

/* ─── los materiales, que también se pueden morder ────────── */
function comestible(mat, U) {
  mat.side = THREE.DoubleSide;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uBocados = U.uBocados;
    sh.uniforms.uNBocados = U.uNBocados;
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
        uniform int uNBocados;`)
      .replace('void main() {', `void main() {
        for (int i = 0; i < ${MAX_BOCADOS}; i++) {
          if (i >= uNBocados) break;
          vec3 d = vMundo - uBocados[i].xyz;
          float dientes = 1.0 + 0.08 * sin(16.0 * atan(d.y, d.x + d.z * 0.7));
          if (length(d) < uBocados[i].w * dientes) discard;
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        if (!gl_FrontFacing) diffuseColor.rgb = vec3(0.93, 0.80, 0.56);`);
  };
  mat.customProgramCacheKey = () => 'comestible';
  return mat;
}
function materiales(U) {
  return {
    pan: comestible(new THREE.MeshPhysicalMaterial({
      vertexColors: true, map: poros(), bumpMap: poros(), bumpScale: 0.5,
      roughness: 0.62, clearcoat: 0.22, clearcoatRoughness: 0.5,
    }), U),
    cremas: CREMAS.map((c) => comestible(new THREE.MeshPhysicalMaterial({
      color: c.c, roughness: 0.45, clearcoat: 0.25, clearcoatRoughness: 0.35,
    }), U)),
    grageas: comestible(new THREE.MeshStandardMaterial({ roughness: 0.3 }), U),
    pasa: comestible(new THREE.MeshPhysicalMaterial({ color: '#3a1a0e', roughness: 0.35, clearcoat: 0.6 }), U),
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
   que pasa al tocarla lo decide quien lo usa: el taller pinta, el
   regalo muerde, la vitrina solo deja mirar.                     */
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
    this.U = { uBocados: { value: Array.from({ length: MAX_BOCADOS }, () => new THREE.Vector4()) }, uNBocados: { value: 0 } };
    this.mat = materiales(this.U);

    const s = this.scene = new THREE.Scene();
    s.environment = entorno(r);
    s.environmentIntensity = 0.5;
    s.add(new THREE.HemisphereLight('#fff1dc', '#5a1c50', 1.1));
    const sol = new THREE.DirectionalLight('#fff4e6', 2.3);
    sol.position.set(3, 7, 6);
    sol.castShadow = true;
    sol.shadow.mapSize.set(1024, 1024);
    Object.assign(sol.shadow.camera, { left: -3, right: 3, top: 4.5, bottom: -1, near: 1, far: 20 });
    sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.02; sol.shadow.radius = 4;
    s.add(sol);
    const contra = new THREE.DirectionalLight('#ffc4e1', 0.8);
    contra.position.set(-5, 3, -4);
    s.add(contra);

    if (op.plato !== false) {
      const plato = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.05, 0.12, 72),
        new THREE.MeshPhysicalMaterial({ color: '#fbf7f2', roughness: 0.25, clearcoat: 0.8 }));
      plato.position.y = -0.06;
      plato.receiveShadow = true;
      const filete = new THREE.Mesh(new THREE.TorusGeometry(2.12, 0.025, 8, 96),
        new THREE.MeshStandardMaterial({ color: '#e01b6a', roughness: 0.4 }));
      filete.rotation.x = Math.PI / 2; filete.position.y = 0.005;
      s.add(plato, filete);
    }

    this.camara = new THREE.PerspectiveCamera(30, 0.8, 0.1, 60);
    this.figura = new THREE.Group();
    this.pan = new THREE.Group();
    this.adornos = new THREE.Group();
    this.figura.add(this.pan, this.adornos);
    s.add(this.figura);

    this.forma = 'guagua';
    this.giro = op.giro != null ? op.giro : -0.25;
    this.cabeceo = 0.2;
    this.dist = 10.5;
    this.ops = []; this.objetos = []; this.extra = [];
    this.previa = null;
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

  /* ─── cargar una guagua entera ─────────────────────────── */
  vaciar(grupo) {
    grupo.children.slice().forEach((o) => {
      grupo.remove(o);
      if (o.geometry) o.geometry.dispose();
    });
  }
  cargar(e) {
    this.vaciar(this.pan); this.vaciar(this.adornos);
    this.ops = []; this.objetos = []; this.extra = []; this.previa = null;
    this.forma = e.f;
    this.hornearMasa(e.f, e.c);
    e.o.forEach((op) => this.agregar(op, true));
    this.actualizarBocados();
    this.dibujar();
  }
  hornearMasa(forma, cara) {
    const piezas = forma === 'caballito' ? moldeCaballito() : moldeGuagua();
    piezas.forEach((g) => this.pan.add(this.malla(dorar(g), this.mat.pan)));
    const pasa = (p, s) => {
      const g = new THREE.SphereGeometry(1, 16, 12);
      g.scale(s, s * 0.8, s * 0.55);
      g.translate(p.x, p.y, p.z);
      this.pan.add(this.malla(g, this.mat.pasa));
    };
    if (forma === 'caballito') {
      const o = C(506, 198);
      pasa(V(o.x, o.y, 0.31), 0.06); pasa(V(o.x, o.y, -0.31), 0.06);
      return;
    }
    if (cara >= 1 && cara <= 3) {
      if (!this.mat.caras[cara]) {
        this.mat.caras[cara] = comestible(new THREE.MeshPhysicalMaterial({
          map: texturaCara(cara), roughness: 0.5, clearcoat: 0.4, clearcoatRoughness: 0.3,
        }), this.U);
      }
      this.pan.add(this.malla(elipsoide(V(0, 3.2, 0.4), V(0.43, 0.48, 0.2)), this.mat.caras[cara]));
    } else if (cara === 4) {                       // de pasas, la de la casa
      const en = (x, y, s) => { const p = G(x, y); p.z = frente(CABEZA, p.x, p.y) - 0.015; pasa(p, s); };
      en(272, 188, 0.07); en(328, 188, 0.07); en(300, 214, 0.045);
      for (let i = 0; i < 5; i++) en(270 + i * 15, 242 + Math.sin(i / 4 * Math.PI) * 9, 0.04);
    }
  }
  malla(g, m) {
    const o = new THREE.Mesh(g, m);
    o.castShadow = true; o.receiveShadow = true;
    return o;
  }

  /* ─── las operaciones ──────────────────────────────────── */
  construir(op) {
    const t = op[0];
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
      const n = V(op[6], op[7], op[8]).normalize();
      o.quaternion.setFromUnitVectors(V(0, 0, 1), n);
      o.position.set(op[3] / Q, op[4] / Q, op[5] / Q).addScaledVector(n, -R * 0.15);
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
        const p = V(op[i], op[i + 1], op[i + 2]).divideScalar(Q);
        const n = V(op[i + 3], op[i + 4], op[i + 5]).normalize();
        const t1 = V(0, 1, 0).cross(n);
        if (t1.lengthSq() < 1e-4) t1.set(1, 0, 0);
        t1.normalize();
        const t2 = n.clone().cross(t1);
        for (let j = 0; j < 3; j++) {
          const a = rnd() * Math.PI * 2, d = rnd() * 0.11;
          const pos = p.clone().addScaledVector(t1, Math.cos(a) * d).addScaledVector(t2, Math.sin(a) * d).addScaledVector(n, 0.02);
          // acostada sobre el pan, en cualquier dirección
          q.setFromUnitVectors(V(0, 1, 0), t1);
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
    return { p: this.figura.worldToLocal(h.point.clone()), n: n.applyQuaternion(inv).normalize() };
  }
  tocar(ev) {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    this.ubicar();
    this.raycaster.setFromCamera(ndc, this.camara);
    return this.rayo(this.raycaster.ray.origin.clone(), this.raycaster.ray.direction.clone());
  }
  /* Para «Sorpréndeme»: tirar un rayo de frente, como si la guagua no estuviera girada. */
  deFrente(x, y) {
    const g = this.figura.rotation.y;
    this.figura.rotation.y = 0; this.figura.updateMatrixWorld();
    const h = this.rayo(V(x, y, 10), V(0, 0, -1), true);
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
      if (e.button === 2) { modo = 'gira'; return; }
      const hit = this.op.toca ? this.tocar(e) : null;
      if (hit && this.op.toca(hit, e)) { modo = this.op.arrastra ? 'pinta' : 'nada'; return; }
      modo = 'gira';
      c.classList.add('girando');
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
        this.op.arrastra(this.tocar(e));
      } else if (modo === 'pellizco' && ptrs.size === 2) {
        this.dist = limita(pellizco.dist * pellizco.d / Math.max(10, separacion()), 4.5, 13);
        this.dibujar();
      }
    });
    const suelta = (e) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.delete(e.pointerId);
      if (modo === 'pinta' && this.op.suelta) this.op.suelta();
      if (!ptrs.size) modo = null;
      else if (modo === 'pellizco') modo = 'nada';
      c.classList.remove('girando');
    };
    c.addEventListener('pointerup', suelta);
    c.addEventListener('pointercancel', suelta);
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.dist = limita(this.dist * (1 + e.deltaY * 0.001), 4.5, 13);
      this.dibujar();
    }, { passive: false });
  }
  girar(delta) {
    const de = this.giro, a = de + delta, t0 = performance.now(), dur = quieto ? 1 : 380;
    const paso = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      this.giro = de + (a - de) * (1 - (1 - k) ** 3);
      this.dibujar();
      if (k < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }

  /* ─── pintar ───────────────────────────────────────────── */
  ubicar() {
    const o = OBJETIVO[this.forma] || OBJETIVO.guagua;
    this.figura.rotation.y = this.giro;
    this.figura.updateMatrixWorld();
    const cp = Math.cos(this.cabeceo);
    this.camara.position.set(o.x, o.y + Math.sin(this.cabeceo) * this.dist, o.z + cp * this.dist);
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
  estudio.dist = 9.2;
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
   PASO dice dónde empiezan los puntos y cuántos números mide cada uno. */
const PASO = { 0: [3, 3], 2: [2, 6] };
function aDeltas(op) {
  const p = PASO[op[0]];
  if (!p) return op.slice();
  const o = op.slice();
  for (let i = op.length - 1; i >= p[0] + p[1]; i--) o[i] = op[i] - op[i - p[1]];
  return o;
}
function deDeltas(op) {
  const p = PASO[op[0]];
  if (!p) return op.slice();
  const o = op.slice();
  for (let i = p[0] + p[1]; i < o.length; i++) o[i] += o[i - p[1]];
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
  if (d.v !== 2) throw new Error('otra hornada');
  return sano(Object.assign(d, { o: (Array.isArray(d.o) ? d.o : []).map((op) => (Array.isArray(op) ? deDeltas(op) : op)) }));
}
/* Lo que llega por un enlace lo escribió cualquiera: se filtra todo. */
function sano(d) {
  const num = (v) => typeof v === 'number' && isFinite(v) && Math.abs(v) <= 2000;
  const txt = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
  let puntos = 0;
  const o = Array.isArray(d.o) ? d.o.slice(0, 800).filter((op) => Array.isArray(op) && op.every(num)).filter((op) => {
    const t = op[0];
    puntos += op.length;
    if (puntos > 60000) return false;
    if (t === 0) return op.length >= 6 && (op.length - 3) % 3 === 0 && CREMAS[op[1]] && BOQUILLAS[op[2]] !== undefined;
    if (t === 1) return op.length === 9 && CREMAS[op[1]] && BOQUILLAS[op[2]] !== undefined;
    if (t === 2) return op.length >= 8 && (op.length - 2) % 6 === 0;
    if (t === 3) return op.length === 4;
    return false;
  }) : [];
  return {
    v: 2,
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
  const nota = Math.max(1, Math.min(10, 5 + Math.min(colores, 3) + (rosetas ? 1 : 0) + (grag ? 1 : 0) - (total < 4 ? 2 : 0)));
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
  ctx.fillText(e.d ? 'Te regalo' : 'Una guagua', 540, 196);
  ctx.fillText(e.d ? 'una guagua' : 'para ti', 540, 282);
  const alto = 780, ancho = alto * 0.8, gx = 540 - ancho / 2 - 60, gy = 300;
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.ellipse(gx + ancho / 2, gy + alto - 70, ancho * 0.34, 24, 0, 0, Math.PI * 2); ctx.fill();
  ctx.drawImage(foto(e, 800, 1000), gx, gy, ancho, alto);
  colada(ctx, 870, 960, 0.9);
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
    envolver(ctx, e.m, 540, y, 900, 40, quien ? 1 : 2);
  }
  ctx.font = '600 24px Inter, system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,201,60,.9)';
  ctx.fillText('Decora la tuya en ' + DIRECCION, 540, 1322);
  return c;
}
const aBlob = (c) => new Promise((ok) => c.toBlob(ok, 'image/png'));

/* ─── la vitrina ───────────────────────────────────────────── */
const CLAVE = 'guagua:vitrina3d', BORRADOR = 'guagua:borrador3d';
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
function base() {
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

/* ══════════════════ EL TALLER ═══════════════════════════════ */
const estado = {
  f: 'guagua', c: 1, n: '', o: [],
  herramienta: 'manga', crema: 1, boquilla: 1,
  id: null, p: '', d: '', m: '',
};
let taller = null;       // el visor del taller
let trazo = null;        // lo que el dedo está haciendo
const receta = () => ({ v: 2, f: estado.f, c: estado.c, n: estado.n, o: estado.o, p: estado.p, d: estado.d, m: estado.m });
const ent = (v) => Math.round(v * Q);

function fijar(op) {
  estado.o.push(op);
  taller.agregar(op);
  guardarBorrador();
  actualizarEtiqueta();
}
function guardarBorrador() {
  almacen.poner(BORRADOR, { f: estado.f, c: estado.c, n: estado.n, o: estado.o, id: estado.id, p: estado.p, d: estado.d, m: estado.m });
}
function actualizarEtiqueta() {
  const n = estado.o.length;
  $('#lienzo').setAttribute('aria-label', `${estado.f === 'caballito' ? 'Un caballito' : 'Una guagua'} de pan en 3D con ${n} ${n === 1 ? 'decoración' : 'decoraciones'}. Arrastra sobre ella para ponerle crema y fuera de ella para girarla.`);
  $('#deshacer').disabled = !n;
}
function recargar() { taller.cargar(estado); actualizarEtiqueta(); }

/* El chorro de la manga se apoya sobre lo que tocaste, levantado
   medio grosor por la normal, para que quede encima y no adentro. */
function puntoDeCrema(hit, r) { return hit.p.clone().addScaledVector(hit.n, r * 0.55); }
function seguir(hit) {
  if (!trazo || !hit) return;
  const op = trazo;
  if (op[0] === 0) {
    const r = BOQUILLAS[op[2]], q = puntoDeCrema(hit, r);
    const u = V(op[op.length - 3], op[op.length - 2], op[op.length - 1]).divideScalar(Q);
    const d = q.distanceTo(u);
    if (d < r * 0.6) return;
    if (d > 0.7 || op.length > 1200) {            // saltó a otra pieza: otro chorro
      fijar(op);
      trazo = [0, op[1], op[2], ent(q.x), ent(q.y), ent(q.z)];
    } else op.push(ent(q.x), ent(q.y), ent(q.z));
  } else {
    const u = V(op[op.length - 6], op[op.length - 5], op[op.length - 4]).divideScalar(Q);
    if (hit.p.distanceTo(u) < 0.14) return;
    if (op.length > 600) { fijar(op); trazo = [2, op[1] + 1]; }
    trazo.push(ent(hit.p.x), ent(hit.p.y), ent(hit.p.z), ent(hit.n.x), ent(hit.n.y), ent(hit.n.z));
  }
  taller.vistaPrevia(trazo);
}
function tocarTaller(hit) {
  const h = estado.herramienta;
  if (h === 'manga') {
    const q = puntoDeCrema(hit, BOQUILLAS[estado.boquilla]);
    trazo = [0, estado.crema, estado.boquilla, ent(q.x), ent(q.y), ent(q.z)];
    taller.vistaPrevia(trazo);
  } else if (h === 'grageas') {
    trazo = [2, Math.floor(Math.random() * 1e9), ent(hit.p.x), ent(hit.p.y), ent(hit.p.z), ent(hit.n.x), ent(hit.n.y), ent(hit.n.z)];
    taller.vistaPrevia(trazo);
  } else if (h === 'roseta') {
    fijar([1, estado.crema, estado.boquilla, ent(hit.p.x), ent(hit.p.y), ent(hit.p.z), ent(hit.n.x), ent(hit.n.y), ent(hit.n.z)]);
  } else if (h === 'mordisco') {
    if (estado.o.filter((op) => op[0] === 3).length >= BOCADOS_TALLER) {
      avisa('Ya está bien mordida. Deja algo para quien la reciba.');
    } else { fijar([3, ent(hit.p.x), ent(hit.p.y), ent(hit.p.z)]); crunch(); }
  }
  return true;
}
function soltarTaller() {
  if (!trazo) return;
  const op = trazo; trazo = null;
  taller.vistaPrevia(null);
  fijar(op);
}

function montarTaller() {
  try {
    taller = new Visor($('#lienzo'), {
      toca: tocarTaller, arrastra: seguir, suelta: soltarTaller,
      cancela: () => { trazo = null; taller.vistaPrevia(null); },
    });
  } catch (err) {
    $('#sin-3d').hidden = false;
    return false;
  }
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
    sincronizarControles(); recargar(); guardarBorrador();
  }));
  $$('[data-cara]').forEach((b) => b.addEventListener('click', () => {
    estado.c = +b.dataset.cara;
    sincronizarControles(); recargar(); guardarBorrador();
  }));
  $('#girar-izq').addEventListener('click', () => taller.girar(-Math.PI / 4));
  $('#girar-der').addEventListener('click', () => taller.girar(Math.PI / 4));
  $('#deshacer').addEventListener('click', deshacer);
  document.addEventListener('keydown', (ev) => {
    if (ev.target.closest('input,textarea')) return;
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') { ev.preventDefault(); deshacer(); }
  });
  $('#lienzo').addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); taller.girar(-Math.PI / 8); }
    if (ev.key === 'ArrowRight') { ev.preventDefault(); taller.girar(Math.PI / 8); }
  });
  $('#sorpresa').addEventListener('click', () => {
    sorpresa().forEach((op) => { estado.o.push(op); taller.agregar(op, true); });
    taller.dibujar(); guardarBorrador(); actualizarEtiqueta();
  });
  $('#de-nuevo').addEventListener('click', () => {
    if (estado.o.length && !confirm('¿Botamos esta y sacamos una guagua nueva del horno?')) return;
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
  if (!estado.o.length) return;
  estado.o.pop();
  taller.quitarUltimo();
  guardarBorrador(); actualizarEtiqueta();
}
function nueva() {
  Object.assign(estado, { o: [], id: null, n: elige(NOMBRES[estado.f]), p: '', m: '' });
  sincronizarControles(); recargar(); guardarBorrador();
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

/* Para el que no se anima: una decoración de panadería, distinta cada
   vez. Se diseña de frente, en el papel de 600 × 750, y se proyecta
   sobre la guagua con rayos, como si se la pintara con plantilla. */
function sorpresa() {
  const r = azar(Math.floor(Math.random() * 1e9));
  const col = () => Math.floor(r() * CREMAS.length);
  const M = estado.f === 'caballito' ? C : G;
  if (estado.f === 'guagua' && !estado.c) { estado.c = 1 + Math.floor(r() * 4); sincronizarControles(); recargar(); }
  const ops = [];
  const golpe = (x, y) => { const p = M(x, y); return taller.deFrente(p.x, p.y); };
  const linea = (c, w, fn, a, b, n) => {
    let op = null;
    for (let i = 0; i <= n; i++) {
      const [x, y] = fn(a + (b - a) * i / n, i);
      const h = golpe(x, y);
      if (!h) { if (op && op.length > 6) ops.push(op); op = null; continue; }
      const q = puntoDeCrema(h, BOQUILLAS[w]);
      if (!op) op = [0, c, w];
      op.push(ent(q.x), ent(q.y), ent(q.z));
    }
    if (op && op.length > 6) ops.push(op);
  };
  const roseta = (c, w, x, y) => {
    const h = golpe(x, y);
    if (h) ops.push([1, c, w, ent(h.p.x), ent(h.p.y), ent(h.p.z), ent(h.n.x), ent(h.n.y), ent(h.n.z)]);
  };
  const lluvia = (x0, y0, w, h, n) => {
    const op = [2, Math.floor(r() * 1e9)];
    for (let i = 0; i < n; i++) {
      const g = golpe(x0 + r() * w, y0 + r() * h);
      if (g) op.push(ent(g.p.x), ent(g.p.y), ent(g.p.z), ent(g.n.x), ent(g.n.y), ent(g.n.z));
    }
    if (op.length > 2) ops.push(op);
  };
  if (estado.f === 'guagua') {
    const c1 = col(), c2 = col(), c3 = col();
    linea(c1, 0, (t) => [300 + Math.cos(t) * (142 + Math.sin(t * 14) * 8), 478 + Math.sin(t) * (208 + Math.sin(t * 14) * 8)],
      Math.PI * 0.08, Math.PI * 0.92, 80);
    linea(c2, 1, (t) => [t, 318 + Math.sin((t - 200) / 200 * Math.PI) * 18], 200, 400, 24);
    linea(c3, 1, (t, i) => [t, 560 + (i % 2 ? -16 : 16)], 175, 425, 14);
    for (let x = 196; x <= 404; x += 26) roseta(x % 52 < 26 ? c2 : c1, 0, x, 620);
    roseta(col(), 2, 300, 412);
    lluvia(240, 660, 120, 30, 8);
  } else {
    const c1 = col(), c2 = col();
    linea(c1, 2, (t) => [t, 380 - Math.sin((t - 210) / 170 * Math.PI) * 30], 210, 380, 20);
    linea(c2, 0, (t) => [t, 420 - Math.sin((t - 200) / 190 * Math.PI) * 32], 200, 390, 24);
    linea(c2, 1, (t, i) => [t + (i % 2 ? 14 : -10), 380 - (t - 410) * 2.7], 412, 462, 12);
    [[180, 580], [251, 592], [367, 592], [438, 580]].forEach(([x, y]) => roseta(col(), 1, x, y));
    lluvia(150, 400, 80, 50, 6);
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
  ultimoEnlace = base() + '#r=' + await codificar(receta());
  guardarBorrador();
}
const textoRegalo = () => {
  const quien = estado.d ? estado.d + ' te regaló' : 'Te regalaron';
  const que = (estado.f === 'caballito' ? 'un caballito de pan' : 'una guagua de pan') + (estado.n ? ' que se llama ' + estado.n : '');
  return `${quien} ${que} por el Día de Difuntos. Ábrela aquí:`;
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
    t.textContent = e.n || (e.f === 'caballito' ? 'Caballito' : 'Guagua');
    const s = document.createElement('span'); s.className = 'pieza__meta';
    s.textContent = item.t === 'recibida' ? (e.d ? 'de ' + e.d : 'regalada') + ' · ' + fecha(item.f) : (e.p ? 'para ' + e.p + ' · ' : '') + fecha(item.f);
    b.append(c, t, s);
    b.addEventListener('click', () => abrirPieza(item, e));
    rej.appendChild(b);
  }
}
function abrirPieza(item, e) {
  piezaActual = { item, e };
  $('#p-titulo').textContent = e.n || (e.f === 'caballito' ? 'Caballito' : 'Guagua');
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
    Object.assign(estado, { f: e.f, c: e.c, n: e.n, o: e.o.slice(), p: e.p, d: e.d, m: e.m, id: item.id });
    sincronizarControles(); recargar(); guardarBorrador();
    $('#d-pieza').close();
    $('#taller').scrollIntoView({ behavior: quieto ? 'auto' : 'smooth' });
  });
  $('#p-regalar').addEventListener('click', async () => {
    const enlace = base() + '#r=' + piezaActual.item.e;
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
  const que = e.f === 'caballito' ? 'un caballito' : 'una guagua';
  $('#regalo-titulo').textContent = e.d ? `${e.d} te regaló ${que}` : `Te regalaron ${que}`;
  $('#regalo-nombre').textContent = '«' + (e.n || (e.f === 'caballito' ? 'Caballito' : 'Guagua')) + '»';
  $('#regalo-para').textContent = e.p ? 'Para ' + e.p : '';
  $('#regalo-para').hidden = !e.p;
  $('#regalo-mensaje').textContent = e.m || '';
  $('#regalo-mensaje').hidden = !e.m;
  $('#regalo-pista').textContent = 'Gírala arrastrando a un lado. Tócala para darle un mordisco.';
  $('#regalo-devolver').classList.remove('latido');
  if (!visorRegalo) {
    visorRegalo = new Visor($('#regalo-lienzo'), {
      toca(hit) {
        if (visorRegalo.bocados().length >= MAX_BOCADOS) return true;
        visorRegalo.morder([3, ent(hit.p.x), ent(hit.p.y), ent(hit.p.z)]);
        crunch();
        mordidas++;
        const pista = $('#regalo-pista');
        if (visorRegalo.bocados().length >= MAX_BOCADOS || mordidas === 9) {
          pista.textContent = 'Te la acabaste. Ahora te toca regalar una.';
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
    avisa(para ? `Decora una para ${para}.` : 'A decorar la tuya.', 'ok');
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
  const b = almacen.leer(BORRADOR, null);
  if (b && Array.isArray(b.o)) Object.assign(estado, sano(b), { id: typeof b.id === 'string' ? b.id : null });
  else estado.n = elige(NOMBRES.guagua);
  if (!montarTaller()) return;
  montarRegalo(); montarVitrina(); montarRecibir();
  sincronizarControles(); recargar();
  pintarVitrina();
  const leerHash = () => {
    const h = location.hash.match(/^#r=([zj][A-Za-z0-9_-]+)$/);
    if (h) recibir(h[1]);
  };
  leerHash();
  window.addEventListener('hashchange', leerHash);
}

window.guagua = { tarjeta, foto, codificar, decodificar, veredicto, receta, estado, sorpresa, get taller() { return taller; } };
arrancar();
