// src/scripts/shared/auth-init.ts
// Inicialización de autenticación y sincronización con authStore

import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase/client-config';
import { authStore } from '../../stores/auth.store';
import { getUserProfile } from '../../firebase/users';

console.log('🔐 Inicializando sistema de autenticación...');

// Función para obtener iniciales del nombre
export function getInitials(displayName?: string, email?: string): string {
  if (displayName && displayName.trim()) {
    // Tomar primeras letras de cada palabra
    return displayName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }

  if (email) {
    // Tomar primera letra del email
    return email.charAt(0).toUpperCase();
  }

  return 'U'; // Usuario por defecto
}

// Función para sincronizar estado de Firebase Auth con authStore
async function syncAuthState(user: any) {
  if (user) {
    console.log('🔐 Usuario autenticado:', user.uid, user.email);

    // Obtener perfil extendido desde Firestore
    const userProfile = await getUserProfile(user.uid);

    if (userProfile) {
      // Usuario con perfil completo
      authStore.setUser(userProfile);
      console.log('🔐 Perfil de usuario cargado:', userProfile);
    } else {
      // Usuario sin perfil extendido, crear uno básico
      console.warn('🔐 Usuario sin perfil extendido, creando básico');
      const basicUser = {
        id: user.uid,
        email: user.email || '',
        displayName: user.displayName || undefined,
        role: 'user' as const,
        workspaces: [],
        createdAt: new Date()
      };
      authStore.setUser(basicUser);
    }
  } else {
    console.log('🔐 Usuario no autenticado');
    authStore.logout();
  }

  authStore.setLoading(false);
}

// Inicializar listener de autenticación
export function initAuth() {
  console.log('🔐 Configurando listener de autenticación...');

  // Marcar como cargando inicialmente
  authStore.setLoading(true);

  // Configurar listener de Firebase Auth
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    await syncAuthState(user);
  });

  // Cargar estado desde localStorage si existe
  authStore.loadFromStorage();

  return unsubscribe;
}

// Función para verificar si el usuario está autenticado
export function requireAuth(): boolean {
  const state = authStore.getState();
  if (!state.isAuthenticated) {
    console.log('🔐 Redirigiendo a login - usuario no autenticado');
    window.location.href = '/login';
    return false;
  }
  return true;
}

// Inicializar automáticamente cuando se carga el script
if (typeof window !== 'undefined') {
  initAuth();
}