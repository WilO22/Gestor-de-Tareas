// src/scripts/performance-comparison.ts
// Script para comparar performance entre dashboard original y Server Islands

interface PerformanceMetrics {
  timeToFirstByte: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  totalBlockingTime: number;
  jsBundle: {
    size: number;
    loadTime: number;
  };
  serverRenderTime: number;
  hydrationTime: number;
  interactiveTime: number;
}

interface DashboardComparison {
  original: PerformanceMetrics;
  serverIslands: PerformanceMetrics;
  improvements: {
    [key: string]: {
      value: number;
      percentage: number;
      unit: string;
    };
  };
}

class PerformanceAnalyzer {
  private startTime: number = performance.now();
  private metrics: Partial<PerformanceMetrics> = {};
  private observer: PerformanceObserver | null = null;

  constructor() {
    this.setupPerformanceObserver();
    this.measureInitialMetrics();
  }

  private setupPerformanceObserver() {
    if ('PerformanceObserver' in window) {
      this.observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry) => {
          switch (entry.entryType) {
            case 'paint':
              if (entry.name === 'first-contentful-paint') {
                this.metrics.firstContentfulPaint = entry.startTime;
              }
              break;
            
            case 'largest-contentful-paint':
              this.metrics.largestContentfulPaint = entry.startTime;
              break;
            
            case 'layout-shift':
              if (!this.metrics.cumulativeLayoutShift) {
                this.metrics.cumulativeLayoutShift = 0;
              }
              this.metrics.cumulativeLayoutShift += (entry as any).value;
              break;
            
            case 'first-input':
              this.metrics.firstInputDelay = (entry as any).processingStart - entry.startTime;
              break;
          }
        });
      });

      try {
        this.observer.observe({
          entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift', 'first-input']
        });
      } catch (error) {
        console.warn('Performance Observer not fully supported:', error);
      }
    }
  }

  private measureInitialMetrics() {
    // Medir TTFB (Time to First Byte)
    const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigationTiming) {
      this.metrics.timeToFirstByte = navigationTiming.responseStart - navigationTiming.requestStart;
      this.metrics.serverRenderTime = navigationTiming.responseEnd - navigationTiming.responseStart;
    }

    // Medir tamaño del bundle JS
    this.measureJSBundle();
  }

  private async measureJSBundle() {
    const scriptElements = document.querySelectorAll('script[src]');
    let totalSize = 0;
    let totalLoadTime = 0;

    for (const script of scriptElements) {
      const src = (script as HTMLScriptElement).src;
      if (src && !src.includes('node_modules') && !src.includes('cdn')) {
        try {
          const response = await fetch(src, { method: 'HEAD' });
          const size = parseInt(response.headers.get('content-length') || '0');
          totalSize += size;
        } catch (error) {
          console.warn('Could not measure script size:', src);
        }
      }
    }

    this.metrics.jsBundle = {
      size: totalSize,
      loadTime: totalLoadTime
    };
  }

  public measureHydrationTime() {
  const hydrationStart = performance.now();
  void hydrationStart;
    
    // Simular tiempo de hidratación basado en componentes interactivos
    const interactiveElements = document.querySelectorAll('[data-interactive], button, input, select, textarea');
    const estimatedHydrationTime = interactiveElements.length * 2; // 2ms por elemento interactivo
    
    this.metrics.hydrationTime = estimatedHydrationTime;
    return estimatedHydrationTime;
  }

  public measureInteractiveTime() {
    // Tiempo hasta que la página es completamente interactiva
    const interactiveTime = performance.now() - this.startTime;
    this.metrics.interactiveTime = interactiveTime;
    return interactiveTime;
  }

  public getMetrics(): PerformanceMetrics {
    return {
      timeToFirstByte: this.metrics.timeToFirstByte || 0,
      firstContentfulPaint: this.metrics.firstContentfulPaint || 0,
      largestContentfulPaint: this.metrics.largestContentfulPaint || 0,
      cumulativeLayoutShift: this.metrics.cumulativeLayoutShift || 0,
      firstInputDelay: this.metrics.firstInputDelay || 0,
      totalBlockingTime: this.calculateTotalBlockingTime(),
      jsBundle: this.metrics.jsBundle || { size: 0, loadTime: 0 },
      serverRenderTime: this.metrics.serverRenderTime || 0,
      hydrationTime: this.metrics.hydrationTime || 0,
      interactiveTime: this.metrics.interactiveTime || 0
    };
  }

  private calculateTotalBlockingTime(): number {
    // Calcular TBT basado en tareas largas
    const longTasks = performance.getEntriesByType('longtask');
    let totalBlockingTime = 0;

    longTasks.forEach(task => {
      if (task.duration > 50) {
        totalBlockingTime += task.duration - 50;
      }
    });

    return totalBlockingTime;
  }

  public cleanup() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

