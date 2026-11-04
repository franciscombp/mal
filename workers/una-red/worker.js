const ORIGIN = "https://franciscombp.github.io/mal";
// Repos que se sirven aquí (no se redirigen): otros sitios consumen el sistema por una.red/ds/.
const PROPIOS = [
  ["/ds", "https://franciscombp.github.io/ds"],
];
// Lo que tiene su propio dominio: 301, porque son URLs que estuvieron en el sitemap.
const FUERA = [
  ["/portafolio", "https://maldonado.pro"],
  ["/guagua", "https://finados.una.red"],
  // Los juegos de Quesf viven en su organización: funcionan solos en quesf-ec.github.io,
  // donde comparten el perfil (mismo origen).
  ["/coches", "https://quesf-ec.github.io/coches"],
  ["/apps/boliche", "https://quesf-ec.github.io/boliche"],
  ["/perfil", "https://quesf-ec.github.io/perfil"],
];
const redir = (to) => new Response(null, { status: 301, headers: { Location: to } });

// Lo que no cambia de URL cuando cambia de contenido: imágenes, fuentes y lo que lleva ?v=.
const FIJO = /\.(woff2|jpe?g|png|svg|webp|ico)$/;
const fijo = (p, q) => FIJO.test(p) || /[?&]v=/.test(q);

// Un 3xx del origen NO se sigue: si un repo tiene dominio propio en Pages, GitHub redirige a
// una.red y la petición cae en el origen vacío del DNS (522).
// En el borde (con la caché escalonada de la zona) lo fijo se guarda un día y lo demás cinco
// minutos; un 404 apenas un minuto y un error del origen nada.
const traer = async (u, p, q) => {
  const ttl = fijo(p, q) ? 86400 : 300;
  const r = await fetch(u, { redirect: "manual", cf: { cacheEverything: true, cacheTtlByStatus: { "200-299": ttl, "404": 60, "500-599": 0 } } });
  if (r.status >= 300 && r.status < 400) {
    // La única redirección que se acepta es la de GitHub Pages a la carpeta con barra final
    // (/renuncia → /renuncia/): se repite aquí, en una.red, en vez de seguirla.
    const destino = new URL(r.headers.get("location") || "", u);
    if (destino.pathname === new URL(u).pathname + "/") return redir(p + "/" + q);
    throw new Error("el origen redirige: " + u + " -> " + destino.href);
  }
  return r;
};

// Lo fijo, un año en el navegador. CSS y JS sin versión, un día. Las páginas, cinco minutos, y
// después se sirve la copia guardada mientras se pide la nueva: rápido y nunca muy viejo.
function conCabeceras(res, p, q) {
  const out = new Response(res.body, res);
  out.headers.set("X-Content-Type-Options", "nosniff");
  out.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  if (fijo(p, q)) out.headers.set("Cache-Control", "public, max-age=31536000, immutable");
  else if (/\.(css|js|json)$/.test(p)) out.headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
  else out.headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=86400");
  return out;
}

// Early Hints: cada página anuncia en cabeceras Link sus hojas de estilo y las fuentes que
// precarga, y Cloudflare las manda en un 103 antes que el HTML. Salen del propio HTML.
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
      if (url.hostname === "www.una.red") return redir("https://una.red" + url.pathname + url.search);
      if (req.method !== "GET" && req.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
      const p = url.pathname;
      const q = url.search;
      for (const [prefijo, destino] of FUERA) {
        if (bajo(p, prefijo)) return redir(destino + (p.slice(prefijo.length) || "/") + q);
      }
      for (const [prefijo, destino] of PROPIOS) {
        if (p === prefijo) return redir(url.origin + p + "/" + q);
        if (bajo(p, prefijo)) {
          // Si el repo aún no publica (Pages apagado), cae a la copia de este repo, si queda.
          let res = null;
          try { res = await traer(destino + p.slice(prefijo.length) + q, p, q); } catch (e) {}
          if (res && res.status === 301) return res;
          if (!res || !res.ok) res = await traer(ORIGIN + p + q, p, q);
          return conCabeceras(await conPistas(res, url.href), p, q);
        }
      }
      return conCabeceras(await conPistas(await traer(ORIGIN + p + q, p, q), url.href), p, q);
    } catch (e) {
      return new Response("una-red: " + (e && e.message ? e.message : e), { status: 502 });
    }
  },
};
