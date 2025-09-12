// src/scripts/board/board-init.ts
// Inicialización completa de la página del board

import { fetchBoardInfo, createColumn, updateColumn, archiveColumn } from '../../firebase/api';
import { getAuth, onAuthStateChanged } from '../../firebase/auth';
import { initDragAndDrop } from './drag-and-drop';
import { setupTaskInteractions, clearTaskSelection } from './task-interactions';
import type { Board, Column } from '../../types/domain';

export function initBoardPage() {
  console.log('🚀 Inicializando página del board...');

  // Obtener IDs desde el DOM
  const boardRoot = document.getElementById('board-root');
  const workspaceId = boardRoot?.getAttribute('data-workspace-id');
  const boardId = boardRoot?.getAttribute('data-board-id');

  console.log('📋 IDs obtenidos:', { workspaceId, boardId });

  if (!workspaceId || !boardId) {
    console.error('❌ No se pudieron obtener workspaceId o boardId');
    showError('Error: No se pudieron obtener los IDs necesarios');
    return;
  }

  // Verificar autenticación y cargar board
  const auth = getAuth();
  onAuthStateChanged(auth, async (user: any) => {
    if (user) {
      console.log('✅ Usuario autenticado:', user.email);
      await loadBoardData(boardId);
    } else {
      console.error('❌ Usuario no autenticado');
      window.location.href = '/login';
    }
  });
}

// Cargar datos del board
async function loadBoardData(boardId: string) {
  try {
    console.log('🔍 Cargando datos del board:', boardId);

    // Mostrar estado de carga
    const container = document.getElementById('columns-container');
    if (container) {
      container.innerHTML = '<p class="text-gray-600">Cargando columnas...</p>';
    }

    // Obtener información del board
    const board = await fetchBoardInfo(boardId);

    if (!board) {
      console.error('❌ Board no encontrado');
      showError('Board no encontrado');
      return;
    }

    console.log('✅ Board cargado:', board.name);
    console.log('📊 Datos del board:', board);
    console.log('📋 Columnas encontradas:', board.columns?.length || 0);
    console.log('📝 Detalle de columnas:', board.columns);

    // Limpiar selección anterior
    clearTaskSelection();

    // Actualizar título del board
    const boardTitle = document.getElementById('board-title');
    if (boardTitle) {
      boardTitle.textContent = board.name || 'Sin título';
    }

    // Renderizar columnas
    await renderColumns(board);

    // Inicializar funcionalidades después de renderizar
    setTimeout(() => {
      console.log('🔍 Elementos encontrados después del renderizado...');
      const taskLists = document.querySelectorAll('.task-list');
      const addColumnButton = document.getElementById('add-column-button');
      const addTaskButtons = document.querySelectorAll('.add-task-btn');
      console.log(`📊 Elementos encontrados - Task lists: ${taskLists.length}, Add column button: ${addColumnButton ? 'Sí' : 'No'}, Add task buttons: ${addTaskButtons.length}`);

      console.log('🎯 Inicializando drag & drop...');
      initDragAndDrop();
      console.log('✅ Drag & drop inicializado');

      console.log('🎯 Configurando creación de columnas...');
      setupColumnCreation();
      console.log('✅ Creación de columnas configurada');

      console.log('🎯 Configurando interacciones de tareas...');
      setupTaskInteractions();
      console.log('✅ Interacciones de tareas configuradas');
    }, 100);
  } catch (error) {
    console.error('❌ Error cargando board:', error);
    showError('Error al cargar el tablero');
  }
}

