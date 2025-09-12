import type { APIRoute } from 'astro';
import { createWorkspace } from '../../firebase/api';

export const POST: APIRoute = async ({ request }) => {
  console.log('🚀 API /api/workspace: POST request received');
  
  try {
    // Por ahora, simplificamos la autenticación
    // En producción, deberías verificar el token JWT aquí
    const authHeader = request.headers.get('authorization');
    console.log('🚀 API /api/workspace: Auth header present:', !!authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No autorizado - token requerido'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Obtener el nombre del workspace y userId del body
    const { name, ownerId } = await request.json();
    console.log('🚀 API /api/workspace: Request body parsed:', { name, ownerId: ownerId ? 'present' : 'missing' });

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Nombre del workspace requerido'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!ownerId || typeof ownerId !== 'string') {
      return new Response(JSON.stringify({
        success: false,
        error: 'ID del propietario requerido'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Extraer y verificar el token (para autenticación básica)
    // En producción, deberías verificar completamente el JWT aquí
    const token = authHeader.replace('Bearer ', '');
    let tokenUserId: string;

    try {
      // Decodificar JWT sin verificar firma completa (simplificado)
      const payload = JSON.parse(atob(token.split('.')[1]));
      tokenUserId = payload.user_id || payload.sub || payload.uid || payload.userId;

      if (!tokenUserId) {
        throw new Error('UserId no encontrado en token');
      }

      // Verificar que el userId del token coincida con el ownerId del body
      if (tokenUserId !== ownerId) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Token no coincide con el propietario'
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (error) {
      console.error('Error decodificando token:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Token inválido'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('📝 Creando workspace:', { name: name.trim(), ownerId });

    console.log('📝 Creando workspace:', { name: name.trim(), ownerId });

    // Crear el workspace usando la función existente
    const result = await createWorkspace(name.trim(), ownerId);

    if (result.success) {
      console.log('✅ Workspace creado exitosamente:', result.id);
      return new Response(JSON.stringify({
        success: true,
        id: result.id,
        message: 'Workspace creado exitosamente'
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      console.error('❌ Error creando workspace:', result.error);
      return new Response(JSON.stringify({
        success: false,
        error: result.error || 'Error al crear el workspace'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('❌ Error en el endpoint de workspace:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Error interno del servidor'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
