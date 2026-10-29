/* La cuenta en la nube, con Firebase: entrar con Google y guardar el
   perfil en Firestore, en usuarios/{uid}. Se carga solo si config.js trae
   la configuración. Firebase recuerda la sesión, así que los juegos
   sincronizan solos; entrar y salir se hace desde la página del perfil. */
const CDN = 'https://www.gstatic.com/firebasejs/10.14.1';

export async function iniciar(config, perfil) {
  const [{ initializeApp }, auth, fs] = await Promise.all([
    import(`${CDN}/firebase-app.js`),
    import(`${CDN}/firebase-auth.js`),
    import(`${CDN}/firebase-firestore.js`),
  ]);
  const app = initializeApp(config);
  const a = auth.getAuth(app), db = fs.getFirestore(app);
  a.languageCode = 'es';

  const oyentes = new Set();
  let usuario = null, apagar = null, espera = 0;
  const avisar = () => { for (const f of oyentes) f(usuario); };

  // lo local sube a la nube un momento después de cada cambio
  const subir = () => {
    clearTimeout(espera);
    espera = setTimeout(() => {
      if (!usuario) return;
      const { cuentas, logros } = perfil.datos();
      fs.setDoc(fs.doc(db, 'usuarios', usuario.uid), { cuentas, logros, nombre: usuario.displayName || '', actualizado: fs.serverTimestamp() }, { merge: true })
        .catch(e => console.warn('No se pudo guardar en la nube:', e));
    }, 1500);
  };
  perfil.alCambiar(subir);

  auth.onAuthStateChanged(a, u => {
    usuario = u;
    if (apagar) { apagar(); apagar = null; }
    if (u) {
      // lo de la nube baja y se junta; si lo local traía algo nuevo, sube
      apagar = fs.onSnapshot(fs.doc(db, 'usuarios', u.uid), s => {
        if (s.exists()) perfil.mezclarDeFuera(s.data());
        const r = s.data() || {};
        const local = perfil.datos();
        if (JSON.stringify(r.cuentas || {}) !== JSON.stringify(local.cuentas) || JSON.stringify(r.logros || {}) !== JSON.stringify(local.logros)) subir();
      }, e => console.warn('No se pudo leer la nube:', e));
    }
    avisar();
  });

  return {
    usuario: () => usuario,
    alCambiarUsuario: f => { oyentes.add(f); f(usuario); return () => oyentes.delete(f); },
    entrar: () => auth.signInWithPopup(a, new auth.GoogleAuthProvider()),
    salir: () => auth.signOut(a),
  };
}
