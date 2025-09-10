// src/services/board.service.ts
import { createColumn, createTask, updateTask, deleteTask, archiveTask, restoreTask } from '../firebase/api';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/client';
import type { Column, Task } from '../types/domain';

export class BoardService {
  static async createNewColumn(boardId: string, name: string, order: number): Promise<Column | null> {
    const result = await createColumn(name, boardId, order);
    if (result.success && result.id) {
      // Obtener la columna creada
      const columnDoc = await getDoc(doc(db, 'columns', result.id));
      if (columnDoc.exists()) {
        const data = columnDoc.data();
        return {
          id: columnDoc.id,
          name: data.name,
          boardId: data.boardId,
          order: data.order,
          createdAt: data.createdAt?.toDate() || new Date()
        } as Column;
      }
    }
    return null;
  }

  static async createNewTask(title: string, boardId: string, columnId: string, order: number, description?: string): Promise<Task | null> {
    const result = await createTask(title, boardId, columnId, order, description);
    if (result.success && result.id) {
      // Obtener la tarea creada
      const taskDoc = await getDoc(doc(db, 'tasks', result.id));
      if (taskDoc.exists()) {
        const data = taskDoc.data();
        return {
          id: taskDoc.id,
          title: data.title,
          description: data.description || '',
          boardId: data.boardId,
          columnId: data.columnId,
          order: data.order,
          archived: data.archived || false,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as Task;
      }
    }
    return null;
  }

  static async updateTaskDetails(taskId: string, title: string, description?: string): Promise<boolean> {
    const result = await updateTask(taskId, title, description);
    return result.success;
  }

  static async removeTask(taskId: string): Promise<boolean> {
    const result = await deleteTask(taskId);
    return result.success;
  }

  static async archiveTaskById(taskId: string): Promise<boolean> {
    const result = await archiveTask(taskId);
    return result.success;
  }

  static async restoreTaskById(taskId: string): Promise<boolean> {
    const result = await restoreTask(taskId);
    return result.success;
  }
}
