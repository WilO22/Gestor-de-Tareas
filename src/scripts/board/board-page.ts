// src/scripts/board/board-page.ts
// Módulo principal refactorizado del tablero
// Orquesta todos los submódulos para mantener la funcionalidad

import { getAuth, onAuthStateChanged, auth } from '../../firebase/auth';
import { fetchBoardInfo, subscribeToBoardChanges } from '../../firebase/api';
import type { Board, Column, Task } from '../../types/domain';

// Importar módulos refactorizados
import {
  currentBoard,
  currentColumns,
  currentTasks,
  realtimeUnsubscribe,
  isInitialized,
  updateCurrentBoard,
  updateCurrentColumns,
  updateCurrentTasks,
  setRealtimeUnsubscribe,
  setInitialized
} from './board-state';

import {
  hasColumnsChanged,
  hasTasksChanged,
  requiresColumnReordering
} from './board-utils';

import { renderBoard, updateColumnContents, updateTasksOnly } from './board-render';
import { setupGlobalEventListeners } from './board-events';

// Función principal de inicialización
export default async function initBoardPage(params?: { workspaceId?: string, boardId?: string }) {
  // Soporta llamada directa con params, o auto-lectura desde dataset (#board-root)
  const workspaceId = params?.workspaceId || document.getElementById('board-root')?.dataset.workspaceId || '';
  const boardId = params?.boardId || document.getElementById('board-root')?.dataset.boardId || '';
  console.log('🚀 Inicializando página del tablero optimizada:', { workspaceId, boardId });

  // Verificar autenticación
  const auth = getAuth();
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log('✅ Usuario autenticado:', user.email);
      if (workspaceId && boardId) await initializeBoard(workspaceId, boardId);
    } else {
      console.error('❌ Usuario no autenticado');
      window.location.href = '/login';
    }
  });
}

// Auto-inicialización si el script se carga directamente
if (typeof window !== 'undefined') {
  if (document.readyState !== 'loading') {
    const root = document.getElementById('board-root');
    if (root) initBoardPage();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      const root = document.getElementById('board-root');
      if (root) initBoardPage();
    });
  }
}

// Inicializar tablero
async function initializeBoard(workspaceId: string, boardId: string) {
  try {
    // Cargar información del tablero
    const board = await fetchBoardInfo(boardId);
    updateCurrentBoard(board);
    console.log('✅ Tablero cargado:', board?.name);

    // Actualizar UI inicial
    updateBoardTitle(board?.name || 'Tablero');
    await updateWorkspaceLink(workspaceId);

    // Configurar tiempo real
    setupRealtimeSubscription(boardId);

    // Configurar event listeners globales
    setupGlobalEventListeners();

  } catch (error) {
    console.error('❌ Error inicializando tablero:', error);
  }
}

// Configurar suscripción en tiempo real
function setupRealtimeSubscription(boardId: string) {
  if (realtimeUnsubscribe) {
    realtimeUnsubscribe();
  }

  const unsubscribe = subscribeToBoardChanges(boardId, (columns, tasks) => {
    console.log('📡 Datos recibidos:', columns.length, 'columnas,', tasks.length, 'tareas');

    const columnsChanged = hasColumnsChanged(currentColumns, columns);
    const tasksChanged = hasTasksChanged(currentTasks, tasks);

    if (!isInitialized) {
      // Primera carga - renderizar todo
      updateCurrentColumns(columns);
      updateCurrentTasks(tasks);
      renderBoard();
      setInitialized(true);
    } else if (columnsChanged) {
      // Cambio en columnas - actualización inteligente
      handleColumnsUpdate(columns, tasks);
    } else if (tasksChanged) {
      // Solo cambio en tareas - actualización rápida
      updateCurrentTasks(tasks);
      updateTasksOnly();
    }
  });

  setRealtimeUnsubscribe(unsubscribe);
}

// Manejar actualización de columnas
function handleColumnsUpdate(newColumns: Column[], newTasks: Task[]) {
  const oldCount = currentColumns.length;
  const newCount = newColumns.length;

  updateCurrentTasks(newTasks);

  // Detectar si hay cambios de orden
  const hasOrderChanged = requiresColumnReordering(newColumns);

  console.log('🔍 Análisis de columnas:', {
    oldCount,
    newCount,
    hasOrderChanged,
    currentColumns: currentColumns.map(c => ({ name: c.name, order: c.order })),
    newColumns: newColumns.map(c => ({ name: c.name, order: c.order }))
  });

  if (newCount > oldCount && !hasOrderChanged) {
    // Se agregaron columnas SIN cambios de orden - INSERCIÓN INCREMENTAL
    console.log('➕ Columnas agregadas, usando inserción incremental');
    addNewColumnsIncrementally(newColumns, oldCount);
  } else if (newCount < oldCount || hasOrderChanged) {
    // Se eliminaron columnas O cambió el orden - recrear necesario
    console.log('🔄 Columnas eliminadas o reordenadas, recreando tablero');
    updateCurrentColumns(newColumns);
    renderBoard();
  } else {
    // Solo cambios en contenido de columnas existentes
    console.log('📝 Solo cambios en contenido de columnas existentes');
    updateCurrentColumns(newColumns);
    updateColumnContents();
  }
}

// Agregar nuevas columnas incrementalmente
function addNewColumnsIncrementally(newColumns: Column[], oldCount: number) {
  // Identificar columnas nuevas
  const currentColumnIds = new Set(currentColumns.map(c => c.id));
  const newColumnObjects = newColumns.filter(c => !currentColumnIds.has(c.id));

  console.log('🆕 Agregando columnas incrementalmente:', newColumnObjects.map(c => c.name));

  // Agregar al estado
  updateCurrentColumns(newColumns);

  // Agregar visualmente
  const wrapper = document.getElementById('columns-wrapper');
  if (wrapper) {
    // Remover el botón "Añade otra lista" temporalmente
    const addButton = wrapper.querySelector('#add-column-btn');
    if (addButton) {
      addButton.remove();
    }

    // Agregar las nuevas columnas
    newColumnObjects.forEach((column, index) => {
      // Crear elemento de columna (esta función necesita ser implementada)
      const columnElement = createColumnElement(column, oldCount + index);
      wrapper.appendChild(columnElement);
    });

    // Re-agregar el botón "Añade otra lista"
    const newAddButton = createAddColumnButton();
    wrapper.appendChild(newAddButton);
  }
}

// Funciones auxiliares que necesitan ser implementadas
function updateBoardTitle(title: string) {
  const titleElement = document.querySelector('h1');
  if (titleElement) {
    titleElement.textContent = title;
  }
}

async function updateWorkspaceLink(workspaceId: string) {
  // TODO: Implementar actualización del enlace del workspace
  console.log('Actualizando enlace del workspace:', workspaceId);
}

function createColumnElement(column: Column, index: number): HTMLElement {
  // TODO: Implementar creación de elemento de columna
  const div = document.createElement('div');
  div.textContent = `Columna: ${column.name}`;
  return div;
}

function createAddColumnButton(): HTMLElement {
  // TODO: Implementar creación del botón de agregar columna
  const button = document.createElement('button');
  button.textContent = 'Añade otra lista';
  return button;
}
