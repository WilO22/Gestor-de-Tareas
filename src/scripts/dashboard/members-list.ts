// Module extracted from src/components/dashboard/MembersList.astro
// Exported functions so the component can import and initialize in a processed script

interface Member { [key: string]: any }

// Prefer dataset on the component root (#members-list-root). Fallback to document.body for older pages.
const _membersListRoot = document.getElementById('members-list-root');
const WORKSPACE_ID = _membersListRoot?.dataset.workspaceId || document.body.dataset.workspaceId || '';
const CURRENT_USER_ID = _membersListRoot?.dataset.currentUserId || document.body.dataset.currentUserId || '';
const CURRENT_USER_ROLE = _membersListRoot?.dataset.currentUserRole || document.body.dataset.currentUserRole || '';
const CAN_MANAGE_MEMBERS = (_membersListRoot?.dataset.canManageMembers === 'true') || CURRENT_USER_ROLE === 'owner' || CURRENT_USER_ROLE === 'admin';

let membersData = {
  activeMembers: [] as Member[],
  pendingInvitations: [] as any[],
  loading: true
};

const elements = {
  activeMembersList: document.getElementById('active-members-list'),
  pendingInvitationsList: document.getElementById('pending-invitations-list'),
  activeMembersCount: document.getElementById('active-members-count'),
  pendingInvitationsCount: document.getElementById('pending-invitations-count'),
  membersCount: document.getElementById('members-count'),
  emptyState: document.getElementById('empty-state'),
  inviteMemberBtn: document.getElementById('invite-member-btn')
};

export async function loadMembersData() {
  if (!WORKSPACE_ID) {
    console.error('❌ MembersList: Workspace ID no encontrado');
    showError('Error: Workspace no identificado');
    return;
  }

  try {
    if (typeof (window as any).getWorkspaceMembers !== 'function') {
      throw new Error('Servicio de Firebase no disponible');
    }

    const activeMembers = await (window as any).getWorkspaceMembers(WORKSPACE_ID);

    let pendingInvitations: any[] = [];
    if (CAN_MANAGE_MEMBERS && typeof (window as any).getPendingInvitations === 'function') {
      pendingInvitations = await (window as any).getPendingInvitations(WORKSPACE_ID);
    }

    membersData = {
      activeMembers,
      pendingInvitations,
      loading: false
    };

    renderMembers();
  } catch (error) {
    console.error('❌ MembersList: Error cargando miembros:', error);
    showError('Error cargando miembros del workspace');
    hideLoadingState();
  }
}

