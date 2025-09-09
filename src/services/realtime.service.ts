// src/services/realtime.service.ts
import { subscribeToBoardChanges, subscribeToBoardsInWorkspace, subscribeToUserWorkspaces } from '../firebase/api';
import type { Unsubscribe } from 'firebase/firestore';
import type { Column, Task, Board, Workspace } from '../types/domain';

export class RealtimeService {
  private static subscriptions: Map<string, Unsubscribe> = new Map();

  static subscribeToBoard(boardId: string, callback: (columns: Column[], tasks: Task[]) => void): string {
    const subscriptionId = `board-${boardId}`;

    // Cancelar suscripción anterior si existe
    this.unsubscribe(subscriptionId);

    const unsubscribe = subscribeToBoardChanges(boardId, callback);
    this.subscriptions.set(subscriptionId, unsubscribe);

    return subscriptionId;
  }

  static subscribeToBoardsInWorkspace(workspaceId: string, callback: (boards: Board[]) => void): string {
    const subscriptionId = `workspace-boards-${workspaceId}`;

    this.unsubscribe(subscriptionId);

    const unsubscribe = subscribeToBoardsInWorkspace(workspaceId, callback);
    this.subscriptions.set(subscriptionId, unsubscribe);

    return subscriptionId;
  }

  static subscribeToUserWorkspaces(userId: string, callback: (workspaces: Workspace[]) => void): string {
    const subscriptionId = `user-workspaces-${userId}`;

    this.unsubscribe(subscriptionId);

    const unsubscribe = subscribeToUserWorkspaces(userId, callback);
    this.subscriptions.set(subscriptionId, unsubscribe);

    return subscriptionId;
  }

  static unsubscribe(subscriptionId: string): void {
    const unsubscribe = this.subscriptions.get(subscriptionId);
    if (unsubscribe) {
      unsubscribe();
      this.subscriptions.delete(subscriptionId);
    }
  }

  static unsubscribeAll(): void {
    this.subscriptions.forEach((unsubscribe) => unsubscribe());
    this.subscriptions.clear();
  }

  static getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }
}
