// src/utils/store.utils.ts
// Utilidades para trabajar con stores de Zustand

// Fallback ligero para StoreApi de Zustand (proyecto no requiere zustand en dependencias)
export interface StoreApi<T> {
  getState(): T;
  setState(partial: Partial<T> | ((state: T) => Partial<T>), replace?: boolean): void;
  subscribe(listener: (state: T) => void): () => void;
}

/**
 * Utilidad para resetear un store a su estado inicial
 */
export function resetStore<T>(store: StoreApi<T>, initialState: T): void {
  store.setState(initialState, true);
}

/**
 * Utilidad para crear un selector tipado
 */
export function createSelector<TState, TResult>(
  store: StoreApi<TState>,
  selector: (state: TState) => TResult
): () => TResult {
  return () => selector(store.getState());
}

/**
 * Utilidad para suscribirse a cambios específicos en el store
 */
export function subscribeToChanges<TState>(
  store: StoreApi<TState>,
  selector: (state: TState) => any,
  callback: (selectedState: any, previousSelectedState: any) => void
): () => void {
  let previousSelectedState = selector(store.getState());

  return store.subscribe((state) => {
    const selectedState = selector(state);
    if (selectedState !== previousSelectedState) {
      callback(selectedState, previousSelectedState);
      previousSelectedState = selectedState;
    }
  });
}

/**
 * Utilidad para crear acciones asíncronas con manejo de errores
 */
export function createAsyncAction<TState>(
  store: StoreApi<TState>,
  action: () => Promise<void>,
  options: {
    onStart?: (state: TState) => Partial<TState>;
    onSuccess?: (state: TState) => Partial<TState>;
    onError?: (state: TState, error: Error) => Partial<TState>;
  } = {}
): Promise<void> {
  const { onStart, onSuccess, onError } = options;

  return new Promise((resolve, reject) => {
    // Estado de carga
    if (onStart) {
      store.setState((state) => ({ ...state, ...onStart(state) }));
    }

    action()
      .then(() => {
        // Éxito
        if (onSuccess) {
          store.setState((state) => ({ ...state, ...onSuccess(state) }));
        }
        resolve();
      })
      .catch((error) => {
        // Error
        if (onError) {
          store.setState((state) => ({ ...state, ...onError(state, error) }));
        }
        reject(error);
      });
  });
}
