# Worker de maldonado.pro

Sirve maldonado.pro desde GitHub Pages a través de Cloudflare. Es el script `maldonado-pro` de
Cloudflare; esta copia es la fuente.

- `www.maldonado.pro` → `maldonado.pro` (301). Los dos hostnames son dominios personalizados
  del Worker (Workers → maldonado-pro → Settings → Domains); Cloudflare crea el DNS solo.
- `/`, `/papel.css`, `/papel.js`, `/og.jpg`, `/robots.txt`, `/sitemap.xml` → `portafolio/` de este repo.
- `/ds/*` → `franciscombp/ds`; `/img/*` y `/favicon.svg` → este repo.
- `/portafolio/*` (los enlaces viejos de una.red) → la misma ruta sin el prefijo (301).
- Todo lo demás → 301 a una.red.

Pone las mismas cabeceras que el Worker de una.red: `nosniff` y `Referrer-Policy`.

## Caché y Early Hints

Los dos Workers (este y el de la otra zona) comparten las mismas reglas:

| Qué | En el borde | En el navegador |
|---|---|---|
| Imágenes, fuentes y todo lo que lleva `?v=` | un día | un año, `immutable` |
| CSS y JS sin versión | cinco minutos | un día, y otra semana sirviendo la copia mientras se pide la nueva |
| Páginas, robots, sitemap | cinco minutos | cinco minutos, y un día sirviendo la copia mientras se pide la nueva |

Un 404 se guarda un minuto en el borde y un error del origen, nada. La zona tiene activada la
caché escalonada, así que un recurso pedido en un centro de datos sirve para los demás.

Cada página HTML sale con una cabecera `Link` que el Worker saca de su propio `<head>`: las
hojas de estilo y las fuentes que precarga. Con Early Hints activado en la zona, Cloudflare las
manda en un `103` antes que la página. Cambiar la versión de `mal.css` en el HTML basta: el
Worker no se toca.

Al cambiar una imagen o una fuente sin cambiar su nombre, hay que purgar la caché de la zona
(Caching → Configuration → Purge Everything), o renombrar el archivo.

Despliegue: Cloudflare → Workers → `maldonado-pro` (no hay CI todavía).
