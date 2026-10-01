/* Fran en papel · boceto. El motor: cámara, paralaje, caminar, mirar
   y hablar. Sin dependencias: de mal.js solo hace falta el sprite.

   El mundo mide 6400 × 720 unidades. Todo lo que se mueve vive en esas
   unidades y la pantalla las escala de una vez (`s`); los globos y el
   aviso de «Mirar» van en píxeles de pantalla para que se lean igual en
   un teléfono que en un monitor. */
(() => {
  'use strict';

  const H = 720;          // alto del mundo
  const PIE = 628;        // dónde pisa Fran
  const VEL = 330;        // al paso, unidades por segundo
  const CERCA = 120;      // desde dónde se puede mirar una cosa

  const raiz = document.documentElement;
  raiz.classList.add('papel-js');
  const $ = (sel, r) => (r || document).querySelector(sel);
  const $$ = (sel, r) => Array.from((r || document).querySelectorAll(sel));
  const limita = (v, a, b) => Math.min(Math.max(v, a), b);
  const quieto = matchMedia('(prefers-reduced-motion: reduce)');
  const tactil = matchMedia('(pointer: coarse)');
  const oscuroSO = matchMedia('(prefers-color-scheme: dark)');

  const esc = $('#escenario');
  const mundo = $('#mundo');
  const W = +mundo.dataset.ancho;
  const capas = $$('.capa', mundo).map((el) => ({ el, p: +el.dataset.p }));
  const franEl = $('#fran');
  const giro = $('.fran__giro', franEl);
  const astEl = $('#asterisco');
  const globo = $('#globo');
  const globoQuien = $('#globo-quien');
  const globoTexto = $('#globo-texto');
  const voz = $('#voz');
  const accion = $('#accion');
  const portada = $('#portada');
  const panel = $('#panel');
  const panelCuerpo = $('#panel-cuerpo');
  const panelLugar = $('#panel-lugar');
  const premio = $('#premio');
  const mapa = $('#mapa');
  const temaBtn = $('#tema');
  const hud = $('.papel-hud');

  /* ─── el inventario: estaciones y puntos, leídos del HTML ───── */
  const estaciones = $$('.estacion', mundo).map((el) => ({
    el,
    nombre: el.dataset.nombre,
    x0: el.offsetLeft,
    x1: el.offsetLeft + el.offsetWidth,
    abierta: el.classList.contains('abierta'),
    puntos: [],
    boton: null,
  }));
  const puntos = $$('.punto', mundo).map((el) => {
    const est = estaciones.find((e) => e.el.contains(el));
    const p = {
      el, est,
      id: el.dataset.id,
      nombre: el.dataset.nombre,
      frase: el.dataset.frase,
      nota: el.dataset.nota,
      x: est.x0 + el.offsetLeft + el.offsetWidth / 2,
      dicho: false,
      visto: false,
    };
    est.puntos.push(p);
    return p;
  });

  const st = {
    x: 300, dir: 1, meta: null, vel: VEL, abrirAl: null,
    cam: 0, izq: false, der: false, andando: false,
    activo: null, portada: true, movido: false, habla: null, pendiente: null,
  };
  const ast = { x: 230, y: PIE - 205 };

  /* ─── escala ─────────────────────────────────────────────────── */
  let s = 1, vw = 0, vh = 0, verAncho = 0, offY = 0, techo = 0;
  function medir() {
    vw = esc.clientWidth;
    vh = esc.clientHeight;
    /* en vertical se acerca un poco: se ve menos mundo, pero se lee */
    s = limita(Math.min(vh / H, vw / (vw < vh ? 460 : 520)), 0.45, 1.6);
    verAncho = vw / s;
    offY = vh - H * s;
    techo = hud.getBoundingClientRect().bottom + 8;
    mundo.style.transform = `translate3d(0,${offY.toFixed(1)}px,0) scale(${s.toFixed(4)})`;
    if (!globo.hidden) medirGlobo();
  }

  /* ─── los fondos, generados ──────────────────────────────────── */
  function azar(semilla) {
    let a = semilla >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const n1 = (v) => v.toFixed(1);
  const bulto = (x, c, alto, ancho) => alto * Math.exp(-((x - c) ** 2) / (2 * ancho * ancho));
  function lienzo(sel, ancho, html) {
    const svg = $(sel);
    svg.setAttribute('viewBox', `0 0 ${ancho} ${H}`);
    svg.setAttribute('width', ancho);
    svg.setAttribute('height', H);
    svg.parentElement.style.width = ancho + 'px';
    svg.innerHTML = html;
  }
  /* una cresta cerrada por abajo, muestreada cada `paso` unidades */
  function cresta(ancho, y, paso = 40) {
    let d = `M0 ${H} `;
    for (let x = 0; x <= ancho + paso; x += paso) d += `L${x} ${n1(y(x))} `;
    return d + `L${ancho + paso} ${H} Z`;
  }
  /* la nieve: el trozo de cresta por encima de `cota`, con el borde
     de abajo en dientes de sierra */
  function nieve(y, desde, hasta, cota) {
    const arriba = [];
    for (let x = desde; x <= hasta; x += 6) if (y(x) < cota) arriba.push([x, y(x)]);
    if (arriba.length < 2) return '';
    const [xa] = arriba[0];
    const [xb] = arriba[arriba.length - 1];
    let d = `M${xa} ${cota} `;
    for (const [x, yy] of arriba) d += `L${x} ${n1(yy)} `;
    for (let x = xb, i = 0; x > xa; x -= 18, i++) d += `L${x} ${cota + (i % 2 ? 16 : 2)} `;
    return `<path class="f-nieve" d="${d}Z"/>`;
  }

  function fondoLejos() {
    const ancho = Math.ceil(W * 0.12 + 6400);
    /* fila de atrás: el Cotopaxi, cono casi perfecto, y el Antisana */
    const yA = (x) => {
      const base = 400 + 22 * Math.sin(x / 290) + 12 * Math.sin(x / 97 + 2) - bulto(x, 5200, 190, 260);
      const cono = 150 + Math.max(0, Math.abs(x - 2000) - 14) * 0.55;
      return Math.min(base, cono);
    };
    /* fila de delante: el Pichincha, Rucu y Guagua, detrás de la ciudad */
    const yB = (x) => 470 + 30 * Math.sin(x / 340 + 1) + 16 * Math.sin(x / 120)
      - bulto(x, 700, 230, 150) - bulto(x, 960, 200, 120)
      - bulto(x, 3600, 150, 260) - bulto(x, 6200, 170, 220);
    let html = `<path class="f-lejos" d="${cresta(ancho, yA)}"/>`;
    html += nieve(yA, 1700, 2300, 214) + nieve(yA, 4800, 5600, 238);
    html += `<path class="f-lejos-2" d="${cresta(ancho, yB)}"/>`;
    /* el TelefériQo sube por la ladera */
    const [x0, y0, x1, y1] = [430, yB(430) + 4, 650, yB(650) - 6];
    html += `<path class="f-cable" d="M${x0} ${n1(y0)} L${x1} ${n1(y1)}"/>`;
    for (const t of [0.28, 0.55, 0.8]) {
      const cx = x0 + (x1 - x0) * t;
      const cy = y0 + (y1 - y0) * t;
      html += `<path class="f-cable" d="M${n1(cx)} ${n1(cy)} v8"/><rect class="f-cabina" x="${n1(cx - 6)}" y="${n1(cy + 8)}" width="12" height="9" rx="2"/>`;
    }
    /* nubes de papel */
    const r = azar(5);
    for (let i = 0; i < 7; i++) {
      const cx = 260 + i * 1050 + r() * 300;
      const cy = 110 + r() * 110;
      const k = 0.7 + r() * 0.6;
      html += `<g class="corte"><path class="f-nube" d="M${n1(cx - 70 * k)} ${n1(cy + 18 * k)} `
        + `a${n1(26 * k)} ${n1(26 * k)} 0 0 1 ${n1(34 * k)} -${n1(30 * k)} `
        + `a${n1(36 * k)} ${n1(36 * k)} 0 0 1 ${n1(66 * k)} -${n1(8 * k)} `
        + `a${n1(26 * k)} ${n1(26 * k)} 0 0 1 ${n1(40 * k)} ${n1(38 * k)} Z"/></g>`;
    }
    lienzo('#fondo-lejos', ancho, html);
  }

  function basilica(x) {
    return `<path class="f-ciudad" d="M${x - 110} 600 V450 L${x} 410 L${x + 110} 450 V600 Z`
      + ` M${x - 112} 600 V334 H${x - 68} V600 Z M${x + 68} 600 V334 H${x + 112} V600 Z`
      + ` M${x - 116} 334 L${x - 90} 262 L${x - 64} 334 Z M${x + 64} 334 L${x + 90} 262 L${x + 116} 334 Z`
      + ` M${x - 8} 420 V380 H${x + 8} V420 Z"/>`
      + `<circle class="f-ventana" cx="${x}" cy="476" r="15"/>`
      + `<rect class="f-ventana" x="${x - 96}" y="360" width="12" height="24" rx="6"/>`
      + `<rect class="f-ventana" x="${x + 84}" y="360" width="12" height="24" rx="6"/>`;
  }
  function panecillo(x) {
    return `<path class="f-ciudad" d="M${x - 340} 600 Q${x} 470 ${x + 340} 600 Z`
      + ` M${x - 8} 538 V506 H${x + 8} V538 Z`
      + ` M${x - 9} 506 L${x - 4} 468 H${x + 4} L${x + 9} 506 Z`
      + ` M${x - 4} 478 L${x - 24} 460 L${x - 7} 492 Z M${x + 4} 478 L${x + 24} 460 L${x + 7} 492 Z"/>`
      + `<circle class="f-ciudad" cx="${x}" cy="463" r="5"/>`;
  }
  function fondoMedio() {
    const ancho = Math.ceil(W * 0.35 + 6400);
    const hitos = [[820, 'b'], [2300, 'p'], [4700, 'b'], [6500, 'p']];
    const r = azar(3);
    let casas = '', ventanas = '', html = '';
    for (const [x, t] of hitos) html += t === 'b' ? basilica(x) : panecillo(x);
    for (let x = -20; x < ancho;) {
      const w = 40 + r() * 60;
      const cerca = hitos.find(([hx]) => Math.abs(x + w / 2 - hx) < (Math.abs(x - hx) < 400 ? 150 : 0));
      const bajo = hitos.some(([hx, t]) => t === 'p' && Math.abs(x + w / 2 - hx) < 220);
      if (cerca) { x += 40; continue; }
      const h = bajo ? 28 + r() * 18 : 45 + r() * 85;
      const y = 600 - h;
      casas += `M${n1(x)} 600 V${n1(y)} H${n1(x + w)} V600 Z `;
      if (r() < 0.6) casas += `M${n1(x - 4)} ${n1(y)} L${n1(x + w / 2)} ${n1(y - 16 - r() * 14)} L${n1(x + w + 4)} ${n1(y)} Z `;
      for (let fy = y + 12; fy < 586; fy += 28) {
        for (let fx = x + 9; fx < x + w - 14; fx += 20) {
          if (r() < 0.42) ventanas += `M${n1(fx)} ${n1(fy)} h7 v10 h-7 Z `;
        }
      }
      if (r() < 0.12) casas += `M${n1(x + w + 10)} 600 V572 h4 V600 Z M${n1(x + w + 12)} 556 m-16 0 a16 16 0 1 0 32 0 a16 16 0 1 0 -32 0 Z `;
      x += w + r() * 14;
    }
    html = `<path class="f-ciudad" d="${casas}"/>` + html + `<path class="f-ventana" d="${ventanas}"/>`;
    lienzo('#fondo-medio', ancho, html);
  }

  function fondoFrente() {
    const ancho = Math.ceil(W * 1.3 + 6400);
    const r = azar(9);
    let html = '', d = '';
    /* faroles coloniales: de noche se encienden */
    for (let x = 1100; x < ancho; x += 1250 + r() * 400) {
      html += `<circle class="f-halo" cx="${n1(x + 42)}" cy="420" r="110"/>`;
      d += `M${n1(x - 5)} 720 V398 H${n1(x + 5)} V720 Z M${n1(x - 13)} 720 V690 H${n1(x + 13)} V720 Z`
        + ` M${n1(x)} 404 Q${n1(x + 6)} 386 ${n1(x + 42)} 388 V392 Q${n1(x + 10)} 392 ${n1(x + 4)} 408 Z`
        + ` M${n1(x + 28)} 398 H${n1(x + 56)} L${n1(x + 42)} 380 Z M${n1(x + 30)} 444 H${n1(x + 54)} V450 H${n1(x + 30)} Z `;
      html += `<path class="f-farol" d="M${n1(x + 30)} 398 H${n1(x + 54)} L${n1(x + 58)} 414 L${n1(x + 52)} 444 H${n1(x + 32)} L${n1(x + 26)} 414 Z"/>`;
    }
    /* pencos —el agave de la Sierra— con su chaguarquero de vez en cuando */
    for (let x = 520; x < ancho; x += 1500 + r() * 700) {
      for (let i = 0; i < 9; i++) {
        const a = (-75 + i * 18.75) * Math.PI / 180;
        const l = 70 + r() * 50;
        const tx = x + Math.sin(a) * l;
        const ty = 722 - Math.cos(a) * l;
        const nx = Math.cos(a) * 9;
        const ny = Math.sin(a) * 9;
        d += `M${n1(x - nx)} ${n1(722 - ny)} L${n1(tx)} ${n1(ty)} L${n1(x + nx)} ${n1(722 + ny)} Z `;
      }
      if (r() < 0.6) d += `M${n1(x - 3)} 690 L${n1(x - 1)} 470 H${n1(x + 1)} L${n1(x + 3)} 690 Z M${n1(x - 18)} 500 Q${n1(x)} 470 ${n1(x + 18)} 500 Q${n1(x)} 490 ${n1(x - 18)} 500 Z `;
    }
    /* hierba */
    for (let x = 60; x < ancho; x += 150 + r() * 220) {
      const h = 26 + r() * 26;
      d += `M${n1(x)} 722 Q${n1(x - 2)} ${n1(722 - h * 0.6)} ${n1(x - 12)} ${n1(722 - h)} Q${n1(x + 3)} ${n1(722 - h * 0.5)} ${n1(x + 6)} 722 Z`
        + ` M${n1(x + 4)} 722 Q${n1(x + 6)} ${n1(722 - h)} ${n1(x + 16)} ${n1(722 - h * 1.15)} Q${n1(x + 12)} ${n1(722 - h * 0.5)} ${n1(x + 12)} 722 Z `;
    }
    html += `<path class="f-frente" d="${d}"/>`;
    lienzo('#fondo-frente', ancho, html);
  }

  /* El QR del teléfono de Deuna!: tres ojos fijos y el resto al azar */
  function qr() {
    const g = $('#qr');
    if (!g) return;
    const n = 21;
    const t = 60 / n;
    const r = azar(11);
    const ojos = [[0, 0], [14, 0], [0, 14]];
    let d = '';
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        let on = null;
        for (const [ox, oy] of ojos) {
          const dx = x - ox, dy = y - oy;
          if (dx >= -1 && dy >= -1 && dx <= 7 && dy <= 7) {
            const dentro = dx >= 0 && dy >= 0 && dx <= 6 && dy <= 6;
            on = dentro && (dx === 0 || dy === 0 || dx === 6 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4));
          }
        }
        if (on === null) on = r() < 0.48;
        if (on) d += `M${n1(x * t)} ${n1(y * t)}h${t.toFixed(2)}v${t.toFixed(2)}h-${t.toFixed(2)}Z`;
      }
    }
    g.innerHTML = `<path class="o sin" d="${d}"/>`;
  }

  /* ─── hablar ─────────────────────────────────────────────────── */
  let cola = [];
  let relojVoz = 0;
  let globoW = 0, globoH = 0;
  function decir(lineas) {
    cola = lineas.filter(Boolean);
    siguiente();
  }
  function callar() {
    cola = [];
    clearTimeout(relojVoz);
    globo.hidden = true;
    st.habla = null;
    astEl.classList.remove('asterisco--habla');
  }
  function medirGlobo() {
    globoW = globo.offsetWidth;
    globoH = globo.offsetHeight;
  }
  function siguiente() {
    clearTimeout(relojVoz);
    const linea = cola.shift();
    astEl.classList.remove('asterisco--habla');
    if (!linea) { globo.hidden = true; st.habla = null; return; }
    const [quien, texto] = linea;
    st.habla = quien;
    globo.className = 'globo globo--' + quien;
    globoQuien.textContent = quien === 'fran' ? 'Fran' : 'Nota al pie';
    globoTexto.textContent = texto;
    voz.textContent = (quien === 'fran' ? 'Fran: ' : 'Nota al pie: ') + texto;
    globo.hidden = false;
    void globo.offsetWidth;
    globo.classList.add('globo--entra');
    medirGlobo();
    if (quien === 'nota') astEl.classList.add('asterisco--habla');
    colocarGlobo();
    relojVoz = setTimeout(siguiente, limita(texto.length * 62, 2400, 5200));
  }
  function colocarGlobo() {
    const fran = st.habla === 'fran';
    const ax = fran ? st.x : ast.x;
    const ay = fran ? PIE - 176 : ast.y - 32;
    const sx = (ax - st.cam) * s;
    const sy = offY + ay * s;
    const left = limita(sx - globoW / 2, 16, Math.max(16, vw - globoW - 16));
    const top = Math.max(sy - globoH - 14, techo);
    globo.style.transform = `translate3d(${left.toFixed(1)}px,${top.toFixed(1)}px,0)`;
    globo.style.setProperty('--cola', limita(sx - left, 22, globoW - 22).toFixed(1) + 'px');
  }

  /* ─── moverse ────────────────────────────────────────────────── */
  function voltear(d) {
    if (!d || d === st.dir) return;
    st.dir = d;
    giro.style.setProperty('--dir', d);
  }
  function irA(x, abrirAl) {
    st.meta = limita(x, 50, W - 50);
    st.abrirAl = abrirAl || null;
    /* lejos se corre: un viaje largo nunca pasa de un par de segundos */
    st.vel = limita(Math.abs(st.meta - st.x) * 0.9, VEL, 1700);
    /* lo que se decía en el sitio de antes se queda allí */
    if (st.vel > VEL * 1.5) callar();
  }
  function ir(p, abrirlo) {
    empezar();
    if (abrirlo && Math.abs(p.x - st.x) < 100) {
      st.meta = null;
      voltear(Math.sign(p.x - st.x));
      abrir(p);
      return;
    }
    irA(p.x + (st.x < p.x ? -78 : 78), abrirlo ? p : null);
  }
  function llegar() {
    st.vel = VEL;
    const p = st.abrirAl;
    st.abrirAl = null;
    if (p) {
      voltear(Math.sign(p.x - st.x));
      abrir(p);
    }
  }
  function mover(dt) {
    const antes = st.x;
    if (st.izq !== st.der) {
      st.meta = null;
      st.abrirAl = null;
      st.vel = VEL;
      const d = st.der ? 1 : -1;
      voltear(d);
      st.x = limita(st.x + d * VEL * dt, 50, W - 50);
    } else if (st.meta !== null) {
      const falta = st.meta - st.x;
      voltear(Math.sign(falta));
      if (Math.abs(falta) <= st.vel * dt) {
        st.x = st.meta;
        st.meta = null;
        llegar();
      } else {
        st.x += Math.sign(falta) * st.vel * dt;
      }
    }
    const anda = st.x !== antes;
    if (anda !== st.andando) {
      st.andando = anda;
      franEl.classList.toggle('fran--anda', anda);
    }
    if (anda) franEl.style.setProperty('--paso', st.vel > 600 ? '.2s' : '.42s');
    proximidad();
  }
  function camara(dt) {
    const max = Math.max(0, W - verAncho);
    const obj = limita(st.x - verAncho * 0.4, 0, max);
    st.cam += (obj - st.cam) * (1 - Math.pow(0.002, dt));
    if (Math.abs(obj - st.cam) < 0.05) st.cam = obj;
  }

  /* ─── lo que hay cerca ───────────────────────────────────────── */
  function proximidad() {
    let mejor = null;
    let dm = CERCA;
    for (const p of puntos) {
      const d = Math.abs(p.x - st.x);
      if (d < dm) { dm = d; mejor = p; }
    }
    if (mejor === st.activo) return;
    if (st.activo) st.activo.el.classList.remove('activo');
    st.activo = mejor;
    if (mejor) {
      mejor.el.classList.add('activo');
      /* la frase sale una vez, y no si Fran pasa corriendo */
      if (!mejor.dicho && !st.portada && st.vel <= VEL && !st.abrirAl) {
        mejor.dicho = true;
        decir([['fran', mejor.frase], mejor.nota && ['nota', mejor.nota]]);
      }
    }
    pintarAccion();
  }
  function pintarAccion() {
    const p = st.activo;
    if (!p || st.portada || panel.open) { accion.hidden = true; return; }
    accion.innerHTML = (tactil.matches
      ? '<svg class="icono" aria-hidden="true"><use href="#i-ojo"/></svg>'
      : '<kbd>E</kbd>') + 'Mirar <b></b>';
    accion.querySelector('b').textContent = p.nombre;
    accion.hidden = false;
  }

  /* ─── el libro desplegable ───────────────────────────────────── */
  function desplegar() {
    const izq = st.cam - 200;
    const der = st.cam + verAncho * 0.92;
    for (const e of estaciones) {
      const vista = e.x0 < der && e.x1 > izq;
      const lejos = e.x1 < st.cam - 700 || e.x0 > st.cam + verAncho + 700;
      if (vista && !e.abierta) { e.abierta = true; e.el.classList.add('abierta'); }
      else if (lejos && e.abierta) { e.abierta = false; e.el.classList.remove('abierta'); }
    }
  }

  /* ─── el mapa ────────────────────────────────────────────────── */
  let lugar = null;
  function marcarLugar() {
    let mejor = null;
    let dm = Infinity;
    for (const e of estaciones) {
      const d = st.x < e.x0 ? e.x0 - st.x : st.x > e.x1 ? st.x - e.x1 : 0;
      if (d < dm) { dm = d; mejor = e; }
    }
    if (mejor === lugar) return;
    if (lugar) lugar.boton.removeAttribute('aria-current');
    lugar = mejor;
    lugar.boton.setAttribute('aria-current', 'location');
  }
  for (const e of estaciones) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = e.nombre;
    b.addEventListener('click', () => {
      empezar();
      st.movido = true;
      irA(e.puntos.length ? e.puntos[0].x - 90 : (e.x0 + e.x1) / 2);
    });
    mapa.append(b);
    e.boton = b;
  }
  function progreso() {
    const n = puntos.filter((p) => p.visto).length;
    $('#visto').textContent = n + '/' + puntos.length;
    $('#visto-barra').style.width = (n / puntos.length) * 100 + '%';
    for (const e of estaciones) e.boton.classList.toggle('hecho', e.puntos.every((p) => p.visto));
  }

  /* ─── mirar una cosa ─────────────────────────────────────────── */
  function mirar() {
    if (!st.activo) return;
    voltear(Math.sign(st.activo.x - st.x));
    abrir(st.activo);
  }
  function sincronizaCajones() {
    const m = raiz.dataset.marca || 'mal';
    $$('[data-marca-pon]', panelCuerpo).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.marcaPon === m)));
  }
  function abrir(p) {
    const t = $('#t-' + p.id);
    if (!t) return;
    callar();
    st.izq = st.der = false;
    st.meta = null;
    panelCuerpo.replaceChildren(t.content.cloneNode(true));
    panelLugar.textContent = p.est.nombre + ' · ' + p.nombre;
    sincronizaCajones();
    accion.hidden = true;
    panel.showModal();
    panel.scrollTop = 0;
    p.dicho = true;
    if (!p.visto) {
      p.visto = true;
      p.el.classList.add('visto');
      progreso();
    }
  }
  panel.addEventListener('click', (e) => {
    if (e.target.closest('[data-cierra]')) { panel.close(); return; }
    /* clic en el telón de fondo */
    const r = panel.getBoundingClientRect();
    if (e.target === panel && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) panel.close();
  });
  panel.addEventListener('close', () => {
    pintarAccion();
    if (st.pendiente) { decir(st.pendiente); st.pendiente = null; }
    if (!premiado && puntos.every((p) => p.visto)) {
      premiado = true;
      setTimeout(mostrarPremio, 300);
    }
  });

  /* los cajones del archivo cambian el tema del sistema entero */
  const CAJONES = {
    mal: '*De vuelta a casa: crema, rojo y filete fino.',
    mercio: '*Tema EL MERCIO.: página blanca, serif y cero sombras.',
    apps: '*Tema APPS: el de Quanto y Mi Huerto.',
    juegos: '*Tema Juegos: rosa, contorno grueso, de juguete.',
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-marca-pon]');
    if (!b) return;
    const m = b.dataset.marcaPon;
    if (m === 'mal') raiz.removeAttribute('data-marca');
    else raiz.dataset.marca = m;
    sincronizaCajones();
    st.pendiente = [['nota', CAJONES[m]]];
    setTimeout(() => panel.close(), 180);
  });

  /* ─── el premio ──────────────────────────────────────────────── */
  let premiado = false;
  function mostrarPremio() {
    callar();
    premio.hidden = false;
    $('#premio-cta').focus({ preventScroll: true });
  }
  function cerrarPremio() {
    premio.hidden = true;
    decir([['nota', '*Eso era todo. Lo del café va en serio.']]);
  }
  premio.addEventListener('click', (e) => { if (!e.target.closest('a')) cerrarPremio(); });

  /* ─── día y noche ────────────────────────────────────────────── */
  const esNoche = () => (raiz.dataset.tema ? raiz.dataset.tema === 'oscuro' : oscuroSO.matches);
  function pintarTema() {
    const noche = esNoche();
    temaBtn.setAttribute('aria-label', noche ? 'Pasar al día' : 'Pasar a la noche');
    const uso = temaBtn.querySelector('use');
    if (uso) uso.setAttribute('href', noche ? '#i-sol' : '#i-luna');
  }
  temaBtn.addEventListener('click', () => {
    const noche = !esNoche();
    raiz.dataset.tema = noche ? 'oscuro' : 'claro';
    try { localStorage.setItem('papel-tema', raiz.dataset.tema); } catch (err) { /* modo privado */ }
    pintarTema();
    decir(noche
      ? [['fran', 'De noche escribo.'], ['nota', '*Y el mundo se vuelve Limbo.']]
      : [['fran', 'De día diseño productos.'], ['nota', '*Vuelve el papel.']]);
  });
  try {
    const t = localStorage.getItem('papel-tema');
    if (t === 'claro' || t === 'oscuro') raiz.dataset.tema = t;
  } catch (err) { /* nada */ }
  /* Si quien aloja la página marca su propio tema (`data-theme`), se sigue. */
  const espejo = () => {
    const t = raiz.getAttribute('data-theme');
    if (t === 'dark') raiz.dataset.tema = 'oscuro';
    else if (t === 'light') raiz.dataset.tema = 'claro';
    pintarTema();
  };
  new MutationObserver(espejo).observe(raiz, { attributes: true, attributeFilter: ['data-theme'] });
  if (raiz.hasAttribute('data-theme')) espejo();
  if (oscuroSO.addEventListener) oscuroSO.addEventListener('change', pintarTema);

  /* ─── empezar ────────────────────────────────────────────────── */
  let relojPista = 0;
  function empezar() {
    if (!st.portada) return;
    st.portada = false;
    portada.classList.add('portada--fuera');
    setTimeout(() => { portada.hidden = true; }, 460);
    decir([
      ['nota', '*Hola. Soy la nota al pie: Fran habla, yo aclaro.'],
      ['fran', 'Esto es mi portafolio. Se recorre caminando.'],
    ]);
    pintarAccion();
    relojPista = setTimeout(() => {
      if (st.movido) return;
      decir([['nota', tactil.matches
        ? '*Pista: toca el suelo para caminar y las cosas para mirarlas.'
        : '*Pista: ← → para caminar, E para mirar.']]);
    }, 9000);
  }
  $('#empezar').addEventListener('click', () => {
    empezar();
    /* el primer paso lo da solo: hasta el letrero */
    st.movido = true;
    clearTimeout(relojPista);
    irA(puntos[0].x - 78);
  });
  $('#marca').addEventListener('click', (e) => {
    e.preventDefault();
    empezar();
    irA(300);
  });
  accion.addEventListener('click', mirar);

  /* ─── teclado ────────────────────────────────────────────────── */
  const IZQ = new Set(['ArrowLeft', 'KeyA']);
  const DER = new Set(['ArrowRight', 'KeyD']);
  const MIRA = new Set(['KeyE', 'ArrowUp', 'KeyW']);
  addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (!premio.hidden) {
      if (e.key === 'Escape') cerrarPremio();
      return;
    }
    if (panel.open) return;
    const sobreControl = e.target.closest && e.target.closest('button, a, input, select, textarea');
    if (IZQ.has(e.code) || DER.has(e.code)) {
      empezar();
      st.movido = true;
      clearTimeout(relojPista);
      if (IZQ.has(e.code)) st.izq = true; else st.der = true;
      e.preventDefault();
    } else if (MIRA.has(e.code) || (!sobreControl && (e.key === 'Enter' || e.key === ' '))) {
      if (st.portada) empezar(); else mirar();
      e.preventDefault();
    }
  });
  addEventListener('keyup', (e) => {
    if (IZQ.has(e.code)) st.izq = false;
    if (DER.has(e.code)) st.der = false;
  });
  addEventListener('blur', () => { st.izq = st.der = false; });

  /* ─── ratón y dedo ───────────────────────────────────────────── */
  esc.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('.punto')) return;
    empezar();
    st.movido = true;
    clearTimeout(relojPista);
    const r = esc.getBoundingClientRect();
    irA(st.cam + (e.clientX - r.left) / s);
  });
  let porPuntero = false;
  for (const p of puntos) {
    p.el.addEventListener('pointerdown', () => { porPuntero = true; });
    p.el.addEventListener('click', () => { porPuntero = false; ir(p, true); });
    /* con Tab, la cámara va a buscar lo que tiene el foco */
    p.el.addEventListener('focus', () => { if (!porPuntero) ir(p, false); });
  }
  /* el navegador intenta desplazar el escenario para enseñar el foco:
     de eso se encarga la cámara */
  esc.addEventListener('scroll', () => { esc.scrollLeft = 0; esc.scrollTop = 0; });
  addEventListener('scroll', () => { if (scrollX || scrollY) scrollTo(0, 0); });

  /* ─── el bucle ───────────────────────────────────────────────── */
  let ultimo = performance.now();
  function pintar(t, dt) {
    for (const c of capas) c.el.style.transform = `translate3d(${(-st.cam * c.p).toFixed(2)}px,0,0)`;
    franEl.style.transform = `translate3d(${(st.x - 55).toFixed(2)}px,${PIE - 170}px,0)`;
    /* la nota al pie va detrás del hombro, con un poco de retraso */
    const fx = st.x - st.dir * 72;
    const fy = PIE - 205 + (quieto.matches ? 0 : Math.sin(t / 520) * 7);
    const k = 1 - Math.pow(0.03, dt);
    ast.x += (fx - ast.x) * k;
    ast.y += (fy - ast.y) * k;
    astEl.style.transform = `translate3d(${(ast.x - 28).toFixed(2)}px,${(ast.y - 28).toFixed(2)}px,0)`;
    desplegar();
    marcarLugar();
    if (!globo.hidden) colocarGlobo();
  }
  function cuadro(t) {
    const dt = Math.min((t - ultimo) / 1000, 0.05);
    ultimo = t;
    if (!panel.open && premio.hidden) mover(dt);
    camara(dt);
    pintar(t, dt);
    requestAnimationFrame(cuadro);
  }

  /* ─── arranque ───────────────────────────────────────────────── */
  addEventListener('resize', medir);
  medir();
  fondoLejos();
  fondoMedio();
  fondoFrente();
  qr();
  progreso();
  pintarTema();
  st.cam = limita(st.x - verAncho * 0.4, 0, Math.max(0, W - verAncho));
  ast.x = st.x - 72;
  pintar(performance.now(), 0);
  if (window.malDS && window.malDS.iconos) window.malDS.iconos();
  requestAnimationFrame((t) => { ultimo = t; cuadro(t); });
})();
