/* El perfil compartido de los juegos: la moneda común (las guaguas), los
   logros y, si está configurada, la cuenta en la nube.

   Todo vive primero en este navegador. Los juegos están en el mismo sitio,
   así que comparten el mismo perfil sin servidor. Si hay cuenta, el perfil
   se junta con el de la nube: cada dispositivo lleva sus propias cuentas
   (lo que ganó y lo que gastó), y juntar es tomar lo mayor de cada una, así
   nada se pierde ni se cuenta dos veces aunque juegues en dos teléfonos.

     import * as perfil from '…/perfil/perfil.js';
     perfil.desbloquear('boliche-quebraste');
     perfil.ganar(1, 'boliche');
     perfil.saldo();
*/
import { LOGROS, TOPE_DIARIO } from './logros.js';
import { FIREBASE } from './config.js';

const CLAVE = 'una.perfil.v1';
const POR_ID = new Map(LOGROS.map(l => [l.id, l]));
const oyentes = new Set();

const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const nuevoId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const base = () => ({ v: 1, dispositivo: nuevoId(), cuentas: {}, logros: {}, dia: { fecha: hoy() } });

function leer() {
  try { const p = JSON.parse(localStorage.getItem(CLAVE) || 'null'); if (p && p.v === 1) return Object.assign(base(), p); }
  catch (e) { /* sin almacenamiento */ }
  return base();
}
let p = leer();
function escribir() {
  try { localStorage.setItem(CLAVE, JSON.stringify(p)); } catch (e) { /* sin almacenamiento */ }
  for (const f of oyentes) f(p);
}
// otra pestaña (el otro juego, la página del perfil) cambió el perfil
addEventListener('storage', e => { if (e.key === CLAVE) { p = leer(); for (const f of oyentes) f(p); } });

/* ─── juntar dos perfiles ─── */
// Cada dispositivo solo suma a sus propias cuentas: lo mayor es lo último.
// De cada logro queda la primera vez que salió.
export function juntar(a, b) {
  const cuentas = { ...a.cuentas };
  for (const [d, c] of Object.entries(b.cuentas || {})) {
    const m = cuentas[d] || { ganado: 0, gastado: 0 };
    cuentas[d] = { ganado: Math.max(m.ganado, c.ganado || 0), gastado: Math.max(m.gastado, c.gastado || 0) };
  }
  const logros = { ...a.logros };
  for (const [id, t] of Object.entries(b.logros || {})) logros[id] = Math.min(logros[id] ?? Infinity, t);
  return { ...a, cuentas, logros };
}
export function mezclarDeFuera(otro) {
  const j = juntar(p, otro);
  if (JSON.stringify(j.cuentas) === JSON.stringify(p.cuentas) && JSON.stringify(j.logros) === JSON.stringify(p.logros)) return false;
  p = j; escribir(); return true;
}

/* ─── la moneda común ─── */
const mias = () => (p.cuentas[p.dispositivo] ||= { ganado: 0, gastado: 0 });
export const saldo = () => Object.values(p.cuentas).reduce((s, c) => s + c.ganado - c.gastado, 0);
// Gana guaguas; el boliche respeta su tope del día. Devuelve lo que sí entró.
export function ganar(n, juego) {
  if (p.dia.fecha !== hoy()) p.dia = { fecha: hoy() };
  const tope = TOPE_DIARIO[juego];
  if (tope != null) { n = Math.max(0, Math.min(n, tope - (p.dia[juego] || 0))); p.dia[juego] = (p.dia[juego] || 0) + n; }
  if (n > 0) { mias().ganado += n; escribir(); }
  return n;
}
export function gastar(n) {
  if (n <= 0 || saldo() < n) return false;
  mias().gastado += n; escribir(); return true;
}
export const quedaHoy = juego => TOPE_DIARIO[juego] == null ? Infinity : Math.max(0, TOPE_DIARIO[juego] - (p.dia.fecha === hoy() ? p.dia[juego] || 0 : 0));

