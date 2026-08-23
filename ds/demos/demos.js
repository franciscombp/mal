/* El selector de tema de las demos.

   Los cuatro temas son el MISMO sistema: lo único que cambia es la capa
   de referencia. Esto lo demuestra en vivo — cambia `data-marca` sobre
   una página que no se toca, y se ve que el marcado aguanta los cuatro.

   Claro/oscuro se recuerda entre demos porque es una preferencia de
   quien mira; la marca NO, porque cada demo abre con la suya. */
(() => {
  'use strict';
  const raiz = document.documentElement;
  const propia = raiz.dataset.marca || 'mal';

  /* ─── marca ───────────────────────────────────────────────── */
  const sel = document.getElementById('demo-marca');
  const ponMarca = (m) => {
    /* el tema de la marca vive en `:root, :root[data-marca]`, así que
       dejar data-marca="mal" es correcto y no hace falta quitarlo */
    raiz.setAttribute('data-marca', m);
    if (sel) sel.value = m;
  };
  if (sel) {
    sel.addEventListener('change', () => ponMarca(sel.value));
    const q = new URLSearchParams(location.search).get('marca');
    ponMarca(q || propia);
  }

  /* ─── claro / oscuro ──────────────────────────────────────── */
  const btn = document.getElementById('demo-tema');
  const ETIQ = {
    sistema: ['i-monitor', 'Sistema'],
    claro: ['i-sol', 'Claro'],
    oscuro: ['i-luna', 'Oscuro'],
  };
  const orden = ['sistema', 'claro', 'oscuro'];
  let tema = 'sistema';
  const ponTema = (t) => {
    tema = t;
    if (t === 'sistema') raiz.removeAttribute('data-tema');
    else raiz.setAttribute('data-tema', t);
    if (btn) {
      const [ico, txt] = ETIQ[t];
      btn.innerHTML = '<svg class="icono icono--s" aria-hidden="true"><use href="#'
        + ico + '"/></svg> ' + txt;
    }
    try { localStorage.setItem('demo-tema', t); } catch (err) { /* modo privado */ }
  };
  try { tema = localStorage.getItem('demo-tema') || 'sistema'; } catch (err) { /* nada */ }
  ponTema(new URLSearchParams(location.search).get('tema') || tema);
  if (btn) btn.addEventListener('click', () => ponTema(orden[(orden.indexOf(tema) + 1) % orden.length]));
})();