class DashboardPerformanceComparator {
  private readonly STORAGE_KEY = 'dashboard-performance-metrics';
  private analyzer: PerformanceAnalyzer;

  constructor() {
    this.analyzer = new PerformanceAnalyzer();
    this.startMeasuring();
  }

  private startMeasuring() {
    // Medir cuando la página está completamente cargada
    if (document.readyState === 'complete') {
      this.measureComplete();
    } else {
      window.addEventListener('load', () => this.measureComplete());
    }

    // Medir tiempo de interactividad
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        this.analyzer.measureInteractiveTime();
      }, 100);
    });
  }

  private measureComplete() {
    setTimeout(() => {
      this.analyzer.measureHydrationTime();
      const metrics = this.analyzer.getMetrics();
      this.saveMetrics(metrics);
      this.displayResults();
    }, 1000); // Esperar 1 segundo para mediciones estables
  }

  private saveMetrics(metrics: PerformanceMetrics) {
    const isServerIslands = window.location.pathname.includes('islands') || 
                           document.querySelector('.server-island') !== null;
    
    const key = isServerIslands ? 'serverIslands' : 'original';
    const stored = localStorage.getItem(this.STORAGE_KEY);
    const data = stored ? JSON.parse(stored) : {};
    
    data[key] = metrics;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    
    console.log(`📊 Performance metrics saved for ${key}:`, metrics);
  }

  public getComparison(): DashboardComparison | null {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return null;

    const data = JSON.parse(stored);
    if (!data.original || !data.serverIslands) return null;

    const improvements: any = {};
    
    // Calcular mejoras para cada métrica
    Object.keys(data.original).forEach(key => {
      if (typeof data.original[key] === 'number' && typeof data.serverIslands[key] === 'number') {
        const original = data.original[key];
        const serverIslands = data.serverIslands[key];
        const improvement = original - serverIslands;
        const percentage = original > 0 ? (improvement / original) * 100 : 0;
        
        improvements[key] = {
          value: improvement,
          percentage: percentage,
          unit: this.getMetricUnit(key)
        };
      }
    });

    // Manejar métricas anidadas (jsBundle)
    if (data.original.jsBundle && data.serverIslands.jsBundle) {
      const sizeImprovement = data.original.jsBundle.size - data.serverIslands.jsBundle.size;
      const sizePercentage = data.original.jsBundle.size > 0 ? 
        (sizeImprovement / data.original.jsBundle.size) * 100 : 0;
      
      improvements.bundleSize = {
        value: sizeImprovement,
        percentage: sizePercentage,
        unit: 'bytes'
      };
    }

    return {
      original: data.original,
      serverIslands: data.serverIslands,
      improvements
    };
  }

  private getMetricUnit(metric: string): string {
    const units: { [key: string]: string } = {
      timeToFirstByte: 'ms',
      firstContentfulPaint: 'ms',
      largestContentfulPaint: 'ms',
      cumulativeLayoutShift: 'score',
      firstInputDelay: 'ms',
      totalBlockingTime: 'ms',
      serverRenderTime: 'ms',
      hydrationTime: 'ms',
      interactiveTime: 'ms'
    };
    return units[metric] || 'unit';
  }

  public displayResults() {
    const comparison = this.getComparison();
    if (!comparison) {
      console.log('📊 Performance: Necesitas métricas de ambas versiones para comparar');
      return;
    }

    console.group('📊 Dashboard Performance Comparison');
    
    console.log('🔵 Original Dashboard:', comparison.original);
    console.log('🟢 Server Islands Dashboard:', comparison.serverIslands);
    
    console.group('✨ Improvements');
    Object.entries(comparison.improvements).forEach(([key, improvement]) => {
      const sign = improvement.value >= 0 ? '+' : '';
      const color = improvement.value >= 0 ? '🟢' : '🔴';
      console.log(
        `${color} ${key}: ${sign}${improvement.value.toFixed(2)} ${improvement.unit} (${improvement.percentage.toFixed(1)}%)`
      );
    });
    console.groupEnd();
    
    console.groupEnd();

    // Mostrar resumen visual en la página
    this.showVisualSummary(comparison);
  }

  private showVisualSummary(comparison: DashboardComparison) {
    // Crear elemento de resumen visual
    const summaryElement = document.createElement('div');
    summaryElement.id = 'performance-summary';
    summaryElement.className = 'fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm z-50';
    summaryElement.style.display = 'none';

    const keyMetrics = [
      'firstContentfulPaint',
      'largestContentfulPaint',
      'hydrationTime',
      'bundleSize'
    ];

    let summaryHTML = `
      <div class="flex items-center justify-between mb-2">
        <h4 class="font-semibold text-gray-800">Performance</h4>
        <button onclick="this.parentElement.parentElement.style.display='none'" class="text-gray-400 hover:text-gray-600">✕</button>
      </div>
      <div class="space-y-2">
    `;

    keyMetrics.forEach(metric => {
      const improvement = comparison.improvements[metric];
      if (improvement) {
        const isGood = improvement.value >= 0;
        const color = isGood ? 'text-green-600' : 'text-red-600';
        const icon = isGood ? '↓' : '↑';
        
        summaryHTML += `
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">${this.formatMetricName(metric)}</span>
            <span class="${color}">${icon} ${Math.abs(improvement.percentage).toFixed(1)}%</span>
          </div>
        `;
      }
    });

    summaryHTML += `
      </div>
      <button onclick="console.log(window.performanceComparator.getComparison())" class="mt-2 text-xs text-blue-600 hover:text-blue-800">
        Ver detalles en consola
      </button>
    `;

    summaryElement.innerHTML = summaryHTML;
    document.body.appendChild(summaryElement);

    // Mostrar después de un delay
    setTimeout(() => {
      summaryElement.style.display = 'block';
    }, 2000);
  }

  private formatMetricName(metric: string): string {
    const names: { [key: string]: string } = {
      firstContentfulPaint: 'FCP',
      largestContentfulPaint: 'LCP',
      hydrationTime: 'Hydration',
      bundleSize: 'Bundle Size'
    };
    return names[metric] || metric;
  }

  public cleanup() {
    this.analyzer.cleanup();
  }
}

// Inicializar comparador autom e1ticamente y exponerlo de forma segura
let performanceComparator: DashboardPerformanceComparator | null = null;

function initPerformanceComparator() {
  performanceComparator = new DashboardPerformanceComparator();
  // Exponer solo después de la inicialización
  (window as any).performanceComparator = performanceComparator;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPerformanceComparator);
} else {
  initPerformanceComparator();
}

// Cleanup al salir de la p e1gina
window.addEventListener('beforeunload', () => {
  if (performanceComparator) {
    performanceComparator.cleanup();
  }
});

export { PerformanceAnalyzer, DashboardPerformanceComparator };
export type { PerformanceMetrics, DashboardComparison };
