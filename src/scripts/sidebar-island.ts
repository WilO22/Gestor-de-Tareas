import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/auth';
import { subscribeToUserWorkspaces } from '../firebase/api';
import type { Workspace as DomainWorkspace } from '../types/domain';

type Workspace = DomainWorkspace;

let expandedWorkspaceId: string | null = null;
let workspacesUnsubscribe: (() => void) | null = null;

function renderWorkspaces(workspaces: Workspace[]) {
  const workspacesList = document.getElementById('workspaces-list');
  if (!workspacesList) return;

  if (workspaces.length === 0) {
    workspacesList.innerHTML = `
      <div class="text-center py-4">
        <div class="text-gray-400 mb-2">
          <svg class="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
          </svg>
        </div>
        <p class="text-sm text-gray-500 mb-3">No hay espacios de trabajo</p>
        <button class="text-xs text-blue-600 hover:text-blue-800" onclick="document.getElementById('create-workspace-btn')?.click()">
          Crear el primero
        </button>
      </div>
    `;
    return;
  }

  const workspacesHTML = workspaces.map((workspace: Workspace) => {
    const isExpanded = expandedWorkspaceId === workspace.id;
    const memberCount = (workspace.members && workspace.members.length) || 0;
    const boardCount = (workspace.boards && workspace.boards.length) || 0;

    return `
      <div class="workspace-item px-3" data-workspace-id="${workspace.id}">
        <div class="bg-white rounded-md border border-gray-200 p-3 flex items-start space-x-3 hover:shadow-sm transition-shadow cursor-pointer">
          <button
            class="workspace-toggle flex items-center space-x-3 w-full text-left"
            data-workspace-id="${workspace.id}"
            aria-expanded="${isExpanded ? 'true' : 'false'}"
          >
            <div class="w-10 h-10 flex-shrink-0 rounded-md flex items-center justify-center text-white font-bold text-sm" style="background: linear-gradient(135deg,#ec4899,#8b5cf6);">
              ${workspace.name?.split(' ').map((w:any)=>w[0]).join('').toUpperCase().slice(0,1) || ''}
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-gray-900 truncate">${workspace.name || ''}</span>
                <svg class="w-4 h-4 text-gray-400 transform transition-transform ${isExpanded ? 'rotate-90' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </div>
              <p class="text-xs text-gray-500 truncate mt-1">${workspace.description || 'Sin descripción'}</p>
              <div class="text-xs text-gray-400 mt-2 flex items-center space-x-3">
                <span>${memberCount} ${memberCount === 1 ? 'miembro' : 'miembros'}</span>
                <span>·</span>
                <span>${boardCount} ${boardCount === 1 ? 'tablero' : 'tableros'}</span>
              </div>
            </div>
          </button>
        </div>

        <div class="workspace-menu ml-12 mt-2 space-y-1 ${isExpanded ? '' : 'hidden'}" id="menu-${workspace.id}">
          <button class="flex items-center space-x-2 text-gray-700 hover:bg-gray-100 px-3 py-1 rounded text-sm w-full boards-btn" data-workspace-id="${workspace.id}">
            <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7h18M3 12h18M3 17h18"/></svg>
            <span>Tableros</span>
          </button>

          <button class="flex items-center justify-between space-x-2 text-gray-700 hover:bg-gray-100 px-3 py-1 rounded text-sm w-full members-btn" data-workspace-id="${workspace.id}">
            <div class="flex items-center space-x-2">
              <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a4 4 0 00-4-4h-1"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20H4v-2a4 4 0 014-4h1"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 12a4 4 0 100-8 4 4 0 000 8z"/></svg>
              <span>Miembros</span>
            </div>
            <span class="text-xs text-gray-400">+</span>
          </button>

          <button class="flex items-center space-x-2 text-gray-700 hover:bg-gray-100 px-3 py-1 rounded text-sm w-full config-btn" data-workspace-id="${workspace.id}">
            <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0a1 1 0 00.95.69h.5a1 1 0 01.993.883c.06.559.319 1.083.737 1.476l.353.306a1 1 0 00.64.216c.79 0 1.12 1.01.485 1.48l-.416.305a1 1 0 00-.36 1.064c.18.62.18 1.284 0 1.904a1 1 0 00.36 1.064l.416.305c.635.47.305 1.48-.485 1.48a1 1 0 00-.64.216l-.353.306c-.418.393-.677.917-.737 1.476a1 1 0 01-.993.883h-.5a1 1 0 00-.95.69c-.3.921-1.603.921-1.902 0a1 1 0 00-.95-.69h-.5a1 1 0 01-.993-.883c-.06-.559-.319-1.083-.737-1.476l-.353-.306a1 1 0 00-.64-.216c-.79 0-1.12-1.01-.485-1.48l.416-.305a1 1 0 00.36-1.064c-.18-.62-.18-1.284 0-1.904a1 1 0 00-.36-1.064l-.416-.305c-.635-.47-.305-1.48.485-1.48a1 1 0 00.64-.216l.353-.306c.418-.393.677-.917.737-1.476a1 1 0 01.993-.883h.5c.36 0 .67-.255.95-.69z"/></svg>
            <span>Configuración</span>
          </button>
        </div>
      </div>
    `;
  }).join('');

  workspacesList.innerHTML = workspacesHTML;

  // Reattach handlers
  document.querySelectorAll('.workspace-toggle').forEach(toggle => {
    toggle.addEventListener('click', handleWorkspaceToggle);
  });
}

