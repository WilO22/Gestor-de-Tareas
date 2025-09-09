// src/firebase/reports.ts
// Servicio de reportes del lado del cliente
// Implementa la funcionalidad de reportes requerida por el docente

import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from './client';
import type { Task, Board, Workspace } from '../types/domain';

// Interfaz para los parámetros del reporte
export interface ReportParams {
  workspaceId: string;
  boardId?: string;
  startDate?: Date;
  endDate?: Date;
  includeArchived?: boolean;
}

// Interfaz para los datos de una tarea en el reporte
export interface TaskReportData {
  id: string;
  title: string;
  description?: string;
  boardId: string;
  boardName: string;
  columnId: string;
  columnName: string;
  createdBy?: string;
  createdAt?: Date;
  assignedTo?: string;
  archived?: boolean;
  order?: number;
}

// Interfaz para el reporte completo
export interface TaskReport {
  workspaceId: string;
  workspaceName: string;
  boardId?: string;
  boardName?: string;
  generatedAt: Date;
  period: {
    startDate?: Date;
    endDate?: Date;
  };
  statistics: {
    totalTasks: number;
    activeTasks: number;
    archivedTasks: number;
    tasksByBoard: Record<string, number>;
    tasksByColumn: Record<string, number>;
    tasksByStatus: Record<string, number>;
  };
  tasks: TaskReportData[];
}

/**
 * Genera un reporte completo de tareas para un workspace
 * @param params - Parámetros para el reporte
 * @returns Promise con el reporte generado
 */
export async function generateTaskReport(params: ReportParams): Promise<TaskReport> {
  try {
    console.log("📊 Generando reporte de tareas:", params);
    
    // Obtener datos del workspace
    const workspaceDoc = await getDocs(
      query(collection(db, "workspaces"), where("__name__", "==", params.workspaceId), limit(1))
    );
    
    if (workspaceDoc.empty) {
      throw new Error(`Workspace ${params.workspaceId} no encontrado`);
    }
    
    const workspaceData = workspaceDoc.docs[0].data() as Workspace;
    const workspaceName = workspaceData.name || 'Workspace sin nombre';
    
    // Obtener boards del workspace
    let boardQuery = query(
      collection(db, "boards"), 
      where("workspaceId", "==", params.workspaceId)
    );
    
    // Filtrar por board específico si se proporciona
    if (params.boardId) {
      boardQuery = query(
        collection(db, "boards"),
        where("__name__", "==", params.boardId),
        where("workspaceId", "==", params.workspaceId)
      );
    }
    
    const boardsSnapshot = await getDocs(boardQuery);
    const boards = new Map<string, Board>();
    
    // Procesar boards
    boardsSnapshot.docs.forEach(doc => {
      const boardData = { id: doc.id, ...doc.data() } as Board;
      boards.set(doc.id, boardData);
    });
    
    if (boards.size === 0) {
      return createEmptyReport(params, workspaceName);
    }
    
    // Obtener tareas de los boards
    const boardIds = Array.from(boards.keys());
    let allTasks: TaskReportData[] = [];
    
    // Procesar boards en lotes para evitar limitaciones de Firestore
    for (const boardId of boardIds) {
      let taskQuery = query(
        collection(db, "tasks"),
        where("boardId", "==", boardId)
      );
      
      // Aplicar filtros de fecha si se proporcionan
      if (params.startDate) {
        taskQuery = query(taskQuery, where("createdAt", ">=", params.startDate));
      }
      
      if (params.endDate) {
        taskQuery = query(taskQuery, where("createdAt", "<=", params.endDate));
      }
      
      if (!params.includeArchived) {
        taskQuery = query(taskQuery, where("archived", "!=", true));
      }
      
      const tasksSnapshot = await getDocs(taskQuery);
      
      // Obtener columnas del board
      const columnsSnapshot = await getDocs(
        query(collection(db, "columns"), where("boardId", "==", boardId))
      );
      
      const columns = new Map<string, any>();
      columnsSnapshot.docs.forEach(doc => {
        columns.set(doc.id, { id: doc.id, ...doc.data() });
      });
      
      // Procesar tareas del board
      const boardTasks = tasksSnapshot.docs.map(doc => {
        const taskData = { id: doc.id, ...doc.data() } as Task;
        const board = boards.get(boardId);
        const column = columns.get(taskData.columnId);
        
        return {
          id: taskData.id,
          title: taskData.title || 'Sin título',
          description: taskData.description,
          boardId: boardId,
          boardName: board?.name || 'Board desconocido',
          columnId: taskData.columnId,
          columnName: column?.name || 'Columna desconocida',
          createdBy: taskData.createdBy,
          createdAt: taskData.createdAt,
          assignedTo: taskData.assignedTo,
          archived: taskData.archived || false,
          order: taskData.order
        } as TaskReportData;
      });
      
      allTasks = allTasks.concat(boardTasks);
    }
    
    // Calcular estadísticas
    const statistics = calculateStatistics(allTasks);
    
    // Determinar nombre del board si se filtró por uno específico
    let boardName: string | undefined;
    if (params.boardId) {
      boardName = boards.get(params.boardId)?.name || 'Board desconocido';
    }
    
    return {
      workspaceId: params.workspaceId,
      workspaceName,
      boardId: params.boardId,
      boardName,
      generatedAt: new Date(),
      period: {
        startDate: params.startDate,
        endDate: params.endDate
      },
      statistics,
      tasks: allTasks
    };
    
  } catch (error) {
    console.error("❌ Error generando reporte:", error);
    throw error;
  }
}

