// Nuevo board-page.ts optimizado y sin conflictos
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { fetchBoardInfo, subscribeToBoardChanges, createColumn, createTask, archiveTask, restoreTask, deleteTask, getArchivedTasks, updateTask, archiveColumn, restoreColumn, deleteColumn, getArchivedColumns, updateColumn } from '../firebase/api';
import type { Board, Column, Task } from '../types/domain';
import Sortable from 'sortablejs';
// IMPORTAR la función de drag-and-drop para sincronización en tiempo real
import { handleOnEnd } from './drag-and-drop';

// Estado global de la aplicación
let currentBoard: Board | null = null;
let currentColumns: Column[] = [];
let currentTasks: Task[] = [];
let realtimeUnsubscribe: (() => void) | null = null;
let isInitialized = false;

// Estado para selección de tareas (como en Trello)
let selectedTaskIds: Set<string> = new Set();
let selectedTaskElement: HTMLElement | null = null;

// Control de scroll inteligente
let userScrollPosition = 0;
let shouldAutoScroll = false;
let scrollToNewColumn = false;

// Inicialización principal
export default async function initBoardPage(params?: { workspaceId?: string, boardId?: string }) {
  // Soporta llamada directa con params, o auto-lectura desde dataset (#board-root)
  const workspaceId = params?.workspaceId || document.getElementById('board-root')?.dataset.workspaceId || '';
  const boardId = params?.boardId || document.getElementById('board-root')?.dataset.boardId || '';
  console.log('🚀 Inicializando página del tablero optimizada:', { workspaceId, boardId });

  // Verificar autenticación
  const auth = getAuth();
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log('✅ Usuario autenticado:', user.email);
      if (workspaceId && boardId) await initializeBoard(workspaceId, boardId);
    } else {
      console.error('❌ Usuario no autenticado');
      window.location.href = '/login';
    }
  });
}

// Auto-inicialización si el script se carga directamente
if (typeof window !== 'undefined') {
  if (document.readyState !== 'loading') {
    const root = document.getElementById('board-root');
    if (root) initBoardPage();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      const root = document.getElementById('board-root');
      if (root) initBoardPage();
    });
  }
}

// Inicializar tablero
async function initializeBoard(workspaceId: string, boardId: string) {
  try {
    // Cargar información del tablero
    currentBoard = await fetchBoardInfo(boardId);
    console.log('✅ Tablero cargado:', currentBoard?.name);

    // Actualizar UI inicial
    updateBoardTitle(currentBoard?.name || 'Tablero'); // Actualizar título del tablero
    await updateWorkspaceLink(workspaceId);

    // Configurar tiempo real
    setupRealtimeSubscription(boardId);

    // Configurar event listeners globales
    setupGlobalEventListeners();

  } catch (error) {
    console.error('❌ Error inicializando tablero:', error);
  }
}

// Configurar suscripción en tiempo real
function setupRealtimeSubscription(boardId: string) {
  if (realtimeUnsubscribe) {
    realtimeUnsubscribe();
  }

  realtimeUnsubscribe = subscribeToBoardChanges(boardId, (columns, tasks) => {
    console.log('📡 Datos recibidos:', columns.length, 'columnas,', tasks.length, 'tareas');
    
    const columnsChanged = hasColumnsChanged(columns);
    const tasksChanged = hasTasksChanged(tasks);

    if (!isInitialized) {
      // Primera carga - renderizar todo
      currentColumns = columns;
      currentTasks = tasks;
      renderBoard();
      isInitialized = true;
    } else if (columnsChanged) {
      // Cambio en columnas - actualización inteligente
      handleColumnsUpdate(columns, tasks);
    } else if (tasksChanged) {
      // Solo cambio en tareas - actualización rápida
      currentTasks = tasks;
      updateTasksOnly();
    }
  });
}

// Configurar event listeners globales
function setupGlobalEventListeners() {
  // Deseleccionar tareas al hacer click fuera (como en Trello)
  document.addEventListener('click', (_e: Event) => {
    const target = _e.target as HTMLElement;
    
    // No deseleccionar si se hace click en:
    // 1. Una tarea o sus elementos hijos
    // 2. Un formulario de tarea o sus elementos
    // 3. Botones de acción
    const isTaskClick = target.closest('[data-task-id]');
    const isFormClick = target.closest('.task-form-active');
    const isActionClick = target.closest('button') || target.closest('svg');
    
    if (!isTaskClick && !isFormClick && !isActionClick) {
      deselectAllTasks();
    }
  });
  
  // // NUEVO: Event delegation para menús de columnas
  document.addEventListener('click', (_e) => {
    const target = (_e as unknown as Event).target as HTMLElement;
    const columnElement = target.closest('[data-column-id]') as HTMLElement;
    
    if (!columnElement) return;
    
    const columnId = columnElement.getAttribute('data-column-id');
    if (!columnId) return;
    
    // // Manejo de "Editar nombre de columna"
    if (target.closest('.edit-column-name')) {
      _e.stopPropagation();
      const titleElement = columnElement.querySelector('h3') as HTMLElement;
      const currentName = titleElement?.textContent || 'Sin nombre';
      
      console.log('✏️ Click en editar columna detectado:', { columnId, currentName });
      handleEditColumnInline(columnId, currentName);
      
      // Cerrar el menú
      const menuDropdown = columnElement.querySelector('.column-menu-dropdown') as HTMLElement;
      if (menuDropdown) {
        menuDropdown.classList.add('hidden');
      }
      return;
    }
    
    // // Manejo de "Archivar columna"
    if (target.closest('.archive-column')) {
      _e.stopPropagation();
      console.log('📦 Click en archivar columna detectado:', columnId);
      archiveColumnAction(columnId);
      
      // Cerrar el menú
      const menuDropdown = columnElement.querySelector('.column-menu-dropdown') as HTMLElement;
      if (menuDropdown) {
        menuDropdown.classList.add('hidden');
      }
      return;
    }
  });
  
  // // NUEVO: Event delegation para eliminar tareas
  document.addEventListener('click', (_e: Event) => {
    const target = _e.target as HTMLElement;
    
    // // Verificar si es un click en botón de eliminar tarea
    const deleteButton = target.closest('[data-action="delete-task"]') as HTMLElement;
    if (deleteButton) {
      _e.stopPropagation();
      const taskId = deleteButton.getAttribute('data-task-id');
      const taskTitle = deleteButton.getAttribute('data-task-title');
      
      if (taskId && taskTitle) {
        console.log('🗑️ Click en eliminar tarea detectado:', { taskId, taskTitle });
  showTaskDeleteModal(taskId, taskTitle, _e);
      }
      return;
    }
  });
  
  // Los event listeners para tareas archivadas ahora se configuran en BoardHeader.astro
  // para evitar problemas de timing y referencias de DOM
  
  console.log('✅ Event listeners globales configurados');
}

// Detectar cambios en columnas
function hasColumnsChanged(newColumns: Column[]): boolean {
  if (currentColumns.length !== newColumns.length) return true;
  
  for (let i = 0; i < currentColumns.length; i++) {
    if (currentColumns[i].id !== newColumns[i].id || currentColumns[i].name !== newColumns[i].name) {
      return true;
    }
  }
  return false;
}

// Detectar cambios en tareas
function hasTasksChanged(newTasks: Task[]): boolean {
  if (currentTasks.length !== newTasks.length) return true;
  
  for (let i = 0; i < currentTasks.length; i++) {
    const current = currentTasks[i];
    const newTask = newTasks.find(t => t.id === current.id);
    // AGREGAR verificación de cambios en order para drag-and-drop en tiempo real
    if (!newTask || 
        newTask.title !== current.title || 
        newTask.columnId !== current.columnId ||
        newTask.order !== current.order) {
      return true;
    }
  }
  return false;
}

