import { getWorkspaceBoards } from '@/firebase/api';
import type { Board } from '@/types/domain';

// Función principal de inicialización - EXPORTADA para uso externo
export async function initBoardsView() {
    const boardsRoot = document.getElementById('boards-root');
    const workspaceId = boardsRoot?.getAttribute('data-workspace-id');

    if (!workspaceId) {
        console.error('No se encontró el workspaceId en el elemento boards-root');
        return;
    }

    console.log('Inicializando vista de boards para workspace:', workspaceId);
    await renderBoards(workspaceId);
}

// Función auxiliar para renderizar los boards
async function renderBoards(workspaceId: string) {
    const boardsGrid = document.getElementById('boards-grid');
    const loadingElement = document.getElementById('loading-message');
    const workspaceNameElement = document.getElementById('workspace-name');

    if (!boardsGrid || !loadingElement) {
        console.error('No se encontraron los elementos necesarios del DOM');
        return;
    }

    loadingElement.textContent = 'Cargando tableros...';

    try {
        const boards = await getWorkspaceBoards(workspaceId);
        loadingElement.style.display = 'none';
        boardsGrid.innerHTML = '';

        if (boards.length === 0) {
            boardsGrid.innerHTML = '<p class="col-span-full text-center text-gray-500">No hay tableros en este espacio de trabajo.</p>';
            return;
        }

        boards.forEach(board => {
            const boardCard = document.createElement('a');
            boardCard.href = `/workspace/${workspaceId}/board/${board.id}`;
            boardCard.className = 'block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow border border-gray-200';
            boardCard.innerHTML = `
                <h4 class="font-semibold text-gray-900">${board.name}</h4>
                <p class="text-sm text-gray-500 mt-1">${board.description || 'Sin descripción'}</p>
                <div class="mt-2 text-xs text-gray-400">
                    ${board.columns?.length || 0} columnas
                </div>
            `;
            boardsGrid.appendChild(boardCard);
        });

        console.log(`Se cargaron ${boards.length} tableros para el workspace ${workspaceId}`);
    } catch (error) {
        console.error('Error fetching boards:', error);
        loadingElement.textContent = 'Error al cargar los tableros.';
        loadingElement.style.color = 'red';
    }
}