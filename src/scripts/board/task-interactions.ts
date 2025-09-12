// src/scripts/board/task-interactions.ts
// Manejo de interacciones de tareas: crear, editar, archivar, seleccionar

console.log('🚀 Cargando módulo task-interactions.ts');

import { createTask, updateTask, archiveTask, updateColumn, archiveColumn, deleteColumn } from '../../firebase/api';
import type { Task } from '../../types/domain';

// Estado de selección
let selectedTaskId: string | null = null;
let selectedColumnId: string | null = null;

// Referencias a listeners delegados para poder removerlos
let taskClickListener: ((event: Event) => void) | null = null;
let columnClickListener: ((event: Event) => void) | null = null;

// Flag para evitar múltiples inicializaciones
let isInteractionsInitialized = false;

// Función para preservar el estado del dropdown de archivados durante operaciones de restauración
function preserveArchivedDropdownState(): { isArchivedViewOpen: boolean; isDropdownOpen: boolean } {
  const archivedTasksView = document.getElementById('archived-tasks-view');
  const menuDropdown = document.getElementById('menu-dropdown');

  // Verificar si el dropdown de archivados está abierto
  const isArchivedViewOpen = archivedTasksView ? !archivedTasksView.classList.contains('hidden') : false;
  const isDropdownOpen = menuDropdown ? !menuDropdown.classList.contains('hidden') : false;

  console.log('📊 Estado del dropdown antes de restauración:', {
    isArchivedViewOpen,
    isDropdownOpen
  });

  return { isArchivedViewOpen, isDropdownOpen };
}

// Función para restaurar el estado del dropdown después de recargar el board
async function restoreArchivedDropdownState(previousState: { isArchivedViewOpen: boolean; isDropdownOpen: boolean }) {
  const { isArchivedViewOpen, isDropdownOpen } = previousState;

  console.log('🔄 Iniciando restauración del estado del dropdown:', previousState);

  if (isDropdownOpen) {
    const menuDropdown = document.getElementById('menu-dropdown');
    
    // Usar requestAnimationFrame para asegurar que el DOM esté actualizado
    requestAnimationFrame(() => {
      menuDropdown?.classList.remove('hidden');
      console.log('✅ Dropdown abierto');

      if (isArchivedViewOpen) {
        // Esperar un poco más para que el dropdown se abra completamente
        setTimeout(() => {
          if (typeof (window as any).showArchivedTasksView === 'function') {
            (window as any).showArchivedTasksView();
            console.log('✅ Vista de archivados mostrada');
          }
        }, 100);
      }
    });
  }

  console.log('✅ Estado del dropdown restaurado:', previousState);
}

// Función global para restaurar tarea (llamada desde BoardHeader.astro)
async function optimizedRestoreTask(taskId: string) {
  console.log('🔄 optimizedRestoreTask llamada con:', taskId);

  // Preservar el estado del dropdown antes de la restauración
  const dropdownState = preserveArchivedDropdownState();

  // Pausar el event listener que cierra el dropdown durante la restauración
  if (typeof (window as any).pauseDropdownCloseListener === 'function') {
    (window as any).pauseDropdownCloseListener();
  }

  try {
    const { restoreTask } = await import('../../firebase/api');
    console.log('🔄 Llamando restoreTask con:', taskId);
    await restoreTask(taskId);

    console.log('✅ Tarea restaurada exitosamente');

    // Actualizar la lista de elementos archivados
    if (typeof (window as any).loadArchivedColumnsInDropdown === 'function') {
      (window as any).loadArchivedColumnsInDropdown(true);
    }

    // Recargar el board para mostrar la tarea restaurada
    await reloadBoard();

    // Restaurar el estado del dropdown después de recargar
    setTimeout(() => {
      restoreArchivedDropdownState(dropdownState);
      
      // Reactivar el event listener que cierra el dropdown
      if (typeof (window as any).resumeDropdownCloseListener === 'function') {
        (window as any).resumeDropdownCloseListener();
      }
    }, 500); // Aumentar el tiempo de espera

    return { success: true };
  } catch (error) {
    console.error('❌ Error restaurando tarea:', error);
    
    // Asegurarse de reactivar el event listener en caso de error
    if (typeof (window as any).resumeDropdownCloseListener === 'function') {
      (window as any).resumeDropdownCloseListener();
    }
    
    return { success: false, error };
  }
}

// Función global para restaurar columna (llamada desde BoardHeader.astro)
async function optimizedRestoreColumn(columnId: string) {
  console.log('🔄 optimizedRestoreColumn llamada con:', columnId);

  // Preservar el estado del dropdown antes de la restauración
  const dropdownState = preserveArchivedDropdownState();

  // Pausar el event listener que cierra el dropdown durante la restauración
  if (typeof (window as any).pauseDropdownCloseListener === 'function') {
    (window as any).pauseDropdownCloseListener();
  }

  try {
    const { restoreColumn } = await import('../../firebase/api');
    const boardRoot = document.getElementById('board-root');
    const boardId = boardRoot?.getAttribute('data-board-id') || '';

    console.log('🔄 Llamando restoreColumn con:', { columnId, boardId });

    await restoreColumn(columnId, boardId);

    console.log('✅ Columna restaurada exitosamente');

    // Actualizar la lista de elementos archivados
    if (typeof (window as any).loadArchivedColumnsInDropdown === 'function') {
      (window as any).loadArchivedColumnsInDropdown(true);
    }

    // Recargar el board para mostrar la columna restaurada
    await reloadBoard();

    // Restaurar el estado del dropdown después de recargar
    setTimeout(() => {
      restoreArchivedDropdownState(dropdownState);
      
      // Reactivar el event listener que cierra el dropdown
      if (typeof (window as any).resumeDropdownCloseListener === 'function') {
        (window as any).resumeDropdownCloseListener();
      }
    }, 500); // Aumentar el tiempo de espera

    return { success: true };
  } catch (error) {
    console.error('❌ Error restaurando columna:', error);
    
    // Asegurarse de reactivar el event listener en caso de error
    if (typeof (window as any).resumeDropdownCloseListener === 'function') {
      (window as any).resumeDropdownCloseListener();
    }
    
    return { success: false, error };
  }
}

