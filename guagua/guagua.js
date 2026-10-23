/* ══════════════════════════════════════════════════════════════
   Guagua de pan · el juego, en 3D y en tres actos
     1. Amasar: bolitas y chorizos de masa cruda, que se pegan
        donde caen. Hay moldes (guagua, caballito, chanchito,
        gallinita) para el que no quiera empezar de cero.
     2. Hornear: la masa se infla y se dora mientras corre el
        termómetro. Hay que sacarla a tiempo: antes queda blanca,
        después se quema.
     3. Decorar: manga de crema, rosetas, grageas, pasas y la
        carita. La cara es el mismo pan: se le pintan ojos, nariz y
        sonrisa con glaseado fino.

   Cómo está hecho:
     · Todo es una lista de números. La masa (`a`) son piezas; la
       decoración (`o`) son operaciones; la cocción (`k`) es un
       entero. Eso viaja comprimido en el enlace, después del `#`:
       quien lo abre vuelve a amasar, hornear y decorar la misma
       guagua en su teléfono. No hay servidor.
     · La crema es un tubo con sección de boquilla de estrella que
       se apoya sobre lo que tocaste, siguiendo la normal.
     · El mordisco y el horno los hace el shader: uno descarta lo
       que cae en la mordida, de lado a lado, y pinta de miga el revés; el otro
       mezcla la masa cruda con el dorado (y con el carbón).
   ══════════════════════════════════════════════════════════════ */
import * as THREE from 'three';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import * as nube from './nube.js';
import {
  DIRECCION, V, Q, ent, CREMAS, BOQUILLAS, GROSORES, MASAS, TAMANOS, GRAGEAS, MAX_BOCADOS, BOCADOS_TALLER, MAX_PIEZAS, MORDIDA, NOMBRES, MENSAJES, MENSAJES_MEMORIA, MENSAJE_GUAGUAU, VALES, enMemoria, echada, posturaDe, azar, elige, limita, bolita, chorizo, masaDe, iniPuntos, conMasa, SG, G, C, frenteDe, CUERPO, CABEZA, guaguaConBrazos, MOLDES, elipsoide, tubo, PISO, aplanar, geometriaPieza, moverPieza, base, b64, exprimir, PASOS, aDeltas, deDeltas, codificar, decodificar, deLaPrimeraHornada, sano, punto, tieneCara, queEs, nombreDe, puntoDeCrema, pn, caraPintada, chapitas, sorpresa, Sonda, amasarReceta,
} from './masa.js';

const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/* El toast del DS vive en <body>; un <dialog> abierto está en la capa de
   arriba y lo taparía, así que se mete dentro del diálogo mientras haya uno. */
const avisa = (t, tipo) => {
  const el = window.malDS && window.malDS.aviso ? window.malDS.aviso(t, tipo) : null;
  if (el) (document.querySelector('dialog[open]') || document.body).appendChild(el);
  return el;
};

/* ─── la despensa ──────────────────────────────────────────── */



