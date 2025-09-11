// src/firebase/api.ts

import { db } from './client';
import { collection, addDoc, getDocs, getDoc, query, where, doc, deleteDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot, writeBatch } from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import type { Column, Task, Board, Workspace, Member, User } from '../types/domain';
import { auth } from './auth';
import { findUserByEmail } from './users';
// // ELIMINADO: import { updateUserWorkspaces } from './users'; - ya no es necesario

// ============================================================================
// FUNCIONES DE WORKSPACE - ACTUALIZADAS PARA COLABORACIÓN
// ============================================================================

// Función para obtener workspaces de un usuario
export async function getUserWorkspaces(userId: string) {
  try {
    const q = query(
      collection(db, 'workspaces'),
      where('ownerId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    
    const workspaces: Workspace[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      workspaces.push({
        id: doc.id,
        name: data.name,
        ownerId: data.ownerId,
        members: data.members || [],
        boards: data.boards || [],
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      });
    });
    
    console.log('✅ Workspaces obtenidos para usuario', userId, ':', workspaces.length);
    return workspaces;
  } catch (error) {
    console.error('❌ Error obteniendo workspaces:', error);
    return [];
  }
}

// Función para obtener un workspace específico por ID
export async function getWorkspaceById(workspaceId: string) {
  try {
    const workspaceDoc = await getDoc(doc(db, 'workspaces', workspaceId));
    if (workspaceDoc.exists()) {
      const data = workspaceDoc.data();
      return {
        id: workspaceDoc.id,
        name: data.name,
        ownerId: data.ownerId,
        members: data.members || [],
        boards: data.boards || [],
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as Workspace;
    }
    return null;
  } catch (error) {
    console.error('❌ Error obteniendo workspace:', error);
    return null;
  }
}

// Función para obtener miembros de un workspace (pequeño helper usado por componentes)
export async function getWorkspaceMembers(workspaceId: string): Promise<Member[]> {
  try {
    const workspace = await getWorkspaceById(workspaceId);
    return workspace?.members || [];
  } catch (error) {
    console.error('❌ Error obteniendo miembros del workspace:', error);
    return [];
  }
}

// Función para crear un nuevo workspace
export async function createWorkspace(name: string, ownerId: string) {
  console.log('🏗️ API createWorkspace: Function called with:', { name, ownerId });
  
  try {
    // // MEJORADO: Obtener información real del usuario propietario desde Firebase Auth
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      console.error('❌ No hay usuario autenticado');
      return { success: false, error: 'Usuario no autenticado' };
    }

    console.log('👤 Usuario autenticado obtenido:', currentUser.uid, currentUser.email);
    // // CORREGIDO: Crear el miembro propietario con información real del usuario
    const ownerMember: Member = {
      userId: ownerId,
      email: currentUser.email || `user-${ownerId}@workspace.com`, // // Usar email real o fallback
      displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuario', // // Usar displayName real o fallback
      role: 'owner',
      joinedAt: new Date()
    };
    
    console.log('👥 Miembro propietario creado con información real:', ownerMember);

    // addDoc es la función para añadir un nuevo documento a una colección
    const workspaceData = {
      name: name,
      ownerId: ownerId, // Usar nueva estructura
      members: [ownerMember], // Lista de miembros, comenzando con el propietario con datos reales
      boards: [], // Empezamos con una lista de tableros vacía
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('💾 Guardando workspace en Firestore con datos reales:', workspaceData);
    const docRef = await addDoc(collection(db, "workspaces"), workspaceData);

    // // SIMPLIFICADO: No necesitamos actualizar perfil de usuario en Firestore
    console.log('✅ Workspace creado exitosamente con información de usuario real');

    console.log("✅ Workspace creado exitosamente con ID: ", docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("❌ Error al crear el workspace: ", error);
    return { success: false, error: error };
  }
}

// Función para obtener los tableros de un workspace
export async function getWorkspaceBoards(workspaceId: string) {
  try {
    const q = query(
      collection(db, 'boards'),
      where('workspaceId', '==', workspaceId)
    );
    const querySnapshot = await getDocs(q);
    
    const boards: Board[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      boards.push({
        id: doc.id,
        name: data.name,
        workspaceId: data.workspaceId,
        columns: data.columns || [],
        members: data.members || [], // Miembros del tablero (puede estar vacío inicialmente)
        ownerId: data.ownerId || '', // Owner del tablero (requerido por el tipo)
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      });
    });
    
    console.log('✅ Tableros obtenidos para workspace', workspaceId, ':', boards.length);
    return boards;
  } catch (error) {
    console.error('❌ Error obteniendo tableros del workspace:', error);
    return [];
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

// Actualizar un board existente
export async function updateBoard(boardId: string, updates: Partial<Board>): Promise<boolean> {
  try {
    const boardRef = doc(db, 'boards', boardId);
    await updateDoc(boardRef, {
      ...updates,
      updatedAt: new Date()
    });
    console.log('✅ Board actualizado:', boardId);
    return true;
  } catch (error) {
    console.error('❌ Error actualizando board:', error);
    return false;
  }
}

// Eliminar un board
export async function deleteBoard(boardId: string): Promise<boolean> {
  try {
    // Primero obtener el board para limpiar referencias
    const board = await fetchBoardInfo(boardId);
    if (!board) {
      console.error('❌ Board no encontrado para eliminar');
      return false;
    }

    // Usar batch para eliminar todo de manera atómica
    const batch = writeBatch(db);

    // Eliminar todas las columnas del board
    const columnsQuery = query(collection(db, 'columns'), where('boardId', '==', boardId));
    const columnsSnap = await getDocs(columnsQuery);
    columnsSnap.forEach((colDoc) => {
      batch.delete(colDoc.ref);
    });

    // Eliminar todas las tareas del board
    const tasksQuery = query(collection(db, 'tasks'), where('boardId', '==', boardId));
    const tasksSnap = await getDocs(tasksQuery);
    tasksSnap.forEach((taskDoc) => {
      batch.delete(taskDoc.ref);
    });

    // Eliminar el board
    const boardRef = doc(db, 'boards', boardId);
    batch.delete(boardRef);

    // Ejecutar el batch
    await batch.commit();

    console.log('✅ Board eliminado completamente:', boardId);
    return true;
  } catch (error) {
    console.error('❌ Error eliminando board:', error);
    return false;
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
      order,
      archived: false  // Por defecto las tareas no están archivadas
    });
    console.log('Tarea creada con ID: ', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error al crear la tarea: ', error);
    return { success: false, error };
  }
}

// Archivar una tarea (moverla a papelera)
export async function archiveTask(taskId: string) {
  try {
    const taskRef = doc(db, 'tasks', taskId);
    await updateDoc(taskRef, {
      archived: true
    });
    console.log('Tarea archivada con ID: ', taskId);
    return { success: true };
  } catch (error) {
    console.error('Error al archivar la tarea: ', error);
    return { success: false, error };
  }
}

// Actualizar una tarea existente (título y descripción)
export async function updateTask(taskId: string, title: string, description?: string) {
  try {
    const taskRef = doc(db, 'tasks', taskId);
    const updateData: { title: string; description?: string } = { title };
    
    // Solo agregar descripción si se proporciona
    if (description !== undefined) {
      updateData.description = description;
    }
    
    await updateDoc(taskRef, updateData);
    console.log('Tarea actualizada con ID: ', taskId);
    return { success: true };
  } catch (error) {
    console.error('Error al actualizar la tarea: ', error);
    return { success: false, error };
  }
}

// Restaurar una tarea archivada
export async function restoreTask(taskId: string) {
  try {
    const taskRef = doc(db, 'tasks', taskId);
    await updateDoc(taskRef, {
      archived: false
    });
    console.log('Tarea restaurada con ID: ', taskId);
    return { success: true };
  } catch (error) {
    console.error('Error al restaurar la tarea: ', error);
    return { success: false, error };
  }
}

// Eliminar permanentemente una tarea
export async function deleteTask(taskId: string) {
  try {
    const taskRef = doc(db, 'tasks', taskId);
    await deleteDoc(taskRef);
    console.log('Tarea eliminada permanentemente con ID: ', taskId);
    return { success: true };
  } catch (error) {
    console.error('Error al eliminar la tarea: ', error);
    return { success: false, error };
  }
}

// Obtener tareas archivadas de un tablero
export async function getArchivedTasks(boardId: string): Promise<Task[]> {
  try {
    const q = query(
      collection(db, 'tasks'), 
      where('boardId', '==', boardId),
      where('archived', '==', true)
    );
    const querySnapshot = await getDocs(q);
    
    const archivedTasks: Task[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      archivedTasks.push({
        id: doc.id,
        title: data.title,
        description: data.description,
        columnId: data.columnId,
        boardId: data.boardId,
        order: data.order,
        assignedTo: data.assignedTo,
        createdBy: data.createdBy,
        createdAt: data.createdAt?.toDate(),
        archived: data.archived
      });
    });
    
    console.log('Tareas archivadas obtenidas:', archivedTasks.length);
    return archivedTasks;
  } catch (error) {
    console.error('Error al obtener tareas archivadas: ', error);
    return [];
  }
}

// === FUNCIONES DE ARCHIVADO DE COLUMNAS ===

// Archivar una columna (similar a archiveTask)
export async function archiveColumn(columnId: string, _boardId: string): Promise<void> {
  try {
    const columnRef = doc(db, 'columns', columnId);
    await updateDoc(columnRef, {
      archived: true
    });
    console.log('Columna archivada exitosamente:', columnId);
  } catch (error) {
    console.error('Error al archivar columna: ', error);
    throw error;
  }
}

// Restaurar una columna archivada (similar a restoreTask)
export async function restoreColumn(columnId: string, _boardId: string): Promise<void> {
  try {
    const columnRef = doc(db, 'columns', columnId);
    await updateDoc(columnRef, {
      archived: false
    });
    console.log('Columna restaurada exitosamente:', columnId);
  } catch (error) {
    console.error('Error al restaurar columna: ', error);
    throw error;
  }
}

// Eliminar permanentemente una columna (similar a deleteTask)
export async function deleteColumn(columnId: string, _boardId: string): Promise<void> {
  try {
    // Primero, eliminar todas las tareas de la columna
    const q = query(
      collection(db, 'tasks'), 
      where('columnId', '==', columnId)
    );
    const querySnapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    querySnapshot.forEach((taskDoc) => {
      batch.delete(doc(db, 'tasks', taskDoc.id));
    });
    
    // Eliminar la columna
    batch.delete(doc(db, 'columns', columnId));
    
    await batch.commit();
    console.log('Columna y sus tareas eliminadas permanentemente:', columnId);
  } catch (error) {
    console.error('Error al eliminar columna: ', error);
    throw error;
  }
}

// Obtener columnas archivadas de un tablero (similar a getArchivedTasks)
export async function getArchivedColumns(boardId: string): Promise<Column[]> {
  try {
    const q = query(
      collection(db, 'columns'), 
      where('boardId', '==', boardId),
      where('archived', '==', true)
    );
    const querySnapshot = await getDocs(q);
    
    const archivedColumns: Column[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      archivedColumns.push({
        id: doc.id,
        name: data.name,
        boardId: data.boardId,
        order: data.order,
        archived: data.archived,
        tasks: [] // Las columnas archivadas no necesitan mostrar tareas
      });
    });
    
    console.log('Columnas archivadas obtenidas:', archivedColumns.length);
    return archivedColumns;
  } catch (error) {
    console.error('Error al obtener columnas archivadas: ', error);
    return [];
  }
}

// Actualizar el nombre de una columna (similar a updateTask)
export async function updateColumn(columnId: string, newName: string): Promise<{ success: boolean; error?: any }> {
  try {
    const columnRef = doc(db, 'columns', columnId);
    await updateDoc(columnRef, {
      name: newName
    });
    console.log('Columna actualizada exitosamente:', columnId, 'nuevo nombre:', newName);
    return { success: true };
  } catch (error) {
    console.error('Error al actualizar columna: ', error);
    return { success: false, error };
  }
}

// Obtiene los workspaces de un usuario - ACTUALIZADA para colaboración
export async function fetchWorkspaces(userId: string): Promise<Workspace[]> {
  // // CORREGIDO: Buscar workspaces donde el usuario sea propietario O miembro
  try {
    console.log('🔍 Obteniendo workspaces para usuario:', userId);
    
    const allWorkspaces = new Map<string, Workspace>();
    
    // // 1. Obtener workspaces donde es propietario
    const ownerQuery = query(collection(db, 'workspaces'), where('ownerId', '==', userId));
    const ownerSnap = await getDocs(ownerQuery);
    
    console.log('📊 Workspaces propios encontrados:', ownerSnap.docs.length);
    
    // // Agregar workspaces donde es propietario
    ownerSnap.docs.forEach(d => {
      const data = d.data();
      allWorkspaces.set(d.id, {
        id: d.id,
        name: data.name ?? 'Sin nombre',
        ownerId: data.ownerId ?? userId,
        members: data.members ?? [],
        boards: data.boards ?? [],
        createdAt: data.createdAt?.toDate() ?? new Date(),
        updatedAt: data.updatedAt?.toDate() ?? new Date()
      } as Workspace);
    });
    
    // // 2. Obtener workspaces donde es miembro
    const membersQuery = query(collection(db, 'workspace_members'), where('userId', '==', userId));
    const membersSnap = await getDocs(membersQuery);
    
    console.log('📊 Membresías encontradas:', membersSnap.docs.length);
    
    // // Obtener datos de los workspaces donde es miembro (si no están ya incluidos)
    for (const memberDoc of membersSnap.docs) {
      const memberData = memberDoc.data();
      const workspaceId = memberData.workspaceId;
      
      if (!allWorkspaces.has(workspaceId)) {
        try {
          const workspaceDoc = await getDoc(doc(db, 'workspaces', workspaceId));
          if (workspaceDoc.exists()) {
            const data = workspaceDoc.data();
            allWorkspaces.set(workspaceId, {
              id: workspaceId,
              name: data.name ?? 'Sin nombre',
              ownerId: data.ownerId ?? '',
              members: data.members ?? [],
              boards: data.boards ?? [],
              createdAt: data.createdAt?.toDate() ?? new Date(),
              updatedAt: data.updatedAt?.toDate() ?? new Date()
            } as Workspace);
          }
        } catch (error) {
          console.error('❌ Error obteniendo workspace de membresía:', workspaceId, error);
        }
      }
    }
    
    const workspaces = Array.from(allWorkspaces.values());
    console.log('✅ Total workspaces obtenidos:', workspaces.length);
    return workspaces;
    
  } catch (error) {
    console.error('❌ Error fetching workspaces:', error);
    // Fallback: intentar con la estructura antigua
    console.log('🔍 Intentando con estructura legacy (userId)...');
    try {
      const legacyQ = query(collection(db, 'workspaces'), where('userId', '==', userId));
      const legacySnap = await getDocs(legacyQ);
      return legacySnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name ?? 'Sin nombre',
          ownerId: data.userId ?? userId, // Mapear userId antiguo a ownerId
          members: [], // Sin miembros en estructura antigua
          boards: data.boards ?? [],
          createdAt: data.createdAt?.toDate() ?? new Date(),
          updatedAt: data.updatedAt?.toDate() ?? new Date()
        } as Workspace;
      });
    } catch (legacyError) {
      console.error('❌ Error con fallback legacy:', legacyError);
      return [];
    }
  }
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

