/* Cuentan que… · seis leyendas para armar.

   Cada leyenda es un módulo con su cuento y su puzzle. El módulo recibe un
   contenedor vacío y una `api` —estado(texto), controles(nodos), gana()— y
   devuelve una función para desmontarse. El resto (mapa, rutas, estampas)
   es igual para todas.

   Sin dependencias: de mal.js solo hace falta el sprite de iconos. Todo
   el dibujo es SVG, con viewBox fijo, así que el tablero se escala solo. */
(() => {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const $ = (sel, r) => (r || document).querySelector(sel);
  const azar = (n) => Math.floor(Math.random() * n);
  const limita = (v, a, b) => Math.min(Math.max(v, a), b);
  const baraja = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = azar(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const quieto = matchMedia('(prefers-reduced-motion: reduce)');

  // Crea un nodo SVG con sus atributos y, si hay padre, lo cuelga ahí.
  function s(tag, attrs, padre) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (padre) padre.appendChild(e);
    return e;
  }
  function h(tag, attrs, texto) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (texto != null) e.textContent = texto;
    return e;
  }
  function lienzo(host, ancho, alto, etiqueta) {
    const svg = s('svg', { viewBox: `0 0 ${ancho} ${alto}`, class: 'cq-svg', role: 'group', 'aria-label': etiqueta }, host);
    svg.style.setProperty('--ar', (ancho / alto).toFixed(4)); // para que quepa a lo alto sin dejar bandas
    return svg;
  }
  // Del píxel de pantalla a la unidad del viewBox.
  function punto(svg, ev) {
    return new DOMPoint(ev.clientX, ev.clientY).matrixTransform(svg.getScreenCTM().inverse());
  }
  // Arrastrar con puntero, distinguiendo el toque (sin moverse) del arrastre.
  function arrastrable(nodo, svg, fn) {
    nodo.addEventListener('pointerdown', (ev) => {
      if (ev.button > 0 || (fn.puede && !fn.puede())) return;
      ev.preventDefault();
      const x0 = ev.clientX, y0 = ev.clientY;
      let movido = false;
      const ctx = fn.inicio ? fn.inicio(punto(svg, ev)) : null;
      try { nodo.setPointerCapture(ev.pointerId); } catch (e) { /* sin captura también sirve */ }
      const mover = (e) => {
        if (!movido && Math.hypot(e.clientX - x0, e.clientY - y0) > 6) movido = true;
        if (movido && fn.mover) fn.mover(punto(svg, e), ctx);
      };
      const fin = (e) => {
        nodo.removeEventListener('pointermove', mover);
        nodo.removeEventListener('pointerup', fin);
        nodo.removeEventListener('pointercancel', fin);
        if (movido) { if (fn.soltar) fn.soltar(punto(svg, e), ctx); }
        else if (fn.toque) fn.toque(ctx);
      };
      nodo.addEventListener('pointermove', mover);
      nodo.addEventListener('pointerup', fin);
      nodo.addEventListener('pointercancel', fin);
    });
  }
  // Un nodo que se activa con Enter o Espacio, como un botón.
  function pulsable(nodo, etiqueta, accion) {
    nodo.setAttribute('tabindex', '0');
    nodo.setAttribute('role', 'button');
    if (etiqueta) nodo.setAttribute('aria-label', etiqueta);
    nodo.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); accion(); }
    });
  }
  function mueve(nodo, x, y, esc) {
    nodo.style.transform = `translate(${x}px, ${y}px)` + (esc && esc !== 1 ? ` scale(${esc})` : '');
  }
  function estrellas(padre, n, ancho, alto, semilla) {
    let a = semilla || 7;
    const rnd = () => { a = (a * 9301 + 49297) % 233280; return a / 233280; };
    for (let i = 0; i < n; i++) {
      s('circle', { cx: (rnd() * ancho).toFixed(1), cy: (rnd() * alto).toFixed(1), r: (0.6 + rnd() * 1.2).toFixed(1), fill: '#fff', opacity: (0.35 + rnd() * 0.5).toFixed(2) }, padre);
    }
  }

  /* ══════════════ 1 · CANTUÑA · la piedra que falta ══════════════
     El muro del atrio: lo de alrededor ya lo pusieron los diablos. Las
     piedras sueltas salen de cortar este mismo plano, así que siempre
     encajan; cuál hueco queda vacío al final da igual, porque esa es
     justamente la piedra que Cantuña esconde. */
  const cantuna = {
    id: 'cantuna',
    titulo: 'Cantuña',
    lugar: 'Quito · Ecuador · siglo XVI',
    estampa: 'La piedra que falta',
    cuento: [
      'Cuentan que en el Quito de la Colonia al indio Francisco Cantuña le encargaron terminar el atrio de la iglesia de San Francisco. Los meses pasaban, el plazo se acababa y la obra no avanzaba.',
      'Desesperado, hizo un trato con el diablo: sus demonios terminarían el atrio en una sola noche, antes del primer canto del gallo, y a cambio se llevarían su alma. Toda la noche se oyeron golpes de cincel en la plaza.',
      'Pero Cantuña era más vivo que el diablo.',
    ],
    regla: 'Encaja las piedras en el muro antes del amanecer. <b>Arrastra</b> una piedra para ponerla; <b>tócala</b> para girarla, o para devolverla si ya está puesta. Y cuando cante el gallo, acuérdate de lo que hizo Cantuña.',
    final: 'Al amanecer el diablo vino a cobrar, y Cantuña le enseñó el hueco: faltaba una piedra, así que la obra no estaba terminada y el trato no valía. El diablo se fue con las manos vacías. Dicen que esa piedra todavía falta en el atrio de San Francisco.',
    montar(host, api) {
      const PLANO = [
        '##AAAB##',
        '#CCABBD#',
        '#CE.BDD#',
        'FFEEGGD#',
        'FFHHHGG#',
      ];
      const C = 60, GX = 20, GY = 104, FILAS = PLANO.length, COLS = PLANO[0].length;
      const BANDEJA = GY + FILAS * C + 22, SLOT = 124, ESC = 0.55;
      const W = 520, H = BANDEJA + 2 * SLOT + 10;
      const svg = lienzo(host, W, H, 'El muro del atrio de San Francisco');
      const defs = s('defs', null, svg);
      const cielo = s('linearGradient', { id: 'cn-cielo', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      s('stop', { offset: 0, 'stop-color': '#141a33' }, cielo);
      s('stop', { offset: 1, 'stop-color': '#2d2747' }, cielo);
      const alba = s('linearGradient', { id: 'cn-alba', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      s('stop', { offset: 0, 'stop-color': '#f7b267' }, alba);
      s('stop', { offset: 1, 'stop-color': '#f4845f' }, alba);

      s('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#cn-cielo)' }, svg);
      const amanecer = s('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#cn-alba)', opacity: 0, class: 'cq-suave' }, svg);
      estrellas(s('g', null, svg), 40, W, 90, 3);
      s('circle', { cx: 476, cy: 30, r: 13, fill: '#f4e7c1' }, svg);
      // La fachada de San Francisco, en silueta: dos torres y el frontón.
      const igl = s('g', { fill: '#0e0c18' }, svg);
      s('path', { d: 'M48 104V44l26-18 26 18v60z M420 104V44l26-18 26 18v60z M100 104V62h320v42z M190 62l70-30 70 30z' }, igl);
      s('path', { d: 'M74 26v-14 M446 26v-14 M260 32v-16', stroke: '#0e0c18', 'stroke-width': 3 }, igl);
      for (const x of [66, 438]) s('rect', { x, y: 54, width: 16, height: 22, rx: 8, fill: '#f7c873', opacity: 0.55 }, svg);
      s('rect', { x: 248, y: 74, width: 24, height: 30, rx: 12, fill: '#f7c873', opacity: 0.45 }, svg);

      // El muro.
      const fondo = s('g', null, svg);
      s('rect', { x: GX - 6, y: GY - 6, width: COLS * C + 12, height: FILAS * C + 12, rx: 10, fill: '#120f0d' }, fondo);
      const ocupa = PLANO.map((f) => f.split('').map((ch) => (ch === '#' ? '#' : null)));
      for (let r = 0; r < FILAS; r++) {
        for (let c = 0; c < COLS; c++) {
          const x = GX + c * C, y = GY + r * C;
          if (PLANO[r][c] === '#') {
            s('rect', { x: x + 2, y: y + 2, width: C - 4, height: C - 4, rx: 7, fill: '#6b6258', stroke: '#4a433c', 'stroke-width': 2 }, fondo);
            s('path', { d: `M${x + 12} ${y + 18}h14 M${x + 30} ${y + 40}h16`, stroke: '#7d7368', 'stroke-width': 2, 'stroke-linecap': 'round' }, fondo);
          } else {
            s('rect', { x: x + 3, y: y + 3, width: C - 6, height: C - 6, rx: 7, fill: '#1e1915', stroke: '#3d342d', 'stroke-width': 2, 'stroke-dasharray': '5 5' }, fondo);
          }
        }
      }

      // Las piedras sueltas, cortadas del propio plano.
      const letras = {};
      PLANO.forEach((f, r) => f.split('').forEach((ch, c) => { if (/[A-Z]/.test(ch)) (letras[ch] = letras[ch] || []).push([r, c]); }));
      const TONOS = ['#a69a8b', '#9d917f', '#b0a493', '#968a7a', '#aa9c88', '#a19788', '#9a8e80', '#b3a698'];
      const capa = s('g', null, svg);
      const normal = (celdas) => {
        const r0 = Math.min(...celdas.map((p) => p[0])), c0 = Math.min(...celdas.map((p) => p[1]));
        return celdas.map(([r, c]) => [r - r0, c - c0]);
      };
      const gira = (celdas) => normal(celdas.map(([r, c]) => [c, -r]));
      const piezas = baraja(Object.keys(letras)).map((k, i) => {
        let celdas = normal(letras[k]);
        for (let n = azar(4); n > 0; n--) celdas = gira(celdas);
        const g = s('g', { class: 'cq-pieza' }, capa);
        return { id: k, celdas, g, tono: TONOS[i % TONOS.length], slot: i, puesta: null };
      });
      const medida = (p) => ({ f: Math.max(...p.celdas.map((q) => q[0])) + 1, c: Math.max(...p.celdas.map((q) => q[1])) + 1 });
      function dibuja(p) {
        p.g.textContent = '';
        for (const [r, c] of p.celdas) {
          s('rect', { x: c * C + 2, y: r * C + 2, width: C - 4, height: C - 4, rx: 8, fill: p.tono, stroke: '#5f564b', 'stroke-width': 2 }, p.g);
          s('path', { d: `M${c * C + 10} ${r * C + 14}q10 -4 20 0`, stroke: '#cfc4b4', 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round', opacity: 0.7 }, p.g);
        }
      }
      function enBandeja(p) {
        const m = medida(p);
        const cx = GX + 60 + (p.slot % 4) * 120, cy = BANDEJA + SLOT / 2 + Math.floor(p.slot / 4) * SLOT;
        return { x: cx - (m.c * C * ESC) / 2, y: cy - (m.f * C * ESC) / 2 };
      }
      function coloca(p) {
        if (p.puesta) mueve(p.g, GX + p.puesta.c * C, GY + p.puesta.r * C, 1);
        else { const b = enBandeja(p); mueve(p.g, b.x, b.y, ESC); }
      }
      function cabe(p, r0, c0) {
        return p.celdas.every(([r, c]) => {
          const rr = r + r0, cc = c + c0;
          return rr >= 0 && rr < FILAS && cc >= 0 && cc < COLS && ocupa[rr][cc] === null;
        });
      }
      function marca(p, v) { for (const [r, c] of p.celdas) ocupa[r + p.puesta.r][c + p.puesta.c] = v; }
      const puestas = () => piezas.filter((p) => p.puesta).length;
      let final = false;
      function cuenta() {
        const n = piezas.length - puestas();
        amanecer.setAttribute('opacity', (0.55 * puestas() / piezas.length).toFixed(2));
        if (n > 0) api.estado(n === 1 ? 'Falta una piedra. Ya clarea por el Pichincha.' : `Faltan ${n} piedras. Toca una para girarla.`);
        else ultima();
      }
      piezas.forEach((p) => {
        dibuja(p); coloca(p);
        pulsable(p.g, 'Piedra', () => {
          if (final) return;
          if (p.puesta) { marca(p, null); p.puesta = null; } else { p.celdas = gira(p.celdas); dibuja(p); }
          coloca(p); cuenta();
        });
        arrastrable(p.g, svg, {
          puede: () => !final,
          inicio(pt) {
            capa.appendChild(p.g);
            const o = p.puesta ? { x: GX + p.puesta.c * C, y: GY + p.puesta.r * C, e: 1 } : { ...enBandeja(p), e: ESC };
            return { dx: (pt.x - o.x) / o.e, dy: (pt.y - o.y) / o.e };
          },
          mover(pt, k) {
            if (p.puesta) { marca(p, null); p.puesta = null; }
            p.g.classList.add('cq-alza');
            mueve(p.g, pt.x - k.dx, pt.y - k.dy, 1);
          },
          soltar(pt, k) {
            p.g.classList.remove('cq-alza');
            const c = Math.round((pt.x - k.dx - GX) / C), r = Math.round((pt.y - k.dy - GY) / C);
            if (cabe(p, r, c)) { p.puesta = { r, c }; marca(p, p.id); }
            coloca(p); cuenta();
          },
          toque() {
            if (p.puesta) { marca(p, null); p.puesta = null; } else { p.celdas = gira(p.celdas); dibuja(p); }
            coloca(p); cuenta();
          },
        });
      });

      // Cuando ya no quedan piedras, canta el gallo y aparece la última.
      function ultima() {
        final = true;
        amanecer.setAttribute('opacity', '0.75');
        let hr = 0, hc = 0;
        ocupa.forEach((f, r) => f.forEach((v, c) => { if (v === null) { hr = r; hc = c; } }));
        const hueco = { x: GX + hc * C, y: GY + hr * C };
        const marco = s('rect', { x: hueco.x + 1, y: hueco.y + 1, width: C - 2, height: C - 2, rx: 8, fill: 'none', stroke: '#ffc93c', 'stroke-width': 3, class: 'cq-late' }, svg);
        // Cantuña y su poncho, en la bandeja vacía.
        const yo = s('g', { transform: `translate(70 ${BANDEJA + 20})` }, svg);
        s('ellipse', { cx: 70, cy: 160, rx: 90, ry: 70, fill: '#ffc93c', opacity: 0.08 }, yo);
        s('rect', { x: 52, y: 150, width: 12, height: 50, rx: 4, fill: '#2b2129' }, yo);
        s('rect', { x: 76, y: 150, width: 12, height: 50, rx: 4, fill: '#2b2129' }, yo);
        s('path', { d: 'M70 52 L136 160 L4 160 Z', fill: '#b3262e' }, yo);
        s('path', { d: 'M28 122h84 M18 140h104', stroke: '#f5a623', 'stroke-width': 6 }, yo);
        s('path', { d: 'M38 104h64', stroke: '#1b5faa', 'stroke-width': 5 }, yo);
        s('circle', { cx: 70, cy: 38, r: 18, fill: '#8a5a3c' }, yo);
        s('path', { d: 'M36 26h68 M50 26q20 -30 40 0', stroke: '#3a2a20', 'stroke-width': 8, fill: '#3a2a20', 'stroke-linecap': 'round' }, yo);
        const poncho = { x: 70, y: BANDEJA + 20 + 52, w: 140, h: 120 };
        const zona = s('rect', { x: poncho.x - 6, y: poncho.y - 6, width: poncho.w + 12, height: poncho.h + 12, rx: 18, fill: 'none', stroke: '#ffc93c', 'stroke-width': 2, 'stroke-dasharray': '8 6', class: 'cq-late' }, svg);
        const t = s('text', { x: 400, y: BANDEJA + 34, class: 'cq-rotulo', 'text-anchor': 'middle' }, svg);
        t.textContent = '¡Kikirikí!';
        const piedra = { celdas: [[0, 0]], g: s('g', { class: 'cq-pieza' }, svg), tono: '#c2b49f' };
        dibuja(piedra);
        const casa = { x: 400 - C / 2, y: BANDEJA + 90 };
        mueve(piedra.g, casa.x, casa.y, 1);
        api.estado('Canta el gallo y queda una sola piedra. ¿Dónde la pones?');
        let fuera = false;
        const decide = (x, y) => {
          const cx = x + C / 2, cy = y + C / 2;
          if (cx > poncho.x && cx < poncho.x + poncho.w && cy > poncho.y && cy < poncho.y + poncho.h) {
            fuera = true; marco.remove(); zona.remove();
            mueve(piedra.g, poncho.x + poncho.w / 2 - C / 2, poncho.y + 50, 0.6);
            piedra.g.style.opacity = '0';
            api.estado('Cantuña esconde la piedra bajo el poncho. El muro queda con un hueco.');
            setTimeout(api.gana, 700);
          } else if (Math.abs(x - hueco.x) < C * 0.6 && Math.abs(y - hueco.y) < C * 0.6) {
            mueve(piedra.g, hueco.x, hueco.y, 1);
            api.estado('«Obra terminada», ríe el diablo, y ya viene a cobrar. Así no termina el cuento: escóndela.');
            setTimeout(() => { if (!fuera) mueve(piedra.g, casa.x, casa.y, 1); }, 1100);
          } else mueve(piedra.g, casa.x, casa.y, 1);
        };
        pulsable(piedra.g, 'La última piedra: esconderla en el poncho', () => decide(poncho.x + 40, poncho.y + 30));
        arrastrable(piedra.g, svg, {
          puede: () => !fuera,
          inicio(pt) { return { dx: pt.x - casa.x, dy: pt.y - casa.y }; },
          mover(pt, k) { piedra.g.classList.add('cq-alza'); mueve(piedra.g, pt.x - k.dx, pt.y - k.dy, 1); },
          soltar(pt, k) { piedra.g.classList.remove('cq-alza'); decide(pt.x - k.dx, pt.y - k.dy); },
          toque() { api.estado('Arrástrala: al hueco del muro… o al poncho de Cantuña.'); },
        });
      }
      cuenta();
      return () => {};
    },
  };

  /* ══════════════ 2 · EL PADRE ALMEIDA · la ventana ═════════════
     Un deslizable de 3 × 3. La escena se dibuja una vez en <defs> y cada
     ficha es una ventanita (<svg> anidado con su viewBox) sobre ella. Se
     baraja con movimientos legales desde la solución, así que siempre
     tiene arreglo. */
  const almeida = {
    id: 'almeida',
    titulo: 'El padre Almeida',
    lugar: 'Quito · Ecuador · siglo XVII',
    estampa: '¿Hasta cuándo?',
    cuento: [
      'Cuentan que en el convento de San Diego, en Quito, vivía un fraile joven, el padre Almeida, al que la clausura le quedaba chica. Cada noche, cuando todos dormían, se trepaba por la estatua del Cristo que estaba junto a la ventana, saltaba a la calle y se iba de juerga hasta la madrugada.',
      'Una noche, cuando ya tenía el pie en el hombro de la imagen, oyó una voz que le preguntaba:',
    ],
    regla: 'Arma la ventana del convento: <b>toca</b> una pieza que esté junto al hueco para deslizarla. También se juega con las <b>flechas</b> del teclado.',
    final: '—¿Hasta cuándo, padre Almeida?<br>—Hasta la vuelta, Señor.<br><br>Y se fue igual. Dicen que esa madrugada, de regreso, se cruzó con un entierro y que el muerto del ataúd tenía su propia cara. Desde entonces el padre Almeida no volvió a escaparse.',
    montar(host, api) {
      const N = 3, T = 110, G = 4, M = 12;
      const W = M * 2 + N * T + (N - 1) * G;
      const svg = lienzo(host, W, W, 'La ventana del convento, en nueve piezas');
      svg.setAttribute('tabindex', '0');
      const defs = s('defs', null, svg);
      const cielo = s('linearGradient', { id: 'al-cielo', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      s('stop', { offset: 0, 'stop-color': '#16224a' }, cielo);
      s('stop', { offset: 1, 'stop-color': '#3b5486' }, cielo);
      const luz = s('radialGradient', { id: 'al-luz', cx: 0.85, cy: 0.8, r: 0.6 }, defs);
      s('stop', { offset: 0, 'stop-color': '#f7c873', 'stop-opacity': 0.55 }, luz);
      s('stop', { offset: 1, 'stop-color': '#f7c873', 'stop-opacity': 0 }, luz);
      s('rect', { width: T, height: T, rx: 8 }, s('clipPath', { id: 'al-recorte' }, defs));
      const esc = s('g', { id: 'al-escena' }, defs);
      // La pared y el piso.
      s('rect', { x: 0, y: 0, width: 330, height: 330, fill: '#4a3a52' }, esc);
      for (let i = 0; i < 7; i++) s('path', { d: `M0 ${30 + i * 36}h330`, stroke: '#54445d', 'stroke-width': 2 }, esc);
      for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) s('rect', { x: i * 55, y: 272 + j * 29, width: 55, height: 29, fill: (i + j) % 2 ? '#2c2230' : '#3a2d40' }, esc);
      s('rect', { x: 0, y: 0, width: 330, height: 330, fill: 'url(#al-luz)' }, esc);
      // La ventana con Quito de noche.
      s('path', { d: 'M172 200V92a58 58 0 0 1 116 0v108z', fill: 'url(#al-cielo)' }, esc);
      const est = s('g', null, esc);
      estrellas(est, 14, 100, 70, 11);
      est.setAttribute('transform', 'translate(180 50)');
      s('circle', { cx: 252, cy: 84, r: 13, fill: '#f4e7c1' }, esc);
      s('path', { d: 'M172 200v-26h14v-10h12v10h10l8-14 8 14h8v-20a10 10 0 0 1 20 0v20h12v-8h10v8h14v26z', fill: '#101426' }, esc);
      s('path', { d: 'M172 200V92a58 58 0 0 1 116 0v108', fill: 'none', stroke: '#c9a66b', 'stroke-width': 7 }, esc);
      s('path', { d: 'M230 36v164 M172 130h116', stroke: '#c9a66b', 'stroke-width': 3 }, esc);
      s('rect', { x: 160, y: 198, width: 140, height: 12, rx: 3, fill: '#8d6e4a' }, esc);
      // El Cristo, sobre su peana, con el brazo hacia la ventana.
      s('rect', { x: 52, y: 238, width: 96, height: 34, rx: 4, fill: '#7d6d5b' }, esc);
      s('rect', { x: 46, y: 232, width: 108, height: 10, rx: 3, fill: '#8d7d6b' }, esc);
      s('circle', { cx: 100, cy: 88, r: 24, fill: 'none', stroke: '#e6c35c', 'stroke-width': 3 }, esc);
      s('path', { d: 'M84 110h32l16 122H68z', fill: '#cdbda4' }, esc);
      s('path', { d: 'M114 124l50 -22', stroke: '#cdbda4', 'stroke-width': 12, 'stroke-linecap': 'round' }, esc);
      s('path', { d: 'M86 124l-18 40', stroke: '#cdbda4', 'stroke-width': 12, 'stroke-linecap': 'round' }, esc);
      s('circle', { cx: 100, cy: 92, r: 15, fill: '#ddd0b8' }, esc);
      s('path', { d: 'M92 150h16 M88 180h24 M84 210h32', stroke: '#b5a58c', 'stroke-width': 2 }, esc);
      // El fraile, trepado en el hombro de la imagen.
      s('path', { d: 'M150 196l-30 -60 22 -14 34 50z', fill: '#5b3a1e' }, esc);
      s('path', { d: 'M150 196l-14 34', stroke: '#5b3a1e', 'stroke-width': 10, 'stroke-linecap': 'round' }, esc);
      s('path', { d: 'M168 168l14 -40', stroke: '#5b3a1e', 'stroke-width': 9, 'stroke-linecap': 'round' }, esc);
      s('circle', { cx: 138, cy: 120, r: 12, fill: '#4a2f17' }, esc);
      s('path', { d: 'M126 160l30 6', stroke: '#efe6d2', 'stroke-width': 3 }, esc);
      // La vela del rincón.
      s('ellipse', { cx: 298, cy: 254, rx: 30, ry: 30, fill: '#f7c873', opacity: 0.25 }, esc);
      s('rect', { x: 290, y: 246, width: 16, height: 30, rx: 3, fill: '#efe6d2' }, esc);
      s('path', { d: 'M298 230q8 10 0 16q-8 -6 0 -16z', fill: '#ffc93c' }, esc);

      s('rect', { x: 0, y: 0, width: W, height: W, rx: 14, fill: '#1c1620' }, svg);
      const capa = s('g', null, svg);
      const fichas = [];
      const celda = []; // celda[i] = número de ficha que ocupa la casilla i, o -1
      const xy = (i) => ({ x: M + (i % N) * (T + G), y: M + Math.floor(i / N) * (T + G) });
      let numeros = false;
      for (let k = 0; k < N * N; k++) {
        const g = s('g', { class: 'cq-ficha' }, capa);
        const v = s('g', { 'clip-path': 'url(#al-recorte)' }, g);
        s('use', { href: '#al-escena', transform: `translate(${-(k % N) * T} ${-Math.floor(k / N) * T})` }, v);
        s('rect', { x: 1, y: 1, width: T - 2, height: T - 2, rx: 8, fill: 'none', stroke: 'rgba(255,255,255,.35)', 'stroke-width': 2 }, g);
        const num = s('text', { x: 10, y: 24, class: 'cq-num' }, g);
        num.textContent = k + 1;
        fichas.push(g);
        celda.push(k);
      }
      const ultima = N * N - 1;
      fichas[ultima].style.opacity = '0';
      fichas[ultima].style.pointerEvents = 'none';
      celda[ultima] = -1;
      const pinta = () => celda.forEach((k, i) => { if (k >= 0) { const p = xy(i); mueve(fichas[k], p.x, p.y); } });
      const vecinos = (i) => [i - N, i + N, i % N ? i - 1 : -1, i % N < N - 1 ? i + 1 : -1].filter((j) => j >= 0 && j < N * N);
      // Barajar con movimientos legales, sin deshacer el anterior.
      let hueco = ultima, previo = -1;
      do {
        for (let n = 0; n < 160; n++) {
          const opciones = vecinos(hueco).filter((j) => j !== previo);
          const j = opciones[azar(opciones.length)];
          celda[hueco] = celda[j]; celda[j] = -1; previo = hueco; hueco = j;
        }
      } while (celda.every((k, i) => k === i || k === -1));
      fichas.forEach((g) => g.classList.add('cq-sin-transicion'));
      pinta();
      requestAnimationFrame(() => fichas.forEach((g) => g.classList.remove('cq-sin-transicion')));
      let movs = 0, listo = false;
      const resuelto = () => celda.every((k, i) => k === i || (k === -1 && i === ultima));
      const informa = () => api.estado(movs ? `${movs} movimiento${movs === 1 ? '' : 's'}.` : 'Toca una pieza junto al hueco.');
      function desliza(i) {
        if (listo) return;
        const fi = Math.floor(i / N), ci = i % N, fh = Math.floor(hueco / N), ch = hueco % N;
        if (fi !== fh && ci !== ch) return;
        if (i === hueco) return;
        const paso = fi === fh ? (ci < ch ? -1 : 1) : (fi < fh ? -N : N);
        while (hueco !== i) { const j = hueco + paso; celda[hueco] = celda[j]; celda[j] = -1; hueco = j; }
        movs++; pinta(); informa();
        if (resuelto()) {
          listo = true;
          const p = xy(ultima); mueve(fichas[ultima], p.x, p.y);
          fichas[ultima].style.opacity = '1';
          api.estado(`Lista en ${movs} movimientos. Y entonces, la voz…`);
          setTimeout(api.gana, 900);
        }
      }
      fichas.forEach((g, k) => g.addEventListener('click', () => desliza(celda.indexOf(k))));
      svg.addEventListener('keydown', (ev) => {
        const d = { ArrowUp: N, ArrowDown: -N, ArrowLeft: 1, ArrowRight: -1 }[ev.key];
        if (d == null) return;
        ev.preventDefault();
        const j = hueco + d;
        if (j < 0 || j >= N * N) return;
        if ((d === 1 || d === -1) && Math.floor(j / N) !== Math.floor(hueco / N)) return;
        desliza(j);
      });
      const chip = h('button', { class: 'chip', type: 'button', 'aria-pressed': 'false' }, 'Ver números');
      chip.addEventListener('click', () => {
        numeros = !numeros;
        chip.setAttribute('aria-pressed', String(numeros));
        svg.classList.toggle('cq-con-numeros', numeros);
      });
      api.controles([chip]);
      informa();
      return () => {};
    },
  };

  /* ══════════════ 3 · LA DAMA TAPADA · las calles ═══════════════
     El de las tuberías: un árbol al azar sobre la cuadrícula, cada
     casilla girada a lo loco. Se ilumina lo que está unido al farol del
     trasnochador; gana quien deja todo el barrio iluminado y sin
     calles que acaben en nada. */
  const dama = {
    id: 'dama',
    titulo: 'La Dama Tapada',
    lugar: 'Guayaquil · Ecuador · siglo XVIII',
    estampa: 'Olor a nardos',
    cuento: [
      'Cuentan que en el Guayaquil de antes, pasada la medianoche, a los trasnochadores que volvían a casa por las calles de Las Peñas se les aparecía una mujer elegantísima, con la cara cubierta por un velo, que olía a nardos.',
      'Ninguno resistía seguirla. Ella caminaba sin dejarse alcanzar, calle tras calle, por los callejones más oscuros, hasta las puertas del cementerio. Y ahí, cuando por fin se daba la vuelta y se levantaba el velo, el pobre hombre veía una calavera.',
    ],
    regla: '<b>Toca</b> las calles para girarlas hasta unir todo el barrio: el camino tiene que llegar del farol a la casa, y ninguna calle puede quedar cortada. Con todo iluminado, la Dama no tiene dónde esconderse.',
    final: 'El trasnochador llegó a su casa por calles iluminadas, sin mirar atrás. En la esquina se quedó flotando un olor a nardos, y nada más. Dicen que la Dama Tapada todavía sale cuando se va la luz.',
    montar(host, api) {
      const N = 5, T = 76, M = 12, W = M * 2 + N * T;
      const svg = lienzo(host, W, W, 'Las calles del barrio Las Peñas');
      s('rect', { x: 0, y: 0, width: W, height: W, rx: 14, fill: '#120e1a' }, svg);
      // Bits: norte 1, este 2, sur 4, oeste 8.
      const DIR = [[-1, 0, 1, 4], [0, 1, 2, 8], [1, 0, 4, 1], [0, -1, 8, 2]];
      const rota = (m) => ((m << 1) | (m >> 3)) & 15;
      const base = new Array(N * N).fill(0);
      // Árbol al azar (Prim), con cruces de cuatro solo si no queda otra.
      const dentro = new Set([12]);
      const grado = (i) => [1, 2, 4, 8].filter((b) => base[i] & b).length;
      while (dentro.size < N * N) {
        const bordes = [];
        for (const i of dentro) {
          const r = Math.floor(i / N), c = i % N;
          for (const [dr, dc, b, o] of DIR) {
            const rr = r + dr, cc = c + dc, j = rr * N + cc;
            if (rr >= 0 && rr < N && cc >= 0 && cc < N && !dentro.has(j)) bordes.push([i, j, b, o]);
          }
        }
        const suaves = bordes.filter(([i]) => grado(i) < 3);
        const lista = suaves.length ? suaves : bordes;
        const [i, j, b, o] = lista[azar(lista.length)];
        base[i] |= b; base[j] |= o; dentro.add(j);
      }
      const hojas = base.map((m, i) => i).filter((i) => grado(i) === 1);
      const cerca = (fr, fc) => hojas.slice().sort((a, b) => (Math.abs(Math.floor(a / N) - fr) + Math.abs(a % N - fc)) - (Math.abs(Math.floor(b / N) - fr) + Math.abs(b % N - fc)))[0];
      const farol = cerca(N - 1, 0);
      const casa = cerca(0, N - 1) === farol ? hojas.find((i) => i !== farol) : cerca(0, N - 1);
      const giros = base.map(() => azar(4));
      const mascara = (i) => { let m = base[i]; for (let n = 0; n < giros[i] % 4; n++) m = rota(m); return m; };
      const capa = s('g', null, svg);
      const sobre = s('g', { 'pointer-events': 'none' }, svg);
      const casillas = [];
      for (let i = 0; i < N * N; i++) {
        const r = Math.floor(i / N), c = i % N;
        const g = s('g', { class: 'cq-calle' }, capa);
        mueve(g, M + c * T + T / 2, M + r * T + T / 2);
        s('rect', { x: -T / 2 + 2, y: -T / 2 + 2, width: T - 4, height: T - 4, rx: 10, class: 'cq-calle__fondo' }, g);
        const giro = s('g', { class: 'cq-calle__giro' }, g);
        for (const [, , b] of DIR) {
          if (!(base[i] & b)) continue;
          const ang = { 1: 0, 2: 90, 4: 180, 8: 270 }[b];
          s('rect', { x: -11, y: -T / 2 - 1, width: 22, height: T / 2 + 11, rx: 3, transform: `rotate(${ang})`, class: 'cq-calle__via' }, giro);
        }
        s('circle', { cx: 0, cy: 0, r: 11, class: 'cq-calle__via' }, giro);
        giro.style.transform = `rotate(${giros[i] * 90}deg)`;
        casillas.push({ g, giro });
        const accion = () => { if (listo) return; giros[i]++; giro.style.transform = `rotate(${giros[i] * 90}deg)`; revisa(); };
        g.addEventListener('click', accion);
        pulsable(g, `Calle, fila ${r + 1}, columna ${c + 1}`, accion);
      }
      // El farol y la casa no giran: van encima.
      const icono = (i, dibujo) => { const g = s('g', null, sobre); mueve(g, M + (i % N) * T + T / 2, M + Math.floor(i / N) * T + T / 2); dibujo(g); return g; };
      icono(farol, (g) => {
        s('circle', { r: 20, fill: '#ffc93c', opacity: 0.25 }, g);
        s('rect', { x: -2, y: -4, width: 4, height: 24, fill: '#2b2129' }, g);
        s('path', { d: 'M-9 -6h18l-4 -14h-10z', fill: '#ffc93c', stroke: '#2b2129', 'stroke-width': 2 }, g);
      });
      icono(casa, (g) => {
        s('path', { d: 'M-18 -2l18 -16 18 16v18h-36z', fill: '#e6d2b0', stroke: '#2b2129', 'stroke-width': 2 }, g);
        s('rect', { x: -5, y: 4, width: 10, height: 12, fill: '#5b3a1e' }, g);
        s('rect', { x: 8, y: -2, width: 6, height: 6, fill: '#ffc93c' }, g);
      });
      // La Dama, que ronda por las casillas que siguen a oscuras.
      const sombra = s('g', { class: 'cq-dama' }, sobre);
      s('path', { d: 'M0 -26c10 0 14 8 14 16 0 10 8 26 10 36h-48c2-10 10-26 10-36 0-8 4-16 14-16z', fill: '#e9e3f0', opacity: 0.85 }, sombra);
      s('path', { d: 'M-10 -12h20v10h-20z', fill: '#120e1a', opacity: 0.85 }, sombra);
      let listo = false;
      function calcula() {
        const luz = new Set([farol]), cola = [farol];
        let abiertos = 0;
        while (cola.length) {
          const i = cola.shift(), m = mascara(i), r = Math.floor(i / N), c = i % N;
          for (const [dr, dc, b, o] of DIR) {
            if (!(m & b)) continue;
            const rr = r + dr, cc = c + dc, j = rr * N + cc;
            if (rr < 0 || rr >= N || cc < 0 || cc >= N || !(mascara(j) & o)) { abiertos++; continue; }
            if (!luz.has(j)) { luz.add(j); cola.push(j); }
          }
        }
        return { luz, completo: luz.size === N * N && abiertos === 0 };
      }
      // Que no empiece ya resuelto.
      while (calcula().completo) { const i = azar(N * N); giros[i]++; casillas[i].giro.style.transform = `rotate(${giros[i] * 90}deg)`; }
      function revisa() {
        const { luz, completo } = calcula();
        casillas.forEach((k, i) => k.g.classList.toggle('cq-luz', luz.has(i)));
        const oscuras = casillas.map((k, i) => i).filter((i) => !luz.has(i));
        if (oscuras.length) {
          const i = oscuras[azar(oscuras.length)];
          sombra.style.opacity = '1';
          mueve(sombra, M + (i % N) * T + T / 2, M + Math.floor(i / N) * T + T / 2);
        } else sombra.style.opacity = '0';
        const llega = luz.has(casa);
        if (completo) {
          listo = true;
          api.estado('Todo el barrio iluminado, de punta a punta.');
          setTimeout(api.gana, 800);
        } else api.estado(`${luz.size} de ${N * N} calles con luz.` + (llega ? ' El camino ya llega a la casa: faltan las calles cortadas.' : ''));
      }
      revisa();
      return () => {};
    },
  };

  /* ══════════════ 4 · LA TUNDA · ¿cuál es tu mamá? ══════════════
     Deducción: cinco mujeres con tres rasgos cada una y unas pistas que
     sacan, por eliminación, una sola. Las pistas se generan al azar —solo
     las ciertas para la Tunda—, se van sumando hasta que queda una
     candidata y después se quitan las que sobran. */
  const tunda = {
    id: 'tunda',
    titulo: 'La Tunda',
    lugar: 'Esmeraldas · Ecuador',
    estampa: 'El pie de molinillo',
    cuento: [
      'Cuentan en Esmeraldas que en el manglar vive la Tunda, una mujer que se les aparece a los niños desobedientes con la cara de alguien a quien quieren: la mamá, la madrina, una tía. Los llama con cariño, les ofrece camarones y se los lleva monte adentro.',
      'Al niño que se va con ella lo dejan entundado: atontado, sin saber volver, y hay que sacarlo del monte con bombo y cantos. A la Tunda la delata un pie: lo tiene como un molinillo de madera, y por eso lo esconde bajo la falda.',
    ],
    regla: 'Cinco mujeres te llaman desde la orilla, y solo una es la Tunda. Escucha a la abuela, <b>toca</b> a las que no pueden ser para descartarlas y, cuando quede una sola, señálala. Tienes tres velas.',
    final: 'La señalaste y se le cayó la cara de tu mamá como una hoja seca. Salió corriendo hacia el manglar, y al levantarse la falda se le vio el molinillo. Tu mamá de verdad te estaba esperando en la casa, con la merienda servida.',
    montar(host, api) {
      const RASGOS = {
        panuelo: { rojo: '#d1343e', amarillo: '#f2b632', azul: '#2f6fd0', verde: '#3b9b5a' },
        lleva: ['camarones', 'balde', 'verde', 'nada'],
        pisa: ['arena', 'agua', 'raiz'],
      };
      const TXT = {
        panuelo: (v, no) => `${no ? 'No lleva' : 'Lleva'} pañuelo ${v}.`,
        lleva: (v, no) => ({
          camarones: no ? 'No trae camarones.' : 'Trae una canasta de camarones.',
          balde: no ? 'No carga un balde.' : 'Carga un balde.',
          verde: no ? 'No lleva un racimo de verde.' : 'Lleva un racimo de verde.',
          nada: no ? 'No tiene las manos vacías.' : 'Tiene las manos vacías.',
        }[v]),
        pisa: (v, no) => `${no ? 'No está' : 'Está'} ${{ arena: 'en la arena', agua: 'en el agua', raiz: 'sobre las raíces del mangle' }[v]}.`,
      };
      // Tras «ninguna que…» va subjuntivo.
      const NINGUNA = {
        panuelo: (v) => `de pañuelo ${v}`,
        lleva: (v) => ({ camarones: 'que traiga camarones', balde: 'que cargue un balde', verde: 'que lleve verde', nada: 'con las manos vacías' }[v]),
        pisa: (v) => ({ arena: 'que esté en la arena', agua: 'que esté en el agua', raiz: 'que esté sobre las raíces' }[v]),
      };
      const VECINA = {
        panuelo: (v) => `una de pañuelo ${v}`,
        lleva: (v) => ({ camarones: 'una que trae camarones', balde: 'una que carga un balde', verde: 'una que lleva verde', nada: 'una con las manos vacías' }[v]),
        pisa: (v) => ({ arena: 'una que está en la arena', agua: 'una que está en el agua', raiz: 'una que está sobre las raíces' }[v]),
      };
      const COLORES = Object.keys(RASGOS.panuelo);
      const caja = h('div', { class: 'cq-tunda' });
      host.appendChild(caja);
      const pistas = h('div', { class: 'cq-pistas' });
      caja.appendChild(pistas);
      const W = 520, HH = 270;
      const svg = lienzo(caja, W, HH, 'Cinco mujeres en la orilla del manglar');
      const btn = h('button', { class: 'btn btn--rojo', type: 'button', disabled: '' }, 'Es la que queda');
      const velas = h('span', { class: 'vidas', role: 'img' });
      api.controles([btn, velas]);
      let vidas = 3, ronda = null;

      function genera() {
        for (let intento = 0; intento < 200; intento++) {
          const mujeres = [];
          const vistos = new Set();
          while (mujeres.length < 5) {
            const m = { panuelo: COLORES[azar(4)], lleva: RASGOS.lleva[azar(4)], pisa: RASGOS.pisa[azar(3)] };
            const k = m.panuelo + m.lleva + m.pisa;
            if (!vistos.has(k)) { vistos.add(k); mujeres.push(m); }
          }
          const t = azar(5);
          const vecinas = (i) => [i - 1, i + 1].filter((j) => j >= 0 && j < 5);
          const todas = [];
          for (const r of ['panuelo', 'lleva', 'pisa']) {
            const valores = r === 'panuelo' ? COLORES : RASGOS[r];
            for (const v of valores) {
              todas.push({ t: TXT[r](v, false), f: (i) => mujeres[i][r] === v, peso: 3 });
              todas.push({ t: TXT[r](v, true), f: (i) => mujeres[i][r] !== v, peso: 1 });
              todas.push({ t: `Tiene al lado a ${VECINA[r](v)}.`, f: (i) => vecinas(i).some((j) => mujeres[j][r] === v), peso: 1 });
              todas.push({ t: `No tiene al lado a ninguna ${NINGUNA[r](v)}.`, f: (i) => !vecinas(i).some((j) => mujeres[j][r] === v), peso: 2 });
            }
          }
          todas.push({ t: 'Está en una de las puntas.', f: (i) => i === 0 || i === 4, peso: 2 });
          todas.push({ t: 'No está en ninguna de las puntas.', f: (i) => i > 0 && i < 4, peso: 2 });
          const ciertas = baraja(todas.filter((p) => p.f(t))).sort((a, b) => a.peso - b.peso + (Math.random() - 0.5) * 1.5);
          let quedan = [0, 1, 2, 3, 4];
          let elegidas = [];
          for (const p of ciertas) {
            const q = quedan.filter(p.f);
            if (q.length < quedan.length) { elegidas.push(p); quedan = q; }
            if (quedan.length === 1) break;
          }
          if (quedan.length !== 1) continue;
          for (const p of baraja(elegidas.slice())) {
            const sin = elegidas.filter((x) => x !== p);
            if ([0, 1, 2, 3, 4].filter((i) => sin.every((x) => x.f(i))).length === 1) elegidas = sin;
          }
          if (elegidas.length < 3 || elegidas.length > 5) continue;
          return { mujeres, t, pistas: baraja(elegidas) };
        }
        return null;
      }

      function dibujaMujer(g, m, i) {
        const x = i * 104 + 8;
        const fondo = { arena: '#d8c08a', agua: '#2f6f8f', raiz: '#3c2a1e' }[m.pisa];
        s('rect', { x: x, y: 208, width: 96, height: 54, rx: 10, fill: fondo }, g);
        if (m.pisa === 'arena') for (let k = 0; k < 9; k++) s('circle', { cx: x + 10 + (k * 37) % 80, cy: 220 + (k * 13) % 34, r: 1.6, fill: '#b49a62' }, g);
        if (m.pisa === 'agua') for (let k = 0; k < 3; k++) s('path', { d: `M${x + 8} ${222 + k * 12}q10 -6 20 0t20 0t20 0t20 0`, stroke: '#7fb6cf', 'stroke-width': 2, fill: 'none' }, g);
        if (m.pisa === 'raiz') for (let k = 0; k < 4; k++) s('path', { d: `M${x + 6 + k * 24} 262q10 -40 22 -50`, stroke: '#8a5c3a', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }, g);
        const piel = '#6e4429';
        const vestido = ['#f4efe4', '#efe0cf', '#e9eef4', '#f3e3ea', '#eef2e3'][i];
        const pie = s('g', { class: 'cq-molinillo' }, g);
        s('rect', { x: x + 54, y: 206, width: 5, height: 22, fill: '#8a5c3a' }, pie);
        s('ellipse', { cx: x + 56.5, cy: 234, rx: 11, ry: 9, fill: '#a8754a', stroke: '#5b3a1e', 'stroke-width': 2 }, pie);
        s('path', { d: `M${x + 47} 232h19 M${x + 48} 237h17`, stroke: '#5b3a1e', 'stroke-width': 2 }, pie);
        s('path', { d: `M${x + 30} 112h36l14 102h-64z`, fill: vestido, stroke: '#cfc4b4', 'stroke-width': 1.5 }, g);
        s('path', { d: `M${x + 20} 170h56 M${x + 18} 190h60`, stroke: RASGOS.panuelo[m.panuelo], 'stroke-width': 3, opacity: 0.6 }, g);
        s('rect', { x: x + 34, y: 78, width: 28, height: 40, rx: 8, fill: vestido, stroke: '#cfc4b4', 'stroke-width': 1.5 }, g);
        s('circle', { cx: x + 48, cy: 60, r: 15, fill: piel }, g);
        s('path', { d: `M${x + 31} 60q17 -30 34 0q-17 -8 -34 0z`, fill: RASGOS.panuelo[m.panuelo] }, g);
        s('path', { d: `M${x + 63} 52l9 -6v12z`, fill: RASGOS.panuelo[m.panuelo] }, g);
        if (m.lleva === 'nada') {
          s('path', { d: `M${x + 34} 86l-8 46 M${x + 62} 86l8 46`, stroke: piel, 'stroke-width': 6, 'stroke-linecap': 'round' }, g);
        } else {
          s('path', { d: `M${x + 34} 86l-8 46 M${x + 62} 86l14 30`, stroke: piel, 'stroke-width': 6, 'stroke-linecap': 'round' }, g);
          if (m.lleva === 'camarones') {
            s('path', { d: `M${x + 62} 118h30l-5 20h-20z`, fill: '#b58b4c', stroke: '#6b4c22', 'stroke-width': 2 }, g);
            for (let k = 0; k < 3; k++) s('path', { d: `M${x + 68 + k * 8} 118q4 -10 8 -2`, stroke: '#ef7d4a', 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round' }, g);
          } else if (m.lleva === 'balde') {
            s('path', { d: `M${x + 64} 120h26l-4 26h-18z`, fill: '#8f9aa3', stroke: '#4d565d', 'stroke-width': 2 }, g);
            s('path', { d: `M${x + 66} 120q11 -16 22 0`, stroke: '#4d565d', 'stroke-width': 2, fill: 'none' }, g);
          } else {
            for (let k = 0; k < 4; k++) s('path', { d: `M${x + 70} ${110 + k * 6}q14 2 18 14`, stroke: '#4f8f2f', 'stroke-width': 5, fill: 'none', 'stroke-linecap': 'round' }, g);
            s('path', { d: `M${x + 72} 104v14`, stroke: '#6b4c22', 'stroke-width': 3 }, g);
          }
        }
        s('circle', { cx: x + 14, cy: 18, r: 11, fill: 'rgba(0,0,0,.35)' }, g);
        const n = s('text', { x: x + 14, y: 22.5, class: 'cq-num cq-num--fijo', 'text-anchor': 'middle' }, g);
        n.textContent = i + 1;
        const tache = s('g', { class: 'cq-tache' }, g);
        s('rect', { x: x, y: 0, width: 96, height: HH, rx: 12, fill: '#120e1a', opacity: 0.55 }, tache);
        s('path', { d: `M${x + 22} 90l52 60 M${x + 74} 90l-52 60`, stroke: '#ff77ab', 'stroke-width': 7, 'stroke-linecap': 'round' }, tache);
      }

      function pintaVelas() {
        velas.textContent = '';
        velas.setAttribute('aria-label', `${vidas} vela${vidas === 1 ? '' : 's'} de 3`);
        for (let k = 0; k < 3; k++) velas.insertAdjacentHTML('beforeend', `<svg class="icono${k < vidas ? '' : ' perdida'}" aria-hidden="true"><use href="#i-vida"/></svg>`);
      }
      function nueva() {
        ronda = genera();
        ronda.fuera = new Set();
        svg.textContent = '';
        s('rect', { x: 0, y: 0, width: W, height: HH, rx: 14, fill: '#173a36' }, svg);
        s('path', { d: `M0 70q60 -40 130 -10t140 -20t130 10t120 -20v-70h-520z`, fill: '#0f2a27' }, svg);
        pistas.innerHTML = '<p class="kicker">Dice la abuela</p>';
        const ol = h('ol');
        ronda.pistas.forEach((p) => ol.appendChild(h('li', null, p.t)));
        pistas.appendChild(ol);
        ronda.gs = ronda.mujeres.map((m, i) => {
          const g = s('g', { class: 'cq-mujer' }, svg);
          dibujaMujer(g, m, i);
          const desc = { amarillo: 'amarillo', rojo: 'rojo', azul: 'azul', verde: 'verde' }[m.panuelo];
          const accion = () => alterna(i);
          g.addEventListener('click', accion);
          pulsable(g, `Mujer ${i + 1}: pañuelo ${desc}, ${TXT.lleva(m.lleva, false).toLowerCase().replace(/\.$/, '')}, ${TXT.pisa(m.pisa, false).toLowerCase().replace(/\.$/, '')}`, accion);
          g.setAttribute('aria-pressed', 'false');
          return g;
        });
        actualiza();
      }
      function alterna(i) {
        if (ronda.listo) return;
        if (ronda.fuera.has(i)) ronda.fuera.delete(i); else ronda.fuera.add(i);
        actualiza();
      }
      function actualiza() {
        ronda.gs.forEach((g, i) => { g.classList.toggle('cq-fuera', ronda.fuera.has(i)); g.setAttribute('aria-pressed', String(ronda.fuera.has(i))); });
        const quedan = 5 - ronda.fuera.size;
        if (quedan === 1) { btn.disabled = false; btn.textContent = `Es la ${[0, 1, 2, 3, 4].find((i) => !ronda.fuera.has(i)) + 1}`; }
        else { btn.disabled = true; btn.textContent = 'Es la que queda'; }
        api.estado(quedan === 0 ? 'Descartaste a todas: alguna tiene que ser.' : quedan === 1 ? 'Queda una. ¿La señalas?' : `Quedan ${quedan}. Toca a las que no pueden ser.`);
        pintaVelas();
      }
      btn.addEventListener('click', () => {
        const i = [0, 1, 2, 3, 4].find((k) => !ronda.fuera.has(k));
        if (i == null || ronda.listo) return;
        if (i === ronda.t) {
          ronda.listo = true; btn.disabled = true;
          ronda.gs[i].classList.add('cq-tunda-es');
          api.estado('¡Era ella! Mira el pie…');
          setTimeout(api.gana, 1200);
          return;
        }
        vidas--;
        ronda.gs[i].classList.add('cq-tiembla');
        setTimeout(() => ronda.gs[i] && ronda.gs[i].classList.remove('cq-tiembla'), 500);
        if (vidas > 0) {
          ronda.fuera.clear(); actualiza();
          api.estado(`«¡Mijo, soy yo, tu madrina!» Esa no era. Se apaga una vela: te quedan ${vidas}.`);
        } else {
          ronda.listo = true; btn.disabled = true; pintaVelas();
          api.estado('Se apagaron las tres velas y te entundaste. La abuela vuelve a contar…');
          setTimeout(() => { vidas = 3; nueva(); }, 2200);
        }
      });
      nueva();
      return () => {};
    },
  };

  /* ══════════════ 5 · EL SOMBRERÓN · las trenzas ════════════════
     Desenredar: un grafo plano (se construye con puntos al azar uniendo
     los más cercanos sin cruzar), revuelto en un círculo. Gana quien
     deja todos los hilos sin cruzarse. */
  const sombreron = {
    id: 'sombreron',
    titulo: 'El Sombrerón',
    lugar: 'Guatemala',
    estampa: 'La crin suelta',
    cuento: [
      'Cuentan en Guatemala que de noche anda el Sombrerón, un hombrecito vestido de negro, con un sombrero enorme y una guitarra, que se enamora de las muchachas de pelo largo y ojos grandes.',
      'Les da serenata desde la calle, y mientras ellas duermen les trenza el pelo, y de paso las crines y las colas de las mulas del establo, en nudos que nadie sabe deshacer. A la que se deja enamorar ya no la deja ni comer.',
    ],
    regla: 'Desenreda las trenzas: <b>arrastra</b> los moños hasta que ningún hilo se cruce con otro. Los hilos que todavía se cruzan brillan.',
    final: 'La crin de la mula quedó suelta y la muchacha durmió tranquila. Cuentan que la única manera de librarse del Sombrerón es cortarse la trenza o mandar lejos a la enamorada; esta vez no hizo falta ninguna de las dos.',
    montar(host, api) {
      const W = 400, N = 9;
      const svg = lienzo(host, W, W, 'Hilos trenzados');
      const fondo = s('radialGradient', { id: 'so-fondo', cx: 0.5, cy: 0.45, r: 0.7 }, s('defs', null, svg));
      s('stop', { offset: 0, 'stop-color': '#3a2b4a' }, fondo);
      s('stop', { offset: 1, 'stop-color': '#16101f' }, fondo);
      s('rect', { x: 0, y: 0, width: W, height: W, rx: 14, fill: 'url(#so-fondo)' }, svg);
      estrellas(s('g', null, svg), 30, W, W, 5);
      // El sombrero, al fondo.
      s('path', { d: 'M110 330q90 -36 180 0q-90 26 -180 0z M160 324q8 -64 40 -64t40 64', fill: '#0c0812', opacity: 0.7 }, svg);
      // Cuenta también los hilos que se montan uno encima de otro: si no,
      // arrimar todos los moños contra un borde los deja en fila y «sin cruces».
      const cruza = (a, b, c, d) => {
        const o = (p, q, r) => { const v = (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x); return Math.abs(v) < 1e-6 ? 0 : Math.sign(v); };
        const en = (p, q, r) => Math.min(p.x, q.x) - 1e-6 <= r.x && r.x <= Math.max(p.x, q.x) + 1e-6 && Math.min(p.y, q.y) - 1e-6 <= r.y && r.y <= Math.max(p.y, q.y) + 1e-6;
        const o1 = o(a, b, c), o2 = o(a, b, d), o3 = o(c, d, a), o4 = o(c, d, b);
        if (o1 * o2 < 0 && o3 * o4 < 0) return true;
        return (o1 === 0 && en(a, b, c)) || (o2 === 0 && en(a, b, d)) || (o3 === 0 && en(c, d, a)) || (o4 === 0 && en(c, d, b));
      };
      let pts, aristas;
      for (let intento = 0; intento < 100; intento++) {
        pts = [];
        while (pts.length < N) {
          const p = { x: 50 + Math.random() * 300, y: 50 + Math.random() * 300 };
          if (pts.every((q) => Math.hypot(p.x - q.x, p.y - q.y) > 70)) pts.push(p);
        }
        const pares = [];
        for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) pares.push([i, j, Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)]);
        pares.sort((a, b) => a[2] - b[2]);
        aristas = [];
        const grado = new Array(N).fill(0);
        for (const [i, j] of pares) {
          if (grado[i] >= 4 || grado[j] >= 4) continue;
          if (aristas.some(([a, b]) => a !== i && a !== j && b !== i && b !== j && cruza(pts[a], pts[b], pts[i], pts[j]))) continue;
          aristas.push([i, j]); grado[i]++; grado[j]++;
          if (aristas.length >= Math.round(N * 1.75)) break;
        }
        const padre = pts.map((_, i) => i);
        const raiz = (i) => (padre[i] === i ? i : (padre[i] = raiz(padre[i])));
        aristas.forEach(([a, b]) => { padre[raiz(a)] = raiz(b); });
        if (pts.every((_, i) => raiz(i) === raiz(0))) break;
      }
      // Revolver: los moños en círculo, en otro orden, hasta que haya enredo de verdad.
      const cruces = () => {
        const malas = new Set();
        let n = 0;
        for (let x = 0; x < aristas.length; x++) for (let y = x + 1; y < aristas.length; y++) {
          const [a, b] = aristas[x], [c, d] = aristas[y];
          if (a === c || a === d || b === c || b === d) continue;
          if (cruza(pts[a], pts[b], pts[c], pts[d])) { n++; malas.add(x); malas.add(y); }
        }
        return { n, malas };
      };
      for (let k = 0; k < 40; k++) {
        const orden = baraja([...Array(N).keys()]);
        orden.forEach((i, j) => { const a = (j / N) * Math.PI * 2 - Math.PI / 2; pts[i] = { x: 200 + Math.cos(a) * 150, y: 200 + Math.sin(a) * 150 }; });
        if (cruces().n >= N) break;
      }
      const hilos = s('g', null, svg);
      const lineas = aristas.map(() => {
        const g = s('g', { class: 'cq-hilo' }, hilos);
        return { g, a: s('line', { class: 'cq-hilo__base' }, g), b: s('line', { class: 'cq-hilo__trenza' }, g) };
      });
      const CINTAS = ['#ff77ab', '#ffc93c', '#5f97d8', '#6fae2e', '#e9e3f0', '#f4845f', '#b48ee0', '#47c1b6', '#f2b632'];
      const monos = pts.map((p, i) => {
        const g = s('g', { class: 'cq-mono' }, svg);
        s('circle', { r: 22, fill: 'transparent' }, g);
        s('path', { d: 'M0 0l-14 -9v18z M0 0l14 -9v18z', fill: CINTAS[i % CINTAS.length], stroke: '#16101f', 'stroke-width': 2, 'stroke-linejoin': 'round' }, g);
        s('circle', { r: 5, fill: CINTAS[i % CINTAS.length], stroke: '#16101f', 'stroke-width': 2 }, g);
        return g;
      });
      let listo = false;
      function pinta() {
        aristas.forEach(([a, b], k) => {
          for (const l of [lineas[k].a, lineas[k].b]) { l.setAttribute('x1', pts[a].x); l.setAttribute('y1', pts[a].y); l.setAttribute('x2', pts[b].x); l.setAttribute('y2', pts[b].y); }
        });
        monos.forEach((g, i) => mueve(g, pts[i].x, pts[i].y));
        const { n, malas } = cruces();
        lineas.forEach((l, k) => l.g.classList.toggle('cq-cruza', malas.has(k)));
        return n;
      }
      function informa(n) {
        if (n === 0 && !listo) {
          listo = true;
          svg.classList.add('cq-suelto');
          api.estado('Ni un nudo. La crin quedó suelta.');
          setTimeout(api.gana, 800);
        } else if (!listo) api.estado(n === 1 ? 'Queda un cruce.' : `Quedan ${n} cruces.`);
      }
      monos.forEach((g, i) => {
        g.setAttribute('aria-label', `Moño ${i + 1}`);
        arrastrable(g, svg, {
          puede: () => !listo,
          inicio(p) { svg.appendChild(g); g.classList.add('cq-alza'); return { dx: p.x - pts[i].x, dy: p.y - pts[i].y }; },
          mover(p, k) { pts[i] = { x: limita(p.x - k.dx, 18, W - 18), y: limita(p.y - k.dy, 18, W - 18) }; pinta(); },
          soltar() { g.classList.remove('cq-alza'); informa(pinta()); },
          toque() { g.classList.remove('cq-alza'); },
        });
      });
      informa(pinta());
      return () => {};
    },
  };

  /* ══════════════ 6 · EL DORADO · la balsa ══════════════════════
     Una balanza: ocho estacas en la balsa, a 1, 2, 3 y 4 pasos del
     cacique por cada lado, y cinco ofrendas de pesos distintos. Hay
     solución porque se sortea primero (pesos y estacas que suman cero)
     y luego se vacía la balsa. */
  const dorado = {
    id: 'dorado',
    titulo: 'El Dorado',
    lugar: 'Laguna de Guatavita · Colombia',
    estampa: 'La balsa muisca',
    cuento: [
      'Cuentan que cuando los muiscas coronaban a un nuevo cacique en Guatavita, le untaban el cuerpo con resina y lo cubrían de polvo de oro de pies a cabeza. Lo subían a una balsa de juncos, con fogatas encendidas en la orilla, y lo llevaban hasta el centro de la laguna.',
      'Allí, rodeado de ofrendas, el cacique se lanzaba al agua y el oro se iba al fondo, junto con las piezas que echaban los sacerdotes. Los españoles oyeron la historia y se pasaron siglos buscando una ciudad entera de oro que nunca existió.',
    ],
    regla: 'Acomoda todas las ofrendas en la balsa para que flote nivelada. <b>Arrastra</b> una ofrenda a una estaca; <b>tócala</b> para devolverla. Lo que pesa más, más cerca del cacique; los puntitos dicen cuánto pesa cada una.',
    final: 'La balsa llegó derechita al centro de la laguna. El cacique dorado se lanzó al agua, las ofrendas se fueron al fondo y la gente cantó en la orilla. Dicen que el oro sigue ahí abajo, y que por eso a la laguna intentaron secarla más de una vez.',
    montar(host, api) {
      const W = 480, HH = 430, CX = 240, CY = 210, PASO = 48;
      const svg = lienzo(host, W, HH, 'La balsa en la laguna de Guatavita');
      const defs = s('defs', null, svg);
      const agua = s('linearGradient', { id: 'do-agua', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      s('stop', { offset: 0, 'stop-color': '#1f5a5a' }, agua);
      s('stop', { offset: 1, 'stop-color': '#0d2e33' }, agua);
      const oro = s('linearGradient', { id: 'do-oro', x1: 0, y1: 0, x2: 1, y2: 1 }, defs);
      s('stop', { offset: 0, 'stop-color': '#ffe08a' }, oro);
      s('stop', { offset: 0.55, 'stop-color': '#e2a523' }, oro);
      s('stop', { offset: 1, 'stop-color': '#a8700f' }, oro);
      s('rect', { x: 0, y: 0, width: W, height: HH, rx: 14, fill: '#1b2b2a' }, svg);
      s('path', { d: 'M0 120l70 -50 60 30 70 -60 80 50 60 -30 70 40 70 -20v40h-480z', fill: '#24403a' }, svg);
      s('ellipse', { cx: CX, cy: 240, rx: 236, ry: 118, fill: 'url(#do-agua)' }, svg);
      for (let k = 0; k < 4; k++) s('path', { d: `M${70 + k * 90} ${250 + (k % 2) * 30}q15 -6 30 0`, stroke: '#4f9a96', 'stroke-width': 2, fill: 'none', opacity: 0.6 }, svg);
      for (const x of [30, 450]) { s('path', { d: `M${x - 10} 140l10 -24 10 24z`, fill: '#ffc93c' }, svg); s('circle', { cx: x, cy: 130, r: 16, fill: '#ffc93c', opacity: 0.2 }, svg); }
      const balsa = s('g', { class: 'cq-balsa' }, svg);
      mueve(balsa, CX, CY);
      s('rect', { x: -214, y: 0, width: 428, height: 26, rx: 13, fill: '#b08d4a', stroke: '#6b5326', 'stroke-width': 2 }, balsa);
      for (let k = -200; k <= 200; k += 20) s('path', { d: `M${k} 3v20`, stroke: '#8a6c34', 'stroke-width': 2 }, balsa);
      const POS = [-4, -3, -2, -1, 1, 2, 3, 4];
      for (const p of POS) {
        s('rect', { x: p * PASO - 3, y: -10, width: 6, height: 12, rx: 2, fill: '#6b5326' }, balsa);
        const t = s('text', { x: p * PASO, y: 44, class: 'cq-num cq-num--fijo', 'text-anchor': 'middle', opacity: 0.6 }, balsa);
        t.textContent = Math.abs(p);
      }
      // El cacique, dorado, en el centro.
      const cac = s('g', { class: 'cq-cacique' }, balsa);
      s('path', { d: 'M-12 0l4 -34h16l4 34z', fill: 'url(#do-oro)' }, cac);
      s('circle', { cx: 0, cy: -44, r: 10, fill: 'url(#do-oro)' }, cac);
      s('path', { d: 'M-18 -50q18 -26 36 0l-6 -2 -6 -10 -6 8 -6 -8 -6 10z', fill: '#e2a523', stroke: '#a8700f', 'stroke-width': 1.5 }, cac);
      s('path', { d: 'M-8 -28l-14 -10 M8 -28l14 -10', stroke: '#e2a523', 'stroke-width': 5, 'stroke-linecap': 'round' }, cac);

      // Sorteo: cinco ofrendas que, bien puestas, se compensan.
      let sol;
      do {
        const est = baraja(POS.slice()).slice(0, 5);
        const pesos = est.map(() => 1 + azar(4));
        if (est.reduce((t, p, k) => t + p * pesos[k], 0) === 0 && new Set(pesos).size >= 3) sol = pesos;
      } while (!sol);
      const capa = s('g', null, svg);
      const ofrendas = baraja(sol.slice()).map((w, k) => {
        const g = s('g', { class: 'cq-ofrenda' }, capa);
        const a = 16 + w * 5, al = 26 + w * 9;
        s('path', { d: `M${-a / 2} 0l${a * 0.12} ${-al * 0.7}q${a * 0.38} ${-al * 0.4} ${a * 0.76} 0l${a * 0.12} ${al * 0.7}z`, fill: 'url(#do-oro)', stroke: '#8a5b0c', 'stroke-width': 1.5 }, g);
        s('circle', { cx: 0, cy: -al * 0.78, r: a * 0.22, fill: '#ffe08a', stroke: '#8a5b0c', 'stroke-width': 1.5 }, g);
        for (let d = 0; d < w; d++) s('circle', { cx: (d - (w - 1) / 2) * 7, cy: -al * 0.32, r: 2.4, fill: '#5b3a07' }, g);
        return { g, w, estaca: null, slot: k };
      });
      const enBandeja = (o) => ({ x: 48 + o.slot * 96, y: HH - 24 });
      const local = (p) => {
        const r = (angulo * Math.PI) / 180, dx = p.x - CX, dy = p.y - CY;
        return { x: dx * Math.cos(r) + dy * Math.sin(r), y: -dx * Math.sin(r) + dy * Math.cos(r) };
      };
      let angulo = 0, listo = false;
      function coloca(o) {
        if (o.estaca != null) { balsa.appendChild(o.g); mueve(o.g, o.estaca * PASO, -10); }
        else { capa.appendChild(o.g); const b = enBandeja(o); mueve(o.g, b.x, b.y); }
      }
      function pesa() {
        const par = ofrendas.reduce((t, o) => t + (o.estaca != null ? o.estaca * o.w : 0), 0);
        angulo = limita(par * 1.4, -13, 13);
        balsa.style.transform = `translate(${CX}px, ${CY}px) rotate(${angulo}deg)`;
        const todas = ofrendas.every((o) => o.estaca != null);
        const lado = par > 0 ? 'derecha' : 'izquierda';
        if (todas && par === 0) {
          listo = true;
          svg.classList.add('cq-nivelada');
          api.estado('La balsa flota nivelada. Ya puede salir hacia el centro de la laguna.');
          setTimeout(api.gana, 900);
        } else if (todas) api.estado(`Están todas, pero la balsa se va a la ${lado}.`);
        else {
          const n = ofrendas.filter((o) => o.estaca == null).length;
          api.estado(`${n === 1 ? 'Falta una ofrenda' : `Faltan ${n} ofrendas`}` + (par ? `; por ahora se inclina a la ${lado}.` : '; por ahora, nivelada.'));
        }
      }
      ofrendas.forEach((o) => {
        coloca(o);
        const vuelve = () => { if (listo) return; o.estaca = null; coloca(o); pesa(); };
        pulsable(o.g, `Ofrenda de peso ${o.w}`, () => {
          if (listo) return;
          if (o.estaca != null) return vuelve();
          const libre = POS.slice().sort((a, b) => Math.abs(a) - Math.abs(b)).find((p) => !ofrendas.some((x) => x.estaca === p));
          o.estaca = libre; coloca(o); pesa();
        });
        arrastrable(o.g, svg, {
          puede: () => !listo,
          inicio(p) {
            const b = o.estaca != null ? null : enBandeja(o);
            const ancla = b || { x: p.x, y: p.y };
            if (o.estaca != null) { o.estaca = null; pesa(); }
            capa.appendChild(o.g);
            return { dx: p.x - ancla.x, dy: p.y - ancla.y };
          },
          mover(p, k) { o.g.classList.add('cq-alza'); mueve(o.g, p.x - k.dx, p.y - k.dy); },
          soltar(p, k) {
            o.g.classList.remove('cq-alza');
            const l = local({ x: p.x - k.dx, y: p.y - k.dy });
            const est = POS.find((q) => Math.abs(l.x - q * PASO) < PASO / 2 && l.y > -120 && l.y < 50);
            if (est != null) {
              const otra = ofrendas.find((x) => x !== o && x.estaca === est);
              if (otra) { otra.estaca = null; coloca(otra); }
              o.estaca = est;
            }
            coloca(o); pesa();
          },
          toque: vuelve,
        });
      });
      pesa();
      return () => {};
    },
  };

  const LEYENDAS = [cantuna, almeida, dama, tunda, sombreron, dorado];

  /* ─── las estampas: un dibujo por leyenda, para el mapa y el premio ── */
  const EMBLEMA = {
    cantuna: '<rect x="18" y="30" width="38" height="28" rx="5" fill="#8d8273"/><rect x="62" y="30" width="40" height="28" rx="5" fill="#9d917f"/><rect x="18" y="62" width="24" height="28" rx="5" fill="#a69a8b"/><rect x="46" y="62" width="26" height="28" rx="5" fill="none" stroke="#e01b6a" stroke-width="3" stroke-dasharray="5 4"/><rect x="76" y="62" width="26" height="28" rx="5" fill="#968a7a"/><path d="M26 40h12M70 46h14M84 76h10" stroke="#cfc4b4" stroke-width="3" stroke-linecap="round"/>',
    almeida: '<path d="M30 100V54a30 30 0 0 1 60 0v46z" fill="#1f2d58"/><circle cx="74" cy="48" r="9" fill="#f4e7c1"/><path d="M30 100V54a30 30 0 0 1 60 0v46" fill="none" stroke="#c9a66b" stroke-width="6"/><path d="M60 24v76M30 70h60" stroke="#c9a66b" stroke-width="3"/><circle cx="44" cy="40" r="1.6" fill="#fff"/><circle cx="52" cy="58" r="1.4" fill="#fff"/>',
    dama: '<path d="M60 18c18 0 24 14 24 28 0 18 12 46 16 62H20c4-16 16-44 16-62 0-14 6-28 24-28z" fill="#3d3448"/><path d="M60 22c14 0 20 12 20 26s-8 18-20 18-20-4-20-18 6-26 20-26z" fill="#e9e3f0" opacity=".9"/><path d="M84 30l10-8M90 40l12-2M86 50l10 6" stroke="#f7c873" stroke-width="3" stroke-linecap="round"/><circle cx="96" cy="20" r="4" fill="#fff"/><circle cx="104" cy="36" r="4" fill="#fff"/><circle cx="98" cy="56" r="4" fill="#fff"/>',
    tunda: '<rect x="56" y="14" width="8" height="54" rx="3" fill="#8a5c3a"/><ellipse cx="60" cy="84" rx="24" ry="20" fill="#a8754a" stroke="#5b3a1e" stroke-width="3"/><path d="M38 78h44M37 88h46M42 98h36" stroke="#5b3a1e" stroke-width="3"/><path d="M60 64v40" stroke="#5b3a1e" stroke-width="2"/>',
    sombreron: '<ellipse cx="60" cy="80" rx="50" ry="12" fill="#1a1422"/><path d="M36 80c2-34 10-50 24-50s22 16 24 50z" fill="#2b2233"/><path d="M38 70h44" stroke="#e01b6a" stroke-width="6"/><path d="M14 104c20-10 30 6 46-4s28 6 46-4" stroke="#8a5c3a" stroke-width="4" fill="none" stroke-linecap="round"/>',
    dorado: '<ellipse cx="60" cy="92" rx="50" ry="12" fill="#1f5a5a"/><rect x="14" y="78" width="92" height="12" rx="6" fill="#b08d4a"/><path d="M52 78l4-30h8l4 30z" fill="#e2a523"/><circle cx="60" cy="40" r="8" fill="#e2a523"/><path d="M46 36q14-22 28 0l-5-2-4-8-5 7-5-7-4 8z" fill="#ffc93c"/><path d="M26 78l3-12h8l3 12zM82 78l3-14h8l3 14z" fill="#e2a523"/>',
  };
  const emblema = (id, clase) => `<svg class="${clase || ''}" viewBox="0 0 120 120" aria-hidden="true">${EMBLEMA[id]}</svg>`;

  /* ─── lo guardado: solo qué leyendas se resolvieron ─────────── */
  const CLAVE = 'cuentan-que:resueltas';
  let resueltas = new Set();
  try { resueltas = new Set(JSON.parse(localStorage.getItem(CLAVE) || '[]')); } catch (e) { /* sin almacenamiento, se juega igual */ }
  const guarda = () => { try { localStorage.setItem(CLAVE, JSON.stringify([...resueltas])); } catch (e) { /* idem */ } };

  /* ─── el mapa ─────────────────────────────────────────────── */
  const mapa = $('#mapa'), vista = $('#leyenda'), cartas = $('#cartas');
  function pintaMapa() {
    cartas.textContent = '';
    LEYENDAS.forEach((l, i) => {
      const li = h('li');
      const hecha = resueltas.has(l.id);
      li.innerHTML = `<a class="cq-carta${hecha ? ' cq-carta--hecha' : ''}" href="#/${l.id}">
        <span class="cq-carta__dibujo">${emblema(l.id)}</span>
        <span class="cq-carta__n">${String(i + 1).padStart(2, '0')}</span>
        <span class="cq-carta__lugar">${l.lugar}</span>
        <span class="cq-carta__t">${l.titulo}</span>
        <span class="cq-carta__e">${hecha ? `<svg class="icono icono--s" aria-hidden="true"><use href="#i-check"/></svg> ${l.estampa}` : 'Sin resolver'}</span>
      </a>`;
      cartas.appendChild(li);
    });
    $('#cuenta-n').textContent = resueltas.size;
    $('#nota-mapa').textContent = resueltas.size === LEYENDAS.length
      ? 'Tienes las seis estampas. La abuela dice que mañana cuenta más, si se vuelve a ir la luz.'
      : 'Son versiones de tradición oral: cada pueblo las cuenta a su manera, y todas valen.';
  }

  /* ─── una leyenda ─────────────────────────────────────────── */
  const tablero = $('#tablero'), estado = $('#estado'), controles = $('#controles');
  const reiniciar = $('#reiniciar');
  let actual = null, desmonta = null;
  function abre(l) {
    actual = l;
    $('#ley-lugar').textContent = l.lugar;
    $('#ley-t').textContent = l.titulo;
    $('#ley-cuento').innerHTML = l.cuento.map((p) => `<p>${p}</p>`).join('');
    $('#ley-regla').innerHTML = `<p class="kicker">Cómo se juega</p><p>${l.regla}</p>`;
    $('#ley-final').hidden = true;
    $('#ley-sigue').hidden = true;
    vista.dataset.leyenda = l.id;
    monta();
  }
  function monta() {
    if (desmonta) desmonta();
    tablero.textContent = '';
    controles.querySelectorAll(':scope > :not(#reiniciar)').forEach((n) => n.remove());
    estado.textContent = '';
    let ganada = false;
    const api = {
      estado: (t) => { estado.textContent = t; },
      controles: (nodos) => nodos.forEach((n) => controles.insertBefore(n, reiniciar)),
      gana: () => { if (ganada || actual == null) return; ganada = true; gana(actual); },
    };
    desmonta = actual.montar(tablero, api);
  }
  reiniciar.addEventListener('click', () => { if (actual) { abre(actual); } });

  function gana(l) {
    const nueva = !resueltas.has(l.id);
    resueltas.add(l.id); guarda();
    $('#cuenta-n').textContent = resueltas.size;
    const fin = $('#ley-final');
    fin.innerHTML = `<p class="kicker">Y así fue</p><p>${l.final}</p>`;
    fin.hidden = false;
    const i = LEYENDAS.indexOf(l);
    const pendiente = LEYENDAS.slice(i + 1).concat(LEYENDAS.slice(0, i)).find((x) => !resueltas.has(x.id));
    const sig = $('#ley-siguiente');
    if (pendiente) { sig.href = `#/${pendiente.id}`; sig.firstChild.textContent = 'Siguiente leyenda '; }
    else { sig.href = '#/'; sig.firstChild.textContent = 'Ver mis estampas '; }
    $('#ley-sigue').hidden = false;
    premio(l, nueva);
  }

  /* ─── la estampa ──────────────────────────────────────────── */
  const pr = $('#premio');
  let antesDelPremio = null;
  function premio(l) {
    antesDelPremio = document.activeElement;
    const pieza = $('#premio-pieza');
    const otra = pieza.cloneNode(false); // reinicia la animación de entrada
    pieza.replaceWith(otra);
    otra.innerHTML = `<div class="premio__disco">${emblema(l.id, 'cq-premio__svg')}</div>`;
    $('#premio-kicker').textContent = `Estampa ${resueltas.size} de ${LEYENDAS.length}`;
    $('#premio-nombre').textContent = l.estampa;
    $('#premio-desc').textContent = l.titulo + ' · ' + l.lugar;
    pr.hidden = false;
    document.body.classList.add('cq-con-premio');
    pr.focus();
  }
  function cierraPremio() {
    if (pr.hidden) return;
    pr.hidden = true;
    document.body.classList.remove('cq-con-premio');
    const fin = $('#ley-final');
    if (!fin.hidden) fin.scrollIntoView({ behavior: quieto.matches ? 'auto' : 'smooth', block: 'center' });
    if (antesDelPremio && antesDelPremio.focus) antesDelPremio.focus({ preventScroll: true });
  }
  pr.addEventListener('click', cierraPremio);
  pr.addEventListener('keydown', (ev) => { if (['Escape', 'Enter', ' '].includes(ev.key)) { ev.preventDefault(); cierraPremio(); } });

  /* ─── rutas: #/ es el mapa, #/<id> una leyenda ─────────────── */
  function ruta() {
    cierraPremio();
    const id = location.hash.replace(/^#\/?/, '');
    const l = LEYENDAS.find((x) => x.id === id);
    if (l) {
      mapa.hidden = true; vista.hidden = false;
      abre(l);
      document.title = `${l.titulo} · Cuentan que…`;
      window.scrollTo(0, 0);
      $('#ley-t').focus({ preventScroll: true });
    } else {
      if (desmonta) desmonta();
      desmonta = null; actual = null; tablero.textContent = '';
      vista.hidden = true; mapa.hidden = false;
      document.title = 'Cuentan que… · leyendas para armar · UNA';
      pintaMapa();
      window.scrollTo(0, 0);
    }
  }
  $('#ley-t').setAttribute('tabindex', '-1');
  addEventListener('hashchange', ruta);
  ruta();
})();
