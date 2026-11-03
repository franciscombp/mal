# Worker de maldonado.pro

Sirve maldonado.pro desde GitHub Pages a través de Cloudflare. Es el script `maldonado-pro` de
Cloudflare; esta copia es la fuente.

- `/`, `/papel.css`, `/papel.js`, `/og.jpg` → `portafolio/` de este repo.
- `/ds/*` → `franciscombp/ds`; `/img/*` y `/favicon.svg` → este repo.
- Todo lo demás (los enlaces `../apps/…` del portafolio) → 301 a una.red.

Despliegue: Cloudflare → Workers → `maldonado-pro` (no hay CI todavía).
