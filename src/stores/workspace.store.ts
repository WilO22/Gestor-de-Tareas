// src/stores/workspace.store.ts
// Store simple para gestión de estado de workspaces (sin librerías externas)

import type { Workspace, Member } from '../types/domain';

interface WorkspaceState {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  members: Member[];
  isLoading: boolean;
  error: string | null;
}

class WorkspaceStore {
  private state: WorkspaceState = {
    currentWorkspace: null,
    workspaces: [],
    members: [],
    isLoading: false,
    error: null
  };

  private listeners: Array<(state: WorkspaceState) => void> = [];

  // Getters
  getState(): WorkspaceState {
    return { ...this.state };
  }

  get currentWorkspace(): Workspace | null {
    return this.state.currentWorkspace;
  }

  get workspaces(): Workspace[] {
    return [...this.state.workspaces];
  }

  get members(): Member[] {
    return [...this.state.members];
  }

  get isLoading(): boolean {
    return this.state.isLoading;
  }

  get error(): string | null {
    return this.state.error;
  }

  // Actions
  setCurrentWorkspace(workspace: Workspace | null): void {
    this.state = {
      ...this.state,
      currentWorkspace: workspace
    };
    this.notify();
    this.saveToStorage();
  }

  setWorkspaces(workspaces: Workspace[]): void {
    this.state = {
      ...this.state,
      workspaces: [...workspaces]
    };
    this.notify();
    this.saveToStorage();
  }

  addWorkspace(workspace: Workspace): void {
    this.state = {
      ...this.state,
      workspaces: [...this.state.workspaces, workspace]
    };
    this.notify();
    this.saveToStorage();
  }

  updateWorkspace(workspaceId: string, updates: Partial<Workspace>): void {
    this.state = {
      ...this.state,
      workspaces: this.state.workspaces.map(w =>
        w.id === workspaceId ? { ...w, ...updates } : w
      ),
      currentWorkspace: this.state.currentWorkspace?.id === workspaceId
        ? { ...this.state.currentWorkspace, ...updates }
        : this.state.currentWorkspace
    };
    this.notify();
    this.saveToStorage();
  }

  removeWorkspace(workspaceId: string): void {
    this.state = {
      ...this.state,
      workspaces: this.state.workspaces.filter(w => w.id !== workspaceId),
      currentWorkspace: this.state.currentWorkspace?.id === workspaceId
        ? null
        : this.state.currentWorkspace
    };
    this.notify();
    this.saveToStorage();
  }

  // Actions para miembros
  setMembers(members: Member[]): void {
    this.state = {
      ...this.state,
      members: [...members]
    };
    this.notify();
  }

  addMember(member: Member): void {
    this.state = {
      ...this.state,
      members: [...this.state.members, member]
    };
    this.notify();
  }

  updateMember(memberId: string, updates: Partial<Member>): void {
    this.state = {
      ...this.state,
      members: this.state.members.map(m =>
        m.userId === memberId ? { ...m, ...updates } : m
      )
    };
    this.notify();
  }

  removeMember(memberId: string): void {
    this.state = {
      ...this.state,
      members: this.state.members.filter(m => m.userId !== memberId)
    };
    this.notify();
  }

  // Actions de estado
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

  clearError(): void {
    this.state = {
      ...this.state,
      error: null
    };
    this.notify();
  }

  // Suscripción
  subscribe(listener: (state: WorkspaceState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  // Persistencia con localStorage
  loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('workspace-state');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.state = { ...this.state, ...parsed };
        this.notify();
      }
    } catch (error) {
      console.warn('Error loading workspace state from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const toSave = {
        currentWorkspace: this.state.currentWorkspace,
        workspaces: this.state.workspaces
      };
      localStorage.setItem('workspace-state', JSON.stringify(toSave));
    } catch (error) {
      console.warn('Error saving workspace state to storage:', error);
    }
  }
}

export const workspaceStore = new WorkspaceStore();
