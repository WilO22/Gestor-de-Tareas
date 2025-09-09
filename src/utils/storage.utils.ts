// src/utils/storage.utils.ts
// Utilidades para manejo de localStorage con mejor tipado y error handling

/**
 * Guarda un valor en localStorage con serialización automática
 */
export function setStorageItem<T>(key: string, value: T): boolean {
  try {
    const serializedValue = JSON.stringify(value);
    localStorage.setItem(key, serializedValue);
    return true;
  } catch (error) {
    console.error(`Error saving to localStorage (${key}):`, error);
    return false;
  }
}

/**
 * Obtiene un valor de localStorage con deserialización automática
 */
export function getStorageItem<T>(key: string, defaultValue?: T): T | null {
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return defaultValue ?? null;
    }
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error reading from localStorage (${key}):`, error);
    return defaultValue ?? null;
  }
}

/**
 * Elimina un valor de localStorage
 */
export function removeStorageItem(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing from localStorage (${key}):`, error);
    return false;
  }
}

/**
 * Verifica si existe un valor en localStorage
 */
export function hasStorageItem(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null;
  } catch (error) {
    console.error(`Error checking localStorage (${key}):`, error);
    return false;
  }
}

/**
 * Obtiene el tamaño total usado en localStorage (en bytes)
 */
export function getStorageSize(): number {
  try {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += (localStorage[key].length + key.length) * 2; // *2 porque es UTF-16
      }
    }
    return total;
  } catch (error) {
    console.error('Error calculating localStorage size:', error);
    return 0;
  }
}

/**
 * Limpia todo el localStorage
 */
export function clearStorage(): boolean {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    return false;
  }
}

/**
 * Utilidad para crear claves de storage con prefijo
 */
export function createStorageKey(prefix: string, key: string): string {
  return `${prefix}:${key}`;
}

/**
 * Utilidad para trabajar con objetos complejos en localStorage
 */
export class StorageManager<T extends Record<string, any>> {
  private prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  set<K extends keyof T>(key: K, value: T[K]): boolean {
    return setStorageItem(createStorageKey(this.prefix, key as string), value);
  }

  get<K extends keyof T>(key: K, defaultValue?: T[K]): T[K] | null {
    return getStorageItem(createStorageKey(this.prefix, key as string), defaultValue);
  }

  remove<K extends keyof T>(key: K): boolean {
    return removeStorageItem(createStorageKey(this.prefix, key as string));
  }

  has<K extends keyof T>(key: K): boolean {
    return hasStorageItem(createStorageKey(this.prefix, key as string));
  }

  clear(): boolean {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(`${this.prefix}:`)) {
          localStorage.removeItem(key);
        }
      });
      return true;
    } catch (error) {
      console.error(`Error clearing storage with prefix ${this.prefix}:`, error);
      return false;
    }
  }
}