function handleWorkspaceToggle(event: Event) {
  const button = event.currentTarget as HTMLElement;
  const workspaceId = button.dataset.workspaceId;
  if (!workspaceId) return;

  const isCurrentlyExpanded = expandedWorkspaceId === workspaceId;
  expandedWorkspaceId = isCurrentlyExpanded ? null : workspaceId;

  document.querySelectorAll('.workspace-item').forEach(item => {
    const itemEl = item as HTMLElement;
    const itemWorkspaceId = itemEl.dataset.workspaceId;
    const boardsList = item.querySelector('.boards-list');
    const arrow = item.querySelector('svg');

    if (itemWorkspaceId === workspaceId) {
      if (isCurrentlyExpanded) {
        boardsList?.classList.add('hidden');
        arrow?.classList.remove('rotate-90');
      } else {
        boardsList?.classList.remove('hidden');
        arrow?.classList.add('rotate-90');
      }
    } else {
      boardsList?.classList.add('hidden');
      arrow?.classList.remove('rotate-90');
    }
  });
}

function handleCreateWorkspace() {
  const event = new CustomEvent('create-workspace-requested');
  document.dispatchEvent(event);
}

function initializeSidebarIsland() {
  const createBtn = document.getElementById('create-workspace-btn');
  if (createBtn) createBtn.addEventListener('click', handleCreateWorkspace);

  // subscribe to auth changes and user workspace updates
  onAuthStateChanged(auth, (user) => {
    const workspacesList = document.getElementById('workspaces-list');
    if (user) {
      if (workspacesUnsubscribe) {
        workspacesUnsubscribe();
      }
      workspacesUnsubscribe = subscribeToUserWorkspaces(user.uid, (workspaces: Workspace[]) => {
        renderWorkspaces(workspaces);
      });
    } else {
      if (workspacesUnsubscribe) {
        workspacesUnsubscribe();
        workspacesUnsubscribe = null;
      }
      if (workspacesList) {
        workspacesList.innerHTML = `\n          <div class="text-center py-4">\n            <p class="text-sm text-gray-500">Inicia sesión para ver tus workspaces</p>\n          </div>\n        `;
      }
    }
  });
}

function cleanupSidebarIsland() {
  if (workspacesUnsubscribe) {
    workspacesUnsubscribe();
    workspacesUnsubscribe = null;
  }
}

export default function initSidebarIsland() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSidebarIsland);
  } else {
    initializeSidebarIsland();
  }

  window.addEventListener('beforeunload', cleanupSidebarIsland);

  (window as any).sidebarIsland = {
    renderWorkspaces,
    expandedWorkspaceId: () => expandedWorkspaceId,
    cleanup: cleanupSidebarIsland
  };
}
