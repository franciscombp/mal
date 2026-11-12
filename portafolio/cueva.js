// Fran en 3D: el Fran de papel, ahora de bulto, camina por una cueva de membranas cálidas con
// agujeros redondos (la luz de "Her" entrando por la tela). Cada pieza del portafolio es una
// vaina de luz a lo largo del camino; al llegar, se abre en una hoja de vidrio.
// Controles como en papel: ← → / A D caminar, Mayús correr, E / ↑ / Enter abrir, 1–7 salas,
// Inicio / Fin, y tocar el suelo para ir caminando hasta ahí.
import * as THREE from "three";

const $ = (s) => document.querySelector(s);
const piezas = [...document.querySelectorAll("#piezas article")];
const MOVIL = matchMedia("(max-width: 640px)").matches;
const QUIETO = matchMedia("(prefers-reduced-motion: reduce)").matches;
const PALETA = ["#ff9a76", "#ffb98f", "#f7d39a", "#f59a8a", "#ffc4a6", "#f2a07b", "#ffd7b5", "#f08a6e"];
const TONO_SALA = { "Quién": "#ffb08a", "Trabajo": "#ff8f70", "Escritura": "#f7cf8f", "Proyectos": "#ffa07a", "Mentoría": "#f6b3a0", "Sistema": "#ffc79a", "Fin": "#ffe0b8" };
const PASO = 9, X0 = 3, LADO = 1.4; // la vaina queda a un lado de donde se para Fran
piezas.forEach((a, i) => { a.x = X0 + i * PASO; a.color = PALETA[i % PALETA.length]; });
const FIN = piezas.at(-1).x + 5;
const salas = [...new Set(piezas.map((a) => a.dataset.sala))];

function sin3d() { document.body.classList.add("sin-3d"); }

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: $("#escena"), antialias: !MOVIL, powerPreference: "high-performance" });
} catch (e) { renderer = null; }
if (!renderer) sin3d(); else arrancar();

