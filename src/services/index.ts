// src/services/index.ts
// Archivo índice para exportar todos los servicios

// Servicios existentes
export { RealtimeService } from './realtime.service';
export { WorkspaceService } from './workspace.service';
export { sendInvitationEmail } from './email-service';

// Servicios nuevos de FASE 6B
export { RealtimeManagerService } from './realtime-manager.service';

// Tipos y interfaces
export type { RealtimeSubscription } from './realtime-manager.service';
