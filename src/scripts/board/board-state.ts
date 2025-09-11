// src/scripts/board/board-state.ts
// Gestión del estado global del tablero
import type { Board, Column, Task } from '../../types/domain';

// Estado global de la aplicación
export let currentBoard: Board | null = null;
export let currentColumns: Column[] = [];
export let currentTasks: Task[] = [];
export let realtimeUnsubscribe: (() => void) | null = null;
export let isInitialized = false;

// Estado para selección de tareas (como en Trello)
export let selectedTaskIds: Set<string> = new Set();
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

export function updateSelectedTasks(taskIds: Set<string>, element: HTMLElement | null = null) {
  selectedTaskIds = taskIds;
  selectedTaskElement = element;
}

export function clearSelectedTasks() {
  selectedTaskIds.clear();
  selectedTaskElement = null;
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
