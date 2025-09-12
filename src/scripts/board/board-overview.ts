import { subscribeToBoardsInWorkspace } from '../../firebase/api';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/client';

// Evitar warnings por imports que pueden parecer no usados en ciertos flujos de bundling
void db; void doc; void getDoc;

let currentWorkspaceId: string | null = null;
let boardsUnsubscribe: (() => void) | null = null;

function showBoardsView(workspaceId: string) {
  const workspacesView = document.getElementById('workspaces-view');
  const boardsView = document.getElementById('boards-view');

  if (workspacesView && boardsView) {
    workspacesView.classList.add('hidden');
    boardsView.classList.remove('hidden');
  }
  currentWorkspaceId = workspaceId;
  loadWorkspaceDetails(workspaceId);
  loadWorkspaceBoards(workspaceId);
  showTab('boards');
  // confirm to sidebar that the action was handled in-page
  try { document.dispatchEvent(new CustomEvent('sidebar-action-handled', { detail: { action: 'boards', workspaceId } })); } catch (e) { /* ignore */ }
}

// Eliminado: función showWorkspacesView y lógica antigua de workspaces-view (legacy)

async function loadWorkspaceDetails(workspaceId: string) {
  try {
    const docRef = doc(db, 'workspaces', workspaceId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const workspace = docSnap.data() as any;
      const workspaceName = document.getElementById('workspace-name');
      const workspaceAvatar = document.getElementById('workspace-avatar');
      if (workspaceName) workspaceName.textContent = workspace.name;
      if (workspaceAvatar) {
        workspaceAvatar.textContent = workspace.name?.charAt(0).toUpperCase() || 'W';
      }
    }
  } catch (error) {
    // keep console logging for easier local debugging
    // do not throw to avoid breaking page render
    // eslint-disable-next-line no-console
    console.error('Error loading workspace details', error);
  }
}

function loadWorkspaceBoards(workspaceId: string) {
  const boardsGrid = document.getElementById('boards-grid');
  const boardsLoading = document.getElementById('boards-loading');
  if (!boardsGrid || !boardsLoading) return;

  try {
    boardsLoading.textContent = 'Cargando tableros...';

    if (boardsUnsubscribe) {
      boardsUnsubscribe();
      boardsUnsubscribe = null;
    }

    boardsUnsubscribe = subscribeToBoardsInWorkspace(workspaceId, (boards: any[]) => {
      // eslint-disable-next-line no-console
      console.log('📊 Tableros actualizados en tiempo real:', boards.length);
      renderBoards(boards, workspaceId);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error configuring boards subscription', error);
    if (boardsLoading) boardsLoading.textContent = 'Error al cargar tableros';
  }
}

function renderBoards(boards: any[], workspaceId: string) {
  const boardsGrid = document.getElementById('boards-grid');
  const boardsLoading = document.getElementById('boards-loading');
  if (!boardsGrid || !boardsLoading) return;

  boardsLoading.textContent = '';
  boardsGrid.innerHTML = '';

  const createBoardCard = document.createElement('div');
  createBoardCard.className = 'flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-gray-50 transition-all cursor-pointer min-h-[150px]';
  createBoardCard.innerHTML = `
    <svg class="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
    </svg>
    <span class="text-gray-500 text-sm">Crear un tablero nuevo</span>
  `;

  createBoardCard.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('showCreateBoardModal'));
  });

  boardsGrid.appendChild(createBoardCard);

  boards.forEach((board: any) => {
    const boardCard = document.createElement('a');
    boardCard.href = `/workspace/${workspaceId}/board/${board.id}`;
    boardCard.className = 'block p-4 border rounded-lg shadow-md hover:bg-gray-100 hover:shadow-lg transition-all bg-white min-h-[150px]';
    boardCard.innerHTML = `
      <h3 class="text-lg font-semibold text-gray-800">${board.name}</h3>
      <p class="text-sm text-gray-600 mt-1">Tablero</p>
    `;
    boardsGrid.appendChild(boardCard);
  });
}

function showTab(tabName: string) {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.classList.remove('active', 'text-white', 'bg-blue-500');
    btn.classList.add('text-gray-700', 'hover:bg-blue-400', 'hover:text-white');
  });

  const activeTab = document.getElementById(`${tabName}-tab`);
  if (activeTab) {
    activeTab.classList.remove('text-gray-700', 'hover:bg-blue-400', 'hover:text-white');
    activeTab.classList.add('active', 'text-white', 'bg-blue-500');
  }

  tabContents.forEach(content => content.classList.add('hidden'));

  const activeContent = document.getElementById(`${tabName}-content`);
  if (activeContent) activeContent.classList.remove('hidden');

  if (tabName === 'members' && currentWorkspaceId) {
    setTimeout(() => {
      if ((window as any).MembersTab?.loadWorkspaceMembers) {
        (window as any).MembersTab.loadWorkspaceMembers(currentWorkspaceId as string);
      }
    }, 100);
  }

  if (tabName === 'reports' && currentWorkspaceId) {
    setTimeout(() => {
      if ((window as any).ReportsTab?.loadWorkspaceReports) {
        (window as any).ReportsTab.loadWorkspaceReports(currentWorkspaceId as string);
      }
    }, 100);
  }
}

function setupTabEventListeners() {
  const boardsTab = document.getElementById('boards-tab');
  const membersTab = document.getElementById('members-tab');
  const configTab = document.getElementById('config-tab');
  const reportsTab = document.getElementById('reports-tab');

  if (boardsTab) {
    boardsTab.onclick = (e) => { e.preventDefault(); e.stopPropagation(); showTab('boards'); };
  }
  if (membersTab) {
    membersTab.onclick = (e) => { e.preventDefault(); e.stopPropagation(); showTab('members'); };
  }
  if (configTab) {
    configTab.onclick = (e) => { e.preventDefault(); e.stopPropagation(); showTab('config'); };
  }
  if (reportsTab) {
    reportsTab.onclick = (e) => { e.preventDefault(); e.stopPropagation(); showTab('reports'); };
  }
}

export default function initBoardOverview() {
  document.addEventListener('DOMContentLoaded', () => {
    setupTabEventListeners();
  });

  window.addEventListener('showWorkspaceBoards', (event: any) => {
    const { workspaceId } = event.detail || {};
    if (workspaceId) showBoardsView(workspaceId);
  });

  // Expose for other scripts
  // Eliminado: API global showWorkspacesView (legacy)
  (window as any).showBoardsView = showBoardsView;
}
