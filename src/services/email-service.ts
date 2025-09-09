// src/services/email-service.ts
// Servicio de envío de emails usando Nodemailer (GRATUITO)
// MIGRADO: Código reutilizado de functions/src/email-service.ts para evitar duplicación

import nodemailer from 'nodemailer';

// Interfaz para los datos del email de invitación (REUTILIZADA de Cloud Functions)
interface InvitationEmailData {
  to: string;
  workspaceName: string;
  inviterName: string;
  inviterEmail: string;
  message: string;
  invitationLink: string;
}

/**
 * MIGRADO: Configuración del transporter desde Cloud Functions
 * Configuración para Gmail GRATUITO
 */
const createTransporter = () => {
  // // CONFIGURACIÓN PARA GMAIL GRATUITO:
  // // 1. Activar verificación en 2 pasos en tu Gmail
  // // 2. Generar "App Password" en configuración de Google  
  // // 3. Agregar variables de entorno o usar valores por defecto para testing
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: import.meta.env.EMAIL_USER || 'tu-email@gmail.com', // // Variable de entorno o valor por defecto
      pass: import.meta.env.EMAIL_PASSWORD || 'tu-app-password' // // App Password de Gmail
    }
  });

  // // ALTERNATIVA PARA TESTING: Usar Ethereal (emails de prueba que NO llegan)
  // // return nodemailer.createTransport({
  // //   host: 'smtp.ethereal.email',
  // //   port: 587,
  // //   auth: {
  // //     user: 'ethereal.user@ethereal.email',
  // //     pass: 'ethereal.pass'
  // //   }
  // // });
};

/**
 * MIGRADO: Template HTML desde Cloud Functions
 * Plantilla HTML para el email de invitación con diseño profesional estilo Trello
 */
const createInvitationEmailTemplate = (data: InvitationEmailData): string => {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invitación a Workspace - Gestor de Tareas</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background-color: white;
          border-radius: 8px;
          padding: 40px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          background-color: #0079bf;
          color: white;
          padding: 10px 20px;
          border-radius: 4px;
          display: inline-block;
          font-weight: bold;
          font-size: 18px;
        }
        .content {
          margin-bottom: 30px;
        }
        .workspace-name {
          color: #0079bf;
          font-weight: bold;
        }
        .message-box {
          background-color: #f8f9fa;
          border-left: 4px solid #0079bf;
          padding: 15px;
          margin: 20px 0;
        }
        .cta-button {
          display: inline-block;
          background-color: #0079bf;
          color: white !important;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          text-align: center;
          margin: 20px 0;
          border: none;
          cursor: pointer;
        }
        .cta-button:visited {
          color: white !important;
        }
        .cta-button:hover {
          background-color: #005a8b;
          color: white !important;
        }
        .footer {
          text-align: center;
          color: #666;
          font-size: 12px;
          margin-top: 30px;
          border-top: 1px solid #eee;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🎯 Gestor de Tareas</div>
        </div>
        
        <div class="content">
          <h1>¡${data.inviterName} te ha invitado a colaborar!</h1>
          
          <p>Hola,</p>
          
          <p><strong>${data.inviterName}</strong> te ha enviado una invitación para unirte al workspace <span class="workspace-name">"${data.workspaceName}"</span> en Gestor de Tareas.</p>
          
          ${data.message ? `
            <div class="message-box">
              <strong>Mensaje personal:</strong><br>
              "${data.message}"
            </div>
          ` : ''}
          
          <p>Para aceptar la invitación y empezar a colaborar, haz clic en el siguiente botón:</p>
          
          <div style="text-align: center;">
            <a href="${data.invitationLink}" class="cta-button" style="background-color: #0079bf; color: white !important; text-decoration: none; display: inline-block; padding: 12px 30px; border-radius: 5px; font-weight: bold;">🚀 Aceptar Invitación</a>
          </div>
          
          <p>Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:</p>
          <p style="word-break: break-all; color: #0079bf;">${data.invitationLink}</p>
          
          <p>¡Esperamos verte pronto colaborando con nosotros!</p>
          
          <p>Saludos,<br>El equipo de Gestor de Tareas</p>
        </div>
        
        <div class="footer">
          <p>Este email fue enviado por ${data.inviterName} desde Gestor de Tareas.</p>
          <p>Si no esperabas esta invitación o tienes preguntas, contacta directamente con ${data.inviterName}.</p>
          <p style="color: #999; font-size: 11px; margin-top: 15px;">
            Este es un email automático, por favor no respondas a esta dirección.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * MIGRADO y ADAPTADO: Función principal de envío desde Cloud Functions
 * Envía email de invitación usando la configuración local
 * @param data - Datos de la invitación 
 * @returns Promise con resultado del envío
 */
export const sendInvitationEmail = async (data: InvitationEmailData): Promise<{success: boolean; error?: string; messageId?: string}> => {
  try {
    console.log('📧 Enviando invitación a:', data.to);
    
    // // Crear transporter con configuración de Gmail
    const transporter = createTransporter();
    
    // // MEJORADO: Configuración profesional del email como Trello
    const mailOptions = {
      from: `"Gestor de Tareas" <${import.meta.env.EMAIL_USER || 'noreply@gestortareas.com'}>`, // // Email de aplicación profesional
      to: data.to,
      replyTo: `"No Reply - Gestor de Tareas" <${import.meta.env.EMAIL_USER || 'noreply@gestortareas.com'}>`, // // Evitar respuestas
      subject: `🎯 ${data.inviterName} te ha invitado al workspace "${data.workspaceName}"`, // // Personalizado con nombre real
      html: createInvitationEmailTemplate(data)
    };
    
    // // Enviar email
    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email enviado exitosamente:', result.messageId);
    console.log('📧 Respuesta del servidor:', result.response);
    
    return {
      success: true,
      messageId: result.messageId
    };
    
  } catch (error) {
    console.error('❌ Error enviando email de invitación:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido enviando email'
    };
  }
};

/**
 * NUEVO: Función helper para validar configuración de email
 * Verifica si las credenciales están configuradas correctamente
 */
export const validateEmailConfig = (): { isValid: boolean; message: string } => {
  const emailUser = import.meta.env.EMAIL_USER;
  const emailPassword = import.meta.env.EMAIL_PASSWORD;
  
  if (!emailUser || emailUser === 'tu-email@gmail.com') {
    return {
      isValid: false,
      message: 'EMAIL_USER no está configurado. Agrega tu Gmail en las variables de entorno.'
    };
  }
  
  if (!emailPassword || emailPassword === 'tu-app-password') {
    return {
      isValid: false,
      message: 'EMAIL_PASSWORD no está configurado. Genera un App Password de Gmail.'
    };
  }
  
  return {
    isValid: true,
    message: 'Configuración de email válida'
  };
};

// // EXPORTAR TIPO para uso en otros archivos
export type { InvitationEmailData };
