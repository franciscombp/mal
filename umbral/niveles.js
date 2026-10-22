/* ══════════════════════════════════════════════════════════════
   UMBRAL · niveles
   Cada nivel es una lista de piezas en una rejilla (x, y, z) y unos
   grupos que se mueven. El motor decide qué está conectado mirando la
   pantalla: si dos caminos SE VEN unidos, están unidos.

   Piezas:
     cubo(x, y, z, {c, g, pisable, zb})   un bloque; se camina por arriba
     esc(x, y, z, dir, {...})             escalera que sube hacia `dir`
     techo(x, y, z, {alto})               pirámide decorativa
     cupula / globo (x, y, z)             cúpula o esfera decorativas
     figura(x, y, z)                      la Virgen del Panecillo (dibujada)
     caja(x0, y0, z0, x1, y1, z1, {...})  rellena un prisma de cubos
   Opciones: c = color de la paleta (p, s, g, o, b…), g = grupo,
   pisable: false para decoración, zb = sesgo de profundidad,
   franja: 'x' | 'y' pinta una línea sobre la losa (la línea equinoccial).

   Grupos:
     gira:     { eje: 'x'|'y'|'z', piv: [x,y,z], ang, min?, max?, manija: [x,y,z] }
     desliza:  { eje: 'x'|'y'|'z', t, min, max, manija: [x,y,z] (se mueve con él) }

   inicio / meta: el cubo [x, y, z] sobre el que se empieza / se termina.
   capitulo, relato (antes de jugar) y dato (al terminar) son texto.
   ══════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const cubo = (x, y, z, o = {}) => ({ t: 'cubo', x, y, z, ...o });
  const esc = (x, y, z, dir, o = {}) => ({ t: 'esc', x, y, z, dir, ...o });
  const techo = (x, y, z, o = {}) => ({ t: 'techo', x, y, z, pisable: false, ...o });
  const cupula = (x, y, z, o = {}) => ({ t: 'cupula', x, y, z, pisable: false, ...o });
  const globo = (x, y, z, o = {}) => ({ t: 'globo', x, y, z, pisable: false, ...o });
  const figura = (x, y, z, o = {}) => ({ t: 'figura', x, y, z, pisable: false, ...o });
  const muro = { c: 's', pisable: false };
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
      capitulo: 'El camino',
      nombre: 'Sendero',
      relato: 'Por el Qhapaq Ñan, el gran camino de los Andes, los chasquis corrían de posta en posta con mensajes anudados en un quipu. Este chasqui lleva uno que no puede perder. El camino no siempre es lo que parece.',
      dato: 'El Qhapaq Ñan unía cerca de 30.000 kilómetros de caminos entre lo que hoy son Colombia, Ecuador, Perú, Bolivia, Chile y Argentina. Es Patrimonio Mundial desde 2014.',
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
      capitulo: 'El camino',
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
      capitulo: 'El camino',
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
      capitulo: 'El camino',
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
      capitulo: 'El camino',
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
    /* ══ Capítulo Quito ══════════════════════════════════════ */

    /* VI · El atrio de San Francisco. Falta la piedra de la esquina:
       hay que moverla hasta que, mirada desde aquí, la complete. */
    {
      capitulo: 'Quito',
      nombre: 'Cantuña',
      relato: 'Quito, siglo XVI. A Cantuña le encargaron terminar el atrio de San Francisco y el tiempo no le alcanzaba. Hizo un trato con el diablo: el atrio, terminado antes del amanecer, a cambio de su alma. Cuando cantó el gallo, faltaba una piedra.',
      dato: 'La iglesia y el convento de San Francisco empezaron a levantarse en el siglo XVI, en el centro histórico de Quito, que la UNESCO declaró Patrimonio de la Humanidad en 1978. Dicen que Cantuña escondió la piedra a propósito: una obra incompleta no se cobra.',
      pista: 'Falta una piedra. Muévela hasta que el atrio se vea completo.',
      paleta: { noche: true, fondo: ['#27305a', '#f0b089'], p: '#e6dfd3', s: '#a59f96', b: '#f5f1e8', g: '#e2b04a', o: '#6b4430' },
      inicio: [3, 9, 0],
      meta: [4, 1, 2],
      piezas: [
        caja(0, 7, 0, 5, 9, 0),
        caja(0, 7, -1, 5, 9, -1, muro),
        caja(1, 6, 0, 3, 6, 0, muro),
        caja(1, 5, 0, 3, 5, 1, muro),
        esc(1, 6, 1, 'y-'), esc(2, 6, 1, 'y-'), esc(3, 6, 1, 'y-'),
        esc(1, 5, 2, 'y-'), esc(2, 5, 2, 'y-'), esc(3, 5, 2, 'y-'),
        caja(1, 4, 0, 3, 4, 1, muro),
        caja(1, 4, 2, 3, 4, 2),
        caja(4, 1, 0, 4, 3, 1, muro),
        caja(4, 1, 2, 4, 3, 2),
        caja(3, 0, 0, 5, 0, 2, { c: 'b', pisable: false }),
        caja(4, 0, 3, 4, 0, 4, { c: 'o', pisable: false }),
        cubo(4, 0, 5, { c: 'b', pisable: false }),
        caja(3, 0, 3, 3, 0, 6, { c: 'b', pisable: false }),
        caja(5, 0, 3, 5, 0, 6, { c: 'b', pisable: false }),
        cupula(3, 0, 7, { c: 'b' }), cupula(5, 0, 7, { c: 'b' }),
        caja(5, 5, 2, 9, 5, 2, muro),
        caja(9, 5, 0, 9, 5, 1, muro),
        cubo(5, 5, 3, { c: 'g', g: 'piedra' }),
      ].flat(),
      grupos: {
        piedra: { tipo: 'desliza', eje: 'x', t: 3, min: 0, max: 4, manija: [5.5, 6.05, 3.5] },
      },
    },

    /* VII · El Panecillo gira. Se sube por un lado y se baja por otro,
       y para eso hay que dar la vuelta con el cerro. */
    {
      capitulo: 'Quito',
      nombre: 'Panecillo',
      relato: 'Antes de llamarse Panecillo, el cerro se llamaba Yavirac, y los cronistas cuentan que en su cima había un templo al sol. Hoy lo corona una Virgen con alas que mira la ciudad. El chasqui tiene que cruzar al otro lado, y el único camino pasa por arriba.',
      dato: 'La Virgen del Panecillo está hecha de miles de piezas de aluminio y copia, en grande, la Virgen de Quito que talló Bernardo de Legarda en el siglo XVIII. Al cerro lo llamaron Panecillo por su forma de pan.',
      pista: 'Gira el cerro desde la corona. A veces hay que dar la vuelta con él.',
      paleta: { fondo: ['#cfe6f5', '#f6e2c0'], p: '#f2ebdf', s: '#8daf6b', g: '#e9dcc4', o: '#c4553b', b: '#f8f5ef' },
      inicio: [6, 12, 0],
      meta: [-1, 6, 1],
      piezas: [
        caja(6, 9, 0, 6, 12, 0),
        caja(6, 9, -1, 6, 12, -1, muro),
        caja(8, 10, 0, 8, 10, 1, { c: 'b', pisable: false }), techo(8, 10, 2, { c: 'o', alto: 0.6 }),
        cubo(8, 12, 0, { c: 'b', pisable: false }), techo(8, 12, 1, { c: 'o', alto: 0.6 }),
        caja(4, 11, 0, 4, 11, 1, { c: 'b', pisable: false }), techo(4, 11, 2, { c: 'o', alto: 0.6 }),
        caja(1, 6, 0, 3, 6, 0),
        cubo(0, 6, 0, muro),
        esc(0, 6, 1, 'x-'),
        caja(-1, 6, 0, -1, 6, 1),
        caja(-1, 6, -1, 3, 6, -1, muro),
        caja(4, 4, 0, 8, 8, 0, { c: 's', g: 'cerro', pisable: false }),
        caja(5, 5, 1, 7, 7, 1, { g: 'cerro' }),
        cubo(6, 6, 2, { c: 's', g: 'cerro', pisable: false }),
        figura(6, 6, 3, { g: 'cerro' }),
        esc(6, 8, 1, 'y-', { g: 'cerro' }),
        esc(6, 4, 1, 'y+', { g: 'cerro' }),
        cubo(4, 6, 1, { g: 'cerro', pisable: false }),
        cubo(8, 6, 1, { g: 'cerro', pisable: false }),
      ].flat(),
      grupos: {
        cerro: { tipo: 'gira', eje: 'z', piv: [6.5, 6.5, 0], ang: 270, manija: [6.5, 6.5, 6.6], radio: 0.75 },
      },
    },

    /* VIII · La Mitad del Mundo. El gnomon se acuesta al sur, al norte,
       o se queda de pie, como la sombra del mediodía en el ecuador. */
    {
      capitulo: 'Quito',
      nombre: 'Mitad del Mundo',
      relato: 'Sobre la línea equinoccial, la sombra del mediodía cae unos meses al norte y otros al sur. Dos veces al año, en los equinoccios, el sol pasa justo arriba y la sombra casi desaparece. Los antiguos quiteños la medían con un palo clavado en la tierra.',
      dato: 'El monumento de la Mitad del Mundo está en San Antonio de Pichincha, al norte de Quito. La línea que hoy marca el GPS pasa a unos 240 metros de él. Mucho antes, en cerros como Catequilla, ya se observaba el sol sobre el ecuador.',
      pista: 'El gnomon se acuesta al sur o al norte, o se queda de pie.',
      paleta: { fondo: ['#fff3cf', '#f0b25c'], p: '#f1e8d6', s: '#cdb894', g: '#d9893c', o: '#b5442e', b: '#ece5d6', linea: '#e0a21a' },
      inicio: [3, 9, 0],
      meta: [2, -2, 1],
      piezas: [
        caja(2, 7, 0, 4, 9, 0),
        caja(2, 7, -1, 4, 9, -1, muro),
        caja(-1, 4, 0, 2, 4, 0, { franja: 'x' }),
        caja(4, 4, 0, 6, 4, 0, { franja: 'x' }),
        cubo(-1, 3, 0),
        cubo(0, 3, 0, muro),
        esc(0, 3, 1, 'x+'),
        cubo(1, 3, 0, muro),
        cubo(1, 3, 1),
        caja(-1, 3, -1, 6, 4, -1, muro),
        caja(2, -2, 0, 2, 2, 0, muro),
        caja(2, -2, 1, 2, 2, 1),
        caja(2, -3, 0, 2, -3, 4, { c: 'b', pisable: false }),
        globo(2, -3, 5, { c: 'o' }),
        cubo(3, 4, 0, { c: 'g', g: 'gnomon' }),
        cubo(3, 4, 1, { c: 'g', g: 'gnomon' }),
        cubo(3, 4, 2, { c: 'g', g: 'gnomon' }),
      ].flat(),
      grupos: {
        gnomon: { tipo: 'gira', eje: 'x', piv: [3.5, 4.5, 0.5], ang: 0, min: -90, max: 90, manija: [7.3, 4.5, 0.5], radio: 0.6 },
      },
    },
  ];

  window.UMBRAL_NIVELES = niveles;
})();
