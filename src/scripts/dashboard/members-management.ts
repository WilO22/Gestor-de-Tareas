import { onAuthStateChanged, auth } from '../../firebase/auth';
import { getWorkspaceMembers } from '../../firebase/api';
import { getWorkspaceInvitations, cancelInvitation } from '../../firebase/invitations';
import type { Member, Invitation } from '../../types/domain';
import { formatRelativeTime } from '../../utils/date.utils';

interface ComponentState {
  activeMembers: Member[];
  pendingInvitations: Invitation[];
  loading: boolean;
  error: string | null;
  activeTab: 'members' | 'invitations';
  currentUser: any | null;
}

function readDataset() {
  // Use dataset attributes from the island's root element when available.
  const root = document.getElementById('members-management-view');
  const workspaceId = root?.dataset.workspaceId || document.body.dataset.workspaceId || '';
  const currentUserId = root?.dataset.currentUserId || document.body.dataset.currentUserId || '';
  const currentUserRole = root?.dataset.currentUserRole || document.body.dataset.currentUserRole || 'member';
  const canManageMembers = (root?.dataset.canManageMembers === 'true') || (document.body.dataset.currentUserRole === 'owner') || (document.body.dataset.currentUserRole === 'admin');
  return { workspaceId, currentUserId, currentUserRole, canManageMembers };
}

