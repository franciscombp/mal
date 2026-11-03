# Worker de una.red

Sirve una.red y www.una.red desde GitHub Pages a través de Cloudflare (antes era el hosting de
Namecheap con un `.htaccess`). Es el script `una-red` de Cloudflare; esta copia es la fuente.

- `www.una.red` → `una.red` (301).
- `/ds/*`, `/coches/*`, `/perfil/*`, `/apps/boliche/*` → sus repos (`franciscombp/ds`,
  `quesf-ec/coches`, `quesf-ec/perfil`, `quesf-ec/boliche`), servidos aquí y no redirigidos:
  así comparten el origen (el perfil vive en `localStorage`) y los enlaces relativos.
- `/portafolio/*` → `maldonado.pro`, `/guagua/*` → `finados.una.red` (301).
- Todo lo demás → este repo (`franciscombp.github.io/mal/`).

El repo `mal` NO debe tener dominio propio en Settings → Pages: GitHub redirigiría a una.red y
el Worker respondería 502 («el origen redirige»).

Despliegue: Cloudflare → Workers → `una-red` (no hay CI todavía).