/* ─── utilidades ───────────────────────────────────────────── */
function lienzo(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

/* ══════════════════ LA MASA ═════════════════════════════════
   Una pieza es un arreglo de enteros (centésimas):
     bolita   [0, x, y, z, rx, ry, rz, giro×100]
     chorizo  [1, grosor×100, x, y, z, x, y, z…]               */




/* ─── geometrías ───────────────────────────────────────────── */
/* Un tubo a lo largo de unos puntos, con las puntas redondas. Con
   `estrias` es crema de boquilla de estrella (y se retuerce un poco
   a lo largo); sin ellas, un chorizo de masa. Los marcos se
   transportan en paralelo, así que no se tuerce de golpe en las curvas. */
/* La masa se hornea acostada en la lata. La figura se arma de frente (x a lo
   ancho, y a lo largo, z hacia arriba) y todo lo que queda bajo z = PISO se
   aplasta contra la lata con una curva suave (softplus): la base queda plana
   y el canto se redondea, como la masa que se asienta con su propio peso. */
/* El dorado del horno, horneado en los vértices: más tostado en los
   cantos y en la base que tocó la lata, más claro arriba. */
const TONOS = MASAS.map((m) => [new THREE.Color(m.tostado), new THREE.Color(m.dorado)]);
function dorar(g, masa = 0) {
  const n = g.attributes.normal, p = g.attributes.position;
  const col = new Float32Array(n.count * 3);
  const L = V(0.25, 0.55, 0.8).normalize(), c = new THREE.Color();
  const [TOSTADO, DORADO] = TONOS[masa] || TONOS[0];
  for (let i = 0; i < n.count; i++) {
    const t = 0.5 + 0.5 * (n.getX(i) * L.x + n.getY(i) * L.y + n.getZ(i) * L.z);
    const piso = limita((p.getZ(i) - PISO) / 0.3, 0, 1);
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

/* ─── el mantel bordado, con flores en anillos ─────────────
   Se desvanece hacia el borde para fundirse con el fondo morado. */
let _mantel = null;
function mantel() {
  if (_mantel) return _mantel;
  const N = 1024, c = lienzo(N, N), x = c.getContext('2d'), M = N / 2;
  x.fillStyle = '#5a1c5e'; x.fillRect(0, 0, N, N);
  const hilos = ['#e01b6a', '#ffc93c', '#93c84a', '#8fd0f2', '#ff77ab'];
  for (let a = 1; a <= 9; a++) {
    const r = a * 54, n = Math.floor((Math.PI * 2 * r) / 52);
    if (a % 2) {
      for (let i = 0; i < n; i++) {
        const t = (i / n) * Math.PI * 2, fx = M + Math.cos(t) * r, fy = M + Math.sin(t) * r;
        x.fillStyle = hilos[(i + a) % hilos.length];
        for (let k = 0; k < 5; k++) {
          const q = (k / 5) * Math.PI * 2 + t;
          x.beginPath(); x.arc(fx + Math.cos(q) * 7, fy + Math.sin(q) * 7, 5, 0, Math.PI * 2); x.fill();
        }
        x.fillStyle = '#ffe9a8';
        x.beginPath(); x.arc(fx, fy, 3.5, 0, Math.PI * 2); x.fill();
      }
    } else {
      x.strokeStyle = 'rgba(255,201,60,.55)'; x.lineWidth = 3; x.setLineDash([9, 7]);
      x.beginPath(); x.arc(M, M, r, 0, Math.PI * 2); x.stroke();
      x.setLineDash([]);
    }
  }
  const g = x.createRadialGradient(M, M, M * 0.45, M, M, M);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.globalCompositeOperation = 'destination-in';
  x.fillStyle = g; x.fillRect(0, 0, N, N);
  _mantel = new THREE.CanvasTexture(c);
  _mantel.colorSpace = THREE.SRGBColorSpace;
  _mantel.anisotropy = 8;
  return _mantel;
}

/* ─── la carita de yeso: solo para abrir enlaces de la primera versión ───────────────────────────────────────
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
    sh.uniforms.uBoca = U.uBoca;
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
        uniform mat3 uBoca;
        uniform float uCoccion;`)
      .replace('void main() {', `void main() {
        for (int i = 0; i < ${MAX_BOCADOS}; i++) {
          if (i >= uNBocados) break;
          // el mordisco atraviesa todo el grosor del pan, de adelante atrás
          vec2 d = (uBoca * (vMundo - uBocados[i].xyz)).xy;
          float dientes = 1.0 + 0.08 * sin(16.0 * atan(d.y, d.x));
          if (length(d) < uBocados[i].w * dientes) discard;
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        ${horno ? `
        vec3 cruda = mix(min(diffuseColor.rgb * 1.6, vec3(1.0)), vec3(0.86, 0.76, 0.56), 0.5);
        diffuseColor.rgb = mix(cruda, diffuseColor.rgb, smoothstep(0.05, 1.0, uCoccion));
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
      uBoca: { value: new THREE.Matrix3() },   // del mundo a los ejes de la figura
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
    Object.assign(sol.shadow.camera, { left: -3.4, right: 3.4, top: 3.4, bottom: -3.4, near: 1, far: 20 });
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
      const loza = new THREE.Mesh(new THREE.CylinderGeometry(2.65, 2.4, 0.12, 72),
        new THREE.MeshPhysicalMaterial({ color: '#fbf7f2', roughness: 0.25, clearcoat: 0.8 }));
      loza.position.y = -0.06; loza.receiveShadow = true;
      const filete = new THREE.Mesh(new THREE.TorusGeometry(2.47, 0.025, 8, 96),
        new THREE.MeshStandardMaterial({ color: '#e01b6a', roughness: 0.4 }));
      filete.rotation.x = Math.PI / 2; filete.position.y = 0.005;
      this.plato.add(loza, filete);
      // la lata, para amasar y para el horno
      this.lata = new THREE.Group();
      const metal = new THREE.MeshStandardMaterial({ color: '#5b5f66', roughness: 0.45, metalness: 0.75 });
      const fondo = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.06, 5), metal);
      fondo.position.y = -0.03; fondo.receiveShadow = true;
      this.lata.add(fondo);
      [[0, 2.5, 4.4, 0.06], [0, -2.5, 4.4, 0.06], [2.2, 0, 0.06, 5], [-2.2, 0, 0.06, 5]].forEach(([x, z, w, d]) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), metal);
        b.position.set(x, 0.02, z);
        this.lata.add(b);
      });
      this.mantel = new THREE.Mesh(new THREE.CircleGeometry(9, 96),
        new THREE.MeshStandardMaterial({ map: mantel(), transparent: true, roughness: 0.95, depthWrite: false }));
      this.mantel.rotation.x = -Math.PI / 2;
      this.mantel.position.y = -0.13;
      this.mantel.receiveShadow = true;
      s.add(this.mantel, this.plato, this.lata);
      this.ambiente('decorar');
    }

    this.camara = new THREE.PerspectiveCamera(30, 0.8, 0.1, 60);
    this.figura = new THREE.Group();
    this.pan = new THREE.Group();
    this.adornos = new THREE.Group();
    // `figura` gira como un plato giratorio; `acostada` es la masa boca arriba
    // sobre la lata: su z local apunta al cielo y su base (z = PISO) toca y = 0.
    this.acostada = new THREE.Group();
    this.acostada.rotation.x = -Math.PI / 2;
    this.acostada.position.set(0, -PISO, 1.6);
    this.acostada.add(this.pan, this.adornos);
    this.figura.add(this.acostada);
    s.add(this.figura);

    this.objetivo = V(0, 1.9, 0);
    this.giro = op.giro != null ? op.giro : -0.25;
    this.cabeceo = 0.9;            // desde arriba y un poco de frente: así se mira una lata
    this.dist = 10.5;
    this.zoom = 1;
    // las medidas de la figura, para encuadrarla acostada o de pie
    this.medidas = { cx: 0, cy: 1.6, minY: 0, maxZ: 0.3, largo: 2.4, ancho: 2.4, grosor: 0.6 };
    this.dePie = 0;                // 0: acostada en la lata · 1: de pie en el plato
    this.margen = { arriba: 0, abajo: 0, derecha: 0 };   // lo que tapan la barra y el dock
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
  /* Se amasa y se hornea en la lata; se decora y se sirve en el plato,
     sobre el mantel bordado. Dentro del horno no hay mantel. */
  ambiente(etapa) {
    if (!this.plato) return;
    this.plato.visible = etapa === 'decorar';
    this.lata.visible = etapa !== 'decorar';
    this.mantel.visible = etapa !== 'horno';
    if (this.acostada) this.dibujar();   // en el constructor todavía no hay figura
  }
  /* El horno: luz de brasa, la masa se infla y se dora. */
  hornear(k, encendido) {
    this.U.uCoccion.value = k;
    const inflado = 1 + 0.05 * limita(k, 0, 1);
    this.pan.scale.set(inflado, inflado, inflado);
    this.pan.position.z = PISO * (1 - inflado);      // se infla sin hundirse en la lata
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
    const o = this.malla(dorar(geometriaPieza(p), masaDe(p)), this.mat.pan);
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
      this.piezaPrevia.applyMatrix4(this.acostada.matrixWorld);
      this.scene.add(this.piezaPrevia);
    }
    this.dibujar();
  }
  /* El encuadre sale del tamaño de lo que hay: un caballito pide más
     lejos que una gallinita. */
  encuadrar() {
    const caja = new THREE.Box3();
    this.piezas.forEach((p) => caja.union(new THREE.Box3().setFromBufferAttribute(geometriaPieza(p).attributes.position)));
    this.zoom = 1;
    if (caja.isEmpty()) { this.medidas = { cx: 0, cy: 1.6, minY: 0, maxZ: 0.3, largo: 2.4, ancho: 2.4, grosor: 0.6 }; return; }
    const c = caja.getCenter(V()), t = caja.getSize(V());
    this.medidas = {
      cx: c.x, cy: c.y, minY: caja.min.y, maxZ: caja.max.z,
      largo: t.y / 2 + 0.45, ancho: t.x / 2 + 0.45, grosor: (caja.max.z - PISO) / 2 + 0.35,
    };
  }
  /* Acostada en la lata para amasar y hornear; de pie en el plato para
     decorar, con la espalda plana que le dejó la lata. Con `animar` se
     levanta (o se acuesta) en medio segundo. */
  postura(dePie, animar) {
    if (!animar || quieto) { this.dePie = dePie; this.dibujar(); return; }
    const de = this.dePie, t0 = performance.now();
    const paso = (t) => {
      const k = Math.min(1, (t - t0) / 650);
      this.dePie = de + (dePie - de) * (1 - (1 - k) ** 3);
      this.dibujar();
      if (k < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
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
    const inv = this.acostada.getWorldQuaternion(new THREE.Quaternion()).invert();
    return { p: this.acostada.worldToLocal(h.point.clone()), n: n.applyQuaternion(inv).normalize(), pieza: h.object.userData.pieza };
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
    const ray = this.apuntar(ev).applyMatrix4(this.acostada.matrixWorld.clone().invert());
    return ray.intersectPlane(new THREE.Plane(V(0, 0, 1), -z), V());
  }
  /* Un rayo en coordenadas de la figura: sirve para amoldar la crema a la superficie. */
  rayoLocal(p, dir, soloPan) {
    this.figura.updateMatrixWorld();
    const o = this.acostada.localToWorld(p.clone());
    const d = dir.clone().applyQuaternion(this.acostada.getWorldQuaternion(new THREE.Quaternion())).normalize();
    return this.rayo(o, d, soloPan);
  }
  /* Para «Sorpréndeme»: tirar un rayo de frente, como si la figura no estuviera girada. */
  deFrente(x, y, soloPan = true) {
    return this.rayoLocal(V(x, y, 10), V(0, 0, -1), soloPan);
  }

  /* Los gestos, pensados para el dedo:
       · un dedo sobre la figura: amasa, pinta o muerde (lo decide `op.toca`);
       · un dedo fuera de ella: gira (salvo al amasar, que es de frente);
       · dos dedos: giran y acercan a la vez, como en cualquier app de 3D.
     El primer dedo espera un instante antes de pintar: si en ese rato
     llega el segundo, era un gesto y no se mancha nada. Con el ratón no
     se espera: el clic derecho gira y la rueda acerca.                 */
  gestos() {
    const c = this.canvas, ptrs = new Map();
    let modo = null, gesto = null, espera = null;
    const ESPERA = 110, HOLGURA = 9;
    const copia = (e) => ({ clientX: e.clientX, clientY: e.clientY, pointerId: e.pointerId, pointerType: e.pointerType });
    const par = () => {
      const [a, b] = [...ptrs.values()];
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)) };
    };
    const decidir = (e) => {
      if (espera) { clearTimeout(espera.t); espera = null; }
      if (this.op.toca && this.op.toca(e)) { modo = this.op.arrastra ? 'pinta' : 'nada'; return; }
      modo = this.fijo ? 'nada' : 'gira';
      if (modo === 'gira') c.classList.add('girando');
    };
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      c.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 2) {
        if (espera) { clearTimeout(espera.t); espera = null; }
        if (modo === 'pinta' && this.op.cancela) this.op.cancela();
        modo = 'dos'; gesto = Object.assign(par(), { zoom: this.zoom });
        return;
      }
      if (ptrs.size > 2) return;
      if (e.pointerType === 'mouse') {
        if (e.button === 2) { modo = this.fijo ? 'nada' : 'gira'; return; }
        decidir(e);
        return;
      }
      modo = 'espera';
      const ini = copia(e);
      espera = { e: ini, t: setTimeout(() => { if (modo === 'espera') decidir(ini); }, ESPERA) };
    });
    c.addEventListener('pointermove', (e) => {
      const prev = ptrs.get(e.pointerId);
      if (!prev) return;
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (modo === 'espera') {
        if (Math.hypot(e.clientX - espera.e.clientX, e.clientY - espera.e.clientY) < HOLGURA) return;
        decidir(espera.e);
        if (modo === 'pinta') this.op.arrastra(e);
        return;
      }
      if (modo === 'gira') {
        this.giro += dx * 0.012;
        this.cabeceo = limita(this.cabeceo + dy * 0.006, ...this.limitesCabeceo());
        this.dibujar();
      } else if (modo === 'pinta') {
        this.op.arrastra(e);
      } else if (modo === 'dos' && ptrs.size === 2) {
        const k = par();
        if (!this.fijo) {
          this.giro += (k.x - gesto.x) * 0.011;
          this.cabeceo = limita(this.cabeceo + (k.y - gesto.y) * 0.006, ...this.limitesCabeceo());
        }
        this.zoom = limita(gesto.zoom * gesto.d / k.d, 0.45, 1.7);
        gesto.x = k.x; gesto.y = k.y;
        this.dibujar();
      }
    });
    const suelta = (e) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.delete(e.pointerId);
      if (modo === 'espera') {                        // fue un toque
        decidir(espera.e);
        if (modo === 'pinta' && this.op.suelta) this.op.suelta(e);
        modo = null;
      } else if (modo === 'pinta' && this.op.suelta) this.op.suelta(e);
      if (!ptrs.size) modo = null;
      else if (modo === 'dos') modo = 'nada';
      c.classList.remove('girando');
    };
    c.addEventListener('pointerup', suelta);
    c.addEventListener('pointercancel', (e) => {
      if (espera) { clearTimeout(espera.t); espera = null; }
      if (modo === 'pinta' && this.op.cancela) this.op.cancela();
      modo = 'nada';
      ptrs.delete(e.pointerId);
      if (!ptrs.size) modo = null;
    });
    /* La rueda acerca; el desplazamiento horizontal del trackpad (o la
       rueda con Shift) gira. Los deltas se acotan: el scroll suave y los
       trackpads mandan ráfagas que, sin tope, pegaban saltos. */
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const k = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 120 : 1;
      const dy = limita(e.deltaY * k, -60, 60), dx = limita(e.deltaX * k, -60, 60);
      if (!e.ctrlKey && !this.fijo && (e.shiftKey || Math.abs(dx) > Math.abs(dy) * 1.5)) {
        this.giro += (Math.abs(dx) > Math.abs(dy) ? dx : dy) * 0.004;   // con Shift el navegador ya lo vuelve horizontal
      } else {
        this.zoom = limita(this.zoom * Math.exp(dy * 0.0016), 0.45, 1.7);
      }
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
  /* La cámara encuadra lo que hay en el hueco que dejan libre la barra y
     el dock, no en toda la pantalla: el centro se corre con `setViewOffset`
     y la distancia crece lo que haga falta para que entre entero. */
  limitesCabeceo() {
    const t = this.dePie;
    return [0.3 + (-0.05 - 0.3) * t, 1.45 + (0.95 - 1.45) * t];
  }
  ubicar() {
    // la postura: de acostada (base sobre la lata) a parada (pies en el plato),
    // siempre con el centro de la figura sobre el eje del plato giratorio
    const md = this.medidas, t = this.dePie;
    this.acostada.rotation.x = -Math.PI / 2 * (1 - t);
    this.acostada.position.set(-md.cx, -PISO + (-md.minY + PISO) * t, md.cy + (-(PISO + md.maxZ) / 2 - md.cy) * t);
    this.objetivo.set(0, 0.3 + (md.cy - md.minY - 0.3) * t, 0);
    const o = this.objetivo;
    this.figura.rotation.y = this.giro;
    this.figura.updateMatrixWorld();
    const w = (this.op.foto ? this.canvas.width : this.canvas.clientWidth) || 800;
    const h = (this.op.foto ? this.canvas.height : this.canvas.clientHeight) || 1000;
    const m = this.margen;
    const libreW = Math.max(160, w - m.derecha), libreH = Math.max(160, h - m.arriba - m.abajo);
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camara.fov / 2));
    // lo que se ve de alto depende de la postura y de cuán desde arriba se mire
    const { largo, ancho, grosor } = md;
    const sc = Math.sin(this.cabeceo), cc = Math.cos(this.cabeceo);
    const alto = (largo * sc + grosor * cc) * (1 - t) + (largo * cc + grosor * sc) * t;
    const radio = Math.max(largo, ancho) * (1 - t) + Math.max(ancho, grosor) * t;
    const dv = alto / tan * (h / libreH);
    const dh = radio / (tan * (w / h)) * (w / libreW);
    this.dist = Math.max(dv, dh) * this.zoom;
    if (m.arriba || m.abajo || m.derecha) this.camara.setViewOffset(w, h, m.derecha / 2, (m.abajo - m.arriba) / 2, w, h);
    else if (this.camara.view) this.camara.clearViewOffset();
    this.camara.position.set(o.x, o.y + Math.sin(this.cabeceo) * this.dist, o.z + Math.cos(this.cabeceo) * this.dist);
    this.camara.lookAt(o);
    // los mordiscos viven en la figura: se llevan al mundo en cada cuadro
    const e = this.acostada.matrixWorld.elements;
    const ex = V(e[0], e[1], e[2]).normalize(), ey = V(e[4], e[5], e[6]).normalize(), ez = V(e[8], e[9], e[10]).normalize();
    this.U.uBoca.value.set(ex.x, ex.y, ex.z, ey.x, ey.y, ey.z, ez.x, ez.y, ez.z);
    this.bocados().forEach((op, i) => {
      const p = this.acostada.localToWorld(V(op[1] / Q, op[2] / Q, op[3] / Q));
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
  if (!estudio) estudio = new Visor(lienzo(w, h), { foto: true, plato: false, giro: 0 });
  estudio.renderer.setSize(w, h, false);
  estudio.camara.aspect = w / h;
  estudio.camara.updateProjectionMatrix();
  estudio.cabeceo = echada(e) ? 0.85 : 0.12;   // de frente, como en la panadería
  estudio.dePie = echada(e) ? 0 : 1;
  estudio.cargar(e);
  (extra || []).forEach((op) => estudio.extra.push(op));
  estudio.actualizarBocados();
  estudio.dibujar();
  const c = lienzo(w, h);
  c.getContext('2d').drawImage(estudio.canvas, 0, 0, w, h);
  return c;
}

/* ─── el bodegón: la guagua en su plato, con su colada (o su velita) ─── */
/* Una taza de colada morada de verdad, en 3D: loza con filete fucsia, la
   colada espesa encima y pedacitos de piña, frutilla y mortiño. */
function taza3d() {
  const g = new THREE.Group();
  const loza = new THREE.MeshPhysicalMaterial({ color: '#f6ede2', roughness: 0.3, clearcoat: 0.7, side: THREE.DoubleSide });
  const perfil = [[0, 0], [0.5, 0], [0.56, 0.05], [0.6, 0.6], [0.64, 1.15], [0.62, 1.2], [0.58, 1.18], [0.55, 0.15], [0, 0.15]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const cuerpo = new THREE.Mesh(new THREE.LatheGeometry(perfil, 64), loza);
  const filete = new THREE.Mesh(new THREE.CylinderGeometry(0.627, 0.618, 0.12, 64, 1, true),
    new THREE.MeshStandardMaterial({ color: '#e01b6a', roughness: 0.35 }));
  filete.position.y = 0.82;
  const asa = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.075, 16, 40, Math.PI), loza);
  asa.rotation.z = -Math.PI / 2; asa.position.set(0.6, 0.64, 0);
  const colada = new THREE.Mesh(new THREE.CircleGeometry(0.575, 64),
    new THREE.MeshStandardMaterial({ color: '#3d0a2e', roughness: 0.32, envMapIntensity: 0.25 }));
  colada.rotation.x = -Math.PI / 2; colada.position.y = 1.07;
  g.add(cuerpo, filete, asa, colada);
  const r = azar(11), frutas = ['#f2c14e', '#d7263d', '#2b1d4f', '#f2c14e', '#d7263d'];
  for (let i = 0; i < 9; i++) {
    const c = frutas[i % frutas.length], a = r() * Math.PI * 2, d = 0.1 + r() * 0.36;
    const m = new THREE.Mesh(c === '#2b1d4f' ? new THREE.SphereGeometry(0.045, 12, 8) : new THREE.BoxGeometry(0.09, 0.05, 0.09),
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.4 }));
    m.position.set(Math.cos(a) * d, 1.085, Math.sin(a) * d); m.rotation.y = r() * 3;
    g.add(m);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData.boca = V(0, 1.2, 0);          // de aquí sale el vapor
  return g;
}
/* La velita para las dedicadas: cera, pabilo y una llama que alumbra. */
function vela3d() {
  const g = new THREE.Group();
  const cera = new THREE.MeshStandardMaterial({ color: '#f4ead8', roughness: 0.55 });
  const platito = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.38, 0.08, 48),
    new THREE.MeshStandardMaterial({ color: '#e01b6a', roughness: 0.4 }));
  platito.position.y = 0.04;
  const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 1.3, 40), cera);
  cuerpo.position.y = 0.73;
  const gota = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), cera);
  gota.scale.set(1, 2.2, 1); gota.position.set(0.17, 1.22, 0.1);
  const pabilo = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 8), new THREE.MeshBasicMaterial({ color: '#2e0f36' }));
  pabilo.position.y = 1.43;
  const llama = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16), new THREE.MeshBasicMaterial({ color: '#ffb02e', toneMapped: false }));
  llama.scale.set(0.075, 0.19, 0.075); llama.position.y = 1.6;
  const centro = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: '#fff6d0', toneMapped: false }));
  centro.scale.set(0.035, 0.09, 0.035); centro.position.y = 1.55;
  const luz = new THREE.PointLight('#ffb347', 6, 5, 1.6);
  luz.position.y = 1.65;
  g.add(platito, cuerpo, gota, pabilo, llama, centro, luz);
  [platito, cuerpo, gota].forEach((m) => { m.castShadow = true; m.receiveShadow = true; });
  g.userData.boca = V(0, 1.6, 0);          // aquí brilla la llama
  return g;
}
let bodega = null;
/* Las piezas del bodegón se renderizan por separado y sin plato, cada una
   recortada a lo que tiene: así la tarjeta las acomoda como mejor queden. */
