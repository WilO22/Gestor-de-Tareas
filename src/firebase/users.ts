// src/firebase/users.ts
// Funciones para manejo de usuarios extendidos con roles y colaboración

import { db } from './client';
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import type { User, Member } from '../types/domain';

/**
 * Crea un perfil de usuario extendido en Firestore después del registro
 * @param userId - ID del usuario de Firebase Auth
 * @param email - Email del usuario
 * @param displayName - Nombre para mostrar (opcional)
 * @param role - Rol del usuario ('admin' | 'user')
 */
export async function createUserProfile(
  userId: string, 
  email: string, 
  displayName?: string, 
  role: 'admin' | 'user' = 'user'
): Promise<{ success: boolean; error?: any }> {
  try {
    const userProfile: Omit<User, 'id'> = {
      email,
      displayName: displayName || email.split('@')[0], // Si no hay displayName, usar parte del email
      role,
      workspaces: [],
      createdAt: new Date()
    };

    // Usar el UID de Firebase Auth como ID del documento
    await setDoc(doc(db, 'users', userId), userProfile);
    
    console.log('✅ Perfil de usuario creado:', userId);
    return { success: true };
  } catch (error) {
    console.error('❌ Error creando perfil de usuario:', error);
    return { success: false, error };
  }
}

/**
 * Obtiene el perfil completo de un usuario
 * @param userId - ID del usuario
 */
export async function getUserProfile(userId: string): Promise<User | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        id: userId,
        email: data.email,
        displayName: data.displayName,
        role: data.role,
        workspaces: data.workspaces || [],
        createdAt: data.createdAt?.toDate() || new Date()
      } as User;
    }
    return null;
  } catch (error) {
    console.error('❌ Error obteniendo perfil de usuario:', error);
    return null;
  }
}

/**
 * Actualiza la lista de workspaces de un usuario
 * @param userId - ID del usuario
 * @param workspaceId - ID del workspace a agregar/remover
 * @param action - 'add' o 'remove'
 */
export async function updateUserWorkspaces(
  userId: string, 
  workspaceId: string, 
  action: 'add' | 'remove'
): Promise<{ success: boolean; error?: any }> {
  try {
    const userProfile = await getUserProfile(userId);
    if (!userProfile) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    let updatedWorkspaces = [...userProfile.workspaces];
    
    if (action === 'add' && !updatedWorkspaces.includes(workspaceId)) {
      updatedWorkspaces.push(workspaceId);
    } else if (action === 'remove') {
      updatedWorkspaces = updatedWorkspaces.filter(id => id !== workspaceId);
    }

    await updateDoc(doc(db, 'users', userId), {
      workspaces: updatedWorkspaces
    });

    console.log(`✅ Workspaces del usuario ${userId} actualizados:`, action, workspaceId);
    return { success: true };
  } catch (error) {
    console.error('❌ Error actualizando workspaces del usuario:', error);
    return { success: false, error };
  }
}

/**
 * Busca usuarios por email para invitaciones
 * @param email - Email a buscar
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  try {
    const q = query(collection(db, 'users'), where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        email: data.email,
        displayName: data.displayName,
        role: data.role,
        workspaces: data.workspaces || [],
        createdAt: data.createdAt?.toDate() || new Date()
      } as User;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error buscando usuario por email:', error);
    return null;
  }
}

/**
 * Verifica si un usuario tiene permisos de administrador
 * @param userId - ID del usuario
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const userProfile = await getUserProfile(userId);
    return userProfile?.role === 'admin' || false;
  } catch (error) {
    console.error('❌ Error verificando permisos de admin:', error);
    return false;
  }
}

/**
 * Crea un objeto Member a partir de un User
 * @param user - Usuario
 * @param role - Rol específico en el workspace/board
 */
export function createMemberFromUser(user: User, role: 'owner' | 'admin' | 'member' = 'member'): Member {
  return {
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    role,
    joinedAt: new Date()
  };
}
