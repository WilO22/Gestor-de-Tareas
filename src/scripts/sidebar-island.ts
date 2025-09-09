// src/scripts/sidebar-island.ts

import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/auth';
import { subscribeToUserWorkspaces } from '../firebase/api';
import type { Workspace as DomainWorkspace } from '../types/domain';

type Workspace = DomainWorkspace;

let expandedWorkspaceId: string | null = null;
let workspacesUnsubscribe: (() => void) | null = null;

// --- NUEVA FUNCIÓN PRINCIPAL PARA NAVEGACIÓN DINÁMICA ---
// Carga el contenido de una URL y lo inyecta en el contenedor principal del dashboard.
async function loadContent(url: string, pushState = true) {
  const contentContainer = document.getElementById('dashboard-content');
  if (!contentContainer) {
    // Si no se encuentra el contenedor, recurrir a la navegación completa como fallback.
    window.location.href = url;
    return;
  }

  // // 1. Muestra un estado de carga visual para el usuario.
  contentContainer.style.opacity = '0.5';
  contentContainer.style.transition = 'opacity 0.2s ease-in-out';

  try {
    // // 2. Realiza la petición para obtener el HTML de la página de destino.
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok.');
    const html = await response.text();

    // // 3. Parsea el HTML recibido para poder buscar en su DOM.
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // // 4. Busca el contenedor de contenido en la página que hemos cargado.
    const newContent = doc.getElementById('dashboard-content');

    if (newContent) {
      // // 5. Reemplaza el contenido antiguo con el nuevo.
      contentContainer.innerHTML = newContent.innerHTML;

      // // 6. Si es una nueva navegación (no un 'atrás'/'adelante'), actualiza la URL en el navegador.
      if (pushState) {
        history.pushState({ path: url }, '', url);
      }
    } else {
      // Fallback si el nuevo contenido no tiene el contenedor esperado.
      throw new Error("Contenedor '#dashboard-content' no encontrado en la página cargada.");
    }
  } catch (error) {
    console.error('Error al cargar contenido dinámicamente, redirigiendo:', error);
    window.location.href = url; // Redirección completa como fallback en caso de error.
  } finally {
    // // 7. Restaura la opacidad para mostrar el nuevo contenido.
    contentContainer.style.opacity = '1';
  }
}


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
      
      // // CAMBIO: Los href ahora apuntan a las URLs reales.
      return `
        <div class="workspace-item" data-workspace-id="${workspace.id}">
          <div class="flex items-center justify-between workspace-toggle cursor-pointer" data-workspace-id="${workspace.id}" aria-expanded="${isExpanded ? 'true' : 'false'}">
            <div class="flex items-center space-x-2">
              <div class="w-6 h-6 bg-pink-500 rounded flex items-center justify-center text-xs font-bold">${initials}</div>
              <span class="text-gray-900 text-sm">${workspace.name || 'Workspace'}</span>
            </div>
            <div class="text-gray-400 hover:text-white">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>

          <div class="workspace-menu ml-8 mt-1 space-y-1 ${isExpanded ? '' : 'hidden'}" id="menu-${workspace.id}">
            <a href="/workspace/${workspace.id}/boards" data-action="boards" data-workspace-id="${workspace.id}" class="flex items-center space-x-2 text-black hover:bg-blue-500 px-2 py-1 rounded text-sm transition-colors">
              <span>Tableros</span>
            </a>
            <a href="/dashboard-refactored?tab=members&workspaceId=${workspace.id}" data-action="members" data-workspace-id="${workspace.id}" class="flex items-center space-x-2 text-black hover:bg-blue-500 px-2 py-1 rounded text-sm transition-colors">
              <span>Miembros</span>
            </a>
            <a href="/dashboard-refactored?tab=settings&workspaceId=${workspace.id}" data-action="config" data-workspace-id="${workspace.id}" class="flex items-center space-x-2 text-black hover:bg-blue-500 px-2 py-1 rounded text-sm transition-colors">
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

      // 1) Manejar clics en los enlaces de navegación (Tableros, Miembros, etc.)
      const actionLink = target.closest('a[data-action]') as HTMLAnchorElement | null;
      if (actionLink) {
        e.preventDefault(); // Prevenir la navegación de página completa.
        await loadContent(actionLink.href); // Cargar el contenido dinámicamente.
        return;
      }

      // 2) Manejar clics para expandir/colapsar un workspace.
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
  
  // // NUEVO: Listener para los botones de atrás/adelante del navegador.
  window.addEventListener('popstate', (event) => {
    if (event.state && event.state.path) {
      loadContent(event.state.path, false); // Carga el contenido sin crear una nueva entrada en el historial.
    } else if (location.pathname.startsWith('/workspace/')) {
      // Fallback para casos donde el state no esté seteado
      loadContent(location.href, false)
    }
  });
}

function cleanupSidebarIsland() {
  if (workspacesUnsubscribe) {
    workspacesUnsubscribe();
    workspacesUnsubscribe = null;
  }
  // No es necesario limpiar el listener de popstate generalmente.
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