function arrancar() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, MOVIL ? 1.6 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const FONDO = new THREE.Color("#160a09");
  const NIEBLA = new THREE.Color("#3a1813");
  const DENS = MOVIL ? .03 : .026;
  const escena = new THREE.Scene();
  escena.background = FONDO;
  escena.fog = new THREE.FogExp2(NIEBLA, DENS);
  const camara = new THREE.PerspectiveCamera(MOVIL ? 52 : 40, 1, .1, 220);

  // ── luz ──
  escena.add(new THREE.HemisphereLight("#ffd9c2", "#2a0f0b", 1.1));
  const contra = new THREE.DirectionalLight("#ffb48a", 2.4); // por detrás: el borde cálido de Fran
  contra.position.set(-2, 5, -8);
  escena.add(contra, contra.target);
  const frente = new THREE.DirectionalLight("#ffe6d4", .9);
  frente.position.set(3, 4, 9);
  escena.add(frente, frente.target);
  const farol = new THREE.PointLight("#ffa27c", 6, 9, 1.6); // la luz que lleva consigo
  escena.add(farol);

  // ── ruido celular: los agujeros redondos de la tela ──
  const RUIDO = /* glsl */`
    vec3 h3(vec3 p){ p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6))); return fract(sin(p) * 43758.5453); }
    float celda(vec3 p){ vec3 i = floor(p), f = fract(p); float d = 1.;
      for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
        vec3 g = vec3(x, y, z); d = min(d, length(g + h3(i + g) * .7 + .15 - f)); }
      return d; }`;
  const NIEBLA_GLSL = /* glsl */`
    uniform vec3 uNiebla; uniform float uDens;
    vec3 niebla(vec3 c, vec3 w){ float d = length(w - cameraPosition); return mix(c, uNiebla, 1. - exp(-uDens * uDens * d * d)); }`;

  // la cueva: medias cáscaras a lo largo del camino, abiertas hacia la cámara
  const LARGO = FIN + 90;
  function cascara(radio, frec, hueco, opac, colA, colB, semilla) {
    const g = new THREE.CylinderGeometry(radio, radio, LARGO, MOVIL ? 72 : 112, MOVIL ? 60 : 110, true, Math.PI * .18, Math.PI * 1.34);
    g.rotateZ(Math.PI / 2);
    g.translate(LARGO / 2 - 40, 1.2, 0);
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uT: { value: 0 }, uA: { value: new THREE.Color(colA) }, uB: { value: new THREE.Color(colB) }, uNiebla: { value: NIEBLA }, uDens: { value: DENS } },
      vertexShader: /* glsl */`
        uniform float uT; varying vec3 vW; varying vec3 vN; varying float vY;
        void main(){
          vec3 p = position;
          float o = sin(p.x * .11 + ${semilla.toFixed(2)}) * .9 + sin(p.x * .27 + uT * .25 + ${(semilla * 2).toFixed(2)}) * .35;
          p += normal * o;
          vec4 w = modelMatrix * vec4(p, 1.);
          vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vY = p.y;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 uA, uB; uniform float uT; varying vec3 vW; varying vec3 vN; varying float vY;
        ${RUIDO}
        ${NIEBLA_GLSL}
        void main(){
          float c = celda(vW * ${frec.toFixed(3)} + vec3(${semilla.toFixed(2)}, 0., uT * .015));
          float tela = smoothstep(${hueco.toFixed(3)}, ${(hueco + .05).toFixed(3)}, c);
          if (tela < .01) discard;
          vec3 v = normalize(cameraPosition - vW);
          float borde = pow(1. - abs(dot(normalize(vN), v)), 2.2);
          float canto = 1. - smoothstep(${hueco.toFixed(3)}, ${(hueco + .16).toFixed(3)}, c); // los bordes de cada agujero brillan
          vec3 col = mix(uA, uB, clamp(vY / ${radio.toFixed(1)} * .5 + .5, 0., 1.));
          col += vec3(1., .82, .66) * canto * .55 + uB * borde * .4;
          gl_FragColor = vec4(niebla(col, vW), tela * (${opac.toFixed(2)} + canto * .35 + borde * .25));
        }`,
    });
    const malla = new THREE.Mesh(g, m);
    escena.add(malla);
    return m;
  }
  const telas = MOVIL
    ? [cascara(7.5, .3, .3, .5, "#7a2a20", "#e8826a", 1.3), cascara(12, .17, .27, .32, "#5a1d17", "#f2a07f", 4.1)]
    : [cascara(7, .32, .31, .52, "#7a2a20", "#e8826a", 1.3), cascara(10.5, .2, .29, .38, "#5f1f18", "#f2a07f", 4.1), cascara(15, .12, .25, .26, "#4a1712", "#ffc29a", 7.7)];

  // ── resplandores: lo que se ve por los agujeros ──
  function textura(dentro, fuera = "rgba(255,255,255,0)") {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const x = c.getContext("2d"); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, dentro); g.addColorStop(.35, "rgba(255,255,255,.35)"); g.addColorStop(1, fuera);
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const BRILLO = textura("rgba(255,255,255,1)");
  const brillo = (color, escala, opac = 1) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: BRILLO, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: opac, fog: false }));
    s.scale.setScalar(escala); escena.add(s); return s;
  };
  for (let x = -20; x < FIN + 40; x += 11) {
    brillo(PALETA[Math.abs(Math.round(x)) % PALETA.length], 16 + (x % 7), .55).position.set(x + 4, 4 + Math.sin(x) * 3, -20);
  }
  const sol = brillo("#ffe2c0", 46, .9);
  sol.position.set(FIN + 18, 3.5, -10);

  // ── el suelo: oscuro, con charcos de luz bajo cada vaina y la sombra de Fran ──
  const N = piezas.length;
  const suelo = new THREE.ShaderMaterial({
    uniforms: {
      uBase: { value: new THREE.Color("#2a120e") }, uFran: { value: 0 }, uLuz: { value: new THREE.Color("#ffa27c") },
      uX: { value: piezas.map((a) => a.x + LADO) }, uC: { value: piezas.map((a) => new THREE.Color(a.color)) },
      uNiebla: { value: NIEBLA }, uDens: { value: DENS },
    },
    vertexShader: /* glsl */`varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform vec3 uBase, uLuz; uniform float uFran; uniform float uX[${N}]; uniform vec3 uC[${N}];
      varying vec3 vW;
      ${NIEBLA_GLSL}
      void main(){
        vec3 c = uBase * (1. - smoothstep(2., 14., abs(vW.z)) * .5);
        for (int i = 0; i < ${N}; i++) { vec2 e = vW.xz - vec2(uX[i], -1.6); c += uC[i] * .55 * exp(-dot(e, e) * .32); }
        vec2 d = vW.xz - vec2(uFran, 0.);
        c += uLuz * .16 * exp(-dot(d, d) * .18);
        c *= 1. - .6 * exp(-(d.x * d.x * 9. + d.y * d.y * 14.)); // sombra
        gl_FragColor = vec4(niebla(c, vW), 1.);
      }`,
  });
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(LARGO, 60), suelo);
  piso.rotation.x = -Math.PI / 2;
  piso.position.set(LARGO / 2 - 40, 0, 0);
  escena.add(piso);

  // ── las vainas: una por pieza ──
  const vainaGeo = new THREE.IcosahedronGeometry(.62, 5);
  const vainas = piezas.map((a, i) => {
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uC: { value: new THREE.Color(a.color) }, uFuerza: { value: .6 } },
      vertexShader: /* glsl */`varying vec3 vN; varying vec3 vV; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */`uniform vec3 uC; uniform float uFuerza; varying vec3 vN; varying vec3 vV;
        void main(){ float f = pow(1. - max(dot(normalize(vN), vV), 0.), 1.8);
          vec3 c = mix(uC * .55, vec3(1., .93, .84), f) ; gl_FragColor = vec4(c * (.7 + uFuerza), .35 + f * .6); }`,
    });
    const v = new THREE.Mesh(vainaGeo, m);
    v.position.set(a.x + LADO, 1.7, -1.6);
    v.scale.set(1, 1.25, 1);
    escena.add(v);
    const halo = brillo(a.color, 4.2, .55);
    halo.position.copy(v.position);
    return { v, m, halo, fase: i * 1.7 };
  });

  // ── polvo que flota ──
  const CUANTOS = MOVIL ? 260 : 600;
  const pos = new Float32Array(CUANTOS * 3);
  for (let i = 0; i < CUANTOS; i++) { pos[i * 3] = Math.random() * (FIN + 40) - 20; pos[i * 3 + 1] = Math.random() * 7; pos[i * 3 + 2] = -Math.random() * 9 + 2; }
  const polvoGeo = new THREE.BufferGeometry();
  polvoGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const polvo = new THREE.Points(polvoGeo, new THREE.PointsMaterial({ map: BRILLO, color: "#ffd2b0", size: .09, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .8 }));
  escena.add(polvo);

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
    const aro = pieza(new THREE.TorusGeometry(.078, .013, 8, 28), GAFAS, l * .1, .02, .255); cabeza.add(aro);
    const r = pieza(new THREE.SphereGeometry(.05, 12, 10), RUBOR, l * .15, -.07, .21); r.scale.set(1, .6, .4); cabeza.add(r);
    cabeza.add(pieza(new THREE.SphereGeometry(.05, 10, 8), PIEL, l * .26, -.01, 0)); // orejas
  }
  const puente = pieza(new THREE.CylinderGeometry(.01, .01, .05, 6), GAFAS, 0, .03, .262); puente.rotation.z = Math.PI / 2; cabeza.add(puente);
  const nariz = pieza(new THREE.SphereGeometry(.04, 12, 10), PIEL, 0, -.04, .26); nariz.scale.set(1, 1, .8); cabeza.add(nariz);
  const boca = pieza(new THREE.TorusGeometry(.045, .01, 6, 16, Math.PI), mat("#5a2a22"), 0, -.12, .235); boca.rotation.z = Math.PI; cabeza.add(boca);
  fran.traverse((o) => { o.castShadow = false; });
  escena.add(fran);
  const aura = brillo("#ffb48a", 3.6, .28);

  // ── estado ──
  const teclas = new Set();
  let x = 0, vel = 0, dir = 1, giro = Math.PI / 2 - .5, paso = 0, objetivo = null, abrirAlLlegar = -1, cerca = -1, enCurso = false, t0 = performance.now();
  const camPos = new THREE.Vector3(), camMira = new THREE.Vector3();

  // ── la interfaz ──
  const hoja = $("#hoja"), globo = $("#globo"), portada = $("#portada"), pista = $("#pista");
  if (matchMedia("(pointer: coarse)").matches) pista.textContent = "Toca el suelo para caminar · toca una luz para abrirla";
  const listaSalas = $("#salas");
  salas.forEach((s, i) => {
    const li = document.createElement("li"); const b = document.createElement("button");
    b.type = "button"; b.textContent = s; b.dataset.sala = s; b.title = `${s} (${i + 1})`;
    b.addEventListener("click", () => irASala(i)); li.append(b); listaSalas.append(li);
  });
  const botonesSala = [...listaSalas.querySelectorAll("button")];
  let abierta = -1;
  function abrir(i) {
    abierta = i; const a = piezas[i];
    $("#hoja-sala").textContent = a.dataset.sala;
    const cuerpoHoja = $("#hoja-cuerpo"); cuerpoHoja.innerHTML = a.innerHTML;
    const h = cuerpoHoja.querySelector("h2"); if (h) h.id = "hoja-t";
    $("#hoja-n").textContent = `${i + 1} de ${piezas.length}`;
    $("#ant").disabled = i === 0; $("#sig").disabled = i === piezas.length - 1;
    if (!hoja.open) hoja.showModal();
    hoja.scrollTop = 0;
    history.replaceState(null, "", "#" + a.id);
    tono(a.dataset.sala);
  }
  function cerrar() { if (hoja.open) hoja.close(); }
  hoja.addEventListener("close", () => { abierta = -1; history.replaceState(null, "", location.pathname + location.search); $("#escena").focus?.(); });
  hoja.addEventListener("click", (e) => { if (e.target === hoja) cerrar(); });
  $("#cerrar").addEventListener("click", cerrar);
  const moverA = (i) => { objetivo = piezas[i].x; abrirAlLlegar = -1; };
  $("#ant").addEventListener("click", () => { if (abierta > 0) { moverA(abierta - 1); abrir(abierta - 1); } });
  $("#sig").addEventListener("click", () => { if (abierta < piezas.length - 1) { moverA(abierta + 1); abrir(abierta + 1); } });
  globo.addEventListener("click", () => { if (cerca >= 0) abrir(cerca); });
  function irASala(i) { const k = piezas.findIndex((a) => a.dataset.sala === salas[i]); if (k >= 0) { empezar(); objetivo = piezas[k].x; abrirAlLlegar = -1; } }
  function tono(sala) { document.documentElement.style.setProperty("--luz", TONO_SALA[sala] || "#ffa07a"); }
  function empezar() {
    if (enCurso) return; enCurso = true; portada.classList.add("ida");
    setTimeout(() => pista.classList.add("ida"), 9000);
  }
  $("#empezar").addEventListener("click", empezar);

  const IZQ = ["ArrowLeft", "KeyA"], DER = ["ArrowRight", "KeyD"], VER = ["KeyE", "ArrowUp", "KeyW", "Enter", "Space"];
  addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (hoja.open) {
      if (e.code === "ArrowLeft" && !e.target.closest?.("a")) $("#ant").click();
      else if (e.code === "ArrowRight" && !e.target.closest?.("a")) $("#sig").click();
      return;
    }
    if (e.target.closest?.("a, button") && (e.code === "Enter" || e.code === "Space")) return;
    if (!enCurso) { if (VER.includes(e.code) || IZQ.includes(e.code) || DER.includes(e.code)) { e.preventDefault(); empezar(); } return; }
    if (IZQ.includes(e.code) || DER.includes(e.code)) { teclas.add(e.code); objetivo = null; e.preventDefault(); pista.classList.add("ida"); }
    else if (VER.includes(e.code)) { if (cerca >= 0) { e.preventDefault(); abrir(cerca); } }
    else if (/^Digit[1-9]$/.test(e.code)) { const i = +e.code.slice(5) - 1; if (i < salas.length) irASala(i); }
    else if (e.code === "Home") { objetivo = piezas[0].x; e.preventDefault(); }
    else if (e.code === "End") { objetivo = piezas.at(-1).x; e.preventDefault(); }
    else if (e.code === "PageDown" || e.code === "PageUp") {
      const s = e.code === "PageDown" ? 1 : -1; const actual = masCercana();
      const k = Math.max(0, Math.min(piezas.length - 1, actual + s)); objetivo = piezas[k].x; e.preventDefault();
    }
    if (e.shiftKey) teclas.add("Shift");
  });
  addEventListener("keyup", (e) => { teclas.delete(e.code); if (e.key === "Shift") teclas.delete("Shift"); });
  addEventListener("blur", () => teclas.clear());

  // tocar el suelo: Fran camina hasta ahí; tocar una vaina: camina y la abre
  const rayo = new THREE.Raycaster(), plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), punto = new THREE.Vector3(), ndc = new THREE.Vector2();
  $("#escena").addEventListener("pointerdown", (e) => {
    if (!enCurso) { empezar(); return; }
    ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    rayo.setFromCamera(ndc, camara);
    const tocada = rayo.intersectObjects(vainas.map((v) => v.v))[0];
    if (tocada) { const i = vainas.findIndex((v) => v.v === tocada.object); objetivo = piezas[i].x; abrirAlLlegar = i; }
    else if (rayo.ray.intersectPlane(plano, punto)) { objetivo = Math.max(0, Math.min(FIN, punto.x)); abrirAlLlegar = -1; }
    pista.classList.add("ida");
  });

  function masCercana() {
    let k = 0, d = Infinity;
    piezas.forEach((a, i) => { const e = Math.abs(a.x - x); if (e < d) { d = e; k = i; } });
    return k;
  }

  // ── tamaño ──
  function medir() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false); camara.aspect = w / h; camara.updateProjectionMatrix();
  }
  addEventListener("resize", medir); medir();

  // si la URL trae una pieza (#deuna), Fran aparece ahí con la hoja abierta
  const deHash = piezas.findIndex((a) => "#" + a.id === location.hash);
  if (deHash >= 0) { x = piezas[deHash].x; empezar(); requestAnimationFrame(() => abrir(deHash)); }
  tono(piezas[masCercana()].dataset.sala);

  // ── el bucle ──
  const vista = new THREE.Vector3();
  let antes = performance.now(), salaActual = "";
  function cuadro(ahora) {
    const dt = Math.min(.05, (ahora - antes) / 1000); antes = ahora;
    const t = (ahora - t0) / 1000;

    // caminar
    let quiere = 0;
    if (!hoja.open) {
      if (teclas.has("ArrowLeft") || teclas.has("KeyA")) quiere -= 1;
      if (teclas.has("ArrowRight") || teclas.has("KeyD")) quiere += 1;
    }
    if (objetivo !== null && quiere === 0) {
      const d = objetivo - x;
      if (Math.abs(d) < .06) { objetivo = null; if (abrirAlLlegar >= 0) { const k = abrirAlLlegar; abrirAlLlegar = -1; abrir(k); } }
      else quiere = Math.sign(d) * Math.min(1, Math.abs(d) / 1.2);
    }
    const lejos = objetivo !== null && Math.abs(objetivo - x) > 8;
    const tope = (teclas.has("Shift") || lejos ? 6.4 : 3.1);
    vel += (quiere * tope - vel) * Math.min(1, dt * 7);
    x = Math.max(-1, Math.min(FIN, x + vel * dt));
    if (Math.abs(vel) > .15) dir = Math.sign(vel);
    const rapidez = Math.abs(vel);

    // la pose: piernas y brazos en péndulo, un saltito al pisar, giro hacia la cámara
    paso += rapidez * dt * 2.4;
    const amp = Math.min(1, rapidez / 3) * (rapidez > 4.5 ? .85 : .6);
    piernas[0].rotation.x = Math.sin(paso) * amp; piernas[1].rotation.x = -Math.sin(paso) * amp;
    brazos[0].rotation.x = -Math.sin(paso) * amp * .9; brazos[1].rotation.x = Math.sin(paso) * amp * .9;
    const respira = QUIETO ? 0 : Math.sin(t * 2) * .012;
    cuerpo.position.y = Math.abs(Math.sin(paso)) * .06 * Math.min(1, rapidez / 2) + respira;
    cuerpo.rotation.x = Math.min(.14, rapidez * .02);
    cabeza.rotation.z = QUIETO ? 0 : Math.sin(t * .7) * .04 * (1 - Math.min(1, rapidez));
    const meta = dir * (Math.PI / 2 - (rapidez < .2 ? 1.1 : .45)); // quieto, mira casi a la cámara
    giro += (meta - giro) * Math.min(1, dt * 8);
    fran.rotation.y = giro;
    fran.position.set(x, 0, 0);
    farol.position.set(x + dir * .5, 2.2, 1.6);
    aura.position.set(x, 1.3, -.4);
    suelo.uniforms.uFran.value = x;

    // cámara: de lado, un poco por delante de Fran, sin sacudirse
    const delante = dir * Math.min(1.6, rapidez * .35) + (MOVIL ? 0 : .9);
    camPos.set(x + delante * .6, MOVIL ? 2.6 : 2.4, MOVIL ? 10.5 : 8.6);
    camMira.set(x + delante, 1.35, -.6);
    const k = Math.min(1, dt * 3.2);
    camara.position.lerp(camPos, camara.position.lengthSq() === 0 ? 1 : k);
    vista.lerp(camMira, vista.lengthSq() === 0 ? 1 : k);
    camara.lookAt(vista);

    // vainas y tela
    for (const [i, v] of vainas.entries()) {
      const d = Math.abs(piezas[i].x - x);
      const f = Math.max(0, 1 - d / 3);
      v.m.uniforms.uFuerza.value += ((.45 + f * 1.1) - v.m.uniforms.uFuerza.value) * Math.min(1, dt * 5);
      v.v.position.y = 1.7 + (QUIETO ? 0 : Math.sin(t * 1.1 + v.fase) * .12);
      v.v.rotation.y = t * .2 + v.fase;
      v.halo.position.y = v.v.position.y;
      v.halo.material.opacity = .4 + f * .5;
    }
    for (const m of telas) m.uniforms.uT.value = QUIETO ? 0 : t;
    if (!QUIETO) polvo.position.y = Math.sin(t * .2) * .3;

    // la pieza que tiene delante
    const k2 = masCercana();
    const nueva = Math.abs(piezas[k2].x - x) < 2.4 ? k2 : -1;
    if (nueva !== cerca) {
      cerca = nueva;
      globo.hidden = cerca < 0 || hoja.open;
      if (cerca >= 0) $("#globo-t").textContent = piezas[cerca].dataset.nombre;
    }
    if (cerca >= 0 && !hoja.open && enCurso) {
      globo.hidden = false;
      punto.copy(vainas[cerca].v.position); punto.y += 1.15; punto.project(camara);
      globo.style.transform = `translate(${(punto.x * .5 + .5) * innerWidth}px, ${(-punto.y * .5 + .5) * innerHeight}px)`;
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