// // Detectar si las nuevas columnas requieren reordenamiento
function requiresColumnReordering(newColumns: Column[]): boolean {
  const oldCount = currentColumns.length;
  const newCount = newColumns.length;
  
  // // Si se agregan nuevas columnas, verificar si requieren reordenamiento
  if (newCount > oldCount) {
    // // IDENTIFICAR las columnas que son realmente nuevas por ID
    const currentColumnIds = new Set(currentColumns.map(c => c.id));
    const actualNewColumns = newColumns.filter(c => !currentColumnIds.has(c.id));
    
    console.log('🔍 Identificando columnas nuevas:', {
      currentColumns: currentColumns.map(c => ({ id: c.id, name: c.name, order: c.order })),
      newColumns: newColumns.map(c => ({ id: c.id, name: c.name, order: c.order })),
      actualNewColumns: actualNewColumns.map(c => ({ id: c.id, name: c.name, order: c.order }))
    });
    
    // // Verificar si alguna columna nueva tiene un order menor que las existentes
    for (const newColumn of actualNewColumns) {
      for (const existingColumn of currentColumns) {
        if ((newColumn.order ?? 0) < (existingColumn.order ?? 0)) {
          console.log('🔄 Nueva columna requiere reordenamiento:', {
            newColumn: newColumn.name,
            newOrder: newColumn.order,
            existingColumn: existingColumn.name, 
            existingOrder: existingColumn.order
          });
          return true;
        }
      }
    }
  }
  
  // // Si hay el mismo número de columnas, verificar cambios de orden
  if (newCount === oldCount) {
    for (let i = 0; i < currentColumns.length; i++) {
      const currentColumn = currentColumns[i];
      const newColumn = newColumns.find(c => c.id === currentColumn.id);
      
      // // Si la columna no existe en el nuevo array, hay cambio
      if (!newColumn) return true;
      
      // // Si el order cambió o la posición en el array cambió, hay cambio de orden
      if (newColumn.order !== currentColumn.order || newColumns[i].id !== currentColumn.id) {
        return true;
      }
    }
  }
  
  return false;
}

// Manejar actualización de columnas
function handleColumnsUpdate(newColumns: Column[], newTasks: Task[]) {
  const oldCount = currentColumns.length;
  const newCount = newColumns.length;
  
  currentTasks = newTasks;

  // // NUEVA VERIFICACIÓN: Detectar si hay cambios de orden
  const hasOrderChanged = requiresColumnReordering(newColumns);
  
  console.log('🔍 Análisis de columnas:', {
    oldCount,
    newCount, 
    hasOrderChanged,
    currentColumns: currentColumns.map(c => ({ name: c.name, order: c.order })),
    newColumns: newColumns.map(c => ({ name: c.name, order: c.order }))
  });

  if (newCount > oldCount && !hasOrderChanged) {
    // Se agregaron columnas SIN cambios de orden - INSERCIÓN INCREMENTAL
    console.log('➕ Columnas agregadas, usando inserción incremental');
    addNewColumnsIncrementally(newColumns, oldCount);
  } else if (newCount < oldCount || hasOrderChanged) {
    // Se eliminaron columnas O cambió el orden - recrear necesario
    console.log(hasOrderChanged ? '🔄 Orden de columnas cambió, recreando' : '➖ Columnas eliminadas, recreando');
    currentColumns = newColumns;
    renderBoard();
  } else {
    // Mismo número y mismo orden - solo actualizar contenido
    console.log('✏️ Actualizando contenido de columnas');
    currentColumns = newColumns;
    updateColumnContents();
  }
}

// NUEVA FUNCIÓN: Agregar columnas de forma incremental SIN recrear DOM
function addNewColumnsIncrementally(newColumns: Column[], oldCount: number) {
  console.log(`🔧 Insertando ${newColumns.length - oldCount} nueva(s) columna(s) incrementalmente`);
  
  const wrapper = getColumnsContainer();
  console.log('🔍 Wrapper encontrado:', wrapper ? 'SÍ' : 'NO');
  
  if (!wrapper) {
    console.error('❌ No se encontró wrapper, fallback a renderBoard');
    currentColumns = newColumns;
    renderBoard();
    return;
  }

  // Encontrar el botón "Añade otra lista" 
  let addButton = wrapper.querySelector('#add-column-button') as HTMLElement;
  console.log('🔍 Botón encontrado:', addButton ? 'SÍ' : 'NO');
  
  if (!addButton) {
    console.log('� Botón no encontrado, creando nuevo botón');
    addButton = createAddColumnButton();
    wrapper.appendChild(addButton);
    console.log('✅ Nuevo botón agregado al wrapper');
  }

  // Guardar scroll actual
  const currentScroll = wrapper.scrollLeft;
  console.log('💾 Scroll actual:', currentScroll);

  // Agregar solo las nuevas columnas AL FINAL (inserción simple)
  // // Si hay cambios de orden, se manejará con recreación completa
  for (let i = oldCount; i < newColumns.length; i++) {
    const column = newColumns[i];
    const columnElement = createColumnElement(column, i);
    wrapper.insertBefore(columnElement, addButton);
    console.log('➕ Columna insertada:', column.name, 'con order:', column.order);
  }

  // Actualizar estado
  currentColumns = newColumns;

  // IMPORTANTE: Limpiar cualquier formulario activo antes de continuar
  const activeForm = wrapper.querySelector('.border-blue-200');
  if (activeForm) {
    console.log('🧹 Removiendo formulario activo');
    activeForm.remove();
    
    // Recrear botón limpio
    const newAddButton = createAddColumnButton();
    if (addButton.parentElement) {
      addButton.parentElement.replaceChild(newAddButton, addButton);
      addButton = newAddButton;
    }
  }

  // Configurar drag and drop para las nuevas columnas
  setTimeout(() => {
    setupDragAndDrop();
  }, 10);

  // Auto-scroll a la nueva columna SIN resetear scroll
  setTimeout(() => {
    const targetScroll = wrapper.scrollWidth - wrapper.clientWidth;
    
    // Scroll INSTANTÁNEO a la nueva columna (sin behavior smooth que causa saltos visuales)
    wrapper.scrollLeft = targetScroll;
    
    console.log('✨ Scroll instantáneo a nueva columna sin parpadeo');
  }, 10); // Reducir delay también
}

// Renderizar tablero completo
function renderBoard() {
  const container = document.getElementById('columns-container');
  if (!container) return;

  console.log('🎨 Renderizando tablero:', currentColumns.length, 'columnas');

  if (currentColumns.length === 0) {
    // Crear contenedor vacío con solo el botón "Añade otra lista"
    const wrapper = document.createElement('div');
    wrapper.className = 'flex gap-6 overflow-x-auto pb-4';
    wrapper.id = 'columns-wrapper';

    // Agregar botón "Añade otra lista"
    const addButton = createAddColumnButton();
    wrapper.appendChild(addButton);

    // Reemplazar contenido
    container.innerHTML = '';
    container.appendChild(wrapper);
    
    // Configurar listeners de scroll
    wrapper.addEventListener('scroll', () => {
      if (!shouldAutoScroll) {
        userScrollPosition = wrapper.scrollLeft;
      }
    });

    console.log('✅ Tablero vacío renderizado con botón para agregar columnas');
    return;
  }

  // Crear nuevo contenedor
  const wrapper = document.createElement('div');
  wrapper.className = 'flex gap-6 overflow-x-auto pb-4';
  wrapper.id = 'columns-wrapper';

  // Agregar columnas
  currentColumns.forEach((column, _index) => {
    const columnElement = createColumnElement(column, _index);
    wrapper.appendChild(columnElement);
  });

  // Agregar botón "Añade otra lista" al final
  const addButton = createAddColumnButton();
  wrapper.appendChild(addButton);

  // Reemplazar contenido
  container.innerHTML = '';
  container.appendChild(wrapper);

  // Configurar listeners de scroll
  wrapper.addEventListener('scroll', () => {
    if (!shouldAutoScroll) {
      userScrollPosition = wrapper.scrollLeft;
    }
  });

  // Manejar scroll después del render
  setTimeout(() => {
    handleScrollAfterRender(wrapper);
  }, 50);

  // Configurar drag and drop
  setupDragAndDrop();
}

// Manejar scroll después del renderizado
function handleScrollAfterRender(wrapper: HTMLElement) {
  if (scrollToNewColumn && shouldAutoScroll) {
    // Scroll a nueva columna
    wrapper.scrollLeft = wrapper.scrollWidth;
    console.log('🎯 Auto-scroll a nueva columna');
    scrollToNewColumn = false;
  } else if (!shouldAutoScroll && userScrollPosition > 0) {
    // Restaurar posición del usuario
    wrapper.scrollLeft = userScrollPosition;
    console.log('📍 Scroll restaurado a posición:', userScrollPosition);
  }
  
  shouldAutoScroll = false;
}