// Renderizar columnas del board
export async function renderColumns(board: Board) {
  const container = document.getElementById('columns-container');

  if (!container) {
    console.error('❌ No se encontró el contenedor de columnas');
    return;
  }

  console.log('🎨 Renderizando columnas...');
  console.log('📊 Board recibido:', board);
  console.log('📋 Columnas en board:', board.columns);
  console.log('📏 Número de columnas:', board.columns?.length || 0);

  // Si no hay columnas, mostrar mensaje y botón para crear primera columna
  if (!board.columns || board.columns.length === 0) {
    console.log('⚠️ No hay columnas, mostrando mensaje vacío');
    container.innerHTML = `
      <div class="flex items-center justify-center py-16">
        <div class="text-center">
          <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No hay columnas aún</h3>
          <p class="text-gray-500 mb-4">Crea tu primera columna para empezar a organizar tus tareas</p>
          <button class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Crear primera columna
          </button>
        </div>
      </div>
    `;
    return;
  }

  console.log('✅ Hay columnas, renderizando...');

  // Renderizar columnas existentes
  const columnsHTML = board.columns.map((column: Column) => `
    <div class="bg-gray-100 rounded-lg p-4 min-w-80 max-w-80 relative group">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-gray-800 flex-1">${column.name}</h3>
        <div class="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <span class="text-xs text-gray-500">${column.tasks?.length || 0} tareas</span>
          <button class="column-action-btn text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200 transition-colors" data-action="edit" title="Editar columna">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
          </button>
          <button class="column-action-btn text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors" data-action="archive" title="Archivar columna">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>
      </div>

      <div class="task-list space-y-2 min-h-8" data-id="${column.id}">
        ${column.tasks?.map((task: any) => `
          <div class="bg-white rounded p-3 shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer relative group/task" data-task-id="${task.id}">
            <div class="pr-8">
              <h4 class="font-medium text-gray-900 text-sm mb-1">${task.title}</h4>
              ${task.description ? `<p class="text-xs text-gray-600">${task.description}</p>` : ''}
            </div>

            <!-- Botones de acción que aparecen al hacer hover -->
            <div class="absolute top-2 right-2 opacity-0 group-hover/task:opacity-100 transition-opacity flex space-x-1">
              <button class="task-action-btn text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors" data-action="edit" title="Editar tarea">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>
              <button class="task-action-btn text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors" data-action="archive" title="Archivar tarea">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path>
                </svg>
              </button>
            </div>
          </div>
        `).join('') || '<p class="text-xs text-gray-500 italic py-2">Sin tareas</p>'}
      </div>

      <button class="add-task-btn w-full mt-3 text-left text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded p-2 transition-colors flex items-center">
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
        </svg>
        <span class="text-sm">Añadir una tarea</span>
      </button>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="flex gap-6 overflow-x-auto pb-4">
      ${columnsHTML}
      <div class="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4 min-w-80 max-w-80 flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer" id="add-column-button">
        <div class="text-center">
          <div class="w-8 h-8 bg-gray-300 rounded flex items-center justify-center mx-auto mb-2">
            <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
          </div>
          <span class="text-sm text-gray-600">Añadir otra lista</span>
        </div>
      </div>
    </div>
  `;

  console.log('✅ Columnas renderizadas correctamente');

  // Verificar que los elementos existen antes de inicializar
  setTimeout(() => {
    const taskLists = document.querySelectorAll('.task-list');
    const addColumnButton = document.getElementById('add-column-button');
    const addTaskButtons = document.querySelectorAll('.add-task-btn');
    console.log(`🔍 Elementos encontrados - Task lists: ${taskLists.length}, Add column button: ${addColumnButton ? 'Sí' : 'No'}, Add task buttons: ${addTaskButtons.length}`);

    console.log('🎯 Inicializando drag & drop...');
    initDragAndDrop();
    console.log('✅ Drag & drop inicializado');

    console.log('🎯 Configurando creación de columnas...');
    setupColumnCreation();
    console.log('✅ Creación de columnas configurada');

    console.log('🎯 Configurando interacciones de tareas...');
    setupTaskInteractions();
    console.log('✅ Interacciones de tareas configuradas');
  }, 100);
}

// Configurar la funcionalidad para crear nuevas columnas
function setupColumnCreation() {
  const addColumnButton = document.getElementById('add-column-button');
  if (addColumnButton) {
    addColumnButton.addEventListener('click', async () => {
      const columnName = prompt('Nombre de la nueva columna:');
      if (!columnName || columnName.trim() === '') return;

      const boardRoot = document.getElementById('board-root');
      const boardId = boardRoot?.getAttribute('data-board-id');

      if (!boardId) {
        console.error('❌ No se pudo obtener el boardId');
        return;
      }

      try {
        console.log('🏗️ Creando nueva columna:', columnName);

        // Obtener el número de columnas actual para determinar el orden
        const existingColumns = document.querySelectorAll('.task-list').length;

        const result = await createColumn(columnName.trim(), boardId, existingColumns);

        if (result.success) {
          console.log('✅ Columna creada exitosamente');
          // Recargar el board para mostrar la nueva columna
          await loadBoardData(boardId);
        } else {
          console.error('❌ Error al crear columna:', result.error);
          alert('Error al crear la columna');
        }
      } catch (error) {
        console.error('❌ Error al crear columna:', error);
        alert('Error al crear la columna');
      }
    });
  }
}

// Mostrar error en la UI
function showError(message: string) {
  const container = document.getElementById('columns-container');
  if (container) {
    container.innerHTML = `
      <div class="flex items-center justify-center py-16">
        <div class="text-center">
          <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Error</h3>
          <p class="text-gray-500">${message}</p>
        </div>
      </div>
    `;
  }
}