// Obtiene información específica de un tablero
export async function fetchBoardInfo(boardId: string): Promise<Board | null> {
  try {
    const boardDoc = doc(db, 'boards', boardId);
    const boardSnap = await getDoc(boardDoc);
    
    if (boardSnap.exists()) {
      const data = boardSnap.data();
      return {
        id: boardSnap.id,
        name: data.name ?? 'Sin nombre',
        workspaceId: data.workspaceId ?? '',
        columns: data.columns ?? []
      } as Board;
    }
    return null;
  } catch (error) {
    console.error('Error fetching board info:', error);
    return null;
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
      order: data.order ?? 0,
      assignedTo: data.assignedTo,
      createdBy: data.createdBy,
      createdAt: data.createdAt ? (data.createdAt as any).toDate?.() || data.createdAt : undefined
    } as Task;
  });
  return tasks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

// ============================================================================
// FUNCIONES DE GESTIÓN DE MIEMBROS Y COLABORACIÓN
// ============================================================================

/**
 * Agrega un miembro a un workspace con información real del usuario
 * @param workspaceId - ID del workspace
 * @param userEmail - Email del usuario a agregar
 * @param role - Rol del miembro ('admin' | 'member')
 */
export async function addMemberToWorkspaceByEmail(
  workspaceId: string, 
  userEmail: string, 
  role: 'admin' | 'member' = 'member'
): Promise<{ success: boolean; error?: any; member?: Member }> {
  try {
    // // MEJORADO: Usar función de búsqueda de usuarios importada estáticamente
    
    // // Buscar usuario real por email
    const user = await findUserByEmail(userEmail);
    
    if (!user) {
      console.warn('⚠️ Usuario no encontrado, creando miembro con información básica');
      // // Si no se encuentra el usuario, crear miembro con información básica
      const basicMember: Member = {
        userId: `temp-${Date.now()}`, // // ID temporal hasta que el usuario se registre
        email: userEmail,
        displayName: userEmail.split('@')[0], // // Usar parte del email como displayName
        role: role,
        joinedAt: new Date()
      };
      
      await updateDoc(doc(db, 'workspaces', workspaceId), {
        members: arrayUnion(basicMember),
        updatedAt: new Date()
      });
      
      console.log('✅ Miembro agregado con información básica:', basicMember);
      return { success: true, member: basicMember };
    }
    
    // // MEJORADO: Crear miembro con información real del usuario
    const realMember: Member = {
      userId: user.id,
      email: user.email,
      displayName: user.displayName || user.email.split('@')[0],
      role: role,
      joinedAt: new Date()
    };
    
    await updateDoc(doc(db, 'workspaces', workspaceId), {
      members: arrayUnion(realMember),
      updatedAt: new Date()
    });

    console.log('✅ Miembro agregado con información real del usuario:', realMember);
    return { success: true, member: realMember };
  } catch (error) {
    console.error('❌ Error agregando miembro al workspace:', error);
    return { success: false, error };
  }
}

