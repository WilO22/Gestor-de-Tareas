// src/scripts/workspace/sidebar-island.ts

import { onAuthStateChanged, auth } from '../../firebase/auth';
import { subscribeToUserWorkspaces } from '../../firebase/api';
import { showWorkspaceBoards, showWorkspaceMembers, showWorkspaceSettings } from '../../store/store';
import type { Workspace as DomainWorkspace } from '../../types/domain';

type Workspace = DomainWorkspace;

let expandedWorkspaceId: string | null = null;
let selectedWorkspaceId: string | null = null;
let selectedAction: string | null = null; // 'boards', 'members', 'settings'
let currentWorkspaces: Workspace[] = []; // Almacenar workspaces actuales para re-renderizado
let workspacesUnsubscribe: (() => void) | null = null;

// --- FUNCIÓN DE RENDERIZADO MODIFICADA ---
// Ahora genera elementos sin href para evitar navegación por defecto del navegador
function renderWorkspaces(workspaces: Workspace[]) {
  console.log('🔧 Sidebar: renderWorkspaces llamado con', workspaces.length, 'workspaces');
  currentWorkspaces = workspaces; // Almacenar para re-renderizado
  const workspacesList = document.getElementById('workspaces-list');
  if (!workspacesList) {
    console.error('🔧 Sidebar: No se encontró el elemento workspaces-list');
    return;
  }

  if (!workspaces || workspaces.length === 0) {
    console.log('🔧 Sidebar: No hay workspaces, mostrando mensaje vacío');
    workspacesList.innerHTML = `
      <div class="text-center py-4">
        <p class="text-sm text-gray-500 mb-3">No hay espacios de trabajo</p>
        <button id="create-workspace-btn" class="text-xs text-blue-600 hover:text-blue-800">Crear el primero</button>
      </div>
    `;
    return;
  }

  console.log('🔧 Sidebar: Renderizando', workspaces.length, 'workspaces');
  const workspacesHTML = workspaces
    .map((workspace: Workspace) => {
      console.log('🔧 Sidebar: Renderizando workspace:', workspace.id, workspace.name);
      const isExpanded = expandedWorkspaceId === workspace.id;
      const isSelected = selectedWorkspaceId === workspace.id;
      const initials = workspace.name?.split(' ').map((w: any) => w[0]).join('').toUpperCase().slice(0, 2) || '';
      return `
        <div class="workspace-item group" data-workspace-id="${workspace.id}">
          <div class="flex items-center justify-between cursor-pointer workspace-toggle px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors ${isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''}" data-workspace-id="${workspace.id}" aria-expanded="${isExpanded ? 'true' : 'false'}">
            <div class="flex items-center space-x-2 select-workspace cursor-pointer" data-workspace-id="${workspace.id}">
              <div class="w-7 h-7 bg-pink-500 rounded flex items-center justify-center text-xs font-bold text-white">${initials}</div>
              <span class="text-gray-900 text-sm font-medium">${workspace.name || 'Workspace'}</span>
            </div>
            <div class="text-gray-400 group-hover:text-gray-600 transition-transform">
              <svg class="w-4 h-4 transform ${isExpanded ? 'rotate-90' : ''} transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
          <div class="workspace-menu ml-9 mt-1 space-y-1 ${isExpanded ? '' : 'hidden'}" id="menu-${workspace.id}">
            <div data-action="boards" data-workspace-id="${workspace.id}" class="flex items-center space-x-2 px-2 py-1 rounded text-sm transition-colors cursor-pointer ${isSelected && selectedAction === 'boards' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-blue-100'}">
              <svg class="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
              <span>Tableros</span>
            </div>
            <div data-action="members" data-workspace-id="${workspace.id}" class="flex items-center space-x-2 px-2 py-1 rounded text-sm transition-colors cursor-pointer ${isSelected && selectedAction === 'members' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-blue-100'}">
              <svg class="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87M16 3.13a4 4 0 010 7.75M8 3.13a4 4 0 000 7.75"/></svg>
              <span>Miembros</span>
            </div>
            <div data-action="settings" data-workspace-id="${workspace.id}" class="flex items-center space-x-2 px-2 py-1 rounded text-sm transition-colors cursor-pointer ${isSelected && selectedAction === 'settings' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-blue-100'}">
              <svg class="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span>Configuración</span>
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  workspacesList.innerHTML = workspacesHTML;
  console.log('🔧 Sidebar: HTML de workspaces renderizado correctamente');
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

// Función para seleccionar un workspace y acción
function selectWorkspaceAction(workspaceId: string, action: string = 'boards') {
  console.log('🔧 Sidebar: selectWorkspaceAction INICIADO - workspaceId:', workspaceId, 'action:', action);
  console.log('🔧 Sidebar: Estado actual - selectedWorkspaceId:', selectedWorkspaceId, 'selectedAction:', selectedAction, 'expandedWorkspaceId:', expandedWorkspaceId);

  // Si es el mismo workspace y acción, no hacer nada
  if (selectedWorkspaceId === workspaceId && selectedAction === action) {
    console.log('🔧 Sidebar: Ya está seleccionado, no hacer nada');
    return;
  }

  // Actualizar estado
  const previousWorkspaceId = selectedWorkspaceId;
  selectedWorkspaceId = workspaceId;
  selectedAction = action;

  console.log('🔧 Sidebar: Estado actualizado - selectedWorkspaceId:', selectedWorkspaceId, 'selectedAction:', selectedAction);

  // Si cambió de workspace, cerrar el menú del workspace anterior
  if (previousWorkspaceId && previousWorkspaceId !== workspaceId) {
    console.log('🔧 Sidebar: Cerrando menú del workspace anterior:', previousWorkspaceId);
    toggleWorkspaceById(previousWorkspaceId); // Esto lo cerrará si está abierto
  }

  // Para el clic en el nombre del workspace, expandir el menú y mantenerlo expandido
  console.log('🔧 Sidebar: Expandiendo menú del workspace actual para clic en nombre');
  ensureWorkspaceExpanded(workspaceId);

  console.log('🔧 Sidebar: Estado final antes de renderizar - expandedWorkspaceId:', expandedWorkspaceId);

  // Re-renderizar para actualizar la UI
  console.log('🔧 Sidebar: Re-renderizando sidebar para actualizar UI');
  if (currentWorkspaces.length > 0) {
    renderWorkspaces(currentWorkspaces);
    console.log('🔧 Sidebar: Re-renderizado completado');
  } else {
    console.log('🔧 Sidebar: No hay workspaces para renderizar');
  }

  console.log('🔧 Sidebar: selectWorkspaceAction COMPLETADO');
}

// Función para asegurar que un workspace específico esté expandido (sin alternar)
function ensureWorkspaceExpanded(workspaceId: string) {
  console.log('🔧 Sidebar: ensureWorkspaceExpanded llamado para workspaceId:', workspaceId);
  expandedWorkspaceId = workspaceId;
  console.log('🔧 Sidebar: expandedWorkspaceId actualizado a:', expandedWorkspaceId);
}

function handleCreateWorkspace() {
  document.dispatchEvent(new CustomEvent('create-workspace-requested'));
}

// --- FUNCIÓN DE INICIALIZACIÓN REFACTORIZADA ---
function initializeSidebarIsland() {
  const workspacesListEl = document.getElementById('workspaces-list');
  if (workspacesListEl) {
    console.log('🔧 Sidebar: Inicializando event delegation con alta prioridad');

    // Usamos delegación de eventos para manejar todos los clics eficientemente.
    const delegateFn = async (e: Event) => {
      console.log('🔧 Sidebar: ===== NUEVO EVENTO DE CLIC =====');
      console.log('🔧 Sidebar: Evento click capturado:', e.target);
      const target = e.target as HTMLElement;
      console.log('🔧 Sidebar: Target element:', target);
      console.log('🔧 Sidebar: Target tagName:', target.tagName);
      console.log('🔧 Sidebar: Target className:', target.className);
      console.log('🔧 Sidebar: Target dataset:', JSON.stringify(target.dataset, null, 2));

      // PREVENIR cualquier navegación por defecto inmediatamente
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      console.log('🔧 Sidebar: Evento prevenido, procesando...');

      // 1) PRIMERO: Manejar clics en el nombre del workspace (elemento select-workspace) - PRIORIDAD MÁXIMA
      console.log('🔧 Sidebar: Buscando elemento .select-workspace...');
      const workspaceName = target.closest('.select-workspace') as HTMLElement | null;
      console.log('🔧 Sidebar: workspaceName encontrado:', !!workspaceName);
      if (workspaceName) {
        console.log('🔧 Sidebar: ✅ Click en nombre del workspace detectado');
        console.log('🔧 Sidebar: Target element:', target);
        console.log('🔧 Sidebar: workspaceName element:', workspaceName);
        console.log('🔧 Sidebar: workspaceName classes:', workspaceName.className);
        const workspaceId = workspaceName.dataset.workspaceId;
        console.log('🔧 Sidebar: workspaceId obtenido del dataset:', workspaceId);

        if (workspaceId) {
          console.log('🔧 Sidebar: ✅ Ejecutando selección de workspace para boards:', workspaceId);
          // Seleccionar el workspace y mostrar boards
          selectWorkspaceAction(workspaceId, 'boards');
          // Usar el store del dashboard para mostrar los boards
          showWorkspaceBoards(workspaceId);
          console.log('🔧 Sidebar: ✅ showWorkspaceBoards ejecutado');
        } else {
          console.error('❌ 🔧 Sidebar: No se encontró workspaceId en el elemento select-workspace');
        }
        return;
      }
      console.log('🔧 Sidebar: ❌ No se encontró elemento .select-workspace');

      // 2) Manejar clics para expandir/colapsar un workspace (solo si NO fue en select-workspace)
      const toggleEl = target.closest('.workspace-toggle') as HTMLElement | null;
      if (toggleEl && !toggleEl.querySelector('.select-workspace')?.contains(target)) {
        console.log('🔧 Sidebar: Click en toggle, expandiendo/colapsando');
        const id = toggleEl.dataset.workspaceId;
        if (id) toggleWorkspaceById(id);
        return;
      }

      // 3) Manejar clics en elementos del menú desplegable (Tableros, Miembros, Configuración)
      const menuItem = target.closest('[data-action]') as HTMLElement | null;
      if (menuItem && menuItem.dataset.action) {
        console.log('🔧 Sidebar: Click en elemento del menú:', menuItem.dataset.action);
        const action = menuItem.dataset.action;
        const workspaceId = menuItem.dataset.workspaceId;

        if (workspaceId && action) {
          console.log('🔧 Sidebar: Ejecutando selección de workspace y acción:', action, 'para workspace:', workspaceId);
          // Para clics en elementos del menú, mantener el menú expandido
          if (selectedWorkspaceId !== workspaceId) {
            // Si es un workspace diferente, seleccionar y expandir
            selectWorkspaceAction(workspaceId, action);
          } else {
            // Si es el mismo workspace, solo cambiar la acción y mantener expandido
            selectedAction = action;
            console.log('🔧 Sidebar: Acción cambiada a:', action, 'en mismo workspace');
            if (currentWorkspaces.length > 0) {
              renderWorkspaces(currentWorkspaces);
            }
          }
          // Usar el store del dashboard para cambiar la vista
          if (action === 'boards') {
            showWorkspaceBoards(workspaceId);
          } else if (action === 'members') {
            console.log('🔧 Sidebar: Ejecutando showWorkspaceMembers para workspace:', workspaceId);
            showWorkspaceMembers(workspaceId);
          } else if (action === 'settings') {
            showWorkspaceSettings(workspaceId);
          }
        }
        return;
      }

      // 4) Manejar clic en "Crear el primero"
      const createBtn = target.closest('#create-workspace-btn');
      if(createBtn) {
        console.log('🔧 Sidebar: Click en crear workspace');
        handleCreateWorkspace();
        return;
      }

      console.log('🔧 Sidebar: Click no manejado, permitiendo propagación');
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
    console.log('🔧 Sidebar: onAuthStateChanged triggered', user ? 'with user' : 'no user');
    const workspacesList = document.getElementById('workspaces-list');
    if (user) {
      console.log('🔧 Sidebar: Usuario autenticado, UID:', user.uid);
      if (workspacesUnsubscribe) workspacesUnsubscribe();
      workspacesUnsubscribe = subscribeToUserWorkspaces(user.uid, (workspaces: Workspace[]) => {
        console.log('🔧 Sidebar: subscribeToUserWorkspaces callback llamado con', workspaces.length, 'workspaces');
        renderWorkspaces(workspaces);
      });
    } else {
      console.log('🔧 Sidebar: Usuario no autenticado');
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
  console.log('🔧 Sidebar: initSidebarIsland llamado');
  // Lógica de inicialización (sin cambios).
  if (document.readyState === 'loading') {
    console.log('🔧 Sidebar: Document loading, esperando DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', initializeSidebarIsland);
  } else {
    console.log('🔧 Sidebar: Document ready, inicializando inmediatamente');
    initializeSidebarIsland();
  }

  window.addEventListener('beforeunload', cleanupSidebarIsland);

  (window as any).sidebarIsland = {
    renderWorkspaces,
    expandedWorkspaceId: () => expandedWorkspaceId,
    cleanup: cleanupSidebarIsland,
  };
}