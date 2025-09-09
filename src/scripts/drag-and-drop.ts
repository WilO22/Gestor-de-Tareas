// src/scripts/drag-and-drop.ts

import Sortable from 'sortablejs';
import type { SortableEvent } from 'sortablejs';

// Importamos las herramientas de Firebase que necesitamos
import { db } from '../firebase/client';
// AHORA también importamos 'writeBatch' para hacer varias escrituras a la vez
import { doc, writeBatch } from 'firebase/firestore';

// EXPORTAR la función para que pueda ser usada desde board-page.ts
export async function handleOnEnd(event: SortableEvent) {
  // Obtenemos los elementos HTML de la columna de origen y destino
  const fromColumn = event.from as HTMLElement;
  const toColumn = event.to as HTMLElement;

  // Obtenemos todos los elementos de las tareas en la columna de DESTINO
  const tasksInNewColumn = Array.from(toColumn.querySelectorAll('[data-task-id]'));

  // 1. Creamos un "lote de escritura" (write batch).
  //    Es como preparar una lista de cambios para enviarlos todos juntos.
  const batch = writeBatch(db);

  // 2. Recorremos cada tarea en la columna de destino para actualizar su orden
  tasksInNewColumn.forEach((taskElement, index) => {
    const taskId = (taskElement as HTMLElement).dataset.taskId; // CAMBIAR de dataset.id a dataset.taskId
    if (taskId) {
      const taskRef = doc(db, "tasks", taskId);
      // Preparamos la actualización para esta tarea:
      // - Cambiamos su 'columnId' al de la nueva columna.
      // - Cambiamos su 'order' a su nueva posición en la lista.
      batch.update(taskRef, { 
        columnId: toColumn.dataset.id,
        order: index 
      });
    }
  });

  // Si la tarjeta se movió DESDE una columna diferente...
  if (fromColumn !== toColumn) {
    // ...también necesitamos reordenar la columna de ORIGEN.
    const tasksInOldColumn = Array.from(fromColumn.querySelectorAll('[data-task-id]')); // CAMBIAR selector
    tasksInOldColumn.forEach((taskElement, index) => {
      const taskId = (taskElement as HTMLElement).dataset.taskId; // CAMBIAR de dataset.id a dataset.taskId
      if (taskId) {
        const taskRef = doc(db, "tasks", taskId);
        // Solo actualizamos su 'order', ya que su 'columnId' no ha cambiado.
        batch.update(taskRef, { order: index });
      }
    });
  }

  try {
    // 3. Enviamos todos los cambios a Firebase de una sola vez.
    await batch.commit();
    console.log("✅ Drag-and-drop sincronizado en tiempo real");
  } catch (error) {
    console.error("❌ Error al sincronizar drag-and-drop:", error);
  }
}

// Exportamos una función explícita para inicializar Sortable en las columnas renderizadas.
// De esta forma podemos llamarla cada vez que el DOM cambie (por ejemplo, al crear columnas)
export function initDragAndDrop() {
  const columns = document.querySelectorAll<HTMLElement>('.task-list');
  columns.forEach((column) => {
    // Evitamos inicializar dos veces el mismo contenedor
    if ((column as any).__sortableInitialized) return;
    (column as any).__sortableInitialized = true;
    new Sortable(column, {
      group: 'shared',
      animation: 150,
      ghostClass: 'blue-background-class',
      forceFallback: true,
      onEnd: handleOnEnd
    });
  });
}