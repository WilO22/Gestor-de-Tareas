// src/scripts/board/board-state.ts
// Gestión del estado global del tablero
import type { Board, Column, Task } from '../../types/domain';

// Estado global de la aplicación
export let currentBoard: Board | null = null;
export let currentColumns: Column[] = [];
export let currentTasks: Task[] = [];
export let realtimeUnsubscribe: (() => void) | null = null;
export let isInitialized = false;

// Estado para selección de tareas (sistema simple - una tarea a la vez)
export let selectedTaskId: string | null = null;
export let selectedTaskElement: HTMLElement | null = null;

// Control de scroll inteligente
export let userScrollPosition = 0;
export let shouldAutoScroll = false;
export let scrollToNewColumn = false;

// Funciones para actualizar estado
export function updateCurrentBoard(board: Board | null) {
  currentBoard = board;
}

export function updateCurrentColumns(columns: Column[]) {
  currentColumns = columns;
}

export function updateCurrentTasks(tasks: Task[]) {
  currentTasks = tasks;
}

export function setRealtimeUnsubscribe(unsubscribe: (() => void) | null) {
  realtimeUnsubscribe = unsubscribe;
}

export function setInitialized(initialized: boolean) {
  isInitialized = initialized;
}

export function updateSelectedTasks(taskId: string | null, element: HTMLElement | null = null) {
  selectedTaskId = taskId;
  selectedTaskElement = element;
}

export function clearSelectedTasks() {
  selectedTaskId = null;
  selectedTaskElement = null;
}

export function addColumn(column: Column) {
  currentColumns.push(column);
}

export function removeColumn(columnId: string) {
  currentColumns = currentColumns.filter(col => col.id !== columnId);
}

export function updateColumn(columnId: string, updates: Partial<Column>) {
  const index = currentColumns.findIndex(col => col.id === columnId);
  if (index !== -1) {
    currentColumns[index] = { ...currentColumns[index], ...updates };
  }
}

export function updateScrollState(position: number, autoScroll: boolean, scrollToColumn: boolean) {
  userScrollPosition = position;
  shouldAutoScroll = autoScroll;
  scrollToNewColumn = scrollToColumn;
}

export function setScrollToNewColumn(value: boolean) {
  scrollToNewColumn = value;
}

export function setShouldAutoScroll(value: boolean) {
  shouldAutoScroll = value;
}

export function setUserScrollPosition(position: number) {
  userScrollPosition = position;
}

// Función para obtener las tareas actuales (para fusión en realtime)
export function getCurrentTasks(): Task[] {
  return [...currentTasks];
}
