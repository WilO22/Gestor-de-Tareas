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
  html.push('<div class="flex gap-4 overflow-x-auto pb-4 items-start">');
  columns.forEach((col: Column) => {
    const colTasks = (tasksByColumn.get(col.id) ?? []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    html.push(`
      <div class="bg-gray-100 p-3 rounded-lg w-72 flex-shrink-0 shadow-sm">
        <h2 class="font-semibold mb-3 text-gray-700 text-sm">${col.name}</h2>
        <div class="space-y-2 task-list mb-3" data-id="${col.id}">
          ${colTasks.map(t => `
            <div class="bg-white p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200" data-id="${t.id}">
              <p class="text-gray-800 text-sm">${t.title}</p>
            </div>
          `).join('')}
        </div>
        <form class="add-task-form" data-column-id="${col.id}">
          <div class="add-task-btn-wrapper">
            <button type="button" class="add-task-btn w-full text-left text-gray-500 hover:text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm transition-colors flex items-center">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              Añade una tarjeta
            </button>
          </div>
          <div class="add-task-form-wrapper hidden">
            <textarea placeholder="Introduce un título o pega un enlace" class="w-full px-3 py-2 border-2 border-blue-400 rounded-lg text-sm resize-none h-20 mb-3 focus:outline-none focus:border-blue-500 shadow-sm" required rows="3"></textarea>
            <div class="flex items-center gap-2">
              <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 font-medium shadow-sm">
                Añadir tarjeta
              </button>
              <button type="button" class="cancel-task-btn p-2 text-gray-400 hover:text-gray-600">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>
        </form>
      </div>
    `);
  });
  // Bloque para crear una nueva columna
  html.push(`
    <div class="w-72 flex-shrink-0">
      <!-- Estado inicial: botón "Añade otra lista" -->
      <div id="add-column-btn" class="bg-white hover:bg-gray-50 rounded-lg p-4 cursor-pointer transition-all shadow-sm border border-gray-200">
        <div class="flex items-center text-gray-600">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          <span class="text-sm font-medium">Añade otra lista</span>
        </div>
      </div>
      
      <!-- Estado de edición: formulario oculto inicialmente -->
      <div id="add-column-form-wrapper" class="bg-gray-100 rounded-lg p-3 hidden shadow-sm">
        <form id="add-column-form">
          <input type="text" id="new-column-name" placeholder="Introduce el nombre de la lista..." class="w-full px-3 py-2 border-2 border-blue-400 rounded-lg text-sm mb-3 focus:outline-none focus:border-blue-500 shadow-sm" required />
          <div class="flex items-center gap-2">
            <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 font-medium shadow-sm">
              Añadir lista
            </button>
            <button type="button" id="cancel-add-column" class="p-2 text-gray-400 hover:text-gray-600">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </form>
      </div>
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
    const addTaskBtn = form.querySelector('.add-task-btn') as HTMLButtonElement;
    const addTaskBtnWrapper = form.querySelector('.add-task-btn-wrapper') as HTMLElement;
    const addTaskFormWrapper = form.querySelector('.add-task-form-wrapper') as HTMLElement;
    const cancelTaskBtn = form.querySelector('.cancel-task-btn') as HTMLButtonElement;
    const textarea = form.querySelector('textarea') as HTMLTextAreaElement;

    // Mostrar formulario al hacer click en "Añade una tarjeta"
    addTaskBtn?.addEventListener('click', () => {
      addTaskBtnWrapper.classList.add('hidden');
      addTaskFormWrapper.classList.remove('hidden');
      textarea.focus();
    });

    // Cancelar y volver al botón
    cancelTaskBtn?.addEventListener('click', () => {
      addTaskFormWrapper.classList.add('hidden');
      addTaskBtnWrapper.classList.remove('hidden');
      textarea.value = '';
    });

    // Enviar formulario
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const columnId = form.getAttribute('data-column-id')!;
      const title = textarea.value.trim();
      if (!title) return;

      // El orden será el tamaño actual de la lista de tareas de la columna
      const listEl = container.querySelector(`.task-list[data-id="${columnId}"]`);
      const currentCount = listEl ? listEl.children.length : 0;
      await createTask(title, boardId, columnId, currentCount);
      textarea.value = '';
      // Re-render rápido para ver el cambio
      await renderBoard(boardId);
    });
  });

  // Wire: crear columna
  const addColumnBtn = document.getElementById('add-column-btn');
  const addColumnFormWrapper = document.getElementById('add-column-form-wrapper');
  const addColumnForm = document.getElementById('add-column-form') as HTMLFormElement | null;
  const cancelAddColumn = document.getElementById('cancel-add-column');
  const newColumnNameInput = document.getElementById('new-column-name') as HTMLInputElement;

  // Mostrar formulario cuando se hace click en "Añade otra lista"
  if (addColumnBtn && addColumnFormWrapper) {
    addColumnBtn.addEventListener('click', () => {
      addColumnBtn.classList.add('hidden');
      addColumnFormWrapper.classList.remove('hidden');
      newColumnNameInput.focus(); // Hacer focus en el input
    });
  }

  // Cancelar y volver al estado inicial
  if (cancelAddColumn && addColumnBtn && addColumnFormWrapper) {
    cancelAddColumn.addEventListener('click', () => {
      addColumnFormWrapper.classList.add('hidden');
      addColumnBtn.classList.remove('hidden');
      newColumnNameInput.value = ''; // Limpiar input
    });
  }

  // Enviar formulario para crear columna
  if (addColumnForm) {
    addColumnForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('new-column-name') as HTMLInputElement;
      const name = nameInput.value.trim();
      if (!name) return;
      const order = columns.length; // la nueva columna va al final
      await createColumn(name, boardId, order);
      nameInput.value = '';
      await renderBoard(boardId); // Re-renderizar para mostrar la nueva columna
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
