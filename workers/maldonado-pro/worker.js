const GH = "https://franciscombp.github.io";
const ORIGIN = GH + "/mal";
const CASA = "https://maldonado.pro";
// maldonado.pro es solo el portafolio: su página, sus recursos, su robots y su sitemap, y el
// sistema de diseño. Todo lo demás (../apps/…, ../renuncia/…) vive en una.red.
const HOME = new Set(["/", "/index.html", "/papel.css", "/papel.js", "/og.jpg", "/robots.txt", "/sitemap.xml"]);
const redir = (to) => new Response(null, { status: 301, headers: { Location: to } });
// Un 3xx del origen NO se sigue: GitHub redirige a un dominio propio de Pages si el repo lo tiene.
const get = async (u) => {
  const r = await fetch(u, { redirect: "manual", cf: { cacheTtl: 300, cacheEverything: true } });
  if (r.status >= 300 && r.status < 400) throw new Error("el origen redirige: " + u + " -> " + r.headers.get("location"));
  return r;
};
// Las mismas cabeceras que pone el Worker de una.red. Lo versionado (mal.css?v=…, fuentes,
// imágenes) se guarda mucho; la página y lo que no lleva versión, poco, para que un cambio
// en el repo se vea en minutos.
function conCabeceras(res, p) {
  const out = new Response(res.body, res);
  out.headers.set("X-Content-Type-Options", "nosniff");
  out.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  if (/\.(woff2|jpg|png|svg|ico)$/.test(p)) out.headers.set("Cache-Control", "public, max-age=31536000, immutable");
  else if (/\.(css|js)$/.test(p)) out.headers.set("Cache-Control", "public, max-age=604800");
  else out.headers.set("Cache-Control", "public, max-age=300, must-revalidate");
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
      if (HOME.has(p)) return conCabeceras(await get(ORIGIN + "/portafolio" + (p === "/index.html" ? "/" : p) + url.search), p);
      // los enlaces viejos a una.red/portafolio/… llegan aquí con el prefijo
      if (bajo(p, "/portafolio")) return redir(CASA + (p.slice("/portafolio".length) || "/") + url.search);
      if (p === "/ds") return redir(CASA + "/ds/");
      if (p.startsWith("/ds/")) return conCabeceras(await get(GH + "/ds" + p.slice(3) + url.search), p);
      if (p.startsWith("/img/") || p === "/favicon.svg") return conCabeceras(await get(ORIGIN + p + url.search), p);
      return redir("https://una.red" + p + url.search);
    } catch (e) {
      return new Response("maldonado-pro: " + (e && e.message ? e.message : e), { status: 502 });
    }
  },
};
