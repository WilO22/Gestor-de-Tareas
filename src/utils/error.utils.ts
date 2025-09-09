// src/utils/error.utils.ts
// Utilidades para manejo de errores

export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

/**
 * Crea un error de aplicación estandarizado
 */
export function createAppError(
  code: string,
  message: string,
  details?: any
): AppError {
  return {
    code,
    message,
    details,
    timestamp: new Date()
  };
}

/**
 * Maneja errores de Firebase y los convierte a errores de aplicación
 */
export function handleFirebaseError(error: any): AppError {
  console.error('Firebase error:', error);

  // Errores de autenticación
  if (error.code?.startsWith('auth/')) {
    switch (error.code) {
      case 'auth/user-not-found':
        return createAppError('AUTH_USER_NOT_FOUND', 'Usuario no encontrado');
      case 'auth/wrong-password':
        return createAppError('AUTH_INVALID_CREDENTIALS', 'Credenciales inválidas');
      case 'auth/email-already-in-use':
        return createAppError('AUTH_EMAIL_EXISTS', 'El email ya está registrado');
      case 'auth/weak-password':
        return createAppError('AUTH_WEAK_PASSWORD', 'La contraseña es muy débil');
      case 'auth/invalid-email':
        return createAppError('AUTH_INVALID_EMAIL', 'Email inválido');
      default:
        return createAppError('AUTH_ERROR', 'Error de autenticación');
    }
  }

  // Errores de Firestore
  if (error.code?.startsWith('firestore/') || error.code?.startsWith('permission-denied')) {
    return createAppError('DATABASE_ERROR', 'Error de base de datos');
  }

  // Error genérico
  return createAppError(
    'UNKNOWN_ERROR',
    error.message || 'Ha ocurrido un error inesperado',
    error
  );
}

/**
 * Maneja errores de red
 */
export function handleNetworkError(error: any): AppError {
  console.error('Network error:', error);

  if (!navigator.onLine) {
    return createAppError('NETWORK_OFFLINE', 'Sin conexión a internet');
  }

  return createAppError('NETWORK_ERROR', 'Error de conexión');
}

/**
 * Registra errores para debugging
 */
export function logError(error: AppError, context?: string): void {
  const logData = {
    ...error,
    context,
    userAgent: navigator.userAgent,
    url: window.location.href
  };

  console.error('App Error:', logData);

  // En producción, aquí se enviaría a un servicio de logging
  // sendToLoggingService(logData);
}

/**
 * Utilidad para try-catch con manejo automático de errores
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorHandler?: (error: AppError) => void
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    // Normalizar cualquier error a AppError para que las funciones que esperan AppError reciban el tipo correcto
    const appError: AppError = error instanceof Error
      ? createAppError('UNKNOWN_ERROR', error.message, error)
      : (error as AppError);

    logError(appError);

    if (errorHandler) {
      errorHandler(appError);
    }

    return null;
  }
}
