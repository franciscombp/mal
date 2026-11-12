// Fran en 3D: el Fran de papel, ahora de bulto, anda suelto por un mundo que se genera solo:
// lomas blandas, cúpulas y arcos de membrana con agujeros redondos (la luz de "Her" entrando
// por la tela) y, en espiral desde el centro, once vainas de luz: las piezas del portafolio.
// ↑ ↓ / W S caminar, ← → / A D girar, Mayús correr, E / Enter abrir, 1–7 salas,
// arrastrar para mirar alrededor, tocar el suelo para ir caminando hasta ahí.
import * as THREE from "three";

const $ = (s) => document.querySelector(s);
const piezas = [...document.querySelectorAll("#piezas article")];
const MOVIL = matchMedia("(max-width: 640px)").matches;
const TACTIL = matchMedia("(pointer: coarse)").matches;
const QUIETO = matchMedia("(prefers-reduced-motion: reduce)").matches;
const PALETA = ["#ff9a76", "#ffb98f", "#f7d39a", "#f59a8a", "#ffc4a6", "#f2a07b", "#ffd7b5", "#f08a6e"];
const TONO_SALA = { "Quién": "#ffb08a", "Trabajo": "#ff8f70", "Escritura": "#f7cf8f", "Proyectos": "#ffa07a", "Mentoría": "#f6b3a0", "Sistema": "#ffc79a", "Fin": "#ffe0b8" };
const salas = [...new Set(piezas.map((a) => a.dataset.sala))];
const BORDE = 92; // radio del mundo: más allá, la niebla y un empujón suave de vuelta

