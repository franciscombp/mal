/* El Lamparómetro · el motor.
   Lee la base de conocimiento de window.LAMP (datos.js) y arma el juego:
   portada, partida, «Así vas», resultado, Lampariario, reto y tarjeta. */
(() => {
'use strict';

const { PJ, PROD, PROV, RASGOS, ESCALA, SALTO, QUIPS, TESTS, SIGNOS, FALSOS, REALES } = window.LAMP;
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const EJES = ['x', 'y', 'z'];
const quieto = matchMedia('(prefers-reduced-motion: reduce)');
const ESPERA = 1700;   // lo que la hoja espera antes de pasar sola a la siguiente
const CADA = 4;        // cada cuántas respuestas sale «Así vas»
const FIRMA = .07;     // cuánto pesa un punto de firma frente al coseno (−1…1)
const FORMAS = [
  '<path d="M12 3 22 21H2z"/>', '<path d="M12 2 22 12 12 22 2 12z"/>',
  '<circle cx="12" cy="12" r="10"/>', '<rect x="3" y="3" width="18" height="18" rx="2"/>'
];
const ALBUM = { pj: PJ, prov: PROV, prod: PROD };
const ALBUM_NOMBRE = { pj: 'Lámparas', prov: 'Provincias', prod: 'Productos del Tuti' };

/* ══════════ UTILIDADES ══════════ */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const azar = (a) => a[Math.floor(Math.random() * a.length)];
const baraja = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const vibra = (ms) => { try { navigator.vibrate?.(ms); } catch {} };
const mono = (o, mod = '') => `<span class="g-mono ${mod}" style="--c:${o.c};--t:${o.t}" aria-hidden="true">${esc(o.ini)}</span>`;
function anima(el, clase) { if (!el) return; el.classList.remove(clase); void el.getBoundingClientRect(); el.classList.add(clase); }
const lampara = () => $('#t-lamp').content.firstElementChild.cloneNode(true);
for (const h of document.querySelectorAll('[data-lamp]')) h.replaceWith(lampara());
function reacciona(l) { anima(l, 'mece'); anima(l, 'prende'); }
function colorTest(id) {
  const T = TESTS[id];
  document.documentElement.style.setProperty('--tc', T.color);
  document.documentElement.style.setProperty('--tt', T.tinta);
  document.documentElement.dataset.test = id;
  $('meta[name="theme-color"]').content = T.color;
}

function signo(mes, dia) {
  const v = mes * 100 + dia;
  let s = SIGNOS[0];  // capricornio cubre del 22 de diciembre al 19 de enero
  for (const g of SIGNOS.slice(1)) if (v >= g[1] * 100 + g[2]) s = g;
  if (v >= 1222) s = SIGNOS[0];
  return s;
}

/* ══════════ EL LAMPARIARIO ══════════
   Se guarda en el teléfono. Si el navegador no deja guardar, el juego sigue
   igual: solo no recuerda. */
const LLAVE = 'lamparometro.album.v1';
function album() {
  try { const a = JSON.parse(localStorage.getItem(LLAVE)); if (a && typeof a === 'object') return { pj: {}, prov: {}, prod: {}, ...a }; } catch {}
  return { pj: {}, prov: {}, prod: {} };
}
function registra(cat, k) {
  const a = album();
  const nueva = !a[cat][k];
  a[cat][k] = 1;
  try { localStorage.setItem(LLAVE, JSON.stringify(a)); } catch {}
  return nueva;
}
const LLAVE_RECORD = 'lamparometro.record.v1';
function record() { try { return +localStorage.getItem(LLAVE_RECORD) || 0; } catch { return 0; } }
function guardaRecord(n) { const viejo = record(); if (n > viejo) { try { localStorage.setItem(LLAVE_RECORD, n); } catch {} return true; } return false; }
const totalAlbum = () => Object.values(ALBUM).reduce((n, g) => n + Object.keys(g).length, 0);
const tienesDe = (a, cat) => Object.keys(a[cat]).filter((k) => ALBUM[cat][k]).length;
const tienes = (a = album()) => Object.keys(ALBUM).reduce((n, c) => n + tienesDe(a, c), 0);
function pintaAlbum() {
  const n = tienes(), t = totalAlbum();
  $('#cab-album').textContent = n;
  $('#album-txt').textContent = n ? `${n} de ${t} cartas · te faltan ${t - n}` : `Colecciona las ${t} cartas jugando`;
  $('#album-barra').style.width = (n / t * 100) + '%';
}

/* ══════════ ESTADO ══════════ */
let st = null;   // { id, orden: [índices], i, resp: [], fecha, decidido, asi, lider, reto }
let reloj = 0, ultimoQuip = '', ultimaPartida = null;

function mostrar(id) {
  const juego = id === 'test';
  $('#test').hidden = !juego;
  document.body.classList.toggle('jugando', juego);
  for (const p of document.querySelectorAll('main .g-pantalla')) p.hidden = p.id !== id;
  if (!juego) window.scrollTo({ top: 0 });
  $('#' + id).focus({ preventScroll: true });
}

function portada() {
  st = null;
  ocultaHoja();
  colorTest('lamparometro');
  history.replaceState(null, '', location.pathname + location.search);
  pintaPortada();
  mostrar('portada');
}

/* qué preguntas salen en esta partida */
function sorteo(T) {
  if (T.tipo === 'quiz') {
    const reales = Math.min(REALES.length, Math.round(T.ronda / 2) + Math.floor(Math.random() * 3) - 1);   // cuatro, cinco o seis
    const r = baraja(REALES).slice(0, reales).map((o) => ({ ...o, real: true }));
    const f = baraja(FALSOS).slice(0, T.ronda - r.length).map((o) => ({ ...o, real: false }));
    return baraja(r.concat(f));
  }
  const idx = T.preguntas.map((_, i) => i);
  if (T.tipo === 'plano') {
    const n = Math.round(T.ronda / 3);
    return baraja(EJES.flatMap((e) => baraja(idx.filter((i) => T.preguntas[i].eje === e)).slice(0, n)));
  }
  if (T.por) {
    const grupos = [];
    for (const i of idx) { const g = T.preguntas[i][T.por]; if (!grupos.includes(g)) grupos.push(g); }
    return grupos.map((g) => azar(idx.filter((i) => T.preguntas[i][T.por] === g)));
  }
  const fijas = idx.filter((i) => T.preguntas[i].fija);
  const resto = baraja(idx.filter((i) => !T.preguntas[i].fija)).slice(0, Math.max(0, (T.ronda || idx.length) - fijas.length));
  return resto.concat(fijas);
}

function empezar(id, reto) {
  for (const c of document.querySelectorAll('.g-papeles')) c.remove();
  colorTest(id);
  st = { id, orden: sorteo(TESTS[id]), i: 0, resp: [], fecha: null, decidido: false, asi: false, lider: null, reto: reto || null,
    puntos: 0, racha: 0, mejor: 0, aciertos: 0, log: [] };
  ocultaHoja();
  history.replaceState(null, '', location.pathname + location.search);
  mostrar('test');
  pregunta();
}

const pasos = () => st.orden.length + (TESTS[st.id].fecha ? 1 : 0);
const hecho = () => st.i + (TESTS[st.id].fecha && st.fecha ? 1 : 0);
function progreso(n) {
  const pct = Math.round(n / pasos() * 100);
  $('#q-barra i').style.width = pct + '%';
  $('#q-barra').setAttribute('aria-valuenow', pct);
}

function pregunta() {
  const T = TESTS[st.id];
  st.decidido = false;
  st.asi = false;
  progreso(hecho());
  $('#q-n').textContent = `${Math.min(hecho() + 1, pasos())}/${pasos()}`;
  anima($('#q-n'), 'salta');
  if (T.fecha && !st.fecha) return fechaPaso();
  if (T.tipo === 'quiz') return preguntaQuiz();

  const q = T.preguntas[st.orden[st.i]];
  const plano = T.tipo === 'plano';
  const ops = plano ? ESCALA : q.op;
  $('#q-cuerpo').innerHTML = `
    <div class="g-carta g-entra">
      <p class="g-carta__k">${esc(q.astro || T.corto)}</p>
      <h2 class="g-pregunta" id="q-t">${esc(q.t)}</h2>
    </div>
    <ul class="g-ops${plano ? ' g-ops--escala' : ''}">${ops.map((o, k) => `<li>
      <button class="g-op g-op--${k}" type="button" data-k="${k}" style="--i:${k}">
        <span class="g-op__f" aria-hidden="true">${plano ? esc(o.s) : `<svg viewBox="0 0 24 24">${FORMAS[k]}</svg>`}</span>
        <span>${esc(o.t)}</span></button></li>`).join('')}</ul>
    ${plano ? '<button class="g-saltar" type="button" id="q-saltar">Chuta, no sé</button>' : ''}`;
  $('.g-carta').prepend(lampara());
}

function fechaPaso() {
  const dias = Array.from({ length: 31 }, (_, k) => `<option>${k + 1}</option>`).join('');
  const meses = MESES.map((m, k) => `<option value="${k + 1}">${m}</option>`).join('');
  $('#q-cuerpo').innerHTML = `
    <div class="g-carta g-entra">
      <p class="g-carta__k">Sol</p>
      <h2 class="g-pregunta" id="q-t">¿Cuándo es tu cumpleaños?</h2>
      <div class="g-fechas">
        <label>Día<select id="f-dia">${dias}</select></label>
        <label>Mes<select id="f-mes">${meses}</select></label></div>
      <button class="g-btn g-btn--test" type="button" id="f-ok">Ver mi sol</button>
    </div>`;
  $('.g-carta').prepend(lampara());
  $('#f-ok').addEventListener('click', () => {
    if (st.decidido) return;
    const dia = +$('#f-dia').value, mes = +$('#f-mes').value;
    const max = new Date(2024, mes, 0).getDate();   // 2024 es bisiesto: el 29 de febrero vale
    st.fecha = { dia: Math.min(dia, max), mes };
    const s = signo(mes, st.fecha.dia);
    st.decidido = true;
    progreso(1);
    reacciona($('#q-cuerpo .g-lamp'));
    vibra(10);
    muestraHoja(`Sol en ${s[0]}. Compartes sol con ${PJ[Object.keys(s[3])[0]].nombre}.`, ESPERA + 400);
  });
}

/* ══════════ ¿NOTICIA REAL O EL MERCIO? ══════════
   Contra reloj: cuanto más rápido aciertas, más puntos, y la racha suma. */
function preguntaQuiz() {
  const T = TESTS[st.id];
  const it = st.orden[st.i];
  $('#q-cuerpo').innerHTML = `
    <div class="g-carta g-recorte g-entra">
      <p class="g-carta__k"><span>Titular ${st.i + 1}</span><span class="g-marcador">${st.racha >= 2 ? `<b class="g-racha"><svg class="icono icono--s" aria-hidden="true"><use href="#i-rayo"/></svg>${st.racha}</b>` : ''}${st.puntos} pts</span></p>
      <h2 class="g-titular" id="q-t">${esc(it.t)}</h2>
      <span class="g-reloj" aria-hidden="true"><i style="animation-duration:${T.tiempo}ms"></i></span>
    </div>
    <ul class="g-ops g-ops--quiz">
      <li><button class="g-op g-op--real" type="button" data-k="0" style="--i:0"><span class="g-op__f" aria-hidden="true"><svg class="icono"><use href="#i-check"/></svg></span><span>Pasó de verdad</span></button></li>
      <li><button class="g-op g-op--falso" type="button" data-k="1" style="--i:1"><span class="g-op__f" aria-hidden="true"><svg class="icono"><use href="#i-periodico"/></svg></span><span>Es de EL MERCIO</span></button></li>
    </ul>`;
  $('.g-carta').prepend(lampara());
  st.t0 = performance.now();
  clearTimeout(reloj);
  reloj = setTimeout(() => responderQuiz(-1), T.tiempo);
}

function responderQuiz(k) {
  if (!st || st.decidido) return;
  clearTimeout(reloj);
  const T = TESTS[st.id];
  const it = st.orden[st.i];
  st.decidido = true;
  st.resp[st.i] = k;
  const bien = k >= 0 && (k === 0) === it.real;
  const resta = Math.max(0, T.tiempo - (performance.now() - st.t0));
  let gana = 0;
  if (bien) {
    gana = 100 + Math.round(resta / T.tiempo * 100) + 25 * st.racha;
    st.racha++; st.aciertos++;
    st.mejor = Math.max(st.mejor, st.racha);
  } else st.racha = 0;
  st.puntos += gana;
  st.log.push({ t: it.t, real: it.real, k, bien, fuente: it.fuente, url: it.url });
  vibra(bien ? 12 : [30, 40, 30]);
  const ops = $('#q-cuerpo .g-ops');
  ops.classList.add('decidido');
  const correcta = ops.querySelector(`[data-k="${it.real ? 0 : 1}"]`);
  correcta.classList.add('correcta');
  if (k >= 0) ops.querySelector(`[data-k="${k}"]`).classList.add(bien ? 'elegida' : 'mal');
  $('.g-reloj')?.classList.add('parado');
  reacciona($('#q-cuerpo .g-lamp'));
  progreso(st.i + 1);
  const titulo = k < 0 ? 'Se te fue el bus' : bien ? `¡Correcto! +${gana}` : it.real ? '¡Era real!' : '¡Te la creíste!';
  const texto = it.real ? it.dato : `Lo inventó EL MERCIO. ${it.q || ''}`.trim();
  muestraHoja(texto, 5200, { titulo, bien, fuente: it.real ? it : null });
}

/* tocar una opción: se hunde, las demás se apagan, Lamparita se mece y sube
   la hoja con lo que dice la redacción */
function elegir(k) {
  if (!st || st.decidido || st.asi) return;
  const T = TESTS[st.id];
  const q = T.preguntas[st.orden[st.i]];
  st.decidido = true;
  st.resp[st.i] = k;
  vibra(12);
  const ops = $('#q-cuerpo .g-ops');
  if (ops) { ops.classList.add('decidido'); if (k >= 0) ops.querySelector(`[data-k="${k}"]`)?.classList.add('elegida'); }
  const salto = $('#q-saltar'); if (salto) salto.hidden = true;
  reacciona($('#q-cuerpo .g-lamp'));
  progreso(hecho() + 1);
  let texto;
  if (T.tipo === 'plano') texto = k < 0 ? azar(SALTO.q) : q.q?.[ESCALA[k].v > 0 ? 0 : 1];
  else texto = q.op[k].q;
  if (!texto) { do texto = azar(QUIPS); while (texto === ultimoQuip && QUIPS.length > 1); }
  ultimoQuip = texto;
  muestraHoja(texto, ESPERA);
}

function muestraHoja(texto, espera, extra = {}) {
  $('#hoja-q').textContent = texto;
  const de = $('#hoja-de');
  de.textContent = extra.titulo || 'La redacción dice';
  de.dataset.estado = extra.titulo ? (extra.bien ? 'bien' : 'mal') : '';
  const f = $('#hoja-fuente');
  f.hidden = !extra.fuente;
  if (extra.fuente) { f.href = extra.fuente.url; f.textContent = `Fuente: ${extra.fuente.fuente}${extra.fuente.fecha ? ', ' + extra.fuente.fecha : ''}`; }
  const h = $('#hoja');
  h.style.setProperty('--espera', espera + 'ms');
  h.classList.remove('ve'); void h.offsetWidth; h.classList.add('ve');
  reacciona($('#hoja .g-lamp'));
  clearTimeout(reloj);
  reloj = setTimeout(avanzar, quieto.matches ? espera + 1000 : espera);
}
function ocultaHoja() { clearTimeout(reloj); $('#hoja').classList.remove('ve'); }

function avanzar() {
  if (!st || !st.decidido || st.asi) return;
  ocultaHoja();
  const T = TESTS[st.id];
  if (T.fecha && st.fecha && st.i === 0 && st.resp.length === 0) return pregunta();
  if (st.i < st.orden.length - 1) {
    st.i++;
    if (T.tipo !== 'quiz' && st.i % CADA === 0 && st.orden.length - st.i >= 2) return asiVas();
    return pregunta();
  }
  const r = calcular();
  st.terminado = true;
  location.hash = 'r=' + cod(r) + (st.reto ? '&vs=' + cod(st.reto) : '');
}

/* «Así vas»: el podio provisional, con un comentario de quién sube */
function asiVas() {
  st.asi = true;
  st.decidido = true;
  const rk = ranking(calcular(true)).slice(0, 3);
  const lider = rk[0];
  const frase = st.lider && st.lider !== lider.k
    ? `¡${lider.o.nombre} le quitó el primer puesto a ${TESTS[st.id].grupo[st.lider].nombre}!`
    : `${lider.o.nombre} va adelante, pero ${rk[1].o.nombre} viene subiendo.`;
  st.lider = lider.k;
  const max = Math.max(1, lider.pct);
  $('#q-cuerpo').innerHTML = `
    <div class="g-asi" role="status">
      <h2>Así vas…</h2>
      <p>${esc(frase)}</p>
      <ol>${rk.map((x, i) => `<li style="--i:${i}"><b>${i + 1}</b>${mono(x.o, i ? 'g-mono--s' : '')}
        <div><span class="g-asi__n">${esc(x.o.nombre)}</span><span class="g-barra" style="--b:${x.o.c}"><i data-w="${Math.round(x.pct / max * 100)}"></i></span></div></li>`).join('')}</ol>
      <button class="g-btn g-btn--test" type="button" id="asi-seguir">Seguir</button>
    </div>`;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    for (const i of document.querySelectorAll('.g-asi .g-barra i')) i.style.width = i.dataset.w + '%';
  }));
  vibra([8, 30, 8]);
  clearTimeout(reloj);
  reloj = setTimeout(sigueAsi, quieto.matches ? 4000 : 2800);
}
function sigueAsi() { if (!st?.asi) return; clearTimeout(reloj); pregunta(); }

