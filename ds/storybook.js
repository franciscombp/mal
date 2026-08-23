/* MAL · storybook — lo mínimo: copiar código, cambiar el tema y
   marcar en qué sección estás. Sin dependencias.
   Todo lo demás de estas páginas funciona sin JavaScript. */
(() => {
  'use strict';

  /* ─── copiar el fragmento ─────────────────────────────────── */
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('.btn-copy');
    if (!b) return;
    const pre = b.parentElement.querySelector('pre');
    const txt = b.dataset.copy || (pre ? pre.textContent : '');
    const listo = () => {
      const antes = b.dataset.antes || b.textContent;
      b.dataset.antes = antes;
      b.textContent = 'Copiado';
      b.classList.add('copied');
      setTimeout(() => { b.textContent = antes; b.classList.remove('copied'); }, 1600);
    };
    /* respaldo para cuando el portapapeles moderno no está disponible:
       sin gesto de usuario, en un iframe sin permiso o fuera de https. */
    const aLaAntigua = () => {
      const ta = document.createElement('textarea');
      ta.value = txt;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
      if (ok) listo(); else b.textContent = 'Selecciona y copia';
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(txt).then(listo).catch(aLaAntigua);
    } else {
      aLaAntigua();
    }
  });

  /* ─── tema: sistema → claro → oscuro ──────────────────────── */
  const btnTema = document.getElementById('sb-tema');
  const ETIQ = {
    sistema: '<svg class="icono icono--s" aria-hidden="true"><use href="#i-monitor"/></svg> Sistema',
    claro: '<svg class="icono icono--s" aria-hidden="true"><use href="#i-sol"/></svg> Claro',
    oscuro: '<svg class="icono icono--s" aria-hidden="true"><use href="#i-luna"/></svg> Oscuro' };
  const aplicar = (t) => {
    if (t === 'sistema') document.documentElement.removeAttribute('data-tema');
    else document.documentElement.setAttribute('data-tema', t);
    if (btnTema) btnTema.innerHTML = ETIQ[t];
    try { localStorage.setItem('sb-tema', t); } catch (e) { /* modo privado */ }
  };
  let tema = 'sistema';
  try { tema = localStorage.getItem('sb-tema') || 'sistema'; } catch (e) { /* nada */ }
  aplicar(tema);
  if (btnTema) {
    btnTema.addEventListener('click', () => {
      const orden = ['sistema', 'claro', 'oscuro'];
      tema = orden[(orden.indexOf(tema) + 1) % orden.length];
      aplicar(tema);
    });
    const qt = new URLSearchParams(location.search).get('tema');
    if (qt) aplicar(qt);
  }

  /* ─── selector de marca ───────────────────────────────────
     Los cuatro temas son el MISMO sistema: lo único que cambia es la
     capa de referencia. Esto lo enseña en vivo sobre esta página. */
  const selMarca = document.getElementById('sb-marca');
  if (selMarca) {
    const guardada = (() => { try { return localStorage.getItem('sb-marca'); } catch (e) { return null; } })();
    const poner = (m) => {
      if (m && m !== 'mal') document.documentElement.setAttribute('data-marca', m);
      else document.documentElement.removeAttribute('data-marca');
      selMarca.value = m || 'mal';
      try { localStorage.setItem('sb-marca', m || 'mal'); } catch (e) { /* modo privado */ }
    };
    const q = new URLSearchParams(location.search);   /* ?marca=mercio enlaza un tema concreto */
    /* ?solo=botones,formularios deja a la vista solo esas secciones (capturas, revisiones) */
    const solo = (q.get('solo') || '').split(',').filter(Boolean);
    if (solo.length) document.querySelectorAll('section[id]').forEach((s) => { s.hidden = !solo.includes(s.id); });
    poner(q.get('marca') || guardada || selMarca.dataset.propia || 'mal');
    selMarca.addEventListener('change', () => poner(selMarca.value));
  }

  /* ─── marcar la sección visible en la barra lateral ───────── */
  const enlaces = [...document.querySelectorAll('.sb-nav-link[href^="#"]')];
  const secciones = enlaces
    .map((a) => document.getElementById(a.getAttribute('href').slice(1)))
    .filter(Boolean);
  if (secciones.length && 'IntersectionObserver' in window) {
    const obs = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        enlaces.forEach((a) => a.classList.toggle(
          'is-activo', a.getAttribute('href') === '#' + e.target.id));
      });
    }, { rootMargin: '-70px 0px -70% 0px', threshold: 0 });
    secciones.forEach((s) => obs.observe(s));
  }
})();