// ── azar con semilla: el mundo es el mismo cada vez, pero nadie lo dibujó a mano ──
function azar(semilla) { return () => { semilla |= 0; semilla = semilla + 0x6d2b79f5 | 0; let t = Math.imul(semilla ^ semilla >>> 15, 1 | semilla); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rnd = azar(2026);
const h2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const suave = (t) => t * t * (3 - 2 * t);
function ruido(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = suave(x - ix), fy = suave(y - iy);
  const a = h2(ix, iy), b = h2(ix + 1, iy), c = h2(ix, iy + 1), d = h2(ix + 1, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
// las piezas, en espiral desde el centro; el terreno se aplana alrededor de cada una
piezas.forEach((a, i) => {
  const ang = .5 + i * 1.12, r = 7 + i * 5.6;
  a.px = Math.cos(ang) * r; a.pz = -Math.sin(ang) * r; a.color = PALETA[i % PALETA.length];
});
function altura(x, z) {
  const h = (ruido(x * .045, z * .045) - .5) * 5 + (ruido(x * .11 + 7, z * .11 - 3) - .5) * 1.6;
  let llano = Math.min(1, Math.hypot(x, z) / 9);
  for (const a of piezas) llano = Math.min(llano, Math.min(1, Math.hypot(x - a.px, z - a.pz) / 7));
  return h * suave(llano) + Math.max(0, Math.hypot(x, z) - BORDE + 12) * .35;
}

let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: $("#escena"), antialias: !MOVIL, powerPreference: "high-performance" }); } catch (e) { renderer = null; }
if (!renderer) document.body.classList.add("sin-3d"); else arrancar();

function arrancar() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, MOVIL ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const FONDO = new THREE.Color("#1d0c0a");
  const NIEBLA = new THREE.Color("#4a1d16");
  const DENS = MOVIL ? .03 : .024;
  const escena = new THREE.Scene();
  escena.background = FONDO;
  escena.fog = new THREE.FogExp2(NIEBLA, DENS);
  const camara = new THREE.PerspectiveCamera(MOVIL ? 58 : 48, 1, .1, 400);

  escena.add(new THREE.HemisphereLight("#ffd9c2", "#2a0f0b", 1.15));
  const contra = new THREE.DirectionalLight("#ffb48a", 2.2); contra.position.set(-30, 40, -60); escena.add(contra);
  const frente = new THREE.DirectionalLight("#ffe6d4", .8); frente.position.set(20, 30, 40); escena.add(frente);
  const farol = new THREE.PointLight("#ffa27c", 6, 9, 1.6); escena.add(farol);

  const RUIDO = /* glsl */`
    vec3 h3(vec3 p){ p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6))); return fract(sin(p) * 43758.5453); }
    float celda(vec3 p){ vec3 i = floor(p), f = fract(p); float d = 1.;
      for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
        vec3 g = vec3(x, y, z); d = min(d, length(g + h3(i + g) * .7 + .15 - f)); }
      return d; }`;
  const NIEBLA_GLSL = /* glsl */`
    uniform vec3 uNiebla; uniform float uDens;
    vec3 niebla(vec3 c, vec3 w, float k){ float d = length(w - cameraPosition) * k; return mix(c, uNiebla, 1. - exp(-uDens * uDens * d * d)); }`;
  const relojes = [];

  // ── la tela: cualquier forma, con agujeros redondos y bordes que brillan ──
  function membrana(geo, { frec = .3, hueco = .3, opac = .45, a = "#7a2a20", b = "#f2a07f", semilla = 0, lejos = 1, alto = 12 }) {
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uT: { value: 0 }, uA: { value: new THREE.Color(a) }, uB: { value: new THREE.Color(b) }, uNiebla: { value: NIEBLA }, uDens: { value: DENS } },
      vertexShader: /* glsl */`varying vec3 vW; varying vec3 vN;
        void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */`uniform vec3 uA, uB; uniform float uT; varying vec3 vW; varying vec3 vN;
        ${RUIDO}
        ${NIEBLA_GLSL}
        void main(){
          float c = celda(vW * ${frec.toFixed(3)} + vec3(${semilla.toFixed(2)}, uT * .02, uT * .012));
          float tela = smoothstep(${hueco.toFixed(3)}, ${(hueco + .05).toFixed(3)}, c);
          if (tela < .01) discard;
          vec3 v = normalize(cameraPosition - vW);
          float borde = pow(1. - abs(dot(normalize(vN), v)), 2.2);
          float canto = 1. - smoothstep(${hueco.toFixed(3)}, ${(hueco + .16).toFixed(3)}, c);
          vec3 col = mix(uA, uB, clamp(vW.y / ${alto.toFixed(1)}, 0., 1.));
          col += vec3(1., .82, .66) * canto * .55 + uB * borde * .4;
          gl_FragColor = vec4(niebla(col, vW, ${lejos.toFixed(2)}), tela * (${opac.toFixed(2)} + canto * .35 + borde * .25));
        }`,
    });
    relojes.push(m);
    const malla = new THREE.Mesh(geo, m);
    escena.add(malla);
    return malla;
  }
  const cerca = (x, z, d) => Math.hypot(x, z) < d || piezas.some((a) => Math.hypot(x - a.px, z - a.pz) < d);

  // el cielo: una cúpula enorme de tela, con la luz del otro lado
  membrana(new THREE.SphereGeometry(150, MOVIL ? 64 : 96, 40, 0, Math.PI * 2, 0, Math.PI * .55), { frec: .045, hueco: .27, opac: .55, a: "#5a1d17", b: "#c8604a", semilla: 3, lejos: .38, alto: 150 });

  // cúpulas y arcos sembrados al azar, lejos de las vainas para no tapar el camino
  const CUPULAS = MOVIL ? 12 : 22, ARCOS = MOVIL ? 6 : 11;
  for (let n = 0, intentos = 0; n < CUPULAS && intentos < 400; intentos++) {
    const ang = rnd() * Math.PI * 2, r = 14 + rnd() * (BORDE - 18), x = Math.cos(ang) * r, z = Math.sin(ang) * r;
    const radio = 5 + rnd() * 11;
    if (cerca(x, z, radio * .7 + 4)) continue;
    const g = new THREE.SphereGeometry(radio, MOVIL ? 40 : 56, 24, 0, Math.PI * 2, 0, Math.PI * (.42 + rnd() * .2));
    const c = membrana(g, { frec: .2 + rnd() * .25, hueco: .25 + rnd() * .08, opac: .35 + rnd() * .2, semilla: rnd() * 20, b: PALETA[n % PALETA.length], alto: radio });
    c.position.set(x, altura(x, z) - radio * .25, z); c.scale.y = .7 + rnd() * .6; c.rotation.y = rnd() * 6;
    n++;
  }
  for (let n = 0, intentos = 0; n < ARCOS && intentos < 400; intentos++) {
    const ang = rnd() * Math.PI * 2, r = 10 + rnd() * (BORDE - 16), x = Math.cos(ang) * r, z = Math.sin(ang) * r;
    if (cerca(x, z, 5)) continue;
    const radio = 4 + rnd() * 5;
    const c = membrana(new THREE.TorusGeometry(radio, .9 + rnd() * 1.4, 24, MOVIL ? 56 : 80, Math.PI), { frec: .45, hueco: .3, opac: .5, semilla: rnd() * 20, b: PALETA[(n + 3) % PALETA.length], alto: radio * 2 });
    c.position.set(x, altura(x, z) - .6, z); c.rotation.y = rnd() * Math.PI;
    n++;
  }

  // ── resplandores ──
  function textura() {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const x = c.getContext("2d"); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.35, "rgba(255,255,255,.35)"); g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const BRILLO = textura();
  const brillo = (color, escala, opac = 1) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: BRILLO, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: opac, fog: false }));
    s.scale.setScalar(escala); escena.add(s); return s;
  };
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; brillo(PALETA[i % PALETA.length], 60 + rnd() * 50, .5).position.set(Math.cos(a) * 170, 30 + rnd() * 70, Math.sin(a) * 170); }
  brillo("#ffe2c0", 120, .8).position.set(0, 175, -40);

  // ── el suelo: lomas oscuras, charcos de luz bajo cada vaina y la sombra de Fran ──
  const N = piezas.length;
  const LADO = 2 * (BORDE + 30), SEG = MOVIL ? 120 : 200;
  const sueloGeo = new THREE.PlaneGeometry(LADO, LADO, SEG, SEG); sueloGeo.rotateX(-Math.PI / 2);
  const pp = sueloGeo.attributes.position;
  for (let i = 0; i < pp.count; i++) pp.setY(i, altura(pp.getX(i), pp.getZ(i)));
  sueloGeo.computeVertexNormals();
  const suelo = new THREE.ShaderMaterial({
    uniforms: {
      uBase: { value: new THREE.Color("#3a1813") }, uAlto: { value: new THREE.Color("#8a3a2c") }, uFran: { value: new THREE.Vector2() }, uLuz: { value: new THREE.Color("#ffa27c") },
      uP: { value: piezas.map((a) => new THREE.Vector2(a.px, a.pz)) }, uC: { value: piezas.map((a) => new THREE.Color(a.color)) },
      uNiebla: { value: NIEBLA }, uDens: { value: DENS },
    },
    vertexShader: /* glsl */`varying vec3 vW; varying vec3 vN; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normal; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform vec3 uBase, uAlto, uLuz; uniform vec2 uFran; uniform vec2 uP[${N}]; uniform vec3 uC[${N}];
      varying vec3 vW; varying vec3 vN;
      ${NIEBLA_GLSL}
      void main(){
        float luz = clamp(dot(normalize(vN), normalize(vec3(-.3, .8, -.5))), 0., 1.);
        vec3 c = mix(uBase * .55, uAlto, luz * .6 + clamp(vW.y * .08, 0., .3));
        for (int i = 0; i < ${N}; i++) { vec2 e = vW.xz - uP[i]; c += uC[i] * .6 * exp(-dot(e, e) * .12); }
        vec2 d = vW.xz - uFran;
        c += uLuz * .18 * exp(-dot(d, d) * .15);
        c *= 1. - .6 * exp(-dot(d, d) * 10.);
        gl_FragColor = vec4(niebla(c, vW, 1.), 1.);
      }`,
  });
  const piso = new THREE.Mesh(sueloGeo, suelo);
  escena.add(piso);

  // piedras blandas: guijarros redondos, instanciados
  const PIEDRAS = MOVIL ? 90 : 220;
  const piedras = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: .55 }), PIEDRAS);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3(), eje = new THREE.Vector3(0, 1, 0);
  let nPiedras = 0;
  for (let i = 0; nPiedras < PIEDRAS && i < 3000; i++) {
    const x = (rnd() * 2 - 1) * BORDE, z = (rnd() * 2 - 1) * BORDE;
    if (Math.hypot(x, z) > BORDE || cerca(x, z, 3.5)) continue;
    const r = .25 + rnd() ** 3 * 1.6;
    s3.set(r * (1 + rnd() * .6), r * (.45 + rnd() * .3), r * (1 + rnd() * .6)); q.setFromAxisAngle(eje, rnd() * 6);
    m4.compose(p3.set(x, altura(x, z), z), q, s3); piedras.setMatrixAt(nPiedras, m4);
    piedras.setColorAt(nPiedras, new THREE.Color(PALETA[nPiedras % PALETA.length]).multiplyScalar(.45 + rnd() * .3));
    nPiedras++;
  }
  piedras.count = nPiedras;
  escena.add(piedras);

  // ── las vainas: una por pieza, con una columna de luz que se ve desde lejos ──
  const vainaGeo = new THREE.IcosahedronGeometry(.7, 5);
  const columnaGeo = new THREE.CylinderGeometry(.35, 1.1, 34, 20, 1, true); columnaGeo.translate(0, 17, 0);
  const vainas = piezas.map((a, i) => {
    const y0 = altura(a.px, a.pz);
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uC: { value: new THREE.Color(a.color) }, uFuerza: { value: .6 } },
      vertexShader: /* glsl */`varying vec3 vN; varying vec3 vV; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */`uniform vec3 uC; uniform float uFuerza; varying vec3 vN; varying vec3 vV;
        void main(){ float f = pow(1. - max(dot(normalize(vN), vV), 0.), 1.8);
          vec3 c = mix(uC * .55, vec3(1., .93, .84), f); gl_FragColor = vec4(c * (.7 + uFuerza), .35 + f * .6); }`,
    });
    const v = new THREE.Mesh(vainaGeo, m);
    v.position.set(a.px, y0 + 1.8, a.pz); v.scale.set(1, 1.25, 1);
    escena.add(v);
    const colM = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uC: { value: new THREE.Color(a.color) }, uO: { value: .5 } },
      vertexShader: /* glsl */`varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY = position.y / 34.; vec4 w = modelMatrix * vec4(position, 1.); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */`uniform vec3 uC; uniform float uO; varying float vY; varying vec3 vN; varying vec3 vV;
        void main(){ float f = pow(abs(dot(normalize(vN), vV)), 2.); gl_FragColor = vec4(uC * f * (1. - vY) * (1. - vY) * uO, 1.); }`,
    });
    const col = new THREE.Mesh(columnaGeo, colM);
    col.position.set(a.px, y0, a.pz);
    escena.add(col);
    const halo = brillo(a.color, 4.5, .55); halo.position.copy(v.position);
    return { v, m, colM, halo, y0, fase: i * 1.7, vista: false };
  });

  // ── polvo ──
  const CUANTOS = MOVIL ? 500 : 1400;
  const pos = new Float32Array(CUANTOS * 3);
  for (let i = 0; i < CUANTOS; i++) { const x = (rnd() * 2 - 1) * BORDE, z = (rnd() * 2 - 1) * BORDE; pos[i * 3] = x; pos[i * 3 + 1] = altura(x, z) + rnd() * 9; pos[i * 3 + 2] = z; }
  const polvoGeo = new THREE.BufferGeometry(); polvoGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  escena.add(new THREE.Points(polvoGeo, new THREE.PointsMaterial({ map: BRILLO, color: "#ffd2b0", size: .12, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .8 })));

  // ── Fran, de bulto: los mismos colores que el de papel (papel.css) ──
  const mat = (color, rugoso = .75) => new THREE.MeshStandardMaterial({ color, roughness: rugoso, metalness: 0 });
  const PIEL = mat("#be8a69", .6), PELO = mat("#1d1b19", .9), SUETER = mat("#8e8b85", .95), CAMISETA = mat("#b8473a", .8),
    PANTALON = mat("#2e2c29", .85), ZAPATO = mat("#1d1b19", .6), SUELA = mat("#ece7dd", .7), GAFAS = new THREE.MeshStandardMaterial({ color: "#d9b25a", roughness: .3, metalness: .7 }),
    OJO = mat("#1a1210", .3), RUBOR = new THREE.MeshStandardMaterial({ color: "#e8917f", roughness: .8, transparent: true, opacity: .55 });
  const pieza = (geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); return o; };
  const fran = new THREE.Group();
  const cuerpo = new THREE.Group(); fran.add(cuerpo);
  const piernas = [-1, 1].map((l) => {
    const p = new THREE.Group(); p.position.set(l * .12, .86, 0);
    p.add(pieza(new THREE.CapsuleGeometry(.105, .52, 6, 14), PANTALON, 0, -.4, 0));
    const zap = pieza(new THREE.SphereGeometry(.13, 18, 12), ZAPATO, 0, -.79, .05); zap.scale.set(.95, .55, 1.45); p.add(zap);
    const sue = pieza(new THREE.SphereGeometry(.13, 18, 8, 0, Math.PI * 2, Math.PI * .55, Math.PI * .45), SUELA, 0, -.8, .05); sue.scale.set(1, .6, 1.5); p.add(sue);
    cuerpo.add(p); return p;
  });
  const torso = pieza(new THREE.CapsuleGeometry(.29, .42, 8, 20), SUETER, 0, 1.22, 0); torso.scale.set(1, 1, .78); cuerpo.add(torso);
  const cuello = pieza(new THREE.TorusGeometry(.12, .045, 10, 24), CAMISETA, 0, 1.6, .01); cuello.rotation.x = Math.PI / 2; cuerpo.add(cuello);
  const brazos = [-1, 1].map((l) => {
    const b = new THREE.Group(); b.position.set(l * .34, 1.47, 0); b.rotation.z = l * .1;
    b.add(pieza(new THREE.CapsuleGeometry(.08, .44, 6, 12), SUETER, 0, -.27, 0));
    b.add(pieza(new THREE.SphereGeometry(.075, 14, 10), PIEL, 0, -.56, 0));
    cuerpo.add(b); return b;
  });
  const cabeza = new THREE.Group(); cabeza.position.set(0, 1.86, 0); cuerpo.add(cabeza);
  cabeza.add(pieza(new THREE.CapsuleGeometry(.055, .08, 4, 10), PIEL, 0, -.2, 0));
  const craneo = pieza(new THREE.SphereGeometry(.26, 32, 22), PIEL); craneo.scale.set(1, 1.06, .98); cabeza.add(craneo);
  const pelo = pieza(new THREE.SphereGeometry(.275, 32, 16, 0, Math.PI * 2, 0, Math.PI * .5), PELO, 0, .03, -.02);
  pelo.rotation.x = -.38; pelo.scale.set(1.02, 1.05, 1.04); cabeza.add(pelo);
  const copete = pieza(new THREE.SphereGeometry(.15, 18, 12), PELO, .04, .22, .05); copete.scale.set(1.3, .5, .9); cabeza.add(copete);
  for (const l of [-1, 1]) {
    cabeza.add(pieza(new THREE.SphereGeometry(.035, 12, 10), OJO, l * .095, .02, .235));
    cabeza.add(pieza(new THREE.TorusGeometry(.078, .013, 8, 28), GAFAS, l * .1, .02, .255));
    const r = pieza(new THREE.SphereGeometry(.05, 12, 10), RUBOR, l * .15, -.07, .21); r.scale.set(1, .6, .4); cabeza.add(r);
    cabeza.add(pieza(new THREE.SphereGeometry(.05, 10, 8), PIEL, l * .26, -.01, 0));
  }
  const puente = pieza(new THREE.CylinderGeometry(.01, .01, .05, 6), GAFAS, 0, .03, .262); puente.rotation.z = Math.PI / 2; cabeza.add(puente);
  const nariz = pieza(new THREE.SphereGeometry(.04, 12, 10), PIEL, 0, -.04, .26); nariz.scale.set(1, 1, .8); cabeza.add(nariz);
  const boca = pieza(new THREE.TorusGeometry(.045, .01, 6, 16, Math.PI), mat("#5a2a22"), 0, -.12, .235); boca.rotation.z = Math.PI; cabeza.add(boca);
  escena.add(fran);
  const aura = brillo("#ffb48a", 3.6, .28);
  // la luciérnaga: va un poco por delante, hacia la próxima pieza que no has abierto
  const guia = brillo("#fff0dc", 1.1, 1), guiaHalo = brillo("#ffb48a", 3, .4);

  // ── estado ──
  const teclas = new Set();
  let x = 0, z = 0, rumbo = Math.atan2(piezas[0].px, piezas[0].pz), vel = 0, paso = 0, objetivo = null, abrirAlLlegar = -1, cercana = -1, enCurso = false;
  let mirar = 0, inclina = 0, arrastre = null, ultimoArrastre = -1e9;
  const guiaPos = new THREE.Vector3(0, 2, 0);

  // ── interfaz ──
  const hoja = $("#hoja"), globo = $("#globo"), portada = $("#portada"), pista = $("#pista");
  pista.textContent = TACTIL ? "Toca el suelo para caminar · arrastra para mirar · toca una luz para abrirla"
    : "↑ ↓ caminar · ← → girar · Mayús correr · E abrir · arrastra para mirar";
  const listaSalas = $("#salas");
  salas.forEach((s, i) => {
    const li = document.createElement("li"); const b = document.createElement("button");
    b.type = "button"; b.textContent = s; b.dataset.sala = s; b.title = `${s} (${i + 1})`;
    b.addEventListener("click", () => irASala(i)); li.append(b); listaSalas.append(li);
  });
  const botonesSala = [...listaSalas.querySelectorAll("button")];
  let abierta = -1;
  function abrir(i) {
    abierta = i; const a = piezas[i]; vainas[i].vista = true;
    $("#hoja-sala").textContent = a.dataset.sala;
    const c = $("#hoja-cuerpo"); c.innerHTML = a.innerHTML;
    const h = c.querySelector("h2"); if (h) h.id = "hoja-t";
    $("#hoja-n").textContent = `${i + 1} de ${piezas.length}`;
    $("#ant").disabled = i === 0; $("#sig").disabled = i === piezas.length - 1;
    if (!hoja.open) hoja.showModal();
    hoja.scrollTop = 0;
    history.replaceState(null, "", "#" + a.id);
    tono(a.dataset.sala);
  }
  const cerrar = () => { if (hoja.open) hoja.close(); };
  hoja.addEventListener("close", () => { abierta = -1; history.replaceState(null, "", location.pathname + location.search); });
  hoja.addEventListener("click", (e) => { if (e.target === hoja) cerrar(); });
  $("#cerrar").addEventListener("click", cerrar);
  // caminar hasta quedar frente a una pieza (sin chocar con ella)
  const irA = (i, yAbrir = false) => {
    const a = piezas[i], d = Math.hypot(a.px - x, a.pz - z) || 1;
    objetivo = { x: a.px - (a.px - x) / d * 1.9, z: a.pz - (a.pz - z) / d * 1.9 }; abrirAlLlegar = yAbrir ? i : -1;
  };
  $("#ant").addEventListener("click", () => { if (abierta > 0) { irA(abierta - 1); abrir(abierta - 1); } });
  $("#sig").addEventListener("click", () => { if (abierta < piezas.length - 1) { irA(abierta + 1); abrir(abierta + 1); } });
  globo.addEventListener("click", () => { if (cercana >= 0) abrir(cercana); });
  function irASala(i) { const k = piezas.findIndex((a) => a.dataset.sala === salas[i]); if (k >= 0) { empezar(); irA(k, true); } }
  const tono = (sala) => document.documentElement.style.setProperty("--luz", TONO_SALA[sala] || "#ffa07a");
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
    else if (e.code === "Home") { irA(0, true); e.preventDefault(); }
    else if (e.code === "End") { irA(piezas.length - 1, true); e.preventDefault(); }
    if (e.shiftKey) teclas.add("Shift");
  });
  addEventListener("keyup", (e) => { teclas.delete(e.code); if (e.key === "Shift") teclas.delete("Shift"); });
  addEventListener("blur", () => teclas.clear());

  // arrastrar mira alrededor; un toque sin arrastre camina (o abre, si toca una vaina)
  const lienzo = $("#escena");
  const rayo = new THREE.Raycaster(), ndc = new THREE.Vector2();
  lienzo.addEventListener("pointerdown", (e) => {
    if (!enCurso) { empezar(); return; }
    arrastre = { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, movio: false, id: e.pointerId };
    lienzo.setPointerCapture?.(e.pointerId);
  });
  lienzo.addEventListener("pointermove", (e) => {
    if (!arrastre || e.pointerId !== arrastre.id) return;
    const dx = e.clientX - arrastre.x, dy = e.clientY - arrastre.y; arrastre.x = e.clientX; arrastre.y = e.clientY;
    if (Math.hypot(e.clientX - arrastre.x0, e.clientY - arrastre.y0) > 8) arrastre.movio = true;
    if (arrastre.movio) { mirar -= dx * .006; inclina = Math.max(-.35, Math.min(.6, inclina + dy * .004)); ultimoArrastre = performance.now(); }
  });
  const soltar = (e) => {
    if (!arrastre || e.pointerId !== arrastre.id) return;
    const fue = arrastre; arrastre = null;
    if (fue.movio || e.type === "pointercancel") return;
    ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    rayo.setFromCamera(ndc, camara);
    const tocada = rayo.intersectObjects(vainas.map((v) => v.v))[0];
    if (tocada) irA(vainas.findIndex((v) => v.v === tocada.object), true);
    else { const t = rayo.intersectObject(piso)[0]; if (t) { objetivo = { x: t.point.x, z: t.point.z }; abrirAlLlegar = -1; } }
    pista.classList.add("ida");
  };
  lienzo.addEventListener("pointerup", soltar);
  lienzo.addEventListener("pointercancel", soltar);

  function masCercana() {
    let k = 0, d = Infinity;
    piezas.forEach((a, i) => { const e = Math.hypot(a.px - x, a.pz - z); if (e < d) { d = e; k = i; } });
    return [k, d];
  }
  function medir() { renderer.setSize(innerWidth, innerHeight, false); camara.aspect = innerWidth / innerHeight; camara.updateProjectionMatrix(); }
  addEventListener("resize", medir); medir();

  // si la URL trae una pieza (#deuna), Fran aparece frente a ella con la hoja abierta
  const deHash = piezas.findIndex((a) => "#" + a.id === location.hash);
  if (deHash >= 0) {
    const a = piezas[deHash], d = Math.hypot(a.px, a.pz) || 1;
    x = a.px - a.px / d * 2.2; z = a.pz - a.pz / d * 2.2; rumbo = Math.atan2(a.px - x, a.pz - z);
    empezar(); requestAnimationFrame(() => abrir(deHash));
  }
  tono(piezas[masCercana()[0]].dataset.sala);

  // ── el bucle ──
  const camPos = new THREE.Vector3(), mira = new THREE.Vector3(), vista = new THREE.Vector3(), tmp = new THREE.Vector3();
  let antes = performance.now(), salaActual = "", primera = true;
  const angulo = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  function cuadro(ahora) {
    const dt = Math.min(.05, (ahora - antes) / 1000); antes = ahora;
    const t = ahora / 1000;

    // ↑↓ avanza, ←→ gira; o camina sola hasta el objetivo
    let avance = 0, giro = 0;
    if (!hoja.open) {
      if (teclas.has("ArrowUp") || teclas.has("KeyW")) avance += 1;
      if (teclas.has("ArrowDown") || teclas.has("KeyS")) avance -= .6;
      if (teclas.has("ArrowLeft") || teclas.has("KeyA")) giro += 1;
      if (teclas.has("ArrowRight") || teclas.has("KeyD")) giro -= 1;
    }
    let corre = teclas.has("Shift");
    if (objetivo && !avance && !giro) {
      const dx = objetivo.x - x, dz = objetivo.z - z, d = Math.hypot(dx, dz);
      if (d < .15) {
        objetivo = null;
        if (abrirAlLlegar >= 0) { const k = abrirAlLlegar; abrirAlLlegar = -1; rumbo = Math.atan2(piezas[k].px - x, piezas[k].pz - z); abrir(k); }
      } else {
        const dif = angulo(Math.atan2(dx, dz) - rumbo);
        rumbo += dif * Math.min(1, dt * 7);
        avance = Math.min(1, d / 1.2) * Math.max(0, Math.cos(dif));
        corre = d > 10;
      }
    }
    rumbo += giro * dt * 2.4;
    vel += (avance * (corre ? 7 : 3.4) - vel) * Math.min(1, dt * 7);
    x += Math.sin(rumbo) * vel * dt; z += Math.cos(rumbo) * vel * dt;
    const r = Math.hypot(x, z); if (r > BORDE) { x *= BORDE / r; z *= BORDE / r; }
    for (const a of piezas) { const dx = x - a.px, dz = z - a.pz, d = Math.hypot(dx, dz); if (d < 1.1 && d > 0) { x = a.px + dx / d * 1.1; z = a.pz + dz / d * 1.1; } }
    const y = altura(x, z);
    const rapidez = Math.abs(vel);

    // la pose: péndulo de piernas y brazos; si gira en el sitio, da pasitos
    const girando = rapidez < .3 && giro !== 0;
    paso += (rapidez * 2.4 + (girando ? 9 : 0)) * dt;
    const amp = Math.min(1, rapidez / 3) * (rapidez > 4.5 ? .85 : .6) + (girando ? .3 : 0);
    const sp = Math.sin(paso);
    piernas[0].rotation.x = sp * amp; piernas[1].rotation.x = -sp * amp;
    brazos[0].rotation.x = -sp * amp * .9; brazos[1].rotation.x = sp * amp * .9;
    cuerpo.position.y = Math.abs(sp) * .06 * Math.min(1, rapidez / 2) + (QUIETO ? 0 : Math.sin(t * 2) * .012);
    cuerpo.rotation.x = Math.max(-.08, Math.min(.14, vel * .02));
    cabeza.rotation.z = QUIETO ? 0 : Math.sin(t * .7) * .04 * (1 - Math.min(1, rapidez));
    fran.rotation.y = rumbo;
    fran.position.set(x, y, z);
    farol.position.set(x, y + 2.2, z);
    aura.position.set(x, y + 1.3, z);
    suelo.uniforms.uFran.value.set(x, z);

    // cámara en tercera persona, detrás de Fran; arrastrar la gira y vuelve sola al rato
    if (performance.now() - ultimoArrastre > 1800 && !arrastre) { mirar *= 1 - Math.min(1, dt * (rapidez > .5 ? 1.6 : .4)); inclina *= 1 - Math.min(1, dt * .8); }
    const yaw = rumbo + Math.PI + mirar;
    const dist = (MOVIL ? 8.5 : 7) * (1 + Math.max(0, inclina) * .4), alto = (MOVIL ? 3.6 : 3) + inclina * 6;
    camPos.set(x + Math.sin(yaw) * dist, 0, z + Math.cos(yaw) * dist);
    camPos.y = Math.max(altura(camPos.x, camPos.z) + 1.2, y + alto);
    mira.set(x - Math.sin(yaw) * 2.5, y + 1.5, z - Math.cos(yaw) * 2.5);
    const k = primera ? 1 : Math.min(1, dt * 4);
    camara.position.lerp(camPos, k); vista.lerp(mira, k); primera = false;
    camara.lookAt(vista);

    // vainas, tela y luciérnaga
    for (const [i, v] of vainas.entries()) {
      const d = Math.hypot(piezas[i].px - x, piezas[i].pz - z);
      const f = Math.max(0, 1 - d / 4);
      v.m.uniforms.uFuerza.value += ((.45 + f * 1.1) - v.m.uniforms.uFuerza.value) * Math.min(1, dt * 5);
      v.v.position.y = v.y0 + 1.8 + (QUIETO ? 0 : Math.sin(t * 1.1 + v.fase) * .15);
      v.v.rotation.y = t * .2 + v.fase;
      v.halo.position.y = v.v.position.y;
      v.halo.material.opacity = .4 + f * .5;
      v.colM.uniforms.uO.value = (v.vista ? .22 : .55) * Math.min(1, d / 6);
    }
    for (const m of relojes) m.uniforms.uT.value = QUIETO ? 0 : t;
    const sig = vainas.findIndex((v) => !v.vista);
    if (sig >= 0) {
      const a = piezas[sig], dx = a.px - x, dz = a.pz - z, d = Math.hypot(dx, dz) || 1, lejos = Math.max(0, Math.min(2.4, d - .5));
      tmp.set(x + dx / d * lejos, y + 2.3 + (QUIETO ? 0 : Math.sin(t * 2.3) * .2), z + dz / d * lejos);
    } else tmp.set(x, y + 3, z);
    guiaPos.lerp(tmp, Math.min(1, dt * 2)); guia.position.copy(guiaPos); guiaHalo.position.copy(guiaPos);

    // la pieza que tiene delante
    const [k2, d2] = masCercana();
    cercana = d2 < 3 ? k2 : -1;
    if (cercana >= 0 && !hoja.open && enCurso) {
      if (globo.hidden || globo.dataset.i !== String(cercana)) { globo.dataset.i = cercana; $("#globo-t").textContent = piezas[cercana].dataset.nombre; }
      globo.hidden = false;
      tmp.copy(vainas[cercana].v.position); tmp.y += 1.25; tmp.project(camara);
      globo.style.transform = `translate(${(tmp.x * .5 + .5) * innerWidth}px, ${(-tmp.y * .5 + .5) * innerHeight}px)`;
    } else globo.hidden = true;
    const sala = piezas[k2].dataset.sala;
    if (sala !== salaActual) {
      salaActual = sala; if (!hoja.open) tono(sala);
      botonesSala.forEach((b) => b.setAttribute("aria-current", b.dataset.sala === sala ? "true" : "false"));
    }

    renderer.render(escena, camara);
    requestAnimationFrame(cuadro);
  }
  requestAnimationFrame(cuadro);
}
