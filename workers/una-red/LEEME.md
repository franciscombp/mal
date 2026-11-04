# Worker de una.red

Sirve una.red y www.una.red desde GitHub Pages a través de Cloudflare (antes era el hosting de
Namecheap con un `.htaccess`). Es el script `una-red` de Cloudflare; esta copia es la fuente.

- `www.una.red` → `una.red` (301).
- `/ds/*` → `franciscombp/ds`, servido aquí (no redirigido): los sitios lo consumen por `una.red/ds/`.
- `/portafolio/*` → `maldonado.pro`, `/guagua/*` → `finados.una.red` (301).
- `/coches/*`, `/apps/boliche/*` y `/perfil/*` → `quesf-ec.github.io/coches/`, `/boliche/` y `/perfil/` (301): los juegos de Quesf funcionan solos allí y comparten el perfil.
- Todo lo demás → este repo (`franciscombp.github.io/mal/`).

El repo `mal` NO debe tener dominio propio en Settings → Pages: GitHub redirigiría a una.red y
el Worker respondería 502 («el origen redirige»).

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

Despliegue: Cloudflare → Workers → `una-red` (no hay CI todavía).
