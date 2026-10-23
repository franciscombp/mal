# Guagua de pan

Una guagua de pan en 3D, en tres actos, para regalar por el Día de Difuntos:

1. **Amasar.** Bolitas (arrastrar hacia el lado las hace anchas; hacia arriba, altas) y chorizos
   (se estiran con el dedo). Lo que cae encima de otra pieza se pega. Hay moldes: guagua,
   guagua tradicional (más larga, con colita cónica), guaguau (un perrito echado, que se
   decora visto desde arriba), caballito, chanchito, gallinita y la lata vacía.
2. **Hornear.** La masa se infla y se dora en seis segundos; hay que sacarla en su punto. Antes
   queda blanca, después se quema, y la panadera lo comenta.
3. **Decorar.** Manga de crema con pincel y tres boquillas, rosetas, grageas, pasas, carita y
   mordiscos. La cara no viene hecha: es el mismo pan, y Carita le pinta con glaseado fino
   ojos, nariz, sonrisa y chapitas, como en las guaguas de panadería.
4. **Regalar o dedicar.** Un regalo puede venir con un vale por una guagua de verdad, una
   invitación a colada morada o la tarea de pasarla; quien la recibe responde con un toque por
   WhatsApp. Una guagua dedicada a quien ya no está sale con su velita, y la tarjeta invita a
   que otros dediquen la suya. En la receta: `t: 'm'` si es dedicada y `l` el vale (1, 2 o 3).

La imagen para compartir sale en dos formatos, historia (9:16) y publicación (1:1). Es un
bodegón en 3D: la guagua en su plato junto a una taza de colada morada (o una velita, si es
dedicada). La tarjeta, el archivo y el enlace se preparan apenas cambia algo, porque los
navegadores solo dejan abrir la hoja de compartir o WhatsApp si el toque no espera a la red.

Vive en `franciscombp.github.io/mal/guagua/` y la carpeta se basta sola: Three.js va en
`vendor/` (r170, licencia MIT en `vendor/LICENSE-three.txt`) y el sistema de diseño se pide
con ruta relativa desde `../ds/`.

## Cómo se toca

El panel de herramientas se pliega con el asa de arriba (o deslizándola hacia abajo) para
dejarle más pantalla a la guagua; queda la cabecera con un resumen de lo elegido. Regalar va
en tres pasos que caben sin desplazarse: para quién, unas palabras y la imagen para compartir.
En la compu, la rueda acerca y, con Shift (o el desplazamiento horizontal del trackpad), gira.


Con un dedo se amasa y se decora; con dos dedos se gira y se acerca a la vez. El primer dedo
espera un instante antes de pintar: si en ese rato llega el segundo, era un gesto y no se mancha
nada. En la computadora, el clic derecho gira y la rueda acerca. La cámara encuadra la figura en
el hueco que dejan la barra de arriba y el dock de herramientas (abajo; a la derecha si el
teléfono está de lado). Hay botón de pantalla completa y un manifiesto para instalarla como app.

## Incrustarla en otro sitio

Dos parámetros en la URL:

| Parámetro | Qué hace |
|---|---|
| `?marca=mercio` | viste la página con el tema de EL MERCIO. (también `mal` y `apps`; sin nada, el de juegos) |
| `?embed` | quita la cabecera, el pie y la nota del final, para meterla en un iframe |

Para EL MERCIO., en un bloque HTML de WordPress:

```html
<iframe src="https://franciscombp.github.io/mal/guagua/?embed&marca=mercio"
  title="Decora tu guagua de pan" loading="lazy"
  style="width:100%;height:min(88vh, 820px);border:0;border-radius:16px"
  allow="web-share; clipboard-write; fullscreen"></iframe>
```

El juego ocupa todo el iframe (es una pantalla de juego, no una página), así que conviene darle
un alto fijo. `allow="web-share; clipboard-write; fullscreen"` hace falta para que, desde dentro del
iframe, funcionen el botón de compartir del teléfono, el de copiar enlace y el de pantalla completa. Los enlaces que se regalan llevan
la piel (`?marca=mercio`) pero no el `embed`: quien los recibe abre la guagua a pantalla entera.