function salir() {
  if (!st || (st.i === 0 && !st.decidido)) return portada();
  clearTimeout(reloj);
  const d = $('#salir');
  if (typeof d.showModal === 'function') d.showModal();
  else if (confirm('¿Salir del test? Se pierde lo respondido.')) portada();
}
$('#salir').addEventListener('click', (e) => {
  const b = e.target.closest('[data-cerrar]');
  if (!b) return;
  $('#salir').close();
  if (b.value === 'salgo') portada();
  else if (st?.asi) reloj = setTimeout(sigueAsi, 1200);
  else if (st?.decidido) reloj = setTimeout(avanzar, 800);
  else if (st && TESTS[st.id].tipo === 'quiz') preguntaQuiz();
});

/* ══════════ CÁLCULO ══════════
   `parcial` cuenta solo lo respondido hasta ahora (para «Así vas»). */
function calcular(parcial) {
  const T = TESTS[st.id];
  if (T.tipo === 'quiz') { ultimaPartida = st.log.slice(); return { id: st.id, puntos: st.puntos, aciertos: st.aciertos, racha: st.mejor, total: st.orden.length }; }
  const n = parcial ? st.resp.length : st.orden.length;
  const pares = st.orden.slice(0, n).map((qi, i) => [qi, st.resp[i]]).filter(([, a]) => a !== undefined);
  if (T.tipo === 'plano') {
    const acc = { x: [0, 0], y: [0, 0], z: [0, 0] };
    for (const [qi, a] of pares) {
      const q = T.preguntas[qi];
      acc[q.eje][0] += (a >= 0 ? ESCALA[a].v : SALTO.v) * q.s * q.w;
      acc[q.eje][1] += 2 * q.w;
    }
    const r = { id: st.id };
    for (const e of EJES) r[e] = acc[e][1] ? Math.round(acc[e][0] / acc[e][1] * 100) / 10 : 0;
    return r;
  }
  if (T.tipo === 'rasgos') return perfil(st.id, pares);
  const pts = Object.fromEntries(Object.keys(T.grupo).map((k) => [k, 0]));
  const carta = [];
  const suma = (p) => { for (const [k, v] of Object.entries(p)) pts[k] += v; };
  if (T.fecha && st.fecha) { const s = signo(st.fecha.mes, st.fecha.dia); suma(s[3]); carta.push(s[0]); }
  for (const [qi, a] of pares) { const o = T.preguntas[qi].op[a]; suma(o.p); if (o.casa) carta.push(o.casa); }
  return { id: st.id, pts, carta };
}

