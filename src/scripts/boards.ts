// src/scripts/boards.ts

// Importamos todas las herramientas y tipos que necesitamos
import { auth } from '../firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { db } from '../firebase/client';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { createBoard } from '../firebase/api';
import type { Board } from '../types/domain';

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

// Busca y muestra los tableros de un Espacio de Trabajo
async function fetchAndRenderBoards(workspaceId: string) {
  const boardsGridEl = document.getElementById('boards-grid');
  if (!boardsGridEl) return;

  const q = query(collection(db, "boards"), where("workspaceId", "==", workspaceId));
  const querySnapshot = await getDocs(q);
  
  boardsGridEl.innerHTML = ''; // Limpiamos el contenido anterior
  
  if(querySnapshot.empty){
    boardsGridEl.innerHTML = `<p>No hay tableros en este espacio de trabajo.</p>`;
  } else {
    querySnapshot.forEach((doc) => {
      const board = { id: doc.id, ...doc.data() } as Board; // Aquí el tipado funciona perfecto
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

export default function initBoards(workspaceId: string) {
  const createBoardForm = document.getElementById('create-board-form');
  const boardNameInput = document.getElementById('board-name') as HTMLInputElement;

  onAuthStateChanged(auth, (user) => {
    if (user) {
      // 1. Cargar todos los datos iniciales
      fetchWorkspaceDetails(workspaceId);
      fetchAndRenderBoards(workspaceId);

      // 2. Preparar el formulario de creación
      createBoardForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const boardName = boardNameInput.value;
        if(boardName) {
          await createBoard(boardName, workspaceId);
          boardNameInput.value = '';
          fetchAndRenderBoards(workspaceId); // Refrescar la lista de tableros
        }
      });
    } else {
      // Si no hay usuario, proteger la ruta
      window.location.href = '/login';
    }
  });
}