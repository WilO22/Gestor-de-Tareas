import { getWorkspaceBoards } from '../firebase/api';
import type { Board } from '../types/domain';

document.addEventListener('show-boards', (event: any) => {
    const { workspaceId } = event.detail;
    if (workspaceId) {
        renderBoards(workspaceId);
    }
});

async function renderBoards(workspaceId: string) {
    const boardsGrid = document.getElementById('boards-grid');
    const loadingElement = document.getElementById('boards-loading');

    if (!boardsGrid || !loadingElement) return;

    loadingElement.textContent = `Cargando tableros...`;

    try {
        const boards = await getWorkspaceBoards(workspaceId);
        loadingElement.style.display = 'none';
        boardsGrid.innerHTML = '';

        if (boards.length === 0) {
            boardsGrid.innerHTML = '<p class="col-span-full text-center">No hay tableros en este espacio de trabajo.</p>';
            return;
        }

        boards.forEach(board => {
            const boardCard = document.createElement('a');
            boardCard.href = `/workspace/${workspaceId}/board/${board.id}`;
            boardCard.className = 'block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow';
            boardCard.innerHTML = `
                <h4 class="font-semibold">${board.name}</h4>
                <p class="text-sm text-gray-500">${board.description || ''}</p>
            `;
            boardsGrid.appendChild(boardCard);
        });
    } catch (error) {
        console.error('Error fetching boards:', error);
        loadingElement.textContent = 'Error al cargar los tableros.';
    }
}