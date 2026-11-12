// El portafolio de Fran en el espacio: un túnel de membranas translúcidas que se abre como un
// embudo mientras se baja, con las ventanas de vidrio de espacio.css flotando dentro. El texto
// vive en el HTML (accesible y legible sin 3D); esto pinta el túnel, mueve la cámara con el
// scroll y vuelve las ventanas de frente al acercarse. Inspirado en la cueva de «Her» y en visionOS.
import * as THREE from 'three';

const QUIETO = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MOVIL = matchMedia('(max-width: 700px), (pointer: coarse)').matches;

// Un color por estación: de la cueva verde de «Her» al amanecer tibio de la salida.
const PALETA = ['#7ee8c8', '#9ff0d0', '#ffd38a', '#ffb38a', '#ff9a8b', '#f6a6c1', '#c7b8ff', '#ffe7b0'].map((c) => new THREE.Color(c));
const FONDO = [new THREE.Color('#06120f'), new THREE.Color('#0d0a14')];

const estaciones = [...document.querySelectorAll('.estacion')];
const burbujas = estaciones.map((e) => e.querySelector('.ventana'));
const pestanas = [...document.querySelectorAll('.pestana')];
// a qué pestaña pertenece cada estación: la última pestaña cuyo destino está antes o en ella
const pestanaDe = estaciones.map((e) => {
  let k = -1;
  pestanas.forEach((p, j) => { const d = document.querySelector(p.getAttribute('href')); if (d && d.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING || d === e) k = j; });
  return k;
});

// el brillo de la mirada: --mx/--my en lo que está bajo el puntero
addEventListener('pointermove', (ev) => {
  const el = ev.target.closest?.('.pestana, .capsula, .boton, .lista a, .fichas a');
  if (!el) return;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--mx', `${ev.clientX - r.left}px`);
  el.style.setProperty('--my', `${ev.clientY - r.top}px`);
}, { passive: true });
let mx = 0, my = 0;
addEventListener('pointermove', (ev) => { mx = ev.clientX / innerWidth - .5; my = ev.clientY / innerHeight - .5; }, { passive: true });

// ── progreso: del scroll a un número entre 0 y 1 ──────────────────────────
let objetivo = 0, progreso = 0;
const leerScroll = () => {
  const max = document.documentElement.scrollHeight - innerHeight;
  objetivo = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
};
addEventListener('scroll', leerScroll, { passive: true });
leerScroll();

// el texto: cada burbuja se aclara y enfoca al acercarse al centro de la pantalla
let tonoActual = 0;
function pintarTexto() {
  const medio = innerHeight / 2;
  let mejor = 0, mejorD = Infinity;
  burbujas.forEach((b, i) => {
    const r = estaciones[i].getBoundingClientRect();
    const d = Math.abs(r.top + r.height / 2 - medio);
    const cerca = 1 - Math.min(1, d / (innerHeight * 0.62));
    const c = cerca * cerca * (3 - 2 * cerca);
    b.style.setProperty('--cerca', c.toFixed(3));
    // lejos, la ventana mira hacia el centro del túnel; cerca, se pone de frente y sigue un poco la mirada
    const lado = b.classList.contains('ventana--libre') ? 0 : (r.left + r.width / 2 < innerWidth / 2 ? 1 : -1);
    b.style.setProperty('--giro', `${(lado * (1 - c) * 18 + mx * c * 6).toFixed(2)}deg`);
    b.style.setProperty('--giro-x', `${(-my * c * 4).toFixed(2)}deg`);
    if (d < mejorD) { mejorD = d; mejor = i; }
  });
  pestanas.forEach((p, j) => p.classList.toggle('aqui', j === pestanaDe[mejor]));
  tonoActual = +estaciones[mejor].dataset.tono || 0;
}

// ── 3D ─────────────────────────────────────────────────────────────────────
const lienzo = document.getElementById('cielo');
let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: !MOVIL, alpha: false, powerPreference: 'high-performance' });
} catch (e) {
  document.body.classList.add('sin-3d');
}

if (!renderer) {
  const sinTres = () => { pintarTexto(); requestAnimationFrame(sinTres); };
  sinTres();
} else {
  iniciar();
}

