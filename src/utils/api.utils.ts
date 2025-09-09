// src/utils/api.utils.ts
// Utilidades para llamadas a API con manejo de estado

import { uiStore } from '../stores/ui.store';

/**
 * Wrapper para llamadas a API con manejo automático de loading y errores
 */
export async function apiCall<T>(
  apiFunction: () => Promise<T>,
  options: {
    showGlobalLoading?: boolean;
    loadingKey?: keyof ReturnType<typeof uiStore.getState>['loading'];
    onError?: (error: Error) => void;
  } = {}
): Promise<T | null> {
  const { showGlobalLoading = false, loadingKey, onError } = options;

  try {
    // Mostrar loading
    if (showGlobalLoading) {
      uiStore.setLoading('global', true);
    }
    if (loadingKey) {
      uiStore.setLoading(loadingKey, true);
    }

    // Ejecutar llamada a API
    const result = await apiFunction();

    return result;
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');

    // Mostrar error
    uiStore.addNotification({
      type: 'error',
      message: err.message,
      duration: 5000
    });

    // Callback opcional
    if (onError) {
      onError(err);
    }

    return null;
  } finally {
    // Ocultar loading
    if (showGlobalLoading) {
      uiStore.setLoading('global', false);
    }
    if (loadingKey) {
      uiStore.setLoading(loadingKey, false);
    }
  }
}

/**
 * Verifica si el usuario está autenticado antes de hacer una llamada
 */
export function requireAuth<T>(apiFunction: () => Promise<T>): Promise<T> {
  // Esta función se implementará cuando tengamos el auth store
  return apiFunction();
}

/**
 * Utilidad para reintentar llamadas a API con backoff exponencial
 */
export async function retryApiCall<T>(
  apiFunction: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiFunction();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      if (attempt === maxRetries) {
        throw lastError;
      }

      // Esperar con backoff exponencial
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
