#!/usr/bin/env node
/* mal-ds · genera el storybook desde componentes.json
 *
 * `componentes.json` es la fuente de verdad: de ahí salen la barra lateral y
 * las 30 secciones de `mal/index.html`. El HTML de cada componente se escribe
 * UNA vez y se usa dos: crudo para la muestra viva y escapado para el bloque
 * de código. Así lo que se copia es exactamente lo que se ve.
 *
 *   node herramientas/genera.mjs             escribe mal/index.html
 *   node herramientas/genera.mjs --verifica  falla si el fichero no está al día
 *
 * Sin dependencias: solo Node. No corre al servir, solo al editar el catálogo.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const leer = (r) => readFileSync(join(raiz, r), 'utf8');

const esc = (s) => s
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');

/* ─── la barra lateral: un grupo por familia, en el orden del catálogo ─── */
function nav(secciones) {
  const grupos = [];
  for (const s of secciones) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.nombre === s.grupo) ultimo.secs.push(s);
    else grupos.push({ nombre: s.grupo, secs: [s] });
  }
  const html = grupos.map((g) =>
    `<div class="sb-nav-group"><div class="sb-nav-title">${g.nombre}</div>` +
    g.secs.map((s) => `<a class="sb-nav-link" href="#${s.id}">${s.titulo}</a>`).join('') +
    '</div>').join('');
  return '<aside class="sb-sidebar">\n' +
    '  <div class="sb-sidebar-header"><b>MAL</b> <span>UI Kit</span></div>\n' +
    `  ${html}\n</aside>`;
}

/* ─── una caja: etiqueta, título, descripción, muestra y código ───────── */
function caja(c) {
  /* `demo` solo existe cuando el escaparate es a propósito otro ejemplo —el
     muestrario de los 81 iconos, la tabla de los cuatro temas—. Si no está,
     la muestra viva ES el html canónico, y no pueden desviarse. */
  let vivo = c.demo ?? c.html;
  if (c.lienzo) vivo = `<div class="${c.lienzo}">${vivo}</div>`;
  const codigo = c.codigo === false ? '' :
    '<div class="sb-code"><button class="btn-copy" type="button">Copiar</button>' +
    `<pre>${esc(c.codigo ?? c.html)}</pre></div>`;
  return '<div class="sb-box">' +
    `<span class="sb-label">${c.etiqueta}</span>` +
    /* `nombre` siempre existe (es el contrato de componentes.json); cuando
       repite la etiqueta no aporta nada y la caja va sin título. */
    (c.nombre && c.nombre !== c.etiqueta ? `<h3 class="sb-box__t">${c.nombre}</h3>` : '') +
    (c.desc ? `<p class="sb-box__d">${c.desc}</p>` : '') +
    vivo + codigo + (c.nota ?? '') + '</div>';
}

/* ─── una sección: el número sale del orden, no se escribe a mano ─────── */
function seccion(s, i, comps) {
  const mias = comps.filter((c) => c.seccion === s.id);
  if (!mias.length) throw new Error(`la sección "${s.id}" no tiene componentes`);
  /* Una sección alterna rejillas anchas y estrechas para colocar las demos
     grandes. `rejilla` en un componente abre una nueva; sin él, sigue en la
     que esté abierta. */
  let dentro = false;
  const cuerpo = mias.map((c, j) => {
    let abre = '';
    if (c.rejilla || j === 0) {
      if (dentro) abre += '</div>';
      abre += `<div class="${c.rejilla ?? 'sb-grid'}">`;
      dentro = true;
    }
    return abre + caja(c);
  }).join('') + (dentro ? '</div>' : '');
  return `<section class="sb-section" id="${s.id}">` +
    `<h2 class="sb-section-title"><span>${String(i + 1).padStart(2, '0')}</span> ${s.titulo}</h2>` +
    (s.intro ? `<p class="sb-section-intro">${s.intro}</p>` : '') +
    cuerpo + '</section>';
}

/* ─── comprobaciones que un catálogo suelto no puede darse ───────────── */
function revisa({ secciones, componentes }) {
  const fallos = [];
  const ids = new Set(secciones.map((s) => s.id));
  for (const c of componentes) {
    if (!ids.has(c.seccion)) fallos.push(`"${c.id}" apunta a la sección "${c.seccion}", que no existe`);
    if (!c.html) fallos.push(`"${c.id}" no tiene html`);
    if (!c.nombre) fallos.push(`"${c.id}" no tiene nombre`);
    if (!c.etiqueta) { fallos.push(`"${c.id}" no tiene etiqueta`); continue; }
    const esperado = c.etiqueta.startsWith('.') ? c.etiqueta.slice(1) : c.etiqueta;
    if (c.id !== esperado) fallos.push(`"${c.id}" no cuadra con su etiqueta "${c.etiqueta}"`);
    const suya = secciones.find((s) => s.id === c.seccion);
    if (suya && c.grupo !== suya.grupo) fallos.push(`"${c.id}" dice grupo "${c.grupo}" y su sección dice "${suya.grupo}"`);
  }
  const vistos = new Set();
  for (const c of componentes) {
    const k = `${c.seccion}/${c.id}`;
    if (vistos.has(k)) fallos.push(`"${k}" está dos veces`);
    vistos.add(k);
  }
  return fallos;
}

const datos = JSON.parse(leer('componentes.json'));
const fallos = revisa(datos);
if (fallos.length) {
  console.error('componentes.json no cuadra:');
  for (const f of fallos) console.error('  ·', f);
  process.exit(1);
}

const salida = leer('herramientas/plantilla.html')
  .replace('<!--{{NAV}}-->', () => nav(datos.secciones))
  .replace('<!--{{SECCIONES}}-->', () => datos.secciones.map((s, i) => seccion(s, i, datos.componentes)).join(''));

const destino = join(raiz, 'mal/index.html');
if (process.argv.includes('--verifica')) {
  if (readFileSync(destino, 'utf8') === salida) {
    console.log(`mal/index.html al día · ${datos.secciones.length} secciones · ${datos.componentes.length} componentes`);
  } else {
    console.error('mal/index.html NO está al día con componentes.json. Corre: npm run genera');
    process.exit(1);
  }
} else {
  writeFileSync(destino, salida);
  console.log(`mal/index.html · ${datos.secciones.length} secciones · ${datos.componentes.length} componentes · ${salida.length} bytes`);
}
