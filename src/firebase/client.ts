// src/firebase/client.ts

// 1. Importamos las herramientas necesarias de Firebase
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 2. Creamos el objeto de configuración, leyendo las "llaves secretas"
//    desde nuestra "caja fuerte" (.env)
const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
};

// 3. Inicializamos la aplicación de Firebase con nuestra configuración
export const app = initializeApp(firebaseConfig);

// 4. Obtenemos acceso a la base de datos (nuestro "cuaderno mágico")
//    y la exportamos para que otros archivos puedan usarla.
export const db = getFirestore(app);