// Función para posicionar el modal de eliminación de columna debajo del botón
function positionColumnDeleteModal(buttonElement: HTMLElement, modal: HTMLElement) {
  if (!modal || !buttonElement) return;

  const rect = buttonElement.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

  // Posicionar el modal debajo del botón con margen
  modal.style.position = 'absolute';
  modal.style.top = `${rect.bottom + scrollTop + 2}px`; // 2px de margen debajo del botón
  modal.style.left = `${rect.left + scrollLeft}px`;

  // Verificar si el modal se sale por la derecha de la pantalla
  const modalWidth = 288; // w-72 = 288px
  if (rect.left + modalWidth > window.innerWidth) {
    // Alinear a la derecha del botón
    modal.style.left = `${rect.right + scrollLeft - modalWidth}px`;
  }

  console.log('📍 Modal de columna posicionado en:', {
    top: modal.style.top,
    left: modal.style.left,
    buttonRect: rect
  });
}

// Función global para mostrar modal de eliminación de columna
async function showColumnDeleteModal(columnId: string, columnName: string, buttonElement?: HTMLElement) {
  console.log('🗑️ showColumnDeleteModal llamada con:', { columnId, columnName });

  // Crear modal pequeño como el de tareas
  const modal = document.createElement('div');
  modal.className = 'absolute bg-white rounded-lg shadow-lg border border-gray-200 z-50 w-72';
  modal.innerHTML = `
    <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200">
      <h3 class="text-sm font-medium text-gray-800">¿Eliminar la columna?</h3>
      <button class="close-column-delete-modal text-gray-400 hover:text-gray-600 transition-colors p-1">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
    <div class="px-3 py-3">
      <p class="text-gray-600 text-xs mb-3 leading-relaxed">
        Se eliminarán permanentemente la columna <strong>"${columnName}"</strong> y todas sus tareas. No es posible deshacer esta acción.
      </p>
      <div class="flex space-x-2">
        <button
          class="confirm-column-delete flex-1 px-3 py-2 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors"
        >
          Eliminar
        </button>
        <button
          class="cancel-column-delete flex-1 px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  console.log('🗑️ Modal de eliminación creado y añadido al DOM');

  // Posicionar el modal debajo del botón si se proporciona, sino en el centro
  if (buttonElement) {
    positionColumnDeleteModal(buttonElement, modal);
  } else {
    // Fallback: posicionar en el centro de la pantalla
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.zIndex = '60';
  }

  // Manejar eventos del modal
  const closeModal = () => {
    console.log('🗑️ Cerrando modal de eliminación');
    modal.remove();
  };

  modal.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    console.log('🗑️ Click detectado en modal:', target.className);

    if (target.closest('.close-column-delete-modal') || target.closest('.cancel-column-delete')) {
      console.log('🗑️ Cancelando eliminación');
      closeModal();
      return;
    }

    if (target.closest('.confirm-column-delete')) {
      console.log('🗑️ Confirmando eliminación de columna:', columnId);
      try {
        console.log('�️ Eliminando columna permanentemente:', columnId);

        const { deleteColumn } = await import('../../firebase/api');
        const boardRoot = document.getElementById('board-root');
        const boardId = boardRoot?.getAttribute('data-board-id') || '';

        await deleteColumn(columnId, boardId);

        console.log('✅ Columna eliminada permanentemente');

        // Actualizar la lista de elementos archivados
        if (typeof (window as any).loadArchivedColumnsInDropdown === 'function') {
          (window as any).loadArchivedColumnsInDropdown(true);
        }

        closeModal();

      } catch (error) {
        console.error('❌ Error eliminando columna:', error);
        closeModal();
      }
    }
  });
}

// Función global para eliminar tarea permanentemente (llamada desde BoardHeader.astro)
async function deleteTaskGlobal(taskId: string) {
  console.log('🗑️ Eliminando tarea permanentemente:', taskId);

  try {
    const { deleteTask } = await import('../../firebase/api');
    await deleteTask(taskId);

    console.log('✅ Tarea eliminada permanentemente');

    // Actualizar la lista de elementos archivados
    if (typeof (window as any).loadArchivedColumnsInDropdown === 'function') {
      (window as any).loadArchivedColumnsInDropdown(true);
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Error eliminando tarea:', error);
    return { success: false, error };
  }
}

// Exponer funciones globales inmediatamente después de definirlas
console.log('�🚀 Exponiendo funciones globales de task-interactions...');

// Exponer funciones globales para manejo de elementos archivados
(window as any).optimizedRestoreTask = optimizedRestoreTask;
(window as any).optimizedRestoreColumn = optimizedRestoreColumn;
(window as any).showColumnDeleteModal = showColumnDeleteModal;
(window as any).deleteTask = deleteTaskGlobal;

console.log('✅ Funciones globales expuestas:', {
  optimizedRestoreTask: typeof (window as any).optimizedRestoreTask,
  optimizedRestoreColumn: typeof (window as any).optimizedRestoreColumn,
  showColumnDeleteModal: typeof (window as any).showColumnDeleteModal,
  deleteTask: typeof (window as any).deleteTask
});

// Configurar interacciones de tareas
export function setupTaskInteractions() {
  // Evitar múltiples inicializaciones
  if (isInteractionsInitialized) {
    console.log('ℹ️ Interacciones ya inicializadas, saltando...');
    return;
  }

  console.log('🎯 Configurando interacciones de tareas...');

  // Función simplificada para debugging
  function initInteractions() {
    console.log('🎯 Inicializando interacciones simplificadas...');

    // Buscar todos los botones de agregar tarea
    const addTaskButtons = document.querySelectorAll('.add-task-btn');
    console.log(`📊 Encontrados ${addTaskButtons.length} botones de agregar tarea`);

    // Agregar event listeners individuales a cada botón
    addTaskButtons.forEach((button, index) => {
      console.log(`🎯 Configurando botón ${index + 1}:`, button);

      // Remover event listeners existentes para evitar duplicados
      const newButton = button.cloneNode(true) as HTMLElement;
      button.parentNode?.replaceChild(newButton, button);

      // Agregar event listener
      newButton.addEventListener('click', (event) => {
        event.preventDefault();
        // Remover stopPropagation para no interferir con otros listeners
        // event.stopPropagation();

        console.log('🎯 Click detectado en botón agregar tarea');

        // Encontrar el columnId
        const columnContainer = newButton.closest('.flex.flex-col') as HTMLElement;
        const taskList = columnContainer?.querySelector('.task-list') as HTMLElement;
        const columnId = taskList?.getAttribute('data-id');

        if (columnId) {
          console.log('✅ ColumnId encontrado:', columnId);
          showAddTaskInline(newButton);
        } else {
          console.error('❌ No se pudo encontrar columnId');
        }
      });

      console.log(`✅ Event listener configurado para botón ${index + 1}`);
    });

    // Limpiar listeners delegados existentes
    if (taskClickListener) {
      document.removeEventListener('click', taskClickListener);
    }
    if (columnClickListener) {
      document.removeEventListener('click', columnClickListener);
    }

    // También mantener los event listeners delegados como respaldo
    taskClickListener = handleTaskClick;
    columnClickListener = handleColumnClick;
    document.addEventListener('click', taskClickListener);
    document.addEventListener('click', columnClickListener);

    console.log('✅ Interacciones simplificadas configuradas');
  }

  // Ejecutar la inicialización
  initInteractions();

  console.log('✅ Interacciones de tareas configuradas');

  // Marcar como inicializado
  isInteractionsInitialized = true;

  // Ejecutar diagnóstico después de un breve delay
  setTimeout(() => {
    runDiagnostics();
  }, 1000);
}

// Función de diagnóstico para debugging
function runDiagnostics() {
  console.log('🔍 Ejecutando diagnóstico de interacciones...');

  const addTaskButtons = document.querySelectorAll('.add-task-btn');
  const taskLists = document.querySelectorAll('.task-list');
  const boardRoot = document.getElementById('board-root');

  console.log('📊 Diagnóstico:');
  console.log(`- Botones "Agregar tarea" encontrados: ${addTaskButtons.length}`);
  console.log(`- Listas de tareas encontradas: ${taskLists.length}`);
  console.log(`- Board root encontrado: ${boardRoot ? 'Sí' : 'No'}`);
  console.log(`- Board ID: ${boardRoot?.getAttribute('data-board-id') || 'No encontrado'}`);

  addTaskButtons.forEach((btn, index) => {
    console.log(`- Botón ${index + 1}:`, btn);
    console.log(`  - Texto: "${btn.textContent?.trim()}"`);
    console.log(`  - Tiene clase 'add-task-btn': ${btn.classList.contains('add-task-btn')}`);
    console.log(`  - Está visible: ${(btn as HTMLElement).offsetParent !== null}`);
  });

  // Verificar que los event listeners estén funcionando
  console.log('🎯 Probando event listeners...');
  const testEvent = new Event('click', { bubbles: true });
  const firstButton = addTaskButtons[0] as HTMLElement;
  if (firstButton) {
    console.log('🚀 Disparando evento de prueba en primer botón...');
    firstButton.dispatchEvent(testEvent);
  }

  console.log('✅ Diagnóstico completado');
}

// Manejar clicks en tareas
function handleTaskClick(event: Event) {
  const target = event.target as HTMLElement;
  const taskElement = target.closest('[data-task-id]') as HTMLElement;

  if (!taskElement) return;

  const taskId = taskElement.dataset.taskId;
  if (!taskId) return;

  // Si es el selector circular, seleccionar/deseleccionar
  if (target.closest('.task-selector')) {
    event.stopPropagation();
    selectTask(taskId, taskElement);
    return;
  }

  // Si es un botón de acción, ejecutarlo
  if (target.closest('.task-action-btn')) {
    handleTaskAction(event, taskId);
    return; // Importante: retornar para evitar que se ejecute selectTask
  }

  // Si no es ninguno de los anteriores, no hacer nada (no seleccionar automáticamente)
  // La selección solo debe ocurrir al hacer click en el selector circular
}

// Manejar clicks en columnas
function handleColumnClick(event: Event) {
  const target = event.target as HTMLElement;
  console.log('🎯 Click detectado en columna:', target.className, target.tagName);

  // Ignorar clicks en botones de agregar tarea (ya manejados por listeners individuales)
  if (target.closest('.add-task-btn')) {
    console.log('ℹ️ Click en botón agregar tarea, ignorando en handler de columna');
    return;
  }

  // Verificar si el click ocurrió dentro de una columna
  const columnContainer = target.closest('.flex.flex-col') as HTMLElement;
  if (!columnContainer) {
    console.log('ℹ️ Click fuera de columna, ignorando');
    return;
  }

  // Buscar el contenedor de la columna (el div principal con flex flex-col)
  let columnElement: HTMLElement | null = null;

  // Buscar el botón del menú de columna (incluyendo elementos hijos como SVG)
  const columnMenuBtn = target.closest('.column-menu-btn') as HTMLElement;

  if (columnMenuBtn) {
    // Si el click viene del menú de columna, usar el contenedor ya encontrado
    columnElement = columnContainer;
  } else {
    // Para otros elementos, usar la lógica existente
    columnElement = target.closest('.task-list')?.parentElement as HTMLElement;
  }

  if (!columnElement) {
    console.log('❌ No se encontró el contenedor de la columna');
    return;
  }

  // Obtener el columnId desde el data-id del task-list
  const columnId = columnElement.querySelector('.task-list')?.getAttribute('data-id');
  if (!columnId) {
    console.log('❌ No se encontró el columnId');
    return;
  }

  console.log('✅ ColumnId encontrado:', columnId);

  // Si es el menú de 3 puntos de la columna
  if (columnMenuBtn) {
    event.preventDefault();
    showColumnMenu(columnId, columnMenuBtn);
    return;
  }

  // Si es un botón de acción de columna
  if (target.closest('.column-action-btn')) {
    const actionBtn = target.closest('.column-action-btn') as HTMLElement;
    const action = actionBtn?.dataset.action;
    if (action) {
      handleColumnAction(action, columnId);
    }
    return;
  }
}

// Actualizar UI de selección de tareas
function updateTaskSelectionUI() {
  // Remover selección anterior si existe
  if (selectedTaskId) {
    const prevSelected = document.querySelector(`[data-task-id="${selectedTaskId}"]`);
    if (prevSelected) {
      prevSelected.classList.remove('ring-2', 'ring-blue-500');
      const prevSelector = prevSelected.querySelector('.task-selector') as HTMLElement;
      if (prevSelector) {
        prevSelector.classList.remove('bg-blue-500', 'border-blue-500');
        prevSelector.innerHTML = '';
      }
      hideTaskActions(selectedTaskId);
    }
  }
}

// Seleccionar tarea
function selectTask(taskId: string, taskElement: HTMLElement) {
  console.log('🎯 Seleccionando tarea:', taskId);

  // Remover selección anterior
  if (selectedTaskId) {
    const prevSelected = document.querySelector(`[data-task-id="${selectedTaskId}"]`);
    if (prevSelected) {
      prevSelected.classList.remove('ring-2', 'ring-blue-500');
      const prevSelector = prevSelected.querySelector('.task-selector') as HTMLElement;
      if (prevSelector) {
        prevSelector.classList.remove('bg-blue-500', 'border-blue-500');
        prevSelector.innerHTML = '';
      }
      hideTaskActions(selectedTaskId);
    }
  }

  // Si es la misma tarea, deseleccionar
  if (selectedTaskId === taskId) {
    console.log('🔄 Deseleccionando tarea (era la misma):', taskId);
    selectedTaskId = null;
    return;
  }

  // Seleccionar nueva tarea
  console.log('✅ Seleccionando nueva tarea:', taskId);
  selectedTaskId = taskId;
  taskElement.classList.add('ring-2', 'ring-blue-500');

  // Marcar el selector como seleccionado
  const selector = taskElement.querySelector('.task-selector') as HTMLElement;
  if (selector) {
    selector.classList.add('bg-blue-500', 'border-blue-500');
    selector.innerHTML = `
      <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
    `;
  }

  showTaskActions(taskId, taskElement);
}

// Mostrar acciones de tarea (los botones aparecen cuando está seleccionada)
function showTaskActions(taskId: string, taskElement: HTMLElement) {
  console.log('🎯 Mostrando acciones para tarea:', taskId);
  const actionsContainer = taskElement.querySelector('.task-actions') as HTMLElement;
  console.log('📦 Contenedor de acciones encontrado:', !!actionsContainer);

  if (actionsContainer) {
    console.log('✅ Aplicando opacidad 100 a acciones');
    actionsContainer.classList.remove('opacity-0');
    actionsContainer.classList.add('opacity-100');
    console.log('🎨 Clases finales:', actionsContainer.className);
  } else {
    console.error('❌ No se encontró el contenedor .task-actions para la tarea:', taskId);
  }
}

// Ocultar acciones de tarea
function hideTaskActions(taskId: string) {
  console.log('🙈 Ocultando acciones para tarea:', taskId);
  const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
  console.log('📦 Elemento de tarea encontrado:', !!taskElement);

  if (taskElement) {
    const actionsContainer = taskElement.querySelector('.task-actions') as HTMLElement;
    console.log('📦 Contenedor de acciones encontrado:', !!actionsContainer);

    if (actionsContainer) {
      console.log('✅ Aplicando opacidad 0 a acciones');
      actionsContainer.classList.remove('opacity-100');
      actionsContainer.classList.add('opacity-0');
      console.log('🎨 Clases finales:', actionsContainer.className);
    } else {
      console.error('❌ No se encontró el contenedor .task-actions para la tarea:', taskId);
    }
  } else {
    console.error('❌ No se encontró el elemento de tarea:', taskId);
  }
}

// Mostrar campo inline para agregar tarea
function showAddTaskInline(addTaskBtn: HTMLElement) {
  console.log('🚀 Mostrando campo inline para agregar tarea');

  // Encontrar el contenedor de agregar tarea
  const addTaskArea = addTaskBtn.closest('.add-task-area') as HTMLElement;
  if (!addTaskArea) {
    console.error('❌ No se encontró el contenedor add-task-area');
    return;
  }

  // Encontrar el botón y el formulario
  const addTaskButton = addTaskArea.querySelector('.add-task-btn') as HTMLElement;
  const addTaskForm = addTaskArea.querySelector('.add-task-form') as HTMLElement;
  let taskInput = addTaskArea.querySelector('.task-input') as HTMLTextAreaElement;
  let submitBtn = addTaskArea.querySelector('.add-task-submit') as HTMLButtonElement;
  let cancelBtn = addTaskArea.querySelector('.cancel-add-task') as HTMLButtonElement;

  if (!addTaskButton || !addTaskForm || !taskInput || !submitBtn || !cancelBtn) {
    console.error('❌ No se encontraron todos los elementos necesarios');
    return;
  }

  // Obtener el columnId
  const columnContainer = addTaskBtn.closest('.flex.flex-col') as HTMLElement;
  const taskList = columnContainer?.querySelector('.task-list') as HTMLElement;
  const columnId = taskList?.getAttribute('data-id');

  if (!columnId) {
    console.error('❌ No se pudo encontrar columnId');
    return;
  }

  // Ocultar el botón y mostrar el formulario
  addTaskButton.classList.add('hidden');
  addTaskForm.classList.remove('hidden');

  // Limpiar listeners existentes clonando elementos
  const newTaskInput = taskInput.cloneNode(true) as HTMLTextAreaElement;
  const newSubmitBtn = submitBtn.cloneNode(true) as HTMLButtonElement;
  const newCancelBtn = cancelBtn.cloneNode(true) as HTMLButtonElement;

  taskInput.parentNode?.replaceChild(newTaskInput, taskInput);
  submitBtn.parentNode?.replaceChild(newSubmitBtn, submitBtn);
  cancelBtn.parentNode?.replaceChild(newCancelBtn, cancelBtn);

  // Actualizar referencias
  taskInput = newTaskInput;
  submitBtn = newSubmitBtn;
  cancelBtn = newCancelBtn;

  // Función para cerrar el formulario
  const closeForm = () => {
    console.log('❌ Cerrando formulario inline');
    addTaskForm.classList.add('hidden');
    addTaskButton.classList.remove('hidden');
    taskInput.value = '';
    taskInput.blur();

    // Remover event listeners
    document.removeEventListener('click', handleClickOutside);
    taskInput.removeEventListener('keydown', handleKeyDown);
    submitBtn.removeEventListener('click', handleSubmit);
    cancelBtn.removeEventListener('click', handleCancel);
  };

  // Función para manejar submit
  const handleSubmit = async () => {
    const title = taskInput.value.trim();
    if (!title) return;

    console.log('📝 Creando tarea inline:', title);

    try {
      // Obtener boardId
      const boardRoot = document.getElementById('board-root');
      const boardId = boardRoot?.getAttribute('data-board-id');

      if (!boardId) {
        console.error('❌ No se pudo obtener boardId');
        (window as any).showToast('Error: No se pudo identificar el tablero');
        return;
      }

      // Obtener el número de tareas en la columna para determinar el orden
      const existingTasks = taskList?.querySelectorAll('[data-task-id]').length || 0;

      const result = await createTask(title, boardId, columnId, existingTasks);

      if (result.success) {
        console.log('✅ Tarea creada exitosamente');
        taskInput.value = ''; // Mantener el campo abierto para agregar más tareas
        await reloadBoard();
      } else {
        console.error('❌ Error al crear tarea:', result.error);
        (window as any).showToast('Error al crear la tarea');
      }
    } catch (error) {
      console.error('❌ Error al crear tarea:', error);
      (window as any).showToast('Error al crear la tarea');
    }
  };

  // Función para manejar cancelar
  const handleCancel = () => {
    closeForm();
  };

  // Variable para almacenar la función de click outside
  let handleClickOutside: (event: Event) => void;

  // Función para manejar click fuera del área
  handleClickOutside = (event: Event) => {
    const target = event.target as HTMLElement;
    if (!addTaskArea.contains(target)) {
      closeForm();
    }
  };

  // Función para manejar teclas
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeForm();
    }
  };

  // Agregar event listeners
  taskInput.addEventListener('keydown', handleKeyDown);
  submitBtn.addEventListener('click', handleSubmit);
  cancelBtn.addEventListener('click', handleCancel);

  // Agregar listener para click fuera (con delay para evitar que se dispare inmediatamente)
  setTimeout(() => {
    document.addEventListener('click', handleClickOutside);
  }, 10);

  // Agregar efecto de foco al input
  taskInput.addEventListener('focus', () => {
    const formContainer = addTaskForm.querySelector('div') as HTMLElement;
    if (formContainer) {
      formContainer.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50');
    }
  });

  taskInput.addEventListener('blur', () => {
    const formContainer = addTaskForm.querySelector('div') as HTMLElement;
    if (formContainer) {
      formContainer.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50');
    }
  });

  console.log('✅ Campo inline configurado completamente');
}

// Archivar tarea con animación suave
async function archiveTaskById(taskId: string) {
  console.log('📦 Archivando tarea:', taskId);

  // Buscar la tarea en el DOM
  const taskElement = document.querySelector(`[data-task-id="${taskId}"]`) as HTMLElement;
  if (!taskElement) {
    console.error('❌ No se encontró la tarea con ID:', taskId);
    return;
  }

  // Agregar animación de desvanecimiento y desplazamiento hacia arriba
  taskElement.style.transition = 'all 0.4s ease-out';
  taskElement.style.opacity = '0';
  taskElement.style.transform = 'translateY(-20px) scale(0.95)';
  taskElement.style.pointerEvents = 'none';

  try {
    // Llamar a la API para archivar la tarea
    const result = await archiveTask(taskId);

    if (result.success) {
      console.log('✅ Tarea archivada exitosamente');

      // Esperar a que termine la animación antes de remover el elemento
      setTimeout(() => {
        // Remover la tarea del DOM
        if (taskElement.parentElement) {
          taskElement.parentElement.removeChild(taskElement);
        }

        // Actualizar el contador de tareas en la columna si existe
        updateColumnTaskCount(taskElement);
      }, 400);

    } else {
      console.error('❌ Error al archivar tarea:', result.error);

      // Revertir la animación si hay error
      taskElement.style.opacity = '1';
      taskElement.style.transform = 'translateY(0) scale(1)';
      taskElement.style.pointerEvents = 'auto';

      // Mostrar error
      (window as any).showToast?.('Error al archivar la tarea') ||
      alert('Error al archivar la tarea');
    }
  } catch (error) {
    console.error('❌ Error al archivar tarea:', error);

    // Revertir la animación si hay error
    taskElement.style.opacity = '1';
    taskElement.style.transform = 'translateY(0) scale(1)';
    taskElement.style.pointerEvents = 'auto';

    // Mostrar error
    (window as any).showToast?.('Error al archivar la tarea') ||
    alert('Error al archivar la tarea');
  }
}

// Actualizar contador de tareas en la columna
function updateColumnTaskCount(taskElement: HTMLElement) {
  // Buscar el contenedor de la columna
  const columnContainer = taskElement.closest('.bg-gray-100') as HTMLElement;
  if (!columnContainer) return;

  // Buscar el contador de tareas
  const taskCountElement = columnContainer.querySelector('.task-count') as HTMLElement;
  if (!taskCountElement) return;

  // Obtener el número actual de tareas en la columna
  const taskList = columnContainer.querySelector('.task-list') as HTMLElement;
  if (!taskList) return;

  const currentTasks = taskList.querySelectorAll('[data-task-id]').length;
  taskCountElement.textContent = `${currentTasks}`;
}

// Manejar acciones de tarea
function handleTaskAction(event: Event, taskId: string) {
  event.preventDefault();
  event.stopPropagation();

  const target = event.target as HTMLElement;
  const actionBtn = target.closest('.task-action-btn') as HTMLElement;
  const action = actionBtn?.dataset.action;

  console.log('🎯 Acción de tarea detectada:', action, 'para tarea:', taskId);

  switch (action) {
    case 'edit':
      showEditTaskInline(taskId);
      break;
    case 'archive':
      archiveTaskById(taskId);
      break;
  }
}

// Mostrar edición in-situ para la tarea
function showEditTaskInline(taskId: string) {
  console.log('✏️ Mostrando edición in-situ para tarea:', taskId);

  // Buscar la tarea en el DOM
  const taskElement = document.querySelector(`[data-task-id="${taskId}"]`) as HTMLElement;
  if (!taskElement) {
    console.error('❌ No se encontró la tarea con ID:', taskId);
    return;
  }

  // Obtener el elemento del título
  const titleElement = taskElement.querySelector('h4') as HTMLElement;
  if (!titleElement) {
    console.error('❌ No se encontró el elemento del título');
    return;
  }

  const currentTitle = titleElement.textContent?.trim() || '';
  const contentContainer = titleElement.parentElement as HTMLElement;

  // Crear el input editable
  const editInput = document.createElement('input');
  editInput.type = 'text';
  editInput.value = currentTitle;
  editInput.className = 'font-medium text-gray-900 text-sm leading-tight bg-transparent border-none outline-none w-full px-1 py-0.5 rounded focus:bg-white focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200';
  editInput.style.width = `${Math.max(titleElement.offsetWidth, 120)}px`;

  // Crear contenedor de controles
  const controlsContainer = document.createElement('div');
  controlsContainer.className = 'flex items-center space-x-1 mt-1 transition-opacity duration-200';

  // Botón guardar
  const saveBtn = document.createElement('button');
  saveBtn.innerHTML = `
    <svg class="w-4 h-4 text-green-600 hover:text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
    </svg>
  `;
  saveBtn.className = 'p-1 rounded hover:bg-green-50 transition-colors duration-150';
  saveBtn.title = 'Guardar cambios';

  // Botón cancelar
  const cancelBtn = document.createElement('button');
  cancelBtn.innerHTML = `
    <svg class="w-4 h-4 text-gray-500 hover:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
    </svg>
  `;
  cancelBtn.className = 'p-1 rounded hover:bg-gray-50 transition-colors duration-150';
  cancelBtn.title = 'Cancelar edición';

  // Agregar controles al contenedor
  controlsContainer.appendChild(saveBtn);
  controlsContainer.appendChild(cancelBtn);

  // Función para guardar cambios
  const saveChanges = async () => {
    const newTitle = editInput.value.trim();
    if (!newTitle) return;

    console.log('📝 Guardando cambios en tarea:', taskId, 'título:', newTitle);

    try {
      const result = await updateTask(taskId, newTitle);

      if (result.success) {
        console.log('✅ Tarea editada exitosamente');
        titleElement.textContent = newTitle;
        exitEditMode();
      } else {
        console.error('❌ Error al editar tarea:', result.error);
        (window as any).showToast('Error al editar la tarea');
      }
    } catch (error) {
      console.error('❌ Error al editar tarea:', error);
      (window as any).showToast('Error al editar la tarea');
    }
  };

  // Función para cancelar edición
  const cancelEdit = () => {
    console.log('❌ Cancelando edición de tarea:', taskId);
    exitEditMode();
  };

  // Función para salir del modo edición
  const exitEditMode = () => {
    // Deseleccionar la tarea si está seleccionada
    if (selectedTaskId === taskId) {
      console.log('🔄 Deseleccionando tarea después de edición:', taskId);
      selectedTaskId = null;
      selectedColumnId = null;
      updateTaskSelectionUI();
    }

    // Restaurar el elemento h4
    contentContainer.replaceChild(titleElement, editInput);

    // Remover controles
    if (controlsContainer.parentElement) {
      controlsContainer.parentElement.removeChild(controlsContainer);
    }

    // Remover event listeners
    document.removeEventListener('click', handleClickOutside);
    editInput.removeEventListener('keydown', handleKeyDown);
    saveBtn.removeEventListener('click', saveChanges);
    cancelBtn.removeEventListener('click', cancelEdit);

    console.log('✅ Modo edición finalizado');
  };

  // Función para manejar click fuera
  const handleClickOutside = (event: Event) => {
    const target = event.target as HTMLElement;
    if (!taskElement.contains(target)) {
      cancelEdit();
    }
  };

  // Función para manejar teclas
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveChanges();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelEdit();
    }
  };

  // Reemplazar el título con el input
  contentContainer.replaceChild(editInput, titleElement);

  // Agregar controles después del input
  contentContainer.appendChild(controlsContainer);

  // Mostrar controles con animación
  setTimeout(() => {
    controlsContainer.classList.add('opacity-100');
  }, 50);

  // Focus y selección del texto
  setTimeout(() => {
    editInput.focus();
    editInput.select();
  }, 100);

  // Agregar event listeners
  editInput.addEventListener('keydown', handleKeyDown);
  saveBtn.addEventListener('click', saveChanges);
  cancelBtn.addEventListener('click', cancelEdit);

  // Agregar listener para click fuera (con delay)
  setTimeout(() => {
    document.addEventListener('click', handleClickOutside);
  }, 10);

  console.log('✅ Modo edición in-situ activado');
}

// Manejar editar tarea
async function handleEditTask(taskId: string, modal: HTMLElement) {
  const titleInput = modal.querySelector('#edit-task-title') as HTMLInputElement;
  const descInput = modal.querySelector('#edit-task-description') as HTMLTextAreaElement;

  const title = titleInput.value.trim();
  const description = descInput.value.trim();

  if (!title) return;

  try {
    console.log('📝 Editando tarea:', taskId);

    const result = await updateTask(taskId, title, description || undefined);

    if (result.success) {
      console.log('✅ Tarea editada exitosamente');
      modal.remove();

      // Recargar el board para mostrar los cambios
      await reloadBoard();
    } else {
      console.error('❌ Error al editar tarea:', result.error);
      (window as any).showToast('Error al editar la tarea');
    }
  } catch (error) {
    console.error('❌ Error al editar tarea:', error);
    (window as any).showToast('Error al editar la tarea');
  }
}

// Función auxiliar para recargar el board
async function reloadBoard() {
  const boardRoot = document.getElementById('board-root');
  const boardId = boardRoot?.getAttribute('data-board-id');

  if (boardId) {
    try {
      console.log('🔄 Recargando board:', boardId);

      // Obtener board actualizado
      const { fetchBoardInfo } = await import('../../firebase/api');

      const board = await fetchBoardInfo(boardId);
      if (board) {
        // Usar la función renderColumns del módulo board-init
        const { renderColumns } = await import('./board-init');
        await renderColumns(board);

        // Re-inicializar las interacciones después de recargar
        setTimeout(async () => {
          // Resetear flag para permitir re-inicialización
          isInteractionsInitialized = false;
          const { setupTaskInteractions } = await import('./task-interactions');
          setupTaskInteractions();
        }, 100);

        console.log('✅ Board recargado exitosamente');
      }
    } catch (error) {
      console.error('❌ Error recargando board:', error);
    }
  }
}

// Limpiar estado al cambiar de board
export function clearTaskSelection() {
  // Limpiar flag de inicialización
  isInteractionsInitialized = false;

  // Limpiar listeners delegados
  if (taskClickListener) {
    document.removeEventListener('click', taskClickListener);
    taskClickListener = null;
  }
  if (columnClickListener) {
    document.removeEventListener('click', columnClickListener);
    columnClickListener = null;
  }

  if (selectedTaskId) {
    const selectedElement = document.querySelector(`[data-task-id="${selectedTaskId}"]`);
    if (selectedElement) {
      selectedElement.classList.remove('ring-2', 'ring-blue-500');
      const selector = selectedElement.querySelector('.task-selector') as HTMLElement;
      if (selector) {
        selector.classList.remove('bg-blue-500', 'border-blue-500');
        selector.innerHTML = '';
      }
      hideTaskActions(selectedTaskId);
    }
    selectedTaskId = null;
  }
}

// Mostrar menú de columna
function showColumnMenu(columnId: string, buttonElement: HTMLElement) {
  // Cerrar cualquier menú abierto
  closeAllMenus();

  const menu = document.createElement('div');
  menu.className = 'absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-48';
  menu.id = 'column-menu';

  menu.innerHTML = `
    <button class="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2" data-action="edit">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
      </svg>
      Editar columna
    </button>
    <button class="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2" data-action="archive">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path>
      </svg>
      Archivar columna
    </button>
  `;

  // Posicionar el menú
  const rect = buttonElement.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 4}px`;
  menu.style.left = `${rect.left}px`;

  document.body.appendChild(menu);

  // Manejar clicks en las opciones del menú
  menu.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const actionBtn = target.closest('[data-action]') as HTMLElement;
    if (!actionBtn) return;

    const action = actionBtn.dataset.action;
    handleColumnAction(action!, columnId);
    menu.remove();
  });

  // Cerrar menú al hacer click fuera
  document.addEventListener('click', function closeMenu(e) {
    if (!menu.contains(e.target as Node) && !buttonElement.contains(e.target as Node)) {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    }
  });
}

