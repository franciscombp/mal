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
  ["/perfil", "https://quesf-ec.github.io/Perfil"],
];
const redir = (to) => new Response(null, { status: 301, headers: { Location: to } });
// Un 3xx del origen NO se sigue: si un repo tiene dominio propio en Pages, GitHub redirige a
// una.red y la petición cae en el origen vacío del DNS (522).
const traer = async (u) => {
  const r = await fetch(u, { redirect: "manual", cf: { cacheTtl: 300, cacheEverything: true } });
  if (r.status >= 300 && r.status < 400) throw new Error("el origen redirige: " + u + " -> " + r.headers.get("location"));
  return r;
};
function conCabeceras(res, p) {
  const out = new Response(res.body, res);
  out.headers.set("X-Content-Type-Options", "nosniff");
  out.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  if (/\.(woff2|jpg|png|svg)$/.test(p)) out.headers.set("Cache-Control", "public, max-age=31536000, immutable");
  else if (/\.css$/.test(p)) out.headers.set("Cache-Control", "public, max-age=604800");
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
      for (const [prefijo, destino] of FUERA) {
        if (bajo(p, prefijo)) return redir(destino + (p.slice(prefijo.length) || "/") + url.search);
      }
      for (const [prefijo, destino] of PROPIOS) {
        if (p === prefijo) return redir(url.origin + p + "/" + url.search);
        if (bajo(p, prefijo)) {
          // Si el repo aún no publica (Pages apagado), cae a la copia de este repo, si queda.
          let res = null;
          try { res = await traer(destino + p.slice(prefijo.length) + url.search); } catch (e) {}
          if (!res || !res.ok) res = await traer(ORIGIN + p + url.search);
          return conCabeceras(res, p);
        }
      }
      return conCabeceras(await traer(ORIGIN + p + url.search), p);
    } catch (e) {
      return new Response("una-red: " + (e && e.message ? e.message : e), { status: 502 });
    }
  },
};