// Obtener contenedor de columnas
function getColumnsContainer(): HTMLElement | null {
  return document.getElementById('columns-wrapper');
}

// Actualizar solo contenido de columnas existentes
function updateColumnContents() {
  const wrapper = getColumnsContainer();
  if (!wrapper) return;

  console.log('🔄 Actualizando contenido de columnas existentes');
  
  currentColumns.forEach((column, _index) => {
    const columnElement = wrapper.querySelector(`[data-column-id="${column.id}"]`) as HTMLElement;
    if (columnElement) {
      updateColumnElement(columnElement, column);
    }
  });
}

// Actualizar solo tareas
function updateTasksOnly() {
  console.log('📝 Actualizando solo tareas');
  
  currentColumns.forEach(column => {
    const tasksContainer = document.querySelector(`[data-id="${column.id}"]`) as HTMLElement;
    if (tasksContainer) {
      // Filtrar tareas que pertenecen a esta columna y NO están archivadas
      const columnTasks = currentTasks.filter(task => 
        task.columnId === column.id && !task.archived
      );
      renderTasksInContainer(tasksContainer, columnTasks);
    }
  });
}

// Crear elemento de columna
function createColumnElement(column: Column, _index: number): HTMLElement {
  const columnDiv = document.createElement('div');
  columnDiv.className = 'bg-gray-100 rounded-lg p-3 min-w-80 max-w-80 h-fit';
  columnDiv.setAttribute('data-column-id', column.id);

  // Header de la columna con título y menú de opciones
  const headerDiv = document.createElement('div');
  headerDiv.className = 'flex items-center justify-between mb-3';

  // Título
  const title = document.createElement('h3');
  title.className = 'font-semibold text-gray-800 text-sm flex-1';
  title.textContent = column.name;

  // Menú de opciones (3 puntos)
  const menuContainer = document.createElement('div');
  menuContainer.className = 'relative';

  const menuButton = document.createElement('button');
  menuButton.className = 'p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors';
  menuButton.innerHTML = `
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
    </svg>
  `;

  // Dropdown del menú
  const menuDropdown = document.createElement('div');
  menuDropdown.className = 'absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 hidden';
  menuDropdown.innerHTML = `
    <div class="py-1">
      <button 
        class="edit-column-name w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
      >
        <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
        </svg>
        <span>Editar nombre</span>
      </button>
      <hr class="my-1 border-gray-200">
      <button 
        class="archive-column w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
      >
        <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8l6 6m0 0l6-6m-6 6v9a2 2 0 01-2 2H7a2 2 0 01-2-2v-9zM3 4h18"></path>
        </svg>
        <span>Archivar columna</span>
      </button>
    </div>
  `;

  // Toggle del menú
  menuButton.onclick = (e) => {
    e.stopPropagation();
    
    // Cerrar otros menús abiertos
    document.querySelectorAll('.column-menu-dropdown').forEach(dropdown => {
      if (dropdown !== menuDropdown) {
        dropdown.classList.add('hidden');
      }
    });
    
    menuDropdown.classList.toggle('hidden');
  };

  // Cerrar menú al hacer click fuera
  document.addEventListener('click', () => {
    menuDropdown.classList.add('hidden');
  });

  menuDropdown.className += ' column-menu-dropdown';

  menuContainer.appendChild(menuButton);
  menuContainer.appendChild(menuDropdown);

  headerDiv.appendChild(title);
  headerDiv.appendChild(menuContainer);

  // Contenedor de tareas
  const tasksContainer = document.createElement('div');
  tasksContainer.className = 'task-list space-y-1.5';
  tasksContainer.dataset.id = column.id;

  // Renderizar tareas (excluir las archivadas)
  const columnTasks = currentTasks.filter(task => 
    task.columnId === column.id && !task.archived
  );
  renderTasksInContainer(tasksContainer, columnTasks);

  // Botón agregar tarea
  const addTaskButton = createAddTaskButton(column.id);

  columnDiv.appendChild(headerDiv);
  columnDiv.appendChild(tasksContainer);
  columnDiv.appendChild(addTaskButton);

  return columnDiv;
}

// Actualizar elemento de columna existente
function updateColumnElement(columnElement: HTMLElement, column: Column) {
  const title = columnElement.querySelector('h3');
  if (title) title.textContent = column.name;

  const tasksContainer = columnElement.querySelector('.task-list') as HTMLElement;
  if (tasksContainer) {
    // Filtrar tareas que pertenecen a esta columna y NO están archivadas
    const columnTasks = currentTasks.filter(task => 
      task.columnId === column.id && !task.archived
    );
    renderTasksInContainer(tasksContainer, columnTasks);
  }
}

// Renderizar tareas en contenedor
function renderTasksInContainer(container: HTMLElement, tasks: Task[]) {
  container.innerHTML = '';
  
  tasks
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .forEach(task => {
      const taskElement = createTaskElement(task);
      container.appendChild(taskElement);
    });
}

// Crear elemento de tarea con sistema de selección como Trello
function createTaskElement(task: Task): HTMLElement {
  const taskDiv = document.createElement('div');
  taskDiv.className = 'bg-white p-2 rounded-md shadow-sm border border-gray-200 cursor-grab hover:shadow-md transition-all relative';
  taskDiv.setAttribute('data-task-id', task.id);

  // Círculo de selección (como en Trello)
  const selectionCircle = document.createElement('div');
  selectionCircle.className = 'absolute top-2 left-2 w-4 h-4 border-2 border-gray-300 rounded-full cursor-pointer hover:border-gray-400 transition-colors flex items-center justify-center';
  
  // Icono de check cuando está seleccionado
  const checkIcon = document.createElement('div');
  checkIcon.className = 'w-3 h-3 bg-green-500 rounded-full hidden items-center justify-center';
  checkIcon.innerHTML = `
    <svg class="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
    </svg>
  `;
  selectionCircle.appendChild(checkIcon);

  // Contenedor principal del contenido de la tarea
  const contentContainer = document.createElement('div');
  contentContainer.className = 'w-full pl-6'; // pl-6 para dar espacio al círculo

  const title = document.createElement('p');
  title.className = 'text-gray-800 font-medium text-sm leading-tight';
  title.textContent = task.title;

  contentContainer.appendChild(title);

  // Agregar descripción si existe
  if (task.description) {
    const description = document.createElement('p');
    description.className = 'text-gray-600 text-sm mt-1';
    description.textContent = task.description;
    contentContainer.appendChild(description);
  }

  // Contenedor de iconos de acción (solo aparece cuando la tarea está seleccionada)
  const actionsContainer = document.createElement('div');
  actionsContainer.className = 'absolute top-2 right-2 flex space-x-1 opacity-0 transition-opacity bg-white rounded p-1';
  actionsContainer.style.display = 'none'; // Oculto por defecto

  // Icono de editar
  const editButton = document.createElement('button');
  editButton.className = 'p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors';
  editButton.innerHTML = `
    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
    </svg>
  `;
  editButton.onclick = (e) => {
    e.stopPropagation(); // Evitar que se active el drag
    handleEditTaskInline(task);
  };

  // Icono de archivar
  const archiveButton = document.createElement('button');
  archiveButton.className = 'p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors';
  archiveButton.innerHTML = `
    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8l6 6m0 0l6-6m-6 6v9a2 2 0 01-2 2H7a2 2 0 01-2-2v-9zM3 4h18"></path>
    </svg>
  `;
  archiveButton.onclick = (e) => {
    e.stopPropagation(); // Evitar que se active el drag
    handleArchiveTask(task.id);
  };

  // Agregar botones al contenedor de acciones
  actionsContainer.appendChild(editButton);
  actionsContainer.appendChild(archiveButton);

  // Event listener para selección de tarea
  selectionCircle.onclick = (e) => {
    e.stopPropagation(); // Evitar que se active el drag
    toggleTaskSelection(task.id, taskDiv);
  };

  // Verificar si esta tarea ya está seleccionada al crearla
  if (selectedTaskIds.has(task.id)) {
    updateTaskSelectionUI(taskDiv, true);
  }

  // Ensamblar la tarea
  taskDiv.appendChild(selectionCircle);
  taskDiv.appendChild(contentContainer);
  taskDiv.appendChild(actionsContainer);

  return taskDiv;
}

