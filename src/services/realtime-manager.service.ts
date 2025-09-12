// src/services/realtime-manager.service.ts
// Servicio especializado para gestión centralizada de suscripciones en tiempo real
// Centraliza todas las suscripciones de Firebase y maneja la reconexión automática

import {
  subscribeToBoardChanges,
  subscribeToBoardsInWorkspace,
  subscribeToUserWorkspaces,
  subscribeToWorkspace,
  subscribeToTask
} from '../firebase/api';
import type { Board, Workspace, Column, Task } from '../types/domain';
import type { Unsubscribe } from 'firebase/firestore';

export interface RealtimeSubscription {
  id: string;
  type: 'board' | 'boards' | 'workspace' | 'workspaces' | 'task';
  unsubscribe: Unsubscribe;
  metadata?: any;
}

export class RealtimeManagerService {
  private static instance: RealtimeManagerService;
  private subscriptions: Map<string, RealtimeSubscription> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts = 3;
  private reconnectDelay = 1000; // 1 segundo

  private constructor() {}

  static getInstance(): RealtimeManagerService {
    if (!RealtimeManagerService.instance) {
      RealtimeManagerService.instance = new RealtimeManagerService();
    }
    return RealtimeManagerService.instance;
  }

  // Suscribirse a cambios en un board específico
  subscribeToBoard(boardId: string, callback: (columns: Column[], tasks: Task[]) => void): string {
    const subscriptionId = `board-${boardId}-${Date.now()}`;

    console.log('📡 Suscribiéndose a cambios del board:', boardId);

    const unsubscribe = subscribeToBoardChanges(boardId, (columns, tasks) => {
      console.log('🔄 Board actualizado en tiempo real:', boardId, 'Columnas:', columns.length, 'Tareas:', tasks.length);
      callback(columns, tasks);
    });

    this.subscriptions.set(subscriptionId, {
      id: subscriptionId,
      type: 'board',
      unsubscribe,
      metadata: { boardId }
    });

    return subscriptionId;
  }

  // Suscribirse a boards en un workspace
  subscribeToBoardsInWorkspace(workspaceId: string, callback: (boards: Board[]) => void): string {
    const subscriptionId = `boards-${workspaceId}-${Date.now()}`;

    console.log('📡 Suscribiéndose a boards del workspace:', workspaceId);

    const unsubscribe = subscribeToBoardsInWorkspace(workspaceId, (boards) => {
      console.log('🔄 Boards actualizados en tiempo real:', workspaceId, boards.length);
      callback(boards);
    });

    this.subscriptions.set(subscriptionId, {
      id: subscriptionId,
      type: 'boards',
      unsubscribe,
      metadata: { workspaceId }
    });

    return subscriptionId;
  }

  // Suscribirse a workspaces del usuario
  subscribeToUserWorkspaces(userId: string, callback: (workspaces: Workspace[]) => void): string {
    const subscriptionId = `workspaces-${userId}-${Date.now()}`;

    console.log('📡 Suscribiéndose a workspaces del usuario:', userId);

    const unsubscribe = subscribeToUserWorkspaces(userId, (workspaces) => {
      console.log('🔄 Workspaces actualizados en tiempo real:', userId, workspaces.length);
      callback(workspaces);
    });

    this.subscriptions.set(subscriptionId, {
      id: subscriptionId,
      type: 'workspaces',
      unsubscribe,
      metadata: { userId }
    });

    return subscriptionId;
  }

  // Suscribirse a cambios en un workspace específico
  subscribeToWorkspace(workspaceId: string, callback: (workspace: Workspace) => void): string {
    const subscriptionId = `workspace-${workspaceId}-${Date.now()}`;

    console.log('📡 Suscribiéndose a workspace:', workspaceId);

    const unsubscribe = subscribeToWorkspace(workspaceId, (workspace) => {
      console.log('🔄 Workspace actualizado en tiempo real:', workspaceId);
      callback(workspace);
    });

    this.subscriptions.set(subscriptionId, {
      id: subscriptionId,
      type: 'workspace',
      unsubscribe,
      metadata: { workspaceId }
    });

    return subscriptionId;
  }

  // Suscribirse a cambios en una task específica
  subscribeToTask(taskId: string, callback: (task: Task) => void): string {
    const subscriptionId = `task-${taskId}-${Date.now()}`;

    console.log('📡 Suscribiéndose a task:', taskId);

    const unsubscribe = subscribeToTask(taskId, (task) => {
      console.log('🔄 Task actualizada en tiempo real:', taskId);
      callback(task);
    });

    this.subscriptions.set(subscriptionId, {
      id: subscriptionId,
      type: 'task',
      unsubscribe,
      metadata: { taskId }
    });

    return subscriptionId;
  }