/**
 * Agrega un miembro a un workspace - FUNCIÓN ORIGINAL MANTENIDA PARA COMPATIBILIDAD
 * @param workspaceId - ID del workspace
 * @param member - Objeto Member a agregar
 */
export async function addMemberToWorkspace(workspaceId: string, member: Member): Promise<{ success: boolean; error?: any }> {
  try {
    await updateDoc(doc(db, 'workspaces', workspaceId), {
      members: arrayUnion(member),
      updatedAt: new Date()
    });

    // // ELIMINADO: updateUserWorkspaces - ya no mantenemos colección users
    console.log('✅ Miembro agregado al workspace (sin actualizar perfil):', member.email);

    console.log('✅ Miembro agregado al workspace:', member.email);
    return { success: true };
  } catch (error) {
    console.error('❌ Error agregando miembro al workspace:', error);
    return { success: false, error };
  }
}

/**
 * Remueve un miembro de un workspace
 * @param workspaceId - ID del workspace
 * @param member - Objeto Member a remover
 */
export async function removeMemberFromWorkspace(workspaceId: string, member: Member): Promise<{ success: boolean; error?: any }> {
  try {
    await updateDoc(doc(db, 'workspaces', workspaceId), {
      members: arrayRemove(member),
      updatedAt: new Date()
    });

    // // ELIMINADO: updateUserWorkspaces - ya no mantenemos colección users

    console.log('✅ Miembro removido del workspace:', member.email);
    return { success: true };
  } catch (error) {
    console.error('❌ Error removiendo miembro del workspace:', error);
    return { success: false, error };
  }
}

