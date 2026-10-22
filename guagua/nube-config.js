/* La configuración web de Firebase del proyecto guaguas-de-pan.
   No es secreta: va en el código de cualquier página que use Firebase.
   Lo que protege los datos son las reglas de guagua/firebase/firestore.rules.

   Si se pone en null, el juego funciona sin nube: los regalos viajan
   enteros en el enlace y la vitrina vive en el navegador.
   (No se usa Analytics: el juego no mide a nadie.) */
export const firebaseConfig = {
  apiKey: 'AIzaSyDagab0pYcQaZh7AuADhXfRvmDcQ41-H9U',
  authDomain: 'guaguas-de-pan.firebaseapp.com',
  projectId: 'guaguas-de-pan',
  storageBucket: 'guaguas-de-pan.firebasestorage.app',
  messagingSenderId: '811934718138',
  appId: '1:811934718138:web:56ce8aeec86fa4c648ca83',
};
