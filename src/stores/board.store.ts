// src/stores/board.store.ts
// Store simple para gestión de estado de boards y tareas (sin librerías externas)

import type { Board, Column, Task } from '../types/domain';

interface BoardState {
  currentBoard: Board | null;
  boards: Board[];
  columns: Column[];
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
}

class BoardStore {
  private state: BoardState = {
    currentBoard: null,
    boards: [],
    columns: [],
    tasks: [],
    isLoading: false,
    error: null
  };

  private listeners: Array<(state: BoardState) => void> = [];

  // Getters
  getState(): BoardState {
    return { ...this.state };
  }

  get currentBoard(): Board | null {
    return this.state.currentBoard;
  }

  get boards(): Board[] {
    return [...this.state.boards];
  }

  get columns(): Column[] {
    return [...this.state.columns];
  }

  get tasks(): Task[] {
    return [...this.state.tasks];
  }

  get isLoading(): boolean {
    return this.state.isLoading;
  }

  get error(): string | null {
    return this.state.error;
  }

  // Actions para boards
  setCurrentBoard(board: Board | null): void {
    this.state = {
      ...this.state,
      currentBoard: board
    };
    this.notify();
    this.saveToStorage();
  }

  setBoards(boards: Board[]): void {
    this.state = {
      ...this.state,
      boards: [...boards]
    };
    this.notify();
    this.saveToStorage();
  }

  addBoard(board: Board): void {
    this.state = {
      ...this.state,
      boards: [...this.state.boards, board]
    };
    this.notify();
    this.saveToStorage();
  }

  updateBoard(boardId: string, updates: Partial<Board>): void {
    this.state = {
      ...this.state,
      boards: this.state.boards.map(b =>
        b.id === boardId ? { ...b, ...updates } : b
      ),
      currentBoard: this.state.currentBoard?.id === boardId
        ? { ...this.state.currentBoard, ...updates }
        : this.state.currentBoard
    };
    this.notify();
    this.saveToStorage();
  }

  removeBoard(boardId: string): void {
    this.state = {
      ...this.state,
      boards: this.state.boards.filter(b => b.id !== boardId),
      currentBoard: this.state.currentBoard?.id === boardId
        ? null
        : this.state.currentBoard
    };
    this.notify();
    this.saveToStorage();
  }

  // Actions para columnas
  setColumns(columns: Column[]): void {
    this.state = {
      ...this.state,
      columns: [...columns]
    };
    this.notify();
  }

  addColumn(column: Column): void {
    this.state = {
      ...this.state,
      columns: [...this.state.columns, column]
    };
    this.notify();
  }

  updateColumn(columnId: string, updates: Partial<Column>): void {
    this.state = {
      ...this.state,
      columns: this.state.columns.map(c =>
        c.id === columnId ? { ...c, ...updates } : c
      )
    };
    this.notify();
  }

  removeColumn(columnId: string): void {
    this.state = {
      ...this.state,
      columns: this.state.columns.filter(c => c.id !== columnId),
      tasks: this.state.tasks.filter(t => t.columnId !== columnId)
    };
    this.notify();
  }

  reorderColumns(columnIds: string[]): void {
    this.state = {
      ...this.state,
      columns: columnIds.map(id =>
        this.state.columns.find(c => c.id === id)
      ).filter(Boolean) as Column[]
    };
    this.notify();
  }

  // Actions para tareas
  setTasks(tasks: Task[]): void {
    this.state = {
      ...this.state,
      tasks: [...tasks]
    };
    this.notify();
  }

  addTask(task: Task): void {
    this.state = {
      ...this.state,
      tasks: [...this.state.tasks, task]
    };
    this.notify();
  }

  updateTask(taskId: string, updates: Partial<Task>): void {
    this.state = {
      ...this.state,
      tasks: this.state.tasks.map(t =>
        t.id === taskId ? { ...t, ...updates } : t
      )
    };
    this.notify();
  }

  removeTask(taskId: string): void {
    this.state = {
      ...this.state,
      tasks: this.state.tasks.filter(t => t.id !== taskId)
    };
    this.notify();
  }

  moveTask(taskId: string, newColumnId: string, newOrder?: number): void {
    this.state = {
      ...this.state,
      tasks: this.state.tasks.map(t =>
        t.id === taskId
          ? { ...t, columnId: newColumnId, order: newOrder ?? t.order }
          : t
      )
    };
    this.notify();
  }

  // Actions de estado
  setLoading(loading: boolean): void {
    this.state = {
      ...this.state,
      isLoading: loading
    };
    this.notify();
  }

  setError(error: string | null): void {
    this.state = {
      ...this.state,
      error,
      isLoading: false
    };
    this.notify();
  }

  clearError(): void {
    this.state = {
      ...this.state,
      error: null
    };
    this.notify();
  }

  // Utilidades
  getTasksByColumn(columnId: string): Task[] {
    return this.state.tasks.filter(t => t.columnId === columnId);
  }

  getColumn(columnId: string): Column | undefined {
    return this.state.columns.find(c => c.id === columnId);
  }

  getTask(taskId: string): Task | undefined {
    return this.state.tasks.find(t => t.id === taskId);
  }

  // Suscripción
  subscribe(listener: (state: BoardState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  // Persistencia con localStorage
  loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('board-state');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.state = { ...this.state, ...parsed };
        this.notify();
      }
    } catch (error) {
      console.warn('Error loading board state from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const toSave = {
        currentBoard: this.state.currentBoard,
        boards: this.state.boards
      };
      localStorage.setItem('board-state', JSON.stringify(toSave));
    } catch (error) {
      console.warn('Error saving board state to storage:', error);
    }
  }
}

export const boardStore = new BoardStore();