/* El tope de cada rasgo sale de las preguntas que salieron: el mínimo y el
   máximo que se pueden sumar, y la media de quien responde al azar. Se
   compara contra esa media y no contra el 5, o todo el mundo caería en la
   provincia más tibia. */
function perfil(id, pares) {
  const T = TESTS[id];
  const qs = pares.map(([qi]) => T.preguntas[qi]);
  const tp = Object.fromEntries(RASGOS.map((r) => {
    let a = 0, b = 0, c = 0;
    for (const q of qs) { const v = q.op.map((o) => o.r[r.k] || 0); a += Math.min(...v); b += Math.max(...v); c += v.reduce((x, y) => x + y, 0) / v.length; }
    return [r.k, [a, b, c]];
  }));
  const escala = (k, n) => (n - tp[k][0]) / ((tp[k][1] - tp[k][0]) || 1) * 10;
  const sum = Object.fromEntries(RASGOS.map((r) => [r.k, 0]));
  const firma = {};
  for (const [qi, a] of pares) {
    const o = T.preguntas[qi].op[a];
    for (const [k, v] of Object.entries(o.r)) sum[k] += v;
    for (const [k, v] of Object.entries(o.b || {})) firma[k] = (firma[k] || 0) + v;
  }
  return {
    id, pares,
    v: RASGOS.map((r) => Math.round(escala(r.k, sum[r.k]) * 10) / 10),
    media: RASGOS.map((r) => escala(r.k, tp[r.k][2])),
    firma
  };
}

/* El resultado viaja en el enlace para compartirlo sin servidor:
   lamparometro,3.5,-2,6 · provincia,3-1.7-0… · playlist,2.0.1…,Leo.Tarima */
