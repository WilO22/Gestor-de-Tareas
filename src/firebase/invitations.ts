// src/firebase/invitations.ts
// Servicio para gestión de invitaciones del lado del cliente
// ACTUALIZADO: Usa API Routes de Astro para emails reales (GRATUITO, sin Cloud Functions)

import { collection, addDoc, query, where, getDocs, doc, updateDoc, orderBy, limit, getDoc } from 'firebase/firestore';
import { db } from './client';
import { auth } from './auth';
import type { Invitation } from '../types/domain';

/**
 * REFACTORIZADO: Servicio real de emails usando API Route de Astro
 * Reemplaza la simulación con envío real usando nuestra Node.js Function gratuita
 */
async function sendRealEmail(invitation: Invitation, workspaceName: string, inviterName: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📧 Enviando email real a:', invitation.inviteeEmail);
    
    // // Crear enlace de invitación usando el dominio actual
    const invitationLink = `${window.location.origin}/accept-invitation/${invitation.id}`;
    
    // // NUEVO: Llamar a nuestro API Route (Node.js Function gratuita)
    const response = await fetch('/api/send-invitation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: invitation.inviteeEmail,
        workspaceName: workspaceName,
        inviterName: inviterName,
        message: invitation.message || '',
        invitationLink: invitationLink
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Email real enviado exitosamente:', result.messageId);
      return { success: true };
    } else {
      console.error('❌ Error en API de email:', result.error);
      return { success: false, error: result.error };
    }
    
  } catch (error) {
    console.error('❌ Error enviando email real:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error de conexión con el servicio de email' 
    };
  }
}

/**
 * Crea una nueva invitación en Firestore CON envío de email simulado
 * MODIFICADO: Ahora incluye simulación de email automática
 * @param workspaceId - ID del workspace
 * @param inviteeEmail - Email del usuario a invitar
 * @param message - Mensaje personalizado (opcional)
 * @param type - Tipo de invitación: 'email' para invitaciones por correo, 'link' para enlaces compartibles
 * @returns Promise con el resultado de la operación
 */
