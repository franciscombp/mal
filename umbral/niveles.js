/* ══════════════════════════════════════════════════════════════
   UMBRAL · niveles
   Cada nivel es una lista de piezas en una rejilla (x, y, z) y unos
   grupos que se mueven. El motor decide qué está conectado mirando la
   pantalla: si dos caminos SE VEN unidos, están unidos.

   Piezas:
     cubo(x, y, z, {c, g, pisable, zb})   un bloque; se camina por arriba
     esc(x, y, z, dir, {...})             escalera que sube hacia `dir`
     techo(x, y, z, {...})                pirámide decorativa
     caja(x0, y0, z0, x1, y1, z1, {...})  rellena un prisma de cubos
   Opciones: c = color de la paleta (p, s, g, o), g = grupo,
   pisable: false para decoración, zb = sesgo de profundidad.

   Grupos:
     gira:     { eje: 'x'|'y'|'z', piv: [x,y,z], ang, min?, max?, manija: [x,y,z] }
     desliza:  { eje: 'x'|'y'|'z', t, min, max, manija: [x,y,z] (se mueve con él) }

   inicio / meta: el cubo [x, y, z] sobre el que se empieza / se termina.
   ══════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const cubo = (x, y, z, o = {}) => ({ t: 'cubo', x, y, z, ...o });
  const esc = (x, y, z, dir, o = {}) => ({ t: 'esc', x, y, z, dir, ...o });
  const techo = (x, y, z, o = {}) => ({ t: 'techo', x, y, z, pisable: false, ...o });
  function caja(x0, y0, z0, x1, y1, z1, o = {}) {
    const r = [];
    for (let z = z0; z <= z1; z++)
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) r.push(cubo(x, y, z, o));
    return r;
  }

  const niveles = [
    /* I · Un sendero que sube. Solo caminar. */
    {
      nombre: 'Sendero',
      pista: 'Toca el camino para caminar.',
      paleta: { fondo: ['#fbe3cf', '#f0a98f'], p: '#f6e7d6', s: '#e9b48f', g: '#d9734e', o: '#c95f45' },
      inicio: [4, 4, 0],
      meta: [0, 0, 2],
      piezas: [
        caja(4, 2, 0, 4, 4, 0),
        cubo(4, 4, -1, { c: 's' }), cubo(4, 4, -2, { c: 's' }),
        cubo(4, 1, 0),
        esc(4, 1, 1, 'y-'),
        caja(2, 0, 0, 4, 0, 1),
        caja(1, 0, 0, 1, 0, 1),
        esc(1, 0, 2, 'x-'),
        caja(0, 0, 0, 0, 0, 2),
        caja(0, 0, -2, 4, 0, -1, { c: 's', pisable: false }),
        caja(4, 1, -2, 4, 3, -1, { c: 's', pisable: false }),
        caja(6, -1, -3, 6, -1, 1, { c: 's', pisable: false }),
        techo(6, -1, 2, { c: 'o' }),
      ].flat(),
      grupos: {},
    },

    /* II · Un puente que gira. Hay que subirse para llevarlo. */
    {
      nombre: 'Puente',
      pista: 'Arrastra la rueda para girar el puente. Puedes ir encima.',
      paleta: { fondo: ['#d7efe9', '#7fb8b5'], p: '#eef5ec', s: '#a9cfc4', g: '#e0916b', o: '#c86d4c' },
      inicio: [0, 4, 0],
      meta: [4, -1, 1],
      piezas: [
        caja(0, 3, 0, 2, 5, 0),
        caja(0, 3, -1, 2, 5, -1, { c: 's', pisable: false }),
        caja(6, 3, 0, 8, 5, 0),
        caja(6, 3, -1, 8, 5, -1, { c: 's', pisable: false }),
        caja(6, 3, 1, 6, 3, 2, { c: 's', pisable: false }),
        techo(6, 3, 3, { c: 'o' }),
        caja(4, 1, 0, 4, 2, 0),
        cubo(4, 0, 0),
        esc(4, 0, 1, 'y-'),
        caja(4, -1, 0, 4, -1, 1),
        caja(3, -1, -1, 5, 2, -1, { c: 's', pisable: false }),
        caja(4, 4, -3, 4, 4, -1, { c: 's', pisable: false }),
        caja(3, 4, 0, 5, 4, 0, { c: 'g', g: 'puente' }),
      ].flat(),
      grupos: {
        puente: { tipo: 'gira', eje: 'z', piv: [4.5, 4.5, 0], ang: 0, manija: [4.5, 4.5, -1.5], radio: 1.1 },
      },
    },

    /* III · Lo que ves es lo que hay: el brazo de la torre, girado,
       toca el camino de abajo. */
    {
      nombre: 'Perspectiva',
      pista: 'Si dos caminos se ven unidos, están unidos.',
      paleta: { fondo: ['#ece3f6', '#a99bd6'], p: '#f5f0fa', s: '#cbbde6', g: '#efb98d', o: '#d9865f' },
      inicio: [0, 5, 0],
      meta: [7, 6, 4],
      piezas: [
        caja(0, 5, 0, 2, 5, 0),
        caja(0, 5, -2, 2, 5, -1, { c: 's', pisable: false }),
        caja(7, 6, -3, 7, 6, 3, { c: 's', pisable: false }),
        cubo(7, 6, 4, { c: 'g', g: 'brazo' }),
        caja(8, 6, 4, 10, 6, 4, { c: 'g', g: 'brazo' }),
        caja(0, 2, -1, 0, 2, 2, { c: 's', pisable: false }),
        techo(0, 2, 3, { c: 'o' }),
      ].flat(),
      grupos: {
        brazo: { tipo: 'gira', eje: 'z', piv: [7.5, 6.5, 4], ang: 0, manija: [7.5, 6.5, 1.5], radio: 1.0 },
      },
    },

    /* IV · Un riel: la plataforma se desliza hasta alinearse con el
       camino de abajo, y luego te lleva al otro lado. */
    {
      nombre: 'Riel',
      pista: 'Desliza el tirador. A veces hay que viajar encima.',
      paleta: { fondo: ['#fdf1d6', '#e6b980'], p: '#fbf4e6', s: '#e3c79a', g: '#6f9fb0', o: '#4f7f91' },
      inicio: [3, -3, 0],
      meta: [10, 3, 2],
      piezas: [
        caja(3, -3, 0, 3, 0, 0),
        caja(3, -3, -1, 3, 0, -1, { c: 's', pisable: false }),
        caja(4, 3, 1, 8, 3, 1, { c: 's', pisable: false }),
        caja(9, 2, 2, 10, 4, 2),
        caja(9, 2, 0, 10, 4, 1, { c: 's', pisable: false }),
        caja(11, 1, -1, 11, 1, 3, { c: 's', pisable: false }),
        techo(11, 1, 4, { c: 'o' }),
        cubo(4, 3, 2, { c: 'g', g: 'riel' }),
      ].flat(),
      grupos: {
        riel: { tipo: 'desliza', eje: 'x', t: 3, min: 0, max: 4, manija: [4.5, 4.05, 2.5] },
      },
    },

    /* V · El puente levadizo: bajado sirve para cruzar; subido es una
       columna, y desde arriba de la columna el camino sigue. */
    {
      nombre: 'Levadizo',
      pista: 'Un mismo puente puede servir dos veces.',
      paleta: { noche: true, fondo: ['#3b3561', '#e7957a'], p: '#f4e9e1', s: '#c7a3a8', g: '#f0b46a', o: '#d4744f' },
      inicio: [8, 1, 0],
      meta: [8, 3, 4],
      piezas: [
        caja(6, 0, 0, 8, 2, 0),
        caja(6, 0, -1, 8, 2, -1, { c: 's', pisable: false }),
        caja(0, 1, 0, 2, 1, 0),
        caja(0, -1, 0, 0, 0, 0),
        caja(0, -1, -1, 2, 1, -1, { c: 's', pisable: false }),
        caja(6, 3, 4, 8, 3, 4),
        caja(3, 1, 0, 5, 1, 0, { c: 'g', g: 'puente' }),
      ].flat(),
      grupos: {
        puente: { tipo: 'gira', eje: 'y', piv: [3.5, 1.5, 0.5], ang: -90, min: -90, max: 0, manija: [3.5, 2.2, 0.5], radio: 0.7 },
      },
    },
  ];

  window.UMBRAL_NIVELES = niveles;
})();