function cod(r) {
  const T = TESTS[r.id];
  if (T.tipo === 'quiz') return `${r.id},${r.puntos},${r.aciertos},${r.racha},${r.total}`;
  if (T.tipo === 'plano') return `${r.id},${r.x},${r.y},${r.z}`;
  if (T.tipo === 'rasgos') return `${r.id},${r.pares.map(([q, a]) => q + '-' + a).join('.')}`;
  let c = `${r.id},${Object.keys(T.grupo).map((k) => r.pts[k]).join('.')}`;
  if (r.carta.length) c += ',' + r.carta.map(encodeURIComponent).join('.');
  return c;
}
const clamp = (n) => Math.max(-10, Math.min(10, n));
function leer(txt) {
  const m = /^([a-z]+),(.+)$/.exec(txt || '');
  if (!m || !TESTS[m[1]]) return null;
  const T = TESTS[m[1]];
  const partes = m[2].split(',');
  if (T.tipo === 'quiz') {
    const [puntos, aciertos, racha, total] = partes.map(Number);
    const ok = [puntos, aciertos, racha, total].every(Number.isInteger) && total > 0 && total <= 20 && aciertos >= 0 && aciertos <= total
      && racha >= 0 && racha <= aciertos && puntos >= 0 && puntos <= total * 500;
    return ok ? { id: m[1], puntos, aciertos, racha, total } : null;
  }
  if (T.tipo === 'plano') {
    const n = partes.map(Number);
    const r = { id: m[1], x: clamp(n[0]), y: clamp(n[1]), z: clamp(partes[2] === undefined ? 0 : n[2]) };
    return EJES.some((e) => Number.isNaN(r[e])) ? null : r;
  }
  if (T.tipo === 'rasgos') {
    const pares = partes[0].split('.').map((p) => p.split('-').map(Number));
    const vistos = new Set();
    const ok = pares.length >= 4 && pares.length <= T.preguntas.length && pares.every(([q, a]) =>
      Number.isInteger(q) && Number.isInteger(a) && T.preguntas[q] && a >= 0 && a < T.preguntas[q].op.length && !vistos.has(q) && vistos.add(q));
    return ok ? perfil(m[1], pares) : null;
  }
  const claves = Object.keys(T.grupo);
  const v = partes[0].split('.').map(Number);
  if (v.length !== claves.length || v.some((n) => !Number.isFinite(n) || n < 0 || n > 80)) return null;
  const carta = partes[1] ? partes[1].split('.').map((s) => { try { return decodeURIComponent(s).slice(0, 40); } catch { return ''; } }) : [];
  return { id: m[1], pts: Object.fromEntries(claves.map((k, i) => [k, v[i]])), carta };
}

function ranking(r) {
  const T = TESTS[r.id];
  if (T.tipo === 'plano') {
    // afinidad: 100 % encima; 0 % a veinticinco puntos de distancia en los tres ejes
    return Object.entries(PJ).map(([k, p]) => {
      const d = Math.hypot(p.x - r.x, p.y - r.y, (p.z - r.z) * .8);
      return { k, o: p, pct: Math.max(0, Math.round(100 - d / 25 * 100)) };
    }).sort((a, b) => b.pct - a.pct);
  }
  if (T.tipo === 'rasgos') {
    // coseno entre lo que te apartas de la media y lo que se aparta la provincia
    const lista = Object.entries(T.grupo);
    const pm = RASGOS.map((_, i) => lista.reduce((a, [, p]) => a + p.v[i], 0) / lista.length);
    const u = r.v.map((n, i) => n - r.media[i]);
    const nu = Math.hypot(...u) || 1;
    return lista.map(([k, p]) => {
      const c = p.v.map((n, i) => n - pm[i]);
      const cos = c.reduce((a, n, i) => a + n * u[i], 0) / ((Math.hypot(...c) || 1) * nu);
      const s = cos + FIRMA * (r.firma[k] || 0);
      return { k, o: p, s, pct: Math.max(0, Math.min(99, Math.round(s / 1.3 * 100))) };
    }).sort((a, b) => b.s - a.s);
  }
  const total = Object.values(r.pts).reduce((a, b) => a + b, 0) || 1;
  return Object.entries(r.pts).map(([k, v]) => ({ k, o: T.grupo[k], pct: Math.round(v / total * 100) }))
    .sort((a, b) => b.pct - a.pct || a.k.localeCompare(b.k));
}

/* qué tan compatibles son dos resultados del mismo test, de 0 a 100 */
function compat(a, b) {
  const T = TESTS[a.id];
  const cos = (x, y) => { const d = x.reduce((s, n, i) => s + n * y[i], 0); return d / ((Math.hypot(...x) || 1) * (Math.hypot(...y) || 1)); };
  if (T.tipo === 'plano') return Math.max(0, Math.round(100 - Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) / 34.6 * 100));
  if (T.tipo === 'rasgos') return Math.round((cos(a.v.map((n, i) => n - a.media[i]), b.v.map((n, i) => n - b.media[i])) + 1) / 2 * 100);
  const ks = Object.keys(T.grupo);
  return Math.round(Math.max(0, cos(ks.map((k) => a.pts[k]), ks.map((k) => b.pts[k]))) * 100);
}
function fraseCompat(p) {
  if (p >= 80) return 'Almas gemelas: comparten hasta la lámina.';
  if (p >= 60) return 'Se entienden, con matices de sobremesa.';
  if (p >= 40) return 'Pueden ir juntos en el bus, pero no a la misma farra.';
  if (p >= 20) return 'En la boda, mesas separadas.';
  return 'Uno en la tarima y el otro llamando a la policía.';
}

/* ══════════ RESULTADO ══════════
   Primero el podio sube de a uno: tercero, segundo y, con suspenso, el
   primero. Después cae el confeti y aparece la carta coleccionable. */
