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

  // // CAMBIO: renderizar cada workspace como un ítem de menú vertical compacto
  // // Mantener acceso por teclado y roles ARIA: el toggle es un botón que expande/colapsa
  const workspacesHTML = workspaces.map((workspace: Workspace) => {
    const isExpanded = expandedWorkspaceId === workspace.id;
    const memberCount = (workspace.members && workspace.members.length) || 0;
    const boardCount = (workspace.boards && workspace.boards.length) || 0;

    // // CAMBIO: generar exactamente el markup solicitado (menú tipo Trello)
    return `
      <div class="workspace-item" data-workspace-id="${workspace.id}">
        <!-- header: ahora el header completo es el toggle para mejorar usabilidad -->
        <div class="flex items-center justify-between workspace-toggle" data-workspace-id="${workspace.id}" aria-expanded="${isExpanded ? 'true' : 'false'}">
          <div class="flex items-center space-x-2">
            <div class="w-6 h-6 bg-pink-500 rounded flex items-center justify-center text-xs font-bold">${workspace.name?.split(' ').map((w:any)=>w[0]).join('').toUpperCase().slice(0,1) || ''}</div>
            <span class="text-gray-900 text-sm">${workspace.name || 'Workspace'}</span>
          </div>
          <div class="text-gray-400 hover:text-white">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>

        
          <div class="workspace-menu ml-8 mt-1 space-y-1 ${isExpanded ? '' : 'hidden'}" id="menu-${workspace.id}">
          <a href="#" data-action="boards" data-workspace-id="${workspace.id}" class="flex items-center space-x-2 text-black hover:bg-blue-500 px-2 py-1 rounded text-sm transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            <span>Tableros</span>
          </a>
          <a href="#" data-action="members" data-workspace-id="${workspace.id}" class="flex items-center space-x-2 text-black hover:bg-blue-500 px-2 py-1 rounded text-sm transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path></svg>
            <span>Miembros</span>
              <button class="text-gray-400 hover:text-white ml-auto"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg></button>
          </a>
          <a href="#" data-action="config" data-workspace-id="${workspace.id}" class="flex items-center space-x-2 text-black hover:bg-blue-500 px-2 py-1 rounded text-sm transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            <span>Configuración</span>
          </a>
        </div>
      </div>
    `;
  }).join('');

  // debug: cuantos workspaces vamos a renderizar
  console.log('[sidebar-island] renderWorkspaces: rendering', workspaces.length, 'workspaces');
  workspacesList.innerHTML = workspacesHTML;

  // Note: we rely on a single delegated handler attached to the container
  // to avoid double-toggling when clicks bubble. Do NOT attach per-item
  // listeners here.
}

function handleWorkspaceToggle(event: Event) {
  const button = event.currentTarget as HTMLElement;
  const workspaceId = button.dataset.workspaceId;
  if (!workspaceId) return;

  // // CAMBIO: buscar el menú generado (.workspace-menu) y la flecha dentro del toggle
  const isCurrentlyExpanded = expandedWorkspaceId === workspaceId;
  // debug: log toggle events y estado
  console.log('[sidebar-island] toggle workspace:', workspaceId, 'currentlyExpanded:', isCurrentlyExpanded);
  expandedWorkspaceId = isCurrentlyExpanded ? null : workspaceId;

  document.querySelectorAll('.workspace-item').forEach(item => {
    const itemEl = item as HTMLElement;
    const itemWorkspaceId = itemEl.dataset.workspaceId;

    // menu generado que contiene Tableros/Miembros/Configuración
    const menu = itemEl.querySelector('.workspace-menu') as HTMLElement | null || document.getElementById(`menu-${itemWorkspaceId}`) as HTMLElement | null;
    // flecha svg dentro del toggle
    const arrow = itemEl.querySelector('.workspace-toggle svg');

    if (itemWorkspaceId === workspaceId) {
      if (isCurrentlyExpanded) {
        menu?.classList.add('hidden');
        arrow?.classList.remove('rotate-90');
      } else {
        menu?.classList.remove('hidden');
        arrow?.classList.add('rotate-90');
      }
    } else {
      menu?.classList.add('hidden');
      arrow?.classList.remove('rotate-90');
    }
  });
}

