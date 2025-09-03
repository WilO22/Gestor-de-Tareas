// src/firebase/api.ts

import { db } from './client';
import { collection, addDoc, getDocs, query, where, doc, deleteDoc } from 'firebase/firestore';
import type { Column, Task, Board, Workspace } from '../types/domain';

// Función para crear un nuevo espacio de trabajo
export async function createWorkspace(name: string, userId: string) {
  try {
    // addDoc es la función para añadir un nuevo documento a una colección
    const docRef = await addDoc(collection(db, "workspaces"), {
      name: name,
      userId: userId,
      boards: [] // Empezamos con una lista de tableros vacía
    });
    console.log("Workspace creado con ID: ", docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error al crear el workspace: ", error);
    return { success: false, error: error };
  }
}

// Función para crear un nuevo tablero
export async function createBoard(name: string, workspaceId: string) {
  try {
    // Apuntamos a una nueva colección "boards"
    const docRef = await addDoc(collection(db, "boards"), {
      name: name,
      workspaceId: workspaceId, // El vínculo con su "padre"
      columns: [] // Empezamos con una lista de columnas vacía
    });
    console.log("Tablero creado con ID: ", docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error al crear el tablero: ", error);
    return { success: false, error: error };
  }
}

// --- COLUMNAS ---
// Crea una nueva columna para un tablero
export async function createColumn(name: string, boardId: string, order: number) {
  try {
    const docRef = await addDoc(collection(db, 'columns'), {
      name,
      boardId,
      order
    });
    console.log('Columna creada con ID: ', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error al crear la columna: ', error);
    return { success: false, error };
  }
}

// --- TAREAS ---
// Crea una nueva tarea en una columna de un tablero
export async function createTask(title: string, boardId: string, columnId: string, order: number, description?: string) {
  try {
    const docRef = await addDoc(collection(db, 'tasks'), {
      title,
      description: description ?? '',
      boardId,
      columnId,
      order
    });
    console.log('Tarea creada con ID: ', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error al crear la tarea: ', error);
    return { success: false, error };
  }
}

// Obtiene los workspaces de un usuario
export async function fetchWorkspaces(userId: string): Promise<Workspace[]> {
  const q = query(collection(db, 'workspaces'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as Partial<Workspace>;
    return {
      id: d.id,
      name: data.name ?? 'Sin nombre',
      userId: data.userId ?? userId,
      boards: data.boards ?? []
    } as Workspace;
  });
}

// Elimina un workspace y todos sus tableros asociados
export async function deleteWorkspace(workspaceId: string) {
  try {
    // Primero eliminar todos los tableros del workspace
    const boardsQuery = query(collection(db, 'boards'), where('workspaceId', '==', workspaceId));
    const boardsSnapshot = await getDocs(boardsQuery);
    
    // Eliminar todos los tableros
    const deletePromises = boardsSnapshot.docs.map(boardDoc => deleteDoc(boardDoc.ref));
    await Promise.all(deletePromises);
    
    // Luego eliminar el workspace
    await deleteDoc(doc(db, 'workspaces', workspaceId));
    
    console.log('Workspace eliminado con ID: ', workspaceId);
    return { success: true };
  } catch (error) {
    console.error('Error al eliminar el workspace: ', error);
    return { success: false, error: error };
  }
}

// Obtiene los tableros de un workspace
export async function fetchBoards(workspaceId: string): Promise<Board[]> {
  const q = query(collection(db, 'boards'), where('workspaceId', '==', workspaceId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as Partial<Board> & { workspaceId?: string };
    return {
      id: d.id,
      name: (data as any).name ?? 'Sin nombre',
      columns: (data as any).columns ?? []
    } as Board;
  });
}

// Obtiene columnas de un tablero ordenadas por 'order'
export async function fetchColumns(boardId: string): Promise<Column[]> {
  // Importante: evitamos orderBy en la query para no requerir un índice compuesto.
  // Luego ordenamos en memoria por 'order'.
  const q = query(collection(db, 'columns'), where('boardId', '==', boardId));
  const snap = await getDocs(q);
  const cols = snap.docs.map((d) => {
    const data = d.data() as Partial<Column>;
    return {
      id: d.id,
      name: data.name ?? 'Sin nombre',
      boardId: data.boardId ?? boardId,
      order: data.order ?? 0,
      tasks: []
    } as Column;
  });
  return cols.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}


// Obtiene tareas de un tablero (todas las columnas) ordenadas por 'order'
export async function fetchTasks(boardId: string): Promise<Task[]> {
  // Igual que columnas: sin orderBy en Firestore, ordenamos en memoria.
  const q = query(collection(db, 'tasks'), where('boardId', '==', boardId));
  const snap = await getDocs(q);
  const tasks = snap.docs.map((d) => {
    const data = d.data() as Partial<Task>;
    return {
      id: d.id,
      title: data.title ?? '',
      description: data.description,
      boardId: data.boardId ?? boardId,
      columnId: data.columnId ?? '',
      order: data.order ?? 0
    } as Task;
  });
  return tasks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

