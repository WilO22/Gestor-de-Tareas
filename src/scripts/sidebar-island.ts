// src/scripts/sidebar-island.ts

import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/auth';
import { subscribeToUserWorkspaces } from '../firebase/api';
import type { Workspace as DomainWorkspace } from '../types/domain';
import { showBoards, showMembers, showSettings, showWorkspaces } from '../store';

type Workspace = DomainWorkspace;

let expandedWorkspaceId: string | null = null;
let workspacesUnsubscribe: (() => void) | null = null;

// --- FUNCIÓN DE RENDERIZADO MODIFICADA ---
// Ahora genera URLs reales en los atributos href.
function renderWorkspaces(workspaces: Workspace[]) {
  const workspacesList = document.getElementById('workspaces-list');
  if (!workspacesList) return;

  if (!workspaces || workspaces.length === 0) {
    workspacesList.innerHTML = `
      <div class="text-center py-4">
        <p class="text-sm text-gray-500 mb-3">No hay espacios de trabajo</p>
        <button id="create-workspace-btn" class="text-xs text-blue-600 hover:text-blue-800">Crear el primero</button>
      </div>
    `;
    return;
  }

  const workspacesHTML = workspaces
    .map((workspace: Workspace) => {
      const isExpanded = expandedWorkspaceId === workspace.id;
      const initials = workspace.name?.split(' ').map((w: any) => w[0]).join('').toUpperCase().slice(0, 2) || '';
      return `
        <div class="workspace-item group" data-workspace-id="${workspace.id}">
          <div class="flex items-center justify-between cursor-pointer workspace-toggle px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors" data-workspace-id="${workspace.id}" aria-expanded="${isExpanded ? 'true' : 'false'}">
            <div class="flex items-center space-x-2 select-workspace" data-workspace-id="${workspace.id}">
              <div class="w-7 h-7 bg-pink-500 rounded flex items-center justify-center text-xs font-bold text-white">${initials}</div>
              <span class="text-gray-900 text-sm font-medium">${workspace.name || 'Workspace'}</span>
            </div>
            <div class="text-gray-400 group-hover:text-gray-600 transition-transform">
              <svg class="w-4 h-4 transform ${isExpanded ? 'rotate-90' : ''} transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
          <div class="workspace-menu ml-9 mt-1 space-y-1 ${isExpanded ? '' : 'hidden'}" id="menu-${workspace.id}">
            <a href="#" data-action="boards" data-workspace-id="${workspace.id}" class="flex items-center space-x-2 text-gray-700 hover:bg-blue-100 px-2 py-1 rounded text-sm transition-colors boards-btn">
              <svg class="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
              <span>Tableros</span>
            </a>
            <a href="#" data-action="members" data-workspace-id="${workspace.id}" class="flex items-center space-x-2 text-gray-700 hover:bg-blue-100 px-2 py-1 rounded text-sm transition-colors members-btn">
              <svg class="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87M16 3.13a4 4 0 010 7.75M8 3.13a4 4 0 000 7.75"/></svg>
              <span>Miembros</span>
            </a>
            <a href="#" data-action="config" data-workspace-id="${workspace.id}" class="flex items-center space-x-2 text-gray-700 hover:bg-blue-100 px-2 py-1 rounded text-sm transition-colors settings-btn">
              <svg class="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span>Configuración</span>
            </a>
          </div>
        </div>
      `;
    })
    .join('');

  workspacesList.innerHTML = workspacesHTML;
}

function toggleWorkspaceById(workspaceId: string) {
  const isCurrentlyExpanded = expandedWorkspaceId === workspaceId;
  expandedWorkspaceId = isCurrentlyExpanded ? null : workspaceId;

  document.querySelectorAll('.workspace-item').forEach((item) => {
    const itemEl = item as HTMLElement;
    const itemWorkspaceId = itemEl.dataset.workspaceId;
    const menu = itemEl.querySelector('.workspace-menu') as HTMLElement | null;
    const arrow = itemEl.querySelector('.workspace-toggle svg');

    if (itemWorkspaceId === workspaceId && !isCurrentlyExpanded) {
        menu?.classList.remove('hidden');
        arrow?.classList.add('rotate-90');
    } else {
        menu?.classList.add('hidden');
        arrow?.classList.remove('rotate-90');
    }
  });
}

