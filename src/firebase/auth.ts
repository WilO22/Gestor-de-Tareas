// src/firebase/auth.ts

// 1. Importamos las herramientas que necesitamos
import { 
  getAuth, // El servicio de autenticación
  createUserWithEmailAndPassword, // La función para crear nuevos usuarios
  signInWithEmailAndPassword
} from "firebase/auth";

// Importamos la 'app' que ya inicializamos en nuestro otro archivo de firebase
import { app } from "./client";

// 2. Obtenemos el servicio de autenticación asociado a nuestra app
export const auth = getAuth(app);

// 3. Creamos una función para registrar usuarios
//    'async' significa que esta operación puede tomar un tiempo.
export async function signUp(email: string, password: string) {
  try {
    // Usamos la herramienta de Firebase para crear el usuario
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log("¡Usuario registrado con éxito!", userCredential.user);
    return { success: true, user: userCredential.user };
  } catch (error) {
    // Primero, comprobamos si el error es una instancia de Error
    if (error instanceof Error) {
        console.error("Error al registrar usuario:", error.message);
        return { success: false, error: error.message };
    }
    // Si no lo es, devolvemos un mensaje genérico
    console.error("Error al registrar usuario:", error);
    return { success: false, error: "Ocurrió un error desconocido" };
  }
}

// Función para iniciar sesión
export async function signIn(email: string, password: string) {
  try {
    // Usamos la herramienta de Firebase para iniciar sesión
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("¡Inicio de sesión exitoso!", userCredential.user);
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