/**
 * Calcula estadísticas para el reporte
 */
function calculateStatistics(tasks: TaskReportData[]) {
  const statistics = {
    totalTasks: tasks.length,
    activeTasks: tasks.filter(task => !task.archived).length,
    archivedTasks: tasks.filter(task => task.archived).length,
    tasksByBoard: {} as Record<string, number>,
    tasksByColumn: {} as Record<string, number>,
    tasksByStatus: {} as Record<string, number>
  };
  
  // Contar tareas por board
  tasks.forEach(task => {
    const boardKey = task.boardName;
    statistics.tasksByBoard[boardKey] = (statistics.tasksByBoard[boardKey] || 0) + 1;
  });
  
  // Contar tareas por columna
  tasks.forEach(task => {
    const columnKey = task.columnName;
    statistics.tasksByColumn[columnKey] = (statistics.tasksByColumn[columnKey] || 0) + 1;
  });
  
  // Contar tareas por estado (activas/archivadas)
  statistics.tasksByStatus['Activas'] = statistics.activeTasks;
  statistics.tasksByStatus['Archivadas'] = statistics.archivedTasks;
  
  return statistics;
}

/**
 * Crea un reporte vacío cuando no hay datos
 */
function createEmptyReport(params: ReportParams, workspaceName: string): TaskReport {
  return {
    workspaceId: params.workspaceId,
    workspaceName,
    boardId: params.boardId,
    boardName: undefined,
    generatedAt: new Date(),
    period: {
      startDate: params.startDate,
      endDate: params.endDate
    },
    statistics: {
      totalTasks: 0,
      activeTasks: 0,
      archivedTasks: 0,
      tasksByBoard: {},
      tasksByColumn: {},
      tasksByStatus: {}
    },
    tasks: []
  };
}

/**
 * Convierte el reporte a formato CSV
 * @param report - Reporte a convertir
 * @returns String en formato CSV
 */
export function convertReportToCSV(report: TaskReport): string {
  const headers = [
    'ID',
    'Título',
    'Descripción',
    'Board',
    'Columna',
    'Creado Por',
    'Fecha Creación',
    'Asignado A',
    'Archivado',
    'Orden'
  ];
  
  const rows = report.tasks.map(task => [
    task.id,
    `"${task.title.replace(/"/g, '""')}"`, // Escapar comillas en CSV
    `"${(task.description || '').replace(/"/g, '""')}"`,
    `"${task.boardName.replace(/"/g, '""')}"`,
    `"${task.columnName.replace(/"/g, '""')}"`,
    task.createdBy || '',
    task.createdAt ? task.createdAt.toISOString().split('T')[0] : '',
    task.assignedTo || '',
    task.archived ? 'Sí' : 'No',
    task.order || ''
  ]);
  
  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

/**
 * Función auxiliar para obtener reportes rápidos
 * @param workspaceId - ID del workspace
 * @param options - Opciones adicionales
 * @returns Promise con el reporte generado
 */
export async function getQuickReport(workspaceId: string, options: {
  boardId?: string;
  days?: number; // Últimos N días
  includeArchived?: boolean;
} = {}): Promise<TaskReport> {
  const endDate = new Date();
  const startDate = options.days ? new Date(Date.now() - options.days * 24 * 60 * 60 * 1000) : undefined;
  
  return generateTaskReport({
    workspaceId,
    boardId: options.boardId,
    startDate,
    endDate,
    includeArchived: options.includeArchived || false
  });
}

/**
 * Función para descargar reporte como archivo CSV
 * @param report - Reporte a descargar
 * @param filename - Nombre del archivo (opcional)
 */
export function downloadReportAsCSV(report: TaskReport, filename?: string): void {
  const csvContent = convertReportToCSV(report);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename || `reporte-tareas-${report.workspaceName}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
