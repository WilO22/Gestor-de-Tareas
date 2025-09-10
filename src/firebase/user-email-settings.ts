// src/firebase/user-email-settings.ts
// SISTEMA HÍBRIDO: Email de app + Email personal opcional

import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from './client';
import { auth } from './auth';

/**
 * OPCIÓN AVANZADA: Permitir email personalizado por usuario
 * Cada usuario puede configurar su propio email para invitaciones (OPCIONAL)
 */

interface UserEmailSettings {
  usePersonalEmail: boolean;
  emailUser?: string;
  emailPassword?: string; // Encriptado o usando servicio externo
  emailDisplayName?: string;
}

/**
 * Guardar configuración de email personal del usuario
 */
export async function saveUserEmailSettings(settings: UserEmailSettings): Promise<{success: boolean; error?: string}> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Usuario no autenticado');
    }

    // // IMPORTANTE: NUNCA guardar contraseñas en texto plano
    // // En producción usar: encriptación o servicios como EmailJS
    
    await updateDoc(doc(db, 'users', currentUser.uid), {
      emailSettings: {
        usePersonalEmail: settings.usePersonalEmail,
        emailDisplayName: settings.emailDisplayName || currentUser.displayName
        // // NO guardar credenciales sensibles en Firestore
      }
    });

    return { success: true };
    
  } catch (error) {
    console.error('❌ Error guardando configuración de email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Obtener configuración de email del usuario
 */
export async function getUserEmailSettings(): Promise<UserEmailSettings | null> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;

    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (!userDoc.exists()) return null;

    const userData = userDoc.data();
    return userData.emailSettings || { usePersonalEmail: false };
    
  } catch (error) {
    console.warn('⚠️ No se pudo obtener configuración de email:', error);
    return { usePersonalEmail: false };
  }
}

// // FLUJO RECOMENDADO:
// // 1. Usuario puede elegir usar email de app (por defecto)
// // 2. O configurar su propio EmailJS/Resend personal
// // 3. App usa el email configurado o fallback al email de app
