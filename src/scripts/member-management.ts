// // src/scripts/member-management.ts
// // Script modular para gestión de miembros estilo Trello
// // REFACTORIZACIÓN: Extraído de dashboard.astro para mejor organización y mantenimiento

import { getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/client';
// auth removed - not used in this module after refactor
import { removeMemberFromWorkspace, changeMemberRole } from '../firebase/api';
import { cancelInvitation } from '../firebase/invitations';
import type { Member } from '../types/domain';

// // INTERFACES Y TIPOS
interface MemberOptionsConfig {
  workspaceId: string;
  userId: string;
  memberEmail: string;
  isOwner: boolean;
  isCurrentUser: boolean;
  canManage: boolean;
}

interface MemberManagementState {
  currentWorkspaceId: string | null;
  currentUser: any;
  currentUserRole: string;
}

// // ESTADO GLOBAL DEL MÓDULO
const state: MemberManagementState = {
  currentWorkspaceId: null,
  currentUser: null,
  currentUserRole: 'member'
};

// // FUNCIÓN PRINCIPAL: Mostrar menú contextual de opciones para miembros
export function showMemberOptionsMenu(triggerElement: HTMLElement, options: MemberOptionsConfig) {
  console.log('🔧 showMemberOptionsMenu llamada con opciones:', options);
  
  // // Remover cualquier menú existente
  document.getElementById('member-options-menu')?.remove();
  
  const rect = triggerElement.getBoundingClientRect();
  const menuItems = [];
  
  // // Opciones para el usuario actual (abandonar workspace)
  if (options.isCurrentUser && !options.isOwner) {
    menuItems.push(`
      <button class="menu-item text-left w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2" 
              data-action="leave">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
        </svg>
        <span>Abandonar espacio de trabajo</span>
      </button>
    `);
  }
  
  // // Opciones para administradores sobre otros miembros
  if (options.canManage && !options.isCurrentUser && !options.isOwner) {
    // // Cambiar rol
    menuItems.push(`
      <button class="menu-item text-left w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2" 
              data-action="change-role">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
        </svg>
        <span>Cambiar rol</span>
      </button>
    `);
    
    // // Eliminar miembro
    menuItems.push(`
      <button class="menu-item text-left w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2" 
              data-action="remove">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
        </svg>
        <span>Eliminar del espacio de trabajo</span>
      </button>
    `);
  }
  
  // // Si no hay opciones disponibles, no mostrar menú
  if (menuItems.length === 0) {
    console.log('🔧 No hay opciones disponibles para este miembro');
    return;
  }
  
  // // Crear y mostrar el menú
  const menuHTML = `
    <div id="member-options-menu" class="fixed z-50 bg-white rounded-lg border border-gray-200 shadow-lg py-1 min-w-48" 
         style="left: ${rect.right - 192}px; top: ${rect.bottom + 5}px;">
      ${menuItems.join('')}
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', menuHTML);
  
  // // Event listeners para las opciones del menú
  document.querySelectorAll('#member-options-menu .menu-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      const action = (e.currentTarget as HTMLElement).dataset.action;
      document.getElementById('member-options-menu')?.remove();
      
      await handleMenuAction(action, options);
    });
  });
  
  // // Cerrar menú al hacer clic fuera
  setTimeout(() => {
    const closeMenu = (e: Event) => {
      if (!document.getElementById('member-options-menu')?.contains(e.target as Node)) {
        document.getElementById('member-options-menu')?.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    document.addEventListener('click', closeMenu);
  }, 10);
}

// // FUNCIÓN: Manejar acciones del menú
async function handleMenuAction(action: string | undefined, options: MemberOptionsConfig) {
  if (!action) return;
  
  switch (action) {
    case 'leave':
      await handleLeaveMember(options);
      break;
    case 'remove':
      await handleRemoveMember(options);
      break;
    case 'change-role':
      showRoleChangeModal(options);
      break;
    default:
      console.warn('Acción no reconocida:', action);
  }
}

// // FUNCIÓN: Manejar que un miembro abandone el workspace
async function handleLeaveMember(options: MemberOptionsConfig) {
  if (!confirm('¿Estás seguro de que quieres abandonar este espacio de trabajo?')) {
    return;
  }
  
  try {
    // // Buscar el miembro en el workspace para obtener el objeto completo
    const memberObject = await findMemberInWorkspace(options.workspaceId, options.userId);
    if (!memberObject) {
      throw new Error('Miembro no encontrado');
    }
    
    const result = await removeMemberFromWorkspace(options.workspaceId, memberObject);
    
    if (result.success) {
      showToast('Has abandonado el espacio de trabajo', 'success');
      // // Si es el usuario actual, redirigir al dashboard
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      showToast('Error al abandonar el espacio de trabajo: ' + result.error, 'error');
    }
  } catch (error) {
    console.error('❌ Error al abandonar workspace:', error);
    showToast('Error al abandonar el espacio de trabajo', 'error');
  }
}

// // FUNCIÓN: Remover miembro del workspace
async function handleRemoveMember(options: MemberOptionsConfig) {
  if (!confirm(`¿Estás seguro de que quieres eliminar a ${options.memberEmail} del espacio de trabajo?`)) {
    return;
  }
  
  try {
    // // Buscar el miembro en el workspace para obtener el objeto completo
    const memberObject = await findMemberInWorkspace(options.workspaceId, options.userId);
    if (!memberObject) {
      throw new Error('Miembro no encontrado');
    }
    
    const result = await removeMemberFromWorkspace(options.workspaceId, memberObject);
    
    if (result.success) {
      showToast('Miembro eliminado exitosamente', 'success');
      // // Recargar lista de miembros
      await reloadMembersList(options.workspaceId);
    } else {
      showToast('Error eliminando miembro: ' + result.error, 'error');
    }
  } catch (error) {
    console.error('❌ Error eliminando miembro:', error);
    showToast('Error eliminando miembro del espacio de trabajo', 'error');
  }
}

// // FUNCIÓN: Mostrar modal para cambiar rol
function showRoleChangeModal(options: MemberOptionsConfig) {
  // // Remover modal existente
  document.getElementById('role-change-modal')?.remove();
  
  const modalHTML = `
    <div id="role-change-modal" class="fixed inset-0 z-50">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
      <div class="relative flex items-center justify-center min-h-screen p-4">
        <div class="bg-white rounded-lg shadow-xl w-full max-w-sm">
          <div class="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 class="text-lg font-semibold text-gray-800">Cambiar rol</h3>
            <button id="close-role-modal" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          <div class="p-4">
            <p class="text-sm text-gray-600 mb-4">Cambiar el rol de ${options.memberEmail}</p>
            
            <div class="space-y-2">
              <label class="flex items-center">
                <input type="radio" name="new-role" value="admin" class="mr-2">
                <span class="text-sm">Administrador</span>
              </label>
              <label class="flex items-center">
                <input type="radio" name="new-role" value="member" class="mr-2" checked>
                <span class="text-sm">Miembro</span>
              </label>
            </div>
          </div>
          
          <div class="flex justify-end space-x-2 p-4 border-t border-gray-200">
            <button id="cancel-role-change" class="px-4 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300">
              Cancelar
            </button>
            <button id="confirm-role-change" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Cambiar Rol
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // // Event listeners del modal
  document.getElementById('close-role-modal')?.addEventListener('click', () => {
    document.getElementById('role-change-modal')?.remove();
  });
  
  document.getElementById('cancel-role-change')?.addEventListener('click', () => {
    document.getElementById('role-change-modal')?.remove();
  });
  
  document.getElementById('confirm-role-change')?.addEventListener('click', async () => {
    const selectedRole = (document.querySelector('input[name="new-role"]:checked') as HTMLInputElement)?.value;
    
    if (selectedRole) {
      await handleRoleChange(options, selectedRole);
      document.getElementById('role-change-modal')?.remove();
    }
  });
}

// // FUNCIÓN: Cambiar rol de miembro
async function handleRoleChange(options: MemberOptionsConfig, newRole: string) {
  try {
    const result = await changeMemberRole(options.workspaceId, options.userId, newRole as 'admin' | 'member');
    
    if (result.success) {
      showToast('Rol cambiado exitosamente', 'success');
      // // Recargar lista de miembros
      await reloadMembersList(options.workspaceId);
    } else {
      showToast('Error cambiando rol: ' + result.error, 'error');
    }
  } catch (error) {
    console.error('❌ Error cambiando rol:', error);
    showToast('Error cambiando rol del miembro', 'error');
  }
}

// // FUNCIÓN AUXILIAR: Buscar miembro en workspace
async function findMemberInWorkspace(workspaceId: string, userId: string): Promise<Member | null> {
  try {
    const docRef = doc(db, "workspaces", workspaceId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const workspace = docSnap.data();
    const members = workspace.members || [];
    
    return members.find((member: Member) => member.userId === userId) || null;
  } catch (error) {
    console.error('❌ Error buscando miembro:', error);
    return null;
  }
}

// // FUNCIÓN AUXILIAR: Recargar lista de miembros
async function reloadMembersList(workspaceId: string) {
  // // Buscar si existe el componente MemberManagement
  if (typeof (window as any).MemberManagement?.loadWorkspaceMembers === 'function') {
    await (window as any).MemberManagement.loadWorkspaceMembers(workspaceId);
  } else {
    // // Fallback: recargar página
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }
}

// // FUNCIÓN AUXILIAR: Mostrar toast
function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  if (typeof (window as any).showToast === 'function') {
    (window as any).showToast({ message, type });
  } else {
    console.log(`[${type.toUpperCase()}] ${message}`);
    alert(message); // // Fallback básico
  }
}

// // FUNCIÓN: Cancelar invitación (handler dedicado)
export async function cancelInvitationHandler(invitationId: string): Promise<void> {
  if (!confirm('¿Estás seguro de que quieres cancelar esta invitación?')) {
    return;
  }
  
  try {
    const result = await cancelInvitation(invitationId);
    if (result.success) {
      showToast('Invitación cancelada exitosamente', 'success');
      // // Recargar miembros e invitaciones
      if (state.currentWorkspaceId) {
        await reloadMembersList(state.currentWorkspaceId);
      }
    } else {
      showToast('Error cancelando invitación: ' + result.error, 'error');
    }
  } catch (error) {
    console.error('❌ Error cancelando invitación:', error);
    showToast('Error inesperado cancelando invitación', 'error');
  }
}

// // FUNCIÓN: Establecer estado del módulo
export function setMemberManagementState(workspaceId: string, user: any, userRole: string) {
  state.currentWorkspaceId = workspaceId;
  state.currentUser = user;
  state.currentUserRole = userRole;
}

// // FUNCIÓN: Obtener estado actual
export function getMemberManagementState() {
  return { ...state };
}

// // EXPORTAR TODAS LAS FUNCIONES PRINCIPALES
export {
  handleLeaveMember,
  handleRemoveMember,
  showRoleChangeModal,
  handleRoleChange,
  findMemberInWorkspace,
  reloadMembersList
};

// // HACER FUNCIONES DISPONIBLES GLOBALMENTE (compatibilidad con código existente)
if (typeof window !== 'undefined') {
  (window as any).MemberManagementUtils = {
    showMemberOptionsMenu,
    cancelInvitationHandler,
    setMemberManagementState,
    getMemberManagementState,
    handleLeaveMember,
    handleRemoveMember,
    showRoleChangeModal
  };
}
