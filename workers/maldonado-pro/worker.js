const GH = "https://franciscombp.github.io";
const ORIGIN = GH + "/mal";
// maldonado.pro es solo el portafolio: su página, sus recursos y el sistema de diseño.
// Todo lo demás (los enlaces ../apps/…, ../renuncia/…) vive en una.red.
const HOME = new Set(["/", "/index.html", "/papel.css", "/papel.js", "/og.jpg"]);
const redir = (to) => new Response(null, { status: 301, headers: { Location: to } });
// Un 3xx del origen NO se sigue: GitHub redirige a un dominio propio de Pages si el repo lo tiene.
const get = async (u) => {
  const r = await fetch(u, { redirect: "manual", cf: { cacheTtl: 300, cacheEverything: true } });
  if (r.status >= 300 && r.status < 400) throw new Error("el origen redirige: " + u + " -> " + r.headers.get("location"));
  return r;
};
export default {
  async fetch(req) {
    try {
      const url = new URL(req.url);
      if (req.method !== "GET" && req.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
      const p = url.pathname;
      if (HOME.has(p)) return get(ORIGIN + "/portafolio" + (p === "/index.html" ? "/" : p) + url.search);
      if (p === "/ds") return redir(url.origin + "/ds/");
      if (p.startsWith("/ds/")) return get(GH + "/ds" + p.slice(3) + url.search);
      if (p.startsWith("/img/") || p === "/favicon.svg") return get(ORIGIN + p + url.search);
      return redir("https://una.red" + p + url.search);
    } catch (e) {
      return new Response("maldonado-pro: " + (e && e.message ? e.message : e), { status: 502 });
    }
  },
};
