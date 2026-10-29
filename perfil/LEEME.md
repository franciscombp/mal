# El perfil compartido

La moneda común (los sucres, como la moneda del Ecuador hasta el 2000), los logros y la cuenta de todos los juegos.

- `perfil.js`: el perfil. Se guarda en el navegador (`una.perfil.v1`) y lo comparten todos los juegos del sitio.
- `logros.js`: el catálogo de logros y el tope diario del boliche.
- `config.js`: la configuración de Firebase. Mientras sea `null`, todo es local.
- `nube.js`: entrar con Google y guardar en Firestore. Solo se carga si hay configuración.
- `firestore.rules`: las reglas de Firestore.
- `index.html`: la página del perfil, en `/perfil/`.

## Cómo lo usa un juego

```js
import * as perfil from '../perfil/perfil.js?v=1';
perfil.ganar(1, 'boliche');          // sucres; el boliche tiene tope diario
perfil.desbloquear('boliche-quebraste');
perfil.saldo();
perfil.gastar(10);                   // false si no alcanza
```

## Las reglas de la economía

- Nada se compra ni se cobra con dinero de verdad.
- La plata del boliche se queda en el boliche. Lo que sale a los sucres es uno por ronda jugada, con tope diario (`TOPE_DIARIO`), y los premios de los logros.
- Ningún logro premia apostar mucho ni perder.

## Cómo se juntan los dispositivos

Cada navegador tiene un id y lleva sus propias cuentas: `{ ganado, gastado }`. El saldo es la suma de todas. Juntar dos perfiles es tomar lo mayor de cada cuenta y la primera fecha de cada logro, así que da lo mismo el orden o cuántas veces se junte. Lo usan la nube y el código de respaldo.

## Encender la cuenta con Firebase

1. En <https://console.firebase.google.com> crea un proyecto. Con el plan gratuito (Spark) alcanza.
2. **Authentication** → Comenzar → Método de acceso → activa **Google**.
3. Authentication → Configuración → **Dominios autorizados** → agrega `franciscombp.github.io`. Para probar en local, `localhost` ya viene.
4. **Firestore Database** → Crear base de datos, en modo producción. Ubicación cercana, por ejemplo `southamerica-east1`.
5. Firestore → **Reglas** → pega `firestore.rules` y publica.
6. Configuración del proyecto → Tus apps → **Web** (`</>`) → registra la app y copia `firebaseConfig` en `config.js`, en lugar del `null`.

Los datos de `config.js` son públicos por diseño: lo que protege cada cuenta son las reglas, que dejan leer y escribir a cada quien solo su propio documento (`usuarios/{uid}`).

Los logros se guardan desde el navegador, así que alguien con conocimientos podría escribirse logros a mano. Para logros locales da igual. Si un día dan premios de verdad o hay tablas de posiciones, se validan en el servidor con Cloud Functions.

## Más adelante

- **Steam:** empaquetar con Electron o Tauri y steamworks.js, y enchufarlo con `perfil.alDesbloquear(id => …)`. Los `id` de `logros.js` son los nombres de API de Steam.
- **Game Center / Google Play:** app nativa con Capacitor y su plugin, por el mismo `alDesbloquear`. En iOS, si se ofrece entrar con Google, Apple pide también «Iniciar sesión con Apple», que Firebase también tiene.
