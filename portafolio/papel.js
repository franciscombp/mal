/* Fran en papel · boceto, segunda vuelta. El motor: cámara, paralaje,
   caminar, elegir una pieza y abrirla. Sin dependencias: de mal.js solo
   hace falta el sprite de iconos.

   El mundo mide 6400 × 720 unidades y se escala entero a la pantalla
   (`s`). La escala se calcula para que entre la franja que importa
   —de los rótulos de las salas a los pies de Fran— entre la barra de
   arriba y la ficha de abajo, así nada queda tapado en ningún tamaño.

   Tocar una pieza NO la abre: Fran va hasta ella y la ficha de abajo
   la presenta. Se abre con el botón de la ficha, con un segundo toque
   sobre la pieza o con E / Enter. Así, en el teléfono, explorar y
   abrir son dos gestos distintos. */
(() => {
  'use strict';

  const H = 720;              // alto del mundo
  const PIE = 628;            // dónde pisa Fran
  const VEL = 300;            // al paso, unidades por segundo
  const CERCA = 110;          // desde dónde una pieza está «a mano»
  const VISIBLE = [86, 652];  // la franja del mundo que tiene que verse entera
  const LADO = 80;            // a qué distancia de la pieza se para Fran

  const raiz = document.documentElement;
  raiz.classList.add('papel-js');
  const $ = (sel, r) => (r || document).querySelector(sel);
  const $$ = (sel, r) => Array.from((r || document).querySelectorAll(sel));
  const limita = (v, a, b) => Math.min(Math.max(v, a), b);
  const quieto = matchMedia('(prefers-reduced-motion: reduce)');
  const tactil = matchMedia('(pointer: coarse)');
  const oscuroSO = matchMedia('(prefers-color-scheme: dark)');
  const ancha = matchMedia('(min-width: 900px)');

  const esc = $('#escenario');
  const mundo = $('#mundo');
  const W = +mundo.dataset.ancho;
  const capas = $$('.capa', mundo).map((el) => ({ el, p: +el.dataset.p }));
  const franEl = $('#fran');
  const giro = $('.fran__giro', franEl);
  const hud = $('.papel-hud');
  const portada = $('#portada');
  const ficha = $('#ficha');
  const fichaSala = $('#ficha-sala');
  const fichaTitulo = $('#ficha-titulo');
  const fichaFrase = $('#ficha-frase');
  const fichaNota = $('#ficha-nota');
  const fichaVer = $('#ficha-ver');
  const fichaVerT = $('#ficha-ver-t');
  const fichaCta = $('#ficha-cta');
  const fichaAnt = $('#ficha-ant');
  const fichaSig = $('#ficha-sig');
  const panel = $('#panel');
  const panelCuerpo = $('#panel-cuerpo');
  const panelLugar = $('#panel-lugar');
  const panelN = $('#panel-n');
  const panelAnt = $('#panel-ant');
  const panelSig = $('#panel-sig');
  const indice = $('#indice');
  const indiceLista = $('#indice-lista');
  const capitulos = $('#capitulos');
  const temaBtn = $('#tema');

  /* ─── el inventario: salas y piezas, leídas del HTML ────────── */
  const salas = $$('.estacion', mundo).map((el) => ({
    el,
    num: el.dataset.num,
    nombre: el.dataset.nombre,
    lema: el.dataset.lema,
    x0: el.offsetLeft,
    x1: el.offsetLeft + el.offsetWidth,
    abierta: el.classList.contains('abierta'),
    piezas: [],
    boton: null,
  }));
  const piezas = $$('.punto', mundo).map((el) => {
    const sala = salas.find((e) => e.el.contains(el));
    const p = {
      el, sala,
      id: el.dataset.id,
      nombre: el.dataset.nombre,
      accion: el.dataset.accion || 'Ver',
      frase: el.dataset.frase,
      nota: el.dataset.nota || '',
      x: sala.x0 + el.offsetLeft + el.offsetWidth / 2,
      visto: false,
    };
    sala.piezas.push(p);
    return p;
  }).sort((a, b) => a.x - b.x);

  const st = {
    x: 240, dir: 1, meta: null, vel: VEL,
    cam: 0, izq: false, der: false, andando: false,
    cerca: null,        // la pieza a mano, por proximidad
    sel: null,          // la pieza elegida (tocada, Tab, flechas de la ficha)
    selDesde: 0,
    abierta: null,      // la pieza que muestra la hoja
    portada: true,
    fin: false,         // ya se vio todo: la ficha lo dice una vez
    finDicho: false,
  };

  /* ─── escala ─────────────────────────────────────────────────── */
  let s = 1, vw = 0, vh = 0, verAncho = 0, offY = 0;
  function medir() {
    vw = esc.clientWidth;
    vh = esc.clientHeight;
    const arriba = hud.getBoundingClientRect().bottom + 10;
    const abajo = vh - ficha.offsetHeight - 30;
    const franja = VISIBLE[1] - VISIBLE[0];
    s = limita(Math.min((abajo - arriba) / franja, vw / (vw < vh ? 430 : 520)), 0.4, 1.6);
    verAncho = vw / s;
    offY = abajo - VISIBLE[1] * s;
    mundo.style.transform = `translate3d(0,${offY.toFixed(1)}px,0) scale(${s.toFixed(4)})`;
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
  function cresta(ancho, y, paso = 40) {
    let d = `M0 ${H} `;
    for (let x = 0; x <= ancho + paso; x += paso) d += `L${x} ${n1(y(x))} `;
    return d + `L${ancho + paso} ${H} Z`;
  }
  function nieve(y, desde, hasta, cota) {
    const arriba = [];
    for (let x = desde; x <= hasta; x += 6) if (y(x) < cota) arriba.push([x, y(x)]);
    if (arriba.length < 2) return '';
    const xa = arriba[0][0];
    const xb = arriba[arriba.length - 1][0];
    let d = `M${xa} ${cota} `;
    for (const [x, yy] of arriba) d += `L${x} ${n1(yy)} `;
    for (let x = xb, i = 0; x > xa; x -= 16, i++) d += `L${x} ${cota + (i % 2 ? 12 : 2)} `;
    return `<path class="f-nieve" d="${d}Z"/>`;
  }

  function fondoLejos() {
    const ancho = Math.ceil(W * 0.12 + 6400);
    /* atrás, el Cotopaxi —un cono casi perfecto— y el Antisana */
    const yA = (x) => {
      const base = 400 + 22 * Math.sin(x / 290) + 12 * Math.sin(x / 97 + 2) - bulto(x, 5200, 190, 260);
      return Math.min(base, 150 + Math.max(0, Math.abs(x - 2000) - 14) * 0.55);
    };
    /* delante, el Pichincha detrás de la ciudad */
    const yB = (x) => 470 + 30 * Math.sin(x / 340 + 1) + 16 * Math.sin(x / 120)
      - bulto(x, 700, 230, 150) - bulto(x, 960, 200, 120)
      - bulto(x, 3600, 150, 260) - bulto(x, 6200, 170, 220);
    let html = `<path class="f-lejos" d="${cresta(ancho, yA)}"/>`;
    html += nieve(yA, 1700, 2300, 212) + nieve(yA, 4800, 5600, 236);
    html += `<path class="f-lejos-2 capa-papel" d="${cresta(ancho, yB)}"/>`;
    /* el TelefériQo sube por la ladera */
    const [x0, y0, x1, y1] = [430, yB(430) + 4, 650, yB(650) - 6];
    html += `<path class="f-cable" d="M${x0} ${n1(y0)} L${x1} ${n1(y1)}"/>`;
    for (const t of [0.3, 0.62]) {
      const cx = x0 + (x1 - x0) * t;
      const cy = y0 + (y1 - y0) * t;
      html += `<path class="f-cable" d="M${n1(cx)} ${n1(cy)} v6 M${n1(cx - 5)} ${n1(cy + 6)} h10 v8 h-10 Z"/>`;
    }
    lienzo('#fondo-lejos', ancho, html);
  }

  /* Quito, a línea: casas, la Basílica y el Panecillo */
  function basilica(x) {
    return `<path class="f-ciudad" d="M${x - 110} 600 V450 L${x} 410 L${x + 110} 450 V600 Z`
      + ` M${x - 112} 600 V334 H${x - 68} V600 Z M${x + 68} 600 V334 H${x + 112} V600 Z`
      + ` M${x - 116} 334 L${x - 90} 262 L${x - 64} 334 Z M${x + 64} 334 L${x + 90} 262 L${x + 116} 334 Z`
      + ` M${x - 8} 420 V384 H${x + 8} V420 Z"/>`
      + `<circle class="f-ciudad" cx="${x}" cy="476" r="15"/>`
      + `<path class="f-ciudad" d="M${x - 96} 360 h12 v24 h-12 Z M${x + 84} 360 h12 v24 h-12 Z M${x - 96} 420 h12 v24 h-12 Z M${x + 84} 420 h12 v24 h-12 Z"/>`;
  }
  function panecillo(x) {
    return `<path class="f-ciudad" d="M${x - 340} 600 Q${x} 470 ${x + 340} 600"/>`
      + `<path class="f-ciudad" d="M${x - 8} 538 V506 H${x + 8} V538 Z M${x - 9} 506 L${x - 4} 470 H${x + 4} L${x + 9} 506 Z`
      + ` M${x - 4} 480 L${x - 22} 463 L${x - 7} 492 Z M${x + 4} 480 L${x + 22} 463 L${x + 7} 492 Z"/>`
      + `<circle class="f-ciudad" cx="${x}" cy="465" r="5"/>`;
  }
  function fondoMedio() {
    const ancho = Math.ceil(W * 0.35 + 6400);
    const hitos = [[820, 'b'], [2300, 'p'], [4700, 'b'], [6500, 'p']];
    const r = azar(3);
    let casas = '', ventanas = '';
    for (let x = -20; x < ancho;) {
      const w = 44 + r() * 60;
      const centro = x + w / 2;
      if (hitos.some(([hx, t]) => t === 'b' && Math.abs(centro - hx) < 150)) { x += 40; continue; }
      const bajo = hitos.some(([hx, t]) => t === 'p' && Math.abs(centro - hx) < 230);
      const h = bajo ? 26 + r() * 16 : 42 + r() * 80;
      const y = 600 - h;
      casas += `M${n1(x)} 600 V${n1(y)} H${n1(x + w)} V600 `;
      if (r() < 0.55) casas += `M${n1(x - 3)} ${n1(y)} L${n1(x + w / 2)} ${n1(y - 14 - r() * 12)} L${n1(x + w + 3)} ${n1(y)} `;
      for (let fy = y + 12; fy < 584; fy += 26) {
        for (let fx = x + 9; fx < x + w - 14; fx += 19) {
          if (r() < 0.38) ventanas += `M${n1(fx)} ${n1(fy)} h6 v9 h-6 Z `;
        }
      }
      x += w + 2 + r() * 12;
    }
    let html = '';
    for (const [x, t] of hitos) html += t === 'b' ? basilica(x) : panecillo(x);
    html = `<path class="f-ciudad" d="${casas}"/>` + html + `<path class="f-ventana" d="${ventanas}"/>`;
    lienzo('#fondo-medio', ancho, html);
  }

  function fondoFrente() {
    const ancho = Math.ceil(W * 1.3 + 6400);
    const r = azar(9);
    let html = '', d = '';
    /* faroles, finos; de noche se encienden */
    for (let x = 1100; x < ancho; x += 1400 + r() * 500) {
      html += `<circle class="f-halo" cx="${n1(x + 30)}" cy="420" r="120"/>`;
      d += `M${n1(x)} 1200 V404 Q${n1(x)} 392 ${n1(x + 12)} 392 H${n1(x + 30)} `;
      html += `<path class="f-farol" d="M${n1(x + 20)} 398 H${n1(x + 40)} L${n1(x + 43)} 412 L${n1(x + 37)} 434 H${n1(x + 23)} L${n1(x + 17)} 412 Z"/>`;
    }
    html += `<path class="f-frente" d="${d}"/>`;
    lienzo('#fondo-frente', ancho, html);
  }

  /* El QR del teléfono de Deuna!: tres ojos fijos y el resto al azar */
  function qr() {
    const g = $('#qr');
    if (!g) return;
    const n = 21;
    const t = 50 / n;
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
    g.innerHTML = `<path class="t4 sin" d="${d}"/>`;
  }

  /* ─── moverse ────────────────────────────────────────────────── */
  function voltear(d) {
    if (!d || d === st.dir) return;
    st.dir = d;
    giro.style.setProperty('--dir', d);
  }
  function irA(x) {
    st.meta = limita(x, 50, W - 50);
    /* lejos se va más rápido: ningún trayecto pasa de un par de segundos */
    st.vel = limita(Math.abs(st.meta - st.x) * 0.8, VEL, 1400);
  }
  function parada(p) {
    return p.x + (st.x <= p.x ? -LADO : LADO);
  }
  function mover(dt) {
    const antes = st.x;
    if (st.izq !== st.der && !panel.open) {
      st.meta = null;
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
        st.vel = VEL;
        /* al llegar, mira hacia la pieza elegida */
        const p = st.abierta || st.sel;
        if (p) voltear(Math.sign(p.x - st.x));
      } else {
        st.x += Math.sign(falta) * st.vel * dt;
      }
    }
    const anda = st.x !== antes;
    if (anda !== st.andando) {
      st.andando = anda;
      franEl.classList.toggle('fran--anda', anda);
    }
    if (anda) franEl.style.setProperty('--paso', st.vel > 500 ? '.3s' : '.5s');
  }
  function camara(dt) {
    const max = Math.max(0, W - verAncho);
    let obj;
    if (panel.open && st.abierta && ancha.matches) {
      /* con la hoja abierta al lado, la pieza se centra en lo que queda */
      const libre = (vw - panel.offsetWidth) / s;
      obj = st.abierta.x - libre / 2;
    } else {
      obj = st.x - verAncho * 0.42;
    }
    obj = limita(obj, 0, max);
    st.cam += (obj - st.cam) * (1 - Math.pow(0.003, dt));
    if (Math.abs(obj - st.cam) < 0.05) st.cam = obj;
  }

  /* ─── qué hay a mano ─────────────────────────────────────────── */
  function proximidad() {
    let mejor = null;
    let dm = CERCA;
    for (const p of piezas) {
      const d = Math.abs(p.x - st.x);
      if (d < dm) { dm = d; mejor = p; }
    }
    if (mejor !== st.cerca) {
      st.cerca = mejor;
      pintarFicha();
    }
  }
  const actual = () => st.sel || st.cerca;
  let resaltada = null;
  function resaltar() {
    const p = actual();
    if (p === resaltada) return;
    if (resaltada) resaltada.el.classList.remove('activo');
    resaltada = p;
    if (p) p.el.classList.add('activo');
  }
  function vecina(dir) {
    const base = actual();
    if (base) return piezas[piezas.indexOf(base) + dir] || null;
    return dir > 0 ? piezas.find((p) => p.x > st.x + 10) || null
      : [...piezas].reverse().find((p) => p.x < st.x - 10) || null;
  }

  /* ─── la ficha de abajo ──────────────────────────────────────── */
  let fichaClave = '';
  function pintarFicha() {
    resaltar();
    /* al terminar, la ficha lo dice hasta que Fran se mueva o se elija otra pieza */
    const fin = st.fin && !st.finDicho && !st.sel;
    const p = fin ? null : actual();
    const clave = fin ? 'fin' : p ? p.id : 'sala:' + (lugar ? lugar.num : '');
    if (clave !== fichaClave) {
      fichaClave = clave;
      ficha.classList.remove('ficha--cambia');
      void ficha.offsetWidth;
      ficha.classList.add('ficha--cambia');
      if (fin) {
        fichaSala.textContent = 'Recorrido completo';
        fichaTitulo.textContent = 'Gracias por llegar hasta aquí.';
        fichaFrase.textContent = 'Si quieres hablar de producto o de tu portafolio, la mentoría es gratis.';
        fichaNota.textContent = '';
      } else if (p) {
        fichaSala.textContent = p.sala.num + ' · ' + p.sala.nombre;
        fichaTitulo.textContent = p.nombre;
        fichaFrase.textContent = p.frase;
        fichaNota.textContent = p.nota;
        fichaVerT.textContent = p.accion;
      } else if (lugar) {
        fichaSala.textContent = lugar.num + ' · ' + lugar.nombre;
        fichaTitulo.textContent = lugar.lema;
        fichaFrase.textContent = tactil.matches
          ? 'Toca una pieza para acercarte, o pasa de una a otra con las flechas.'
          : 'Camina con ← →, pasa de pieza en pieza con las flechas de aquí o con Tab.';
        fichaNota.textContent = '';
      }
    }
    fichaVer.hidden = !p || fin;
    fichaCta.hidden = !fin;
    fichaAnt.disabled = !vecina(-1);
    fichaSig.disabled = !vecina(1);
  }

  /* ─── elegir y abrir ─────────────────────────────────────────── */
  function elegir(p) {
    empezar();
    st.sel = p;
    st.selDesde = performance.now();
    st.finDicho = st.fin;
    const destino = parada(p);
    if (Math.abs(destino - st.x) > 4 && Math.abs(p.x - st.x) > LADO + 10) irA(destino);
    else voltear(Math.sign(p.x - st.x));
    pintarFicha();
  }
  function soltar() {
    const antes = st.sel || (st.fin && !st.finDicho);
    st.finDicho = st.fin;
    st.sel = null;
    if (antes) pintarFicha();
  }
  function marcarVisto(p) {
    if (p.visto) return;
    p.visto = true;
    p.el.classList.add('visto');
    progreso();
  }
  function abrir(p) {
    const t = $('#t-' + p.id);
    if (!t) return;
    empezar();
    st.abierta = p;
    st.sel = p;
    st.izq = st.der = false;
    if (Math.abs(p.x - st.x) > LADO + 10) irA(parada(p));
    panelCuerpo.replaceChildren(t.content.cloneNode(true));
    panelLugar.textContent = p.sala.num + ' · ' + p.sala.nombre;
    const i = piezas.indexOf(p);
    panelN.textContent = (i + 1) + ' / ' + piezas.length;
    panelAnt.disabled = i === 0;
    panelSig.disabled = i === piezas.length - 1;
    sincronizaTemas();
    if (!panel.open) {
      panel.showModal();
    } else {
      panelCuerpo.classList.remove('hoja__cuerpo--cambia');
      void panelCuerpo.offsetWidth;
      panelCuerpo.classList.add('hoja__cuerpo--cambia');
    }
    panelCuerpo.scrollTop = 0;
    marcarVisto(p);
    pintarFicha();
  }
  function cerrar(d) {
    if (!d.open || d.classList.contains('hoja--sale')) return;
    d.classList.add('hoja--sale');
    setTimeout(() => {
      d.classList.remove('hoja--sale');
      d.close();
    }, quieto.matches ? 0 : 200);
  }
  for (const d of [panel, indice]) {
    d.addEventListener('cancel', (e) => { e.preventDefault(); cerrar(d); });
    d.addEventListener('click', (e) => {
      if (e.target.closest('[data-cerrar]')) { cerrar(d); return; }
      if (e.target !== d) return;
      /* clic en el fondo, fuera de la hoja */
      const r = d.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) cerrar(d);
    });
  }
  panel.addEventListener('close', () => {
    st.abierta = null;
    if (!st.fin && piezas.every((p) => p.visto)) {
      st.fin = true;
      st.sel = null;
      st.cerca = null;
    }
    pintarFicha();
  });
  panelAnt.addEventListener('click', () => { const p = piezas[piezas.indexOf(st.abierta) - 1]; if (p) abrir(p); });
  panelSig.addEventListener('click', () => { const p = piezas[piezas.indexOf(st.abierta) + 1]; if (p) abrir(p); });
  fichaVer.addEventListener('click', () => { const p = actual(); if (p) abrir(p); });
  fichaAnt.addEventListener('click', () => { const p = vecina(-1); if (p) elegir(p); });
  fichaSig.addEventListener('click', () => { const p = vecina(1); if (p) elegir(p); });

  /* los temas del sistema: cambian la piel del mundo entero */
  function sincronizaTemas() {
    const m = raiz.dataset.marca || 'mal';
    $$('[data-marca-pon]', panelCuerpo).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.marcaPon === m)));
  }
  panelCuerpo.addEventListener('click', (e) => {
    const b = e.target.closest('[data-marca-pon]');
    if (!b) return;
    const m = b.dataset.marcaPon;
    if (m === 'mal') raiz.removeAttribute('data-marca');
    else raiz.dataset.marca = m;
    sincronizaTemas();
    requestAnimationFrame(medir);
  });

  /* ─── salas: capítulos arriba, índice y progreso ─────────────── */
  let lugar = null;
  function marcarLugar() {
    let mejor = null;
    let dm = Infinity;
    for (const e of salas) {
      const d = st.x < e.x0 ? e.x0 - st.x : st.x > e.x1 ? st.x - e.x1 : 0;
      if (d < dm) { dm = d; mejor = e; }
    }
    if (mejor === lugar) return;
    if (lugar) lugar.boton.removeAttribute('aria-current');
    lugar = mejor;
    lugar.boton.setAttribute('aria-current', 'location');
    if (!actual()) pintarFicha();
  }
  for (const e of salas) {
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = `<span>${e.num}</span>`;
    b.append(e.nombre);
    b.addEventListener('click', () => elegir(e.piezas[0]));
    capitulos.append(b);
    e.boton = b;
  }
  function pintarIndice() {
    indiceLista.replaceChildren(...salas.map((e) => {
      const li = document.createElement('li');
      const t = document.createElement('p');
      t.className = 'indice__sala';
      t.textContent = e.num + ' · ' + e.nombre;
      const ul = document.createElement('ul');
      for (const p of e.piezas) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = p.nombre;
        if (p.visto) {
          b.insertAdjacentHTML('beforeend', '<svg class="icono icono--s" aria-hidden="true"><use href="#i-check"/></svg>');
          b.setAttribute('aria-label', p.nombre + ', vista');
        }
        b.addEventListener('click', () => {
          cerrar(indice);
          setTimeout(() => abrir(p), quieto.matches ? 0 : 220);
        });
        const item = document.createElement('li');
        item.append(b);
        ul.append(item);
      }
      li.append(t, ul);
      return li;
    }));
  }
  $('#abrir-indice').addEventListener('click', () => {
    pintarIndice();
    indice.showModal();
  });
  function progreso() {
    const n = piezas.filter((p) => p.visto).length;
    $('#visto').textContent = n + '/' + piezas.length;
    for (const e of salas) e.boton.classList.toggle('hecha', e.piezas.every((p) => p.visto));
  }

  /* ─── el libro desplegable ───────────────────────────────────── */
  function desplegar() {
    const izq = st.cam - 200;
    const der = st.cam + verAncho * 0.95;
    for (const e of salas) {
      const vista = e.x0 < der && e.x1 > izq;
      const lejos = e.x1 < st.cam - 800 || e.x0 > st.cam + verAncho + 800;
      if (vista && !e.abierta) { e.abierta = true; e.el.classList.add('abierta'); }
      else if (lejos && e.abierta) { e.abierta = false; e.el.classList.remove('abierta'); }
    }
  }

  /* ─── día y noche ────────────────────────────────────────────── */
  const esNoche = () => (raiz.dataset.tema ? raiz.dataset.tema === 'oscuro' : oscuroSO.matches);
  function pintarTema() {
    const noche = esNoche();
    temaBtn.setAttribute('aria-label', noche ? 'Pasar al día' : 'Pasar a la noche');
    const uso = temaBtn.querySelector('use');
    if (uso) uso.setAttribute('href', noche ? '#i-sol' : '#i-luna');
  }
  temaBtn.addEventListener('click', () => {
    raiz.dataset.tema = esNoche() ? 'claro' : 'oscuro';
    try { localStorage.setItem('papel-tema', raiz.dataset.tema); } catch (err) { /* modo privado */ }
    pintarTema();
  });
  try {
    const t = localStorage.getItem('papel-tema');
    if (t === 'claro' || t === 'oscuro') raiz.dataset.tema = t;
  } catch (err) { /* nada */ }
  /* si quien aloja la página marca su propio tema (`data-theme`), se sigue */
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
  function empezar() {
    if (!st.portada) return;
    st.portada = false;
    portada.classList.add('portada--fuera');
    setTimeout(() => { portada.hidden = true; }, 500);
    ficha.removeAttribute('data-oculta');
    pintarFicha();
  }
  $('#empezar').addEventListener('click', () => {
    empezar();
    elegir(piezas[0]);
    fichaVer.focus({ preventScroll: true });
  });
  $('#marca').addEventListener('click', (e) => {
    e.preventDefault();
    elegir(piezas[0]);
  });

  /* ─── teclado ────────────────────────────────────────────────── */
  const IZQ = new Set(['ArrowLeft', 'KeyA']);
  const DER = new Set(['ArrowRight', 'KeyD']);
  const VER = new Set(['KeyE', 'ArrowUp', 'KeyW']);
  addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (indice.open) return;
    const sobreControl = e.target.closest && e.target.closest('button, a, input, select, textarea');
    if (panel.open) {
      /* con la hoja abierta, las flechas pasan de pieza */
      if (sobreControl && e.target.closest('.hoja__cuerpo')) return;
      if (IZQ.has(e.code) && !panelAnt.disabled) { panelAnt.click(); e.preventDefault(); }
      if (DER.has(e.code) && !panelSig.disabled) { panelSig.click(); e.preventDefault(); }
      return;
    }
    if (IZQ.has(e.code) || DER.has(e.code)) {
      empezar();
      soltar();
      if (IZQ.has(e.code)) st.izq = true; else st.der = true;
      e.preventDefault();
    } else if (VER.has(e.code) || (!sobreControl && (e.key === 'Enter' || e.key === ' '))) {
      const p = actual();
      if (st.portada) { $('#empezar').click(); } else if (p) abrir(p);
      e.preventDefault();
    }
  });
  addEventListener('keyup', (e) => {
    if (IZQ.has(e.code)) st.izq = false;
    if (DER.has(e.code)) st.der = false;
  });
  addEventListener('blur', () => { st.izq = st.der = false; });

  /* ─── ratón y dedo ───────────────────────────────────────────── */
  /* Tocar el suelo lleva a Fran hasta ahí; arrastrar lo lleva de la
     mano. Las piezas tienen su propio clic. */
  let arrastre = null;
  function destino(e) {
    const r = esc.getBoundingClientRect();
    irA(st.cam + (e.clientX - r.left) / s);
  }
  esc.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('.punto')) return;
    empezar();
    soltar();
    arrastre = e.pointerId;
    try { esc.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
    destino(e);
  });
  esc.addEventListener('pointermove', (e) => { if (arrastre === e.pointerId) destino(e); });
  const suelta = (e) => { if (arrastre === e.pointerId) arrastre = null; };
  esc.addEventListener('pointerup', suelta);
  esc.addEventListener('pointercancel', suelta);

  /* El foco solo mueve a Fran cuando se navega con Tab: al cerrar una
     hoja, el navegador devuelve el foco a la pieza que se tocó al
     principio, y eso no es una orden de ir hasta ella. */
  let conTab = false;
  addEventListener('keydown', (e) => { if (e.key === 'Tab') conTab = true; }, true);
  addEventListener('pointerdown', () => { conTab = false; }, true);
  for (const p of piezas) {
    p.el.addEventListener('click', (e) => {
      /* con teclado (detail 0), Enter abre; con dedo o ratón, el primer
         toque elige y acerca, y el segundo —ya allí— abre */
      const yaAhi = st.sel === p && performance.now() - st.selDesde > 450 && Math.abs(p.x - st.x) <= LADO + 12;
      if (e.detail === 0 || yaAhi) abrir(p);
      else elegir(p);
    });
    p.el.addEventListener('focus', () => { if (conTab && !panel.open && !indice.open) elegir(p); });
  }
  /* el navegador intenta desplazar el escenario para enseñar el foco:
     de eso se encarga la cámara */
  esc.addEventListener('scroll', () => { esc.scrollLeft = 0; esc.scrollTop = 0; });
  addEventListener('scroll', () => { if (scrollX || scrollY) scrollTo(0, 0); });

  /* ─── el bucle ───────────────────────────────────────────────── */
  let ultimo = performance.now();
  function pintar() {
    for (const c of capas) c.el.style.transform = `translate3d(${(-st.cam * c.p).toFixed(2)}px,0,0)`;
    franEl.style.transform = `translate3d(${(st.x - 40).toFixed(2)}px,${PIE - 176}px,0)`;
    desplegar();
    marcarLugar();
  }
  function cuadro(t) {
    const dt = Math.min((t - ultimo) / 1000, 0.05);
    ultimo = t;
    mover(dt);
    proximidad();
    camara(dt);
    pintar();
    requestAnimationFrame(cuadro);
  }

  /* ─── arranque ───────────────────────────────────────────────── */
  addEventListener('resize', medir);
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(medir);
    ro.observe(hud);
    ro.observe(ficha);
  }
  medir();
  fondoLejos();
  fondoMedio();
  fondoFrente();
  qr();
  progreso();
  pintarTema();
  st.cam = limita(st.x - verAncho * 0.42, 0, Math.max(0, W - verAncho));
  pintar();
  pintarFicha();
  if (window.malDS && window.malDS.iconos) window.malDS.iconos();
  requestAnimationFrame((t) => { ultimo = t; cuadro(t); });
})();