export function initializeMembersManagementIsland() {
  const { workspaceId, currentUserId: _currentUserId, canManageMembers } = readDataset();

  console.log('🏝️ MembersManagementIsland: Hidratando en cliente para workspace', workspaceId);

  const state: ComponentState = {
    activeMembers: [],
    pendingInvitations: [],
    loading: true,
    error: null,
    activeTab: 'members',
    currentUser: null
  };

  const elements = {
    membersList: document.getElementById('members-list'),
    invitationsList: document.getElementById('invitations-list'),
    membersCount: document.getElementById('members-count'),
    activeMembersBadge: document.getElementById('active-members-badge'),
    pendingInvitationsBadge: document.getElementById('pending-invitations-badge'),
    membersEmpty: document.getElementById('members-empty'),
    invitationsEmpty: document.getElementById('invitations-empty'),
    inviteBtn: document.getElementById('invite-member-btn'),
    membersTab: document.getElementById('members-tab'),
    invitationsTab: document.getElementById('invitations-tab'),
    membersContent: document.getElementById('members-content'),
    invitationsContent: document.getElementById('invitations-content')
  } as const;

  function switchTab(tabName: 'members' | 'invitations') {
    state.activeTab = tabName;
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.remove('active', 'border-blue-500', 'text-blue-600');
      btn.classList.add('border-transparent', 'text-gray-500');
    });

    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.add('hidden');
      pane.classList.remove('active');
    });

    if (tabName === 'members') {
      elements.membersTab?.classList.add('active', 'border-blue-500', 'text-blue-600');
      elements.membersTab?.classList.remove('border-transparent', 'text-gray-500');
      elements.membersContent?.classList.remove('hidden');
      elements.membersContent?.classList.add('active');
    } else {
      elements.invitationsTab?.classList.add('active', 'border-blue-500', 'text-blue-600');
      elements.invitationsTab?.classList.remove('border-transparent', 'text-gray-500');
      elements.invitationsContent?.classList.remove('hidden');
      elements.invitationsContent?.classList.add('active');
    }
  }

  function getRoleBadgeClass(role: string) {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'member': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function getRoleDisplayName(role: string) {
    switch (role) {
      case 'owner': return 'Propietario';
      case 'admin': return 'Administrador';
      case 'member': return 'Miembro';
      default: return 'Miembro';
    }
  }

  function handleMemberOptions(this: Element, event: Event) {
    const btn = event.currentTarget as HTMLElement;
    const memberId = btn.dataset.memberId;
    const memberEmail = btn.dataset.memberEmail;
    const memberRole = btn.dataset.memberRole;
    const memberName = btn.dataset.memberName;

    const optionsEvent = new CustomEvent('show-member-options', {
      detail: { memberId, memberEmail, memberRole, memberName, workspaceId, triggerElement: btn }
    });
    document.dispatchEvent(optionsEvent);
  }

  function handleCopyInvitation(this: Element, event: Event) {
    const btn = event.currentTarget as HTMLElement;
    const invitationId = btn.dataset.invitationId;
    if (!invitationId) return;
    const invitationUrl = `${window.location.origin}/accept-invitation/${invitationId}`;
    navigator.clipboard.writeText(invitationUrl).then(() => {
      showToast('Enlace de invitación copiado al portapapeles', 'success');
    }).catch(() => {
      showToast('Error al copiar enlace', 'error');
    });
  }

  async function handleCancelInvitation(this: Element, event: Event) {
    const btn = event.currentTarget as HTMLElement;
    const invitationId = btn.dataset.invitationId;
    const inviteeEmail = btn.dataset.inviteeEmail;
    if (!invitationId || !inviteeEmail) return;
    if (confirm(`¿Estás seguro de que quieres cancelar la invitación a ${inviteeEmail}?`)) {
      try {
        await cancelInvitation(invitationId);
        showToast('Invitación cancelada exitosamente', 'success');
        loadData();
      } catch (error) {
        console.error('Error cancelando invitación:', error);
        showToast('Error al cancelar la invitación', 'error');
      }
    }
  }

  function handleInviteMember() {
    const inviteEvent = new CustomEvent('invite-member-requested', { detail: { workspaceId } });
    document.dispatchEvent(inviteEvent);
  }

  function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    if (typeof (window as any).showToast === 'function') {
      (window as any).showToast({ message, type });
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  function renderMembers(members: Member[]) {
    if (!elements.membersList) return;
    const loadingState = elements.membersList.querySelector('.loading-state') as HTMLElement | null;
    if (loadingState) loadingState.style.display = 'none';
    if (members.length === 0) {
      elements.membersList.innerHTML = '';
      elements.membersEmpty?.classList.remove('hidden');
      return;
    }
    elements.membersEmpty?.classList.add('hidden');
    const membersHTML = members.map(member => {
    const isCurrentUser = member.userId === (document.body.dataset.currentUserId || '');
      const canManageThisMember = canManageMembers && !isCurrentUser && member.role !== 'owner';
      return `
        <div class="member-item flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors" data-member-id="${member.userId}">
          <div class="flex items-center space-x-3">
            <div class="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
              ${member.displayName ? member.displayName.charAt(0).toUpperCase() : (member.email || '').charAt(0).toUpperCase()}
            </div>
            <div class="flex-1 min-w-0">
              <h4 class="font-medium text-gray-900 truncate">${member.displayName || member.email}${isCurrentUser ? '<span class="text-blue-600 font-normal">(Tú)</span>' : ''}</h4>
              ${member.displayName && member.email ? `<p class="text-sm text-gray-500 truncate">${member.email}</p>` : ''}
              <div class="flex items-center space-x-2 mt-1">
                <span class="px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeClass(member.role)}">${getRoleDisplayName(member.role)}</span>
                ${member.joinedAt ? `<span class="text-xs text-gray-400">Se unió ${formatRelativeTime(new Date(member.joinedAt))}</span>` : ''}
              </div>
            </div>
          </div>
          ${canManageThisMember ? `
            <div class="relative">
              <button class="member-options-btn p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" data-member-id="${member.userId}" data-member-email="${member.email}" data-member-role="${member.role}" data-member-name="${member.displayName || ''}">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path></svg>
              </button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
    elements.membersList.innerHTML = membersHTML;
    document.querySelectorAll('.member-options-btn').forEach(btn => btn.addEventListener('click', handleMemberOptions));
  }

  function renderInvitations(invitations: Invitation[]) {
    if (!elements.invitationsList || !canManageMembers) return;
    const loadingState = elements.invitationsList.querySelector('.loading-state') as HTMLElement | null;
    if (loadingState) loadingState.style.display = 'none';
    if (invitations.length === 0) { elements.invitationsList.innerHTML = ''; elements.invitationsEmpty?.classList.remove('hidden'); return; }
    elements.invitationsEmpty?.classList.add('hidden');
    const invitationsHTML = invitations.map(invitation => `
      <div class="invitation-item flex items-center justify-between p-4 border border-yellow-200 rounded-lg bg-yellow-50 hover:bg-yellow-100 transition-colors" data-invitation-id="${invitation.id}">
        <div class="flex items-center space-x-3">
          <div class="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">${invitation.inviteeEmail.charAt(0).toUpperCase()}</div>
          <div class="flex-1 min-w-0">
            <h4 class="font-medium text-gray-900">${invitation.inviteeEmail}</h4>
            <p class="text-sm text-yellow-700">Invitación pendiente</p>
            ${invitation.inviterName ? `<p class="text-xs text-gray-500">Invitado por ${invitation.inviterName}</p>` : ''}
            ${invitation.createdAt ? `<p class="text-xs text-gray-400">Enviado ${formatRelativeTime(new Date(invitation.createdAt))}</p>` : ''}
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <button class="copy-invitation-btn p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors" data-invitation-id="${invitation.id}" title="Copiar enlace de invitación"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg></button>
          <button class="cancel-invitation-btn p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors" data-invitation-id="${invitation.id}" data-invitee-email="${invitation.inviteeEmail}" title="Cancelar invitación"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
        </div>
      </div>
    `).join('');
    elements.invitationsList.innerHTML = invitationsHTML;
    document.querySelectorAll('.copy-invitation-btn').forEach(btn => btn.addEventListener('click', handleCopyInvitation));
    document.querySelectorAll('.cancel-invitation-btn').forEach(btn => btn.addEventListener('click', handleCancelInvitation));
  }

  function updateCounters() {
    const activeCount = state.activeMembers.length;
    const pendingCount = state.pendingInvitations.length;
    const totalCount = activeCount + pendingCount;
    if (elements.membersCount) elements.membersCount.textContent = `${totalCount} total`;
    if (elements.activeMembersBadge) elements.activeMembersBadge.textContent = activeCount.toString();
    if (elements.pendingInvitationsBadge) elements.pendingInvitationsBadge.textContent = pendingCount.toString();
  }

  async function loadData() {
    if (!workspaceId) return;
    try {
      state.loading = true;
      const members = await getWorkspaceMembers(workspaceId);
      state.activeMembers = members;
      if (canManageMembers) {
        const invitations = await getWorkspaceInvitations(workspaceId);
        state.pendingInvitations = invitations;
      }
      state.loading = false; state.error = null;
      renderMembers(state.activeMembers);
      if (canManageMembers) renderInvitations(state.pendingInvitations);
      updateCounters();
    } catch (error) {
      console.error('🏝️ MembersManagementIsland: Error cargando datos:', error);
      state.loading = false; state.error = 'Error al cargar los datos de miembros';
      showToast('Error al cargar los datos de miembros', 'error');
    }
  }

  function initializeMembersManagementIsland() {
    elements.membersTab?.addEventListener('click', () => switchTab('members'));
    elements.invitationsTab?.addEventListener('click', () => switchTab('invitations'));
    elements.inviteBtn?.addEventListener('click', handleInviteMember);

    onAuthStateChanged(auth, (user) => {
      state.currentUser = user;
      if (user) {
        loadData();
      } else {
        state.activeMembers = []; state.pendingInvitations = []; renderMembers([]); if (canManageMembers) renderInvitations([]); updateCounters();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMembersManagementIsland);
  } else {
    initializeMembersManagementIsland();
  }

  (window as any).membersManagementIsland = {
    state: () => state,
    loadData,
    reloadData: loadData,
    switchTab
  };
}

// Auto-initialize if script is loaded after DOM ready
if (document.readyState !== 'loading') {
  // find element to decide whether to initialize automatically
  if (document.getElementById('members-management-view')) {
    initializeMembersManagementIsland();
  }
}
