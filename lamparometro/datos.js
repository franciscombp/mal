/* El Lamparómetro · la base de conocimiento.
   Aquí vive todo lo que se puede alimentar sin tocar el motor: el elenco, los
   productos, las provincias y las preguntas de cada test. El motor está en
   index.html y lee window.LAMP.

   Cómo pesa cada test:
   · plano   — cada afirmación mueve un eje (x, y o z) con su signo `s` y su
               peso `w`. El resultado es un punto en tres ejes y gana la lámpara
               más cercana.
   · puntos  — cada opción reparte puntos `p` entre varias lámparas. Gana la que
               más suma.
   · rasgos  — cada opción suma o resta en ocho rasgos `r`; el perfil se escala
               de 0 a 10 y se compara por dirección (coseno, centrado en la media)
               con el de cada provincia. Encima, la opción puede dar puntos de
               firma `b` a una provincia concreta: la respuesta que solo daría ella.

   Todo es sátira: las coordenadas, los signos y los rasgos son caricatura de
   la figura pública, no un análisis ni un dato. */
(() => {
'use strict';

/* ══════════ EL ELENCO ══════════
   x  ¿quién paga?      −10 «que pague el Estado»  ·  +10 «que cada quien se rebusque»
   y  ¿quién manda?     +10 «mando yo, sabatina»   ·  −10 «aquí nadie manda, es farra»
   z  ¿cuánta lámpara?  +10 «tarima y luces»       ·  −10 «perfil bajo, Excel»      */
const PJ = {
  correa: {
    nombre: 'Rafael Correa', ini: 'RC', c: '#2f7d32', t: '#fff', x: -7, y: 8, z: 7,
    apodo: 'Ascendente en sabatina',
    frase: 'Hasta la victoria siempre… y desde Bélgica, que allá también hay wifi.',
    desc: 'Tienes opinión sobre todo y la das los sábados de diez a dos, sin pausa para ir al baño. Quieres muchísimo al Estado, sobre todo cuando lo manejas tú. Si alguien te contradice, sacas una lámina con un gráfico.',
    rasgos: ['Tuiteas en mayúsculas desde otro huso horario.', 'Tu palabra favorita empieza con «prensa» y termina con «corrupta».', 'Cantas en la tarima aunque nadie te haya pasado el micrófono.']
  },
  bucaram: {
    nombre: 'Los Bucaram', ini: 'LB', c: '#e8790c', t: '#141414', x: -6, y: -7, z: 10,
    apodo: 'Un loco que ama',
    frase: '¡Que suene la banda, que el país se arregla bailando!',
    desc: 'Tu idea de gobernar es una tarima, un micrófono y un grupo de cumbia. Crees que todo problema se soluciona con una canción, y si no se soluciona, con otra. Tu familia no es una familia: es una franquicia con presencia en varias provincias y al menos un país vecino.',
    rasgos: ['Tienes la maleta hecha, por si acaso.', 'Tienes un primo en cada lista electoral.', 'Grabaste un disco y lo regalas en los cumpleaños.']
  },
  vera: {
    nombre: 'Carlos Vera', ini: 'CV', c: '#1f3b70', t: '#fff', x: 6, y: 6, z: 4,
    apodo: 'La repregunta',
    frase: '¿Me va a responder la pregunta, o le repito la pregunta?',
    desc: 'Entrevistas hasta al mesero y le exiges que justifique la sopa del día. Te indignas con método y con horario estelar. Crees en el orden, en el mercado y en que todo el país te debe una respuesta, de preferencia en vivo.',
    rasgos: ['Alzas una ceja y la reunión familiar se queda en silencio.', 'Tu «buenas noches» suena a amenaza editorial.', 'Tienes un programa especial de tres horas listo para cualquier emergencia.']
  },
  mino: {
    nombre: 'Fausto Miño', ini: 'FM', c: '#7b3fa0', t: '#fff', x: 3, y: -3, z: 6,
    apodo: 'SerraCosteño',
    frase: 'Usted es hermosa… pero no estoy de acuerdo con su tuit.',
    desc: 'No eres ni de la Sierra ni de la Costa: eres de donde haya señal. Cantas una balada y opinas de política en el mismo hilo, y te sorprende de verdad cuando te vuelves tendencia, que pasa más o menos una vez al mes.',
    rasgos: ['Dedicas canciones mirando fijamente a los ojos.', 'Tienes una opinión sobre el himno nacional y la compartes.', 'Siempre «entiendes», aunque no estés de acuerdo.']
  },
  cholito: {
    nombre: 'El Cholito', ini: 'EC', c: '#8a4b1f', t: '#fff', x: -4, y: -2, z: 2,
    apodo: 'Del barrio, forever',
    frase: 'Yo voy a ser periodista, ñaño. Ya vas a ver.',
    desc: 'Eres del barrio y lo defiendes de cualquier inversionista que quiera volverlo condominio. Tienes poca plata, muchos sueños y más vecinos que contactos. Crees en la comunidad, en la palabra y en que todo se arregla en la tienda de la esquina.',
    rasgos: ['Te saludan de todos los balcones.', 'Tu mejor fuente es la señora de la tienda.', 'Llevas veinte años diciendo que ya mismo te va bien, y te ves igualito.']
  },
  aud: {
    nombre: 'AU-D', ini: 'AU', c: '#d9a400', t: '#141414', x: 7, y: -6, z: 7,
    apodo: 'Vieja escuela',
    frase: 'Vieja escuela, mi pana. Yo traje esto cuando nadie sabía qué era.',
    desc: 'Trajiste el dancehall cuando el resto todavía bailaba otra cosa. Eres emprendedor de los de antes: produces, cantas, vendes, y si hace falta te nacionalizas. Tu ideología es el flow; el Estado te parece bien mientras no te desenchufe el micrófono.',
    rasgos: ['Tienes un tema para cada ocasión, y lo produjiste tú.', 'Le dices «mi pana» hasta al guardia del banco.', 'En cualquier fiesta, alguien te pide la de los noventa.']
  },
  fusilero: {
    nombre: 'Fusilero y Malcriadito', ini: 'FyM', c: '#2c6fa8', t: '#fff', x: 0, y: 3, z: 5,
    apodo: 'Terapia familiar',
    frase: '—¡Malcriado! —¿Y qué, pues?',
    desc: 'Eres dos personas a la vez: la que pone orden a gritos y la que no le hace caso. Te gobiernas como una casa de Vivos: muchísima autoridad y cero obediencia. En terapia familiar te dieron el alta por cansancio del terapeuta.',
    rasgos: ['Tu idea de diálogo es hablar más fuerte.', 'Pides perdón cantando el Día de la Madre.', 'En tu casa manda todo el mundo y nadie obedece.']
  },
  alvaro: {
    nombre: 'Álvaro Noboa', ini: 'ÁN', c: '#0f766e', t: '#fff', x: 9, y: 1, z: 8,
    apodo: 'Esta vez sí',
    frase: 'Esta vez sí. Lo dice la Biblia… o lo dirá.',
    desc: 'Tienes plata, una Biblia y una fe inquebrantable en que la próxima elección es la buena. Regalas computadoras, sillas de ruedas y promesas con la misma generosidad. Te arrodillas en la tarima y te levantas con un plan de un millón de empleos.',
    rasgos: ['Te has postulado más veces que años tiene tu sobrino.', 'Todo lo que tocas se vuelve banano de exportación.', 'Tu discurso de derrota ya tiene secuela.']
  },
  nebot: {
    nombre: 'Jaime Nebot', ini: 'JN', c: '#38a3d1', t: '#141414', x: 6, y: 8, z: 3,
    apodo: 'Guayaquil independiente',
    frase: '¡Esto es Guayaquil, señores, y aquí se hace así!',
    desc: 'Hablas con el puño cerrado y el malecón a la espalda. Crees en el orden, en la obra pública con placa y en que todo sale mejor si Quito no se mete. Cuando dices «autonomía», se oye el eco desde el cerro Santa Ana.',
    rasgos: ['Tu tono normal es el de un discurso del 9 de Octubre.', 'Tienes una placa con tu nombre en cada escalinata.', 'Te retiraste, pero todos siguen preguntando qué opinas.']
  },
  lucio: {
    nombre: 'Lucio Gutiérrez', ini: 'LG', c: '#556b2f', t: '#fff', x: -1, y: 7, z: 5,
    apodo: 'Mi coronel',
    frase: 'Yo me voy, pero me voy en helicóptero.',
    desc: 'Eres de disciplina militar hasta que llega la hora de la salida, que en tu caso siempre es por el aire. Entraste diciendo una cosa y gobernaste diciendo otra, que es la definición de versatilidad. Tus reuniones empiezan con un «¡firmes!» y terminan con la terraza despejada.',
    rasgos: ['Sabes dónde está el helipuerto de cualquier edificio.', 'Saludas militarmente a los meseros.', 'Siempre tienes un hermano dispuesto a ser candidato.']
  },
  delfin: {
    nombre: 'Delfín Quishpe', ini: 'DQ', c: '#d6336c', t: '#fff', x: -2, y: -5, z: 9,
    apodo: 'Desde Guamote para el mundo',
    frase: 'En tus tierras bailaré…',
    desc: 'Eres viral desde antes de que existiera la palabra viral. Haces videoclips con efectos especiales que Hollywood no se atrevería a usar y cantas con el corazón en la mano y el poncho bien puesto. Lo tuyo no es fama: es diplomacia internacional con tecnocumbia.',
    rasgos: ['Tus videos tienen más fondo verde que la Amazonía.', 'Le cantas a la actualidad mundial con ritmo bailable.', 'Eres embajador de ti mismo en cada país que visitas.']
  },
  mofle: {
    nombre: 'La Mofle', ini: 'LM', c: '#ff8fab', t: '#141414', x: -3, y: -8, z: 8,
    apodo: 'La del barrio',
    frase: '¡Ay, mijito, aquí la que manda es la Mofle!',
    desc: 'Eres la del barrio: sabes la vida de todos, opinas de todo y lo dices a todo volumen. Trabajas en mansión ajena, pero el control remoto es tuyo. Ningún patrón, presidente ni novio te ha callado todavía.',
    rasgos: ['Tu chisme llega antes que la noticia.', 'Te sientas de jurado en cualquier concurso, aunque no haya concurso.', 'Te peinas para ir a la tienda.']
  },
  evaristo: {
    nombre: 'Don Evaristo', ini: 'DE', c: '#6b7280', t: '#fff', x: -5, y: -1, z: -5,
    apodo: 'Corral y Chancleta',
    frase: 'En mis tiempos, con un sucre se vivía una semana.',
    desc: 'Eres el quiteño de antes: sombrero, terno gastado y una nostalgia que no cabe en el Centro Histórico. Te quejas del gobierno, del precio del pan y de la juventud, en ese orden, cada mañana. No tienes plata, pero tienes una dignidad de primera.',
    rasgos: ['Todo te parece más caro que en tiempos del sucre.', 'Sabes cómo se llamaban las calles antes de que les cambiaran el nombre.', 'Dices «achachay» con una elegancia que ya no se fabrica.']
  },
  lasso: {
    nombre: 'Guillermo Lasso', ini: 'GL', c: '#111827', t: '#fff', x: 8, y: 2, z: -6,
    apodo: 'Muerte cruzada',
    frase: 'Si no nos entendemos, cerramos todo y cada uno a su casa. Encuentro.',
    desc: 'Eres el banquero que quería ser presidente y lo fue, hasta que firmaste la salida tú mismo. Prefieres un Excel a una tarima y una muerte cruzada a una pelea larga. Tienes un perfil tan bajo que a veces ni tú te encuentras.',
    rasgos: ['Cuadras la caja antes de dormir.', 'Dices «encuentro» cuando quieres decir «adiós».', 'Tu manera de resolver un conflicto es disolverlo.']
  },
  dnoboa: {
    nombre: 'Daniel Noboa', ini: 'DN', c: '#22b8cf', t: '#141414', x: 7, y: 7, z: 0,
    apodo: 'El de cartón',
    frase: 'No pude venir, pero les mandé mi versión de cartón.',
    desc: 'Eres joven, tienes apellido de banano y una versión de cartón de ti mismo en cada mitin. Gobiernas con consultas populares, chompa y una seriedad que intimida a los tíos. Cuando no sabes qué decir, mandas un comunicado con música épica.',
    rasgos: ['Tu figura de cartón tiene más asistencia que tú.', 'Ya hiciste más consultas que preguntas tiene este test.', 'La plata la heredaste; el estilo, no.']
  },
  rico: {
    nombre: 'Gerardo Mejía', ini: 'GM', c: '#c0262d', t: '#fff', x: 5, y: -5, z: 9,
    apodo: 'Rico Suave',
    frase: 'Rico, suave… y en inglés, por si acaso.',
    desc: 'Fuiste internacional cuando ser internacional era salir en MTV. Tienes un torso que debería ser patrimonio nacional y un éxito de los noventa que te persigue, felizmente. Cuando alguien en la fiesta se quita la camisa, sabes que es culpa tuya.',
    rasgos: ['Bailas con la camisa abierta aunque haga frío.', 'Cantas un verso en inglés y otro en español.', 'Tu mayor éxito todavía suena en los gimnasios.']
  }
};

/* ══════════ LOS PRODUCTOS DEL TUTI ══════════
   Ninguno es un producto real: son los arquetipos de la percha. */
const PROD = {
  atun: { nombre: 'El atún de marca propia', ini: 'AT', c: '#2c6fa8', t: '#fff',
    apodo: 'Lomitos en aceite (dice)',
    frase: '«Lomitos en aceite», dice la etiqueta. Lo del aceite es verdad.',
    desc: 'Eres rendidor: con una lata le das de comer a cuatro, con arroz y un poco de fe. Nadie sabe bien de qué estás hecho, pero todos confían en ti a fin de mes.',
    rasgos: ['Siempre hay uno de ti en la alacena.', 'Nadie lee tu etiqueta, y es mejor así.', 'Combinas con todo: arroz, fideo, encebollado improvisado.'] },
  cola: { nombre: 'La cola de tres litros', ini: '3L', c: '#9c1f1f', t: '#fff',
    apodo: 'Sabor «cola»',
    frase: 'Sabor: cola. Color: cola. Marca: la de la casa.',
    desc: 'Llegas a todas las fiestas aunque nadie te haya invitado, y sin ti no hay brindis. Eres efervescente durante veinte minutos y después te desbravas, pero nadie se queja porque eres mucho.',
    rasgos: ['Te sirven en vasos de plástico y no te importa.', 'Ocupas media refri.', 'Quedas para el día siguiente, sin gas y con dignidad.'] },
  papel: { nombre: 'El papel higiénico de 32 rollos', ini: '32', c: '#5a6b7b', t: '#fff',
    apodo: 'Hoja simple, presencia doble',
    frase: 'Una sola hoja. Muchísima presencia.',
    desc: 'Eres la compra que nadie planifica y todos agradecen. Ocupas la mitad del carrito y duras años en la bodega. Eres de una sola hoja, sí, pero estás ahí cuando más se te necesita.',
    rasgos: ['Te compran en pánico, nunca por amor.', 'No cabes en ningún clóset.', 'Alguien de tu familia te usa como servilleta.'] },
  galletas: { nombre: 'Las galletas del paquete familiar', ini: 'GA', c: '#c27a1a', t: '#141414',
    apodo: 'Comfort food de cartera',
    frase: 'Paquete familiar: dura una tarde.',
    desc: 'Estás siempre: en la cartera, en la guantera, en el cajón de la oficina. Eres el consuelo de las cuatro de la tarde y la cena de los que llegaron tarde. Te acabas rápido, pero nadie te olvida.',
    rasgos: ['Vienes de a doce y desapareces de a doce.', 'Te mojan en café y te dejas.', 'Eres la merienda oficial de cualquier reunión de condominio.'] },
  shampoo: { nombre: 'El shampoo de dos litros', ini: '2L', c: '#3c8d3c', t: '#fff',
    apodo: 'Manzana verde, multiuso',
    frase: 'Shampoo, jabón de platos y, si apuran, desengrasante.',
    desc: 'Haces de todo y lo haces más o menos bien. Lavas el pelo, el perro y la loza. Hueles a manzana verde de una manzana que nunca existió. Eres la navaja suiza de la ducha.',
    rasgos: ['Tu tapa nunca cierra del todo.', 'Te rellenan con agua para que rindas.', 'Estás en el baño de la casa de todos tus tíos.'] },
  salchicha: { nombre: 'Las salchichas de pollo (dice)', ini: 'SA', c: '#c9547a', t: '#fff',
    apodo: 'El misterio de la parrillada',
    frase: 'De pollo, dice el empaque. El pollo no confirma.',
    desc: 'Eres un misterio con buena actitud. Nadie pregunta de qué estás hecho y tú no lo cuentas. En la parrillada eres lo primero que se acaba, y nadie admite que te prefería a la carne.',
    rasgos: ['Combinas con pan, con arroz y con dudas.', 'Tienes un color que no existe en la naturaleza.', 'Eres el plan B que siempre termina siendo el plan A.'] },
  chocolate: { nombre: 'El chocolate «tipo» importado', ini: 'CH', c: '#5b3a24', t: '#fff',
    apodo: 'Europeo de lejos',
    frase: 'De lejos, suizo. De cerca, de Durán.',
    desc: 'Tienes empaque dorado y nombre en otro idioma. Pareces importado hasta que alguien lee la letra chiquita. Pero no te preocupes: el sabor es honesto, y regalarte quedó bonito.',
    rasgos: ['Vienes en una caja más grande que tú.', 'Te regalan en el amigo secreto.', 'Tu nombre tiene una diéresis que no hacía falta.'] },
  detergente: { nombre: 'El detergente de cinco kilos', ini: '5K', c: '#1b8a9c', t: '#fff',
    apodo: 'Aroma a «brisa»',
    frase: 'Huele a «brisa». A qué brisa, no lo dice.',
    desc: 'Prometes muchísimo y limpias lo justo. Eres el rey de la promo del grupo de WhatsApp y el que más espacio ocupa en el patio. Tu olor llega antes que tú y se queda después.',
    rasgos: ['Tienes una taza medidora que nadie usa.', 'Eres la oferta de la semana, todas las semanas.', 'Dejas la ropa oliendo a ti por tres lavadas.'] },
  arroz: { nombre: 'El arroz de saco', ini: 'AR', c: '#b9a27a', t: '#141414',
    apodo: 'La base de la pirámide',
    frase: 'Sin mí no hay almuerzo. Conmigo, tampoco hay sorpresa.',
    desc: 'Eres la base de todo: del almuerzo, de la merienda y del arroz frito del día siguiente. No brillas, pero sin ti la familia no funciona. Vienes en saco y te guardan como herencia.',
    rasgos: ['Te sirven en montaña.', 'Combinas con absolutamente todo.', 'Siempre sobras y te recalientan.'] },
  mayonesa: { nombre: 'La mayonesa de funda', ini: 'MY', c: '#e8d36b', t: '#141414',
    apodo: 'Se pone en todo',
    frase: 'Una esquinita cortada y a la salchipapa.',
    desc: 'Eres intensa y te pones en todo: papas, sánduches, hot dogs y hasta en lo que no te pidieron. Vienes en funda, te cortan una esquina y ya eres parte de la familia. Hay quien te quiere y quien te teme.',
    rasgos: ['Terminas en la ropa de alguien.', 'Nadie te mide: te aprietan.', 'Eres el alma de la salchipapa.'] }
};

/* ══════════ LAS 24 PROVINCIAS ══════════
   Ocho rasgos de 0 a 10. Es geografía emocional, no un censo. */
const RASGOS = [
  { k: 'calor', nombre: 'Calor', bajo: 'poncho', alto: 'bolón al sol' },
  { k: 'farra', nombre: 'Farra', bajo: 'en cama a las nueve', alto: 'hasta que salga el sol' },
  { k: 'lejos', nombre: 'Lejanía', bajo: 'en el centro de todo', alto: 'lejazos' },
  { k: 'jama', nombre: 'Jama', bajo: 'como para vivir', alto: 'vivo para comer' },
  { k: 'camello', nombre: 'Camello', bajo: 'mañana lo hago', alto: 'vendo hasta en feriado' },
  { k: 'verde', nombre: 'Monte', bajo: 'cemento', alto: 'selva, río y cascada' },
  { k: 'pose', nombre: 'Pose', bajo: 'humilde', alto: 'me creo mucho' },
  { k: 'volcan', nombre: 'Drama', bajo: 'agua mansa', alto: 'volcán activo' }
];
const REGION = {
  costa:    { nombre: 'Costa', c: '#d9822b', t: '#141414' },
  sierra:   { nombre: 'Sierra', c: '#3f6e8c', t: '#fff' },
  oriente:  { nombre: 'Amazonía', c: '#2e7d4f', t: '#fff' },
  insular:  { nombre: 'Insular', c: '#1b8a9c', t: '#fff' }
};
//                 calor farra lejos jama camello verde pose volcan
const PROV_RAW = {
  azuay:       ['Azuay', 'AZ', 'sierra', [3, 4, 5, 6, 5, 4, 9, 3],
    'Atenas del Ecuador', 'Ay, qué lindo, ve.',
    'Eres Cuenca: te crees europeo, hablas cantadito y tienes cuatro ríos para no tener que nombrar ninguno. Los jubilados gringos te eligieron entre todas, y tú lo mencionas cada vez que puedes.',
    ['Comes mote pillo y lo explicas como si fuera alta cocina.', 'Tienes un balcón con flores y un sombrero de paja toquilla «que no es de Panamá».', 'Corriges cómo pronuncian el nombre de tu ciudad.']],
  bolivar:     ['Bolívar', 'BO', 'sierra', [2, 10, 6, 5, 3, 4, 2, 4],
    'Carnaval todo el año', '¡Carnaval, carnaval, carnaval de Guaranda!',
    'Eres Guaranda: contigo siempre es carnaval. Febrero te dura doce meses, tu agua no es para tomar sino para lanzar y tu punta tiene más grados que tu temperatura ambiente.',
    ['Llevas espuma de carnaval en la mochila, por si acaso.', 'Tus siete colinas son siete excusas para subir cantando.', 'La resaca de febrero te llega en abril.']],
  canar:       ['Cañar', 'CÑ', 'sierra', [2, 4, 6, 4, 7, 4, 3, 3],
    'Media familia en Queens', 'Mi primo me manda los dólares, yo le mando el cuy.',
    'Eres Cañar: tienes Ingapirca, el castillo inca más grande del país, y la mitad de tu familia en Nueva York. Tus casas tienen tres pisos, cuatro balcones y nadie viviendo adentro.',
    ['Sabes cuánto está el envío por Western Union de memoria.', 'Tus tíos hablan con acento de Queens.', 'Le explicas a los turistas que no, Ingapirca no es Machu Picchu.']],
  carchi:      ['Carchi', 'CR', 'sierra', [0, 3, 9, 5, 7, 3, 2, 2],
    'El frío más digno del país', 'Achachay… y eso que hoy hace calor.',
    'Eres Tulcán: estás en la última esquina del mapa y tienes un frío que hace temblar a los quiteños. Recortas cipreses en forma de animales en el cementerio, que es tu manera de decir que el arte está en todas partes.',
    ['Cruzas la frontera para comprar y vuelves para quejarte de los precios.', 'Tienes tres capas de ropa en agosto.', 'Tu papa es mejor que la de los demás, y lo sabes.']],
  chimborazo:  ['Chimborazo', 'CH', 'sierra', [1, 5, 5, 5, 4, 6, 4, 6],
    'El punto más cerca del sol', 'Estoy más cerca del sol que nadie, y aun así me congelo.',
    'Eres Riobamba: tienes el punto del planeta más cercano al sol y aun así usas bufanda. Te dicen «Sultana de los Andes», tienes un tren que va a la Nariz del Diablo y una calma que esconde un volcán.',
    ['Explicas lo del punto más cercano al sol en cada reunión.', 'Te sabes los horarios del tren aunque nunca lo tomas.', 'Tienes primos en Guamote que salen en videoclips.']],
  cotopaxi:    ['Cotopaxi', 'CO', 'sierra', [2, 6, 4, 8, 4, 5, 2, 9],
    'Siempre a punto de explotar', 'Ya mismo exploto… pero mejor mañana.',
    'Eres Latacunga: todo el país te mira de reojo porque tu volcán podría despertar cualquier día. Mientras tanto, comes chugchucaras, bailas con la Mama Negra y vives tranquilo con la mochila de emergencia lista.',
    ['Tienes un plan de evacuación y un plato de chugchucaras.', 'Tu drama es geológico.', 'Te disfrazas en noviembre y nadie entiende por qué tan elaborado.']],
  eloro:       ['El Oro', 'EO', 'costa', [9, 6, 5, 8, 8, 3, 5, 4],
    'Capital bananera del mundo', 'Banano, camarón y un poquito de oro: ¿qué más quieres, mijo?',
    'Eres Machala: todo lo resuelves con banano y camarón, y si no alcanza, con oro de Zaruma. Tienes calor de horno, ceviche de concha y una feria mundial dedicada a una fruta.',
    ['Tu reina es la Reina Mundial del Banano.', 'Vas a Perú a comprar y vuelves a vender.', 'Sudas, pero con estilo.']],
  esmeraldas:  ['Esmeraldas', 'ES', 'costa', [10, 9, 6, 8, 3, 7, 2, 4],
    'La provincia verde', 'Marimba, encocado y que nadie me apure.',
    'Eres Esmeraldas: tienes la marimba en las caderas, el encocado en la olla y el mar a dos cuadras. Atacames es tu sala de estar. Vives a otro ritmo, y ese ritmo suena mejor que el de los demás.',
    ['Lo tuyo con el coco es una relación seria.', 'Bailas mejor que cualquier invitado de la Sierra.', 'Siempre te visitan en feriado y nunca en junio.']],
  galapagos:   ['Galápagos', 'GA', 'insular', [8, 3, 10, 4, 6, 10, 7, 1],
    'Vives en un documental', 'Disculpa, ¿me cuidas al lobo marino que está en la banca?',
    'Eres Galápagos: vives en un documental de la BBC. Tu vecino es una tortuga de ciento cincuenta años, todo cuesta el triple y cada turista te pregunta por Darwin como si fuera tu tío.',
    ['Un lobo marino te robó la silla del malecón.', 'Pagas una cola al precio de un almuerzo.', 'Te parece normal nadar con tiburones antes del desayuno.']],
  guayas:      ['Guayas', 'GU', 'costa', [10, 8, 2, 9, 9, 1, 8, 7],
    'Guayaquil de mis amores', '¡Ñañito, qué fue! Aquí se habla fuerte y se camella más.',
    'Eres Guayaquil: hablas fuerte, comes encebollado para el chuchaqui y camellas en lo que sea. Tienes malecón, cuarenta grados de calor, y la certeza de que el país funciona porque tú lo mueves.',
    ['Le dices «mi llave» a un desconocido.', 'Tu aire acondicionado tiene más horas de uso que tu carro.', 'Te ofendes si alguien dice que Quito es la capital de algo.']],
  imbabura:    ['Imbabura', 'IM', 'sierra', [4, 4, 4, 7, 10, 8, 4, 3],
    'Provincia de los lagos', 'Le hago precio, casero. Pero solo a usted.',
    'Eres Imbabura: tienes lagos, volcanes, helados de paila y el mercado de Otavalo, donde regateas en cinco idiomas. Vendes de todo, a todos, y el turista se va feliz de haber pagado más.',
    ['Sabes hacer cuentas más rápido que una calculadora.', 'Tienes una nogada en el bolsillo.', 'Te tomas los lagos como algo personal.']],
  loja:        ['Loja', 'LO', 'sierra', [5, 6, 10, 6, 3, 6, 5, 2],
    'Todos te quieren, pero vives lejazos', 'Vengan nomás, que de aquí nadie se quiere ir… si llegan.',
    'Eres Loja: todos te quieren, pero vives lejazos. Tienes la capital musical del país, la cecina más rica y una forma de hablar tan bonita que da pena interrumpirte. El que llega no se va, pero llegar es una peregrinación.',
    ['Tu serenata dura más que el viaje en bus a Quito, y eso es mucho decir.', 'Corriges cómo hablan los demás, con cariño.', 'Caminas con la Virgen del Cisne una vez al año, por si acaso.']],
  losrios:     ['Los Ríos', 'LR', 'costa', [9, 6, 5, 7, 7, 4, 2, 6],
    'Te inundas y sigues', 'Si se inunda, se rema. Pero el chifa abre.',
    'Eres Los Ríos: cada invierno te inundas un poquito y al día siguiente ya estás vendiendo. Tienes los chifas de Quevedo, las mejores tierras del país y una paciencia que se mide en metros de agua.',
    ['Tienes canoa de emergencia y la usas como mueble.', 'Tu chaulafán es patrimonio intangible.', 'Nadie sabe ubicarte en el mapa, pero todos comen lo que siembras.']],
  manabi:      ['Manabí', 'MA', 'costa', [9, 10, 4, 10, 6, 5, 4, 5],
    'Sabor y cumbia chonera', '¡Ajá, mijo! Siéntese, que hay viche, tonga y cumbia chonera.',
    'Eres Manabí: sabor, cumbia chonera y una sazón que hace llorar a los chefs de Quito. Tu bolón es religión, tu viche es medicina y tu humor no tiene filtro. Si alguien te visita, sale con tres kilos más.',
    ['Todo lo cocinas con maní.', 'Tus abuelas compiten por quién sirve más.', 'Tu acento lo imitan todos y lo hacen todos mal.']],
  morona:      ['Morona Santiago', 'MS', 'oriente', [8, 4, 9, 5, 3, 10, 2, 3],
    'Llegas en avioneta', 'Tranquilo, que aquí la naturaleza manda y la señal descansa.',
    'Eres Morona Santiago: tienes cascadas que no salen en ningún mapa, montañas que se pierden en la selva y caminos que llegan cuando llegan. Macas es tu centro y la paciencia, tu religión.',
    ['Tu WhatsApp tiene «última vez» de hace tres días.', 'Sabes de plantas más que un botánico.', 'Te quejas de que en la capital nadie sabe dónde quedas.']],
  napo:        ['Napo', 'NA', 'oriente', [8, 7, 6, 4, 6, 10, 4, 3],
    'Rafting y guayusa', 'Primero el río, después la reunión.',
    'Eres Napo: tienes río para hacer rafting, guayusa para despertar y una selva que te arrulla. Tena es tu sala de estar, y tu manera de resolver problemas es bañarte en una cascada.',
    ['Llueve, y tú ni te enteras.', 'Desayunas guayusa y le dices a todos que es mejor que el café.', 'Tus sandalias tienen más kilometraje que el carro de tu papá.']],
  orellana:    ['Orellana', 'OR', 'oriente', [10, 5, 8, 4, 8, 7, 2, 4],
    'Todos vienen por camello', 'Aquí llegaste por trabajo, y te quedaste por el calor.',
    'Eres Orellana: todos vienen a trabajar, pocos se quedan y nadie olvida el calor del Coca. Tienes petróleo, el Yasuní y una vida que se mueve al ritmo de los turnos de catorce por siete.',
    ['Conoces gente de las veinticuatro provincias.', 'Tu malecón mira a un río más ancho que muchas ciudades.', 'Hablas de barriles como si fueran parientes.']],
  pastaza:     ['Pastaza', 'PA', 'oriente', [7, 3, 8, 4, 3, 9, 1, 2],
    'La más grande, y nadie lo sabe', 'Soy la provincia más grande del país. No, en serio.',
    'Eres Pastaza: eres la provincia más grande del Ecuador y nadie te da crédito. Llueve todos los días en el Puyo, tienes selva a la vuelta de la esquina y eres tan humilde que ni lo mencionas.',
    ['Siempre llevas paraguas, aunque haga sol.', 'Ganas cualquier discusión de tamaño.', 'Tus tíos hacen aguardiente de caña y es bien en serio.']],
  pichincha:   ['Pichincha', 'PI', 'sierra', [2, 5, 1, 5, 7, 4, 9, 6],
    'Cuatro estaciones en un día', 'Llevo chompa, paraguas y gafas de sol: es Quito.',
    'Eres Quito: vives cuatro estaciones en un día, te quejas del tráfico y del pico y placa, y aun así crees que el mundo gira a tu alrededor, literalmente, porque tienes la Mitad del Mundo. Dices «full» y «bacán» como si fueran signos de puntuación.',
    ['Siempre tienes una chompa en el carro.', 'Le explicas a todos que el Metro ya funciona.', 'Haces fila para todo, incluso para quejarte de la fila.']],
  santaelena:  ['Santa Elena', 'SE', 'costa', [9, 10, 4, 7, 5, 6, 5, 3],
    'Solo te visitan en feriado', 'Feriado es feriado: el resto del año, aquí hay paz.',
    'Eres Santa Elena: medio país te visita en carnaval, se lleva tu arena en los zapatos y te deja solo el resto del año. Tienes Salinas, Montañita y una playa para cada tipo de persona.',
    ['Tu población se triplica cuatro veces al año.', 'Tienes un amigo que vende pulseras y otro que da clases de surf.', 'Sabes la tabla de mareas de memoria.']],
  santodomingo:['Santo Domingo', 'SD', 'costa', [7, 5, 3, 6, 8, 6, 2, 4],
    'Todos te pasan por encima', 'Pasa nomás, que yo te vendo el almuerzo en el camino.',
    'Eres Santo Domingo: todo el país te cruza para ir a la playa y tú aprovechas para venderles algo. Mitad Sierra, mitad Costa, completamente comerciante. Tus tsáchilas se pintan el pelo con achiote y eso es más estilo que cualquier peluquería.',
    ['Tu terminal tiene buses a todas partes del país.', 'Sabes cuál es el mejor pandebono del camino.', 'Nadie se queda, pero todos paran.']],
  sucumbios:   ['Sucumbíos', 'SU', 'oriente', [9, 4, 9, 4, 7, 8, 2, 5],
    'Loja, pero con calor', 'Nueva Loja: igual de lejos, pero con más calor.',
    'Eres Sucumbíos: tu capital se llama Nueva Loja porque la fundaron lojanos que querían algo igual de lejos pero con más calor. Tienes Cuyabeno, petróleo y frontera, y una vida que no se detiene.',
    ['Tu ciudad tiene dos nombres y usas el que te convenga.', 'Has visto delfines rosados y no lo cuentas porque nadie te cree.', 'Sabes llegar a Colombia por tres caminos.']],
  tungurahua:  ['Tungurahua', 'TU', 'sierra', [3, 6, 3, 8, 8, 6, 4, 9],
    'Tierra de flores y frutas… y ceniza', 'Mama Tungurahua se enoja, pero el pan de Pinllo no se detiene.',
    'Eres Tungurahua: tienes Ambato, la tierra de las flores y las frutas, y Baños, donde el volcán echa humo y los turistas se lanzan de un puente. Haces jeans en Pelileo, pan en Pinllo y melcocha en cada esquina.',
    ['Tu volcán tiene nombre de mamá y le tienes respeto.', 'Le vendes melcocha a todo turista que pase.', 'Tus artistas opinan en Twitter.']],
  zamora:      ['Zamora Chinchipe', 'ZC', 'oriente', [6, 3, 10, 4, 6, 8, 1, 3],
    'Más lejos que Loja', 'Si Loja es lejos, yo soy lo que queda después.',
    'Eres Zamora Chinchipe: estás más lejos que Loja, que ya es decir. Tienes oro en las montañas, aves de colores imposibles y un reloj gigante en la ladera para que nadie diga que llegó tarde.',
    ['Te pasa el Google Maps «sin ruta disponible».', 'Hay más especies de pájaros que habitantes en tu barrio.', 'Te preguntan si eres de Loja y respondes que no con mucha paciencia.']]
};
const PROV = Object.fromEntries(Object.entries(PROV_RAW).map(([k, v]) => {
  const reg = REGION[v[2]];
  return [k, {
    nombre: v[0], ini: v[1], c: reg.c, t: reg.t, region: reg.nombre,
    v: v[3], apodo: v[4], frase: v[5], desc: v[6], rasgos: v[7]
  }];
}));

/* ══════════ LOS TESTS ══════════ */
const ESCALA = [
  { t: 'Totalmente', n: 'de ley', v: 2 },
  { t: 'Algo', n: 'medio medio', v: 1 },
  { t: 'Ni fu ni fa', n: 'chuta, no sé', v: 0 },
  { t: 'Más bien no', n: 'tampoco así', v: -1 },
  { t: 'Para nada', n: 'ni loco', v: -2 }
];

const TESTS = {
  lamparometro: {
    titulo: 'El Lamparómetro',
    kicker: 'Test 1 · El espectro político',
    bajada: 'El clásico plano político, pero con tres ejes y dieciséis lámparas: ¿quién paga, quién manda y cuánta tarima le pones?',
    meta: '24 afirmaciones · 4 min',
    pie: '¿Y tú a qué lámpara te pareces?',
    tipo: 'plano', grupo: PJ,
    preguntas: [
      // x · ¿quién paga?
      { t: 'La tienda de la esquina sube el pan y hay que respetarlo: es la mano invisible del mercado.', eje: 'x', s: 1, w: 1 },
      { t: 'Los vendedores de La Bahía son el verdadero motor de la economía nacional.', eje: 'x', s: 1, w: 1 },
      { t: 'La electricidad debería ser del Estado, aunque haya apagones de catorce horas.', eje: 'x', s: -1, w: 1.5 },
      { t: 'El que no madruga a vender caramelos en el bus no tiene derecho a quejarse.', eje: 'x', s: 1, w: 1 },
      { t: 'Que el seguro social te dé cita para el 2031 es un derecho, y hay que defenderlo.', eje: 'x', s: -1, w: 1 },
      { t: 'La gasolina debería costar lo mismo que en 1999, y que la diferencia la pague el Estado.', eje: 'x', s: -1, w: 1.5 },
      { t: 'Un banquero sabe gobernar porque sabe cuadrar la caja.', eje: 'x', s: 1, w: 1.5 },
      { t: 'Los bonos del gobierno deberían llegar por delivery, con propina incluida.', eje: 'x', s: -1, w: 1 },
      // y · ¿quién manda?
      { t: 'Un país se gobierna mejor con una cadena nacional de cuatro horas cada sábado.', eje: 'y', s: 1, w: 1.5 },
      { t: 'Cada barrio debería decidir sus cosas en asamblea, con colada morada y empanadas.', eje: 'y', s: -1, w: 1 },
      { t: 'Al que critica al gobierno hay que mostrarle su foto en pantalla gigante.', eje: 'y', s: 1, w: 1.5 },
      { t: 'Las leyes son más bien sugerencias, como las señales de tránsito en Guayaquil.', eje: 'y', s: -1, w: 1 },
      { t: 'Hace falta alguien que ponga orden, aunque sea gritando en la casa.', eje: 'y', s: 1, w: 1 },
      { t: 'Una farra en tarima es una forma perfectamente legítima de hacer política.', eje: 'y', s: -1, w: 1 },
      { t: 'El que manda debería poder cambiar la Constitución cuando le aburra.', eje: 'y', s: 1, w: 1 },
      { t: 'Si la Asamblea no te hace caso, lo justo es cerrarla y que todos se vayan a la casa.', eje: 'y', s: 1, w: 1 },
      // z · ¿cuánta lámpara?
      { t: 'Un buen político debe saber cantar, bailar y hacer la coreografía completa en tarima.', eje: 'z', s: 1, w: 1.5 },
      { t: 'Si no lo subiste a TikTok, no pasó.', eje: 'z', s: 1, w: 1 },
      { t: 'Me pondría de rodillas en un mitin, con una Biblia en la mano, si eso ayuda a ganar.', eje: 'z', s: 1, w: 1 },
      { t: 'Con un recorte de cartón de mí mismo puedo estar en diez sitios a la vez.', eje: 'z', s: 1, w: 1 },
      { t: 'La elegancia está en el perfil bajo: menos tarima, más Excel.', eje: 'z', s: -1, w: 1.5 },
      { t: 'La salida más digna de un mal día en el trabajo es en helicóptero.', eje: 'z', s: 1, w: 1 },
      { t: 'Las cosas serias se dicen bajito, sin parlante y sin música de fondo.', eje: 'z', s: -1, w: 1 },
      { t: 'Una buena campaña cabe en un PDF de cuarenta páginas, sin fotos.', eje: 'z', s: -1, w: 1 }
    ]
  },
  astral: {
    titulo: '¿Con quién compartes carta astral?',
    kicker: 'Test 2 · Horóscopo lámpara',
    bajada: 'Tu sol, ascendente, luna, Venus, Marte y Mercurio retrógrado, cruzados con las cartas (inventadas) de dieciséis lámparas nacionales.',
    meta: 'tu cumpleaños + 5 preguntas · 2 min',
    pie: '¿Y tú con quién compartes carta astral?',
    tipo: 'puntos', grupo: PJ, fecha: true,
    astros: ['Sol en', 'Ascendente en', 'Luna en', 'Venus en', 'Marte en', 'Mercurio en'],
    preguntas: [
      { t: '¿A qué hora naciste, más o menos?', astro: 'Ascendente', op: [
        { t: 'De madrugada, después de la farra', p: { bucaram: 2, mofle: 1 }, casa: 'Tarima' },
        { t: 'A las diez en punto, como cadena nacional', p: { correa: 2, dnoboa: 1 }, casa: 'Sabatina' },
        { t: 'En hora pico, dentro de la Metrovía', p: { cholito: 2, nebot: 1 }, casa: 'Barrio' },
        { t: 'Mi mamá dice una hora y mi papá otra', p: { fusilero: 2, mofle: 1 }, casa: 'Terapia familiar' },
        { t: 'Justo en el noticiero estelar', p: { vera: 2, lasso: 1 }, casa: 'Entrevista' },
        { t: 'Mientras pasaban un video en MTV', p: { rico: 2, aud: 1, delfin: 1 }, casa: 'Videoclip' }
      ]},
      { t: '¿Cómo amaneces un lunes?', astro: 'Luna', op: [
        { t: 'Con chuchaqui y sin arrepentimiento', p: { aud: 1, bucaram: 1, rico: 1 }, casa: 'Chuchaqui' },
        { t: 'Indignado por algo que leí a las seis de la mañana', p: { vera: 2, evaristo: 1 }, casa: 'Indignación' },
        { t: 'Cantando una balada en la ducha', p: { mino: 2, delfin: 1 }, casa: 'Balada' },
        { t: 'Escribiendo en mayúsculas', p: { correa: 2, nebot: 1 }, casa: 'Bloq Mayús' },
        { t: 'Pidiendo prestado para el pasaje', p: { cholito: 2, evaristo: 1 }, casa: 'Fin de mes' },
        { t: 'Revisando cuánto subieron mis acciones', p: { lasso: 2, alvaro: 1, dnoboa: 1 }, casa: 'Bolsa de valores' }
      ]},
      { t: '¿Cómo conquistas a alguien?', astro: 'Venus', op: [
        { t: 'Le dedico una canción, con pista y micrófono', p: { mino: 1, bucaram: 1, delfin: 1 }, casa: 'Serenata' },
        { t: 'Con flow y un «qué fue, mi reina»', p: { aud: 2, rico: 1 }, casa: 'Dancehall' },
        { t: 'Le hago preguntas incómodas hasta que acepta', p: { vera: 2 }, casa: 'Repregunta' },
        { t: 'Le presento a toda mi familia en la primera cita', p: { fusilero: 1, bucaram: 1, lucio: 1 }, casa: 'Familión' },
        { t: 'Le escribo una nota en el periódico del barrio', p: { cholito: 2, mofle: 1 }, casa: 'Periodismo' },
        { t: 'Le regalo una computadora y una Biblia', p: { alvaro: 3 }, casa: 'Donación' }
      ]},
      { t: '¿Cómo peleas?', astro: 'Marte', op: [
        { t: 'A gritos, desde la cocina', p: { mofle: 2, fusilero: 1 }, casa: 'Grito' },
        { t: 'Con el puño en alto y el malecón de fondo', p: { nebot: 2, correa: 1 }, casa: 'Malecón' },
        { t: 'Disuelvo todo y me voy a mi casa', p: { lasso: 3 }, casa: 'Muerte cruzada' },
        { t: 'No peleo: me voy volando, literalmente', p: { lucio: 2, bucaram: 1 }, casa: 'Helicóptero' },
        { t: 'Saco un videoclip con efectos especiales', p: { delfin: 2, rico: 1 }, casa: 'Efectos especiales' },
        { t: 'Mando a mi versión de cartón', p: { dnoboa: 2 }, casa: 'Cartón' },
        { t: 'Me quejo, pero con mucha educación', p: { evaristo: 2, mino: 1 }, casa: 'Queja formal' }
      ]},
      { t: 'Mercurio está retrógrado y todo te sale mal. ¿Qué haces?', astro: 'Mercurio', op: [
        { t: 'Le echo la culpa a la prensa', p: { correa: 2, lucio: 1 }, casa: 'Prensa corrupta' },
        { t: 'Me voy un tiempito fuera del país, a ver si se calma', p: { bucaram: 1, correa: 1, rico: 1 }, casa: 'Exilio' },
        { t: 'Grito, y luego pido perdón cantando', p: { fusilero: 2, mofle: 1 }, casa: 'Perdón cantado' },
        { t: 'Saco tema nuevo', p: { aud: 1, mino: 1, delfin: 1 }, casa: 'Lanzamiento' },
        { t: 'Hago un especial de tres horas sobre el tema', p: { vera: 2 }, casa: 'Programa especial' },
        { t: 'Digo que antes todo era mejor', p: { evaristo: 2, cholito: 1 }, casa: 'Nostalgia' },
        { t: 'Me vuelvo a postular', p: { alvaro: 2, dnoboa: 1, nebot: 1 }, casa: 'Candidatura' }
      ]}
    ]
  },
  playlist: {
    titulo: '¿A qué lámpara te pareces según tu playlist?',
    kicker: 'Test 3 · Tus gustos musicales',
    bajada: 'Dime qué suena en tu farra y te diré quién eres. Spoiler: alguien que pone la música muy alto.',
    meta: '7 preguntas · 2 min',
    pie: '¿Y tú a qué lámpara te pareces?',
    tipo: 'puntos', grupo: PJ,
    preguntas: [
      { t: '¿Qué suena en tu farra?', op: [
        { t: 'Cumbia en tarima, a todo volumen', p: { bucaram: 2, mofle: 1 } },
        { t: 'Dancehall de los noventa, hecho en Guayaquil', p: { aud: 2, rico: 1 } },
        { t: 'Baladas para cantar abrazados', p: { mino: 2 } },
        { t: 'Canciones de protesta, con el puño en alto', p: { correa: 2, lucio: 1 } },
        { t: 'Lo que ponga el vecino, que tiene el parlante más grande', p: { cholito: 2, mofle: 1 } },
        { t: 'Tecnocumbia con video de fondo verde', p: { delfin: 3 } },
        { t: 'Un pasillo y un traguito', p: { evaristo: 2, mino: 1 } },
        { t: 'Jazz de lobby de banco', p: { lasso: 2, dnoboa: 1 } }
      ]},
      { t: 'Tu canción de karaoke es…', op: [
        { t: 'Una que dedico mirando a los ojos de alguien', p: { mino: 2, rico: 1 } },
        { t: 'Cualquiera, mientras el micrófono sea mío', p: { correa: 1, bucaram: 1, nebot: 1 } },
        { t: 'Ninguna: prefiero entrevistar al que canta', p: { vera: 2 } },
        { t: 'Un dúo, y peleamos por quién canta la primera parte', p: { fusilero: 2, mofle: 1 } },
        { t: 'Un rap improvisado sobre los presentes', p: { aud: 2 } },
        { t: 'Una sobre la actualidad internacional, con coreografía', p: { delfin: 2 } },
        { t: 'No canto, pero subo el video a TikTok', p: { dnoboa: 2, alvaro: 1 } }
      ]},
      { t: 'En el bus, con audífonos, escuchas…', op: [
        { t: 'Un pódcast de análisis político de tres horas', p: { vera: 2, lasso: 1 } },
        { t: 'Nada: el bus ya trae su propio DJ', p: { cholito: 2, mofle: 1 } },
        { t: 'Mis propios audios de WhatsApp', p: { correa: 1, fusilero: 1 } },
        { t: 'Reguetón de la vieja escuela', p: { aud: 2, rico: 1 } },
        { t: 'Pasillos, para sufrir con estilo', p: { evaristo: 2, mino: 1 } },
        { t: 'No voy en bus: voy en helicóptero', p: { lucio: 2, alvaro: 1 } },
        { t: 'Jingles de campaña, por nostalgia', p: { alvaro: 1, dnoboa: 1, nebot: 1, bucaram: 1 } }
      ]},
      { t: '¿Cómo armas tu playlist?', op: [
        { t: 'No la armo: la playlist soy yo', p: { bucaram: 1, correa: 1 } },
        { t: 'Por orden cronológico y con fuentes verificadas', p: { vera: 2 } },
        { t: 'Mitad Sierra, mitad Costa', p: { mino: 2 } },
        { t: 'La que me pasó mi primo por Bluetooth', p: { cholito: 1, fusilero: 1, mofle: 1 } },
        { t: 'Solo temas que produje yo', p: { aud: 2, delfin: 1 } },
        { t: 'La misma que suena en el gimnasio desde 1990', p: { rico: 2 } },
        { t: 'Me la arma mi equipo de comunicación', p: { dnoboa: 2, lasso: 1 } }
      ]},
      { t: '¿A qué volumen escuchas música?', op: [
        { t: 'Al que hace que el vecino golpee la pared', p: { fusilero: 2, mofle: 1 } },
        { t: 'Volumen tarima: con bajo y amplificación', p: { bucaram: 2, delfin: 1 } },
        { t: 'Suavecito, como para dedicar', p: { mino: 2, rico: 1 } },
        { t: 'Al del parlante del barrio, que es de todos', p: { cholito: 2 } },
        { t: 'Bajito, para oír quién habla mal de mí', p: { correa: 1, vera: 1, lucio: 1 } },
        { t: 'Volumen de despacho, con la puerta cerrada', p: { lasso: 2, nebot: 1 } },
        { t: 'Radio AM, como debe ser', p: { evaristo: 2 } }
      ]},
      { t: 'La canción que dice todo de ti:', op: [
        { t: 'Una que habla de mí, en tercera persona', p: { correa: 2, alvaro: 1 } },
        { t: 'Una de amor loco', p: { bucaram: 2 } },
        { t: 'Una de esas que se le cantan a mamá', p: { fusilero: 2 } },
        { t: 'La cortina musical de un noticiero', p: { vera: 2 } },
        { t: 'Una con coro pegajoso y letra de barrio', p: { cholito: 1, aud: 1, mofle: 1 } },
        { t: 'Una balada que suena igual en Quito que en Guayaquil', p: { mino: 2 } },
        { t: 'El himno de Guayaquil, de pie', p: { nebot: 2 } },
        { t: 'Una en inglés que nadie entiende y todos bailan', p: { rico: 2 } },
        { t: 'Una sobre lo bonito que era Quito antes', p: { evaristo: 2 } }
      ]},
      { t: '¿Cómo bailas?', op: [
        { t: 'Como en tarima de campaña', p: { bucaram: 2, correa: 1 } },
        { t: 'Sin camisa', p: { rico: 2 } },
        { t: 'Con poncho y pasos que inventé yo', p: { delfin: 2 } },
        { t: 'No bailo: cuadro la caja', p: { lasso: 2 } },
        { t: 'Barriendo y bailando a la vez', p: { mofle: 2 } },
        { t: 'Marcando el paso, firme', p: { lucio: 2 } },
        { t: 'Con una mano en el corazón y otra en la Biblia', p: { alvaro: 2 } },
        { t: 'En TikTok, con filtro', p: { dnoboa: 2, aud: 1 } }
      ]}
    ]
  },
  provincia: {
    titulo: '¿Qué provincia del Ecuador eres?',
    kicker: 'Test 4 · Geografía emocional',
    bajada: 'Eres Loja: todos te quieren, pero vives lejazos. Eres Manabí: sabor y cumbia chonera. Eres Guaranda: contigo siempre es carnaval. Las 24, sin excepción.',
    meta: '12 preguntas · 2 min',
    pie: '¿Y tú qué provincia eres?',
    tipo: 'rasgos', grupo: PROV, cosa: true,
    /* r: lo que la opción suma o resta en cada rasgo.
       b: puntos de firma para una provincia: la respuesta que solo daría ella. */
    preguntas: [
      { t: '¿Qué clima te pone de buen humor?', op: [
        { t: 'Treinta y cinco grados y humedad: así se vive', r: { calor: 3 }, b: { guayas: 1, eloro: 1, orellana: 1 } },
        { t: 'Sol de mañana, lluvia de tarde y granizo de noche', r: { calor: -1, volcan: 1, pose: 1 }, b: { pichincha: 2 } },
        { t: 'Neblina y chompa: nací con poncho', r: { calor: -2, lejos: 1 }, b: { carchi: 2, chimborazo: 1 } },
        { t: 'Lluvia tropical todo el día, como debe ser', r: { calor: 2, verde: 2 }, b: { pastaza: 2, napo: 1 } },
        { t: 'Brisa de mar y sombrilla', r: { calor: 2, farra: 1 }, b: { santaelena: 1, esmeraldas: 1, manabi: 1 } },
        { t: 'Templadito, como de primavera eterna', r: { calor: 0, pose: 1, lejos: 1 }, b: { loja: 1, azuay: 1, imbabura: 1 } }
      ]},
      { t: 'Es viernes en la noche. Tú…', op: [
        { t: 'Farra hasta que salga el sol, con punta y comparsa', r: { farra: 3, calor: -1 }, b: { bolivar: 2 } },
        { t: 'Cumbia, parlante en la vereda y vecinos invitados', r: { farra: 2, jama: 1, calor: 1 }, b: { manabi: 1, losrios: 1 } },
        { t: 'Un vinito tranquilo y una charla de arquitectura colonial', r: { pose: 2, farra: -1 }, b: { azuay: 2, pichincha: 1 } },
        { t: 'Duermo: mañana madrugo a vender', r: { camello: 3, farra: -2 }, b: { imbabura: 1, santodomingo: 1, tungurahua: 1 } },
        { t: 'Me voy al río, aunque sea de noche', r: { verde: 3, lejos: 1 }, b: { napo: 1, morona: 1 } },
        { t: 'Me acuesto temprano: mañana hay turno en el campamento', r: { camello: 2, calor: 2, farra: -1 }, b: { orellana: 2, sucumbios: 1 } }
      ]},
      { t: '¿Qué tan lejos vives de todo?', op: [
        { t: 'Lejazos, pero el que llega no se quiere ir', r: { lejos: 3, pose: 1 }, b: { loja: 3 } },
        { t: 'En el centro de todo, y me gusta que se note', r: { lejos: -2, pose: 2 }, b: { pichincha: 2, guayas: 1 } },
        { t: 'Me tienen que llegar en avioneta o en lancha', r: { lejos: 3, verde: 2 }, b: { galapagos: 2, morona: 2 } },
        { t: 'Soy de paso: todos me cruzan para ir a otro lado', r: { lejos: -1, camello: 2 }, b: { santodomingo: 3 } },
        { t: 'Cerca de la frontera, con un pie en cada lado', r: { lejos: 2, camello: 2 }, b: { carchi: 2, eloro: 1, sucumbios: 1 } },
        { t: 'Más lejos que el que dice que vive lejazos', r: { lejos: 3, verde: 1, pose: -1 }, b: { zamora: 3 } }
      ]},
      { t: '¿Cuál es tu desayuno ideal?', op: [
        { t: 'Bolón con chicharrón, café pasado y una siesta después', r: { jama: 3, calor: 1 }, b: { manabi: 2 } },
        { t: 'Encebollado, que cura todo', r: { jama: 2, calor: 2, farra: 1 }, b: { guayas: 2 } },
        { t: 'Pan con queso y café en taza de la abuelita', r: { calor: -1, jama: 1, lejos: 1 }, b: { tungurahua: 1, carchi: 1 } },
        { t: 'Fruta y guayusa, con vista a la selva', r: { verde: 2, calor: 1 }, b: { napo: 2 } },
        { t: 'Chugchucaras, aunque sean las ocho de la mañana', r: { jama: 3, volcan: 1, calor: -1 }, b: { cotopaxi: 3 } },
        { t: 'Un cafecito de especialidad, que lo tostaron cerca', r: { pose: 2, jama: 1 }, b: { loja: 1, azuay: 1 } },
        { t: 'Encocado, aunque sea desayuno', r: { jama: 2, calor: 2, farra: 1 }, b: { esmeraldas: 3 } }
      ]},
      { t: 'Tu relación con la plata:', op: [
        { t: 'Vendo, compro, regateo y exporto', r: { camello: 3 }, b: { imbabura: 2, tungurahua: 1 } },
        { t: 'La mitad de mi familia manda dólares desde Nueva York', r: { camello: 1, lejos: 2 }, b: { canar: 3, azuay: 1 } },
        { t: 'Petróleo, oro o camarón: algo hay debajo de mí', r: { camello: 2, calor: 1, verde: 1 }, b: { orellana: 1, sucumbios: 1, zamora: 1, eloro: 1 } },
        { t: 'La plata va y viene; la farra se queda', r: { farra: 2, camello: -1 }, b: { bolivar: 1, esmeraldas: 1 } },
        { t: 'Prefiero no hablar de plata: es de mal gusto', r: { pose: 3 }, b: { azuay: 1, pichincha: 1 } },
        { t: 'Vivo del turismo, y el turista paga lo que le digo', r: { camello: 2, verde: 1, pose: 1 }, b: { galapagos: 2, santaelena: 1 } }
      ]},
      { t: '¿Cómo reaccionas ante un problema?', op: [
        { t: 'Echo humo, ceniza y amenazo con erupción', r: { volcan: 3 }, b: { tungurahua: 2, cotopaxi: 1 } },
        { t: 'Me inundo un poquito y luego sigo', r: { volcan: 1, calor: 2, camello: 1 }, b: { losrios: 3 } },
        { t: 'Lo resuelvo con un baile', r: { farra: 2, volcan: -1 }, b: { esmeraldas: 1, bolivar: 1 } },
        { t: 'Me retiro al bosque a pensar', r: { verde: 2, lejos: 1, volcan: -1 }, b: { pastaza: 1, morona: 1 } },
        { t: 'Escribo una carta al municipio con copia a la prensa', r: { pose: 2, volcan: 2 }, b: { pichincha: 1, guayas: 1 } },
        { t: 'Nada me altera: soy agua mansa', r: { volcan: -2 }, b: { galapagos: 1, loja: 1 } }
      ]},
      { t: '¿Qué música suena en tu casa?', op: [
        { t: 'Cumbia chonera', r: { farra: 2, jama: 1, calor: 2 }, b: { manabi: 3 } },
        { t: 'Pasillo y serenata', r: { lejos: 2, pose: 1 }, b: { loja: 2 } },
        { t: 'Marimba', r: { calor: 3, farra: 2 }, b: { esmeraldas: 3 } },
        { t: 'La del carnaval, todo el año', r: { farra: 3, calor: -1 }, b: { bolivar: 3 } },
        { t: 'Bomba del Chota y sanjuanito', r: { farra: 1, verde: 1, camello: 1 }, b: { imbabura: 3 } },
        { t: 'Reguetón a volumen de bus urbano', r: { calor: 2, farra: 1, pose: 1 }, b: { guayas: 1, eloro: 1 } },
        { t: 'Los pájaros, porque no hay señal', r: { verde: 3, lejos: 2 }, b: { zamora: 1, morona: 1, pastaza: 1 } }
      ]},
      { t: '¿Qué dicen de ti los demás?', op: [
        { t: 'Que me creo mucho', r: { pose: 3 }, b: { azuay: 1, pichincha: 1, guayas: 1 } },
        { t: 'Que soy lindo pero nadie me visita', r: { lejos: 3, verde: 1 }, b: { zamora: 1, pastaza: 1 } },
        { t: 'Que siempre estoy de fiesta', r: { farra: 3 }, b: { santaelena: 1, bolivar: 1 } },
        { t: 'Que trabajo hasta el cansancio', r: { camello: 3 }, b: { canar: 1, imbabura: 1 } },
        { t: 'Que soy un peligro en potencia', r: { volcan: 3 }, b: { cotopaxi: 2 } },
        { t: 'Que cocino rico', r: { jama: 3 }, b: { manabi: 1, eloro: 1 } }
      ]},
      { t: 'Tu plan de feriado:', op: [
        { t: 'Playa, aunque esté llena', r: { calor: 2, farra: 1 }, b: { santaelena: 2 } },
        { t: 'Me quedo: los turistas vienen a mí', r: { pose: 1, camello: 1, lejos: 1 }, b: { galapagos: 1, santaelena: 1, tungurahua: 1 } },
        { t: 'Selva, rafting y cero señal', r: { verde: 3, lejos: 1 }, b: { napo: 2 } },
        { t: 'Feria de pueblo, fritada y desfile', r: { jama: 2, farra: 1 }, b: { cotopaxi: 1, chimborazo: 1 } },
        { t: 'Ir a vender a la feria', r: { camello: 3 }, b: { imbabura: 1, santodomingo: 1 } },
        { t: 'Ver el volcán desde la ventana, por si acaso', r: { volcan: 2, calor: -1 }, b: { tungurahua: 1, cotopaxi: 1, chimborazo: 1 } }
      ]},
      { t: '¿Cómo saludas a un desconocido?', op: [
        { t: '«¡Qué fue, mi llave!»', r: { calor: 2, pose: 1, farra: 1 }, b: { guayas: 2 } },
        { t: '«Buenos días, ¿cómo le va, cómo ha estado, y la familia?»', r: { lejos: 2, calor: -1 }, b: { loja: 1, carchi: 1 } },
        { t: '«¡Ajá, mijo!»', r: { jama: 2, calor: 2 }, b: { manabi: 2 } },
        { t: '«Siga nomás, casero, ¿qué le doy?»', r: { camello: 3 }, b: { imbabura: 1, tungurahua: 1, santodomingo: 1 } },
        { t: 'Con la mano, sin hablar mucho', r: { verde: 1, lejos: 1, farra: -1 }, b: { pastaza: 1, morona: 1 } },
        { t: '«Ay, qué lindo, ve»', r: { pose: 2, calor: -1 }, b: { azuay: 3 } }
      ]},
      { t: 'Y para terminar, ¿de qué presumes?', op: [
        { t: 'De estar más cerca del sol que nadie', r: { pose: 1, calor: -2 }, b: { chimborazo: 4 } },
        { t: 'De ser la provincia más grande, aunque nadie lo sepa', r: { verde: 2, lejos: 1, pose: -1 }, b: { pastaza: 4 } },
        { t: 'De tener una capital con dos nombres', r: { calor: 2, verde: 1, lejos: 2 }, b: { sucumbios: 4 } },
        { t: 'De que mi vecina es una tortuga de ciento cincuenta años', r: { verde: 2, lejos: 2 }, b: { galapagos: 4 } },
        { t: 'Del banano, el camarón y un poquito de oro', r: { calor: 2, camello: 2, jama: 1 }, b: { eloro: 4 } },
        { t: 'Del malecón y de que aquí sí se camella', r: { calor: 2, camello: 2, pose: 1 }, b: { guayas: 4 } },
        { t: 'Del Yasuní y de los barriles que salen de aquí', r: { calor: 2, camello: 2, verde: 1 }, b: { orellana: 4 } },
        { t: 'De las cascadas que todavía no salen en el mapa', r: { verde: 3, lejos: 1 }, b: { morona: 4 } },
      ]},
      { t: 'Si te fueras lejos, ¿qué extrañarías?', op: [
        { t: 'Los cipreses con forma de animal', r: { calor: -2, pose: 1 }, b: { carchi: 4 } },
        { t: 'Ver la Mitad del Mundo desde la ventana del bus', r: { pose: 2, lejos: -1 }, b: { pichincha: 4 } },
        { t: 'El chaulafán de Quevedo', r: { jama: 2, calor: 2 }, b: { losrios: 4 } },
        { t: 'Las casas de tres pisos que mi tío construyó desde Nueva York', r: { camello: 1, lejos: 1 }, b: { canar: 4 } },
        { t: 'El atardecer en Montañita', r: { calor: 2, farra: 2 }, b: { santaelena: 4 } },
        { t: 'Bañarme en el río con una guayusa en la mano', r: { verde: 2, farra: 1, calor: 1 }, b: { napo: 4 } },
        { t: 'El reloj gigante de la montaña', r: { lejos: 2, verde: 1 }, b: { zamora: 4 } },
        { t: 'La melcocha de Baños y el pan de Pinllo', r: { jama: 2, volcan: 1 }, b: { tungurahua: 4 } }
      ]}
    ]
  },
  tuti: {
    titulo: '¿Qué producto del Tuti eres?',
    kicker: 'Test 5 · Bonus de percha',
    bajada: 'Rendidor, de marca propia y a precio de oferta. Averigua en qué percha te pondrían.',
    meta: '7 preguntas · 1 min',
    pie: '¿Y tú qué producto del Tuti eres?',
    tipo: 'puntos', grupo: PROD, cosa: true,
    preguntas: [
      { t: '¿Cómo llegas al súper?', op: [
        { t: 'Con lista, calculadora y la plata exacta', p: { atun: 2, arroz: 1 } },
        { t: 'Sin lista y con antojo', p: { galletas: 2, mayonesa: 1 } },
        { t: 'A comprar «una cosita» y salgo con 32 rollos de papel', p: { papel: 2 } },
        { t: 'Por una promo que vi en un grupo de WhatsApp', p: { detergente: 2 } },
        { t: 'Porque en la casa se acabó el shampoo, y el lavaplatos, y el jabón', p: { shampoo: 2 } }
      ]},
      { t: 'En una fiesta, tú eres…', op: [
        { t: 'El que llega con la bebida grande que nadie pidió', p: { cola: 2 } },
        { t: 'El que todos quieren pero nadie admite', p: { salchicha: 2 } },
        { t: 'El que se hace el importado', p: { chocolate: 2 } },
        { t: 'El que aguanta hasta el final', p: { papel: 1, atun: 1 } },
        { t: 'El que sirve para todo: hielo, vasos y DJ', p: { shampoo: 2 } },
        { t: 'El que se mete en todas las conversaciones', p: { mayonesa: 2 } }
      ]},
      { t: 'Tu mayor virtud:', op: [
        { t: 'Rindo: con poquito hago mucho', p: { atun: 2 } },
        { t: 'Estoy siempre: en la cartera, en la oficina, en el carro', p: { galletas: 2 } },
        { t: 'Prometo', p: { detergente: 2 } },
        { t: 'Burbujeo', p: { cola: 2 } },
        { t: 'Tengo misterio', p: { salchicha: 2 } },
        { t: 'Soy la base de todo', p: { arroz: 2 } }
      ]},
      { t: 'Tu mayor defecto:', op: [
        { t: 'Me desbravo rápido', p: { cola: 2 } },
        { t: 'Soy de una sola hoja', p: { papel: 2 } },
        { t: 'Nadie sabe de qué estoy hecho', p: { salchicha: 1, atun: 1 } },
        { t: 'De lejos parezco otra cosa', p: { chocolate: 2 } },
        { t: 'Huelo más de lo que limpio', p: { detergente: 2 } },
        { t: 'Soy intenso', p: { mayonesa: 2 } },
        { t: 'Soy predecible', p: { arroz: 2 } }
      ]},
      { t: 'Tu plan de domingo:', op: [
        { t: 'Encebollado y sofá', p: { atun: 1, galletas: 1 } },
        { t: 'Parrillada en el patio', p: { salchicha: 2, mayonesa: 1 } },
        { t: 'Lavar todo lo que no lavé en la semana', p: { detergente: 1, shampoo: 1 } },
        { t: 'Ir al mall a ver vitrinas de cosas importadas', p: { chocolate: 2 } },
        { t: 'Hacer inventario de la bodega', p: { papel: 2 } },
        { t: 'Almuerzo familiar con montaña de arroz', p: { arroz: 2 } }
      ]},
      { t: '¿Qué dicen de ti en tu casa?', op: [
        { t: 'Que eres de confianza, aunque nadie lee tu etiqueta', p: { atun: 2 } },
        { t: 'Que te acabas en un día', p: { galletas: 2 } },
        { t: 'Que sirves para todo', p: { shampoo: 2 } },
        { t: 'Que te crees mucho', p: { chocolate: 1, cola: 1 } },
        { t: 'Que ocupas demasiado espacio', p: { papel: 2 } },
        { t: 'Que manchas todo', p: { mayonesa: 2 } }
      ]},
      { t: '¿Dónde te encuentran?', op: [
        { t: 'En el almuerzo de todos los días', p: { arroz: 3 } },
        { t: 'En la salchipapa de la esquina', p: { mayonesa: 2, salchicha: 1 } },
        { t: 'En la cartera', p: { galletas: 2 } },
        { t: 'En la bodega, al fondo', p: { papel: 2, detergente: 1 } },
        { t: 'En la mesa del domingo, en botella', p: { cola: 2 } },
        { t: 'En la ducha', p: { shampoo: 2 } },
        { t: 'En la canasta navideña', p: { chocolate: 2 } },
        { t: 'En la alacena, en fila', p: { atun: 2, arroz: 1 } }
      ]}
    ]
  }
};

/* Signos: el sol reparte puntos entre dos lámparas. El reparto es tan
   arbitrario como el de un horóscopo de verdad. */
const SIGNOS = [
  // [nombre, desde mes, desde día, puntos]
  ['Capricornio', 12, 22, { lasso: 2, nebot: 1 }], ['Acuario', 1, 20, { aud: 2, dnoboa: 1 }],
  ['Piscis', 2, 19, { mino: 2, delfin: 1 }], ['Aries', 3, 21, { vera: 2, lucio: 1 }],
  ['Tauro', 4, 20, { cholito: 2, evaristo: 1 }], ['Géminis', 5, 21, { fusilero: 2, mofle: 1 }],
  ['Cáncer', 6, 21, { bucaram: 2, evaristo: 1 }], ['Leo', 7, 23, { correa: 2, rico: 1 }],
  ['Virgo', 8, 23, { nebot: 2, lasso: 1 }], ['Libra', 9, 23, { rico: 2, mino: 1 }],
  ['Escorpio', 10, 23, { dnoboa: 2, correa: 1 }], ['Sagitario', 11, 22, { alvaro: 2, bucaram: 1 }]
];

window.LAMP = { PJ, PROD, PROV, RASGOS, ESCALA, TESTS, SIGNOS };
})();
