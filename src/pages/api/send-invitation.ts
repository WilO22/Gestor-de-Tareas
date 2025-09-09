// src/pages/api/send-invitation.ts
// API Route de Astro - equivale a una Node.js Function GRATUITA
// REFACTORIZADO: Usa servicio centralizado para evitar duplicación de código

import type { APIRoute } from 'astro';
import { sendInvitationEmail, validateEmailConfig } from '../../services/email-service';

// // Esta es una Node.js Function que corre en el servidor
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { to, workspaceName, inviterName, message, invitationLink } = body;

    // // Validaciones
    if (!to || !workspaceName || !inviterName || !invitationLink) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Faltan datos requeridos' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // // NUEVO: Validar configuración de email antes de enviar
    const configValidation = validateEmailConfig();
    if (!configValidation.isValid) {
      console.warn('⚠️ Configuración de email no válida:', configValidation.message);
      // // En modo desarrollo, devolver error específico
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Configuración de email: ${configValidation.message}` 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // // REFACTORIZADO: Usar servicio centralizado en lugar de código duplicado
    const emailResult = await sendInvitationEmail({
      to,
      workspaceName,
      inviterName,
      inviterEmail: import.meta.env.EMAIL_USER || 'noreply@gestortareas.com',
      message: message || '',
      invitationLink
    });

    if (emailResult.success) {
      return new Response(JSON.stringify({ 
        success: true, 
        messageId: emailResult.messageId,
        message: 'Invitación enviada correctamente'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({ 
        success: false, 
        error: emailResult.error 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('❌ Error enviando email:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
