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

## Dentro de otro framework

Si el sistema va a vivir dentro de algo que ya maqueta —WordPress, por ejemplo— hay que
apagar su reset para no pelearse con el del anfitrión:

```html
<html lang="es" data-marca="mercio" data-ds="invitado">
```

Con `data-ds="invitado"` el sistema no aplica su `@layer reset` y deja el ritmo vertical
al anfitrión. Es lo que hace el tema de WordPress de EL MERCIO.

## De dónde sale

El paquete vive en **[franciscombp/mal](https://github.com/franciscombp/mal)**, que es el
repositorio del hub entero ([una.red](https://una.red)). El sistema es su carpeta `ds/`:

```
franciscombp/mal
├── ds/            ← esto es el paquete
│   ├── mal/       mal.css · mal.js · iconos.svg · compat.css · index.html (generado)
│   ├── herramientas/  genera.mjs · plantilla.html
│   ├── componentes.json   ← la fuente de verdad del catálogo
│   └── fonts/
├── apps/  img/  renuncia/  index.html   ← el resto del hub
```

**una.red es producción**: lo que sirve el dominio y lo que hay en `main` son lo mismo.

## Usarlo dentro de tu repo

Por CDN, sin clonar nada y con la versión clavada:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/franciscombp/mal@main/ds/mal/mal.css">
```

Como submódulo, si quieres que se actualice solo — ojo con la ruta, el paquete
está **dentro** del repo:

```bash
git submodule add https://github.com/franciscombp/mal vendor/mal
```

```html
<link rel="stylesheet" href="/vendor/mal/ds/mal/mal.css">
```

O copiando solo la carpeta que necesitas:

```bash
git clone --depth 1 https://github.com/franciscombp/mal /tmp/mal && cp -R /tmp/mal/ds ds
```

⚠️ **Si lo sirves tú, copia también `ds/.htaccess`.** Es quien manda
`Access-Control-Allow-Origin: *`, y `@font-face` aplica CORS **siempre**: sin esa cabecera
la hoja carga pero las fuentes y el sprite de iconos fallan **en silencio**, y el sitio cae
a las tipografías del sistema sin avisar de nada.

Para una hoja antigua con otros tokens está `mal/compat.css`, que traduce nombres viejos a
los roles actuales sin tocar el marcado.

## Consumo programático

`componentes.json` lleva los 85 componentes con su HTML, agrupados en 30 secciones — para
generar plantillas, alimentar un editor o comprobar que un proyecto no se ha desviado.
`version.json` lleva la versión y el hash de cada hoja; `version.js` avisa por consola a
una copia que se haya quedado atrás.

Cada componente trae:

| Campo | Qué es |
|---|---|
| `id` · `seccion` · `grupo` | dónde vive en el catálogo |
| `etiqueta` · `nombre` | el rótulo de clase y el título legible |
| `html` | **el marcado, y la única fuente de verdad** |
| `desc` | una línea de contexto, si la necesita |
| `demo` | escaparate solo para el storybook, cuando enseñar es distinto de copiar |
| `codigo` | `false` si la pieza no lleva bloque de código |
| `lienzo` · `rejilla` · `nota` | colocación en la página |

## El storybook se genera

`mal/index.html` **no se edita a mano**: sale de `componentes.json` con la plantilla de
`herramientas/plantilla.html`, que es lo único escrito a mano (la cabecera, el hero y el
pie). El 98% de la página es catálogo.

```bash
npm run genera      # reescribe mal/index.html desde el JSON
npm run verifica    # falla si el fichero no está al día — para CI
```

El HTML de cada componente se escribe **una vez** y se usa dos: crudo para la muestra viva
y escapado para el bloque de código. Por eso **lo que se copia es exactamente lo que se
ve**; antes vivía tres veces —demo, `<pre>` y JSON— y ya se había desviado en siete piezas
y una sección entera.

`demo` es la excepción a propósito, y son tres: el muestrario de los 81 iconos, la tabla de
los cuatro temas y los avisos de `retro`, donde el escaparate enseña más de lo que se copia.

Al generar también se comprueba que cada componente apunte a una sección que existe, que no
haya identificadores repetidos y que la etiqueta cuadre con el `id`. Nada de esto corre al
servir: `main` sigue siendo lo que sirve una.red, sin build.

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
- **`mal/index.html` es generado.** Un componente se toca en `componentes.json` y se corre
  `npm run genera`. Editar el HTML a mano lo deja desviado hasta la siguiente generación.
- **La fuente de verdad de EL MERCIO. es el `theme.json`** del tema en producción. Si un
  token se mueve allí, cópialo aquí; nunca al revés.

Hecho en Quito.
