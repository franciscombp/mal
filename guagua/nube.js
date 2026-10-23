/* ══════════════════════════════════════════════════════════════
   Guagua de pan · la nube
   Cuentas (correo y contraseña, o Google) y Firestore, para que los
   regalos tengan enlace corto y la vitrina siga a la persona de un
   teléfono a otro.

   Es opcional por diseño: si no hay configuración, si el SDK no carga
   o si no hay red, `iniciar` devuelve false y el juego sigue como
   siempre, con la receta en el enlace y la vitrina en el navegador.

   El SDK va en vendor/firebase (12.19.0). Sus módulos importan
   firebase-app.js desde gstatic; el importmap de index.html los manda
   a la copia local, así la carpeta se basta sola.

   Para probar contra los emuladores: abrir en localhost con ?emuladores
   (auth en el 9099 y Firestore en el 8080, ver firebase/firebase.json).
   ══════════════════════════════════════════════════════════════ */
import { firebaseConfig } from './nube-config.js?v=2026.10.23.1';

const SDK = 'https://www.gstatic.com/firebasejs/12.19.0/';
const RECETA_MAX = 12000;
const VITRINA_MAX = 80;

let fb = null;          // los módulos del SDK, una vez cargados
let auth = null, db = null;
let usuario = null;
const oyentes = new Set();

export const disponible = () => !!fb;
export const actual = () => usuario;
export function alCambiar(fn) { oyentes.add(fn); if (fb) fn(usuario); return () => oyentes.delete(fn); }

function configuracion() {
  const q = new URLSearchParams(location.search);
  if (q.has('emuladores') && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    return { emuladores: true, config: firebaseConfig || { apiKey: 'demo', authDomain: 'localhost', projectId: 'demo-guagua', appId: 'demo' } };
  }
  return firebaseConfig ? { emuladores: false, config: firebaseConfig } : null;
}

export async function iniciar() {
  if (fb) return true;
  const c = configuracion();
  if (!c) return false;
  try {
    const [app, a, f] = await Promise.all([
      import(SDK + 'firebase-app.js'),
      import(SDK + 'firebase-auth.js'),
      import(SDK + 'firebase-firestore-lite.js'),
    ]);
    const nucleo = app.initializeApp(c.config);
    auth = a.getAuth(nucleo);
    auth.languageCode = 'es';
    db = f.getFirestore(nucleo);
    if (c.emuladores) {
      a.connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      f.connectFirestoreEmulator(db, 'localhost', 8080);
    }
    fb = { a, f };
    a.onAuthStateChanged(auth, (u) => {
      usuario = u ? { uid: u.uid, nombre: u.displayName || '', correo: u.email || '', foto: u.photoURL || '' } : null;
      oyentes.forEach((fn) => fn(usuario));
    });
    return true;
  } catch (e) {
    console.warn('Guagua: la nube no está disponible.', e);
    fb = null;
    return false;
  }
}

/* ─── cuentas ──────────────────────────────────────────────── */
export async function entrarConGoogle() {
  const proveedor = new fb.a.GoogleAuthProvider();
  proveedor.setCustomParameters({ prompt: 'select_account' });
  await fb.a.signInWithPopup(auth, proveedor);
}
export async function entrarConCorreo(correo, clave) {
  await fb.a.signInWithEmailAndPassword(auth, correo, clave);
}
export async function crearCuenta(correo, clave, nombre) {
  const r = await fb.a.createUserWithEmailAndPassword(auth, correo, clave);
  if (nombre) {
    await fb.a.updateProfile(r.user, { displayName: nombre });
    usuario = Object.assign({}, usuario, { nombre });
    oyentes.forEach((fn) => fn(usuario));
  }
}
export async function recuperarClave(correo) {
  await fb.a.sendPasswordResetEmail(auth, correo);
}
export async function salir() {
  await fb.a.signOut(auth);
}

/* Los códigos de error de Firebase, en palabras claras. */
export function explicar(e) {
  const c = (e && e.code) || '';
  return ({
    'auth/invalid-email': 'Ese correo no parece válido.',
    'auth/missing-password': 'Falta la contraseña.',
    'auth/weak-password': 'La contraseña necesita al menos 6 caracteres.',
    'auth/email-already-in-use': 'Ya hay una cuenta con ese correo. Prueba a entrar.',
    'auth/invalid-credential': 'El correo o la contraseña no coinciden.',
    'auth/wrong-password': 'El correo o la contraseña no coinciden.',
    'auth/user-not-found': 'No hay ninguna cuenta con ese correo.',
    'auth/too-many-requests': 'Demasiados intentos. Espera un momento y vuelve a probar.',
    'auth/popup-closed-by-user': 'Se cerró la ventana de Google antes de terminar.',
    'auth/cancelled-popup-request': 'Se cerró la ventana de Google antes de terminar.',
    'auth/popup-blocked': 'El navegador bloqueó la ventana de Google. Permite las ventanas emergentes y vuelve a probar.',
    'auth/unauthorized-domain': 'Este sitio todavía no está autorizado para entrar con Google.',
    'auth/network-request-failed': 'No hay conexión. Revisa el internet y vuelve a probar.',
    'auth/operation-not-allowed': 'Ese modo de entrar todavía no está activado.',
    'permission-denied': 'No hay permiso para hacer eso.',
    'unavailable': 'No hay conexión con la nube en este momento.',
  })[c] || 'Algo salió mal. Vuelve a intentarlo en un momento.';
}

/* ─── regalos: /guaguas/{id} ───────────────────────────────── */
export async function publicarRegalo(receta) {
  if (!usuario) throw Object.assign(new Error('sin cuenta'), { code: 'permission-denied' });
  if (receta.length > RECETA_MAX) throw new Error('receta demasiado grande');
  const { doc, collection, setDoc, serverTimestamp } = fb.f;
  const ref = doc(collection(db, 'guaguas'));
  await setDoc(ref, { dueno: usuario.uid, receta, creada: serverTimestamp(), v: 3 });
  return ref.id;
}
export async function leerRegalo(id) {
  const { doc, getDoc } = fb.f;
  const s = await getDoc(doc(db, 'guaguas', id));
  return s.exists() ? s.data().receta : null;
}

/* ─── la vitrina: /usuarios/{uid}/vitrina/{id} ─────────────── */
export async function vitrina() {
  if (!usuario) return [];
  const { collection, query, orderBy, limit, getDocs } = fb.f;
  const q = query(collection(db, 'usuarios', usuario.uid, 'vitrina'), orderBy('fecha', 'desc'), limit(VITRINA_MAX));
  const r = await getDocs(q);
  return r.docs.map((d) => {
    const x = d.data();
    return { id: d.id, t: x.tipo, e: x.receta, g: x.guagua || null, f: x.fecha ? x.fecha.toMillis() : Date.now(), nube: true };
  });
}
export async function guardar(item) {
  if (!usuario || item.e.length > RECETA_MAX) return false;
  const { doc, setDoc, serverTimestamp } = fb.f;
  const datos = { tipo: item.t, receta: item.e, fecha: serverTimestamp() };
  if (item.g) datos.guagua = item.g;
  await setDoc(doc(db, 'usuarios', usuario.uid, 'vitrina', item.id), datos);
  return true;
}
export async function borrar(id) {
  if (!usuario) return;
  const { doc, deleteDoc } = fb.f;
  await deleteDoc(doc(db, 'usuarios', usuario.uid, 'vitrina', id));
}
