// src/stores/ui.store.ts
// Store simple para gestión de estado de UI (sin librerías externas)

interface ModalState {
  isOpen: boolean;
  type: string | null;
  data?: any;
}

interface UIState {
  modals: {
    memberOptions: ModalState;
    invitation: ModalState;
    workspaceSettings: ModalState;
    boardSettings: ModalState;
  };
  loading: {
    global: boolean;
    workspaces: boolean;
    boards: boolean;
    tasks: boolean;
  };
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    duration?: number;
  }>;
}

class UIStore {
  private state: UIState = {
    modals: {
      memberOptions: { isOpen: false, type: null },
      invitation: { isOpen: false, type: null },
      workspaceSettings: { isOpen: false, type: null },
      boardSettings: { isOpen: false, type: null }
    },
    loading: {
      global: false,
      workspaces: false,
      boards: false,
      tasks: false
    },
    notifications: []
  };

  private listeners: Array<(state: UIState) => void> = [];

  // Getters
  getState(): UIState {
    return { ...this.state };
  }

  get modals() {
    return { ...this.state.modals };
  }

  get loading() {
    return { ...this.state.loading };
  }

  get notifications() {
    return [...this.state.notifications];
  }

  // Actions para modales
  openModal(modalType: keyof UIState['modals'], data?: any): void {
    this.state = {
      ...this.state,
      modals: {
        ...this.state.modals,
        [modalType]: {
          isOpen: true,
          type: modalType,
          data
        }
      }
    };
    this.notify();
  }

  closeModal(modalType: keyof UIState['modals']): void {
    this.state = {
      ...this.state,
      modals: {
        ...this.state.modals,
        [modalType]: { isOpen: false, type: null }
      }
    };
    this.notify();
  }

  closeAllModals(): void {
    this.state = {
      ...this.state,
      modals: {
        memberOptions: { isOpen: false, type: null },
        invitation: { isOpen: false, type: null },
        workspaceSettings: { isOpen: false, type: null },
        boardSettings: { isOpen: false, type: null }
      }
    };
    this.notify();
  }

  // Actions para loading
  setLoading(key: keyof UIState['loading'], loading: boolean): void {
    this.state = {
      ...this.state,
      loading: {
        ...this.state.loading,
        [key]: loading
      }
    };
    this.notify();
  }

  // Actions para notificaciones
  addNotification(notification: Omit<UIState['notifications'][0], 'id'>): void {
    const id = Date.now().toString();
    const newNotification = { ...notification, id };

    this.state = {
      ...this.state,
      notifications: [...this.state.notifications, newNotification]
    };
    this.notify();

    // Auto-remover notificación
    if (notification.duration !== 0) {
      setTimeout(() => {
        this.removeNotification(id);
      }, notification.duration || 5000);
    }
  }

  removeNotification(id: string): void {
    this.state = {
      ...this.state,
      notifications: this.state.notifications.filter(n => n.id !== id)
    };
    this.notify();
  }

  clearNotifications(): void {
    this.state = {
      ...this.state,
      notifications: []
    };
    this.notify();
  }

  // Suscripción
  subscribe(listener: (state: UIState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }
}

export const uiStore = new UIStore();
