// src/stores/auth.store.ts
// Store simple para gestión de estado de autenticación (sin librerías externas)

import type { User } from '../types/domain';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

class AuthStore {
  private state: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null
  };

  private listeners: Array<(state: AuthState) => void> = [];

  // Getters
  getState(): AuthState {
    return { ...this.state };
  }

  get user(): User | null {
    return this.state.user;
  }

  get isAuthenticated(): boolean {
    return this.state.isAuthenticated;
  }

  get isLoading(): boolean {
    return this.state.isLoading;
  }

  get error(): string | null {
    return this.state.error;
  }

  // Actions
  setUser(user: User | null): void {
    this.state = {
      ...this.state,
      user,
      isAuthenticated: !!user,
      error: null
    };
    this.notify();
  }

  setLoading(loading: boolean): void {
    this.state = {
      ...this.state,
      isLoading: loading
    };
    this.notify();
  }

  setError(error: string | null): void {
    this.state = {
      ...this.state,
      error,
      isLoading: false
    };
    this.notify();
  }

  logout(): void {
    this.state = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    };
    this.notify();
  }

  clearError(): void {
    this.state = {
      ...this.state,
      error: null
    };
    this.notify();
  }

  // Suscripción
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  // Persistencia simple con localStorage
  loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('auth-state');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.state = { ...this.state, ...parsed };
        this.notify();
      }
    } catch (error) {
      console.warn('Error loading auth state from storage:', error);
    }
  }

  saveToStorage(): void {
    try {
      const toSave = {
        user: this.state.user,
        isAuthenticated: this.state.isAuthenticated
      };
      localStorage.setItem('auth-state', JSON.stringify(toSave));
    } catch (error) {
      console.warn('Error saving auth state to storage:', error);
    }
  }
}

export const authStore = new AuthStore();
