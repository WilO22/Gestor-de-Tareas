// src/types/domain.ts

// 'export' permite que usemos estas plantillas en otros archivos.
// 'interface' es la palabra que usamos para crear una nueva plantilla o "plano".

// Plano para un Usuario (User) - NUEVO para sistema de roles y colaboración
export interface User {
  id: string;           // Su identificador único (del Firebase Auth)
  email: string;        // Su correo electrónico
  displayName?: string; // Su nombre para mostrar (opcional)
  role: 'admin' | 'user'; // Su rol en el sistema
  workspaces: string[]; // Lista de IDs de workspaces a los que pertenece
  createdAt: Date;      // Fecha de creación de la cuenta
}

// Plano para un Miembro de workspace/board
export interface Member {
  userId: string;       // ID del usuario
  email: string;        // Email del usuario (para mostrar)
  displayName?: string; // Nombre del usuario
  role: 'owner' | 'admin' | 'member'; // Rol en este workspace/board específico
  joinedAt: Date;       // Fecha en que se unió
}

// Plano para una Tarea (Task)
export interface Task {
  id: string;          // Su identificador único (texto)
  title: string;       // Su título (texto)
  description?: string; // Su descripción (el '?' significa que es opcional)
  columnId: string;
  // Campos opcionales para persistencia y orden en Firestore
  boardId?: string;    // Tablero al que pertenece la tarea
  order?: number;      // Posición de ordenamiento dentro de la columna
  assignedTo?: string; // ID del usuario asignado (opcional)
  createdBy?: string;  // ID del usuario que creó la tarea
  createdAt?: Date;    // Fecha de creación
  archived?: boolean;  // Campo para marcar tareas archivadas (papelera)
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
  archived?: boolean;  // Campo para marcar columnas archivadas (papelera)
}

// Plano para un Tablero (Board) - ACTUALIZADO para colaboración
export interface Board {
  id: string;           // Su identificador único (texto)
  name: string;         // Su nombre, ej: "Proyecto de Astro" (texto)
  title?: string;       // Título opcional (alias de name en algunas vistas)
  description?: string; // Descripción opcional mostrada en la UI
  workspaceId: string;  // ID del workspace al que pertenece
  columns: Column[];    // Una lista de Columnas.
  members: Member[];    // Lista de miembros con acceso a este tablero
  ownerId: string;      // ID del usuario propietario del tablero
  createdAt: Date;      // Fecha de creación
  updatedAt: Date;      // Fecha de última actualización
}

// Plano para un Espacio de Trabajo (Workspace) - ACTUALIZADO para colaboración
export interface Workspace {
  id: string;           // Su identificador único (texto)
  name: string;         // Su nombre, ej: "Trabajos de la Universidad" (texto)
  description?: string; // Descripción opcional mostrada en la UI
  boards: Board[];      // Lista de tableros (puede estar vacía en consultas simples)
  ownerId: string;      // ID del usuario propietario (antes era userId)
  members: Member[];    // Lista de miembros con acceso a este workspace
  createdAt: Date;      // Fecha de creación
  updatedAt: Date;      // Fecha de última actualización
}

// // NUEVO: Plano para una Invitación (Invitation) - Para sistema de invitaciones por email
export interface Invitation {
  id: string;               // Su identificador único
  workspaceId: string;      // ID del workspace al que se invita
  inviterUserId: string;    // ID del usuario que envía la invitación
  inviteeEmail: string;     // Email del usuario invitado
  message?: string;         // Mensaje personalizado (opcional)
  status: 'pending' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'failed'; // Estado de la invitación
  type: 'email' | 'link';   // Tipo de invitación: email para invitaciones por correo, link para enlaces compartibles
  createdAt: Date;          // Fecha de creación de la invitación
  sentAt?: Date;            // Fecha de envío del email (opcional)
  acceptedAt?: Date;        // Fecha de aceptación (opcional)
  rejectedAt?: Date;        // Fecha de rechazo (opcional)
  acceptedByUserId?: string; // ID del usuario que aceptó (para verificación)
  expiresAt: Date;          // Fecha de expiración
  error?: string;           // Error en caso de fallo en envío (opcional)
  // // NUEVO: Campos de respaldo para evitar consultas adicionales con problemas de permisos
  workspaceName?: string;   // Nombre del workspace (copia para evitar consultas)
  inviterName?: string;     // Nombre del invitador (copia para evitar consultas)
}