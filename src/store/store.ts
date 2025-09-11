// src/store/store.ts
import { map } from 'nanostores';

// Añade 'members' y 'settings' a los tipos de vista
export const dashboardView = map<{
  currentView: 'workspaces' | 'boards' | 'members' | 'settings';
  selectedWorkspaceId: string | null;
}>({
  currentView: 'workspaces',
  selectedWorkspaceId: null,
});

export function showWorkspaces() {
  dashboardView.set({
    currentView: 'workspaces',
    selectedWorkspaceId: null,
  });
}

export function showBoards(workspaceId: string) {
  dashboardView.set({
    currentView: 'boards',
    selectedWorkspaceId: workspaceId,
  });
}

// NUEVA ACCIÓN para Miembros
export function showMembers(workspaceId: string) {
  dashboardView.set({
    currentView: 'members',
    selectedWorkspaceId: workspaceId,
  });
}

// NUEVA ACCIÓN para Configuración
export function showSettings(workspaceId: string) {
  dashboardView.set({
    currentView: 'settings',
    selectedWorkspaceId: workspaceId,
  });
}