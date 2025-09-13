import { getWorkspaceBoards, subscribeToBoardsInWorkspace } from '@/firebase/api';
import type { Board } from '@/types/domain';

// Función principal de inicialización - EXPORTADA para uso externo
export async function initBoardGrid(gridId: string, workspaceId: string, showCreateCard: boolean = true, enableRealTime: boolean = false) {
    console.log('🎨 BoardGrid: === INICIANDO initBoardGrid ===');
    console.log('🎨 BoardGrid: Parámetros - gridId:', gridId, 'workspaceId:', workspaceId, 'showCreateCard:', showCreateCard, 'enableRealTime:', enableRealTime);

    const boardsGrid = document.getElementById(gridId);
    if (!boardsGrid) {
        console.error('❌ BoardGrid: No se encontró el elemento', gridId, '- Elementos disponibles:', document.querySelectorAll('*').length);
        return;
    }

    console.log('✅ BoardGrid: Elemento encontrado, inicialización exitosa, renderizando boards para workspace:', workspaceId);
    const cleanup = await renderBoards(gridId, workspaceId, showCreateCard, enableRealTime);

    // Escuchar evento de board creado para recargar la lista
    console.log('👂 BoardGrid: Configurando listener para evento board-created...');
    document.addEventListener('board-created', async () => {
        console.log('📡 BoardGrid: Evento board-created recibido, recargando boards...');
        await renderBoards(gridId, workspaceId, showCreateCard, enableRealTime);
    });

    console.log('🎨 BoardGrid: === initBoardGrid COMPLETADO ===');
    return cleanup;
}

// Función auxiliar para renderizar los boards
async function renderBoards(gridId: string, workspaceId: string, showCreateCard: boolean, enableRealTime: boolean) {
    console.log('🎨 BoardGrid: === INICIANDO renderBoards ===');
    console.log('🎨 BoardGrid: Parámetros - gridId:', gridId, 'workspaceId:', workspaceId, 'showCreateCard:', showCreateCard, 'enableRealTime:', enableRealTime);

    const boardsGrid = document.getElementById(gridId);
    let loadingElement = document.getElementById('loading-message');

    if (!boardsGrid) {
        console.error('❌ BoardGrid: No se encontró el elemento', gridId);
        return;
    }

    console.log('✅ BoardGrid: Elemento grid encontrado');

    // Si no existe loading-message, crearlo
    if (!loadingElement) {
        console.log('🔄 BoardGrid: Recreando elemento loading-message...');
        loadingElement = document.createElement('p');
        loadingElement.id = 'loading-message';
        loadingElement.className = 'col-span-full text-center py-16';
        boardsGrid.appendChild(loadingElement);
    }

    loadingElement.textContent = 'Cargando tableros...';
    loadingElement.style.display = 'block';
    console.log('📝 BoardGrid: Mostrando mensaje de carga');

    try {
        console.log('🔍 BoardGrid: Obteniendo boards para workspace:', workspaceId);

        let boards: Board[];
        let unsubscribe: (() => void) | undefined;

        if (enableRealTime) {
            console.log('📡 BoardGrid: Usando suscripción en tiempo real');
            // Primero obtener los boards existentes
            console.log('📄 BoardGrid: Obteniendo boards iniciales...');
            console.log('🔐 BoardGrid: Verificando autenticación de Firebase...');
            const { getAuth } = await import('firebase/auth');
            const auth = getAuth();
            console.log('🔐 BoardGrid: Usuario actual:', auth.currentUser?.uid || 'No autenticado');
            const initialBoards = await getWorkspaceBoards(workspaceId);
            console.log('✅ BoardGrid: Boards iniciales obtenidos:', initialBoards?.length || 0);
            console.log('📋 BoardGrid: Contenido de boards iniciales:', JSON.stringify(initialBoards, null, 2));
            renderBoardsHTML(gridId, initialBoards, showCreateCard, workspaceId);

            // Luego configurar la suscripción para cambios en tiempo real
            unsubscribe = subscribeToBoardsInWorkspace(workspaceId, (boardsData) => {
                console.log('📡 BoardGrid: Boards actualizados del callback:', boardsData?.length || 0, 'boards');
                console.log('📋 BoardGrid: Contenido de boards actualizados:', JSON.stringify(boardsData, null, 2));
                renderBoardsHTML(gridId, boardsData, showCreateCard, workspaceId);
            });
            console.log('📡 BoardGrid: Suscripción en tiempo real configurada');
        } else {
            console.log('📄 BoardGrid: Usando llamada única');
            boards = await getWorkspaceBoards(workspaceId);
            console.log('✅ BoardGrid: Boards obtenidos:', boards?.length || 0);
            console.log('📋 BoardGrid: Contenido de boards:', JSON.stringify(boards, null, 2));
            renderBoardsHTML(gridId, boards, showCreateCard, workspaceId);
        }

        console.log('🎨 BoardGrid: === renderBoards COMPLETADO ===');
        return unsubscribe;

    } catch (error) {
        console.error('❌ BoardGrid: Error fetching boards:', error);
        if (loadingElement) {
            loadingElement.textContent = 'Error al cargar los tableros.';
            loadingElement.style.color = 'red';
        }
    }
}

