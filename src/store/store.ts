// src/store/store.ts
import { map } from 'nanostores';

// Store para el estado del dashboard
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

export function showWorkspaceBoards(workspaceId: string) {
  console.log('🏪 Store: showWorkspaceBoards llamado con workspaceId:', workspaceId);
  console.log('🏪 Store: Tipo de workspaceId:', typeof workspaceId, 'Longitud:', workspaceId?.length);
  console.log('🏪 Store: Estado actual antes del cambio:', dashboardView.get());
  dashboardView.set({
    currentView: 'boards',
    selectedWorkspaceId: workspaceId,
  });
  console.log('🏪 Store: Estado actualizado a:', dashboardView.get());
}

export function showWorkspaceMembers(workspaceId: string) {
  console.log('🏪 Store: showWorkspaceMembers llamado con workspaceId:', workspaceId);
  dashboardView.set({
    currentView: 'members',
    selectedWorkspaceId: workspaceId,
  });
  console.log('🏪 Store: Estado actualizado a:', dashboardView.get());
}

export function showWorkspaceSettings(workspaceId: string) {
  dashboardView.set({
    currentView: 'settings',
    selectedWorkspaceId: workspaceId,
  });
}