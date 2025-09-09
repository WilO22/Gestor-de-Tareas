// src/services/workspace.service.ts
import { getUserWorkspaces, getWorkspaceById, createWorkspace, deleteWorkspace } from '../firebase/api';
import type { Workspace } from '../types/domain';

export class WorkspaceService {
  static async getUserWorkspaces(userId: string): Promise<Workspace[]> {
    return await getUserWorkspaces(userId);
  }

  static async getWorkspaceById(workspaceId: string): Promise<Workspace | null> {
    return await getWorkspaceById(workspaceId);
  }

  static async createNewWorkspace(name: string, ownerId: string): Promise<{ success: boolean; id?: string; error?: any }> {
    return await createWorkspace(name, ownerId);
  }

  static async removeWorkspace(workspaceId: string): Promise<boolean> {
    const result = await deleteWorkspace(workspaceId);
    return result.success;
  }
}
