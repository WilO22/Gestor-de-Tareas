import type { APIRoute } from 'astro';
import { generateTaskReport, convertReportToCSV } from '../../firebase/reports';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { workspaceId, boardId, startDate, endDate, includeArchived, format } = body;

    // Validaciones
    if (!workspaceId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'workspaceId requerido' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const params = {
      workspaceId,
      boardId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      includeArchived: includeArchived || false
    };

    const report = await generateTaskReport(params);

    if (format === 'csv') {
      const csv = convertReportToCSV(report);
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="reporte-${report.workspaceName}.csv"`
        }
      });
    } else {
      return new Response(JSON.stringify({ 
        success: true, 
        report 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Error generando reporte:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Error interno del servidor' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};