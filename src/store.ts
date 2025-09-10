// src/store.ts
import { map } from 'nanostores';

export const dashboardView = map<{
  currentView: 'workspaces' | 'boards' | 'members' | 'settings';
  selectedWorkspaceId: string | null;
}>({
  currentView: 'workspaces',
  selectedWorkspaceId: null,
});

export function showBoards(workspaceId: string) {
  dashboardView.set({
    currentView: 'boards',
    selectedWorkspaceId: workspaceId,
  });
}

export function showWorkspaces() {
  dashboardView.set({
    currentView: 'workspaces',
    selectedWorkspaceId: null,
  });
}