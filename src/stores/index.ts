// src/stores/index.ts
// Punto de entrada centralizado para todos los stores

export { authStore } from './auth.store';
export { uiStore } from './ui.store';
export { workspaceStore } from './workspace.store';
export { boardStore } from './board.store';

// Tipos re-exportados para conveniencia
export type { User, Member, Workspace, Board, Column, Task } from '../types/domain';