function resultado(r, ajeno, vs) {
  const T = TESTS[r.id];
  if (T.tipo === 'quiz') return resultadoQuiz(r, ajeno, vs);
  colorTest(r.id);
  const rk = ranking(r);
  const g = rk[0].o;
  const que = T.cosa ? 'Eres' : 'Te pareces a';
  const nueva = !ajeno && registra(T.album, rk[0].k);
  const lista = Object.keys(ALBUM[T.album]);
  const numero = String(lista.indexOf(rk[0].k) + 1).padStart(2, '0');
  const top = rk.slice(0, 3);
  const maxp = Math.max(1, top[0].pct);
  const col = (x, n) => x ? `<div class="g-col g-col--${n}">
      <div class="g-col__quien">${mono(x.o, n === 1 ? '' : 'g-mono--s')}<b>${esc(x.o.nombre)}</b></div>
      <div class="g-col__barra" style="--h:${Math.max(22, Math.round(x.pct / maxp * (n === 1 ? 72 : 54)))}%">${n}</div></div>` : '<div></div>';
  const otros = Object.keys(TESTS).filter((k) => k !== r.id);
  const pctVs = vs ? compat(r, vs) : 0;
  const gVs = vs ? ranking(vs)[0].o : null;

  const el = $('#resultado');
  el.innerHTML = `
    <div class="g-res-hero">
      <p class="g-hero__k">${esc(T.kicker)}</p>
      ${ajeno ? `<p class="g-ajeno">A alguien le salió esto. Juega y compárate.</p>` : ''}
      <p class="g-anuncio" id="r-anuncio"><span class="g-puntos">Contando votos</span></p>
      <div class="g-podio3">${col(top[1], 2)}${col(top[0], 1)}${col(top[2], 3)}</div>
    </div>
    <div class="g-despues">
      <article class="g-coleccionable">
        <span class="g-num">Nº ${numero} / ${lista.length}</span>
        ${nueva ? '<span class="g-nueva">¡Nueva carta!</span>' : ''}
        ${mono(g, 'g-mono--xl')}
        <p class="g-coleccionable__que">${que}</p>
        <h1 id="r-t">${esc(g.nombre)}</h1>
        <ul class="g-chips"><li>${esc(g.apodo)}</li>${g.region ? `<li>${esc(g.region)}</li>` : ''}<li>${rk[0].pct} % de afinidad</li></ul>
        <p class="g-frase">«${esc(g.frase)}»</p>
        <p class="g-desc">${esc(g.desc)}</p>
        <ul class="g-rasgos">${g.rasgos.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      </article>
      <div class="g-acciones">
        <button class="g-btn g-btn--test" type="button" data-accion="compartir"><svg class="icono" aria-hidden="true"><use href="#i-compartir"/></svg> Compartir</button>
        <button class="g-btn g-btn--reto" type="button" data-accion="reto"><svg class="icono" aria-hidden="true"><use href="#i-rayo"/></svg> Retar a un pana</button>
        <button class="g-btn g-btn--suave" type="button" data-accion="tarjeta"><svg class="icono icono--s" aria-hidden="true"><use href="#i-descargar"/></svg> Tarjeta</button>
        <button class="g-btn g-btn--suave" type="button" data-empezar="${r.id}"><svg class="icono icono--s" aria-hidden="true"><use href="#i-reiniciar"/></svg> ${ajeno ? 'Jugar' : 'Otra vez'}</button>
      </div>
      ${vs ? `<section class="g-panel"><h2>Tú contra tu pana</h2>
        <div class="g-vs">
          <div class="g-vs__quien"><small>Tú</small>${mono(g)}<b>${esc(g.nombre)}</b></div>
          <div class="g-vs__pct">${pctVs} %</div>
          <div class="g-vs__quien"><small>Tu pana</small>${mono(gVs)}<b>${esc(gVs.nombre)}</b></div>
          <p>${esc(fraseCompat(pctVs))}</p>
        </div></section>` : ''}
      ${r.carta && r.carta.length ? `<section class="g-panel"><h2>Tu carta astral</h2>
        <ul class="g-carta-astral">${r.carta.map((c, i) => `<li>${esc(T.astros[i] || '')} ${esc(c)}</li>`).join('')}</ul></section>` : ''}
      ${T.tipo === 'plano' ? planoHTML(r) : ''}
      ${T.tipo === 'rasgos' ? adnHTML(r, g) : ''}
      <section class="g-panel"><h2>${T.tipo === 'rasgos' ? 'También podrías ser' : T.cosa ? 'Tu percha' : 'Tu podio completo'}</h2>
        <ol class="g-lista">${rk.slice(1, 7).filter((x) => x.pct > 0).map((x) => `<li>${mono(x.o, 'g-mono--s')}
          <div><b>${esc(x.o.nombre)}</b><span class="g-barra" style="--b:${x.o.c}"><i style="width:${x.pct}%"></i></span></div>
          <span class="tabular">${x.pct} %</span></li>`).join('')}</ol></section>
      <h2 class="g-h2">Sigue jugando</h2>
      <ul class="g-tests">${otros.map(tarjetaTest).join('')}</ul>
      <p class="g-aviso">Sátira. Las personas, personajes y provincias de este test no participaron
      ni lo aprobaron, y lo que dice de ellos es una exageración cariñosa, no un dato.</p>
    </div>`;
  el._r = r;
  mostrar('resultado');
  pintaAlbum();

  const anuncio = T.cosa ? `¡Eres ${g.nombre}!` : '¡Ya salió!';
  if (quieto.matches) { el.classList.remove('suspenso', 'contando'); el.classList.add('revelado'); $('#r-anuncio').textContent = anuncio; return; }
  el.classList.remove('revelado');
  el.classList.add('suspenso', 'contando');
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('suspenso')));
  setTimeout(() => {
    $('#r-anuncio').textContent = anuncio;
    el.classList.remove('contando');
    el.classList.add('revelado');
    confeti();
    vibra([20, 40, 20]);
  }, 2000);
}

const RANGOS = [
  [10, 'Director de EL MERCIO.', 'Nadie te engaña. Ni nosotros.'],
  [8, 'Periodista de investigación', 'Tienes olfato. Y fuentes.'],
  [6, 'Columnista de opinión', 'Opinas con datos, a veces.'],
  [4, 'Pasante con buena intención', 'Vas aprendiendo, mijo.'],
  [2, 'Tío del grupo de WhatsApp', 'Lo reenvías todo, por si acaso.'],
  [0, 'Reenviador profesional de cadenas', 'Te creíste hasta lo del cuy.']
];
const rango = (r) => { const a = Math.round(r.aciertos / r.total * 10); return RANGOS.find(([n]) => a >= n); };

function resultadoQuiz(r, ajeno, vs) {
  const T = TESTS[r.id];
  colorTest(r.id);
  const [, nombre, sub] = rango(r);
  const nuevoRecord = !ajeno && guardaRecord(r.puntos);
  const log = !ajeno ? ultimaPartida : null;
  const el = $('#resultado');
  el.innerHTML = `
    <div class="g-res-hero">
      <p class="g-hero__k">${esc(T.kicker)} · ${esc(T.titulo)}</p>
      ${ajeno ? `<p class="g-ajeno">A alguien le salió esto. Juega y supéralo.</p>` : ''}
      <p class="g-anuncio" id="r-anuncio"><span class="g-puntos">Contando votos</span></p>
      <p class="g-puntaje"><b id="r-puntos" data-n="${r.puntos}">0</b><small>puntos</small></p>
    </div>
    <div class="g-despues">
      <article class="g-coleccionable">
        ${nuevoRecord ? '<span class="g-nueva">¡Nuevo récord!</span>' : ''}
        ${mono({ ini: `${r.aciertos}/${r.total}`, c: T.color, t: T.tinta }, 'g-mono--xl')}
        <p class="g-coleccionable__que">Eres</p>
        <h1 id="r-t">${esc(nombre)}</h1>
        <ul class="g-chips"><li>${r.aciertos} de ${r.total} aciertos</li><li>Mejor racha: ${r.racha}</li>${ajeno ? '' : `<li>Tu récord: ${record()}</li>`}</ul>
        <p class="g-frase">«${esc(sub)}»</p>
      </article>
      <div class="g-acciones">
        <button class="g-btn g-btn--test" type="button" data-accion="compartir"><svg class="icono" aria-hidden="true"><use href="#i-compartir"/></svg> Compartir</button>
        <button class="g-btn g-btn--reto" type="button" data-accion="reto"><svg class="icono" aria-hidden="true"><use href="#i-rayo"/></svg> Retar a un pana</button>
        <button class="g-btn g-btn--suave" type="button" data-accion="tarjeta"><svg class="icono icono--s" aria-hidden="true"><use href="#i-descargar"/></svg> Tarjeta</button>
        <button class="g-btn g-btn--suave" type="button" data-empezar="${r.id}"><svg class="icono icono--s" aria-hidden="true"><use href="#i-reiniciar"/></svg> ${ajeno ? 'Jugar' : 'Otra vez'}</button>
      </div>
      ${vs ? `<section class="g-panel"><h2>Tú contra tu pana</h2>
        <div class="g-vs">
          <div class="g-vs__quien"><small>Tú</small><b class="g-vs__pts">${r.puntos}</b><b>${r.aciertos}/${r.total}</b></div>
          <div class="g-vs__pct">${r.puntos === vs.puntos ? '=' : r.puntos > vs.puntos ? '>' : '<'}</div>
          <div class="g-vs__quien"><small>Tu pana</small><b class="g-vs__pts">${vs.puntos}</b><b>${vs.aciertos}/${vs.total}</b></div>
          <p>${r.puntos === vs.puntos ? 'Empate técnico, como en la Asamblea.' : r.puntos > vs.puntos ? `Le ganaste por ${r.puntos - vs.puntos} puntos. Mándale el pantallazo.` : `Te ganó por ${vs.puntos - r.puntos} puntos. Pide la revancha.`}</p>
        </div></section>` : ''}
      ${log ? `<section class="g-panel"><h2>Tus titulares</h2>
        <ol class="g-repaso">${log.map((x) => `<li class="${x.bien ? 'bien' : 'mal'}">
          <span class="g-repaso__s" aria-label="${x.bien ? 'Acertaste' : 'Fallaste'}">${x.bien ? '✓' : '✗'}</span>
          <div><b>${esc(x.t)}</b><small>${x.real ? `Real · <a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.fuente)}</a>` : 'Inventado por EL MERCIO.'}</small></div></li>`).join('')}</ol></section>` : ''}
      <h2 class="g-h2">Sigue jugando</h2>
      <ul class="g-tests">${Object.keys(TESTS).filter((k) => k !== r.id).map(tarjetaTest).join('')}</ul>
      <p class="g-aviso">Los titulares reales resumen noticias publicadas por los medios que se citan; los
      falsos los inventó la redacción de EL MERCIO. y no se refieren a ninguna persona real.</p>
    </div>`;
  el._r = r;
  mostrar('resultado');
  pintaAlbum();
  const anuncio = nuevoRecord ? '¡Nuevo récord!' : '¡Se acabó!';
  const cuenta = () => {
    const b = $('#r-puntos'), fin = +b.dataset.n, t0 = performance.now();
    const paso = (t) => { const k = Math.min(1, (t - t0) / 1200); b.textContent = Math.round(fin * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(paso); };
    requestAnimationFrame(paso);
  };
  if (quieto.matches) { el.classList.add('revelado'); $('#r-anuncio').textContent = anuncio; $('#r-puntos').textContent = r.puntos; return; }
  el.classList.remove('revelado');
  el.classList.add('contando');
  setTimeout(() => {
    $('#r-anuncio').textContent = anuncio;
    cuenta();
    el.classList.remove('contando');
    el.classList.add('revelado');
    if (nuevoRecord || r.aciertos >= r.total * .7) confeti();
    vibra([20, 40, 20]);
  }, 900);
}