function handleCreateWorkspace() {
  document.dispatchEvent(new CustomEvent('create-workspace-requested'));
}

// --- FUNCIÓN DE INICIALIZACIÓN REFACTORIZADA ---
function initializeSidebarIsland() {
  const workspacesListEl = document.getElementById('workspaces-list');
  if (workspacesListEl) {
    // Usamos delegación de eventos para manejar todos los clics eficientemente.
    const delegateFn = async (e: Event) => {
      const target = e.target as HTMLElement;
      e.preventDefault(); // Prevenir navegación en todos los clics delegados


      // 1) Manejar clics en los enlaces de navegación (Tableros, Miembros, etc.)
      const actionLink = target.closest('a[data-action]') as HTMLAnchorElement | null;
      if (actionLink) {
        const workspaceId = actionLink.dataset.workspaceId;
        const action = actionLink.dataset.action;
        if (workspaceId) {
          if (action === 'boards') {
            showBoards(workspaceId);
            expandedWorkspaceId = workspaceId; // Asegura que el menú quede abierto
            toggleWorkspaceById(workspaceId);
          } else if (action === 'members') {
            showMembers(workspaceId);
            expandedWorkspaceId = workspaceId;
            toggleWorkspaceById(workspaceId);
          } else if (action === 'config') {
            showSettings(workspaceId);
            expandedWorkspaceId = workspaceId;
            toggleWorkspaceById(workspaceId);
          }
        }
        return;
      }

      // 2) Manejar clic en el nombre del workspace (select-workspace): selecciona Tableros y expande
      const selectName = target.closest('.select-workspace');
      if (selectName) {
        const id = (selectName as HTMLElement).dataset.workspaceId;
        if (id) {
          showBoards(id);
          expandedWorkspaceId = id;
          toggleWorkspaceById(id);
        }
        return;
      }

      // 3) Manejar clics para expandir/colapsar un workspace (flecha o fondo)
      const toggleEl = target.closest('.workspace-toggle');
      if (toggleEl) {
        const id = (toggleEl as HTMLElement).dataset.workspaceId;
        if (id) toggleWorkspaceById(id);
        return;
      }
      
      // 3) Manejar clic en "Crear el primero"
      const createBtn = target.closest('#create-workspace-btn');
      if(createBtn) {
        handleCreateWorkspace();
      }
    };

    // Limpiar listeners antiguos si los hubiera para evitar duplicados en HMR.
    if ((workspacesListEl as any)._delegateFn) {
      workspacesListEl.removeEventListener('click', (workspacesListEl as any)._delegateFn);
    }
    
    workspacesListEl.addEventListener('click', delegateFn);
    (workspacesListEl as any)._delegateFn = delegateFn; // Guardar referencia para poder limpiar.
  }

  // Suscripción a los datos de Firebase (sin cambios aquí).
  onAuthStateChanged(auth, (user) => {
    const workspacesList = document.getElementById('workspaces-list');
    if (user) {
      if (workspacesUnsubscribe) workspacesUnsubscribe();
      workspacesUnsubscribe = subscribeToUserWorkspaces(user.uid, (workspaces: Workspace[]) => {
        renderWorkspaces(workspaces);
      });
    } else {
      if (workspacesUnsubscribe) {
        workspacesUnsubscribe();
        workspacesUnsubscribe = null;
      }
      if (workspacesList) {
        workspacesList.innerHTML = `
          <div class="text-center py-4">
            <p class="text-sm text-gray-500">Inicia sesión para ver tus workspaces</p>
          </div>
        `;
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
  // Lógica de inicialización (sin cambios).
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSidebarIsland);
  } else {
    initializeSidebarIsland();
  }

  window.addEventListener('beforeunload', cleanupSidebarIsland);

  (window as any).sidebarIsland = {
    renderWorkspaces,
    expandedWorkspaceId: () => expandedWorkspaceId,
    cleanup: cleanupSidebarIsland,
  };
}