function estudioBodegon(lado) {
  if (!bodega) {
    bodega = new Visor(lienzo(lado, lado), { foto: true, giro: 0 });
    bodega.plato.visible = false; bodega.lata.visible = false; bodega.mantel.visible = false;
    bodega.taza = taza3d(); bodega.vela = vela3d();
    bodega.scene.add(bodega.taza, bodega.vela);
    bodega.taza.position.set(0, -0.12, 0); bodega.vela.position.set(0, -0.12, 0);
    Object.assign(bodega.sol.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 });
    bodega.sol.shadow.camera.updateProjectionMatrix();
    bodega.sol.shadow.mapSize.set(2048, 2048);
  }
  const b = bodega;
  b.renderer.setSize(lado, lado, false);
  b.camara.aspect = 1; b.camara.updateProjectionMatrix();
  b.plato.visible = false; b.lata.visible = false; b.mantel.visible = false;
  b.taza.visible = false; b.vela.visible = false;
  if (b.camara.view) b.camara.clearViewOffset();
  return b;
}
function encuadrarBodegon(b, objeto, cabeceo, holgura = 1.04) {
  const caja = new THREE.Box3().setFromObject(objeto);
  const centro = caja.getCenter(V(0, 0, 0)), radio = caja.getSize(V(0, 0, 0)).length() / 2;
  const d = radio / Math.sin(THREE.MathUtils.degToRad(b.camara.fov / 2)) * holgura;
  b.camara.position.set(centro.x, centro.y + Math.sin(cabeceo) * d, centro.z + Math.cos(cabeceo) * d);
  b.camara.lookAt(centro);
}
function recortado(b, lado) {
  const c = lienzo(lado, lado);
  c.getContext('2d').drawImage(b.canvas, 0, 0);
  const r = recorte(c);
  const out = lienzo(r.w, r.h);
  out.getContext('2d').drawImage(c, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
  return { img: out, r };
}
/* La guagua sola, de frente (o desde arriba si va echada), sin plato. */
function retrato(e, lado = 1400) {
  const b = estudioBodegon(lado);
  Object.assign(b, posturaDe(e));
  b.cabeceo = echada(e) ? 0.8 : 0.22;
  b.cargar(e);
  b.ubicar();
  encuadrarBodegon(b, b.figura, b.cabeceo);
  b.renderer.render(b.scene, b.camara);
  return recortado(b, lado).img;
}
/* La taza de colada o la velita, solas, y dónde queda su boca en la imagen. */
function adorno(memoria, lado = 900) {
  const b = estudioBodegon(lado);
  b.vaciar(b.pan); b.vaciar(b.adornos);
  const cosa = memoria ? b.vela : b.taza;
  cosa.visible = true;
  cosa.rotation.y = memoria ? 0 : -0.5;
  encuadrarBodegon(b, cosa, memoria ? 0.2 : 0.42, 1.08);
  b.renderer.render(b.scene, b.camara);
  const boca = cosa.localToWorld(cosa.userData.boca.clone()).project(b.camara);
  const { img, r } = recortado(b, lado);
  return { img, boca: { x: (boca.x + 1) / 2 * lado - r.x, y: (1 - boca.y) / 2 * lado - r.y } };
}
/* El rectángulo con algo pintado (la sombra cuenta), con un margen. */
function recorte(c) {
  const { width: w, height: h } = c, px = c.getContext('2d').getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
    if (px[(y * w + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 <= x0) return { x: 0, y: 0, w, h };
  const m = 6;
  x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(w, x1 + m); y1 = Math.min(h, y1 + m);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/* ══════════════════ EL ENLACE ═══════════════════════════════ */

/* ─── el horno opina, y la panadera también ───────────────── */
function veredicto(e) {
  const cuenta = (t) => e.o.filter((op) => op[0] === t).length;
  const trazos = cuenta(0), rosetas = cuenta(1), grag = cuenta(2), bocados = cuenta(3);
  const colores = new Set(e.o.filter((op) => op[0] < 2).map((op) => op[1])).size;
  const k = e.k / 100, total = e.o.length;
  const cara = tieneCara(e);
  let frase;
  if (k > 1.25) frase = punto(k).f;
  else if (!total) frase = 'Le falta la decoración: con un poco de crema queda lista.';
  else if (bocados >= 3) frase = 'Ya tiene varios mordiscos. Se nota que estaba rica.';
  else if (bocados) frase = 'Tiene un mordisco: alguien no pudo esperar.';
  else if (k < 0.92) frase = punto(k).f;
  else if (total > 70) frase = 'Cuánto detalle. Quedó para la vitrina de la panadería.';
  else if (colores >= 6) frase = 'Muy colorida, como las de los mercados en noviembre.';
  else if (grag > trazos + rosetas) frase = 'Llena de grageas: alegre y de fiesta.';
  else if (colores === 1 && trazos > 4) frase = 'Sobria y elegante, de un solo color.';
  else if (e.f === 'libre' && e.a.length > 3) frase = 'Una figura propia, hecha a mano. Así empiezan las tradiciones.';
  else if (!cara && (e.f === 'guagua' || e.f === 'tradicional')) frase = 'Bonita, aunque le falta la carita. Toca su cara con Carita y píntale ojos y sonrisa.';
  else if (e.f === 'caballito') frase = 'Un caballito bien adornado, listo para la mesa.';
  else frase = elige([
    'Muy bonita. Así se decoraban en casa de la abuela.',
    'Quedó linda. Ahora solo falta la colada morada.',
    'Hecha con paciencia, y se nota.',
    'Una guagua como las de antes.',
  ]);
  const horno = k >= 0.92 && k <= 1.08 ? 1 : k > 1.25 || k < 0.75 ? -2 : 0;
  const nota = Math.max(1, Math.min(10, 4 + Math.min(colores, 3) + (rosetas ? 1 : 0) + (grag ? 1 : 0) + (cara ? 1 : 0) + horno - (total < 4 ? 2 : 0)));
  const razon = k > 1.25 ? 'porque se pasó de horno' : k < 0.92 ? 'porque le faltó horno' : 'porque falta la colada morada';
  const descuento = nota === 10 ? 'Diez de diez.' : `${nota}/10. Le bajé ${10 - nota} ${10 - nota === 1 ? 'punto' : 'puntos'} ${razon}.`;
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
  if (d > 300) return 'Finados ya pasó, pero una guagua siempre es bienvenida';
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
/* El vale, como un sello de papel recortado sobre la tarjeta. */
function sello(ctx, vale, x, y) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(0.08);
  ctx.fillStyle = 'rgba(46,15,54,.82)';
  ctx.beginPath(); ctx.roundRect(-150, -72, 300, 144, 16); ctx.fill();
  ctx.setLineDash([12, 8]); ctx.lineWidth = 4; ctx.strokeStyle = '#ffc93c';
  ctx.beginPath(); ctx.roundRect(-140, -62, 280, 124, 10); ctx.stroke();
  ctx.setLineDash([]);
  ctx.textAlign = 'center'; ctx.fillStyle = '#ffc93c';
  ctx.font = '600 22px Inter, system-ui, sans-serif';
  ctx.fillText(vale.sello[0], 0, -22, 250);
  ctx.fillStyle = '#fff';
  ctx.font = '800 32px Syne, Inter, system-ui, sans-serif';
  ctx.fillText(vale.sello[1], 0, 16, 260);
  ctx.fillText(vale.sello[2], 0, 50, 260);
  ctx.restore();
}
/* Dos formatos: historia (9:16) para los estados y las historias, y
   cuadrada (1:1) para publicar. Todo se acomoda alrededor del bodegón. */
const FORMATOS = {
  historia: { w: 1080, h: 1920, kicker: 300, titulo: [420, 524], fuente: 100, escena: [590, 1380], cinta: 1420, quien: 1530, msg: 1586, lineas: 2, pie: 1700 },
  cuadrada: { w: 1080, h: 1080, kicker: 74, titulo: [156, 228], fuente: 70, escena: [256, 856], cinta: 880, quien: 980, msg: 1020, lineas: 1, pie: 1060 },
};
async function tarjeta(e, formato = 'historia') {
  try { await Promise.all([document.fonts.load('800 80px Syne'), document.fonts.load('600 30px Inter'), document.fonts.load('italic 400 30px Inter')]); } catch (err) { /* sin fuentes, igual sale */ }
  const F = FORMATOS[formato] || FORMATOS.historia, W = F.w, H = F.h;
  const c = lienzo(W, H);
  const ctx = c.getContext('2d');
  const fondo = ctx.createLinearGradient(0, 0, 0, H);
  fondo.addColorStop(0, '#2e0f36'); fondo.addColorStop(1, '#5a1c50');
  ctx.fillStyle = fondo; ctx.fillRect(0, 0, W, H);
  const rnd = azar(e.o.length + 7);
  ctx.fillStyle = 'rgba(255,201,60,.08)';
  for (let y = 30; y < H; y += 54) for (let x = (y / 54 % 2) * 27 + 20; x < W; x += 54) {
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
  }
  // un resplandor tibio detrás de la mesa
  const [e0, e1] = F.escena, ecy = (e0 + e1) / 2;
  const luz = ctx.createRadialGradient(W / 2, ecy, 40, W / 2, ecy, (e1 - e0) * 0.75);
  luz.addColorStop(0, 'rgba(255,170,90,.28)'); luz.addColorStop(1, 'rgba(255,170,90,0)');
  ctx.fillStyle = luz; ctx.fillRect(0, e0 - 200, W, e1 - e0 + 400);
  ctx.fillStyle = 'rgba(255,201,60,.55)';
  for (let i = 0; i < 22; i++) {
    const x = rnd() * W, y = F.kicker + 40 + rnd() * (F.pie - F.kicker - 120), r = 3 + rnd() * 5;
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
  ctx.fillText('2 DE NOVIEMBRE · DÍA DE DIFUNTOS', W / 2, F.kicker);
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${F.fuente}px Syne, Inter, system-ui, sans-serif`;
  const que = queEs(e), memoria = enMemoria(e);
  const titulo = memoria
    ? (e.p ? ['En memoria', 'de ' + e.p] : ['Para recordar', 'a quien ya no está'])
    : (e.d ? ['Te regalo', que] : [que.charAt(0).toUpperCase() + que.slice(1), 'para ti']);
  titulo.forEach((t, i) => ctx.fillText(t, W / 2, F.titulo[i], W - 80));

  // la guagua, grande y al centro; la colada (o la velita) abajo a un lado,
  // un poco por delante, como en una mesa; cada una con su sombra en el mantel
  const sombra = (x, y, rx, ry, a) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
    g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.translate(-x, -y);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rx, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  };
  const cuadrada = formato === 'cuadrada';
  const g3 = retrato(e);
  const altoG = (e1 - e0 - (cuadrada ? 50 : 90)) * (echada(e) ? 0.92 : 1), anchoG = W * (cuadrada ? 0.56 : 0.72);
  const kg = Math.min(anchoG / g3.width, altoG / g3.height);
  const gw = g3.width * kg, gh = g3.height * kg;
  const gx = W / 2 - gw / 2 - (cuadrada ? 70 : 40), gy = e1 - gh - (cuadrada ? 30 : 60);
  sombra(gx + gw / 2, gy + gh + 4, gw * 0.62, gw * 0.16, 0.55);
  ctx.drawImage(g3, gx, gy, gw, gh);
  const { img: a3, boca } = adorno(memoria);
  const ka = (cuadrada ? 250 : 330) / a3.height;
  const aw = a3.width * ka, ah = a3.height * ka;
  const ax = Math.min(W - aw - 40, gx + gw - aw * 0.08), ay = e1 - ah + (cuadrada ? 30 : 50);
  sombra(ax + aw / 2, ay + ah + 2, aw * 0.6, aw * 0.16, 0.5);
  ctx.drawImage(a3, ax, ay, aw, ah);
  const px = ax + boca.x * ka, py = ay + boca.y * ka;
  if (memoria) {
    const brillo = ctx.createRadialGradient(px, py, 4, px, py, 190);
    brillo.addColorStop(0, 'rgba(255,190,80,.55)'); brillo.addColorStop(1, 'rgba(255,190,80,0)');
    ctx.fillStyle = brillo; ctx.beginPath(); ctx.arc(px, py, 190, 0, Math.PI * 2); ctx.fill();
  } else {
    // el vapor de la colada
    ctx.strokeStyle = 'rgba(255,255,255,.42)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    [-30, 0, 30].forEach((dx, i) => {
      const x = px + dx, y = py - 10;
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + 18, y - 30, x - 18, y - 60 - i * 8, x, y - 95 - i * 10); ctx.stroke();
    });
  }
  if (!memoria && VALES[e.l]) {
    ctx.save();
    if (formato === 'cuadrada') { ctx.translate(W - 175, e0 + 75); ctx.scale(0.8, 0.8); } else ctx.translate(W - 190, e0 + 40);
    sello(ctx, VALES[e.l], 0, 0);
    ctx.restore();
    ctx.textAlign = 'center';
  }

  const nombre = '«' + nombreDe(e) + '»';
  ctx.font = `800 ${formato === 'cuadrada' ? 40 : 50}px Syne, Inter, system-ui, sans-serif`;
  const alto = formato === 'cuadrada' ? 64 : 82;
  const an = Math.min(W - 160, ctx.measureText(nombre).width + 80);
  ctx.fillStyle = '#e01b6a';
  ctx.beginPath(); ctx.roundRect(W / 2 - an / 2, F.cinta, an, alto, alto / 2); ctx.fill();
  ctx.fillStyle = '#b01254';
  ctx.beginPath(); ctx.roundRect(W / 2 - an / 2, F.cinta + alto - 8, an, 8, 4); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(nombre, W / 2, F.cinta + alto * 0.7, W - 200);
  const quien = memoria ? (e.d ? 'Con cariño, de ' + e.d : '') : [e.p && 'Para ' + e.p, e.d && 'de ' + e.d].filter(Boolean).join(' · ');
  if (quien) {
    ctx.font = '600 34px Inter, system-ui, sans-serif'; ctx.fillStyle = '#ffffff';
    ctx.fillText(quien, W / 2, F.quien, W - 120);
  }
  if (e.m) {
    ctx.font = 'italic 400 30px Inter, system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.82)';
    envolver(ctx, e.m, W / 2, quien ? F.msg : F.quien, W - 180, 42, F.lineas + (quien ? 0 : 1));
  }
  ctx.font = '600 24px Inter, system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,201,60,.9)';
  ctx.fillText((memoria ? '¿A quién recuerdas tú? Dedica la tuya en ' : 'Amasa y decora la tuya en ') + DIRECCION, W / 2, F.pie, W - 80);
  return c;
}
const aBlob = (c) => new Promise((ok) => c.toBlob(ok, 'image/png'));

/* ─── la vitrina ───────────────────────────────────────────── */
const CLAVE = 'guagua:vitrina3d', BORRADOR = 'guagua:borrador-amasado';
const almacen = {
  leer(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } },
  poner(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
};
/* La vitrina vive en el navegador y, si hay cuenta, también en la nube.
   El navegador es la copia de siempre (funciona sin red); la nube es la
   que se ve cuando hay sesión, y la que sigue a la persona de un teléfono a otro. */
const vitrina = () => almacen.leer(CLAVE, []);
function guardarEnVitrina(item) {
  const lista = vitrina().filter((x) => x.id !== item.id && !(item.t === 'recibida' && x.e === item.e));
  lista.unshift(item);
  if (!almacen.poner(CLAVE, lista.slice(0, 80))) avisa('No hay espacio en la vitrina de este navegador.', 'error');
  if (nube.actual()) nube.guardar(item).catch((e) => avisa(nube.explicar(e), 'error'));
}
function sacarDeVitrina(id) {
  almacen.poner(CLAVE, vitrina().filter((x) => x.id !== id));
  if (nube.actual()) return nube.borrar(id).catch((e) => avisa(nube.explicar(e), 'error'));
}
async function listaVitrina() {
  if (nube.actual()) {
    try { return await nube.vitrina(); } catch (e) { avisa(nube.explicar(e), 'error'); }
  }
  return vitrina();
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
  mano: 'bolita', grosor: 1, masa: 0,
  herramienta: 'manga', crema: 1, boquilla: 2, tamano: 1,
  id: null, n: '', p: '', d: '', m: '', t: '', l: 0,
};
let taller = null;       // el visor del taller
let trazo = null;        // lo que el dedo está haciendo al decorar
let amase = null;        // …y al amasar
let historia = [];       // las masas de antes, para deshacer al amasar
const receta = () => Object.assign({ v: 3, f: estado.f, a: estado.a, k: estado.k, o: estado.o, n: estado.n, p: estado.p, d: estado.d, m: estado.m },
  estado.t === 'm' ? { t: 'm' } : estado.l ? { l: estado.l } : {});

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
  if (mano === 'mover' || mano === 'quitar' || mano === 'tenir') {
    if (!hit || hit.pieza == null) return true;
    if (mano === 'tenir') {
      if (masaDe(estado.a[hit.pieza]) === estado.masa) return true;
      recordar();
      const a = estado.a.slice();
      a[hit.pieza] = conMasa(a[hit.pieza], estado.masa);
      estado.a = a;
      taller.cambiarPieza(hit.pieza, a[hit.pieza]);
      cambiarMasa(a); vibra();
      return true;
    }
    if (mano === 'quitar') {
      recordar();
      const a = estado.a.filter((_, i) => i !== hit.pieza);
      taller.ponerMasa(a); cambiarMasa(a);
      return true;
    }
    const pz = estado.a[hit.pieza];
    const z = pz[pz[0] === 0 ? 3 : iniPuntos(pz) + 2] / Q;
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
    const p = hit ? hit.p.clone().addScaledVector(hit.n, -r * 0.35) : taller.alPlano(ev, PISO + r * 0.8);
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
  const z = amase.sobre ? c.z - rz * 0.35 : PISO + rz * 0.8;   // en la lata, apoyada
  amase.pieza = conMasa(bolita(V(c.x, c.y, z), V(rx, ry, rz)), estado.masa);
  taller.previaPieza(amase.pieza);
}
function arrastrarMasa(ev) {
  if (!amase) return;
  if (amase.mano === 'bolita') {
    const q = taller.alPlano(ev, amase.c.z);
    if (q && Math.hypot(q.x - amase.c.x, q.y - amase.c.y) > 0.06) { amase.estirada = true; estirarBolita(q); }
  } else if (amase.mano === 'chorizo') {
    const hit = taller.tocar(ev, true);
    const ultimo = amase.pts[amase.pts.length - 1];
    const p = hit ? hit.p.clone().addScaledVector(hit.n, -amase.r * 0.35) : taller.alPlano(ev, PISO + amase.r * 0.8);
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
    // un toque, sin estirar: una bolita mediana
    const pieza = m.estirada ? m.pieza : (() => { const r = 0.3, z = m.sobre ? m.c.z - r * 0.25 : PISO + r * 0.6; return conMasa(bolita(V(m.c.x, m.c.y, z), V(r, r, r * 0.75)), estado.masa); })();
    vibra();
    const a = estado.a.concat([pieza]);
    taller.ponerMasa(a); cambiarMasa(a);
  } else if (m.mano === 'chorizo') {
    recordar();
    const p = conMasa(m.pts.length > 1 ? chorizo(m.r, m.pts) : bolita(m.pts[0], V(m.r * 1.3, m.r * 1.3, m.r * 1.1)), estado.masa);
    vibra();
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
  if (!estado.a.length) { avisa('Primero pon algo de masa en la lata.'); return; }
  irA('horno');
  estado.k = 0; estado.o = [];
  taller.cargar(estado);
  $('#horno-fin').hidden = true;
  $('#sacar').hidden = false;
  $('#sacar').disabled = false;
  $('#taller').classList.add('en-horno');
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
  $('#taller').classList.remove('en-horno');
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
  $('#taller').classList.remove('en-horno');
}

/* ─── 3. decorar ──────────────────────────────────────────── */
const vibra = () => { if (navigator.vibrate) navigator.vibrate(8); };
function fijar(op) {
  estado.o.push(op);
  if (op[0] !== 0 && op[0] !== 2) vibra();
  taller.agregar(op);
  guardarBorrador();
  actualizarEtiqueta();
}
/* La carita no se tapa con nada: la cara es el mismo pan, dorado, y se le
   pintan las facciones con glaseado fino, como en las guaguas de panadería:
   dos puntitos oscuros de ojos, una naricita, una sonrisa roja y, si se
   quiere, las chapitas. Se toca el centro de la cara y salen todas juntas,
   amoldadas a la cabeza; cada una es un trazo de manga y se puede deshacer
   o retocar con el pincel. */
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
    chapitas(hit, estado.tamano, caraPintada(hit, estado.tamano, taller), taller).forEach((op) => fijar(op));
  } else if (h === 'mordisco') {
    if (estado.o.filter((op) => op[0] === 3).length >= BOCADOS_TALLER) {
      avisa('Ya tiene suficientes mordiscos. Deja algo para quien la reciba.');
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
  amasar: 'Arrastra para hacer una bolita: hacia el lado sale ancha, hacia arriba sale alta. Encima de otra pieza, se pega. Con dos dedos te acercas.',
  horno: 'Mírala dorarse y sácala en la franja blanca. Si la sacas antes queda blanca; si esperas mucho, se quema.',
  decorar: 'Con un dedo decoras. Con dos dedos la giras y te acercas. La cara también se dibuja: carita, pasas y pincel.',
};
let relojPista = null;
function pista(texto, ms = 6500) {
  const el = $('#mesa-pista');
  el.textContent = texto;
  el.classList.remove('oculta');
  clearTimeout(relojPista);
  relojPista = setTimeout(() => el.classList.add('oculta'), ms);
}
/* Lo que tapan la barra y el dock, para que la cámara encuadre en el hueco. */
function margenes(canvas, arriba, abajo) {
  const c = canvas.getBoundingClientRect();
  const m = { arriba: 0, abajo: 0, derecha: 0 };
  if (!c.width) return m;
  if (arriba) m.arriba = Math.max(0, arriba.getBoundingClientRect().bottom - c.top);
  if (abajo && !abajo.hidden) {
    const d = abajo.getBoundingClientRect();
    if (d.width < c.width * 0.6 && d.left > c.left + c.width * 0.4) m.derecha = Math.max(0, c.right - d.left);
    else m.abajo = Math.max(0, c.bottom - d.top);
  }
  return m;
}
/* El dock se pliega para dejar más pantalla a la guagua: queda la cabecera
   con un resumen de lo elegido, y se despliega con el asa o al cambiar de etapa. */
function plegarDock(si) {
  estado.plegado = !!si;
  $('#taller').dataset.plegado = si ? '1' : '';
  $$('.dock__asa').forEach((b) => b.setAttribute('aria-expanded', String(!si)));
  resumenDock();
  requestAnimationFrame(medirTaller);
}
function resumenDock() {
  const r = $(`.dock[data-etapa="${estado.etapa}"] .dock__resumen`);
  if (!r) return;
  if (estado.etapa === 'amasar') {
    const manos = { bolita: 'Bolita', chorizo: 'Chorizo', mover: 'Mover', quitar: 'Quitar', tenir: 'Teñir' };
    r.textContent = manos[estado.mano] + (estado.mano === 'chorizo' ? ' · ' + ['fino', 'medio', 'grueso'][estado.grosor] : '');
  } else if (estado.etapa === 'decorar') {
    const h = { manga: 'Manga', roseta: 'Roseta', grageas: 'Grageas', carita: 'Carita', pasa: 'Pasas', mordisco: 'Mordisco' }[estado.herramienta];
    const con = estado.herramienta === 'manga' || estado.herramienta === 'roseta'
      ? ' · ' + CREMAS[estado.crema].n.toLowerCase() + ' · ' + ['pincel', 'fina', 'media', 'gruesa'][estado.boquilla] : '';
    r.textContent = h + con;
  }
}
function montarAsas() {
  $$('.dock__asa').forEach((b) => {
    b.addEventListener('click', () => plegarDock(!estado.plegado));
    // también se arrastra: hacia abajo pliega, hacia arriba despliega
    let y0 = null;
    b.addEventListener('pointerdown', (e) => { y0 = e.clientY; b.setPointerCapture(e.pointerId); });
    b.addEventListener('pointermove', (e) => {
      if (y0 == null) return;
      const d = e.clientY - y0;
      if (d > 28 && !estado.plegado) { plegarDock(true); y0 = null; }
      else if (d < -28 && estado.plegado) { plegarDock(false); y0 = null; }
    });
    b.addEventListener('pointerup', () => { y0 = null; });
  });
  $$('.dock__cab .dock__t').forEach((t) => t.addEventListener('click', () => { if (estado.plegado) plegarDock(false); }));
}
function medirTaller() {
  if (!taller) return;
  taller.margen = margenes($('#lienzo'), $('#barra'), $(`.dock[data-etapa="${estado.etapa}"]`));
  taller.dibujar();
}
function irA(etapa) {
  if (etapa !== 'horno') apagarHorno();
  estado.etapa = etapa;
  const t = $('#taller');
  t.dataset.etapa = etapa;
  t.dataset.herramienta = etapa === 'amasar' ? estado.mano : estado.herramienta;
  $$('.dock[data-etapa]').forEach((s) => { s.hidden = s.dataset.etapa !== etapa; });
  if (estado.plegado) plegarDock(false);
  resumenDock();
  $$('[data-ir]').forEach((b) => {
    const i = ['amasar', 'horno', 'decorar'].indexOf(b.dataset.ir), j = ['amasar', 'horno', 'decorar'].indexOf(etapa);
    if (b.dataset.ir === etapa) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    b.classList.toggle('hecha', i < j);
  });
  $('[data-ir="decorar"]').disabled = estado.k < 50;
  pista(PISTAS[etapa]);
  taller.fijo = etapa === 'amasar';
  taller.ambiente(etapa);
  if (etapa === 'amasar') {
    taller.hornear(0, false);
    taller.postura(0, taller.dePie > 0);
    taller.cabeceo = 1.3;          // casi desde arriba, como sobre la mesa
    taller.girar(0, true);
  } else if (etapa === 'horno') {
    taller.postura(0);
    taller.cabeceo = 0.95;
  } else if (etapa === 'decorar') {
    taller.hornear(estado.k / 100, false);
    const { dePie, cabeceo } = posturaDe(estado);
    taller.postura(dePie, true);   // sale del horno y se levanta: se decora de pie (o echada)
    taller.cabeceo = cabeceo;
    // derecha otra vez (el horno la deja dando vueltas), por el camino corto
    taller.girar(Math.round(taller.giro / (Math.PI * 2)) * Math.PI * 2, true);
  }
  requestAnimationFrame(medirTaller);
  guardarBorrador(); actualizarEtiqueta();
}
function volverAAmasar() {
  if (estado.etapa === 'amasar') return;
  if (estado.o.length && !confirm('Si vuelves a amasar, se borra la decoración y la masa vuelve a estar cruda. ¿Continuar?')) return;
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
  // solo botones: el <main> también lleva data-herramienta, para el CSS
  const grupoDe = (attr, clave, num) => $$(`button[${attr}]`).forEach((b) => b.addEventListener('click', () => {
    const v = b.getAttribute(attr);
    estado[clave] = num ? +v : v;
    $$(`button[${attr}]`).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    if (clave === 'herramienta' || clave === 'mano') $('#taller').dataset.herramienta = estado[clave];
    resumenDock();
    requestAnimationFrame(medirTaller);
  }));
  grupoDe('data-mano', 'mano');
  const masas = $('#masas');
  if (masas) MASAS.forEach((ms, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'crema masa';
    b.style.setProperty('--crema', ms.dorado);
    b.setAttribute('aria-label', 'Masa ' + ms.n.toLowerCase());
    b.setAttribute('aria-pressed', String(i === estado.masa));
    b.title = ms.n;
    b.addEventListener('click', () => {
      estado.masa = i;
      $$('.masa', masas).forEach((x, j) => x.setAttribute('aria-pressed', String(j === i)));
    });
    masas.appendChild(b);
  });
  grupoDe('data-grosor', 'grosor', true);
  grupoDe('data-herramienta', 'herramienta');
  grupoDe('data-boquilla', 'boquilla', true);
  grupoDe('data-tamano', 'tamano', true);
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
      if (estado.herramienta !== 'manga' && estado.herramienta !== 'roseta') $('button[data-herramienta="manga"]').click();
    });
    cremas.appendChild(b);
  });
  $$('[data-molde]').forEach((b) => b.addEventListener('click', () => {
    const f = b.dataset.molde;
    if (estado.a.length && !confirm(f === 'libre' ? '¿Vaciar la lata?' : 'Se reemplaza la masa que tienes. ¿Continuar?')) return;
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
  // la barra: ayuda, vitrina y pantalla completa
  $('#abrir-info').addEventListener('click', () => window.malDS.abrir('#d-info'));
  $('#abrir-vitrina').addEventListener('click', () => { pintarVitrina(); window.malDS.abrir('#d-vitrina'); });
  const raiz = document.documentElement;
  if (raiz.requestFullscreen && document.fullscreenEnabled) {
    const boton = $('#pantalla');
    boton.hidden = false;
    boton.addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else raiz.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
    });
    document.addEventListener('fullscreenchange', () => {
      boton.setAttribute('aria-label', document.fullscreenElement ? 'Salir de pantalla completa' : 'Pantalla completa');
    });
  }
  // la cámara se vuelve a encuadrar cuando cambia lo que tapa la pantalla
  const ro = new ResizeObserver(() => medirTaller());
  ro.observe($('#barra'));
  $$('.dock').forEach((d) => ro.observe(d));
  window.addEventListener('resize', medirTaller);
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
      const f = elige(['guagua', 'tradicional', 'guaguau', 'caballito', 'chanchito', 'gallinita'].filter((x) => x !== estado.f));
      $(`[data-molde="${f}"]`).click();
      return;
    }
    sorpresa(estado, taller).forEach((op) => { estado.o.push(op); taller.agregar(op, true); });
    taller.dibujar(); guardarBorrador(); actualizarEtiqueta();
  });
  $('#de-nuevo').addEventListener('click', () => {
    if ((estado.o.length || estado.a.length) && !confirm('¿Empezar una nueva desde la masa? Se borra la que estás haciendo.')) return;
    $('#d-info').close();
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
  Object.assign(estado, { a: MOLDES[molde](), f: molde, k: 0, o: [], id: null, n: elige(NOMBRES[molde]), p: '', m: '', l: 0 });
  historia = [];
  sincronizarControles();
  taller.cargar(estado);
  irA('amasar');
}
async function guardarMia(regalo) {
  if (!estado.id) estado.id = nuevoId();
  const item = { id: estado.id, t: 'mia', e: await codificar(receta()), f: Date.now() };
  if (regalo) item.g = regalo;
  guardarEnVitrina(item);
  guardarBorrador();
  pintarVitrina();
}
function sincronizarControles() {
  const marcar = (attr, v) => $$(`button[${attr}]`).forEach((b) => b.setAttribute('aria-pressed', String(b.getAttribute(attr) === String(v))));
  marcar('data-mano', estado.mano);
  marcar('data-grosor', estado.grosor);
  marcar('data-herramienta', estado.herramienta);
  marcar('data-boquilla', estado.boquilla);
  marcar('data-tamano', estado.tamano);
}


/* ─── regalar ──────────────────────────────────────────────── */
/* Compartir tiene que ocurrir en el mismo toque: Safari y Chrome solo dejan
   abrir la hoja de compartir (o WhatsApp en otra pestaña) si no se esperó
   antes a la red ni a renderizar. Por eso la tarjeta, el archivo y el enlace
   se preparan apenas cambia algo, y el botón solo usa lo que ya está listo. */
let preparado = null, turnoTarjeta = 0, reloj = null, relojNube = null;
let formato = almacen.leer('guagua:formato', 'historia');
const publicados = new Map();      // receta → id del regalo, para no publicar dos veces la misma
/* Con cuenta, el regalo se publica en /guaguas y el enlace es corto (#g=…).
   Sin cuenta, o si la nube falla, la receta va entera en el enlace (#r=…). */
async function enlaceDeRegalo(cod) {
  if (!nube.actual()) return { url: direccion() + '#r=' + cod, id: null };
  try {
    let id = publicados.get(cod);
    if (!id) { id = await nube.publicarRegalo(cod); publicados.set(cod, id); }
    return { url: direccion() + '#g=' + id, id };
  } catch (e) {
    avisa(nube.explicar(e), 'error');
    return { url: direccion() + '#r=' + cod, id: null };
  }
}
const mensajeDe = (t) => (t === 'm' ? (estado.f === 'guaguau' ? MENSAJE_GUAGUAU : elige(MENSAJES_MEMORIA)) : elige(MENSAJES));
const esDeCajon = (m) => MENSAJES.includes(m) || MENSAJES_MEMORIA.includes(m) || m === MENSAJE_GUAGUAU;
/* Regalar o dedicar cambia las etiquetas, el mensaje sugerido y los vales. */
function pintarTipo() {
  const m = estado.t === 'm';
  $$('button[data-tipo]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tipo === estado.t)));
  $$('button[data-vale]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.vale === estado.l)));
  $('#r-para-rotulo').textContent = m ? 'En memoria de' : 'Para';
  $('#r-para').placeholder = m ? 'Mi abuela Rosa, mi perrita Lobita' : 'Mi hermana, mi abuelo, la familia';
  $('#r-vale-campo').hidden = m;
  $('#r-vale-pista').textContent = VALES[estado.l] ? VALES[estado.l].pista : '';
  $('#r-compartir').lastChild.textContent = m ? ' Compartir en redes' : ' Compartir';
  $$('button[data-formato]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.formato === formato)));
}
async function abrirRegalo() {
  const v = veredicto(estado);
  $('#panadera-frase').textContent = v.frase;
  $('#panadera-nota').textContent = 'Nota de la panadera: ' + v.descuento;
  $('#r-nombre').value = estado.n;
  $('#r-para').value = estado.p;
  $('#r-de').value = estado.d || almacen.leer('guagua:firma', '');
  $('#r-mensaje').value = estado.m || mensajeDe(estado.t);
  pintarTipo();
  irPaso(1);
  window.malDS.abrir('#d-regalar');
}
/* Regalar va en tres pasos que caben en la pantalla sin desplazarse:
   para quién, unas palabras y la imagen para compartir. La imagen solo
   se dibuja al llegar al tercero. */
let paso = 1;
function irPaso(n) {
  paso = limita(n, 1, 3);
  $$('#d-regalar .regalar__paso').forEach((f) => { f.hidden = +f.dataset.paso !== paso; });
  $$('#d-regalar .pasos__punto').forEach((p, i) => p.setAttribute('aria-current', String(i + 1 === paso)));
  $('#r-atras').hidden = paso === 1;
  $('#r-siguiente').hidden = paso === 3;
  $('#d-regalar').classList.toggle('regalar--final', paso === 3);
  $('#d-regalar-t').textContent = ['', estado.t === 'm' ? 'Dedícala' : 'Regálala', 'Unas palabras', 'Compártela'][paso];
  if (paso === 3) refrescarTarjeta();
  else { const c = $(`#d-regalar .regalar__paso[data-paso="${paso}"] input, #d-regalar .regalar__paso[data-paso="${paso}"] textarea`); if (c && matchMedia('(hover:hover)').matches) c.focus(); }
}
function leerFormulario() {
  estado.n = $('#r-nombre').value.trim().slice(0, 40);
  estado.p = $('#r-para').value.trim().slice(0, 40);
  estado.d = $('#r-de').value.trim().slice(0, 40);
  estado.m = $('#r-mensaje').value.trim().slice(0, 160);
  if (estado.d) almacen.poner('guagua:firma', estado.d);
}
function botonesListos(listo) {
  ['#r-compartir', '#r-whatsapp', '#r-copiar', '#r-descargar'].forEach((b) => {
    $(b).disabled = !listo;
    $(b).setAttribute('aria-busy', String(!listo));
  });
}
async function refrescarTarjeta() {
  leerFormulario();
  const turno = ++turnoTarjeta;
  preparado = null; botonesListos(false);
  const r = receta();
  const cod = await codificar(r);
  const c = await tarjeta(r, formato);
  if (turno !== turnoTarjeta) return;
  $('#r-vista').src = c.toDataURL('image/jpeg', 0.85);
  $('#r-vista').width = c.width; $('#r-vista').height = c.height;
  const blob = await aBlob(c);
  if (turno !== turnoTarjeta) return;
  const nombre = 'guagua-' + (estado.n || 'de-pan').toLowerCase().replace(/[^a-z0-9áéíóúñü]+/gi, '-') + '-' + formato + '.png';
  const pr = { cod, blob, archivo: new File([blob], nombre, { type: 'image/png' }), nombre, url: direccion() + '#r=' + cod, id: null, texto: textoRegalo() };
  preparado = pr;
  guardarBorrador();
  botonesListos(true);
  enlaceCorto(pr);
}
/* Con cuenta, el enlace corto se publica en cuanto la tarjeta se queda
   quieta un momento; si no alcanza, se comparte el largo, que también sirve. */
function enlaceCorto(pr) {
  if (!nube.actual()) return;
  const ya = publicados.get(pr.cod);
  if (ya) { pr.id = ya; pr.url = direccion() + '#g=' + ya; return; }
  clearTimeout(relojNube);
  relojNube = setTimeout(async () => {
    try {
      const id = await nube.publicarRegalo(pr.cod);
      publicados.set(pr.cod, id);
      pr.id = id; pr.url = direccion() + '#g=' + id;
    } catch (e) { /* se queda el enlace largo */ }
  }, 1200);
}
const textoRegalo = (e = estado) => {
  const que = queEs(e) + ' de pan';
  if (enMemoria(e)) {
    return `Amasé ${que} en memoria de ${e.p || 'quienes ya no están'}. En Finados también se recuerda. ¿A quién recuerdas tú? Dedica la tuya:`;
  }
  const quien = e.d ? e.d + ' te regaló' : 'Te regalaron';
  const vale = VALES[e.l] ? ' ' + VALES[e.l].texto : '';
  return `${quien} ${que}${e.n ? ' que se llama ' + e.n : ''} por el Día de Difuntos.${vale} Ábrela aquí:`;
};
/* Copiar responde en el mismo botón («¡Copiado!») y con el toast. */
async function copiar(texto, boton) {
  const listo = () => {
    avisa('Enlace copiado. Pégalo donde quieras.', 'ok');
    if (!boton) return;
    const antes = boton.innerHTML;
    boton.classList.add('btn--ok');
    boton.innerHTML = '<svg class="icono" aria-hidden="true"><use href="#i-check"/></svg> ¡Copiado!';
    setTimeout(() => { boton.innerHTML = antes; boton.classList.remove('btn--ok'); }, 1800);
  };
  try { await navigator.clipboard.writeText(texto); listo(); }
  catch (e) {
    // sin permiso de portapapeles: un campo seleccionado para copiar a mano
    const t = document.createElement('textarea');
    t.value = texto; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;left:-9999px';
    (document.querySelector('dialog[open]') || document.body).appendChild(t);
    t.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e2) { /* nada */ }
    t.remove();
    if (ok) listo(); else prompt('Copia el enlace de tu guagua:', texto);
  }
}
function montarRegalo() {
  $$('#d-regalar input, #d-regalar textarea').forEach((x) => x.addEventListener('input', () => {
    preparado = null; botonesListos(false);
    clearTimeout(reloj);
    if (paso === 3) reloj = setTimeout(refrescarTarjeta, 350);
  }));
  $('#r-atras').addEventListener('click', () => irPaso(paso - 1));
  $('#r-siguiente').addEventListener('click', () => { leerFormulario(); irPaso(paso + 1); });
  $('#d-regalar').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && paso < 3) { e.preventDefault(); leerFormulario(); irPaso(paso + 1); }
  });
  $$('button[data-tipo]').forEach((b) => b.addEventListener('click', () => {
    if (estado.t === b.dataset.tipo) return;
    estado.t = b.dataset.tipo;
    const msg = $('#r-mensaje');
    if (!msg.value.trim() || esDeCajon(msg.value.trim())) msg.value = mensajeDe(estado.t);
    pintarTipo(); irPaso(paso);
  }));
  $$('button[data-vale]').forEach((b) => b.addEventListener('click', () => {
    estado.l = +b.dataset.vale;
    pintarTipo();
  }));
  $$('button[data-formato]').forEach((b) => b.addEventListener('click', () => {
    formato = b.dataset.formato;
    almacen.poner('guagua:formato', formato);
    pintarTipo(); refrescarTarjeta();
  }));
  // lo que pasa después de compartir no hace esperar a la hoja de compartir
  const despues = (pr) => { guardarMia(pr.id).catch(() => {}); };
  $('#r-entrar').addEventListener('click', () => abrirCuenta());
  $('#r-compartir').addEventListener('click', () => {
    const pr = preparado;
    if (!pr) return;
    const titulo = 'Una guagua de pan';
    let promesa = null;
    if (navigator.canShare && navigator.canShare({ files: [pr.archivo] })) {
      promesa = navigator.share({ files: [pr.archivo], title: titulo, text: pr.texto + ' ' + pr.url });
    } else if (navigator.share) {
      promesa = navigator.share({ title: titulo, text: pr.texto, url: pr.url });
    }
    if (!promesa) { copiar(pr.url); despues(pr); return; }
    promesa.then(() => despues(pr)).catch((e) => {
      if (e && e.name === 'AbortError') return;
      avisa('Este navegador no dejó compartir. Usa WhatsApp, copia el enlace o descarga la imagen.', 'error');
    });
  });
  $('#r-whatsapp').addEventListener('click', () => {
    const pr = preparado;
    if (!pr) return;
    window.open('https://wa.me/?text=' + encodeURIComponent(pr.texto + ' ' + pr.url), '_blank', 'noopener');
    despues(pr);
  });
  $('#r-copiar').addEventListener('click', () => {
    const pr = preparado;
    if (!pr) return;
    copiar(pr.url, $('#r-copiar')); despues(pr);
  });
  $('#r-descargar').addEventListener('click', () => {
    const pr = preparado;
    if (!pr) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(pr.blob);
    a.download = pr.nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    despues(pr);
  });
}

/* ══════════════════ LA VITRINA ══════════════════════════════ */
let pestana = 'mia', visorPieza = null, piezaActual = null;
const fecha = (t) => new Date(t).toLocaleDateString('es-EC', { day: 'numeric', month: 'short' });
let turnoVitrina = 0;
async function pintarVitrina(cual) {
  if (cual) pestana = cual;
  const turno = ++turnoVitrina;          // si llega otra pintada mientras se espera a la nube, gana la última
  $$('[data-vitrina]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.vitrina === pestana)));
  const rej = $('#vitrina-rej');
  const todas = await listaVitrina();
  if (turno !== turnoVitrina) return;
  const lista = todas.filter((x) => x.t === pestana);
  pintarCuentaEnVitrina();
  $('#cuenta-mia').textContent = todas.filter((x) => x.t === 'mia').length;
  $('#cuenta-recibida').textContent = todas.filter((x) => x.t === 'recibida').length;
  const hud = $('#cuenta-hud');
  hud.textContent = todas.length;
  hud.hidden = !todas.length;
  rej.textContent = '';
  $('#vitrina-vacia').hidden = !!lista.length;
  $('#vitrina-vacia').textContent = pestana === 'mia'
    ? 'Aquí se guardan las que haces. Todavía no hay ninguna.'
    : 'Aquí aparecen las que te regalan. Regala una: quizá te devuelvan el gesto.';
  for (const item of lista) {
    let e;
    try { e = await decodificar(item.e); } catch (err) { continue; }
    if (turno !== turnoVitrina) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pieza';
    const c = foto(e, 240, 300);
    c.className = 'pieza__img'; c.setAttribute('aria-hidden', 'true');
    const t = document.createElement('span'); t.className = 'pieza__nombre';
    t.textContent = nombreDe(e);
    const s = document.createElement('span'); s.className = 'pieza__meta';
    const para = e.p ? (enMemoria(e) ? 'en memoria de ' : 'para ') + e.p + ' · ' : '';
    s.textContent = item.t === 'recibida' ? (e.d ? 'de ' + e.d : 'regalada') + ' · ' + fecha(item.f) : para + fecha(item.f);
    b.append(c, t, s);
    b.addEventListener('click', () => abrirPieza(item, e));
    rej.appendChild(b);
  }
}
function abrirPieza(item, e) {
  piezaActual = { item, e };
  $('#p-titulo').textContent = nombreDe(e);
  const quien = [e.p && (enMemoria(e) ? 'En memoria de ' : 'Para ') + e.p, e.d && 'de ' + e.d].filter(Boolean).join(' · ');
  $('#p-quien').textContent = quien;
  $('#p-quien').hidden = !quien;
  $('#p-mensaje').textContent = e.m || '';
  $('#p-mensaje').hidden = !e.m;
  $('#p-editar').hidden = item.t !== 'mia';
  window.malDS.abrir('#d-pieza');
  if (!visorPieza) visorPieza = new Visor($('#p-lienzo'));
  visorPieza.giro = -0.25; Object.assign(visorPieza, posturaDe(e));
  visorPieza.cargar(e);
  visorPieza.medir();
}
function montarVitrina() {
  $$('[data-vitrina]').forEach((b) => b.addEventListener('click', () => pintarVitrina(b.dataset.vitrina)));
  $('#p-editar').addEventListener('click', () => {
    const { item, e } = piezaActual;
    Object.assign(estado, { f: e.f, a: e.a, k: e.k, o: e.o.slice(), n: e.n, p: e.p, d: e.d, m: e.m, t: e.t, l: e.l, id: item.id });
    historia = [];
    taller.cargar(estado);
    irA('decorar');
    $('#d-pieza').close();
    if ($('#d-vitrina').open) $('#d-vitrina').close();
  });
  $('#p-regalar').addEventListener('click', () => {
    const { item, e } = piezaActual;
    // sin esperar a la red: el enlace corto si ya existe, si no el largo
    const enlace = direccion() + (item.g ? '#g=' + item.g : '#r=' + item.e);
    if (navigator.share) {
      navigator.share({ title: 'Una guagua de pan', text: textoRegalo(e), url: enlace })
        .catch((err) => { if (!err || err.name !== 'AbortError') copiar(enlace, $('#p-regalar')); });
    } else copiar(enlace, $('#p-regalar'));
    if (!item.g && item.t === 'mia' && nube.actual()) {
      enlaceDeRegalo(item.e).then((r) => { if (r.id) { item.g = r.id; guardarEnVitrina(item); } });
    }
  });
  $('#p-borrar').addEventListener('click', () => {
    if (!confirm('¿Quitar esta guagua de la vitrina? No se puede deshacer.')) return;
    sacarDeVitrina(piezaActual.item.id);
    if (estado.id === piezaActual.item.id) estado.id = null;
    $('#d-pieza').close();
    pintarVitrina();
  });
}

/* ══════════════════ CUANDO TE LLEGA UNA ═════════════════════ */
let recibida = null, visorRegalo = null, mordidas = 0;
async function recibir(cod, regalo) {
  let e;
  try { e = await decodificar(cod); }
  catch (err) { avisa('No se pudo abrir esta guagua. Pide que te la envíen otra vez.', 'error'); return; }
  recibida = e; mordidas = 0;
  document.body.classList.add('modo-regalo');
  $('#regalo').hidden = false;
  const memoria = enMemoria(e), vale = memoria ? null : VALES[e.l];
  const que = queEs(e);
  $('#regalo-kicker').textContent = memoria ? 'Una guagua para recordar' : 'Te llegó una guagua';
  $('#regalo-titulo').textContent = memoria
    ? `${e.d ? e.d + ' amasó ' + que : que.charAt(0).toUpperCase() + que.slice(1)} en memoria de ${e.p || 'quienes ya no están'}`
    : e.d ? `${e.d} te regaló ${que}` : `Te regalaron ${que}`;
  $('#regalo-nombre').textContent = '«' + nombreDe(e) + '»';
  $('#regalo-para').textContent = !memoria && e.p ? 'Para ' + e.p : '';
  $('#regalo-para').hidden = memoria || !e.p;
  $('#regalo-mensaje').textContent = e.m || '';
  $('#regalo-mensaje').hidden = !e.m;
  $('#regalo-vale').hidden = !vale;
  if (vale) {
    $('#regalo-vale-t').textContent = vale.titulo;
    $('#regalo-vale-d').textContent = vale.detalle;
    $('#regalo-cobrar').hidden = !vale.boton;
    $('#regalo-cobrar-t').textContent = vale.boton || '';
  }
  $('#regalo-pista').textContent = memoria
    ? 'En Finados se comparte el pan con los que recordamos. Tócala para darle un mordisco.'
    : 'Gírala con dos dedos. Tócala para darle un mordisco.';
  $('#regalo-devolver-t').textContent = memoria ? 'Dedica una tú también' : e.l === 3 ? 'Pasarla a alguien más' : 'Amasar una de vuelta';
  $('#regalo-devolver').classList.toggle('latido', e.l === 3);
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
          pista.textContent = enMemoria(recibida) ? 'Se acabó. ¿A quién recuerdas tú? Dedícale una.' : 'Se acabó. Ahora te toca amasar una para alguien más.';
          $('#regalo-devolver').classList.add('latido');
        } else if (mordidas === 1) pista.textContent = 'Crocante por fuera, suave por dentro.';
        else if (mordidas === 4) pista.textContent = 'Va por la mitad. Con colada morada sabría mejor.';
        else if (mordidas === 6) pista.textContent = 'Guarda un poco para compartir.';
        return true;
      },
    });
  }
  visorRegalo.giro = -0.25; Object.assign(visorRegalo, posturaDe(e));
  visorRegalo.ambiente('decorar');
  visorRegalo.cargar(e);
  visorRegalo.medir();
  const medirRegalo = () => { visorRegalo.margen = margenes($('#regalo-lienzo'), null, $('#regalo-tarjeta')); visorRegalo.dibujar(); };
  requestAnimationFrame(medirRegalo);
  if (!visorRegalo._observa) { visorRegalo._observa = new ResizeObserver(medirRegalo); visorRegalo._observa.observe($('#regalo-tarjeta')); }
  const item = { id: nuevoId(), t: 'recibida', e: cod, f: Date.now() };
  if (regalo) item.g = regalo;
  guardarEnVitrina(item);
  pintarVitrina('recibida');
}
function montarRecibir() {
  $('#regalo-devolver').addEventListener('click', () => {
    const e = recibida || {};
    // a quien te la regaló se la devuelves; una dedicada o una que se pasa, a alguien más
    const para = !enMemoria(e) && e.l !== 3 ? e.d : '';
    cerrarRegalo();
    nueva(e.f === 'guaguau' ? 'guaguau' : 'guagua');
    estado.p = para || '';
    estado.t = enMemoria(e) ? 'm' : '';
    guardarBorrador();
    avisa(enMemoria(e) ? '¿A quién quieres recordar? Amasa su guagua.'
      : para ? `Amasa una para ${para}.` : e.l === 3 ? 'Amasa una para alguien más y que siga la cadena.' : 'Amasa la tuya.', 'ok');
  });
  $('#regalo-cobrar').addEventListener('click', () => {
    const vale = recibida && VALES[recibida.l];
    if (!vale || !vale.cobrar) return;
    window.open('https://wa.me/?text=' + encodeURIComponent(vale.cobrar(recibida.d)), '_blank', 'noopener');
  });
  $('#regalo-taller').addEventListener('click', cerrarRegalo);
}
function cerrarRegalo() {
  document.body.classList.remove('modo-regalo');
  $('#regalo').hidden = true;
  history.replaceState(null, '', location.pathname + location.search);
  taller.medir();
  medirTaller();
}

