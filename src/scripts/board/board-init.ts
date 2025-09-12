// src/scripts/board/board-init.ts
// Inicialización completa de la página del board

import { fetchBoardInfo, createColumn, updateColumn, archiveColumn, getArchivedTasks, restoreTask } from '../../firebase/api';
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
    // Usar requestAnimationFrame para asegurar que el DOM esté actualizado
    requestAnimationFrame(() => {
      setTimeout(() => {
        console.log('🔍 Elementos encontrados después del renderizado...');
        const taskLists = document.querySelectorAll('.task-list');
        const addColumnButton = document.getElementById('add-column-button');
        const addTaskButtons = document.querySelectorAll('.add-task-btn');
        console.log(`📊 Elementos encontrados - Task lists: ${taskLists.length}, Add column button: ${addColumnButton ? 'Sí' : 'No'}, Add task buttons: ${addTaskButtons.length}`);

        // Verificar que los botones de agregar tarea existen
        addTaskButtons.forEach((btn, index) => {
          console.log(`🔍 Botón agregar tarea ${index + 1}:`, btn);
        });

        console.log('🎯 Inicializando drag & drop...');
        initDragAndDrop();
        console.log('✅ Drag & drop inicializado');

        console.log('🎯 Configurando creación de columnas...');
        setupColumnCreation();
        console.log('✅ Creación de columnas configurada');

        console.log('🎯 Configurando interacciones de tareas...');
        setupTaskInteractions();
        console.log('✅ Interacciones de tareas configuradas');

        // Inicializar funcionalidad de archivados
        console.log('🎯 Configurando funcionalidad de archivados...');
        setupArchivedFunctionality(boardId);
        console.log('✅ Funcionalidad de archivados configurada');

        // Verificar que los event listeners se configuraron correctamente
        console.log('🔍 Verificando configuración de event listeners...');
        const testButton = document.querySelector('.add-task-btn') as HTMLElement;
        if (testButton) {
          console.log('✅ Event listeners configurados correctamente');
        } else {
          console.error('❌ No se encontraron botones de agregar tarea');
        }
      }, 200); // Aumentar el timeout para asegurar que todo esté renderizado
    });
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
  const columnsHTML = board.columns.map((column: Column, index: number) => {
    // Colores para las barras superiores de las columnas
    const columnColors = [
      'bg-blue-400', 'bg-green-400', 'bg-purple-400', 'bg-pink-400',
      'bg-indigo-400', 'bg-red-400', 'bg-yellow-400', 'bg-teal-400'
    ];
    const columnColor = columnColors[index % columnColors.length];

    return `
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 min-w-80 max-w-80 flex flex-col">
      <!-- Barra superior coloreada -->
      <div class="${columnColor} h-1 rounded-t-lg"></div>

      <!-- Header de la columna -->
      <div class="p-4 pb-2">
        <div class="flex items-center justify-between">
          <h3 class="font-semibold text-gray-800 text-sm">${column.name}</h3>
          <div class="flex items-center space-x-1">
            <span class="text-xs text-gray-500">${column.tasks?.length || 0}</span>
            <button class="column-menu-btn text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors" title="Opciones de columna">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Lista de tareas -->
      <div class="task-list px-4 pb-2 space-y-2 min-h-8" data-id="${column.id}">
        ${column.tasks?.map((task: any, taskIndex: number) => {
          // Colores suaves para las tarjetas
          const taskColors = [
            'bg-blue-50 border-blue-200', 'bg-green-50 border-green-200',
            'bg-purple-50 border-purple-200', 'bg-pink-50 border-pink-200',
            'bg-indigo-50 border-indigo-200', 'bg-red-50 border-red-200',
            'bg-yellow-50 border-yellow-200', 'bg-teal-50 border-teal-200'
          ];
          const taskColor = taskColors[taskIndex % taskColors.length];

          return `
          <div class="${taskColor} rounded-lg p-3 border hover:shadow-sm transition-all cursor-pointer relative group/task" data-task-id="${task.id}">
            <div class="flex items-start space-x-3">
              <!-- Círculo de selección -->
              <div class="task-selector flex-shrink-0 w-5 h-5 rounded-full border-2 border-gray-300 hover:border-gray-400 transition-colors cursor-pointer mt-0.5"></div>

              <!-- Contenido de la tarea -->
              <div class="flex-1 min-w-0">
                <h4 class="font-medium text-gray-900 text-sm mb-1 leading-tight">${task.title}</h4>
                ${task.description ? `<p class="text-xs text-gray-600 leading-tight">${task.description}</p>` : ''}
              </div>

              <!-- Botones de acción (aparecen cuando está seleccionada) -->
              <div class="task-actions opacity-0 transition-opacity flex space-x-1">
                <button class="task-action-btn text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-white transition-colors" data-action="edit" title="Editar tarea">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                </button>
                <button class="task-action-btn text-gray-400 hover:text-red-600 p-1 rounded hover:bg-white transition-colors" data-action="archive" title="Archivar tarea">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        `}).join('') || '<p class="text-xs text-gray-500 italic py-2 px-3">Sin tareas</p>'}
      </div>

      <!-- Área de agregar tarea -->
      <div class="p-4 pt-2">
        <div class="add-task-area">
          <!-- Botón agregar tarea (estado inicial) -->
          <button class="add-task-btn w-full text-left text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded p-2 transition-all duration-200 flex items-center">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            <span class="text-sm">Añadir una tarea</span>
          </button>

          <!-- Campo de entrada (estado activo, inicialmente oculto) -->
          <div class="add-task-form hidden">
            <div class="bg-white rounded-lg border border-gray-200 shadow-sm p-3 mb-2 transition-all duration-200">
              <textarea
                class="task-input w-full resize-none border-none outline-none text-sm text-gray-900 placeholder-gray-500 bg-transparent"
                placeholder="Introduce un título o pega un enlace"
                rows="2"
                maxlength="200"
              ></textarea>
            </div>
            <div class="flex items-center justify-between">
              <button class="add-task-submit bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 rounded transition-colors duration-150">
                Añadir tarjeta
              </button>
              <button class="cancel-add-task text-gray-400 hover:text-gray-600 p-1 rounded transition-colors duration-150">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `}).join('');

  container.innerHTML = `
    <div class="bg-white min-h-screen p-8">
      <div class="flex gap-6 overflow-x-auto pb-4">
        ${columnsHTML}
        <div class="bg-white border-2 border-dashed border-gray-300 rounded-lg shadow-sm min-w-80 max-w-80 flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer" id="add-column-button">
          <div class="text-center p-4">
            <div class="w-8 h-8 bg-gray-300 rounded flex items-center justify-center mx-auto mb-2">
              <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
            </div>
            <span class="text-sm text-gray-600">Añadir otra lista</span>
          </div>
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

// Configurar funcionalidad de archivados
function setupArchivedFunctionality(boardId: string) {
  console.log('🎯 Configurando funcionalidad de archivados para board:', boardId);

  // Configurar toggle de sección archivados
  const toggleBtn = document.getElementById('toggle-archived-btn');
  const archivedSection = document.getElementById('archived-section');
  const archivedContainer = document.getElementById('archived-container');

  if (toggleBtn && archivedSection && archivedContainer) {
    toggleBtn.addEventListener('click', async () => {
      const isVisible = !archivedContainer.classList.contains('hidden');

      if (isVisible) {
        // Ocultar
        archivedContainer.classList.add('hidden');
        toggleBtn.textContent = 'Mostrar archivados';
      } else {
        // Mostrar y cargar tareas archivadas
        archivedContainer.classList.remove('hidden');
        toggleBtn.textContent = 'Ocultar archivados';
        await loadArchivedTasks(boardId);
      }
    });

    // Mostrar la sección de archivados (inicialmente oculta)
    archivedSection.classList.remove('hidden');
    console.log('✅ Toggle de archivados configurado');
  } else {
    console.error('❌ No se encontraron elementos de la sección archivados');
  }
}

// Cargar tareas archivadas
async function loadArchivedTasks(boardId: string) {
  const archivedTasksContainer = document.getElementById('archived-tasks');

  if (!archivedTasksContainer) {
    console.error('❌ No se encontró el contenedor de tareas archivadas');
    return;
  }

  try {
    console.log('🔍 Cargando tareas archivadas para board:', boardId);

    // Mostrar loading
    archivedTasksContainer.innerHTML = '<p class="text-gray-500 text-sm">Cargando tareas archivadas...</p>';

    // Obtener tareas archivadas
    const archivedTasks = await getArchivedTasks(boardId);

    if (archivedTasks.length === 0) {
      archivedTasksContainer.innerHTML = '<p class="text-gray-500 text-sm">No hay tareas archivadas</p>';
      return;
    }

    // Renderizar tareas archivadas
    const tasksHtml = archivedTasks.map(task => `
      <div class="bg-white rounded-lg p-3 shadow-sm border border-gray-200 flex items-center justify-between group hover:shadow-md transition-shadow">
        <div class="flex items-center space-x-3">
          <div class="w-4 h-4 bg-gray-300 rounded-full flex-shrink-0"></div>
          <span class="text-sm text-gray-700">${task.title}</span>
        </div>
        <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            class="restore-task-btn p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
            data-task-id="${task.id}"
            data-column-id="${task.columnId}"
            title="Restaurar tarea"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
          </button>
          <button
            class="delete-task-btn p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
            data-task-id="${task.id}"
            title="Eliminar permanentemente"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>
      </div>
    `).join('');

    archivedTasksContainer.innerHTML = tasksHtml;

    // Configurar event listeners para restaurar y eliminar
    setupArchivedTaskActions(boardId);

    console.log(`✅ Cargadas ${archivedTasks.length} tareas archivadas`);

  } catch (error) {
    console.error('❌ Error cargando tareas archivadas:', error);
    archivedTasksContainer.innerHTML = '<p class="text-red-500 text-sm">Error al cargar tareas archivadas</p>';
  }
}

// Configurar acciones para tareas archivadas
function setupArchivedTaskActions(boardId: string) {
  // Botones de restaurar
  const restoreButtons = document.querySelectorAll('.restore-task-btn');
  restoreButtons.forEach(button => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      const taskId = (event.currentTarget as HTMLElement).getAttribute('data-task-id');
      const columnId = (event.currentTarget as HTMLElement).getAttribute('data-column-id');

      if (taskId && columnId) {
        await restoreArchivedTask(taskId, columnId, boardId);
      }
    });
  });

  // Botones de eliminar permanentemente
  const deleteButtons = document.querySelectorAll('.delete-task-btn');
  deleteButtons.forEach(button => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      const taskId = (event.currentTarget as HTMLElement).getAttribute('data-task-id');

      if (taskId && confirm('¿Estás seguro de que quieres eliminar permanentemente esta tarea? Esta acción no se puede deshacer.')) {
        await deleteArchivedTask(taskId, boardId);
      }
    });
  });
}

// Restaurar tarea archivada
async function restoreArchivedTask(taskId: string, columnId: string, boardId: string) {
  try {
    console.log('🔄 Restaurando tarea:', taskId);

    const result = await restoreTask(taskId);

    if (result.success) {
      console.log('✅ Tarea restaurada exitosamente');

      // Mostrar notificación
      showNotification('Tarea restaurada', 'success');

      // Recargar el board para mostrar la tarea restaurada
      await loadBoardData(boardId);

      // Recargar también las tareas archivadas
      await loadArchivedTasks(boardId);

    } else {
      console.error('❌ Error al restaurar tarea:', result.error);
      showNotification('Error al restaurar la tarea', 'error');
    }
  } catch (error) {
    console.error('❌ Error al restaurar tarea:', error);
    showNotification('Error al restaurar la tarea', 'error');
  }
}

// Eliminar tarea archivada permanentemente
async function deleteArchivedTask(taskId: string, boardId: string) {
  try {
    console.log('🗑️ Eliminando tarea permanentemente:', taskId);

    // Importar deleteTask de la API
    const { deleteTask } = await import('../../firebase/api');

    const result = await deleteTask(taskId);

    if (result.success) {
      console.log('✅ Tarea eliminada permanentemente');

      // Mostrar notificación
      showNotification('Tarea eliminada permanentemente', 'success');

      // Recargar las tareas archivadas
      await loadArchivedTasks(boardId);

    } else {
      console.error('❌ Error al eliminar tarea:', result.error);
      showNotification('Error al eliminar la tarea', 'error');
    }
  } catch (error) {
    console.error('❌ Error al eliminar tarea:', error);
    showNotification('Error al eliminar la tarea', 'error');
  }
}

// Mostrar notificación
function showNotification(message: string, type: 'success' | 'error' = 'success') {
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transform translate-x-full transition-transform duration-300 ${
    type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
  }`;

  notification.innerHTML = `
    <div class="flex items-center space-x-2">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${
          type === 'success'
            ? 'M5 13l4 4L19 7'
            : 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
        }"></path>
      </svg>
      <span class="text-sm font-medium">${message}</span>
    </div>
  `;

  document.body.appendChild(notification);

  // Animar entrada
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);

  // Remover después de 3 segundos
  setTimeout(() => {
    notification.style.transform = 'translateX(full)';
    setTimeout(() => {
      if (notification.parentElement) {
        notification.parentElement.removeChild(notification);
      }
    }, 300);
  }, 3000);
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