export async function createInvitation(
  workspaceId: string, 
  inviteeEmail: string, 
  message?: string,
  type: 'email' | 'link' = 'email'
): Promise<{ success: boolean; invitationId?: string; error?: string }> {
  try {
    console.log('📧 Creando invitación para:', inviteeEmail);
    
    // Verificar que el usuario esté autenticado
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Usuario no autenticado');
    }

    // Verificar si ya existe una invitación pendiente para este email y workspace
    // Solo verificar duplicados para invitaciones por email, no para enlaces compartibles
    if (type === 'email') {
      const existingInvitations = await getDocs(
        query(
          collection(db, 'invitations'),
          where('workspaceId', '==', workspaceId),
          where('inviteeEmail', '==', inviteeEmail.toLowerCase()),
          where('status', 'in', ['pending', 'sent'])
        )
      );

      if (!existingInvitations.empty) {
        return {
          success: false,
          error: 'Ya existe una invitación pendiente para este email'
        };
      }
    }

    // // CORREGIDO: Crear la invitación con campos de respaldo para evitar problemas de permisos
    const invitationData: Omit<Invitation, 'id'> = {
      workspaceId,
      inviterUserId: currentUser.uid,
      inviteeEmail: inviteeEmail.toLowerCase(),
      message: message || '',
      status: 'pending',
      type: type,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días de expiración
      // // NUEVO: Campos de respaldo para evitar consultas adicionales con problemas de permisos
      workspaceName: 'Workspace', // Se actualizará abajo
      inviterName: 'Un colaborador' // Se actualizará abajo
    };

    // // Obtener información del workspace
    let workspaceName = 'Workspace';
    try {
      const workspaceDocRef = doc(db, 'workspaces', workspaceId);
      const workspaceDoc = await getDoc(workspaceDocRef);
      if (workspaceDoc.exists()) {
        workspaceName = workspaceDoc.data().name || 'Workspace';
      }
    } catch (error) {
      console.warn('⚠️ No se pudo obtener nombre del workspace:', error);
    }
    
    // // MEJORADO: Obtener información completa del usuario invitador
    let inviterName = 'Un colaborador';
    let inviterDisplayName = '';
    
    try {
      // // 1. Intentar obtener de Firebase Auth primero
      if (currentUser.displayName && currentUser.displayName.trim()) {
        inviterDisplayName = currentUser.displayName.trim();
        inviterName = inviterDisplayName;
        console.log('✅ Nombre obtenido de Firebase Auth:', inviterName);
      } else {
        // // 2. Si no hay displayName en Auth, buscar en Firestore
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          inviterDisplayName = userData.displayName || userData.name || '';
          
          if (inviterDisplayName && inviterDisplayName.trim()) {
            inviterName = inviterDisplayName.trim();
            console.log('✅ Nombre obtenido de Firestore:', inviterName);
          } else {
            // // 3. Fallback: usar parte del email como nombre amigable
            const emailPrefix = currentUser.email?.split('@')[0] || 'usuario';
            inviterName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
            console.log('⚠️ Usando fallback del email:', inviterName);
          }
        } else {
          // // 4. Si no existe en Firestore, usar email como último recurso
          const emailPrefix = currentUser.email?.split('@')[0] || 'usuario';
          inviterName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
          console.log('⚠️ Usuario no encontrado en Firestore, usando email:', inviterName);
        }
      }
    } catch (error) {
      console.warn('⚠️ Error obteniendo nombre del invitador:', error);
      // // Fallback final
      const emailPrefix = currentUser.email?.split('@')[0] || 'usuario';
      inviterName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
    }

    // // CORREGIDO: Actualizar los campos de respaldo en los datos de la invitación
    const updatedInvitationData = {
      ...invitationData,
      workspaceName: workspaceName,
      inviterName: inviterName
    };

    // // Agregar documento a Firestore con los campos de respaldo
    const docRef = await addDoc(collection(db, 'invitations'), updatedInvitationData);
    
    // // ACTUALIZADO: Obtener datos necesarios para el email real
    const invitationWithId: Invitation = {
      id: docRef.id,
      ...updatedInvitationData
    };
    
    // // NUEVO: Enviar email real usando API Route solo para invitaciones por email
    if (type === 'email') {
      const emailResult = await sendRealEmail(invitationWithId, workspaceName, inviterName);
      
      if (emailResult.success) {
        // // Actualizar estado a 'sent' si el email se envió correctamente
        await updateDoc(doc(db, 'invitations', docRef.id), {
          status: 'sent',
          sentAt: new Date()
        });
        
        console.log('✅ Invitación creada y email enviado. ID:', docRef.id);
        
        return {
          success: true,
          invitationId: docRef.id
        };
      } else {
        // // Marcar como fallida si el email no se pudo enviar
        await updateDoc(doc(db, 'invitations', docRef.id), {
          status: 'failed',
          error: emailResult.error
        });
        
        return {
          success: false,
          error: `Invitación creada pero email falló: ${emailResult.error}`
        };
      }
    } else {
      // Para enlaces compartibles, marcar como 'sent' inmediatamente
      await updateDoc(doc(db, 'invitations', docRef.id), {
        status: 'sent',
        sentAt: new Date()
      });
      
      console.log('✅ Enlace compartible creado. ID:', docRef.id);
      
      return {
        success: true,
        invitationId: docRef.id
      };
    }

  } catch (error) {
    console.error('❌ Error creando invitación:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Obtiene las invitaciones pendientes para un workspace
 * @param workspaceId - ID del workspace
 * @returns Promise con la lista de invitaciones
 */
export async function getWorkspaceInvitations(workspaceId: string): Promise<Invitation[]> {
  try {
    const q = query(
      collection(db, 'invitations'),
      where('workspaceId', '==', workspaceId),
      orderBy('createdAt', 'desc'),
      limit(50) // Limitar a las últimas 50 invitaciones
    );

    const querySnapshot = await getDocs(q);
    const invitations: Invitation[] = [];

    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      invitations.push({
        id: doc.id,
        workspaceId: data.workspaceId,
        inviterUserId: data.inviterUserId,
        inviteeEmail: data.inviteeEmail,
        message: data.message,
        status: data.status,
        type: data.type || 'email', // Default to 'email' for backward compatibility
        createdAt: data.createdAt?.toDate() || new Date(),
        sentAt: data.sentAt?.toDate(),
        acceptedAt: data.acceptedAt?.toDate(),
        rejectedAt: data.rejectedAt?.toDate(),
        acceptedByUserId: data.acceptedByUserId,
        expiresAt: data.expiresAt?.toDate() || new Date(),
        error: data.error,
        workspaceName: data.workspaceName,
        inviterName: data.inviterName
      } as Invitation);
    });

    return invitations;

  } catch (error) {
    // // MEJORADO: Log como warning en lugar de error, y devolver array vacío
    console.warn('⚠️ Sistema de invitaciones no disponible:', error);
    return [];
  }
}

/**
 * Obtiene las invitaciones recibidas por un usuario (por email)
 * @param userEmail - Email del usuario
 * @returns Promise con la lista de invitaciones
 */