// Crear botón "Añadir tarea"
function createAddTaskButton(columnId: string): HTMLElement {
  const button = document.createElement('button');
  button.className = 'w-full mt-3 p-2 text-gray-500 hover:bg-gray-200 hover:text-gray-700 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 transition-all text-sm font-medium flex items-center justify-center gap-2';
  button.innerHTML = `
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
    </svg>
    + Añade una tarjeta
  `;
  
  button.onclick = () => showInlineTaskForm(button, columnId);
  return button;
}

// Crear botón "Añadir columna"
function createAddColumnButton(): HTMLElement {
  const button = document.createElement('div');
  button.id = 'add-column-button';
  button.className = 'bg-gray-100 hover:bg-gray-200 rounded-lg p-4 min-w-80 max-w-80 h-fit cursor-pointer transition-all border-2 border-dashed border-gray-300 hover:border-gray-400 flex items-center justify-center';
  
  button.innerHTML = `
    <button class="w-full p-3 text-gray-500 hover:text-gray-700 font-medium flex items-center justify-center gap-2 transition-colors">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
      </svg>
      + Añade otra lista
    </button>
  `;
  
  button.onclick = () => showInlineColumnForm(button);
  return button;
}

// Cerrar todos los formularios de tareas activos
function closeAllTaskForms() {
  // Buscar todos los formularios de tareas activos
  const activeForms = document.querySelectorAll('.task-form-active');
  activeForms.forEach(form => {
    const parentColumn = form.closest('[data-column-id]');
    if (parentColumn) {
      // Encontrar el botón "Añade una tarjeta" correspondiente y mostrarlo
      const addButton = parentColumn.querySelector('button[style*="display: none"]') as HTMLElement;
      if (addButton) {
        addButton.style.display = 'block';
      }
    }
    form.remove();
  });
}

// Mostrar formulario inline para nueva tarea
function showInlineTaskForm(button: HTMLElement, columnId: string, editTask?: Task) {
  // Cerrar todos los formularios activos antes de abrir uno nuevo
  closeAllTaskForms();
  
  // Deseleccionar todas las tareas si estamos creando una nueva
  if (!editTask) {
    deselectAllTasks();
  }

  // Determinar si estamos en modo edición
  const isEditMode = !!editTask;
  let insertionPoint: HTMLElement;
  let parentElement: HTMLElement;

  if (isEditMode) {
    // En modo edición, reemplazar la tarea existente
    const taskElement = document.querySelector(`[data-task-id="${editTask.id}"]`) as HTMLElement;
    if (!taskElement) {
      console.error('❌ No se encontró el elemento de la tarea para editar');
      return;
    }
    insertionPoint = taskElement;
    parentElement = taskElement.parentElement!;
    taskElement.style.display = 'none'; // Ocultar tarea original
  } else {
    // En modo creación, insertar después del botón
    button.style.display = 'none';
    insertionPoint = button;
    parentElement = button.parentElement!;
  }

  // Crear formulario (reutilizando la estructura existente)
  const form = document.createElement('div');
  form.className = 'mt-2 p-2 bg-white rounded-md border-2 border-blue-200 shadow-sm task-form-active';
  
  const textarea = document.createElement('textarea');
  textarea.className = 'w-full p-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm';
  textarea.placeholder = isEditMode ? 'Editar título de la tarjeta...' : 'Introduce un título para esta tarjeta...';
  textarea.rows = 2;
  
  // Pre-llenar con el contenido existente si estamos editando
  if (isEditMode) {
    textarea.value = editTask.title;
  }

  const buttonsDiv = document.createElement('div');
  buttonsDiv.className = 'flex gap-2 mt-2';

  const saveButton = document.createElement('button');
  saveButton.className = 'px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm font-medium';
  saveButton.textContent = isEditMode ? 'Guardar cambios' : 'Añadir tarjeta';

  const cancelButton = document.createElement('button');
  cancelButton.className = 'px-3 py-1 text-gray-600 hover:text-gray-800 text-sm';
  cancelButton.textContent = '✕';

  // Event listeners
  saveButton.onclick = async () => {
    const title = textarea.value.trim();
    if (title) {
      try {
        if (isEditMode) {
          // Llamar a la API de actualización (ahora implementada)
          console.log('💾 Actualizando tarea:', { taskId: editTask.id, newTitle: title });
          
          const result = await updateTask(editTask.id, title, editTask.description);
          
          if (result.success) {
            console.log('✅ Tarea actualizada exitosamente');
            
            // Cerrar formulario de edición
            form.remove();
            if (insertionPoint) {
              insertionPoint.style.display = 'block';
            }
            
            // Deseleccionar la tarea editada
            deselectAllTasks();
            
            // La interfaz se actualizará automáticamente gracias a subscribeToBoardChanges
          } else {
            console.error('❌ Error actualizando tarea:', result.error);
            // Mantener el formulario abierto en caso de error
          }
        } else {
          // Crear nueva tarea
          await createTask(
            title,
            currentBoard!.id,
            columnId,
            // Contar solo las tareas NO archivadas para determinar el orden
            currentTasks.filter(t => t.columnId === columnId && !t.archived).length,
            '' // description
          );
          console.log('✅ Tarea creada');
          // Limpiar el textarea pero mantener el formulario abierto
          textarea.value = '';
          textarea.focus();
        }
      } catch (error) {
        console.error('❌ Error procesando tarea:', error);
      }
    }
  };

  cancelButton.onclick = () => {
    form.remove();
    if (isEditMode) {
      // Mostrar la tarea original de nuevo
      if (insertionPoint) {
        insertionPoint.style.display = 'block';
      }
    } else {
      // Mostrar el botón de agregar
      button.style.display = 'block';
    }
  };

  // // NUEVO: Event listener para manejar Enter y Escape en el textarea
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Activar el botón de guardar
      saveButton.click();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      // Activar el botón de cancelar
      cancelButton.click();
    }
  });

  // Ensamblar formulario
  buttonsDiv.appendChild(saveButton);
  buttonsDiv.appendChild(cancelButton);
  form.appendChild(textarea);
  form.appendChild(buttonsDiv);

  // Insertar en el lugar correcto
  if (isEditMode) {
    parentElement.insertBefore(form, insertionPoint);
  } else {
    parentElement.insertBefore(form, insertionPoint);
  }
  
  // Enfocar y seleccionar el texto si estamos editando
  textarea.focus();
  if (isEditMode) {
    textarea.select();
  }
}

// Mostrar formulario inline para nueva columna
function showInlineColumnForm(button: HTMLElement) {
  // Reemplazar botón con formulario
  const form = document.createElement('div');
  form.className = 'bg-gray-100 rounded-lg p-4 min-w-80 max-w-80 h-fit border-2 border-blue-200';
  
  const input = document.createElement('input');
  input.className = 'w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';
  input.placeholder = 'Introduce el título de la lista...';
  input.type = 'text';

  const buttonsDiv = document.createElement('div');
  buttonsDiv.className = 'flex gap-2 mt-3';

  const saveButton = document.createElement('button');
  saveButton.className = 'px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm font-medium';
  saveButton.textContent = 'Añadir lista';

  const cancelButton = document.createElement('button');
  cancelButton.className = 'px-3 py-2 text-gray-600 hover:text-gray-800 text-sm';
  cancelButton.textContent = '✕';

  // Event listeners
  saveButton.onclick = async () => {
    const name = input.value.trim();
    if (name) {
      try {
        // Marcar que debe hacer auto-scroll a nueva columna
        shouldAutoScroll = true;
        scrollToNewColumn = true;
        
        await createColumn(name, currentBoard!.id, currentColumns.length);
        console.log('✅ Columna creada');
        
        // CERRAR FORMULARIO después de crear exitosamente - usar form.parentElement
        if (form.parentElement) {
          const newButton = createAddColumnButton();
          form.parentElement.replaceChild(newButton, form);
        }
        
      } catch (error) {
        console.error('❌ Error creando columna:', error);
        shouldAutoScroll = false;
        scrollToNewColumn = false;
      }
    }
  };

  cancelButton.onclick = () => {
    if (form.parentElement) {
      const newButton = createAddColumnButton();
      form.parentElement.replaceChild(newButton, form);
    }
  };

  // // NUEVO: Event listener para manejar Enter y Escape en el input de columna
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Activar el botón de guardar
      saveButton.click();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      // Activar el botón de cancelar
      cancelButton.click();
    }
  });

  // Ensamblar formulario
  buttonsDiv.appendChild(saveButton);
  buttonsDiv.appendChild(cancelButton);
  form.appendChild(input);
  form.appendChild(buttonsDiv);

  // Reemplazar botón
  button.parentElement!.replaceChild(form, button);
  input.focus();
}

