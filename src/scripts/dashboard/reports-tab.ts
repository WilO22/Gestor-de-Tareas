import { setStorageItem, getStorageItem } from '../../utils/storage.utils';

let currentReport: any = null;
const CACHE_KEY = 'workspace-reports-cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCacheKey(workspaceId: string, filters: any): string {
  return `${CACHE_KEY}-${workspaceId}-${JSON.stringify(filters)}`;
}

function getCachedReport(workspaceId: string, filters: any): any {
  const cacheKey = getCacheKey(workspaceId, filters);
  const cached = getStorageItem(cacheKey) as any;
  if (cached && cached.timestamp) {
    const age = Date.now() - cached.timestamp;
    if (age < CACHE_DURATION) return cached.data;
    localStorage.removeItem(cacheKey);
  }
  return null;
}

function saveReportToCache(workspaceId: string, filters: any, report: any): void {
  const cacheKey = getCacheKey(workspaceId, filters);
  const cacheData = { data: report, timestamp: Date.now(), filters };
  setStorageItem(cacheKey, cacheData);
}

function showReportLoading() {
  const resultsDiv = document.getElementById('report-results');
  if (resultsDiv) {
    resultsDiv.innerHTML = `
      <div class="text-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p class="text-gray-600">Generando reporte...</p>
      </div>
    `;
  }
}

function showReportError(message: string) {
  const resultsDiv = document.getElementById('report-results');
  if (resultsDiv) {
    resultsDiv.innerHTML = `
      <div class="text-center py-8">
        <div class="text-red-500">
          <p>${message}</p>
        </div>
      </div>
    `;
  }
}

function displayReportResults(report: any) {
  const resultsDiv = document.getElementById('report-results');
  if (!resultsDiv) return;
  void report; // evitar warning si report no se usa en el placeholder
  resultsDiv.innerHTML = `...`;
}

function downloadReportAsCSV(report: any) {
  if (!report || !report.tasks) throw new Error('No hay datos para descargar');
  const headers = ['ID', 'Título', 'Estado', 'Asignado a', 'Fecha de creación', 'Archivado'];
  const csvContent = [headers.join(','), ...report.tasks.map((task: any) => [task.id, `"${task.title}"`, task.status, `"${task.assignedTo || ''}"`, task.createdAt ? new Date(task.createdAt).toLocaleDateString() : '', task.archived ? 'Sí' : 'No'].join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `reporte-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function generateMockReport(workspaceId: string, _filters: any = {}): Promise<any> {
  void workspaceId;
  await new Promise(resolve => setTimeout(resolve, 500));
  const mockTasks = [
    { id: '1', title: 'Tarea A', status: 'completed', assignedTo: 'A', createdAt: Date.now() - 7*24*60*60*1000, archived: false },
    { id: '2', title: 'Tarea B', status: 'in_progress', assignedTo: 'B', createdAt: Date.now() - 3*24*60*60*1000, archived: false }
  ];
  return { totalTasks: mockTasks.length, completedTasks: mockTasks.filter(t=>t.status==='completed').length, inProgressTasks: mockTasks.filter(t=>t.status==='in_progress').length, tasks: mockTasks };
}

function loadWorkspaceReports(_workspaceId: string) {
  // placeholder
  void _workspaceId;
}

export default function initReportsTab() {
  // Attach buttons
  const genBtn = document.getElementById('generate-report-btn');
  const downloadBtn = document.getElementById('download-report-btn');
  if (genBtn) genBtn.addEventListener('click', () => generateReportForCurrentWorkspace());
  if (downloadBtn) downloadBtn.addEventListener('click', () => downloadReportAsCSV(currentReport));

  (window as any).ReportsTab = { generateReport: (workspaceId: string, filters = {}) => generateReport(workspaceId, filters), downloadReportCSV: () => downloadReportAsCSV(currentReport), loadWorkspaceReports };
}

async function generateReport(workspaceId: string, filters: any = {}) {
  try {
    const cached = getCachedReport(workspaceId, filters);
    if (cached) { displayReportResults(cached); return; }
    showReportLoading();
    const report = await generateMockReport(workspaceId, filters);
    currentReport = report;
    saveReportToCache(workspaceId, filters, report);
    displayReportResults(report);
  } catch (e) { console.error('Error generating report', e); showReportError('Error al generar el reporte'); }
}

function generateReportForCurrentWorkspace() {
  const el = document.getElementById('workspace-id-input') as HTMLInputElement | null;
  const workspaceId = el?.value || (window as any).CURRENT_WORKSPACE_ID;
  if (!workspaceId) { alert('Workspace desconocido'); return; }
  generateReport(workspaceId, {});
}
