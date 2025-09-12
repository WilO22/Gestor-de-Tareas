// src/scripts/board/board-render.ts
// Funciones de renderizado del tablero
import type { Column, Task } from '../../types/domain';
import { currentColumns, currentTasks, userScrollPosition, shouldAutoScroll, scrollToNewColumn, setScrollToNewColumn, setShouldAutoScroll, setUserScrollPosition, addColumn } from './board-state';
import { getColumnsContainer, getTasksForColumn } from './board-utils';
import { createColumn } from '../../firebase/api';
import { initDragAndDrop } from './drag-and-drop';

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

// Agregar nueva columna al DOM existente sin re-renderizar todo
export function addNewColumnToDOM(newColumn: Column) {
  const container = getColumnsContainer();
  if (!container) {
    console.error('❌ No se encontró el contenedor de columnas');
    return;
  }

  // Encontrar el wrapper interno donde están las columnas
  const wrapper = container.querySelector('.flex.gap-6.overflow-x-auto') as HTMLElement;
  if (!wrapper) {
    console.error('❌ No se encontró el wrapper de columnas');
    return;
  }

  console.log('➕ Agregando nueva columna al DOM:', newColumn.name);

  // Encontrar el botón "Añadir otra lista" para insertar la nueva columna antes
  const addButton = wrapper.querySelector('#add-column-button') as HTMLElement;
  if (!addButton) {
    console.error('❌ No se encontró el botón de añadir columna');
    return;
  }

  // Crear el elemento de la nueva columna
  const columnIndex = currentColumns.findIndex(col => col.id === newColumn.id);
  const columnElement = createColumnElement(newColumn, columnIndex);

  // Insertar la nueva columna antes del botón
  wrapper.insertBefore(columnElement, addButton);

  // Forzar aplicación de estilos de Tailwind
  columnElement.offsetHeight; // Forzar reflow
  columnElement.style.display = 'none';
  columnElement.offsetHeight; // Forzar reflow
  columnElement.style.display = '';

  // Configurar drag & drop para la nueva columna
  setTimeout(() => {
    // Re-inicializar drag & drop para incluir la nueva columna
    initDragAndDrop();
  }, 100);

  console.log('✅ Nueva columna agregada al DOM');
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
  // Colores para las barras superiores de las columnas
  const columnColors = [
    'bg-blue-400', 'bg-green-400', 'bg-purple-400', 'bg-pink-400',
    'bg-indigo-400', 'bg-red-400', 'bg-yellow-400', 'bg-teal-400'
  ];
  const columnColor = columnColors[index % columnColors.length];

  const columnDiv = document.createElement('div');
  columnDiv.className = 'bg-white rounded-lg shadow-sm border border-gray-200 min-w-80 max-w-80 flex flex-col';
  columnDiv.setAttribute('data-column-id', column.id);
  columnDiv.setAttribute('data-order', column.order?.toString() || '0');

  // Barra superior coloreada
  const colorBar = document.createElement('div');
  colorBar.className = `${columnColor} h-1 rounded-t-lg`;
  columnDiv.appendChild(colorBar);

  // Header de la columna
  const headerDiv = document.createElement('div');
  headerDiv.className = 'p-4 pb-2';

  const headerContent = document.createElement('div');
  headerContent.className = 'flex items-center justify-between';

  const titleH3 = document.createElement('h3');
  titleH3.className = 'font-semibold text-gray-800 text-sm cursor-pointer hover:bg-gray-200 px-2 py-1 rounded';
  titleH3.textContent = column.name;
  titleH3.setAttribute('data-action', 'edit-column-name');

  const headerRight = document.createElement('div');
  headerRight.className = 'flex items-center space-x-1';

  // Contador de tareas
  const taskCount = document.createElement('span');
  taskCount.className = 'text-xs text-gray-500';
  taskCount.textContent = (column.tasks?.length || 0).toString();

  // Menú de opciones de columna
  const menuButton = document.createElement('button');
  menuButton.className = 'column-menu-btn text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors';
  menuButton.title = 'Opciones de columna';
  menuButton.innerHTML = `
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
    </svg>
  `;

  // Dropdown del menú (inicialmente oculto)
  const dropdown = document.createElement('div');
  dropdown.className = 'column-menu-dropdown absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 hidden';

  headerRight.appendChild(taskCount);
  headerRight.appendChild(menuButton);
  headerRight.appendChild(dropdown);

  headerContent.appendChild(titleH3);
  headerContent.appendChild(headerRight);

  headerDiv.appendChild(headerContent);

  // Contenedor de tareas
  const tasksContainer = document.createElement('div');
  tasksContainer.className = 'task-list px-4 pb-2 space-y-2 min-h-8';
  tasksContainer.setAttribute('data-id', column.id);

  // Filtrar tareas que pertenecen a esta columna y NO están archivadas
  const columnTasks = getTasksForColumn(column.id, currentTasks).filter(task => !task.archived);
  renderTasksInContainer(tasksContainer, columnTasks, index);

  // Área de agregar tarea
  const addTaskArea = document.createElement('div');
  addTaskArea.className = 'p-4 pt-2';
  const addTaskContainer = document.createElement('div');
  addTaskContainer.className = 'add-task-area';

  // Botón agregar tarea (estado inicial)
  const addTaskButton = document.createElement('button');
  addTaskButton.className = 'add-task-btn w-full text-left text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded p-2 transition-all duration-200 flex items-center';
  addTaskButton.setAttribute('data-column-id', column.id);
  addTaskButton.innerHTML = `
    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
    </svg>
    <span class="text-sm">Añadir una tarea</span>
  `;

  // Campo de entrada (estado activo, inicialmente oculto)
  const addTaskForm = document.createElement('div');
  addTaskForm.className = 'add-task-form hidden';

  const formContainer = document.createElement('div');
  formContainer.className = 'bg-white rounded-lg border border-gray-200 shadow-sm p-3 mb-2 transition-all duration-200';

  const textarea = document.createElement('textarea');
  textarea.className = 'task-input w-full resize-none border-none outline-none text-sm text-gray-900 placeholder-gray-500 bg-transparent';
  textarea.placeholder = 'Introduce un título o pega un enlace';
  textarea.rows = 2;
  textarea.maxLength = 200;

  formContainer.appendChild(textarea);

  const formButtons = document.createElement('div');
  formButtons.className = 'flex items-center justify-between';

  const submitButton = document.createElement('button');
  submitButton.className = 'add-task-submit bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 rounded transition-colors duration-150';
  submitButton.textContent = 'Añadir tarjeta';

  const cancelButton = document.createElement('button');
  cancelButton.className = 'cancel-add-task text-gray-400 hover:text-gray-600 p-1 rounded transition-colors duration-150';
  cancelButton.innerHTML = `
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
    </svg>
  `;

  formButtons.appendChild(submitButton);
  formButtons.appendChild(cancelButton);

  addTaskForm.appendChild(formContainer);
  addTaskForm.appendChild(formButtons);

  addTaskContainer.appendChild(addTaskButton);
  addTaskContainer.appendChild(addTaskForm);

  addTaskArea.appendChild(addTaskContainer);

  columnDiv.appendChild(headerDiv);
  columnDiv.appendChild(tasksContainer);
  columnDiv.appendChild(addTaskArea);

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
function renderTasksInContainer(container: HTMLElement, tasks: Task[], columnIndex: number = 0) {
  // Limpiar contenedor
  container.innerHTML = '';

  if (tasks.length === 0) {
    // Mostrar mensaje vacío
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'text-xs text-gray-500 italic py-2 px-3';
    emptyDiv.textContent = 'Sin tareas';
    container.appendChild(emptyDiv);
    return;
  }

  // Crear elementos de tarea
  tasks.forEach((task, taskIndex) => {
    const taskElement = createTaskElement(task, taskIndex, columnIndex);
    container.appendChild(taskElement);
  });
}

// Crear elemento de tarea
function createTaskElement(task: Task, taskIndex: number = 0, columnIndex: number = 0): HTMLElement {
  // Colores suaves para las tarjetas
  const taskColors = [
    'bg-blue-50 border-blue-200', 'bg-green-50 border-green-200',
    'bg-purple-50 border-purple-200', 'bg-pink-50 border-pink-200',
    'bg-indigo-50 border-indigo-200', 'bg-red-50 border-red-200',
    'bg-yellow-50 border-yellow-200', 'bg-teal-50 border-teal-200'
  ];
  const taskColor = taskColors[taskIndex % taskColors.length];

  const taskDiv = document.createElement('div');
  taskDiv.className = `${taskColor} rounded-lg p-3 border hover:shadow-sm transition-all cursor-pointer relative group/task`;
  taskDiv.setAttribute('data-task-id', task.id);
  taskDiv.setAttribute('data-column-id', task.columnId);

  const contentDiv = document.createElement('div');
  contentDiv.className = 'flex items-start space-x-3';

  // Círculo de selección
  const selector = document.createElement('div');
  selector.className = 'task-selector flex-shrink-0 w-5 h-5 rounded-full border-2 border-gray-300 hover:border-gray-400 transition-colors cursor-pointer mt-0.5';

  // Contenido de la tarea
  const taskContent = document.createElement('div');
  taskContent.className = 'flex-1 min-w-0';

  const titleDiv = document.createElement('div');
  titleDiv.className = 'font-medium text-gray-900 text-sm mb-1 leading-tight';
  titleDiv.textContent = task.title;

  taskContent.appendChild(titleDiv);

  if (task.description) {
    const descDiv = document.createElement('div');
    descDiv.className = 'text-xs text-gray-600 leading-tight';
    descDiv.textContent = task.description;
    taskContent.appendChild(descDiv);
  }

  // Botones de acción (aparecen cuando está seleccionada)
  const actionButtons = document.createElement('div');
  actionButtons.className = 'task-actions opacity-0 transition-opacity flex space-x-1';

  const editButton = document.createElement('button');
  editButton.className = 'task-action-btn text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-white transition-colors';
  editButton.setAttribute('data-action', 'edit');
  editButton.title = 'Editar tarea';
  editButton.innerHTML = `
    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
    </svg>
  `;

  const archiveButton = document.createElement('button');
  archiveButton.className = 'task-action-btn text-gray-400 hover:text-red-600 p-1 rounded hover:bg-white transition-colors';
  archiveButton.setAttribute('data-action', 'archive');
  archiveButton.title = 'Archivar tarea';
  archiveButton.innerHTML = `
    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path>
    </svg>
  `;

  actionButtons.appendChild(editButton);
  actionButtons.appendChild(archiveButton);

  contentDiv.appendChild(selector);
  contentDiv.appendChild(taskContent);
  contentDiv.appendChild(actionButtons);

  taskDiv.appendChild(contentDiv);

  return taskDiv;
}

// Crear botón para agregar columna
export function createAddColumnButton(): HTMLElement {
  // Crear contenedor principal
  const container = document.createElement('div');
  container.className = 'flex-shrink-0 w-80';
  container.id = 'add-column-button'; // Para compatibilidad con código existente

  // Estado inicial: Botón largo y delgado gris clarito
  const initialButton = document.createElement('button');
  initialButton.className = 'w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-lg flex items-center justify-center transition-colors border border-gray-200';
  initialButton.id = 'add-column-initial-btn';
  initialButton.innerHTML = `
    <svg class="w-5 h-5 mr-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
    </svg>
    <span class="text-sm font-medium">Añade otra lista</span>
  `;

  // Estado activo: Formulario blanco
  const formContainer = document.createElement('div');
  formContainer.className = 'bg-white rounded-lg shadow-md border border-gray-200 p-4 hidden';
  formContainer.id = 'add-column-form';

  // Campo de entrada
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Introduce el nombre de la lista...';
  input.className = 'w-full px-3 py-2 border border-gray-300 rounded-md mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
  input.id = 'add-column-input';

  // Contenedor de botones
  const buttonsContainer = document.createElement('div');
  buttonsContainer.className = 'flex items-center justify-between';

  // Botón "Añadir lista"
  const addButton = document.createElement('button');
  addButton.className = 'bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors';
  addButton.id = 'add-column-submit-btn';
  addButton.textContent = 'Añadir lista';

  // Botón cerrar (X)
  const closeButton = document.createElement('button');
  closeButton.className = 'text-gray-400 hover:text-gray-600 p-2 rounded-md hover:bg-gray-100 transition-colors';
  closeButton.id = 'add-column-close-btn';
  closeButton.innerHTML = `
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
    </svg>
  `;

  // Ensamblar elementos
  buttonsContainer.appendChild(addButton);
  buttonsContainer.appendChild(closeButton);

  formContainer.appendChild(input);
  formContainer.appendChild(buttonsContainer);

  container.appendChild(initialButton);
  container.appendChild(formContainer);

  // Funcionalidad para alternar estados
  const showForm = () => {
    initialButton.classList.add('hidden');
    formContainer.classList.remove('hidden');
    input.focus();
  };

  const hideForm = () => {
    initialButton.classList.remove('hidden');
    formContainer.classList.add('hidden');
    input.value = '';
  };

  // Event listeners
  initialButton.addEventListener('click', showForm);
  closeButton.addEventListener('click', hideForm);

  // Event listener para el botón "Añadir lista"
  addButton.addEventListener('click', async () => {
    const columnName = input.value.trim();
    if (columnName) {
      try {
        console.log('📝 Creando nueva columna:', columnName);

        // Obtener boardId
        const boardRoot = document.getElementById('board-root');
        const boardId = boardRoot?.getAttribute('data-board-id');

        if (!boardId) {
          console.error('❌ No se pudo obtener el boardId');
          return;
        }

        // Crear la columna usando la API
        const result = await createColumn(columnName, boardId, currentColumns.length);

        if (result && result.success && result.id) {
          console.log('✅ Columna creada exitosamente con ID:', result.id);
          
          // Crear objeto de columna para el estado local
          const newColumn: Column = {
            id: result.id,
            name: columnName,
            boardId: boardId,
            order: currentColumns.length,
            tasks: []
          };
          
          // Agregar al estado local
          addColumn(newColumn);
          
          // Agregar la nueva columna al DOM sin re-renderizar todo
          addNewColumnToDOM(newColumn);
          
          hideForm();
        } else {
          console.error('❌ Error creando columna:', result);
        }
      } catch (error) {
        console.error('❌ Error creando columna:', error);
      }
    }
  });

  // Event listener para Enter en el input
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addButton.click();
    } else if (e.key === 'Escape') {
      hideForm();
    }
  });

  // Cerrar formulario al hacer click fuera
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target as Node) && !formContainer.classList.contains('hidden')) {
      hideForm();
    }
  });

  // Prevenir que el click en el formulario lo cierre
  formContainer.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  return container;
}
