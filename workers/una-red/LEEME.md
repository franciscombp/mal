# Worker de una.red

Sirve una.red y www.una.red desde GitHub Pages a través de Cloudflare (antes era el hosting de
Namecheap con un `.htaccess`). Es el script `una-red` de Cloudflare; esta copia es la fuente.

- `www.una.red` → `una.red` (301).
- `/ds/*` → `franciscombp/ds`, servido aquí (no redirigido): los sitios lo consumen por `una.red/ds/`.
- `/portafolio/*` → `maldonado.pro`, `/guagua/*` → `finados.una.red` (301).
- `/coches/*`, `/apps/boliche/*` y `/perfil/*` → `quesf-ec.github.io/coches/`, `/boliche/` y `/Perfil/` (301): los juegos de Quesf funcionan solos allí y comparten el perfil.
- Todo lo demás → este repo (`franciscombp.github.io/mal/`).

El repo `mal` NO debe tener dominio propio en Settings → Pages: GitHub redirigiría a una.red y
el Worker respondería 502 («el origen redirige»).

Despliegue: Cloudflare → Workers → `una-red` (no hay CI todavía).
