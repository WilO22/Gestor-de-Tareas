// src/scripts/board/board-render.ts
// Funciones de renderizado del tablero
import type { Column, Task } from '../../types/domain';
import { currentColumns, currentTasks, userScrollPosition, shouldAutoScroll, scrollToNewColumn, setScrollToNewColumn, setShouldAutoScroll, setUserScrollPosition } from './board-state';
import { getColumnsContainer, getTasksForColumn } from './board-utils';

// Renderizar tablero completo
export function renderBoard() {
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
        setUserScrollPosition(wrapper.scrollLeft);
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
  currentColumns.forEach((column, index) => {
    const columnElement = createColumnElement(column, index);
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
      setUserScrollPosition(wrapper.scrollLeft);
    }
  });

  // Manejar scroll después del render
  setTimeout(() => {
    handleScrollAfterRender(wrapper);
  }, 50);
}

// Manejar scroll después del renderizado
function handleScrollAfterRender(wrapper: HTMLElement) {
  if (scrollToNewColumn && shouldAutoScroll) {
    // Scroll a nueva columna
    wrapper.scrollLeft = wrapper.scrollWidth;
    console.log('🎯 Auto-scroll a nueva columna');
    setScrollToNewColumn(false);
  } else if (!shouldAutoScroll && userScrollPosition > 0) {
    // Restaurar posición del usuario
    wrapper.scrollLeft = userScrollPosition;
    console.log('📍 Scroll restaurado a posición:', userScrollPosition);
  }

  setShouldAutoScroll(false);
}// Actualizar solo contenido de columnas existentes
export function updateColumnContents() {
  const wrapper = getColumnsContainer();
  if (!wrapper) return;

  console.log('🔄 Actualizando contenido de columnas existentes');

  currentColumns.forEach((column, index) => {
    const columnElement = wrapper.querySelector(`[data-column-id="${column.id}"]`) as HTMLElement;
    if (columnElement) {
      updateColumnElement(columnElement, column);
    }
  });
}

// Actualizar solo tareas
export function updateTasksOnly() {
  console.log('📝 Actualizando solo tareas');

  currentColumns.forEach(column => {
    const tasksContainer = document.querySelector(`[data-id="${column.id}"]`) as HTMLElement;
    if (tasksContainer) {
      // Filtrar tareas que pertenecen a esta columna y NO están archivadas
      const columnTasks = getTasksForColumn(column.id, currentTasks).filter(task => !task.archived);
      renderTasksInContainer(tasksContainer, columnTasks);
    }
  });
}

// Crear elemento de columna
function createColumnElement(column: Column, index: number): HTMLElement {
  const columnDiv = document.createElement('div');
  columnDiv.className = 'bg-gray-100 rounded-lg p-4 w-80 flex-shrink-0';
  columnDiv.setAttribute('data-column-id', column.id);
  columnDiv.setAttribute('data-order', column.order?.toString() || '0');

  // Header de la columna
  const headerDiv = document.createElement('div');
  headerDiv.className = 'flex items-center justify-between mb-4';

  const titleH3 = document.createElement('h3');
  titleH3.className = 'font-semibold text-gray-800 cursor-pointer hover:bg-gray-200 px-2 py-1 rounded';
  titleH3.textContent = column.name;
  titleH3.setAttribute('data-action', 'edit-column-name');

  // Menú de opciones de columna
  const menuButton = document.createElement('button');
  menuButton.className = 'text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-200';
  menuButton.innerHTML = `
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
    </svg>
  `;

  // Dropdown del menú
  const dropdown = document.createElement('div');
  dropdown.className = 'column-menu-dropdown absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 hidden';

  headerDiv.appendChild(titleH3);
  headerDiv.appendChild(menuButton);
  headerDiv.appendChild(dropdown);

  // Contenedor de tareas
  const tasksContainer = document.createElement('div');
  tasksContainer.className = 'space-y-3 min-h-[50px]';
  tasksContainer.setAttribute('data-id', column.id);

  // Filtrar tareas que pertenecen a esta columna y NO están archivadas
  const columnTasks = getTasksForColumn(column.id, currentTasks).filter(task => !task.archived);
  renderTasksInContainer(tasksContainer, columnTasks);

  // Botón para agregar tarea
  const addTaskButton = createAddTaskButton(column.id);

  columnDiv.appendChild(headerDiv);
  columnDiv.appendChild(tasksContainer);
  columnDiv.appendChild(addTaskButton);

  return columnDiv;
}

// Actualizar elemento de columna existente
function updateColumnElement(columnElement: HTMLElement, column: Column) {
  const titleElement = columnElement.querySelector('h3') as HTMLElement;
  if (titleElement) {
    titleElement.textContent = column.name;
  }

  // Actualizar orden
  columnElement.setAttribute('data-order', column.order?.toString() || '0');
}

// Renderizar tareas en contenedor
function renderTasksInContainer(container: HTMLElement, tasks: Task[]) {
  // Limpiar contenedor
  container.innerHTML = '';

  if (tasks.length === 0) {
    // Mostrar mensaje vacío
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'text-gray-500 text-sm text-center py-4';
    emptyDiv.textContent = 'No hay tareas en esta columna';
    container.appendChild(emptyDiv);
    return;
  }

  // Crear elementos de tarea
  tasks.forEach(task => {
    const taskElement = createTaskElement(task);
    container.appendChild(taskElement);
  });
}

// Crear elemento de tarea
function createTaskElement(task: Task): HTMLElement {
  const taskDiv = document.createElement('div');
  taskDiv.className = 'bg-white p-3 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow';
  taskDiv.setAttribute('data-task-id', task.id);
  taskDiv.setAttribute('data-column-id', task.columnId);

  // Contenido de la tarea
  const contentDiv = document.createElement('div');
  contentDiv.className = 'task-content';

  const titleDiv = document.createElement('div');
  titleDiv.className = 'font-medium text-gray-900 mb-1';
  titleDiv.textContent = task.title;

  contentDiv.appendChild(titleDiv);

  if (task.description) {
    const descDiv = document.createElement('div');
    descDiv.className = 'text-sm text-gray-600';
    descDiv.textContent = task.description;
    contentDiv.appendChild(descDiv);
  }

  taskDiv.appendChild(contentDiv);

  return taskDiv;
}

// Crear botón para agregar tarea
function createAddTaskButton(columnId: string): HTMLElement {
  const button = document.createElement('button');
  button.className = 'w-full mt-3 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors text-sm font-medium';
  button.setAttribute('data-action', 'add-task');
  button.setAttribute('data-column-id', columnId);
  button.textContent = '+ Agregar una tarea';
  return button;
}

// Crear botón para agregar columna
function createAddColumnButton(): HTMLElement {
  const button = document.createElement('button');
  button.className = 'bg-gray-200 hover:bg-gray-300 text-gray-700 p-4 rounded-lg w-80 flex-shrink-0 flex items-center justify-center transition-colors';
  button.id = 'add-column-btn';
  button.innerHTML = `
    <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
    </svg>
    Añade otra lista
  `;
  return button;
}