function confeti() {
  if (quieto.matches) return;
  const caja = document.createElement('div');
  caja.className = 'g-papeles';
  const colores = ['#c53b2b', '#141414', '#2f6fdf', '#f0b429', '#1f9d6a', '#ffffff'];
  caja.innerHTML = Array.from({ length: 56 }, () => {
    const l = Math.random() * 100, x = (Math.random() - .5) * 180;
    return `<i style="left:${l}%;--c:${azar(colores)};--x:${x}px;--g:${Math.round(Math.random() * 900 - 450)}deg;--d:${(1.6 + Math.random() * 1.4).toFixed(2)}s;--r:${(Math.random() * .5).toFixed(2)}s"></i>`;
  }).join('');
  document.body.appendChild(caja);
  setTimeout(() => caja.remove(), 3800);
}

function adnHTML(r, g) {
  return `<section class="g-panel"><h2>Tu ADN provincial</h2>
    <ul class="g-adn">${RASGOS.map((x, i) => `<li>
      <b>${esc(x.nombre)}</b>
      <span class="g-barra"><i style="width:${r.v[i] * 10}%"></i><s style="left:${g.v[i] * 10}%" title="${esc(g.nombre)}"></s></span>
      <span>${esc(r.v[i] >= 5 ? x.alto : x.bajo)}</span></li>`).join('')}</ul>
    <p class="g-quien">La barra es tuya; la rayita, de ${esc(g.nombre)}.</p></section>`;
}

function planoHTML(r) {
  const L = 11;   // el plano va de −10 a 10 con un margen
  const pjs = Object.values(PJ).map((p) => `<g class="pj" data-n="${esc(p.nombre)}" tabindex="0" role="button" aria-label="${esc(p.nombre)}"><title>${esc(p.nombre)}</title>
      <circle cx="${p.x}" cy="${-p.y}" r=".78" fill="${p.c}"/>
      <text class="ini" x="${p.x}" y="${-p.y + .2}" text-anchor="middle" fill="${p.t}">${esc(p.ini)}</text></g>`).join('');
  const rej = [-5, 5].map((v) => `<line class="rej" x1="${v}" y1="-10" x2="${v}" y2="10"/><line class="rej" x1="-10" y1="${v}" x2="10" y2="${v}"/>`).join('');
  const ex = r.x < -3 ? 'Que pague el Estado' : r.x > 3 ? 'Que cada quien se rebusque' : 'Que pague el que pueda';
  const ey = r.y > 3 ? 'Mando yo' : r.y < -3 ? 'Aquí nadie manda' : 'Mandan todos y nadie';
  const ez = r.z > 5 ? 'Tarima, luces y humo' : r.z > 0 ? 'Lámpara con moderación' : r.z > -5 ? 'Perfil bajo, con escapadas' : 'Un Excel con patas';
  const sg = (n) => `${n > 0 ? '+' : ''}${n}`;
  return `<section class="g-panel"><h2>Tu lugar en el plano</h2>
    <svg class="g-plano" viewBox="${-L} ${-L - 1} ${2 * L} ${2 * L + 2}" role="img" aria-label="Plano político: estás en x ${r.x}, y ${r.y}">
      <rect class="cuad" x="-10" y="-10" width="10" height="10" fill="#c53b2b"/>
      <rect class="cuad" x="0" y="-10" width="10" height="10" fill="#2f6fdf"/>
      <rect class="cuad" x="-10" y="0" width="10" height="10" fill="#f0b429"/>
      <rect class="cuad" x="0" y="0" width="10" height="10" fill="#1f9d6a"/>
      ${rej}
      <line class="eje" x1="-10" y1="0" x2="10" y2="0"/><line class="eje" x1="0" y1="-10" x2="0" y2="10"/>
      <text class="rot" x="0" y="-10.5" text-anchor="middle">Mando yo · sabatina</text>
      <text class="rot" x="0" y="11.1" text-anchor="middle">Aquí nadie manda · farra</text>
      <text class="rot" x="-9.8" y="1">← Estado</text>
      <text class="rot" x="9.8" y="1" text-anchor="end">Rebusque →</text>
      ${pjs}
      <circle class="tu" cx="${r.x}" cy="${-r.y}" r="1.05" fill="none" stroke="#c53b2b" stroke-width=".3"/>
      <text class="tu-nom" x="${r.x}" y="${-r.y - 1.25}" text-anchor="middle">TÚ</text>
    </svg>
    <p class="g-quien" id="plano-quien" aria-live="polite">Toca un círculo para ver quién es.</p>
    <div class="g-ejes">
      <div><b>¿Quién paga?</b><span>${ex}</span> <small>(${sg(r.x)})</small></div>
      <div><b>¿Quién manda?</b><span>${ey}</span> <small>(${sg(r.y)})</small></div>
      <div class="g-ejes__z"><b>¿Cuánta lámpara? · el Lamparómetro</b><span>${ez}</span> <small>(${sg(r.z)})</small>
        <span class="g-barra"><i style="width:${(r.z + 10) * 5}%"></i></span></div>
    </div></section>`;
}

