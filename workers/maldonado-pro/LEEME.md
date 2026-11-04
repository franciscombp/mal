# Worker de maldonado.pro

Sirve maldonado.pro desde GitHub Pages a través de Cloudflare. Es el script `maldonado-pro` de
Cloudflare; esta copia es la fuente.

- `www.maldonado.pro` → `maldonado.pro` (301). Los dos hostnames son dominios personalizados
  del Worker (Workers → maldonado-pro → Settings → Domains); Cloudflare crea el DNS solo.
- `/`, `/papel.css`, `/papel.js`, `/og.jpg`, `/robots.txt`, `/sitemap.xml` → `portafolio/` de este repo.
- `/ds/*` → `franciscombp/ds`; `/img/*` y `/favicon.svg` → este repo.
- `/portafolio/*` (los enlaces viejos de una.red) → la misma ruta sin el prefijo (301).
- Todo lo demás → 301 a una.red.

Pone las mismas cabeceras que el Worker de una.red: `nosniff`, `Referrer-Policy`, y caché de un
año para fuentes e imágenes, una semana para CSS y JS (el portafolio los enlaza con `?v=`) y
cinco minutos para la página.

Despliegue: Cloudflare → Workers → `maldonado-pro` (no hay CI todavía).
