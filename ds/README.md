# mal-ds — el sistema de diseño de MAL

**Un sistema, cuatro temas.** Un solo CSS, un solo juego de componentes, y cuatro pieles
que se ponen con un atributo en la raíz. La usa [una.red](https://una.red), maldonado.pro y el tema
de WordPress de EL MERCIO.; cualquier proyecto puede clonarla o enlazarla.

```html
<link rel="stylesheet" href="https://una.red/ds/mal/mal.css">
```

Las fuentes van dentro del paquete (`fonts/`) y el CSS las pide con rutas relativas, así
que no hay que enlazar Google Fonts ni copiar nada más.

## Los cuatro temas

Se eligen con `data-marca` en el `<html>`. **No conviven**: cada documento tiene un tema, y
viste la página entera, menús incluidos. El de la marca es el que sale sin poner nada.

| Tema | Atributo | Para qué | Carácter |
|---|---|---|---|
| **MAL** | — (por defecto) | una.red, maldonado.pro | crema cálida, filete de 1 px y sombra blanda |
| **EL MERCIO.** | `data-marca="mercio"` | el periódico | página blanca, serif, radio 0 y sin sombras |
| **APPS** | `data-marca="apps"` | Quanto, Mi Huerto, Jacky, Test CDS | app nativa: controles de 52 px, responde al pulsar |
| **Juegos** | `data-marca="juegos"` | los siete juegos del hub | volumétrico: sombra dura, borde de 2 px y relleno en degradado |

```html
<html lang="es" data-marca="mercio">   <!-- el periódico -->
<html lang="es" data-marca="apps">     <!-- producto -->
<html lang="es">                       <!-- la marca, por defecto -->
```

Claro y oscuro son **otro eje**, ortogonal al tema: `data-tema="claro|oscuro"` en la raíz, o
nada y manda el sistema operativo.

## Los tokens, en tres capas

| Capa | Guarda | ¿Cambia por tema? |
|---|---|---|
| **1 · Referencia** `--ref-*` | paletas, familias y expresión | **sí, es lo único que cambia** |
| **2 · Sistema** `--mal-*` | roles y materia derivada | no |
| **3 · Componentes** | hablan solo roles | no |

La **capa de expresión** es lo que hace que dos temas no se parezcan aunque compartan
componente: `--ref-radio`, `--ref-borde`, `--ref-densidad`, `--ref-tap`, `--ref-elev-1/2`,
`--ref-relleno`, `--ref-salto`, `--ref-presion`, `--ref-grano`.

El color de marca va además **en RGB** (`--ref-marca-rgb`, rol `--mal-primary-rgb`), que es
lo que hace falta para graduarlo: un halo, una selección o un tinte al 12 % piden `rgba()`, y
sin el triplete hay que volver a escribir el hexadecimal — justo lo que los tokens vienen a
evitar. Y hay tres **pasteles de fondo de caja** (`--mal-pastel-lila|verde|azul`) para
distinguir dos cosas sin gastar el rojo, más `--mal-primary-en-tinta`: el acento aclarado
para cuando el fondo es tinta, porque el rojo sobre negro no llega ni a 3 : 1.

Para hacer un tema nuevo se redefine la capa 1 y ya:

```css
:root[data-marca="acolita"]{ --ref-marca:#0B7A6A; --ref-radio:1; --ref-tap:52px }
```

Eso es exactamente lo que hace el tema de [Acolita](https://acolita.org/): declara su
referencia y hereda todo lo demás.

## Teñir una app

Sobre el tema `apps`, el color de cada producto entra por `data-app`:

```html
<html lang="es" data-marca="apps" data-app="agro">
```

Vienen `quanto`, `agro`, `jacky` y `cds`.

## Iconos

**Nada de emojis en la interfaz.** Los iconos salen del sprite `mal/iconos.svg` (81 símbolos,
trazo de 24 px). `mal.js` lo inyecta solo la primera vez que ve un `.icono`:

```html
<svg class="icono" aria-hidden="true"><use href="#i-casa"/></svg>
```

Tamaños: `.icono--s`, `.icono--l`, `.icono--xl`.

## Comportamientos

`mal/mal.js` es **opcional y automático**: sin él todo se ve, solo deja de moverse. Trae
pestañas, menús, modales, toast, copiar al portapapeles, pasos, progreso de lectura, índice
que sigue al scroll y unas cuantas piezas de escaparate.

```js
window.malDS = { init, aviso, abrir, iconos, quieto }
```

## Para juegos

La sección `juego` trae las piezas del HUD (`.marcador`, `.medidor`, `.vidas`, `.chip`,
`.boton-juego`), **el contenedor que las reparte** (`.hud-juego`, con sus zonas seguras y
sus dos filas) y **la pantalla de premio** (`.premio`), que es lo que sale cuando un juego
desbloquea algo: pantalla entera, abanico de rayos, la pieza en el centro y un toque para
seguir.

El medidor viene en dos: `.medidor` reparte **tramos** —vidas, munición, turnos: lo que
se cuenta— y `.medidor--continuo` es una **barra que se llena** —aguante, carga, lo que
falta para llegar—. Misma clase base, mismo sitio en el HUD; el ancho del relleno lo
escribe quien lo pinta, en línea, y el color sale de `--mal-relleno-medidor`.

```html
<div class="medidor"><i class="lleno"></i><i class="lleno"></i><i></i></div>
<div class="medidor medidor--continuo medidor--fino" style="--mal-relleno-medidor:var(--mal-verde)">
  <i style="width:62%"></i>
</div>
```

`.hud-juego` se llama así y no `.hud` porque `.hud` es la cabecera del sitio. No es un
capricho: el `background` de aquella, aplicado a un contenedor a `inset: 0`, tapa el juego
entero con una sábana.

## Dentro de otro framework

Si el sistema va a vivir dentro de algo que ya maqueta —WordPress, por ejemplo— hay que
apagar su reset para no pelearse con el del anfitrión:

```html
<html lang="es" data-marca="mercio" data-ds="invitado">
```

Con `data-ds="invitado"` el sistema no aplica su `@layer reset` y deja el ritmo vertical
al anfitrión. Es lo que hace el tema de WordPress de EL MERCIO.

## Usarlo dentro de tu repo

```bash
git clone https://github.com/franciscombp/mal-ds ds
```

O como submódulo, si quieres que se actualice solo:

```bash
git submodule add https://github.com/franciscombp/mal-ds ds
git submodule update --remote ds
```

Para una hoja antigua con otros tokens está `mal/compat.css`, que traduce nombres viejos a
los roles actuales sin tocar el marcado.

## Consumo programático

`componentes.json` lleva todos los componentes con su HTML, agrupados por sección — para
generar plantillas, alimentar un editor o comprobar que un proyecto no se ha desviado.
`version.json` lleva la versión y el hash de cada hoja; `version.js` avisa por consola a
una copia que se haya quedado atrás.

## Reglas de la casa

- **Un tema por documento.** No conviven: no hay ámbitos `.em` ni `.app` que anidar.
- **Lo que un tema quiera cambiar de un componente se cambia por token**, no por selector.
  Un override con más especificidad le gana a los modificadores y rompe el sistema.
- **Syne solo para display.** Subtítulos, cuerpo e interfaz en Inter; JetBrains Mono para
  rótulos y cifras. `.display` es una clase, no el `h1`.
- **Cada tema define TODOS los escalones tipográficos.** Heredar del tema base fue el
  origen de un `h4` más grande que su `h3`.
- **Espacios alrededor de `+` y `-` dentro de `clamp()` y `calc()`.** Sin ellos el navegador
  descarta la declaración entera, en silencio.
- **Nunca un color literal**: todo sale de las variables, que traen su pareja en modo oscuro.
- **Nada de emojis en la interfaz**: para eso está el sprite.
- **La fuente de verdad de EL MERCIO. es el `theme.json`** del tema en producción. Si un
  token se mueve allí, cópialo aquí; nunca al revés.

Hecho en Quito.
