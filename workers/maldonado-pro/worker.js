const GH = "https://franciscombp.github.io";
const ORIGIN = GH + "/mal";
const CASA = "https://maldonado.pro";
// maldonado.pro es solo el portafolio: su página, sus recursos, su robots y su sitemap, y el
// sistema de diseño. Todo lo demás (../apps/…, ../renuncia/…) vive en una.red.
const HOME = new Set(["/", "/index.html", "/espacio.html", "/espacio.css", "/espacio.js", "/3d.html", "/3d.css", "/3d.js", "/papel.html", "/papel.css", "/papel.js", "/og.jpg", "/robots.txt", "/sitemap.xml"]);
const redir = (to) => new Response(null, { status: 301, headers: { Location: to } });

// Lo que no cambia de URL cuando cambia de contenido: imágenes, fuentes y lo que lleva ?v=.
const FIJO = /\.(woff2|jpe?g|png|svg|webp|ico)$/;
const fijo = (p, q) => FIJO.test(p) || /[?&]v=/.test(q);

// Un 3xx del origen NO se sigue: GitHub redirige a un dominio propio de Pages si el repo lo tiene.
// En el borde (con la caché escalonada de la zona) lo fijo se guarda un día y la página cinco
// minutos; un 404 apenas un minuto y un error del origen nada.
const get = async (u, p, q) => {
  const ttl = fijo(p, q) ? 86400 : 300;
  const r = await fetch(u, { redirect: "manual", cf: { cacheEverything: true, cacheTtlByStatus: { "200-299": ttl, "404": 60, "500-599": 0 } } });
  if (r.status >= 300 && r.status < 400) throw new Error("el origen redirige: " + u + " -> " + r.headers.get("location"));
  return r;
};

// Las mismas cabeceras que pone el Worker de una.red. Lo fijo se guarda un año en el navegador;
// la página, cinco minutos, y después se sirve la copia guardada mientras se pide la nueva.
function conCabeceras(res, p, q) {
  const out = new Response(res.body, res);
  out.headers.set("X-Content-Type-Options", "nosniff");
  out.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  if (fijo(p, q)) out.headers.set("Cache-Control", "public, max-age=31536000, immutable");
  else if (/\.(css|js)$/.test(p)) out.headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
  else out.headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=86400");
  return out;
}

// Early Hints: la página anuncia en cabeceras Link sus hojas de estilo y las fuentes que
// precarga, y Cloudflare las manda en un 103 antes que el HTML. Salen del propio HTML, así que
// una versión nueva de mal.css no obliga a tocar el Worker.
async function conPistas(res, base) {
  const tipo = res.headers.get("content-type") || "";
  if (res.status !== 200 || !tipo.includes("text/html")) return res;
  const html = await res.text();
  const pistas = [];
  for (const [etiqueta] of html.slice(0, html.indexOf("</head>") + 1 || undefined).matchAll(/<link\b[^>]*>/g)) {
    const attr = (n) => (new RegExp(`\\b${n}="([^"]*)"`).exec(etiqueta) || [])[1];
    const href = attr("href");
    if (!href) continue;
    const u = new URL(href, base);
    const ruta = u.origin === new URL(base).origin ? u.pathname + u.search : u.href;
    if (attr("rel") === "stylesheet") pistas.push(`<${ruta}>; rel=preload; as=style`);
    else if (attr("rel") === "preload" && attr("as")) {
      pistas.push(`<${ruta}>; rel=preload; as=${attr("as")}` + (attr("type") ? `; type="${attr("type")}"` : "") + (/\bcrossorigin\b/.test(etiqueta) ? "; crossorigin" : ""));
    }
  }
  const out = new Response(html, res);
  out.headers.delete("content-length");
  if (pistas.length) out.headers.set("Link", pistas.join(", "));
  return out;
}

const bajo = (p, prefijo) => p === prefijo || p.startsWith(prefijo + "/");
export default {
  async fetch(req) {
    try {
      const url = new URL(req.url);
      if (url.hostname !== "maldonado.pro") return redir(CASA + url.pathname + url.search);
      if (req.method !== "GET" && req.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
      const p = url.pathname;
      const q = url.search;
      // la portada 3D trae su propio Three.js en vendor/
      if (HOME.has(p) || p.startsWith("/vendor/")) {
        const res = await get(ORIGIN + "/portafolio" + (p === "/index.html" ? "/" : p) + q, p, q);
        return conCabeceras(await conPistas(res, url.href), p, q);
      }
      // la versión 3D se llamó cueva.html un par de días
      if (p === "/cueva.html") return redir(CASA + "/3d.html" + q);
      // los enlaces viejos a una.red/portafolio/… llegan aquí con el prefijo
      if (bajo(p, "/portafolio")) return redir(CASA + (p.slice("/portafolio".length) || "/") + q);
      if (p === "/ds") return redir(CASA + "/ds/");
      if (p.startsWith("/ds/")) return conCabeceras(await conPistas(await get(GH + "/ds" + p.slice(3) + q, p, q), url.href), p, q);
      if (p.startsWith("/img/") || p === "/favicon.svg") return conCabeceras(await get(ORIGIN + p + q, p, q), p, q);
      return redir("https://una.red" + p + q);
    } catch (e) {
      return new Response("maldonado-pro: " + (e && e.message ? e.message : e), { status: 502 });
    }
  },
};
