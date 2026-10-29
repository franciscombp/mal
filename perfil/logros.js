/* Los logros de todos los juegos, en un solo catálogo.
   El id no se cambia nunca: es el mismo que se registra en Steam, en Game
   Center y en Google Play. Game Center admite hasta 100 logros y 1000
   puntos por juego, así que los puntos se reparten con cuidado.
   «premio» son las guaguas que da al desbloquearse. «secreto» lo esconde
   hasta que sale. */
export const LOGROS = [
  // ─── el boliche ───
  { id: 'boliche-primera', juego: 'boliche', nombre: 'Va a jugar', desc: 'Juega tu primera ronda en el boliche.', puntos: 10, premio: 5 },
  { id: 'boliche-griton', juego: 'boliche', nombre: 'Gritón', desc: 'Llega al combo ×4 en la gritadera.', puntos: 10, premio: 3 },
  { id: 'boliche-lo-dije', juego: 'boliche', nombre: 'Lo dije', desc: 'Convence a la banca de ir por lo tuyo y gana.', puntos: 10, premio: 3 },
  { id: 'boliche-pares-limpio', juego: 'boliche', nombre: 'Pares limpio', desc: 'Que queden cuatro y cuatro.', puntos: 15, premio: 5 },
  { id: 'boliche-buen-ojo', juego: 'boliche', nombre: 'Buen ojo', desc: 'Pasa una ronda que la banca termina barriendo.', puntos: 10, premio: 3 },
  { id: 'boliche-con-todo', juego: 'boliche', nombre: 'Con todo', desc: 'Ve con todo y gana.', puntos: 20, premio: 8 },
  { id: 'boliche-todas-a-un-lado', juego: 'boliche', nombre: 'Todas a un lado', desc: 'Que caigan las ocho en el mismo hueco.', puntos: 25, premio: 10, secreto: true },
  { id: 'boliche-quebraste', juego: 'boliche', nombre: 'Quebraste la banca', desc: 'Deja a Don Segundo sin un centavo.', puntos: 40, premio: 20 },
  { id: 'boliche-banca-de-una-noche', juego: 'boliche', nombre: 'Banca de una noche', desc: 'Aguanta diez rondas siendo la banca.', puntos: 30, premio: 15 },

  // ─── los coches de madera ───
  { id: 'coches-primera', juego: 'coches', nombre: 'A rodar', desc: 'Termina tu primera carrera.', puntos: 10, premio: 5 },
  { id: 'coches-podio', juego: 'coches', nombre: 'Al podio', desc: 'Gana tu primera medalla.', puntos: 10, premio: 5 },
  { id: 'coches-oro', juego: 'coches', nombre: 'Primeros en bajar', desc: 'Llega primero en una carrera.', puntos: 20, premio: 10 },
  { id: 'coches-fantasma', juego: 'coches', nombre: 'Le ganaste al fantasma', desc: 'Mejora un récord que ya tenías.', puntos: 15, premio: 5 },
  { id: 'coches-copa-fiestas', juego: 'coches', nombre: 'Campeones de las Fiestas', desc: 'Gana la Copa de las Fiestas.', puntos: 40, premio: 25 },
  { id: 'coches-copa-noche', juego: 'coches', nombre: 'Campeones de la Noche', desc: 'Gana la Copa de la Noche.', puntos: 50, premio: 30, secreto: true },
  { id: 'coches-album', juego: 'coches', nombre: 'Álbum lleno', desc: 'Junta todas las estampitas.', puntos: 50, premio: 30 },
];

export const JUEGOS = {
  boliche: { nombre: 'El boliche', url: 'apps/boliche/juego/' },
  coches: { nombre: 'Coches de madera', url: 'coches/' },
};

/* Lo que se gana con la moneda común, las guaguas, jugando. El boliche
   tiene tope diario: apostar no es la forma rápida de progresar. */
export const TOPE_DIARIO = { boliche: 20 };
