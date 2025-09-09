// src/services/drag-drop.service.ts
// Servicio especializado para operaciones de drag and drop
// Centraliza toda la lógica de arrastrar y soltar para tasks y columns

import Sortable from 'sortablejs';

export interface DragDropEvent {
  type: 'task' | 'column';
  sourceId: string;
  targetId: string;
  sourceColumnId?: string;
  targetColumnId?: string;
  newIndex: number;
}

export class DragDropService {
  private static instance: DragDropService;
  private sortableInstances: Map<string, Sortable> = new Map();
  private dragCallbacks: ((event: DragDropEvent) => void)[] = [];

  private constructor() {}

  static getInstance(): DragDropService {
    if (!DragDropService.instance) {
      DragDropService.instance = new DragDropService();
    }
    return DragDropService.instance;
  }

  // Inicializar drag and drop para una columna de tasks
  initializeTaskDragDrop(columnId: string, element: HTMLElement): void {
    if (this.sortableInstances.has(`tasks-${columnId}`)) {
      this.destroySortable(`tasks-${columnId}`);
    }

    const sortable = new Sortable(element, {
      group: 'tasks',
      animation: 150,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',
      onStart: (evt) => {
        console.log('🚀 Iniciando drag de task:', evt.item.id);
      },
      onEnd: (evt) => {
        const taskId = evt.item.id;
        const newIndex = evt.newIndex;
        const oldIndex = evt.oldIndex;

        // Si el índice cambió, emitir evento
        if (newIndex !== oldIndex || evt.from !== evt.to) {
          const sourceColumnId = evt.from.id.replace('column-', '');
          const targetColumnId = evt.to.id.replace('column-', '');

          this.emitDragEvent({
            type: 'task',
            sourceId: taskId,
            targetId: taskId,
            sourceColumnId,
            targetColumnId,
            newIndex: newIndex ?? 0
          });
        }
      }
    });

    this.sortableInstances.set(`tasks-${columnId}`, sortable);
    console.log('✅ Drag & drop inicializado para columna:', columnId);
  }

  // Inicializar drag and drop para columnas
  initializeColumnDragDrop(boardId: string, element: HTMLElement): void {
    if (this.sortableInstances.has(`columns-${boardId}`)) {
      this.destroySortable(`columns-${boardId}`);
    }

    const sortable = new Sortable(element, {
      group: 'columns',
      animation: 150,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',
      handle: '.column-handle',
      onStart: (evt) => {
        console.log('🚀 Iniciando drag de columna:', evt.item.id);
      },
      onEnd: (evt) => {
        const columnId = evt.item.id;
        const newIndex = evt.newIndex;
        const oldIndex = evt.oldIndex;

        if (newIndex !== oldIndex) {
          this.emitDragEvent({
            type: 'column',
            sourceId: columnId,
            targetId: columnId,
            newIndex: newIndex ?? 0
          });
        }
      }
    });

    this.sortableInstances.set(`columns-${boardId}`, sortable);
    console.log('✅ Drag & drop inicializado para columnas del board:', boardId);
  }

  // Destruir una instancia sortable
  destroySortable(id: string): void {
    const sortable = this.sortableInstances.get(id);
    if (sortable) {
      sortable.destroy();
      this.sortableInstances.delete(id);
      console.log('🗑️ Drag & drop destruido para:', id);
    }
  }

  // Destruir todas las instancias
  destroyAll(): void {
    this.sortableInstances.forEach((sortable, id) => {
  sortable.destroy();
  void id;
    });
    this.sortableInstances.clear();
    console.log('🗑️ Todas las instancias de drag & drop destruidas');
  }

  // Registrar callback para eventos de drag
  onDrag(callback: (event: DragDropEvent) => void): void {
    this.dragCallbacks.push(callback);
  }

  // Remover callback
  offDrag(callback: (event: DragDropEvent) => void): void {
    const index = this.dragCallbacks.indexOf(callback);
    if (index > -1) {
      this.dragCallbacks.splice(index, 1);
    }
  }

  // Emitir evento de drag
  private emitDragEvent(event: DragDropEvent): void {
    console.log('📢 Emitiendo evento de drag:', event);
    this.dragCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('❌ Error en callback de drag:', error);
      }
    });
  }

  // Actualizar el orden de tasks en una columna
  updateTaskOrder(columnId: string, taskOrder: string[]): void {
    const element = document.getElementById(`column-${columnId}`);
    if (!element) return;

    // Reordenar los elementos DOM según el nuevo orden
    const taskElements = Array.from(element.querySelectorAll('.task-card'));
    taskOrder.forEach((taskId, _index) => {
      const taskElement = taskElements.find(el => el.id === `task-${taskId}`);
      if (taskElement) {
        element.appendChild(taskElement);
      }
      void _index;
    });
  }

  // Actualizar el orden de columnas
  updateColumnOrder(boardId: string, columnOrder: string[]): void {
    const element = document.getElementById(`board-${boardId}`);
    if (!element) return;

    // Reordenar los elementos DOM según el nuevo orden
    const columnElements = Array.from(element.querySelectorAll('.column'));
    columnOrder.forEach((columnId, _index) => {
      const columnElement = columnElements.find(el => el.id === `column-${columnId}`);
      if (columnElement) {
        element.appendChild(columnElement);
      }
      void _index;
    });
  }

  // Obtener el estado actual de drag
  isDragging(): boolean {
    return Array.from(this.sortableInstances.values()).some(sortable =>
      sortable.toArray().some(() => false) // Sortable no tiene método directo para verificar si está arrastrando
    );
  }

  // Configurar opciones globales de drag & drop
  configureGlobalOptions(options: {
    animation?: number;
    ghostClass?: string;
    chosenClass?: string;
    dragClass?: string;
  }): void {
    // Aplicar opciones a todas las instancias existentes
    this.sortableInstances.forEach(sortable => {
      if (options.animation !== undefined) sortable.option('animation', options.animation);
      if (options.ghostClass !== undefined) sortable.option('ghostClass', options.ghostClass);
      if (options.chosenClass !== undefined) sortable.option('chosenClass', options.chosenClass);
      if (options.dragClass !== undefined) sortable.option('dragClass', options.dragClass);
    });

    console.log('⚙️ Opciones globales de drag & drop configuradas:', options);
  }
}

// Exportar instancia singleton
export const dragDropService = DragDropService.getInstance();