/* ─── los logros ─── */
export const tiene = id => id in p.logros;
export const logros = () => LOGROS.map(l => ({ ...l, cuando: p.logros[l.id] || null }));
export function desbloquear(id) {
  const l = POR_ID.get(id);
  if (!l || tiene(id)) return false;
  p.logros[id] = Date.now();
  if (l.premio) mias().ganado += l.premio;   // el premio del logro no cuenta para el tope
  escribir();
  avisar(l);
  for (const f of plataformas) f(id);
  return true;
}
// Steam, Game Center o Google Play se enchufan aquí cuando el juego corra ahí.
const plataformas = new Set();
export const alDesbloquear = f => plataformas.add(f);

export const datos = () => p;
export const alCambiar = f => { oyentes.add(f); return () => oyentes.delete(f); };

/* ─── el código de respaldo: para pasar el perfil a mano ─── */
export const respaldo = () => btoa(unescape(encodeURIComponent(JSON.stringify({ cuentas: p.cuentas, logros: p.logros }))));
export function restaurar(codigo) {
  const otro = JSON.parse(decodeURIComponent(escape(atob(codigo.trim()))));
  if (!otro || typeof otro.cuentas !== 'object' || typeof otro.logros !== 'object') throw new Error('Código no válido');
  mezclarDeFuera(otro);
}

/* ─── el aviso de logro ─── */
let caja;
function avisar(l) {
  if (typeof document === 'undefined') return;
  if (!caja) {
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483000';
    const sr = host.attachShadow({ mode: 'open' });
    sr.innerHTML = `<style>
      .l{position:absolute;left:50%;top:calc(12px + env(safe-area-inset-top));transform:translate(-50%,-140%);
        display:flex;align-items:center;gap:12px;max-width:min(92vw,380px);padding:10px 16px 10px 10px;border-radius:999px;
        background:rgba(28,18,10,.92);color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.45),inset 0 0 0 1.5px rgba(255,200,90,.55);
        font:600 14px/1.25 Inter,system-ui,sans-serif;transition:transform .45s cubic-bezier(.2,1.4,.4,1)}
      .l.ve{transform:translate(-50%,0)}
      .m{flex:none;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font-size:20px;
        background:radial-gradient(circle at 35% 30%,#ffe9a8,#e2b13c 55%,#a77818);box-shadow:inset 0 -2px 0 rgba(0,0,0,.25)}
      small{display:block;font-weight:500;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#ffcf6b}
      b{display:block;font-size:15px}
      .g{flex:none;margin-left:4px;color:#ffcf6b;font-weight:700;white-space:nowrap}
      @media (prefers-reduced-motion:reduce){.l{transition:none}}
    </style><div class="l" role="status" aria-live="polite"></div>`;
    document.body.append(host);
    caja = { el: sr.querySelector('.l'), cola: [], va: false };
  }
  caja.cola.push(l);
  if (!caja.va) siguiente();
}
function siguiente() {
  const l = caja.cola.shift();
  if (!l) { caja.va = false; return; }
  caja.va = true;
  caja.el.innerHTML = `<span class="m" aria-hidden="true">★</span><span><small>Logro</small><b></b></span>${l.premio ? `<span class="g">+${l.premio} guaguas</span>` : ''}`;
  caja.el.querySelector('b').textContent = l.nombre;
  requestAnimationFrame(() => caja.el.classList.add('ve'));
  setTimeout(() => { caja.el.classList.remove('ve'); setTimeout(siguiente, 500); }, 3200);
}

/* ─── la nube ─── */
// Solo se carga si hay configuración; si no, el perfil es local y ya.
export const hayNube = !!FIREBASE;
let nube = null;
export function conNube() {
  if (!FIREBASE) return Promise.resolve(null);
  return nube ||= import('./nube.js').then(m => m.iniciar(FIREBASE, { datos, mezclarDeFuera, alCambiar })).catch(e => { console.warn('Sin nube:', e); return null; });
}
if (FIREBASE && typeof window !== 'undefined') conNube();