// Manejar eliminación de tarea
async function handleDeleteTask(taskId: string) {
  // Temporalmente deshabilitado hasta implementar deleteTask API
  void taskId; // Referencia para silenciar ts(6133) cuando la función está inactiva
  console.log('⚠️ Eliminación de tareas temporalmente deshabilitada');
  /*
  if (confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
    try {
      await deleteTask(taskId);
      console.log('✅ Tarea eliminada');
    } catch (error) {
      console.error('❌ Error eliminando tarea:', error);
    }
  }
  */
}
// Referencia para evitar ts(6133) si la función no se usada en tiempo de chequeo
void handleDeleteTask;

// Configurar drag and drop
function setupDragAndDrop() {
  const taskLists = document.querySelectorAll('.task-list');
  
  taskLists.forEach((list) => {
    new Sortable(list as HTMLElement, {
      group: 'shared',
      animation: 150,
      ghostClass: 'blue-background-class',
      chosenClass: 'chosen-class',
      dragClass: 'drag-class',
      
      onStart: () => {
        shouldAutoScroll = false; // Pausar auto-scroll durante drag
      },
      
      onEnd: async (evt) => {
        // USAR la lógica de drag-and-drop para sincronización en tiempo real
        console.log('🔄 Drag and drop completado, actualizando Firestore...');
        try {
          await handleOnEnd(evt);
          console.log('✅ Cambios de drag-and-drop guardados en tiempo real');
        } catch (error) {
          console.error('❌ Error al guardar cambios de drag-and-drop:', error);
        }
      }
    });
  });
}

// ============================================================================
// FUNCIONES DE SELECCIÓN DE TAREAS (COMO TRELLO)
// ============================================================================

// Alternar selección de una tarea
function toggleTaskSelection(taskId: string, taskElement: HTMLElement) {
  // Deseleccionar cualquier tarea previamente seleccionada
  if (selectedTaskElement && selectedTaskElement !== taskElement) {
    const prevTaskId = selectedTaskElement.getAttribute('data-task-id');
    if (prevTaskId) {
      selectedTaskIds.delete(prevTaskId);
      updateTaskSelectionUI(selectedTaskElement, false);
    }
  }

  // Alternar la selección de la tarea actual
  if (selectedTaskIds.has(taskId)) {
    selectedTaskIds.delete(taskId);
    selectedTaskElement = null;
    updateTaskSelectionUI(taskElement, false);
    console.log('❌ Tarea deseleccionada:', taskId);
  } else {
    selectedTaskIds.add(taskId);
    selectedTaskElement = taskElement;
    updateTaskSelectionUI(taskElement, true);
    console.log('✅ Tarea seleccionada:', taskId);
  }
}

// Actualizar UI de selección de tarea
function updateTaskSelectionUI(taskElement: HTMLElement, isSelected: boolean) {
  const selectionCircle = taskElement.querySelector('div[class*="border-2"]') as HTMLElement;
  const checkIcon = selectionCircle?.querySelector('div[class*="bg-green-500"]') as HTMLElement;
  const actionsContainer = taskElement.querySelector('div[class*="absolute top-2 right-2"]') as HTMLElement;

  if (isSelected) {
    // Mostrar check verde en el círculo
    if (selectionCircle) {
      selectionCircle.className = 'absolute top-2 left-2 w-4 h-4 border-2 border-green-500 bg-green-500 rounded-full cursor-pointer flex items-center justify-center';
    }
    if (checkIcon) {
      checkIcon.style.display = 'flex';
    }
    // Mostrar iconos de acción
    if (actionsContainer) {
      actionsContainer.style.display = 'flex';
      actionsContainer.style.opacity = '1';
    }
    // Resaltar la tarea
    taskElement.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5)';
  } else {
    // Ocultar check y restaurar círculo normal
    if (selectionCircle) {
      selectionCircle.className = 'absolute top-2 left-2 w-4 h-4 border-2 border-gray-300 rounded-full cursor-pointer hover:border-gray-400 transition-colors flex items-center justify-center';
    }
    if (checkIcon) {
      checkIcon.style.display = 'none';
    }
    // Ocultar iconos de acción
    if (actionsContainer) {
      actionsContainer.style.display = 'none';
      actionsContainer.style.opacity = '0';
    }
    // Quitar resaltado
    taskElement.style.boxShadow = '';
  }
}

