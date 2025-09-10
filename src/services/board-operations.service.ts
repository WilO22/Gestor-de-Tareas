// src/services/board-operations.service.ts
// Servicio especializado para operaciones de boards
// Centraliza toda la lógica relacionada con creación, actualización y gestión de boards

import { createBoard, fetchBoardInfo, updateBoard, deleteBoard } from '../firebase/api';
import type { Board, Column } from '../types/domain';

export class BoardOperationsService {
  private static instance: BoardOperationsService;

  private constructor() {}

  static getInstance(): BoardOperationsService {
    if (!BoardOperationsService.instance) {
      BoardOperationsService.instance = new BoardOperationsService();
    }
    return BoardOperationsService.instance;
  }

  // Crear un nuevo board
  async createNewBoard(workspaceId: string, name: string, ownerId: string): Promise<Board | null> {
    try {
      console.log('📝 Creando nuevo board:', { workspaceId, name, ownerId });

  const newBoard: Omit<Board, 'id' | 'createdAt' | 'updatedAt'> = {
        name,
        workspaceId,
        ownerId,
        columns: [],
        members: []
  };
  void newBoard;

      const result = await createBoard(name, workspaceId);
      if (result.success && result.id) {
        console.log('✅ Board creado exitosamente:', result.id);
        return await this.getBoard(result.id);
      }

      return null;
    } catch (error) {
      console.error('❌ Error creando board:', error);
      throw error;
    }
  }

  // Obtener un board por ID
  async getBoard(boardId: string): Promise<Board | null> {
    try {
      return await fetchBoardInfo(boardId);
    } catch (error) {
      console.error('❌ Error obteniendo board:', error);
      return null;
    }
  }

  // Actualizar un board
  async updateBoard(boardId: string, updates: Partial<Board>): Promise<boolean> {
    try {
      console.log('📝 Actualizando board:', boardId, updates);
      return await updateBoard(boardId, updates);
    } catch (error) {
      console.error('❌ Error actualizando board:', error);
      return false;
    }
  }

  // Eliminar un board
  async deleteBoard(boardId: string): Promise<boolean> {
    try {
      console.log('🗑️ Eliminando board:', boardId);
      return await deleteBoard(boardId);
    } catch (error) {
      console.error('❌ Error eliminando board:', error);
      return false;
    }
  }

  // Agregar una columna a un board
  async addColumnToBoard(boardId: string, columnName: string): Promise<boolean> {
    try {
      const board = await this.getBoard(boardId);
      if (!board) return false;

      const newColumn: Column = {
  id: `column_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        name: columnName,
        tasks: [],
        boardId,
        order: board.columns.length
      };

      const updatedColumns = [...board.columns, newColumn];

      return await this.updateBoard(boardId, { columns: updatedColumns });
    } catch (error) {
      console.error('❌ Error agregando columna:', error);
      return false;
    }
  }

  // Actualizar el orden de las columnas
  async updateColumnOrder(boardId: string, columnOrder: string[]): Promise<boolean> {
    try {
      const board = await this.getBoard(boardId);
      if (!board) return false;

      const updatedColumns = columnOrder.map((columnId, index) => {
        const column = board.columns.find(c => c.id === columnId);
        if (column) {
          return { ...column, order: index };
        }
        return null;
      }).filter(Boolean) as Column[];

      return await this.updateBoard(boardId, { columns: updatedColumns });
    } catch (error) {
      console.error('❌ Error actualizando orden de columnas:', error);
      return false;
    }
  }

  // Obtener estadísticas del board
  async getBoardStats(boardId: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    todoTasks: number;
  } | null> {
    try {
      const board = await this.getBoard(boardId);
      if (!board) return null;

      let totalTasks = 0;
      let completedTasks = 0;
      let inProgressTasks = 0;
      let todoTasks = 0;

      board.columns.forEach(column => {
        column.tasks?.forEach(_task => {
          totalTasks++;
          void _task; // mantener referencia para evitar ts(6133) si no se usa
          // Aquí puedes agregar lógica para determinar el estado de la tarea
          // basado en la columna en la que se encuentra
        });
      });

      return {
        totalTasks,
        completedTasks,
        inProgressTasks,
        todoTasks
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas del board:', error);
      return null;
    }
  }

  // Duplicar un board
  async duplicateBoard(boardId: string, newName?: string): Promise<Board | null> {
    try {
      const originalBoard = await this.getBoard(boardId);
      if (!originalBoard) return null;

  const duplicatedBoard: Omit<Board, 'id' | 'createdAt' | 'updatedAt'> = {
        name: newName || `${originalBoard.name} (Copia)`,
        workspaceId: originalBoard.workspaceId,
        ownerId: originalBoard.ownerId,
        columns: originalBoard.columns.map(column => ({
          ...column,
          id: `column_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
          tasks: column.tasks?.map(task => ({
            ...task,
            id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
          })) || []
        })),
        members: originalBoard.members
      };

  const result = await createBoard(newName || `${originalBoard.name} (Copia)`, originalBoard.workspaceId);
  void duplicatedBoard;
      if (result.success && result.id) {
        return await this.getBoard(result.id);
      }

      return null;
    } catch (error) {
      console.error('❌ Error duplicando board:', error);
      return null;
    }
  }
}

// Exportar instancia singleton
export const boardOperations = BoardOperationsService.getInstance();