// Cerrar todos los menús
function closeAllMenus() {
  const menus = document.querySelectorAll('#column-menu, #task-menu');
  menus.forEach(menu => menu.remove());
}

// Mostrar edición inline para columna
function showEditColumnInline(columnId: string) {
  console.log('✏️ Mostrando edición inline para columna:', columnId);

  // Buscar la task-list primero (que tiene el data-id)
  const taskListElement = document.querySelector(`[data-id="${columnId}"]`);
  if (!taskListElement) {
    console.error('❌ No se encontró la task-list con ID:', columnId);
    return;
  }

  // Buscar el contenedor principal de la columna (padre de la task-list)
  const columnElement = taskListElement.parentElement as HTMLElement;
  if (!columnElement) {
    console.error('❌ No se encontró el contenedor de la columna');
    return;
  }

  // Buscar el elemento del título dentro del contenedor de la columna
  const titleElement = columnElement.querySelector('h3') as HTMLElement;
  if (!titleElement) {
    console.error('❌ No se encontró el elemento del título de la columna');
    return;
  }

  const currentTitle = titleElement.textContent?.trim() || '';
  const headerContainer = titleElement.parentElement as HTMLElement;

  // Crear el input editable
  const editInput = document.createElement('input');
  editInput.type = 'text';
  editInput.value = currentTitle;
  editInput.className = 'font-semibold text-gray-800 text-sm bg-transparent border-none outline-none w-full px-1 py-0.5 rounded focus:bg-white focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-200';
  editInput.style.width = `${Math.max(titleElement.offsetWidth, 120)}px`;

  // Crear contenedor de controles
  const controlsContainer = document.createElement('div');
  controlsContainer.className = 'flex items-center space-x-1 mt-1 transition-opacity duration-200';

  // Botón guardar
  const saveBtn = document.createElement('button');
  saveBtn.innerHTML = `
    <svg class="w-4 h-4 text-green-600 hover:text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
    </svg>
  `;
  saveBtn.className = 'p-1 rounded hover:bg-green-50 transition-colors duration-150';
  saveBtn.title = 'Guardar cambios';

  // Botón cancelar
  const cancelBtn = document.createElement('button');
  cancelBtn.innerHTML = `
    <svg class="w-4 h-4 text-gray-500 hover:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
    </svg>
  `;
  cancelBtn.className = 'p-1 rounded hover:bg-gray-50 transition-colors duration-150';
  cancelBtn.title = 'Cancelar edición';

  // Agregar controles al contenedor
  controlsContainer.appendChild(saveBtn);
  controlsContainer.appendChild(cancelBtn);

  // Función para guardar cambios
  const saveChanges = async () => {
    const newTitle = editInput.value.trim();
    if (!newTitle) return;

    console.log('📝 Guardando cambios en columna:', columnId, 'título:', newTitle);

    try {
      const result = await updateColumn(columnId, newTitle);

      if (result.success) {
        console.log('✅ Columna editada exitosamente');
        titleElement.textContent = newTitle;
        exitEditMode();
      } else {
        console.error('❌ Error al editar columna:', result.error);
        (window as any).showToast?.('Error al editar la columna') ||
        alert('Error al editar la columna');
      }
    } catch (error) {
      console.error('❌ Error al editar columna:', error);
      (window as any).showToast?.('Error al editar la columna') ||
      alert('Error al editar la columna');
    }
  };

  // Función para cancelar edición
  const cancelEdit = () => {
    console.log('❌ Cancelando edición de columna:', columnId);
    exitEditMode();
  };

  // Función para salir del modo edición
  const exitEditMode = () => {
    // Restaurar el elemento h3
    headerContainer.replaceChild(titleElement, editInput);

    // Remover controles
    if (controlsContainer.parentElement) {
      controlsContainer.parentElement.removeChild(controlsContainer);
    }

    // Remover event listeners
    document.removeEventListener('click', handleClickOutside);
    editInput.removeEventListener('keydown', handleKeyDown);
    saveBtn.removeEventListener('click', saveChanges);
    cancelBtn.removeEventListener('click', cancelEdit);

    console.log('✅ Modo edición de columna finalizado');
  };

  // Función para manejar click fuera
  const handleClickOutside = (event: Event) => {
    const target = event.target as HTMLElement;
    if (!columnElement.contains(target)) {
      cancelEdit();
    }
  };

  // Función para manejar teclas
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveChanges();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelEdit();
    }
  };

  // Reemplazar el título con el input
  headerContainer.replaceChild(editInput, titleElement);

  // Agregar controles después del input
  headerContainer.appendChild(controlsContainer);

  // Mostrar controles con animación
  setTimeout(() => {
    controlsContainer.classList.add('opacity-100');
  }, 50);

  // Focus y selección del texto
  setTimeout(() => {
    editInput.focus();
    editInput.select();
  }, 100);

  // Agregar event listeners
  editInput.addEventListener('keydown', handleKeyDown);
  saveBtn.addEventListener('click', saveChanges);
  cancelBtn.addEventListener('click', cancelEdit);

  // Agregar listener para click fuera (con delay)
  setTimeout(() => {
    document.addEventListener('click', handleClickOutside);
  }, 10);

  console.log('✅ Modo edición inline de columna activado');
}