/**
 * NUEVA FUNCIÓN: Cambia el rol de un miembro en un workspace
 * @param workspaceId - ID del workspace
 * @param memberUserId - ID del usuario miembro
 * @param newRole - Nuevo rol ('admin' | 'member')
 */
export async function changeMemberRole(
  workspaceId: string, 
  memberUserId: string, 
  newRole: 'admin' | 'member'
): Promise<{ success: boolean; error?: any }> {
  try {
    // // Obtener el workspace actual
    const workspaceDoc = await getDoc(doc(db, 'workspaces', workspaceId));
    
    if (!workspaceDoc.exists()) {
      return { success: false, error: 'Workspace no encontrado' };
    }
    
    const workspace = workspaceDoc.data();
    const members = workspace.members || [];
    
    // // Buscar el miembro específico
    const memberIndex = members.findIndex((member: Member) => member.userId === memberUserId);
    
    if (memberIndex === -1) {
      return { success: false, error: 'Miembro no encontrado' };
    }
    
    // // No permitir cambiar el rol del propietario
    if (members[memberIndex].role === 'owner') {
      return { success: false, error: 'No se puede cambiar el rol del propietario' };
    }
    
    // // Crear copia del miembro con el nuevo rol
    const updatedMember = { ...members[memberIndex], role: newRole };
    
    // // Reemplazar el miembro en el array
    members[memberIndex] = updatedMember;
    
    // // Actualizar el workspace en Firestore
    await updateDoc(doc(db, 'workspaces', workspaceId), {
      members: members,
      updatedAt: new Date()
    });
    
    console.log(`✅ Rol de miembro cambiado: ${memberUserId} -> ${newRole}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error cambiando rol del miembro:', error);
    return { success: false, error };
  }
}

/**
 * NUEVA FUNCIÓN: Obtiene el rol del usuario actual en un workspace
 * @param workspaceId - ID del workspace
 * @param userId - ID del usuario
 */
export async function getCurrentUserRoleInWorkspace(
  workspaceId: string, 
  userId: string
): Promise<{ role: string | null; isOwner: boolean }> {
  try {
    const workspaceDoc = await getDoc(doc(db, 'workspaces', workspaceId));
    
    if (!workspaceDoc.exists()) {
      return { role: null, isOwner: false };
    }
    
    const workspace = workspaceDoc.data();
    
    // // Verificar si es el propietario
    if (workspace.ownerId === userId) {
      return { role: 'owner', isOwner: true };
    }
    
    // // Buscar en la lista de miembros
    const members = workspace.members || [];
    const member = members.find((member: Member) => member.userId === userId);
    
    return {
      role: member?.role || null,
      isOwner: false
    };
  } catch (error) {
    console.error('❌ Error obteniendo rol del usuario:', error);
    return { role: null, isOwner: false };
  }
}

/**
 * Verifica si un usuario tiene acceso a un workspace
 * @param workspaceId - ID del workspace
 * @param userId - ID del usuario
 */
export async function userHasAccessToWorkspace(workspaceId: string, userId: string): Promise<boolean> {
  try {
  // Nota: usar query/getDocs para verificar existencia por seguridad; `doc(...)` no es una Promise
  const docSnap = await getDocs(query(collection(db, 'workspaces'), where('__name__', '==', workspaceId)));
    
    if (docSnap.empty) return false;
    
    const data = docSnap.docs[0].data();
    
    // Verificar si es el propietario
    if (data.ownerId === userId) return true;
    
    // Verificar si está en la lista de miembros
    const members = data.members || [];
    return members.some((member: Member) => member.userId === userId);
  } catch (error) {
    console.error('❌ Error verificando acceso al workspace:', error);
    return false;
  }
}

// ============================================================================
// FUNCIONES DE TIEMPO REAL - NUEVAS
// ============================================================================

/**
 * Suscripción en tiempo real a cambios en workspaces del usuario
 * @param userId - ID del usuario
 * @param callback - Función que se ejecuta cuando hay cambios
 */
export function subscribeToUserWorkspaces(userId: string, callback: (workspaces: Workspace[]) => void): Unsubscribe {
  console.log('🔍 Configurando suscripción para usuario:', userId);
  
  // // CORREGIDO: Necesitamos buscar en dos fuentes:
  // // 1. Workspaces donde es propietario (ownerId)
  // // 2. Workspaces donde es miembro (workspace_members)
  
  const allWorkspaces = new Map<string, Workspace>();
  let activeSubscriptions = 0;
  void activeSubscriptions;
  let completedSubscriptions = 0;

  // // Función para procesar cambios y llamar callback cuando tengamos todos los datos
  const processAndCallback = () => {
    completedSubscriptions++;
    console.log('🔄 Progreso de suscripciones:', completedSubscriptions, 'de 2');

    // Llamar callback inmediatamente cuando tengamos datos, no esperar a las 2 suscripciones
    const workspaces = Array.from(allWorkspaces.values());
    console.log('✅ Workspaces actualizados:', workspaces.length);
    callback(workspaces);

    // Reset para siguientes cambios solo si hemos completado ambas
    if (completedSubscriptions === 2) {
      completedSubscriptions = 0;
    }
  };

  // // 1. Suscripción a workspaces donde es propietario
  const unsubscribeOwner = onSnapshot(
    query(collection(db, 'workspaces'), where('ownerId', '==', userId)),
    (snapshot) => {
      console.log('📊 Workspaces propios encontrados:', snapshot.docs.length);

      // // Remover workspaces propios anteriores del mapa
      for (const [key, workspace] of allWorkspaces.entries()) {
        if (workspace.ownerId === userId) {
          allWorkspaces.delete(key);
        }
      }

      // // Agregar workspaces propios actualizados
      snapshot.docs.forEach(d => {
        const data = d.data();
        console.log('📄 Workspace propio:', d.id, data.name);
        allWorkspaces.set(d.id, {
          id: d.id,
          name: data.name ?? 'Sin nombre',
          ownerId: data.ownerId ?? userId,
          members: data.members ?? [],
          boards: data.boards ?? [],
          createdAt: data.createdAt?.toDate?.() ?? new Date(),
          updatedAt: data.updatedAt?.toDate?.() ?? new Date()
        } as Workspace);
      });

      console.log('🔄 Llamando processAndCallback desde owner subscription');
      processAndCallback();
    },
    (error) => {
      console.error('❌ Error en suscripción de workspaces propios:', error);
      processAndCallback(); // Continuar aunque falle esta suscripción
    }
  );

  // // 2. Suscripción a membresías donde es miembro
  const unsubscribeMembers = onSnapshot(
    query(collection(db, 'workspace_members'), where('userId', '==', userId)),
    async (memberSnapshot) => {
      console.log('📊 Membresías encontradas:', memberSnapshot.docs.length);
      
      // // Remover workspaces de membresías anteriores del mapa
      for (const [key, workspace] of allWorkspaces.entries()) {
        if (workspace.ownerId !== userId) { // Solo remover si no es propietario
          allWorkspaces.delete(key);
        }
      }
      
      // // Obtener workspaces de las membresías
      const workspaceIds = memberSnapshot.docs.map(doc => doc.data().workspaceId);
      
      if (workspaceIds.length > 0) {
        // // Obtener datos de los workspaces donde es miembro
        for (const workspaceId of workspaceIds) {
          try {
            const workspaceDoc = await getDoc(doc(db, 'workspaces', workspaceId));
            if (workspaceDoc.exists()) {
              const data = workspaceDoc.data();
              console.log('📄 Workspace como miembro:', workspaceId, data.name);
              allWorkspaces.set(workspaceId, {
                id: workspaceId,
                name: data.name ?? 'Sin nombre',
                ownerId: data.ownerId ?? '',
                members: data.members ?? [],
                boards: data.boards ?? [],
                createdAt: data.createdAt?.toDate?.() ?? new Date(),
                updatedAt: data.updatedAt?.toDate?.() ?? new Date()
              } as Workspace);
            }
          } catch (error) {
            console.error('❌ Error obteniendo workspace de membresía:', workspaceId, error);
          }
        }
      }
      
      console.log('🔄 Llamando processAndCallback desde member subscription');
      processAndCallback();
    },
    (error) => {
      console.error('❌ Error en suscripción de membresías:', error);
      console.log('🔄 Llamando processAndCallback desde member subscription (error)');
      processAndCallback(); // Continuar aunque falle esta suscripción
    }
  );
  
  // // Retornar función para cancelar ambas suscripciones
  return () => {
    unsubscribeOwner();
    unsubscribeMembers();
    console.log('🧹 Suscripciones de workspaces canceladas');
  };
}

/**
 * Suscripción en tiempo real a tableros de un workspace
 * @param workspaceId - ID del workspace
 * @param callback - Función que se ejecuta cuando hay cambios en los tableros
 */
export function subscribeToBoardsInWorkspace(workspaceId: string, callback: (boards: Board[]) => void): Unsubscribe {
  console.log('🔍 Configurando suscripción a tableros para workspace:', workspaceId);
  
  const q = query(collection(db, 'boards'), where('workspaceId', '==', workspaceId));
  
  return onSnapshot(q, (snapshot) => {
    console.log('📊 Tableros encontrados:', snapshot.docs.length);
    
    const boards = snapshot.docs.map((d) => {
      const data = d.data() as Partial<Board> & { workspaceId?: string };
      return {
        id: d.id,
        name: (data as any).name ?? 'Sin nombre',
        workspaceId: data.workspaceId ?? workspaceId,
        columns: (data as any).columns ?? [],
        members: (data as any).members ?? [],
        ownerId: (data as any).ownerId ?? '',
        createdAt: data.createdAt instanceof Date ? data.createdAt : (data.createdAt as any)?.toDate?.() ?? new Date(),
        updatedAt: data.updatedAt instanceof Date ? data.updatedAt : (data.updatedAt as any)?.toDate?.() ?? new Date()
      } as Board;
    });
    
    console.log('✅ Tableros procesados para callback:', boards.length);
    callback(boards);
  }, (error) => {
    console.error('❌ Error en suscripción de tableros:', error);
    callback([]); // Retornar lista vacía en caso de error
  });
}

/**
 * Suscripción en tiempo real a cambios en un tablero específico
 * @param boardId - ID del tablero
 * @param callback - Función que se ejecuta cuando hay cambios
 */
export function subscribeToBoardChanges(boardId: string, callback: (columns: Column[], tasks: Task[]) => void): Unsubscribe {
  // // CORREGIDO: Usar consultas separadas para manejar correctamente campos que pueden no existir
  const columnsQuery = query(
    collection(db, 'columns'), 
    where('boardId', '==', boardId)
    // // NO filtrar por 'archived' aquí - lo haremos en el cliente para manejar campos inexistentes
  );
  
  // Filtrar tareas para excluir las archivadas (solo tareas activas en el board)
  const tasksQuery = query(
    collection(db, 'tasks'), 
    where('boardId', '==', boardId)
    // // NO filtrar por 'archived' aquí - lo haremos en el cliente para manejar campos inexistentes
  );
  
  let latestColumns: Column[] = [];
  let latestTasks: Task[] = [];
  
  // Suscribirse a cambios en columnas
  const unsubscribeColumns = onSnapshot(columnsQuery, (snapshot) => {
    // // FILTRO EN CLIENTE: Excluir columnas archivadas (archived === true)
    latestColumns = snapshot.docs
      .map(d => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name ?? 'Sin nombre',
          boardId: data.boardId ?? boardId,
          order: data.order ?? 0,
          archived: data.archived ?? false, // // Asegurar que archived tenga un valor
          tasks: []
        } as Column;
      })
      .filter(column => !column.archived) // // FILTRO: Solo columnas NO archivadas
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    
    console.log('📊 Columnas filtradas (no archivadas):', latestColumns.length, 'de', snapshot.docs.length, 'totales');
    callback(latestColumns, latestTasks);
  });
  
  // Suscribirse a cambios en tareas
  const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
    // // FILTRO EN CLIENTE: Excluir tareas archivadas (archived === true)
    latestTasks = snapshot.docs
      .map(d => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title ?? '',
          description: data.description,
          boardId: data.boardId ?? boardId,
          columnId: data.columnId ?? '',
          order: data.order ?? 0,
          assignedTo: data.assignedTo,
          createdBy: data.createdBy,
          archived: data.archived ?? false, // // Asegurar que archived tenga un valor
          createdAt: data.createdAt ? (data.createdAt as any).toDate?.() || data.createdAt : undefined
        } as Task;
      })
      .filter(task => !task.archived) // // FILTRO: Solo tareas NO archivadas
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    
    console.log('📊 Tareas filtradas (no archivadas):', latestTasks.length, 'de', snapshot.docs.length, 'totales');
    callback(latestColumns, latestTasks);
  });
  
  // Retornar función para cancelar ambas suscripciones
  return () => {
    unsubscribeColumns();
    unsubscribeTasks();
  };
}

// Suscripción en tiempo real a cambios en un workspace específico
export function subscribeToWorkspace(workspaceId: string, callback: (workspace: Workspace) => void): Unsubscribe {
  const workspaceRef = doc(db, 'workspaces', workspaceId);

  return onSnapshot(workspaceRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      const workspace: Workspace = {
        id: doc.id,
        name: data.name ?? 'Sin nombre',
        ownerId: data.ownerId ?? '',
        members: data.members ?? [],
        boards: data.boards ?? [],
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      };
      callback(workspace);
    }
  });
}

// Suscripción en tiempo real a cambios en una task específica
export function subscribeToTask(taskId: string, callback: (task: Task) => void): Unsubscribe {
  const taskRef = doc(db, 'tasks', taskId);

  return onSnapshot(taskRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      const task: Task = {
        id: doc.id,
        title: data.title ?? '',
        description: data.description ?? '',
        boardId: data.boardId ?? '',
        columnId: data.columnId ?? '',
        order: data.order ?? 0,
        assignedTo: data.assignedTo,
        createdBy: data.createdBy,
        archived: data.archived ?? false,
        createdAt: data.createdAt ? (data.createdAt as any).toDate?.() || data.createdAt : undefined
      };
      callback(task);
    }
  });
}

// Suscripción en tiempo real a cambios en miembros de un workspace específico
export function subscribeToWorkspaceMembers(
  workspaceId: string,
  callback: (members: User[]) => void
): () => void {
  const workspaceRef = doc(db, 'workspaces', workspaceId);
  
  return onSnapshot(workspaceRef, async (workspaceDoc) => {
    if (!workspaceDoc.exists()) {
      callback([]);
      return;
    }
    
    const workspaceData = workspaceDoc.data();
    const memberIds = workspaceData?.members || [];
    
    if (memberIds.length === 0) {
      callback([]);
      return;
    }
    
    // Obtener datos de usuarios miembros
    const memberPromises = memberIds.map(async (memberId: string) => {
      try {
        const userDoc = await getDoc(doc(db, 'users', memberId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          return {
            id: userDoc.id,
            email: userData?.email || '',
            displayName: userData?.displayName || '',
            photoURL: userData?.photoURL || '',
            role: userData?.role || 'user',
            workspaces: userData?.workspaces || [],
            createdAt: userData?.createdAt ? (userData.createdAt as any).toDate?.() || userData.createdAt : new Date(),
            lastLogin: userData?.lastLogin ? (userData.lastLogin as any).toDate?.() || userData.lastLogin : undefined
          } as User;
        }
        return null;
      } catch (error) {
        console.error(`Error fetching user ${memberId}:`, error);
        return null;
      }
    });
    
    try {
      const members = (await Promise.all(memberPromises)).filter(Boolean) as User[];
      callback(members);
    } catch (error) {
      console.error('Error fetching workspace members:', error);
      callback([]);
    }
  });
}