// Helper para togglear por id (útil para delegación de eventos)
function toggleWorkspaceById(workspaceId: string) {
  const isCurrentlyExpanded = expandedWorkspaceId === workspaceId;
  console.log('[sidebar-island] toggleWorkspaceById:', workspaceId, 'currentlyExpanded:', isCurrentlyExpanded);
  expandedWorkspaceId = isCurrentlyExpanded ? null : workspaceId;

  document.querySelectorAll('.workspace-item').forEach(item => {
    const itemEl = item as HTMLElement;
    const itemWorkspaceId = itemEl.dataset.workspaceId;

    const menu = itemEl.querySelector('.workspace-menu') as HTMLElement | null || document.getElementById(`menu-${itemWorkspaceId}`) as HTMLElement | null;
    const arrow = itemEl.querySelector('.workspace-toggle svg');

    if (itemWorkspaceId === workspaceId) {
      if (isCurrentlyExpanded) {
        menu?.classList.add('hidden');
        arrow?.classList.remove('rotate-90');
      } else {
        menu?.classList.remove('hidden');
        arrow?.classList.add('rotate-90');
      }
    } else {
      menu?.classList.add('hidden');
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

  // Delegated handler: clicks inside #workspaces-list toggle the workspace
  const workspacesListEl = document.getElementById('workspaces-list');
  if (workspacesListEl) {
    // remove existing to avoid duplicate listeners
    (workspacesListEl as any)._delegateAttached && workspacesListEl.removeEventListener('click', (workspacesListEl as any)._delegateFn);
    const delegateFn = (e: Event) => {
      const target = e.target as HTMLElement;

      // 1) If click is on a workspace action link (data-action), handle navigation
      const actionEl = target.closest('[data-action]') as HTMLElement | null;
      if (actionEl) {
        e.preventDefault();
        const action = actionEl.dataset.action;
        const wid = actionEl.dataset.workspaceId;
        if (!action || !wid) return;

        const dashboard = (window as any).dashboardIslands;

  // Prefer SPA navigation via dashboard islands if available
  if (dashboard && typeof dashboard.navigateToWorkspace === 'function') {
          // navigateToWorkspace returns a Promise in the dashboard implementation
          try {
            // call SPA navigate and then request the correct tab when necessary
            (dashboard.navigateToWorkspace as Function)(wid).then(() => {
              // // Si la API SPA expone switchWorkspaceTab, usarla para cambiar pestañas
              if (action === 'members' && typeof dashboard.switchWorkspaceTab === 'function') {
                dashboard.switchWorkspaceTab('members');
                return;
              }

              if (action === 'boards' && typeof dashboard.switchWorkspaceTab === 'function') {
                dashboard.switchWorkspaceTab('boards');
                return;
              }

              if (action === 'config') {
                // // Si no hay pestaña de config implementada, mostrar mensaje amistoso
                if (typeof dashboard.showToast === 'function') dashboard.showToast('Configuración en desarrollo', 'info');
                else console.log('[sidebar-island] config clicked for', wid);
                return;
              }
            }).catch((err: any) => {
              console.error('[sidebar-island] dashboard.navigateToWorkspace failed, falling back to internal handlers', err);
              // // FALLBACK: intentar usar funciones públicas existentes sin recargar la página
              // // 1) Si existe showBoardsView (BoardOverview), llamarla y activar pestaña si es necesario
              const showBoardsView = (window as any).showBoardsView;
              if (typeof showBoardsView === 'function') {
                // // Mostrar la vista de tableros para el workspace
                try { showBoardsView(wid); } catch (e) { console.error(e); }
                if (action === 'members') {
                  // // Activar la pestaña miembros dentro del main
                  setTimeout(() => { document.getElementById('members-tab')?.click(); }, 150);
                }
                if (action === 'config') {
                  setTimeout(() => { document.getElementById('config-tab')?.click(); }, 150);
                }
                return;
              }

              // // Último recurso: navegación completa a rutas existentes
              if (action === 'boards') window.location.href = `/workspace/${wid}/boards`;
              else if (action === 'members') window.location.href = `/workspace/${wid}/boards`;
              else if (action === 'config') window.location.href = `/workspace/${wid}/settings`;
            });
          } catch (err) {
            console.error('[sidebar-island] error calling dashboard API:', err);
          }

        } else {
          // // No SPA API available: intentar handlers internos antes de hacer full navigation
          // // 1) Usar showBoardsView si está disponible (evita recarga completa)
          const showBoardsView = (window as any).showBoardsView;
          if (typeof showBoardsView === 'function') {
            // // Mostrar la vista de tableros y activar la pestaña correspondiente
            try { showBoardsView(wid); } catch (e) { console.error(e); }
            if (action === 'members') setTimeout(() => { document.getElementById('members-tab')?.click(); }, 150);
            if (action === 'config') setTimeout(() => { document.getElementById('config-tab')?.click(); }, 150);
            return;
          }

          // // Último recurso: navegación completa
          if (action === 'boards') window.location.href = `/workspace/${wid}/boards`;
          else if (action === 'members') window.location.href = `/workspace/${wid}/boards`;
          else if (action === 'config') window.location.href = `/workspace/${wid}/settings`;
        }

        return;
      }

      // 2) only toggle when the click is on the header (.workspace-toggle) or one of its children
      const toggleEl = target.closest('.workspace-toggle') as HTMLElement | null;
      if (!toggleEl) return;
      const id = toggleEl.dataset.workspaceId;
      if (!id) return;
      // use helper to toggle
      toggleWorkspaceById(id);
    };
    workspacesListEl.addEventListener('click', delegateFn);
    (workspacesListEl as any)._delegateAttached = true;
    (workspacesListEl as any)._delegateFn = delegateFn;
  }

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
