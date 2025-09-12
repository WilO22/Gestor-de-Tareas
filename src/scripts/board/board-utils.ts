// src/scripts/board/board-utils.ts
// Utilidades generales del tablero
import type { Column, Task } from '../../types/domain';

// Detectar cambios en columnas
export function hasColumnsChanged(currentColumns: Column[], newColumns: Column[]): boolean {
  if (currentColumns.length !== newColumns.length) return true;

  for (let i = 0; i < currentColumns.length; i++) {
    if (currentColumns[i].id !== newColumns[i].id || currentColumns[i].name !== newColumns[i].name) {
      return true;
    }
  }
  return false;
}

// Detectar cambios en tareas
export function hasTasksChanged(currentTasks: Task[], newTasks: Task[]): boolean {
  if (currentTasks.length !== newTasks.length) return true;

  for (let i = 0; i < currentTasks.length; i++) {
    if (currentTasks[i].id !== newTasks[i].id ||
        currentTasks[i].title !== newTasks[i].title ||
        currentTasks[i].description !== newTasks[i].description) {
      return true;
    }
  }
  return false;
}

// Verificar si requiere reordenamiento de columnas
export function requiresColumnReordering(newColumns: Column[]): boolean {
  for (let i = 0; i < newColumns.length; i++) {
    if (newColumns[i].order !== i + 1) {
      return true;
    }
  }
  return false;
}

// Obtener contenedor de columnas
export function getColumnsContainer(): HTMLElement | null {
  return document.getElementById('columns-container');
}

// Obtener tareas de una columna específica
export function getTasksForColumn(columnId: string, tasks: Task[]): Task[] {
  return tasks
    .filter(task => task.columnId === columnId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

// Encontrar columna por ID
export function findColumnById(columnId: string, columns: Column[]): Column | undefined {
  return columns.find(col => col.id === columnId);
}

// Encontrar tarea por ID
export function findTaskById(taskId: string, tasks: Task[]): Task | undefined {
  return tasks.find(task => task.id === taskId);
}

// Generar ID único temporal
export function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