// Deseleccionar todas las tareas
function deselectAllTasks() {
  selectedTaskIds.forEach(taskId => {
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`) as HTMLElement;
    if (taskElement) {
      updateTaskSelectionUI(taskElement, false);
    }
  });
  selectedTaskIds.clear();
  selectedTaskElement = null;
  console.log('🔄 Todas las tareas deseleccionadas');
}

// Editar tarea usando el formulario inline existente (reutilización de código)
function handleEditTaskInline(task: Task) {
  console.log('✏️ Editando tarea inline:', task.id);
  
  // Encontrar el botón "Añade una tarjeta" de la columna correspondiente
  const columnElement = document.querySelector(`[data-column-id="${task.columnId}"]`);
  if (!columnElement) {
    console.error('❌ No se encontró la columna para la tarea');
    return;
  }
  
  const addTaskButton = columnElement.querySelector('button[class*="mt-3"]') as HTMLElement;
  if (!addTaskButton) {
    console.error('❌ No se encontró el botón de agregar tarea');
    return;
  }
  
  // Llamar al formulario inline existente en modo edición
  showInlineTaskForm(addTaskButton, task.columnId, task);
}

// Actualizar título del tablero
function updateBoardTitle(title: string) {
  const titleElement = document.getElementById('board-title');
  if (titleElement) {
    titleElement.textContent = title;
    console.log('✅ Título actualizado:', title);
  }
}

// Actualizar enlace del workspace
async function updateWorkspaceLink(workspaceId: string) {
  void workspaceId;
  // Implementación simplificada - solo actualizar href
  const linkElement = document.getElementById('workspace-link');
  if (linkElement) {
    linkElement.textContent = 'Volver al Workspace';
    console.log('✅ Enlace de workspace actualizado');
  }
  
  // TODO: Implementar fetchWorkspaceInfo cuando esté disponible en la API
  /*
  try {
    const workspace: Workspace = await getWorkspaceInfo(workspaceId);
    if (linkElement && workspace) {
      linkElement.textContent = workspace.name;
      console.log('✅ Enlace de workspace actualizado:', workspace.name);
    }
  } catch (error) {
    console.error('❌ Error cargando workspace:', error);
    if (linkElement) {
      linkElement.textContent = 'Volver al Workspace';
    }
  }
  */
}

// ============================================================================
// HANDLERS PARA ACCIONES DE TAREAS (EDITAR, ARCHIVAR, ETC.)
// ============================================================================

// Handler para archivar una tarea
async function handleArchiveTask(taskId: string) {
  console.log('📦 Archivando tarea:', taskId);
  
  try {
    const result = await archiveTask(taskId);
    if (result.success) {
      console.log('✅ Tarea archivada exitosamente');
      // La interfaz se actualizará automáticamente gracias a subscribeToBoardChanges
      
      // // Limpiar cache local al archivar nueva tarea (para evitar inconsistencias)
      if (locallyRestoredTasks.has(taskId)) {
        locallyRestoredTasks.delete(taskId);
        console.log('🧹 Limpiando cache local al archivar tarea:', taskId);
      }
      
      // // Invalidar la vista de archivados para forzar recarga la próxima vez que se abra
      const tasksList = document.getElementById('archived-tasks-list');
      if (tasksList) {
        // // Limpiar contenido para forzar recarga
        const existingTasks = tasksList.querySelectorAll('.archived-task-item');
        existingTasks.forEach(task => task.remove());
        console.log('🗑️ Cache de vista archivados invalidado, se recargará automáticamente');
      }
      
      // Si hay una vista de elementos archivados abierta, forzar recarga para incluir la nueva tarea
      const archivedTasksView = document.getElementById('archived-tasks-view');
      if (archivedTasksView && !archivedTasksView.classList.contains('hidden')) {
        console.log('🔄 Vista de archivados abierta, forzando recarga...');
        setTimeout(() => {
          loadArchivedColumnsInDropdown(true); // Forzar recarga completa
        }, 500); // Pequeño delay para que Firebase procese el cambio
      }
    } else {
      console.error('❌ Error archivando tarea:', result.error);
    }
  } catch (error) {
    console.error('❌ Error archivando tarea:', error);
  }
}

// Función para cargar tareas archivadas en el dropdown del BoardHeader (estilo Trello)
// // Set para rastrear tareas restauradas localmente (optimización mientras Firebase se sincroniza)
let locallyRestoredTasks = new Set<string>();

async function loadArchivedTasksInDropdown(forceReload = false) {
  if (!currentBoard) {
    console.error('❌ No hay board activo');
    return;
  }
  
  console.log('📋 Cargando tareas archivadas en dropdown del board:', currentBoard.id, 'forceReload:', forceReload);
  
  // Obtener elementos del DOM
  const tasksList = document.getElementById('archived-tasks-list');
  const loadingElement = document.getElementById('loading-archived');
  
  if (!tasksList) {
    console.error('❌ No se encontró el contenedor de tareas archivadas');
    return;
  }
  
  // Verificar si ya hay contenido cargado y no es una recarga forzada
  const existingTasks = tasksList.querySelectorAll('.archived-task-item');
  if (!forceReload && existingTasks.length > 0) {
    console.log('✋ Tareas archivadas ya cargadas, omitiendo recarga automática');
    return;
  }
  
  try {
    // Obtener tareas archivadas desde Firebase
    const firebaseTasks = await getArchivedTasks(currentBoard.id);
    
    // // Filtrar tareas que han sido restauradas localmente (mientras Firebase se sincroniza)
    const archivedTasks = firebaseTasks.filter(task => !locallyRestoredTasks.has(task.id));
    
    console.log('📊 Tareas archivadas:', {
      fromFirebase: firebaseTasks.length,
      locallyRestored: locallyRestoredTasks.size,
      finalCount: archivedTasks.length
    });
    
    // Ocultar loading
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }
    
    // Limpiar contenido previo (mantener solo loading)
    const existingTasks = tasksList.querySelectorAll('.archived-task-item');
    existingTasks.forEach(task => task.remove());
    
    // Si no hay tareas archivadas, mostrar mensaje vacío
    if (archivedTasks.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'archived-task-item text-center py-6';
      emptyMessage.innerHTML = `
        <div class="text-gray-400 mb-2">
          <svg class="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8l6 6m0 0l6-6m-6 6v9a2 2 0 01-2 2H7a2 2 0 01-2-2v-9zM3 4h18"></path>
          </svg>
        </div>
        <p class="text-sm text-gray-500">No hay elementos archivados</p>
        <p class="text-xs text-gray-400 mt-1">Los elementos archivados aparecerán aquí</p>
      `;
      tasksList.appendChild(emptyMessage);
      return;
    }
    
    // Renderizar tareas archivadas con diseño compacto tipo Trello
    archivedTasks.forEach(task => {
      const taskElement = document.createElement('div');
      taskElement.className = 'archived-task-item bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow relative'; // // Restaurar 'relative' para positioning del modal
      taskElement.setAttribute('data-task-id', task.id); // // Agregar data-task-id para compatibilidad con BoardHeader
      
      taskElement.innerHTML = `
        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0 pr-2">
            <h4 class="font-medium text-gray-800 text-sm mb-1 line-clamp-1">${task.title}</h4>
            ${task.description ? `<p class="text-xs text-gray-600 line-clamp-2 mb-2">${task.description}</p>` : ''}
            
            <!-- Metadatos de la tarjeta -->
            <div class="flex items-center text-xs text-gray-500">
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>Archivada</span>
            </div>
          </div>
        </div>
        
        <!-- Botones de acción compactos -->
        <div class="flex space-x-1.5 mt-3 pt-2 border-t border-gray-100">
          <button 
            class="restore-task flex-1 px-2 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded hover:bg-blue-100 transition-colors flex items-center justify-center space-x-1"
            data-task-id="${task.id}"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path>
            </svg>
            <span>Restaurar</span>
          </button>
          
          <!-- // Botón eliminar simple (sin contenedor relativo - el modal se renderizará globalmente) -->
          <button 
            class="delete-task flex-1 px-2 py-1 bg-red-50 text-red-600 text-xs font-medium rounded hover:bg-red-100 transition-colors flex items-center justify-center space-x-1"
            data-task-id="${task.id}"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
            <span>Eliminar</span>
          </button>
        </div>
      `;
      
      tasksList.appendChild(taskElement);
    });
    
    // Los event listeners para restaurar/eliminar ahora se manejan en BoardHeader.astro
    
  } catch (error) {
    console.error('❌ Error cargando tareas archivadas:', error);
    const loadingElement = document.getElementById('loading-archived');
    if (loadingElement) {
      loadingElement.innerHTML = '<p class="text-red-500 text-sm">Error al cargar elementos archivados</p>';
    }
  }
}

// // Función optimizada para restaurar tarea con actualización inmediata del cache local y DOM
async function optimizedRestoreTask(taskId: string) {
  try {
    console.log('🔄 Restaurando tarea con optimización local:', taskId);
    
    // // PASO 1: Marcar inmediatamente como restaurada en cache local
    locallyRestoredTasks.add(taskId);
    console.log('⚡ Tarea marcada como restaurada localmente (optimización):', taskId);
    
    // // PASO 2: Remover inmediatamente del DOM (optimización visual)
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`) as HTMLElement;
    if (taskElement) {
      taskElement.style.transform = 'translateX(100%)';
      taskElement.style.opacity = '0';
      taskElement.style.transition = 'transform 300ms ease-out, opacity 300ms ease-out';
      
      setTimeout(() => {
        taskElement.remove();
        console.log('🗑️ Tarea removida del DOM (optimización local):', taskId);
        
        // // Verificar si no quedan más tareas y mostrar mensaje vacío si es necesario
        // // Usar setTimeout para permitir que otras restauraciones concurrentes terminen
        setTimeout(() => {
          const tasksList = document.getElementById('archived-tasks-list');
          const remainingTasks = tasksList?.querySelectorAll('.archived-task-item');
          
          console.log('📊 Verificando tareas restantes después de restauración:', remainingTasks?.length || 0);
          
          if (remainingTasks && remainingTasks.length === 0) {
            console.log('✅ No quedan tareas visibles, mostrando mensaje vacío');
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'archived-task-item text-center py-6';
            emptyMessage.innerHTML = `
              <div class="text-gray-400 mb-2">
                <svg class="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8l6 6m0 0l6-6m-6 6v9a2 2 0 01-2 2H7a2 2 0 01-2-2v-9zM3 4h18"></path>
                </svg>
              </div>
              <p class="text-sm text-gray-500">No hay elementos archivados</p>
              <p class="text-xs text-gray-400 mt-1">Los elementos archivados aparecerán aquí</p>
            `;
            tasksList?.appendChild(emptyMessage);
          }
        }, 100); // Pequeño delay para permitir restauraciones concurrentes
      }, 300);
    }
    
    // // PASO 3: Actualizar Firebase en background
    const result = await restoreTask(taskId);
    
    if (result.success) {
      console.log('✅ Tarea restaurada en Firebase:', taskId);
      
      // // CORREGIDO: Usar la función que carga TODOS los elementos archivados
      setTimeout(() => {
        loadArchivedColumnsInDropdown(true);
        console.log('🔄 Lista completa de archivados recargada después de restauración exitosa');
      }, 500);
      
      // // Programar limpieza del cache local después de un tiempo (permitir que Firebase se sincronice)
      setTimeout(() => {
        locallyRestoredTasks.delete(taskId);
        console.log('🧹 Limpiando cache local para tarea:', taskId);
      }, 3000); // 3 segundos para que Firebase se propague completamente
    } else {
      // // Si falla Firebase, remover del cache local inmediatamente y revertir DOM
      locallyRestoredTasks.delete(taskId);
      console.error('❌ Error en Firebase, revirtiendo cambios:', result.error);
      
      // // Recargar la lista para revertir los cambios visuales
      setTimeout(() => {
        loadArchivedColumnsInDropdown(true);
      }, 500);
    }
    
    return result;
  } catch (error) {
    // // Si hay error, remover del cache local y revertir DOM
    locallyRestoredTasks.delete(taskId);
    console.error('❌ Error restaurando tarea, revirtiendo cambios:', error);
    
    // // Recargar la lista para revertir los cambios visuales
    setTimeout(() => {
      loadArchivedColumnsInDropdown(true);
    }, 500);
    
    return { success: false, error };
  }
}