function iniciar() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, MOVIL ? 1.25 : 1.6));
  renderer.setClearColor(FONDO[0]);
  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(62, 1, 0.1, 400);

  // El camino: una curva que serpentea despacio hacia el fondo.
  const N = 13;
  const camino = new THREE.CatmullRomCurve3(
    Array.from({ length: N }, (_, i) => new THREE.Vector3(Math.sin(i * 0.75) * 7, Math.cos(i * 0.55) * 3.5, -i * 28)),
    false, 'catmullrom', 0.5,
  );
  // El embudo: estrecho al entrar, abierto al salir.
  const radio = (t) => 2.8 + 12 * Math.pow(t, 1.7);
  const fin = camino.getPointAt(1);

  const comunes = {
    uTiempo: { value: 0 },
    uProg: { value: 0 },
    uCam: { value: new THREE.Vector3() },
    uFin: { value: fin },
    uColA: { value: new THREE.Color() },
    uColB: { value: new THREE.Color() },
  };

  // ── membranas: tubos orgánicos con huecos redondos ──
  const vertMembrana = /* glsl */`
    attribute float aT;
    attribute vec3 aNormal;
    uniform float uTiempo;
    varying vec3 vPos; varying vec3 vNor; varying float vT;
    void main() {
      vec3 p = position;
      // respira: la pared se hincha y se encoge, distinta en cada punto
      p += aNormal * sin(uTiempo * .55 + aT * 38.0 + p.x * .3) * .18;
      vec4 mundo = modelMatrix * vec4(p, 1.0);
      vPos = mundo.xyz; vNor = aNormal; vT = aT;
      gl_Position = projectionMatrix * viewMatrix * mundo;
    }`;
  const fragMembrana = /* glsl */`
    uniform float uTiempo, uProg, uSemilla, uFrec, uHueco, uOpac;
    uniform vec3 uCam, uFin, uColA, uColB;
    varying vec3 vPos; varying vec3 vNor; varying float vT;
    vec3 azar(vec3 p) {
      p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
      return fract(sin(p) * 43758.5453);
    }
    // ruido celular: la distancia al centro de celda más cercano. Cerca de un centro hay un hueco,
    // así que los huecos salen redondos, como en la cueva de «Her».
    float celda(vec3 p) {
      vec3 i = floor(p), f = fract(p);
      float d = 8.0;
      for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
        vec3 g = vec3(float(x), float(y), float(z));
        vec3 o = azar(i + g);
        o = .5 + .42 * sin(uTiempo * .18 + 6.2831 * o);
        vec3 r = g + o - f;
        d = min(d, dot(r, r));
      }
      return sqrt(d);
    }
    void main() {
      float c = celda(vPos * uFrec + uSemilla);
      float hueco = smoothstep(uHueco, uHueco + .14, c);
      float borde = 1.0 - smoothstep(0.0, .16, abs(c - uHueco - .07));
      vec3 V = normalize(uCam - vPos);
      float fres = pow(1.0 - abs(dot(normalize(vNor), V)), 1.6);
      float dist = length(uCam - vPos);
      float niebla = exp(-dist * .028);
      // por delante, más tibio: el sueño cambia de color antes de que llegues
      vec3 col = mix(uColA, uColB, smoothstep(-.02, .22, vT - uProg));
      // la luz del fondo se cuela por los huecos
      float brasa = exp(-length(vPos - uFin) * .018);
      vec3 luz = col * (.28 + .95 * fres) + col * borde * .85 + vec3(1.0, .82, .5) * brasa * (.35 + borde);
      float a = (uOpac * (.3 + fres) + borde * .32) * hueco * niebla;
      a *= smoothstep(1.2, 6.0, dist);
      gl_FragColor = vec4(luz, a);
    }`;

  function tubo(factor, semilla, frec, huecoR, opac) {
    const largo = MOVIL ? 220 : 380, vuelta = MOVIL ? 44 : 72;
    const marcos = camino.computeFrenetFrames(largo, false);
    const pos = new Float32Array((largo + 1) * (vuelta + 1) * 3);
    const nor = new Float32Array(pos.length);
    const ts = new Float32Array((largo + 1) * (vuelta + 1));
    const p = new THREE.Vector3(), n = new THREE.Vector3();
    let k = 0;
    for (let i = 0; i <= largo; i++) {
      const t = i / largo;
      const c = camino.getPointAt(t);
      const N = marcos.normals[i], B = marcos.binormals[i];
      for (let j = 0; j <= vuelta; j++) {
        const a = (j / vuelta) * Math.PI * 2;
        // paredes blandas: varias ondas que nunca dejan una línea recta
        const blando = 1 + .16 * Math.sin(3 * a + t * 22 + semilla) + .09 * Math.sin(5 * a - t * 31 + semilla * 2) + .06 * Math.sin(2 * a + t * 9);
        n.copy(N).multiplyScalar(Math.cos(a)).addScaledVector(B, Math.sin(a)).normalize();
        p.copy(c).addScaledVector(n, radio(t) * factor * blando);
        pos.set([p.x, p.y, p.z], k * 3);
        nor.set([-n.x, -n.y, -n.z], k * 3);
        ts[k++] = t;
      }
    }
    const idx = [];
    for (let i = 0; i < largo; i++) for (let j = 0; j < vuelta; j++) {
      const a = i * (vuelta + 1) + j, b = a + vuelta + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aNormal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('aT', new THREE.BufferAttribute(ts, 1));
    g.setIndex(idx);
    const m = new THREE.ShaderMaterial({
      vertexShader: vertMembrana, fragmentShader: fragMembrana,
      uniforms: { ...comunes, uSemilla: { value: semilla }, uFrec: { value: frec }, uHueco: { value: huecoR }, uOpac: { value: opac } },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    const malla = new THREE.Mesh(g, m);
    malla.frustumCulled = false;
    return malla;
  }
  // de afuera hacia adentro: se dibujan primero las capas lejanas
  const capas = MOVIL
    ? [tubo(1.55, 7.1, .16, .3, .2), tubo(1.0, 1.3, .22, .26, .3)]
    : [tubo(1.9, 4.4, .12, .32, .14), tubo(1.45, 7.1, .16, .3, .2), tubo(1.0, 1.3, .22, .26, .3)];
  capas.forEach((c, i) => { c.renderOrder = i; escena.add(c); });

  // ── la luz del final ──
  const brillo = (r, g, b) => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const x = cv.getContext('2d');
    const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, `rgba(${r},${g},${b},1)`); gr.addColorStop(.25, `rgba(${r},${g},${b},.45)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  const sol = new THREE.Sprite(new THREE.SpriteMaterial({ map: brillo(255, 214, 150), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  sol.position.copy(fin).add(new THREE.Vector3(0, 0, -10));
  sol.scale.setScalar(90);
  sol.renderOrder = -1;
  escena.add(sol);

  // ── polvo que flota ──
  const CANT = MOVIL ? 420 : 900;
  const pp = new Float32Array(CANT * 3), semillas = new Float32Array(CANT);
  for (let i = 0; i < CANT; i++) {
    const t = Math.random();
    const c = camino.getPointAt(t);
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * radio(t) * .9;
    pp.set([c.x + Math.cos(a) * r, c.y + Math.sin(a) * r, c.z], i * 3);
    semillas[i] = Math.random();
  }
  const gPolvo = new THREE.BufferGeometry();
  gPolvo.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  gPolvo.setAttribute('aSemilla', new THREE.BufferAttribute(semillas, 1));
  const polvo = new THREE.Points(gPolvo, new THREE.ShaderMaterial({
    uniforms: { uTiempo: comunes.uTiempo, uColB: comunes.uColB, uEscala: { value: 0 } },
    vertexShader: /* glsl */`
      attribute float aSemilla; uniform float uTiempo, uEscala; varying float vA;
      void main() {
        vec3 p = position;
        p += vec3(sin(uTiempo * .3 + aSemilla * 40.0), cos(uTiempo * .25 + aSemilla * 30.0), sin(uTiempo * .2 + aSemilla * 20.0)) * .6;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uEscala * (.6 + aSemilla) / -mv.z;
        vA = (.35 + .65 * sin(uTiempo * (.5 + aSemilla) + aSemilla * 9.0) * .5 + .5) * smoothstep(80.0, 6.0, -mv.z);
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColB; varying float vA;
      void main() {
        float d = length(gl_PointCoord - .5);
        float a = smoothstep(.5, 0.0, d) * vA;
        gl_FragColor = vec4(mix(uColB, vec3(1.0), .45), a * .8);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  polvo.frustumCulled = false;
  escena.add(polvo);

  // ── la lucecita que guía, siempre un poco adelante ──
  const guia = new THREE.Sprite(new THREE.SpriteMaterial({ map: brillo(210, 255, 236), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  guia.scale.setScalar(1.6);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: brillo(140, 240, 200), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .45 }));
  halo.scale.setScalar(6);
  escena.add(guia, halo);

  // ── una semilla de luz por estación, al costado del camino ──
  const vainas = [];
  const geoVaina = new THREE.IcosahedronGeometry(1, MOVIL ? 3 : 5);
  const matVaina = (color) => new THREE.ShaderMaterial({
    uniforms: { uTiempo: comunes.uTiempo, uCol: { value: color }, uCam: comunes.uCam },
    vertexShader: /* glsl */`
      uniform float uTiempo; varying vec3 vN; varying vec3 vP;
      void main() {
        vec3 p = position;
        p *= 1.0 + .12 * sin(uTiempo * .9 + position.y * 3.0) + .08 * sin(uTiempo * 1.3 + position.x * 4.0);
        vec4 m = modelMatrix * vec4(p, 1.0);
        vP = m.xyz; vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * m;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uCol, uCam; varying vec3 vN; varying vec3 vP;
      void main() {
        float f = pow(1.0 - abs(dot(vN, normalize(uCam - vP))), 2.2);
        gl_FragColor = vec4(uCol * (.25 + f * 1.4) + vec3(1.0) * f * .3, .25 + f * .7);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });

  const arriba = new THREE.Vector3(0, 1, 0), lado = new THREE.Vector3();
  // dónde cae cada estación en el camino: la posición de su centro en el scroll
  const tCamara = (p) => .012 + p * .9;
  function colocarVainas() {
    const max = document.documentElement.scrollHeight - innerHeight;
    estaciones.forEach((e, i) => {
      if (!vainas[i]) {
        const v = new THREE.Mesh(geoVaina, matVaina(PALETA[+e.dataset.tono || 0]));
        v.renderOrder = 10; escena.add(v); vainas[i] = v;
      }
      // la portada y la salida van centradas: ahí una semilla taparía el texto
      // en el teléfono la ventana ocupa el centro: no hay costado libre para la semilla
      if (i === 0 || i === estaciones.length - 1 || MOVIL) { vainas[i].visible = false; return; }
      const centro = e.offsetTop + e.offsetHeight / 2 - innerHeight / 2;
      const t = Math.min(.98, tCamara(Math.min(1, Math.max(0, centro / max))) + .03);
      const c = camino.getPointAt(t);
      lado.crossVectors(camino.getTangentAt(t), arriba).normalize();
      // del lado contrario al texto, para que la semilla y la burbuja no se tapen
      const signo = i % 2 === 0 ? 1 : -1;
      vainas[i].position.copy(c).addScaledVector(lado, signo * radio(t) * (MOVIL ? .28 : .42)).addScaledVector(arriba, radio(t) * .12);
      vainas[i].scale.setScalar(.55 + t * 1.4);
    });
  }

  // ── tamaño ──
  function medir() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    camara.fov = w < h ? 74 : 62;
    camara.updateProjectionMatrix();
    polvo.material.uniforms.uEscala.value = h * (MOVIL ? .9 : .7) * renderer.getPixelRatio() * .15;
    colocarVainas();
  }
  addEventListener('resize', medir);
  medir();

  // ── mirar con el puntero o inclinando el teléfono ──
  const mirada = new THREE.Vector2(), miradaSuave = new THREE.Vector2();
  addEventListener('pointermove', (e) => { mirada.set(e.clientX / innerWidth - .5, e.clientY / innerHeight - .5); }, { passive: true });

  const colA = new THREE.Color(), colB = new THREE.Color(), fondo = new THREE.Color(), cssLuz = new THREE.Color();
  const pos = new THREE.Vector3(), ver = new THREE.Vector3();
  let antes = performance.now(), tiempo = 0, tonoSuave = 0;

  function cuadro(ahora) {
    const dt = Math.min(.05, (ahora - antes) / 1000); antes = ahora;
    if (!QUIETO) tiempo += dt;
    progreso += (objetivo - progreso) * (1 - Math.exp(-dt * (QUIETO ? 12 : 3.2)));
    pintarTexto();
    tonoSuave += (tonoActual - tonoSuave) * (1 - Math.exp(-dt * 2));

    // el color de la estación, mezclado entre la actual y la siguiente
    const i0 = Math.floor(tonoSuave), i1 = Math.min(PALETA.length - 1, i0 + 1), f = tonoSuave - i0;
    colB.copy(PALETA[i0]).lerp(PALETA[i1], f);
    colA.copy(colB).multiplyScalar(.42).lerp(new THREE.Color('#1f6b58'), .35);
    fondo.copy(FONDO[0]).lerp(FONDO[1], progreso);
    renderer.setClearColor(fondo);
    cssLuz.copy(colB);
    document.documentElement.style.setProperty('--luz', '#' + cssLuz.getHexString());

    const t = tCamara(progreso);
    camino.getPointAt(t, pos);
    camino.getPointAt(Math.min(1, t + .03), ver);
    miradaSuave.lerp(mirada, 1 - Math.exp(-dt * 2.5));
    camara.position.copy(pos);
    ver.x += miradaSuave.x * 6; ver.y -= miradaSuave.y * 4;
    camara.lookAt(ver);
    if (!QUIETO) camara.rotateZ(Math.sin(tiempo * .21) * .035);

    // la guía flota un poco adelante, con su propio vaivén
    camino.getPointAt(Math.min(.995, t + .022), ver);
    guia.position.copy(ver).add(new THREE.Vector3(Math.sin(tiempo * .9) * .7, Math.cos(tiempo * 1.3) * .45 - .4, 0));
    halo.position.copy(guia.position);
    guia.material.color.copy(colB).lerp(new THREE.Color('#ffffff'), .6);
    halo.material.color.copy(colB);

    comunes.uTiempo.value = tiempo;
    comunes.uProg.value = t;
    comunes.uCam.value.copy(camara.position);
    comunes.uColA.value.copy(colA);
    comunes.uColB.value.copy(colB);

    renderer.render(escena, camara);
    requestAnimationFrame(cuadro);
  }
  requestAnimationFrame(cuadro);
  document.fonts?.ready.then(colocarVainas);
}
