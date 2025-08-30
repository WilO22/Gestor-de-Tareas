// src/scripts/board-page.ts
// Lógica del lado del cliente para la página de un tablero (board)
// - Lee columnas y tareas desde Firebase
// - Renderiza el contenido en el DOM
// - Permite crear nuevas columnas y nuevas tareas

import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/auth';
import { db } from '../firebase/client';
import { doc, getDoc } from 'firebase/firestore';

// Usamos la API local para interactuar con Firestore
import { fetchColumns, fetchTasks, createColumn, createTask } from '../firebase/api';
import type { Column, Task } from '../types/domain';

type InitArgs = { workspaceId: string; boardId: string };

// Helper: obtiene y coloca los nombres del workspace y del board
async function setHeaderTitles(workspaceId: string, boardId: string) {
  const workspaceLink = document.getElementById('workspace-link') as HTMLAnchorElement | null;
  const boardTitle = document.getElementById('board-title');

  try {
    const wsSnap = await getDoc(doc(db, 'workspaces', workspaceId));
    if (workspaceLink && wsSnap.exists()) {
      workspaceLink.textContent = wsSnap.data().name ?? 'Workspace';
    }
  } catch (e) {
    console.warn('No se pudo obtener el workspace:', e);
  }

  try {
    const boardSnap = await getDoc(doc(db, 'boards', boardId));
    if (boardTitle && boardSnap.exists()) {
      boardTitle.textContent = boardSnap.data().name ?? 'Tablero';
    }
  } catch (e) {
    console.warn('No se pudo obtener el board:', e);
  }
}

// Renderiza columnas y tareas
async function renderBoard(boardId: string) {
  const container = document.getElementById('columns-container');
  if (!container) return;

  // Le mostramos al usuario que estamos cargando
  container.innerHTML = '<p id="loading-columns">Cargando columnas...</p>';

  // Cargamos columnas y tareas del tablero
  const [columns, tasks] = await Promise.all([
    fetchColumns(boardId),
    fetchTasks(boardId)
  ]);

  // Agrupamos tareas por columna
  const tasksByColumn = new Map<string, Task[]>();
  tasks.forEach((t) => {
    const list = tasksByColumn.get(t.columnId) ?? [];
    list.push(t);
    tasksByColumn.set(t.columnId, list);
  });

  // Construimos el HTML de columnas
  const html: string[] = [];
  html.push('<div class="flex gap-4 overflow-x-auto pb-4">');
  columns.forEach((col: Column) => {
    const colTasks = (tasksByColumn.get(col.id) ?? []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    html.push(`
      <div class="bg-gray-100 p-3 rounded-lg w-72 flex-shrink-0 flex flex-col">
        <h2 class="font-bold mb-3">${col.name}</h2>
        <div class="space-y-2 task-list flex-grow" data-id="${col.id}">
          ${colTasks.map(t => `
            <div class="bg-white p-2 rounded-md shadow" data-id="${t.id}">
              <p>${t.title}</p>
            </div>
          `).join('')}
        </div>
        <form class="mt-3 add-task-form" data-column-id="${col.id}">
          <input type="text" placeholder="Nueva tarea" class="px-2 py-1 border rounded w-full mb-2" required />
          <button type="submit" class="px-2 py-1 bg-blue-600 text-white rounded w-full">Agregar Tarea</button>
        </form>
      </div>
    `);
  });
  // Bloque para crear una nueva columna
  html.push(`
    <div class="w-72 flex-shrink-0">
      <form id="add-column-form" class="bg-gray-50 border rounded-lg p-3">
        <input type="text" id="new-column-name" placeholder="Nombre de columna" class="px-2 py-1 border rounded w-full mb-2" required />
        <button type="submit" class="px-2 py-1 bg-green-600 text-white rounded w-full">Agregar columna</button>
      </form>
    </div>
  `);
  html.push('</div>');

  container.innerHTML = html.join('');

  // Después de renderizar, inicializamos drag-and-drop sobre las listas .task-list
  const { initDragAndDrop } = await import('./drag-and-drop.ts');
  initDragAndDrop();

  // Wire de formularios: crear tareas
  const forms = container.querySelectorAll<HTMLFormElement>('form.add-task-form');
  forms.forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = form.querySelector('input');
      const columnId = form.getAttribute('data-column-id')!;
      const title = (input as HTMLInputElement).value.trim();
      if (!title) return;

      // El orden será el tamaño actual de la lista de tareas de la columna
      const listEl = container.querySelector(`.task-list[data-id="${columnId}"]`);
      const currentCount = listEl ? listEl.children.length : 0;
      await createTask(title, boardId, columnId, currentCount);
      (input as HTMLInputElement).value = '';
      // Re-render rápido para ver el cambio
      await renderBoard(boardId);
    });
  });

  // Wire: crear columna
  const addColumnForm = document.getElementById('add-column-form') as HTMLFormElement | null;
  if (addColumnForm) {
    addColumnForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('new-column-name') as HTMLInputElement;
      const name = nameInput.value.trim();
      if (!name) return;
      const order = columns.length; // la nueva columna va al final
      await createColumn(name, boardId, order);
      nameInput.value = '';
      await renderBoard(boardId);
    });
  }
}

export default function initBoardPage({ workspaceId, boardId }: InitArgs) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    // Cargamos títulos y datos del tablero
    await setHeaderTitles(workspaceId, boardId);
    await renderBoard(boardId);
  });
}