// Función para renderizar el HTML de los boards
function renderBoardsHTML(gridId: string, boards: Board[], showCreateCard: boolean, workspaceId: string) {
    console.log('🎨 BoardGrid: === INICIANDO renderBoardsHTML ===');
    console.log('🎨 BoardGrid: Parámetros - gridId:', gridId, 'boards:', boards?.length || 0, 'showCreateCard:', showCreateCard, 'workspaceId:', workspaceId);

    const boardsGrid = document.getElementById(gridId);
    if (!boardsGrid) {
        console.error('❌ BoardGrid: No se encontró el elemento grid en renderBoardsHTML');
        return;
    }

    console.log('✅ BoardGrid: Grid encontrado, procesando boards...');

    const loadingElement = document.getElementById('loading-message');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }

    // Limpiar contenido dinámico
    console.log('🧹 BoardGrid: Limpiando contenido dinámico...');
    const children = Array.from(boardsGrid.children);
    children.forEach(child => {
        if (child.id !== 'loading-message' &&
            !child.querySelector('[data-action="create-board"]') &&
            child.id !== 'empty-message') {
            boardsGrid.removeChild(child);
        }
    });

    // Agregar tarjeta de crear board si está habilitada
    if (showCreateCard) {
        const existingCreateCard = boardsGrid.querySelector('[data-action="create-board"]');
        if (!existingCreateCard) {
            console.log('➕ BoardGrid: Agregando tarjeta de crear board...');
            const createCardHTML = `
                <div class="create-board-card-wrapper">
                    <div data-action="create-board" class="block bg-gray-50 rounded-lg shadow p-6 hover:shadow-md transition-all border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-white cursor-pointer hover:scale-105 duration-200">
                        <div class="flex flex-col items-center justify-center py-8 text-gray-400 hover:text-blue-500 transition-colors">
                            <svg class="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                            </svg>
                            <h3 class="text-lg font-semibold text-gray-700 mb-2">Crear nuevo tablero</h3>
                            <p class="text-sm text-gray-500 text-center">
                                Organiza tus tareas y proyectos en un nuevo tablero
                            </p>
                        </div>
                    </div>
                </div>
            `;
            boardsGrid.insertAdjacentHTML('afterbegin', createCardHTML);
            console.log('✅ BoardGrid: Tarjeta de crear board agregada');
        }
    }

    // Si no hay boards, mostrar mensaje
    if (boards.length === 0) {
        const existingEmptyMessage = document.getElementById('empty-message');
        if (!existingEmptyMessage) {
            console.log('📝 BoardGrid: No hay boards, agregando mensaje...');
            const emptyMessage = document.createElement('div');
            emptyMessage.id = 'empty-message';
            emptyMessage.className = 'col-span-full text-center py-8 text-gray-500';
            emptyMessage.textContent = '¡Crea tu primer tablero para empezar!';
            boardsGrid.appendChild(emptyMessage);
        }
    } else {
        // Eliminar mensaje vacío si existe
        const existingEmptyMessage = document.getElementById('empty-message');
        if (existingEmptyMessage) {
            console.log('🗑️ BoardGrid: Eliminando mensaje vacío...');
            existingEmptyMessage.remove();
        }

        // Renderizar boards
        console.log('📋 BoardGrid: Renderizando', boards.length, 'boards...');
        boards.forEach(board => {
            const boardCard = document.createElement('div');
            boardCard.className = 'board-card-wrapper';

            // Generar color aleatorio para el board
            const colors = ['blue', 'green', 'purple', 'pink', 'indigo', 'red', 'yellow', 'gray'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];

            // Generar iniciales del board
            const initials = board.name
                .split(' ')
                .map(word => word.charAt(0))
                .join('')
                .toUpperCase()
                .slice(0, 2);

            // Obtener estadísticas
            const columnCount = board.columns?.length || 0;
            const taskCount = board.columns?.reduce((total, column) => total + (column.tasks?.length || 0), 0) || 0;

            boardCard.innerHTML = `
                <a href="/workspace/${workspaceId}/board/${board.id}" class="block bg-white rounded-lg shadow p-6 hover:shadow-md transition-all border border-gray-200 hover:scale-105 duration-200 group">
                    <div class="flex items-start space-x-4">
                        <div class="w-12 h-12 bg-${randomColor}-500 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0">
                            ${initials}
                        </div>
                        <div class="flex-1 min-w-0">
                            <h4 class="font-semibold text-gray-900 text-lg mb-2 truncate">${board.name}</h4>
                            <p class="text-sm text-gray-500 mb-4 line-clamp-2">${board.description || 'Sin descripción'}</p>

                            <div class="grid grid-cols-2 gap-4 text-sm mb-4">
                                <div class="flex items-center space-x-2 text-gray-600">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                                    </svg>
                                    <span>${columnCount} ${columnCount === 1 ? 'columna' : 'columnas'}</span>
                                </div>
                                <div class="flex items-center space-x-2 text-gray-600">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    <span>${taskCount} ${taskCount === 1 ? 'tarea' : 'tareas'}</span>
                                </div>
                            </div>

                            <div class="flex items-center justify-between text-xs text-gray-500">
                                <div class="flex items-center space-x-1">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6 0a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    <span>Sin actividad reciente</span>
                                </div>
                                <div class="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </a>
            `;
            boardsGrid.appendChild(boardCard);
        });
    }

    // Configurar event listener para crear board
    console.log('🔧 BoardGrid: Configurando event listener para crear board...');
    setupCreateBoardListener();

    console.log(`✅ BoardGrid: Se cargaron ${boards.length} tableros para el workspace ${workspaceId}`);
}

// Función para configurar el listener de crear board
function setupCreateBoardListener() {
    console.log('🎯 BoardGrid: Buscando elemento [data-action="create-board"]...');
    const createCard = document.querySelector('[data-action="create-board"]');
    console.log('🎯 BoardGrid: Elemento encontrado:', !!createCard);

    if (createCard) {
        // Remover event listener anterior si existe
        const oldListener = (createCard as any)._createBoardListener;
        if (oldListener) {
            console.log('🎯 BoardGrid: Removiendo event listener anterior...');
            createCard.removeEventListener('click', oldListener);
        }

        console.log('🎯 BoardGrid: Agregando event listener...');
        const clickHandler = () => {
            console.log('🎯 BoardGrid: Click en crear board detectado');
            document.dispatchEvent(new CustomEvent('create-board-requested'));
        };

        // Guardar referencia al handler para poder removerlo después
        (createCard as any)._createBoardListener = clickHandler;
        createCard.addEventListener('click', clickHandler);
        console.log('🎯 BoardGrid: Event listener agregado exitosamente');
    } else {
        console.error('🎯 BoardGrid: No se encontró el elemento [data-action="create-board"]');
    }
}