// src/types/domain.ts

// 'export' permite que usemos estas plantillas en otros archivos.
// 'interface' es la palabra que usamos para crear una nueva plantilla o "plano".

// Plano para una Tarea (Task)
export interface Task {
  id: string;          // Su identificador único (texto)
  title: string;       // Su título (texto)
  description?: string; // Su descripción (el '?' significa que es opcional)
  columnId: string;
  // Campos opcionales para persistencia y orden en Firestore
  boardId?: string;    // Tablero al que pertenece la tarea
  order?: number;      // Posición de ordenamiento dentro de la columna
}

// Plano para una Columna (Column)
export interface Column {
  id: string;          // Su identificador único (texto)
  name: string;        // Su nombre, ej: "Por Hacer" (texto)
  // Hacemos 'tasks' opcional para permitir columnas recién creadas sin tareas
  tasks?: Task[];      // Una lista de Tareas. '[]' significa "lista de".
  // Campos opcionales para persistencia y orden en Firestore
  boardId?: string;    // Tablero al que pertenece la columna
  order?: number;      // Posición de ordenamiento del conjunto de columnas
}

// Plano para un Tablero (Board)
export interface Board {
  id: string;           // Su identificador único (texto)
  name: string;         // Su nombre, ej: "Proyecto de Astro" (texto)
  columns: Column[];    // Una lista de Columnas.
}

// Plano para un Espacio de Trabajo (Workspace)
export interface Workspace {
  id: string;           // Su identificador único (texto)
  name: string;         // Su nombre, ej: "Trabajos de la Universidad" (texto)
  boards: Board[];
  userId: string;      // El identificador del usuario propietario.
}