/* ══════════ EL LAMPARIARIO ══════════ */
function pantallaAlbum() {
  colorTest('lamparometro');
  const a = album(), n = tienes(a), t = totalAlbum();
  $('#album').innerHTML = `
    <div class="g-album-cab"><div data-lamp></div>
      <div><h1 id="album-t">Tu Lampariario</h1><p>${n} de ${t} cartas. ${n === t ? '¡Completo! Eres la lámpara mayor.' : `Te faltan ${t - n}: sigue jugando.`}</p></div></div>
    <span class="g-barra" style="height:14px"><i style="width:${n / t * 100}%"></i></span>
    ${Object.entries(ALBUM).map(([cat, g]) => `<section class="g-panel"><h2>${ALBUM_NOMBRE[cat]} · ${tienesDe(a, cat)}/${Object.keys(g).length}</h2>
        <ul class="g-album">${Object.entries(g).map(([k, o]) => a[cat][k]
          ? `<li class="tiene">${mono(o)}<b>${esc(o.nombre)}</b></li>`
          : `<li class="falta" aria-label="Carta por descubrir">${mono({ ini: '?', c: '#ddd6ca', t: '#fff' })}<b>???</b></li>`).join('')}</ul></section>`).join('')}
    <h2 class="g-h2">Para completarlo</h2>
    <ul class="g-tests">${Object.keys(TESTS).map(tarjetaTest).join('')}</ul>`;
  $('#album [data-lamp]').replaceWith(lampara());
  mostrar('album');
}

