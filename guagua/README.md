# Guagua de pan

Una guagua de pan en 3D, en tres actos, para regalar por el Día de Difuntos:

1. **Amasar.** Bolitas (arrastrar hacia el lado las hace anchas; hacia arriba, altas) y chorizos
   (se estiran con el dedo). Lo que cae encima de otra pieza se pega. Hay moldes: guagua,
   caballito, chanchito, gallinita y la lata vacía.
2. **Hornear.** La masa se infla y se dora en seis segundos; hay que sacarla en su punto. Antes
   queda blanca, después se quema, y la panadera lo comenta.
3. **Decorar.** Manga de crema con pincel y tres boquillas, rosetas, grageas, pasas, carita de
   yeso en blanco y mordiscos. La cara no viene hecha: se dibuja.

Vive en `franciscombp.github.io/mal/guagua/` y la carpeta se basta sola: Three.js va en
`vendor/` (r170, licencia MIT en `vendor/LICENSE-three.txt`) y el sistema de diseño se pide
con ruta relativa desde `../ds/`.

## Cómo se toca

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
