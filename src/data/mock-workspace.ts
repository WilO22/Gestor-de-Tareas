// src/data/mock-workspace.ts

// Importamos el plano 'Workspace' para asegurar que nuestros datos son correctos.
import type { Workspace } from '../types/domain';

// Ahora 'allWorkspaces' es una LISTA (indicada por los corchetes [])
// que contiene varios objetos de tipo 'Workspace'.
export const allWorkspaces: Workspace[] = [
  // --- Primer Espacio de Trabajo ---
  {
    id: 'ws-001',
    name: 'Proyectos de la Universidad',
    boards: [
      {
        id: 'board-001',
        name: 'Proyecto 2: Gestor Colaborativo',
        columns: [
          {
            id: 'col-001',
            name: '📝 Por Hacer',
            tasks: [
              { id: 'task-001', title: 'Definir estructura de datos' },
              { id: 'task-002', title: 'Crear componentes de UI' },
            ],
          },
          {
            id: 'col-002',
            name: '🚀 En Progreso',
            tasks: [
              { id: 'task-004', title: 'Configurar proyecto de Astro' },
            ],
          },
          {
            id: 'col-003',
            name: '✅ Hecho',
            tasks: [
              { id: 'task-005', title: 'Investigar sobre Trello' },
            ],
          },
        ],
      },
      {
        id: 'board-002',
        name: 'Estudio para Examen Final',
        columns: [], // Vacío por ahora
      },
    ],
  },
  // --- Segundo Espacio de Trabajo (NUEVO) ---
  {
    id: 'ws-002',
    name: 'Proyectos Personales',
    boards: [
      {
        id: 'board-003',
        name: 'Mi Blog de Viajes',
        columns: [
          {
            id: 'col-004',
            name: 'Ideas de Artículos',
            tasks: [
              { id: 'task-006', title: 'Escribir sobre mi viaje a Cusco' },
            ],
          },
        ],
      },
      {
        id: 'board-004',
        name: 'App del Clima',
        columns: [], // Vacío por ahora
      },
    ],
  },
];