/* ══════════ COMPARTIR, RETAR Y LA TARJETA ══════════ */
const base = () => location.origin + location.pathname;
function textoCompartir(r) {
  const T = TESTS[r.id];
  if (T.tipo === 'quiz') return `${T.titulo}: hice ${r.puntos} puntos y acerté ${r.aciertos} de ${r.total}. Soy «${rango(r)[1]}». ¿Me ganas?`;
  const g = ranking(r)[0];
  return `${T.titulo}: ${T.cosa ? 'soy' : 'me parezco a'} ${g.o.nombre} (${g.pct} %). ¿Y tú?`;
}
async function comparte(datos, archivo) {
  if (navigator.share) {
    try {
      if (archivo && navigator.canShare?.({ files: [archivo] })) datos.files = [archivo];
      await navigator.share(datos);
      return;
    } catch (e) { if (e.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(`${datos.text} ${datos.url}`); window.malDS?.aviso('Enlace copiado', 'ok'); }
  catch { window.malDS?.aviso('No se pudo copiar el enlace', 'error'); }
}
async function compartir() {
  const r = $('#resultado')._r;
  const archivo = await tarjetaArchivo(r).catch(() => null);
  comparte({ title: 'El Lamparómetro · EL MERCIO.', text: textoCompartir(r), url: base() + '#r=' + cod(r) }, archivo);
}
function retar() {
  const r = $('#resultado')._r, T = TESTS[r.id];
  if (T.tipo === 'quiz') return comparte({ title: 'Te reto · El Lamparómetro', url: base() + '#reto=' + cod(r),
    text: `Hice ${r.puntos} puntos en «${T.titulo}». A ver si distingues la realidad de EL MERCIO mejor que yo:` });
  const g = ranking(r)[0].o;
  comparte({ title: 'Te reto · El Lamparómetro', url: base() + '#reto=' + cod(r),
    text: `En «${T.titulo}» ${T.cosa ? 'soy' : 'me salió'} ${g.nombre}. A ver qué tan compatibles somos:` });
}

function lineas(ctx, txt, ancho) {
  const out = []; let l = '';
  for (const w of txt.split(' ')) {
    const p = l ? l + ' ' + w : w;
    if (ctx.measureText(p).width > ancho && l) { out.push(l); l = w; } else l = p;
  }
  if (l) out.push(l);
  return out;
}
function caja(x, X, Y, W, H, R) {
  x.beginPath();
  if (x.roundRect) x.roundRect(X, Y, W, H, R); else x.rect(X, Y, W, H);
}
async function tarjeta(r) {
  const T = TESTS[r.id];
  const quiz = T.tipo === 'quiz';
  const rk = quiz ? [{ pct: r.aciertos * 10 }] : ranking(r);
  const g = quiz ? { nombre: rango(r)[1], frase: rango(r)[2], apodo: `${r.puntos} puntos · ${r.aciertos}/${r.total}`, ini: `${r.aciertos}/${r.total}`, c: '#c53b2b', t: '#fff' } : rk[0].o;
  const W = 1080, H = 1350, M = 80;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  try { await document.fonts.load('900 40px Montserrat'); await document.fonts.load('italic 400 40px "PT Serif"'); } catch {}
  const serif = '"PT Serif", Georgia, serif', sans = 'Montserrat, "Helvetica Neue", Arial, sans-serif';
  // fondo del color del test, con puntitos de imprenta
  x.fillStyle = T.color; x.fillRect(0, 0, W, H);
  x.fillStyle = T.tinta === '#fff' ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.08)';
  for (let i = 14; i < W; i += 28) for (let j = 14; j < H; j += 28) { x.beginPath(); x.arc(i, j, 2.2, 0, 7); x.fill(); }
  // cabecera
  x.fillStyle = T.tinta; x.font = `900 46px ${sans}`; x.textAlign = 'left';
  x.fillText('EL MERCIO.', M, 120);
  x.font = `800 26px ${sans}`; x.textAlign = 'right';
  x.fillText('EL LAMPARÓMETRO', W - M, 116);
  // la carta: primero se mide el contenido, después se dibuja centrada
  const R = 120, mx = W / 2, ancho = W - 2 * M;
  x.font = `900 84px ${sans}`;
  const nom = lineas(x, g.nombre, ancho - 80);
  x.font = `italic 400 44px ${serif}`;
  const fra = lineas(x, `«${g.frase}»`, ancho - 120).slice(0, 4);
  const alto = 40 + 2 * R + 70 + 90 + nom.length * 92 + 90 + fra.length * 58 + 30;
  const cy = Math.max(190, (190 + (H - 190)) / 2 - alto / 2 - 40);
  x.fillStyle = 'rgba(0,0,0,.18)'; caja(x, M, cy + 14, ancho, alto, 48); x.fill();
  x.fillStyle = '#fff'; caja(x, M, cy, ancho, alto, 48); x.fill();
  const my = cy + 40 + R;
  x.fillStyle = g.c; x.beginPath(); x.arc(mx, my, R, 0, 7); x.fill();
  x.fillStyle = g.t; x.font = `900 ${g.ini.length > 2 ? 70 : 88}px ${sans}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(g.ini, mx, my + 4); x.textBaseline = 'alphabetic';
  x.fillStyle = '#7a7a7a'; x.font = `800 30px ${sans}`;
  x.fillText(quiz ? 'SOY' : T.cosa ? 'SOY' : 'ME PAREZCO A', mx, my + R + 70);
  x.fillStyle = '#141414'; x.font = `900 84px ${sans}`;
  let y = my + R + 160;
  for (const l of nom) { x.fillText(l, mx, y); y += 92; }
  // chip con el apodo
  x.font = `800 30px ${sans}`;
  const chip = quiz ? g.apodo : `${g.apodo} · ${rk[0].pct} %`;
  const cw = Math.min(ancho - 80, x.measureText(chip).width + 56);
  x.fillStyle = '#f1ede5'; caja(x, mx - cw / 2, y - 26, cw, 58, 29); x.fill();
  x.fillStyle = '#141414'; x.fillText(chip, mx, y + 14, cw - 40);
  y += 110;
  x.font = `italic 400 44px ${serif}`;
  for (const l of fra) { x.fillText(l, mx, y); y += 58; }
  // pie
  x.fillStyle = T.tinta; x.font = `900 40px ${sans}`;
  x.fillText(T.pie, W / 2, H - 120);
  x.globalAlpha = .8; x.font = `700 26px ${sans}`;
  x.fillText(`${(location.host + location.pathname).replace(/\/(index\.html)?$/, '')} · sátira de EL MERCIO.`, W / 2, H - 70);
  x.globalAlpha = 1;
  return cv;
}
async function tarjetaArchivo(r) {
  const cv = await tarjeta(r);
  const b = await new Promise((ok) => cv.toBlob(ok, 'image/png'));
  return b ? new File([b], `lamparometro-${r.id}.png`, { type: 'image/png' }) : null;
}
async function descargar() {
  const f = await tarjetaArchivo($('#resultado')._r);
  if (!f) return window.malDS?.aviso('No se pudo dibujar la tarjeta', 'error');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(f); a.download = f.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/* ══════════ EL RETO ══════════ */
function pantallaReto(vs) {
  const T = TESTS[vs.id];
  const quiz = T.tipo === 'quiz';
  const g = quiz ? { nombre: `${vs.puntos} puntos`, frase: `Acertó ${vs.aciertos} de ${vs.total}. ¿Le ganas?`, ini: `${vs.aciertos}/${vs.total}`, c: '#c53b2b', t: '#fff' } : ranking(vs)[0].o;
  colorTest(vs.id);
  const el = $('#resultado');
  el.classList.remove('suspenso', 'contando');
  el.classList.add('revelado');
  el.innerHTML = `
    <div class="g-res-hero">
      <p class="g-hero__k">Te retaron · ${esc(T.titulo)}</p>
      <p class="g-anuncio">${quiz ? 'Tu pana hizo…' : `Tu pana ${T.cosa ? 'es' : 'se parece a'}…`}</p>
    </div>
    <div class="g-despues">
      <article class="g-coleccionable">
        ${mono(g, 'g-mono--xl')}
        <h1 id="r-t">${esc(g.nombre)}</h1>
        <p class="g-frase">«${esc(g.frase)}»</p>
        <p class="g-desc" style="text-align:center">${quiz ? 'Juega y supéralo.' : '¿Y tú? Juega y mira qué tan compatibles son.'}</p>
      </article>
      <div class="g-acciones"><button class="g-btn g-btn--test" type="button" data-reto>Aceptar el reto
        <svg class="icono" aria-hidden="true"><use href="#i-play"/></svg></button></div>
    </div>`;
  el._vs = vs;
  mostrar('resultado');
}

/* ══════════ ARRANQUE ══════════ */
function tarjetaTest(id) {
  const T = TESTS[id];
  const a = album(), tiene = T.album ? tienesDe(a, T.album) : 0;
  const rec = T.tipo === 'quiz' ? record() : 0;
  return `<li><button class="g-test" type="button" data-empezar="${id}" style="--c:${T.color};--t:${T.tinta}">
    <span class="g-test__ico" aria-hidden="true"><svg class="icono icono--l"><use href="#i-${T.icono}"/></svg></span>
    ${tiene ? `<span class="g-test__ok">${tiene}/${Object.keys(ALBUM[T.album]).length}</span>` : rec ? `<span class="g-test__ok">Récord ${rec}</span>` : T.nuevo ? '<span class="g-test__ok g-test__ok--nuevo">Nuevo</span>' : ''}
    <span class="g-test__t">${esc(T.titulo)}</span>
    <span class="g-test__m">${esc(T.meta)}</span></button></li>`;
}
function pintaPortada() { $('#tests').innerHTML = Object.keys(TESTS).map(tarjetaTest).join(''); pintaAlbum(); }
pintaPortada();

/* Lamparita, en la portada, dice cosas si la tocas */
const DICHOS = ['¡Ay! Cuidado con el foco.', 'Soy la lámpara oficial de la redacción.', 'Prendo más que un candidato en campaña.',
  'Juega, que no muerdo.', 'Me tienen colgada desde 1998.', 'Ilumino, pero no opino. Bueno, un poquito.', 'Tócame otra vez y te cobro.'];
$('#portada .g-lamp').addEventListener('click', (e) => {
  reacciona(e.currentTarget);
  const g = $('#globo');
  g.textContent = azar(DICHOS);
  anima(g, 've');
  clearTimeout(g._t); g._t = setTimeout(() => g.classList.remove('ve'), 2600);
});

document.addEventListener('click', (e) => {
  const pj = e.target.closest('.g-plano .pj');
  if (pj) return quien(pj);
  const b = e.target.closest('[data-empezar],[data-ir],[data-accion],[data-reto],.g-op,#q-saltar,#q-salir,#hoja-seguir,#asi-seguir');
  if (!b) return;
  if (b.dataset.empezar) { e.preventDefault(); empezar(b.dataset.empezar); }
  else if (b.dataset.ir === 'album') { e.preventDefault(); history.replaceState(null, '', location.pathname); pantallaAlbum(); }
  else if (b.dataset.ir) { e.preventDefault(); portada(); }
  else if (b.hasAttribute('data-reto')) { const vs = $('#resultado')._vs; empezar(vs.id, vs); }
  else if (b.dataset.accion === 'compartir') compartir();
  else if (b.dataset.accion === 'reto') retar();
  else if (b.dataset.accion === 'tarjeta') descargar();
  else if (b.id === 'q-saltar') elegir(-1);
  else if (b.id === 'q-salir') salir();
  else if (b.id === 'hoja-seguir') avanzar();
  else if (b.id === 'asi-seguir') sigueAsi();
  else if (b.classList.contains('g-op')) (st && TESTS[st.id].tipo === 'quiz' ? responderQuiz : elegir)(+b.dataset.k);
});

/* teclado: 1–4 eligen, 0 o S saltan, Enter sigue, Escape sale */
document.addEventListener('keydown', (e) => {
  const pj = e.target.closest?.('.g-plano .pj');
  if (pj && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); return quien(pj); }
  if ($('#test').hidden || $('#salir').open || e.target.matches?.('select, #f-ok')) return;
  if (e.key === 'Escape') { e.preventDefault(); return salir(); }
  if (st?.asi && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); return sigueAsi(); }
  if (st?.decidido && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); return avanzar(); }
  if (!st || st.decidido) return;
  if (TESTS[st.id].tipo === 'quiz') {
    if (e.key === '1' || e.key === 'ArrowLeft') { e.preventDefault(); responderQuiz(0); }
    else if (e.key === '2' || e.key === 'ArrowRight') { e.preventDefault(); responderQuiz(1); }
    return;
  }
  const n = +e.key;
  if (n >= 1 && n <= 4 && $(`#q-cuerpo [data-k="${n - 1}"]`)) { e.preventDefault(); elegir(n - 1); }
  else if ((e.key === '0' || e.key.toLowerCase() === 's') && $('#q-saltar') && !$('#q-saltar').hidden) { e.preventDefault(); elegir(-1); }
});

function quien(g) {
  for (const o of document.querySelectorAll('.g-plano .pj.activo')) o.classList.remove('activo');
  g.classList.add('activo');
  $('#plano-quien').textContent = g.dataset.n;
}

function enrutar() {
  const h = location.hash.slice(1);
  const datos = Object.fromEntries(h.split('&').map((p) => { const i = p.indexOf('='); return i < 0 ? [p, ''] : [p.slice(0, i), p.slice(i + 1)]; }));
  if (datos.reto !== undefined) {
    const vs = leer(datos.reto);
    if (vs) { st = null; return pantallaReto(vs); }
    return portada();
  }
  if (datos.r === undefined) { if (!st && $('#resultado').hidden && $('#album').hidden) portada(); return; }
  const r = leer(datos.r);
  if (!r) return portada();
  const vs = datos.vs ? leer(datos.vs) : null;
  const propio = !!st?.terminado;
  resultado(r, !propio, vs && vs.id === r.id ? vs : null);
  st = null;
}
window.addEventListener('hashchange', enrutar);
enrutar();
})();