// // Función optimizada para eliminar tarea permanentemente
async function optimizedDeleteTask(taskId: string) {
  try {
    console.log('🗑️ Eliminando tarea permanentemente:', taskId);
    
    // // Llamar a la función de API para eliminar permanentemente
    const result = await deleteTask(taskId);
    
    if (result.success) {
      console.log('✅ Tarea eliminada permanentemente de Firebase:', taskId);
      return { success: true };
    } else {
      console.error('❌ Error eliminando tarea en Firebase:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('❌ Error eliminando tarea:', error);
    return { success: false, error };
  }
}

// === FUNCIONES PARA COLUMNAS ARCHIVADAS ===

// // Función para cargar columnas archivadas en el dropdown
async function loadArchivedColumnsInDropdown(_forceRefresh = false) {
  if (!currentBoard) return;
  
  const container = document.getElementById('archived-tasks-list');
  if (!container) return;
  
  try {
    console.log('📋 Cargando columnas archivadas...');
    
    // Obtener tanto tareas como columnas archivadas
    const [archivedTasks, archivedColumns] = await Promise.all([
      getArchivedTasks(currentBoard.id),
      getArchivedColumns(currentBoard.id)
    ]);
    
    console.log('📊 Elementos archivados:', { tareas: archivedTasks.length, columnas: archivedColumns.length });
    
    // Limpiar contenedor
    container.innerHTML = '';
    
    if (archivedTasks.length === 0 && archivedColumns.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-gray-500 text-sm">
          <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m5-4v2m4-2v2"></path>
          </svg>
          No hay elementos archivados
        </div>
      `;
      return;
    }

    // Renderizar columnas archivadas primero
    if (archivedColumns.length > 0) {
      const columnsHeader = document.createElement('div');
      columnsHeader.className = 'font-medium text-gray-700 text-xs mb-2 uppercase tracking-wide';
      columnsHeader.textContent = 'Columnas';
      container.appendChild(columnsHeader);

      archivedColumns.forEach((column) => {
        const columnElement = document.createElement('div');
        columnElement.className = 'group flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition-colors';
        // // AGREGADO: data-column-id para event delegation
        columnElement.setAttribute('data-column-id', column.id);
        columnElement.innerHTML = `
          <div class="flex items-center space-x-2 flex-1 min-w-0">
            <svg class="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
            </svg>
            <span class="text-sm text-gray-700 truncate font-medium">${column.name}</span>
          </div>
          <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              class="restore-column p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
              title="Restaurar columna"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path>
              </svg>
            </button>
            <button 
              class="delete-column p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
              title="Eliminar permanentemente"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </button>
          </div>
        `;
        container.appendChild(columnElement);
      });

      // Separador si hay tanto columnas como tareas
      if (archivedTasks.length > 0) {
        const separator = document.createElement('div');
        separator.className = 'border-t border-gray-200 my-3';
        container.appendChild(separator);
      }
    }

    // Renderizar tareas archivadas después  
    if (archivedTasks.length > 0) {
      const tasksHeader = document.createElement('div');
      tasksHeader.className = 'font-medium text-gray-700 text-xs mb-2 uppercase tracking-wide';
      tasksHeader.textContent = 'Tareas';
      container.appendChild(tasksHeader);

      archivedTasks.forEach((task) => {
        const taskElement = document.createElement('div');
        taskElement.className = 'group flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition-colors';
        taskElement.innerHTML = `
          <div class="flex items-center space-x-2 flex-1 min-w-0">
            <svg class="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <span class="text-sm text-gray-700 truncate">${task.title}</span>
          </div>
          <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onclick="optimizedRestoreTask('${task.id}')" 
              class="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
              title="Restaurar tarea"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path>
              </svg>
            </button>
            <button 
              data-action="delete-task"
              data-task-id="${task.id}"
              data-task-title="${task.title}"
              class="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
              title="Eliminar permanentemente"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </button>
          </div>
        `;
        container.appendChild(taskElement);
      });
    }
    
  } catch (error) {
    console.error('❌ Error cargando elementos archivados:', error);
    container.innerHTML = `
      <div class="text-center py-8 text-red-500 text-sm">
        Error cargando elementos archivados
      </div>
    `;
  }
}

// // Función optimizada para restaurar columna archivada
async function optimizedRestoreColumn(columnId: string) {
  try {
    console.log('📥 Restaurando columna:', columnId);
    
    // // Llamar a la función de API para restaurar
    await restoreColumn(columnId, currentBoard!.id);
    
    console.log('✅ Columna restaurada exitosamente:', columnId);
    
    // Recargar lista de archivados después de un breve delay
    setTimeout(() => {
      loadArchivedColumnsInDropdown(true);
    }, 500);
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error restaurando columna:', error);
    
    // Recargar lista para refrescar en caso de error
    setTimeout(() => {
      loadArchivedColumnsInDropdown(true);
    }, 500);
    
    return { success: false, error };
  }
}

// // Función optimizada para eliminar columna permanentemente
async function optimizedDeleteColumn(columnId: string) {
  try {
    console.log('🗑️ Eliminando columna permanentemente:', columnId);
    
    // // Llamar a la función de API para eliminar permanentemente
    await deleteColumn(columnId, currentBoard!.id);
    
    console.log('✅ Columna eliminada permanentemente de Firebase:', columnId);
    return { success: true };
  } catch (error) {
    console.error('❌ Error eliminando columna:', error);
    return { success: false, error };
  }
}

// // Función para archivar columna desde el menú de opciones (SIN confirmación)
async function archiveColumnAction(columnId: string) {
  try {
    console.log('📦 Archivando columna:', columnId);
    
    // // REMOVED: Confirmación eliminada según requerimiento del usuario
    // // Archivar directamente sin preguntar
    
    // // Llamar a la función de API para archivar
    await archiveColumn(columnId, currentBoard!.id);
    
    console.log('✅ Columna archivada exitosamente:', columnId);
    
    // Mostrar notificación de éxito
    console.log('✅ Notificación: Columna archivada exitosamente');
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error archivando columna:', error);
    console.log('❌ Notificación: Error al archivar la columna');
    return { success: false, error };
  }
}

// // Función para editar nombre de columna inline (similar a handleEditTaskInline)
function handleEditColumnInline(columnId: string, currentName: string) {
  console.log('✏️ Editando nombre de columna inline:', columnId, currentName);
  
  // Encontrar el elemento de la columna
  const columnElement = document.querySelector(`[data-column-id="${columnId}"]`) as HTMLElement;
  if (!columnElement) {
    console.error('❌ No se encontró la columna');
    return;
  }
  
  // Encontrar el título de la columna (h3)
  const titleElement = columnElement.querySelector('h3') as HTMLElement;
  if (!titleElement) {
    console.error('❌ No se encontró el título de la columna');
    return;
  }
  
  // Crear un input para editar el nombre
  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentName;
  input.className = 'w-full px-2 py-1 text-sm font-semibold text-gray-800 bg-white border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500';
  
  // Reemplazar el título con el input temporalmente
  const originalTitle = titleElement.textContent;
  titleElement.style.display = 'none';
  titleElement.parentNode!.insertBefore(input, titleElement.nextSibling);
  
  // Función para guardar los cambios
  const saveChanges = async () => {
    const newName = input.value.trim();
    
    // Restaurar el título original primero
    titleElement.style.display = 'block';
    input.remove();
    
    if (newName && newName !== currentName) {
      try {
        console.log('💾 Actualizando nombre de columna:', { columnId, newName });
        
        // Actualizar inmediatamente en la UI para mejor UX
        titleElement.textContent = newName;
        
        // Llamar a la API para actualizar en Firebase
        const result = await updateColumn(columnId, newName);
        
        if (result.success) {
          console.log('✅ Nombre de columna actualizado exitosamente');
        } else {
          console.error('❌ Error actualizando nombre de columna:', result.error);
          // Revertir el cambio en la UI si falla
          titleElement.textContent = originalTitle;
        }
      } catch (error) {
        console.error('❌ Error actualizando nombre de columna:', error);
        // Revertir el cambio en la UI si falla
        titleElement.textContent = originalTitle;
      }
    } else {
      console.log('🔄 Sin cambios en el nombre de la columna');
    }
  };
  
  // Función para cancelar la edición
  const cancelEdit = () => {
    titleElement.style.display = 'block';
    input.remove();
    console.log('❌ Edición de nombre de columna cancelada');
  };
  
  // Event listeners
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveChanges();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  });
  
  // Guardar al perder el foco
  input.addEventListener('blur', () => {
    // Pequeño delay para permitir que otros eventos se procesen primero
    setTimeout(saveChanges, 100);
  });
  
  // Seleccionar todo el texto y enfocar
  input.select();
  input.focus();
}

// // Función para mostrar modal de confirmación de eliminación de columna
function showColumnDeleteModal(columnId: string, columnName: string, ev?: Event) {
  const modal = document.getElementById('delete-task-modal') as HTMLElement;
  if (!modal) return;

  // Actualizar contenido del modal para columnas
  const title = modal.querySelector('h3');
  const description = modal.querySelector('p');
  const confirmButton = modal.querySelector('.confirm-global-delete') as HTMLElement;

  if (title) title.textContent = '¿Eliminar la columna?';
  if (description) {
    description.textContent = `Se eliminará permanentemente la columna "${columnName}" y todas sus tareas. Esta acción no se puede deshacer.`;
  }

  // Configurar acción de confirmación
  confirmButton.onclick = async () => {
    modal.classList.add('hidden');
    
    try {
      const result = await optimizedDeleteColumn(columnId);
      if (result.success) {
        console.log('✅ Notificación: Columna eliminada permanentemente');
        // Recargar lista de archivados
        setTimeout(() => {
          loadArchivedColumnsInDropdown(true);
        }, 500);
      } else {
        console.log('❌ Notificación: Error al eliminar la columna');
      }
    } catch (error) {
      console.error('Error eliminando columna:', error);
      console.log('❌ Notificación: Error al eliminar la columna');
    }
  };

  // Posicionar y mostrar modal usando la función inteligente
  // Preferir el evento pasado; si no, intentar usar el último elemento activo del documento
  const button = (ev?.target as HTMLElement) || (document.activeElement as HTMLElement) || null;
  if (button) {
    modal.style.position = 'fixed';
    modal.style.zIndex = '70';
    
    // // Usar la función inteligente de posicionamiento desde BoardHeader
    const positionDeleteModal = (window as any).positionDeleteModal;
    if (positionDeleteModal) {
      // // Pasar el modal como segundo parámetro para posicionamiento personalizado
      positionDeleteModal(button, modal);
      console.log('✅ Usando posicionamiento inteligente para modal de columna');
    } else {
      // Fallback si no está disponible
      const rect = button.getBoundingClientRect();
      modal.style.left = `${rect.left}px`;
      modal.style.top = `${rect.bottom + 8}px`;
      console.log('⚠️ Fallback: posicionamiento básico para modal de columna');
    }
  }

  modal.classList.remove('hidden');
}

// // Función para mostrar modal de confirmación de eliminación de tarea
function showTaskDeleteModal(taskId: string, _taskTitle: string, ev?: Event) {
  const modal = document.getElementById('delete-task-modal') as HTMLElement;
  if (!modal) return;

  // Actualizar contenido del modal para tareas
  const title = modal.querySelector('h3');
  const description = modal.querySelector('p');
  const confirmButton = modal.querySelector('.confirm-global-delete') as HTMLElement;

  if (title) title.textContent = '¿Eliminar la tarjeta?';
  if (description) {
    description.textContent = `Se quitarán todas las acciones de la fuente de actividades y no podrás volver a abrir la tarjeta. No es posible deshacer esta acción.`;
  }

  // Configurar acción de confirmación
  confirmButton.onclick = async () => {
    modal.classList.add('hidden');
    
    try {
      const result = await optimizedDeleteTask(taskId);
      if (result.success) {
        console.log('✅ Notificación: Tarea eliminada permanentemente');
        // Recargar lista de archivados
        setTimeout(() => {
          loadArchivedColumnsInDropdown(true);
        }, 500);
      } else {
        console.log('❌ Notificación: Error al eliminar la tarea');
      }
    } catch (error) {
      console.error('Error eliminando tarea:', error);
      console.log('❌ Notificación: Error al eliminar la tarea');
    }
  };

  // Posicionar y mostrar modal usando la función inteligente
  const button = (ev?.target as HTMLElement) || (document.activeElement as HTMLElement) || null;
  if (button) {
    modal.style.position = 'fixed';
    modal.style.zIndex = '70';
    
    // // Usar la función inteligente de posicionamiento desde BoardHeader
    const positionDeleteModal = (window as any).positionDeleteModal;
    if (positionDeleteModal) {
      // // Pasar el modal como segundo parámetro para posicionamiento personalizado
      positionDeleteModal(button, modal);
      console.log('✅ Usando posicionamiento inteligente para modal de tarea');
    } else {
      // Fallback si no está disponible
      const rect = button.getBoundingClientRect();
      modal.style.left = `${rect.left}px`;
      modal.style.top = `${rect.bottom + 8}px`;
      console.log('⚠️ Fallback: posicionamiento básico para modal de tarea');
    }
  }

  modal.classList.remove('hidden');
}

// Hacer las funciones globales para que puedan ser llamadas desde BoardHeader
// Mantener compatibilidad con la función original (ahora usa la nueva función combinada)
(window as any).showArchivedTasksModal = loadArchivedColumnsInDropdown;
// // CORREGIDO: Función específica para cargar tareas archivadas en dropdown
(window as any).loadArchivedTasksInDropdown = loadArchivedTasksInDropdown;
// // Exponer función optimizada de restauración para uso desde BoardHeader
(window as any).optimizedRestoreTask = optimizedRestoreTask;
// // Exponer función optimizada de eliminación para uso desde BoardHeader  
(window as any).deleteTask = optimizedDeleteTask;

// === FUNCIONES GLOBALES PARA COLUMNAS ARCHIVADAS ===
// // Exponer funciones optimizadas de columnas para uso desde BoardHeader
(window as any).optimizedRestoreColumn = optimizedRestoreColumn;
(window as any).deleteColumn = optimizedDeleteColumn;
(window as any).loadArchivedColumnsInDropdown = loadArchivedColumnsInDropdown;

// // Función para archivar columna desde el menú
(window as any).archiveColumnAction = archiveColumnAction;
// // Función para editar nombre de columna inline
(window as any).handleEditColumnInline = handleEditColumnInline;
// // Funciones para mostrar modales de confirmación de eliminación
(window as any).showColumnDeleteModal = showColumnDeleteModal;
(window as any).showTaskDeleteModal = showTaskDeleteModal;

// Limpiar recursos al salir
window.addEventListener('beforeunload', () => {
  if (realtimeUnsubscribe) {
    realtimeUnsubscribe();
  }
});