## Cómo viaja una guagua

No hay servidor. La guagua son tres cosas: la masa (`a`, una lista de bolitas y chorizos), la
cocción (`k`) y la decoración (`o`, trazos de manga, rosetas, grageas, pasas, caritas y
mordiscos), todo en centésimas de unidad. Los enlaces de la versión anterior (`v: 2`) se
traducen solos al formato de ahora (`v: 3`). La receta se comprime con `deflate-raw` y va en el enlace, después
del `#`, así que tampoco llega a GitHub. La vitrina vive en el `localStorage` de cada navegador.

## La nube (Firebase), opcional

Con una cuenta (correo y contraseña, o Google), la vitrina se guarda en Firestore y sigue a la
persona de un teléfono a otro, y los regalos llevan un enlace corto (`#g=…`) en vez de la receta
entera (`#r=…`). Sin cuenta, o mientras `nube-config.js` esté en `null`, todo funciona como antes.

| Archivo | Qué es |
|---|---|
| `nube.js` | cuentas, regalos y vitrina; carga el SDK solo si hay configuración |
| `nube-config.js` | el `firebaseConfig` de la app web (no es secreto) |
| `vendor/firebase/` | Firebase JS SDK 12.19.0: app, auth y Firestore Lite (Apache-2.0) |
| `firebase/` | proyecto `guaguas-de-pan`: `firebase.json`, `.firebaserc`, reglas e índices |

Datos:

- `guaguas/{id}`: el regalo (`dueno`, `receta`, `creada`, `v`). Se abre por su ID sin cuenta,
  porque quien lo recibe puede no tenerla; nadie puede listar la colección.
- `usuarios/{uid}/vitrina/{id}`: la vitrina (`tipo`, `receta`, `guagua`, `fecha`). Solo su dueño.

Las reglas (`firebase/firestore.rules`) son un prototipo para revisar antes de difundir el juego.
Para probar todo en local, con los emuladores:

```bash
cd guagua/firebase
npx -y firebase-tools@latest emulators:start --only auth,firestore --project demo-guagua
# y abrir http://localhost:<puerto>/guagua/?emuladores
```

Para ponerla en marcha en el proyecto real:

1. Registrar una app web en `guaguas-de-pan` y copiar su `firebaseConfig` en `nube-config.js`.
2. Crear la base de datos de Firestore (edición Standard).
3. Activar en Authentication los proveedores «Correo/contraseña» y «Google», y agregar en
   *Dominios autorizados*: `franciscombp.github.io`, `elmercio.com` y `una.red`.
4. Publicar las reglas: `cd guagua/firebase && npx -y firebase-tools@latest deploy --only firestore`.

## Desde un chat de IA

**Sin instalar nada:** basta con escribir la dirección con los datos después del `?`. El juego
amasa la guagua en el navegador de quien la abre y la muestra como regalo:

```
https://franciscombp.github.io/mal/guagua/?molde=dormilon&nombre=Lobita&para=Lobita&de=Francisco&dedicada=1&decoracion=carita&mensaje=Duerme%20tranquila
```

Parámetros: `molde` (guagua, tradicional, guaguau, dormilon, caballito, chanchito, gallinita),
`nombre`, `para`, `de`, `mensaje`, `dedicada=1`, `vale` (1 guagua de verdad, 2 colada morada,
3 pásala), `coccion` (blanquita, punto, tostada, quemada), `decoracion` (panaderia, carita,
ninguna), `colores` (cremas por nombre, separadas por comas) y `semilla`. La dirección se
convierte sola en un enlace `#r=` que ya se puede compartir.

**Con MCP:** 
`masa.js` es la receta sin pantalla (moldes, geometría, enlace y «Sorpréndeme»), y la comparten
el juego y el servidor MCP de `mcp/`: con él, una IA amasa una guagua con lo que sabe de la
persona y devuelve el enlace que la abre en 3D. Ver `mcp/README.md`.
