/* La cuenta en la nube (Firebase). Mientras esto sea null, el perfil vive
   solo en este navegador y todo funciona igual.
   Para encenderla, pega aquí la configuración web del proyecto de Firebase
   (Consola → Configuración del proyecto → Tus apps → Web). Estos datos son
   públicos por diseño: lo que protege la cuenta son las reglas de Firestore
   (firestore.rules). Los pasos están en LEEME.md.

   export const FIREBASE = {
     apiKey: '…',
     authDomain: 'tu-proyecto.firebaseapp.com',
     projectId: 'tu-proyecto',
     appId: '…',
   };
*/
export const FIREBASE = null;