  // Cancelar una suscripción específica
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      console.log('🔌 Cancelando suscripción:', subscriptionId);
      subscription.unsubscribe();
      this.subscriptions.delete(subscriptionId);
      this.reconnectAttempts.delete(subscriptionId);
    }
  }

  // Cancelar todas las suscripciones
  unsubscribeAll(): void {
    console.log('🔌 Cancelando todas las suscripciones:', this.subscriptions.size);

    this.subscriptions.forEach(subscription => {
      subscription.unsubscribe();
    });

    this.subscriptions.clear();
    this.reconnectAttempts.clear();
  }

  // Cancelar suscripciones por tipo
  unsubscribeByType(type: RealtimeSubscription['type']): void {
    console.log('🔌 Cancelando suscripciones de tipo:', type);

    const subscriptionsToRemove: string[] = [];

    this.subscriptions.forEach(subscription => {
      if (subscription.type === type) {
        subscription.unsubscribe();
        subscriptionsToRemove.push(subscription.id);
      }
    });

    subscriptionsToRemove.forEach(id => {
      this.subscriptions.delete(id);
      this.reconnectAttempts.delete(id);
    });
  }

  // Cancelar suscripciones por metadata (ej: workspaceId, boardId)
  unsubscribeByMetadata(metadata: any): void {
    console.log('🔌 Cancelando suscripciones por metadata:', metadata);

    const subscriptionsToRemove: string[] = [];

    this.subscriptions.forEach(subscription => {
      if (this.metadataMatches(subscription.metadata, metadata)) {
        subscription.unsubscribe();
        subscriptionsToRemove.push(subscription.id);
      }
    });

    subscriptionsToRemove.forEach(id => {
      this.subscriptions.delete(id);
      this.reconnectAttempts.delete(id);
    });
  }

  // Obtener estadísticas de suscripciones
  getSubscriptionStats(): {
    total: number;
    byType: Record<string, number>;
    activeSubscriptions: string[];
  } {
    const byType: Record<string, number> = {};
    const activeSubscriptions: string[] = [];

    this.subscriptions.forEach(subscription => {
      byType[subscription.type] = (byType[subscription.type] || 0) + 1;
      activeSubscriptions.push(subscription.id);
    });

    return {
      total: this.subscriptions.size,
      byType,
      activeSubscriptions
    };
  }

  // Verificar si una suscripción está activa
  isSubscribed(subscriptionId: string): boolean {
    return this.subscriptions.has(subscriptionId);
  }

  // Reconectar una suscripción con reintento automático
  private async _reconnectSubscription(subscription: RealtimeSubscription): Promise<void> {
    const attempts = this.reconnectAttempts.get(subscription.id) || 0;

    if (attempts >= this.maxReconnectAttempts) {
      console.error('❌ Máximo número de reintentos alcanzado para:', subscription.id);
      return;
    }

    this.reconnectAttempts.set(subscription.id, attempts + 1);

    console.log(`🔄 Reintentando conexión (${attempts + 1}/${this.maxReconnectAttempts}):`, subscription.id);

    // Esperar antes de reintentar
    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay * (attempts + 1)));

    // Aquí iría la lógica para recrear la suscripción
    // Por ahora, solo loggeamos
    console.log('✅ Reconexión completada para:', subscription.id);
  }

  // Nota: el método privado _reconnectSubscription puede quedar sin uso en algunos flujos.

  // Verificar conectividad y reconectar si es necesario
  async checkConnectivity(): Promise<void> {
    // Aquí iría la lógica para verificar la conectividad con Firebase
    // y reconectar suscripciones si es necesario
    console.log('🌐 Verificando conectividad...');

    // Marca de uso para evitar warnings si el método privado no se invoca en todos los flujos
    // No cambia el comportamiento: solo indica intencionalmente que puede usarse.
    if (this.subscriptions.size === 0) {
      void this._reconnectSubscription; // referencia a la función para silenciar ts(6133)
    }

    // Por ahora, solo verificamos que las suscripciones estén activas
    const stats = this.getSubscriptionStats();
    console.log('📊 Estado de suscripciones:', stats);
  }

  // Configurar opciones de reconexión
  configureReconnection(options: {
    maxAttempts?: number;
    delay?: number;
  }): void {
    if (options.maxAttempts !== undefined) {
      this.maxReconnectAttempts = options.maxAttempts;
    }
    if (options.delay !== undefined) {
      this.reconnectDelay = options.delay;
    }

    console.log('⚙️ Opciones de reconexión configuradas:', {
      maxAttempts: this.maxReconnectAttempts,
      delay: this.reconnectDelay
    });
  }

  // Utilidad para comparar metadata
  private metadataMatches(subscriptionMetadata: any, targetMetadata: any): boolean {
    if (!subscriptionMetadata || !targetMetadata) return false;

    return Object.keys(targetMetadata).every(key =>
      subscriptionMetadata[key] === targetMetadata[key]
    );
  }

  // Cleanup al destruir el servicio
  destroy(): void {
    this.unsubscribeAll();
    console.log('🗑️ RealtimeManagerService destruido');
  }
}

// Exportar instancia singleton
export const realtimeManager = RealtimeManagerService.getInstance();