/* ─── arranque ─────────────────────────────────────────────── */
function arrancar() {
  $('#cuenta').textContent = rotuloFinados();
  if (!montarTaller()) return;
  montarRegalo(); montarVitrina(); montarRecibir(); montarAsas();
  // el DS cierra el diálogo si el clic cae fuera de su caja; como los pasos
  // cambian su tamaño en el mismo clic, lo de adentro no le llega
  $$('dialog.modal > *').forEach((x) => x.addEventListener('click', (e) => e.stopPropagation()));
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
  if (!location.hash && !almacen.leer('guagua:visto', false)) {
    almacen.poner('guagua:visto', true);
    window.malDS.abrir('#d-info');
  }
  const arranqueNube = nube.iniciar().then((hay) => {
    if (hay) nube.alCambiar(alCambiarCuenta);
    return hay;
  });
  const leerHash = async () => {
    const largo = location.hash.match(/^#r=([zj][A-Za-z0-9_-]+)$/);
    if (largo) { recibir(largo[1]); return; }
    const corto = location.hash.match(/^#g=([A-Za-z0-9]{10,40})$/);
    if (!corto) return;
    if (!(await arranqueNube)) { avisa('Para abrir este regalo hace falta conexión con la nube.', 'error'); return; }
    try {
      const cod = await nube.leerRegalo(corto[1]);
      if (cod) recibir(cod, corto[1]);
      else avisa('Esta guagua ya no está disponible. Pide que te la envíen otra vez.', 'error');
    } catch (e) { avisa(nube.explicar(e), 'error'); }
  };
  // un enlace por encargo (?molde=…&para=…): se amasa aquí mismo y se abre como regalo
  const encargo = new URLSearchParams(location.search);
  if (encargo.has('molde') || encargo.has('para') || encargo.has('dedicada')) {
    const args = Object.fromEntries(encargo.entries());
    codificar(amasarReceta(args)).then((cod) => {
      const limpia = new URLSearchParams(location.search);
      ['molde', 'nombre', 'para', 'de', 'mensaje', 'dedicada', 'vale', 'coccion', 'decoracion', 'colores', 'semilla'].forEach((k) => limpia.delete(k));
      const q = limpia.toString();
      history.replaceState(null, '', location.pathname + (q ? '?' + q : '') + '#r=' + cod);
      leerHash();
    });
  } else leerHash();
  window.addEventListener('hashchange', leerHash);
  montarCuenta();
}

/* ══════════════════ LA CUENTA ═══════════════════════════════
   Entrar es opcional: sin cuenta todo funciona en este navegador. Con
   cuenta, la vitrina se guarda en la nube y los regalos llevan enlace corto. */
let modoCuenta = 'entrar';
function abrirCuenta() {
  $('#c-error').textContent = '';
  window.malDS.abrir('#d-cuenta');
}
function pintarCuentaEnVitrina() {
  const u = nube.actual();
  $('#v-cuenta').hidden = !nube.disponible();
  $('#v-cuenta-texto').textContent = u
    ? `Tu vitrina se guarda en tu cuenta (${u.nombre || u.correo}).`
    : 'Entra con tu cuenta para guardar tu vitrina en la nube y verla en cualquier teléfono.';
  $('#v-cuenta-boton').textContent = u ? 'Tu cuenta' : 'Entrar';
  $('#vitrina-nota').textContent = u
    ? 'Tu vitrina se guarda en tu cuenta: la ves en cualquier teléfono donde entres. Los regalos se abren con su enlace corto.'
    : 'Sin cuenta, la vitrina vive solo en este navegador y los regalos viajan enteros dentro del enlace.';
  $('#r-entrar-fila').hidden = !nube.disponible() || !!u;
}
async function alCambiarCuenta(u) {
  $('#cuenta-fuera').hidden = !!u;
  $('#cuenta-dentro').hidden = !u;
  if (u) {
    $('#c-nombre').textContent = u.nombre || u.correo;
    $('#c-correo').textContent = u.nombre ? u.correo : '';
    // lo que estaba guardado solo en este navegador sube a la cuenta, una sola vez
    const clave = 'guagua:subidas:' + u.uid;
    const subidas = new Set(almacen.leer(clave, []));
    const pendientes = vitrina().filter((x) => !subidas.has(x.id));
    for (const item of pendientes) {
      try { await nube.guardar(item); subidas.add(item.id); } catch (e) { break; }
    }
    almacen.poner(clave, [...subidas]);
    if (pendientes.length) avisa('Tus guaguas de este navegador ya están en tu cuenta.', 'ok');
  }
  pintarCuentaEnVitrina();
  pintarVitrina();
}
function montarCuenta() {
  const error = (e) => { $('#c-error').textContent = typeof e === 'string' ? e : nube.explicar(e); };
  const ocupado = (si) => $$('#d-cuenta button, #d-cuenta input').forEach((x) => { x.disabled = si; });
  const intentar = async (fn) => {
    error('');
    ocupado(true);
    try { await fn(); } catch (e) { error(e); } finally { ocupado(false); }
  };
  const ponerModo = (m) => {
    modoCuenta = m;
    $('#c-campo-nombre').hidden = m !== 'crear';
    $('#c-enviar').textContent = m === 'crear' ? 'Crear la cuenta' : 'Entrar';
    $('#c-cambiar').textContent = m === 'crear' ? 'Ya tengo cuenta' : 'Crear una cuenta';
    $('#c-clave').autocomplete = m === 'crear' ? 'new-password' : 'current-password';
    error('');
  };
  $('#v-cuenta-boton').addEventListener('click', abrirCuenta);
  $('#c-cambiar').addEventListener('click', () => ponerModo(modoCuenta === 'crear' ? 'entrar' : 'crear'));
  $('#c-google').addEventListener('click', () => intentar(async () => {
    await nube.entrarConGoogle();
    $('#d-cuenta').close();
    avisa('Listo, entraste con Google.', 'ok');
  }));
  $('#c-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const correo = $('#c-correo-in').value.trim(), clave = $('#c-clave').value;
    intentar(async () => {
      if (modoCuenta === 'crear') await nube.crearCuenta(correo, clave, $('#c-nombre-in').value.trim().slice(0, 40));
      else await nube.entrarConCorreo(correo, clave);
      $('#c-clave').value = '';
      $('#d-cuenta').close();
      avisa(modoCuenta === 'crear' ? 'Tu cuenta está lista.' : 'Listo, entraste.', 'ok');
    });
  });
  $('#c-olvido').addEventListener('click', () => {
    const correo = $('#c-correo-in').value.trim();
    if (!correo) { error('Escribe tu correo y te enviamos un enlace para cambiar la contraseña.'); return; }
    intentar(async () => {
      await nube.recuperarClave(correo);
      error('Te enviamos un correo para cambiar la contraseña.');
    });
  });
  $('#c-salir').addEventListener('click', () => intentar(async () => {
    await nube.salir();
    $('#d-cuenta').close();
    avisa('Saliste de tu cuenta. La vitrina de este navegador sigue aquí.', 'ok');
  }));
  ponerModo('entrar');
}

window.guagua = {
  tarjeta, foto, codificar, decodificar, veredicto, receta, estado, MOLDES, sorpresa: () => sorpresa(estado, taller),
  irA, prenderHorno, sacarDelHorno, aDecorar, get taller() { return taller; },
};
arrancar();
