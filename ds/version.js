/* mal-ds · comprobador de versión
   https://una.red/ds/version.js

   Opcional, para las copias del sistema que viven fuera de este paquete.
   Se incluye así:

       <script src="https://una.red/ds/version.js" data-mal-ds="1.0.0" defer></script>

   y si el central va por delante lo dice en la consola. No pinta nada en la
   página, no manda datos a ningún sitio y falla en silencio si no hay red.

   También deja `window.malDS` para consultarlo a mano:
       malDS.version   la versión declarada aquí
       malDS.central   la del servidor, cuando llega
       malDS.alDia     true | false | null (todavía sin respuesta)
*/
(() => {
  'use strict';
  const guion = document.currentScript;
  const mia = (guion && guion.dataset.malDs) || null;
  const base = (guion && guion.src ? guion.src.replace(/version\.js.*$/, '') : 'https://una.red/ds/');

  const estado = { version: mia, central: null, alDia: null, url: base };
  window.malDS = estado;

  const comparar = (a, b) => {
    const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) < (pb[i] || 0) ? -1 : 1;
    }
    return 0;
  };

  fetch(base + 'version.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((d) => {
      estado.central = d.version;
      if (!mia) {
        console.info(`%c mal-ds %c copia sin versión declarada · el central va por v${d.version}`,
          'background:#D6382B;color:#fff;border-radius:3px', '');
        return;
      }
      estado.alDia = comparar(mia, d.version) >= 0;
      if (estado.alDia) {
        console.info(`%c mal-ds %c v${mia} · al día`,
          'background:#1F7A3D;color:#fff;border-radius:3px', '');
      } else {
        console.warn(`%c mal-ds %c esta copia es v${mia} y el central va por v${d.version} (${d.fecha}).\n`
          + `Actualiza desde ${base} o enlaza el CSS central para no volver a quedarte atrás.`,
          'background:#D6382B;color:#fff;border-radius:3px', '');
      }
    })
    .catch(() => { /* sin red o sin permiso: no es asunto de esta página */ });
})();
