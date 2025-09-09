// src/scripts/boards.ts

// Importamos todas las herramientas y tipos que necesitamos
import { auth } from '../firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { db } from '../firebase/client';
import { doc, getDoc } from 'firebase/firestore';
import { createBoard, subscribeToBoardsInWorkspace } from '../firebase/api';
import type { Board } from '../types/domain';
import type { Unsubscribe } from 'firebase/firestore';

// Estado para controlar la suscripción
let boardsUnsubscribe: Unsubscribe | null = null;

// --- Funciones de Ayuda (Helpers) ---

// Busca y muestra el nombre del Espacio de Trabajo
async function fetchWorkspaceDetails(workspaceId: string) {
  const workspaceNameEl = document.getElementById('workspace-name');
  if (!workspaceNameEl) return;

  const docRef = doc(db, "workspaces", workspaceId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    workspaceNameEl.textContent = `Espacio de trabajo: ${docSnap.data().name}`;
  } else {
    workspaceNameEl.textContent = "Workspace no encontrado";
  }
}

// Configura suscripción en tiempo real a tableros del workspace
function setupBoardsSubscription(workspaceId: string) {
  const boardsGridEl = document.getElementById('boards-grid');
  if (!boardsGridEl) return;

  // Cancelar suscripción anterior si existe
  if (boardsUnsubscribe) {
    boardsUnsubscribe();
    boardsUnsubscribe = null;
  }

  // Configurar nueva suscripción en tiempo real
  boardsUnsubscribe = subscribeToBoardsInWorkspace(workspaceId, (boards: Board[]) => {
    console.log('📊 Tableros actualizados en tiempo real:', boards.length);
    renderBoards(boards, workspaceId);
  });
}

// Renderiza los tableros en el DOM (separada para reutilizar)
function renderBoards(boards: Board[], workspaceId: string) {
  const boardsGridEl = document.getElementById('boards-grid');
  if (!boardsGridEl) return;
  
  boardsGridEl.innerHTML = ''; // Limpiamos el contenido anterior

  if(boards.length === 0){
    boardsGridEl.innerHTML = `<p>No hay tableros en este espacio de trabajo.</p>`;
  } else {
    boards.forEach((board: Board) => {
      const cardHTML = `
        <a href="/workspace/${workspaceId}/board/${board.id}" class="block p-4 border rounded-lg shadow-md hover:bg-gray-100 hover:shadow-lg transition-all">
          <h2 class="text-xl font-semibold">${board.name}</h2>
        </a>
      `;
      boardsGridEl.innerHTML += cardHTML;
    });
  }
}

// --- Función Principal de Inicialización ---

export default function initBoards(workspaceId?: string) {
  const createBoardForm = document.getElementById('create-board-form');
  const boardNameInput = document.getElementById('board-name') as HTMLInputElement;

  // Si no se pasó workspaceId, intentar leer desde el root dataset
  if (!workspaceId) {
    const root = document.getElementById('boards-root');
    workspaceId = root?.dataset.workspaceId || '';
  }

  onAuthStateChanged(auth, (user) => {
    if (user) {
      // 1. Cargar datos iniciales
      fetchWorkspaceDetails(workspaceId);
      setupBoardsSubscription(workspaceId); // Usar suscripción en tiempo real

      // 2. Preparar el formulario de creación
      createBoardForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const boardName = boardNameInput.value;
        if(boardName) {
          await createBoard(boardName, workspaceId);
          boardNameInput.value = '';
          // No necesitamos refrescar manualmente - la suscripción se encargará
          console.log('✅ Tablero creado, la suscripción actualizará la lista automáticamente');
        }
      });
    } else {
      // Si no hay usuario, proteger la ruta
      window.location.href = '/login';
    }
  });

  // Limpiar suscripción al salir
  window.addEventListener('beforeunload', () => {
    if (boardsUnsubscribe) {
      boardsUnsubscribe();
    }
  });
}

// Auto-inicialización si el script se carga directamente y el DOM ya contiene #boards-root
if (typeof window !== 'undefined') {
  if (document.readyState !== 'loading') {
    const root = document.getElementById('boards-root');
    if (root) initBoards(root.dataset.workspaceId);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      const root = document.getElementById('boards-root');
      if (root) initBoards(root.dataset.workspaceId);
    });
  }
}