export async function getUserInvitations(userEmail: string): Promise<Invitation[]> {
  try {
    const q = query(
      collection(db, 'invitations'),
      where('inviteeEmail', '==', userEmail.toLowerCase()),
      where('status', 'in', ['pending', 'sent']),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const invitations: Invitation[] = [];

    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      invitations.push({
        id: doc.id,
        workspaceId: data.workspaceId,
        inviterUserId: data.inviterUserId,
        inviteeEmail: data.inviteeEmail,
        message: data.message,
        status: data.status,
        type: data.type || 'email', // Default to 'email' for backward compatibility
        createdAt: data.createdAt?.toDate() || new Date(),
        sentAt: data.sentAt?.toDate(),
        acceptedAt: data.acceptedAt?.toDate(),
        rejectedAt: data.rejectedAt?.toDate(),
        acceptedByUserId: data.acceptedByUserId,
        expiresAt: data.expiresAt?.toDate() || new Date(),
        error: data.error,
        workspaceName: data.workspaceName,
        inviterName: data.inviterName
      } as Invitation);
    });

    return invitations;

  } catch (error) {
    console.error('❌ Error obteniendo invitaciones del usuario:', error);
    return [];
  }
}

/**
 * Acepta una invitación (actualiza estado a 'accepted')
 * NOTA: La lógica de agregar al workspace debe ser manejada por Cloud Functions
 * @param invitationId - ID de la invitación
 * @returns Promise con el resultado
 */
export async function acceptInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Usuario no autenticado');
    }

    // Actualizar el estado de la invitación
    await updateDoc(doc(db, 'invitations', invitationId), {
      status: 'accepted',
      acceptedAt: new Date(),
      acceptedByUserId: currentUser.uid
    });

    console.log('✅ Invitación aceptada:', invitationId);
    
    return { success: true };

  } catch (error) {
    console.error('❌ Error aceptando invitación:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Rechaza una invitación (actualiza estado a 'rejected')
 * @param invitationId - ID de la invitación
 * @returns Promise con el resultado
 */
export async function rejectInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Usuario no autenticado');
    }

    // Actualizar el estado de la invitación
    await updateDoc(doc(db, 'invitations', invitationId), {
      status: 'rejected',
      rejectedAt: new Date(),
      acceptedByUserId: currentUser.uid // Para tracking
    });

    console.log('✅ Invitación rechazada:', invitationId);
    
    return { success: true };

  } catch (error) {
    console.error('❌ Error rechazando invitación:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Cancela una invitación pendiente (solo para el invitador)
 * @param invitationId - ID de la invitación
 * @returns Promise con el resultado
 */
export async function cancelInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Usuario no autenticado');
    }

    // Actualizar el estado de la invitación
    await updateDoc(doc(db, 'invitations', invitationId), {
      status: 'rejected', // Usamos 'rejected' para invitaciones canceladas
      rejectedAt: new Date()
    });

    console.log('✅ Invitación cancelada:', invitationId);
    
    return { success: true };

  } catch (error) {
    console.error('❌ Error cancelando invitación:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Crea un enlace compartible para invitar miembros sin restricciones de email duplicado
 * @param workspaceId - ID del workspace
 * @param message - Mensaje personalizado (opcional)
 * @returns Promise con el resultado de la operación
 */
export async function createShareableLink(
  workspaceId: string,
  message?: string
): Promise<{ success: boolean; invitationId?: string; invitationLink?: string; error?: string }> {
  try {
    console.log('🔗 Creando enlace compartible para workspace:', workspaceId);

    // Generar un email único para el enlace compartible usando timestamp
    const uniqueEmail = `link-${Date.now()}@shared.invitation`;

    // Crear la invitación usando el tipo 'link'
    const result = await createInvitation(workspaceId, uniqueEmail, message || 'Enlace compartible generado automáticamente', 'link');

    if (result.success && result.invitationId) {
      const invitationLink = `${window.location.origin}/accept-invitation/${result.invitationId}`;
      console.log('✅ Enlace compartible creado:', invitationLink);

      return {
        success: true,
        invitationId: result.invitationId,
        invitationLink: invitationLink
      };
    } else {
      return {
        success: false,
        error: result.error || 'Error creando enlace compartible'
      };
    }
  } catch (error) {
    console.error('❌ Error creando enlace compartible:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}
export async function hasInvitationPending(workspaceId: string, email: string, type: 'email' | 'link' = 'email'): Promise<boolean> {
  try {
    // Para enlaces compartibles, siempre devolver false (permitir múltiples)
    if (type === 'link') {
      return false;
    }

    const q = query(
      collection(db, 'invitations'),
      where('workspaceId', '==', workspaceId),
      where('inviteeEmail', '==', email.toLowerCase()),
      where('status', 'in', ['pending', 'sent'])
    );

    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;

  } catch (error) {
    // // MEJORADO: Si el sistema de invitaciones no está disponible, asumir que no hay invitaciones pendientes
    console.warn('⚠️ Sistema de invitaciones no disponible para verificación:', error);
    return false; // // Permitir continuar con la invitación
  }
}
