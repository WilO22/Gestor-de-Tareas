// src/scripts/board/board-events.ts
// Manejo de eventos del tablero

// Configurar event listeners globales
export function setupGlobalEventListeners() {
  // Deseleccionar tareas al hacer click fuera (como en Trello)
  document.addEventListener('click', (e: Event) => {
    const target = e.target as HTMLElement;

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

  // Event delegation para menús de columnas
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const columnElement = target.closest('[data-column-id]') as HTMLElement;

    if (!columnElement) return;

    const columnId = columnElement.getAttribute('data-column-id');
    if (!columnId) return;

    // Manejo de "Editar nombre de columna"
    if (target.closest('.edit-column-name')) {
      e.stopPropagation();
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

    // Manejo de "Archivar columna"
    if (target.closest('.archive-column')) {
      e.stopPropagation();
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

  // Event delegation para eliminar tareas
  document.addEventListener('click', (e: Event) => {
    const target = e.target as HTMLElement;

    // Verificar si es un click en botón de eliminar tarea
    const deleteButton = target.closest('[data-action="delete-task"]') as HTMLElement;
    if (deleteButton) {
      e.stopPropagation();
      const taskId = deleteButton.getAttribute('data-task-id');
      const taskTitle = deleteButton.getAttribute('data-task-title');

      if (taskId && taskTitle) {
        console.log('🗑️ Click en eliminar tarea detectado:', { taskId, taskTitle });
        showTaskDeleteModal(taskId, taskTitle, e);
      }
      return;
    }
  });

  console.log('✅ Event listeners globales configurados');
}

// Funciones auxiliares que necesitan ser implementadas o importadas
function deselectAllTasks() {
  // TODO: Implementar función para deseleccionar todas las tareas
  console.log('Deseleccionando todas las tareas');
}

function handleEditColumnInline(columnId: string, currentName: string) {
  // TODO: Implementar función para editar columna inline
  console.log('Editando columna inline:', columnId, currentName);
}

function archiveColumnAction(columnId: string) {
  // TODO: Implementar función para archivar columna
  console.log('Archivando columna:', columnId);
}

function showTaskDeleteModal(taskId: string, taskTitle: string, e: Event) {
  // TODO: Implementar función para mostrar modal de eliminación
  console.log('Mostrando modal de eliminación:', taskId, taskTitle);
}
