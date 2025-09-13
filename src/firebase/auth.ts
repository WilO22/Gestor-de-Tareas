// src/firebase/auth.ts

// 1. Importamos las herramientas que necesitamos
import {
  getAuth, // El servicio de autenticación
  createUserWithEmailAndPassword, // La función para crear nuevos usuarios
  signInWithEmailAndPassword,
  updateProfile // Para actualizar el perfil del usuario
} from "firebase/auth";

// Importamos la 'app' que ya inicializamos en nuestro otro archivo de firebase
import { app } from "./client";
// NUEVO: Importamos las funciones de manejo de usuarios
import { createUserProfile } from "./users";

// 2. Obtenemos el servicio de autenticación asociado a nuestra app
export const auth = getAuth(app);

// 3. Creamos una función para registrar usuarios - ACTUALIZADA para crear perfil
//    'async' significa que esta operación puede tomar un tiempo.
export async function signUp(email: string, password: string, displayName?: string) {
  try {
    // Usamos la herramienta de Firebase para crear el usuario
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // NUEVO: Actualizar el displayName en Firebase Auth si se proporciona
    if (displayName) {
      await updateProfile(user, { displayName });
    }
    
    // NUEVO: Crear perfil extendido en Firestore
    const profileResult = await createUserProfile(
      user.uid, 
      email, 
      displayName || user.displayName || undefined,
      'user' // Por defecto todos los nuevos usuarios son 'user', no 'admin'
    );
    
    if (!profileResult.success) {
      console.warn('⚠️ Usuario creado pero falló la creación del perfil:', profileResult.error);
    }
    
    console.log("✅ Usuario registrado con éxito y perfil creado!", user);
    return { success: true, user };
  } catch (error) {
    // Primero, comprobamos si el error es una instancia de Error
    if (error instanceof Error) {
        console.error("❌ Error al registrar usuario:", error.message);
        return { success: false, error: error.message };
    }
    // Si no lo es, devolvemos un mensaje genérico
    console.error("❌ Error al registrar usuario:", error);
    return { success: false, error: "Ocurrió un error desconocido" };
  }
}

// Función para iniciar sesión
export async function signIn(email: string, password: string) {
  try {
    // Usamos la herramienta de Firebase para iniciar sesión
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("¡Inicio de sesión exitoso!", userCredential.user);
    console.log("🔥 Usuario autenticado:", userCredential.user.uid, userCredential.user.email);
    return { success: true, user: userCredential.user };
  } catch (error) {
    // Si algo sale mal (ej: contraseña incorrecta), lo capturamos
    if (error instanceof Error) {
      console.error("Error en inicio de sesión:", error.message);
      return { success: false, error: error.message };
    }
    console.error("Error en inicio de sesión:", error);
    return { success: false, error: "Ocurrió un error desconocido" };
  }
}

// Re-exportar funciones necesarias para uso en componentes del cliente
export { onAuthStateChanged, getAuth } from 'firebase/auth';