// Eliminar columna por ID
async function deleteColumnById(columnId: string) {
  const boardRoot = document.getElementById('board-root');
  const boardId = boardRoot?.getAttribute('data-board-id');

  if (!boardId) {
    console.error('❌ No se pudo obtener boardId para eliminar columna');
    return;
  }

  try {
    console.log('🗑️ Eliminando columna:', columnId);

    await deleteColumn(columnId, boardId);

    console.log('✅ Columna eliminada exitosamente');

    // Recargar el board para mostrar los cambios
    await reloadBoard();

    // Mostrar notificación
    (window as any).showToast?.('Columna eliminada') ||
    alert('Columna eliminada');

  } catch (error) {
    console.error('❌ Error al eliminar columna:', error);
    (window as any).showToast?.('Error al eliminar la columna') ||
    alert('Error al eliminar la columna');
  }
}

// Archivar columna por ID
async function archiveColumnById(columnId: string) {
  const boardRoot = document.getElementById('board-root');
  const boardId = boardRoot?.getAttribute('data-board-id');

  if (!boardId) {
    console.error('❌ No se pudo obtener boardId para archivar columna');
    return;
  }

  try {
    console.log('📦 Archivando columna:', columnId);

    await archiveColumn(columnId, boardId);

    console.log('✅ Columna archivada exitosamente');

    // Ocultar la columna del DOM inmediatamente
    const columnElement = document.querySelector(`[data-id="${columnId}"]`)?.parentElement;
    if (columnElement) {
      columnElement.style.display = 'none';
      console.log('👁️ Columna ocultada del DOM');
    }

    // Actualizar la lista de elementos archivados en el dropdown
    if (typeof (window as any).loadArchivedColumnsInDropdown === 'function') {
      (window as any).loadArchivedColumnsInDropdown(true);
    }

    // No mostrar notificación ni alert según requerimiento del usuario

  } catch (error) {
    console.error('❌ Error al archivar columna:', error);
    // Si hay error, intentar recargar el board para restaurar el estado
    await reloadBoard();
  }
}