function renderMembers() {
  if (!elements.activeMembersList) return;

  const { activeMembers, pendingInvitations } = membersData as any;

  if (activeMembers.length === 0) {
    elements.activeMembersList.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <div class="text-gray-400 mb-2">
          <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m3 5.197H9m3 0a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
        </div>
        No hay miembros activos
      </div>
    `;
  } else {
    elements.activeMembersList.innerHTML = activeMembers.map((member: Member) => createMemberCardHTML(member)).join('');

    setTimeout(() => {
      if (typeof (window as any).setupMemberCardEvents === 'function') {
        (window as any).setupMemberCardEvents();
      }
    }, 100);
  }

  if (elements.pendingInvitationsList && CAN_MANAGE_MEMBERS) {
    if (pendingInvitations.length === 0) {
      elements.pendingInvitationsList.innerHTML = `
        <div class="text-center py-4 text-gray-500">
          <div class="text-gray-400 mb-2">
            <svg class="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
          </div>
          No hay invitaciones pendientes
        </div>
      `;
    } else {
      elements.pendingInvitationsList.innerHTML = pendingInvitations.map((invitation: any) => createInvitationCardHTML(invitation)).join('');

      setTimeout(() => {
        if (typeof (window as any).setupInvitationCardEvents === 'function') {
          (window as any).setupInvitationCardEvents();
        }
      }, 100);
    }
  }

  updateCounters();

  const totalItems = (membersData as any).activeMembers.length + (membersData as any).pendingInvitations.length;
  if (totalItems === 0 && elements.emptyState) {
    elements.emptyState.classList.remove('hidden');
  } else if (elements.emptyState) {
    elements.emptyState.classList.add('hidden');
  }
}

function createMemberCardHTML(member: Member): string {
  const canManageThisMember = CAN_MANAGE_MEMBERS && member.userId !== CURRENT_USER_ID;
  const isCurrentUser = member.userId === CURRENT_USER_ID;

  return `
    <div class="member-card flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors">
      <div class="flex items-center space-x-3">
        <div class="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
          ${(member.name ? member.name.charAt(0).toUpperCase() : (member.email || '').charAt(0).toUpperCase())}
        </div>
        
        <div class="flex-1 min-w-0">
          <h4 class="font-medium text-gray-900">${member.name || member.email}</h4>
          ${member.name && member.email ? `<p class="text-sm text-gray-500">${member.email}</p>` : ''}
          <div class="flex items-center space-x-2 mt-1">
            <span class="px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeClass(member.role)}">${getRoleDisplayName(member.role)}</span>
            ${isCurrentUser ? '<span class="text-xs text-blue-600 font-medium">(Tú)</span>' : ''}
          </div>
        </div>
      </div>
      
      ${canManageThisMember ? `
        <div class="relative">
          <button 
            class="member-options-btn text-gray-400 hover:text-gray-600 p-2 rounded transition-colors"
            data-member-id="${member.userId}"
            data-member-email="${member.email}"
            data-member-role="${member.role}"
            data-member-name="${member.name || ''}"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
            </svg>
          </button>
        </div>
      ` : ''}
    </div>
  `;
}

function createInvitationCardHTML(invitation: any): string {
  return `
    <div class="invitation-card flex items-center justify-between p-4 border border-yellow-200 rounded-lg bg-yellow-50 hover:bg-yellow-100 transition-colors">
      <div class="flex items-center space-x-3">
        <div class="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
          ${invitation.inviteeEmail.charAt(0).toUpperCase()}
        </div>
        
        <div class="flex-1 min-w-0">
          <h4 class="font-medium text-gray-900">${invitation.inviteeEmail}</h4>
          <p class="text-sm text-yellow-700">Invitación pendiente</p>
          ${invitation.inviterName ? `<p class="text-xs text-gray-500">Invitado por ${invitation.inviterName}</p>` : ''}
        </div>
      </div>
      
      <div class="flex items-center space-x-2">
        <button 
          class="cancel-invitation-btn text-red-600 hover:text-red-800 p-2 rounded transition-colors"
          data-invitation-id="${invitation.id}"
          data-invitee-email="${invitation.inviteeEmail}"
          title="Cancelar invitación"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    </div>
  `;
}

function getRoleBadgeClass(role: string): string {
  switch (role) {
    case 'owner': return 'bg-purple-100 text-purple-800';
    case 'admin': return 'bg-blue-100 text-blue-800';
    case 'member': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function getRoleDisplayName(role: string): string {
  switch (role) {
    case 'owner': return 'Propietario';
    case 'admin': return 'Administrador';
    case 'member': return 'Miembro';
    default: return 'Miembro';
  }
}

function updateCounters() {
  if (elements.activeMembersCount) {
    elements.activeMembersCount.textContent = (membersData as any).activeMembers.length.toString();
  }

  if (elements.pendingInvitationsCount) {
    elements.pendingInvitationsCount.textContent = (membersData as any).pendingInvitations.length.toString();
  }

  if (elements.membersCount) {
    const total = (membersData as any).activeMembers.length + (membersData as any).pendingInvitations.length;
    elements.membersCount.textContent = `${total} total`;
  }
}

function hideLoadingState() {
  document.querySelectorAll('.loading-placeholder').forEach(el => {
    (el as HTMLElement).style.display = 'none';
  });
}

function showError(message: string) {
  if (typeof (window as any).showToast === 'function') {
    (window as any).showToast({ message, type: 'error' });
  } else {
    console.error(message);
  }
  hideLoadingState();
}

function setupMembersListEvents() {
  if (elements.inviteMemberBtn) {
    elements.inviteMemberBtn.addEventListener('click', () => {
      if (typeof (window as any).openInviteMemberModal === 'function') {
        (window as any).openInviteMemberModal();
      } else {
        console.log('Función de invitar miembro no disponible');
      }
    });
  }

  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;

    if (target.closest('.member-options-btn')) {
      e.preventDefault();
      e.stopPropagation();

      const btn = target.closest('.member-options-btn') as HTMLElement;
      const memberId = btn.dataset.memberId;
      const memberEmail = btn.dataset.memberEmail;
      const memberRole = btn.dataset.memberRole;
      const memberName = btn.dataset.memberName;

      if (typeof (window as any).showMemberOptionsMenu === 'function') {
        (window as any).showMemberOptionsMenu(memberId, memberEmail, memberRole, memberName, btn);
      }
    }

    if (target.closest('.cancel-invitation-btn')) {
      e.preventDefault();
      e.stopPropagation();

      const btn = target.closest('.cancel-invitation-btn') as HTMLElement;
      const invitationId = btn.dataset.invitationId;
      const inviteeEmail = btn.dataset.inviteeEmail;

      if (confirm(`¿Estás seguro de que quieres cancelar la invitación a ${inviteeEmail}?`)) {
        if (typeof (window as any).MemberManagementUtils?.cancelInvitationHandler === 'function') {
          (window as any).MemberManagementUtils.cancelInvitationHandler(invitationId);
        }
      }
    }
  });
}

export function reloadMembersData() {
  membersData.loading = true;
  if (elements.activeMembersList) {
    elements.activeMembersList.innerHTML = `
      <div class="loading-placeholder text-center py-8 text-gray-500">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        Cargando miembros...
      </div>
    `;
  }
  loadMembersData();
}

export function initializeMembersList() {
  console.log('🚀 MembersList: Inicializando componente...');
  setupMembersListEvents();
  loadMembersData();
}

export const membersListComponent = {
  reload: reloadMembersData,
  getMembersData: () => membersData
};