// Manejar acciones de columna
async function handleColumnAction(action: string, columnId: string) {
  console.log('🎯 Acción de columna detectada:', action, 'para columna:', columnId);

  switch (action) {
    case 'edit':
      showEditColumnInline(columnId);
      break;
    case 'archive':
      await archiveColumnById(columnId);
      break;
  }
}

// Función global para cargar elementos archivados en el dropdown
// Se llama desde BoardHeader.astro
async function loadArchivedColumnsInDropdown(forceRefresh = false) {
  console.log('📥 Cargando elementos archivados para dropdown...');

  const boardRoot = document.getElementById('board-root');
  const boardId = boardRoot?.getAttribute('data-board-id');

  if (!boardId) {
    console.error('❌ No se pudo obtener boardId para cargar archivados');
    return;
  }

  try {
    // Importar funciones de API
    const { getArchivedTasks, getArchivedColumns } = await import('../../firebase/api');

    // Obtener tareas y columnas archivadas
    const [archivedTasks, archivedColumns] = await Promise.all([
      getArchivedTasks(boardId),
      getArchivedColumns(boardId)
    ]);

    console.log('📊 Elementos archivados obtenidos:', {
      tasks: archivedTasks.length,
      columns: archivedColumns.length
    });

    // Obtener contenedor de la lista
    const archivedTasksList = document.getElementById('archived-tasks-list');
    const loadingElement = document.getElementById('loading-archived');

    if (!archivedTasksList) {
      console.error('❌ No se encontró el contenedor de elementos archivados');
      return;
    }

    // Ocultar loading
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }

    // Limpiar lista existente
    const existingItems = archivedTasksList.querySelectorAll('.archived-task-item, .archived-column-item');
    existingItems.forEach(item => item.remove());

    // Si no hay elementos archivados, mostrar mensaje
    if (archivedTasks.length === 0 && archivedColumns.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'text-center py-8 text-gray-500 text-sm';
      emptyMessage.textContent = 'No hay elementos archivados';
      archivedTasksList.appendChild(emptyMessage);
      return;
    }

    // Crear elementos para columnas archivadas
    archivedColumns.forEach(column => {
      const columnElement = document.createElement('div');
      columnElement.className = 'archived-column-item flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors';
      columnElement.setAttribute('data-column-id', column.id);

      columnElement.innerHTML = `
        <div class="flex items-center space-x-3">
          <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
          </svg>
          <span class="text-sm text-gray-700 font-medium">${column.name}</span>
          <span class="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">Columna</span>
        </div>
        <div class="flex items-center space-x-2">
          <button class="restore-column text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50 transition-colors" title="Restaurar columna">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
          </button>
          <button class="delete-column text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors" title="Eliminar columna permanentemente">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>
      `;

      archivedTasksList.appendChild(columnElement);
    });

    // Crear elementos para tareas archivadas
    archivedTasks.forEach(task => {
      const taskElement = document.createElement('div');
      taskElement.className = 'archived-task-item flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors';
      taskElement.setAttribute('data-task-id', task.id);

      taskElement.innerHTML = `
        <div class="flex items-center space-x-3">
          <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span class="text-sm text-gray-700">${task.title}</span>
          <span class="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">Tarea</span>
        </div>
        <div class="flex items-center space-x-2">
          <button class="restore-task text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50 transition-colors" title="Restaurar tarea">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
          </button>
          <button class="delete-task text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors" title="Eliminar tarea permanentemente">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>
      `;

      archivedTasksList.appendChild(taskElement);
    });

    console.log('✅ Elementos archivados cargados en dropdown');

  } catch (error) {
    console.error('❌ Error al cargar elementos archivados:', error);
  }
}

// Exponer función globalmente para que BoardHeader.astro pueda llamarla
(window as any).loadArchivedColumnsInDropdown = loadArchivedColumnsInDropdown;
