// src/scripts/shared/spa-navigation.ts
// Sistema de navegación SPA para Astro puro usando View Transitions API

interface NavigationOptions {
  replace?: boolean;
  scroll?: boolean;
}

class SPANavigation {
  private currentPath: string;
  private isNavigating: boolean = false;

  constructor() {
    this.currentPath = window.location.pathname;
    this.init();
  }

  private init() {
    // Interceptar clicks en enlaces internos con un delay mayor para asegurar que otros scripts se inicialicen primero
    setTimeout(() => {
      document.addEventListener('click', this.handleLinkClick.bind(this), { passive: false });
    }, 200); // Aumentado de 100ms a 200ms

    // Manejar navegación del navegador (atrás/adelante)
    window.addEventListener('popstate', this.handlePopState.bind(this));

    console.log('🚀 SPA Navigation initialized with View Transitions (delayed 200ms)');
  }

  private handleLinkClick(event: Event) {
    const target = event.target as HTMLElement;
    const link = target.closest('a') as HTMLAnchorElement;

    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    // Solo interceptar enlaces internos (que empiecen con /)
    if (!href.startsWith('/')) return;

    // No interceptar enlaces externos o con target="_blank"
    if (link.target === '_blank' || link.rel === 'external') return;

    // NO interceptar navegación desde dashboard - dejar que el sidebar la maneje
    if (window.location.pathname === '/dashboard') {
      console.log('🚫 SPA Navigation: No interceptar desde dashboard, dejar que sidebar maneje:', href);
      return;
    }

    // NO interceptar enlaces con data-action (son manejados por el sidebar)
    if (link.hasAttribute('data-action')) {
      console.log('🚫 SPA Navigation: No interceptar enlace con data-action:', href);
      return;
    }

    // NO interceptar enlaces que apunten a páginas eliminadas
    if (href.includes('/workspace/') && href.includes('/members')) {
      console.log('🚫 SPA Navigation: No interceptar enlace a página de miembros eliminada:', href);
      // Dejar que el navegador maneje la redirección automática
      return;
    }

    // Interceptar navegación entre workspaces del mismo tipo (cuando NO estamos en dashboard)
    const currentWorkspaceMatch = this.currentPath.match(/^\/workspace\/([^\/]+)\/(boards|members|settings)$/);
    const targetWorkspaceMatch = href.match(/^\/workspace\/([^\/]+)\/(boards|members|settings)$/);

    if (currentWorkspaceMatch && targetWorkspaceMatch) {
      const currentWorkspace = currentWorkspaceMatch[1];
      const targetWorkspace = targetWorkspaceMatch[1];

      // Si es el mismo workspace (cambio de sección), usar navegación SPA
      if (currentWorkspace === targetWorkspace) {
        event.preventDefault();
        this.navigate(href);
        return;
      }
    }

    // Para otros casos (navegación a páginas que no son workspace), usar navegación normal
    // Esto permitirá que Astro maneje la transición correctamente
  }

  private handlePopState(event: PopStateEvent) {
    const path = window.location.pathname;
    if (path !== this.currentPath) {
      // Para navegación del navegador, recargar la página
      window.location.reload();
    }
  }

  public async navigate(path: string, options: NavigationOptions = {}) {
    if (this.isNavigating) return;

    if (path === this.currentPath) return;

    this.isNavigating = true;

    try {
      console.log('📡 SPA Navigation to:', path);

      // Usar View Transitions API si está disponible
      if ('startViewTransition' in document) {
        await this.navigateWithViewTransition(path, options);
      } else {
        await this.navigateWithoutViewTransition(path, options);
      }

    } catch (error) {
      console.error('❌ Navigation error:', error);
      // Fallback a navegación normal si falla
      window.location.href = path;
    } finally {
      this.isNavigating = false;
    }
  }

  private async navigateWithViewTransition(path: string, options: NavigationOptions) {
    const transition = (document as any).startViewTransition(async () => {
      await this.loadContent(path);
      this.updateURL(path, options.replace);
      this.currentPath = path;
    });

    await transition.finished;

    if (options.scroll !== false) {
      window.scrollTo(0, 0);
    }
  }

  private async navigateWithoutViewTransition(path: string, options: NavigationOptions) {
    await this.loadContent(path);
    this.updateURL(path, options.replace);
    this.currentPath = path;

    if (options.scroll !== false) {
      window.scrollTo(0, 0);
    }
  }

  private async loadContent(path: string) {
    try {
      console.log('📡 Loading content for:', path);

      // Mostrar indicador de carga
      this.showLoadingIndicator();

      // Hacer fetch de la página
      const response = await fetch(path, {
        headers: {
          'Accept': 'text/html',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();

      // Parsear el HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Actualizar solo el contenido principal, manteniendo el sidebar
      await this.updatePageContent(doc, path);

      console.log('✅ Content loaded successfully');

    } catch (error) {
      console.error('❌ Error loading content:', error);
      throw error;
    } finally {
      this.hideLoadingIndicator();
    }
  }

  private async updatePageContent(doc: Document, path: string) {
    // Actualizar el título de la página
    const newTitle = doc.querySelector('title')?.textContent;
    if (newTitle) {
      document.title = newTitle;
    }

    // Encontrar el contenedor principal de contenido (excluyendo sidebar)
    const currentMain = document.querySelector('#app-container > .flex-1');
    const newMain = doc.querySelector('#app-container > .flex-1');

    if (currentMain && newMain) {
      // Reemplazar solo el contenido principal
      currentMain.innerHTML = newMain.innerHTML;

      // Re-ejecutar scripts si es necesario
      await this.reinitializeScripts(path);
    } else {
      // Fallback: recargar la página completa
      console.warn('⚠️ Could not find main container, falling back to full page reload');
      window.location.href = path;
    }
  }

  private async reinitializeScripts(path: string) {
    // Re-inicializar scripts específicos según la página
    if (path.includes('/boards')) {
      // Importar y ejecutar el script de boards
      try {
        // Obtener workspaceId de la URL
        const urlParts = path.split('/');
        const workspaceId = urlParts[urlParts.length - 2]; // /workspace/[workspaceId]/boards

        if (workspaceId) {
          const { initBoardGrid } = await import('@/scripts/shared/board-grid');
          if (typeof initBoardGrid === 'function') {
            initBoardGrid('boards-grid', workspaceId, true, false);
          }
        }
      } catch (error) {
        console.error('❌ Error reinitializing boards view:', error);
      }
    }

    // Re-inicializar sidebar si es necesario
    const sidebarIsland = (window as any).sidebarIsland;
    if (sidebarIsland?.renderWorkspaces) {
      // Forzar actualización de la selección visual
      setTimeout(() => {
        const detectCurrentSelection = sidebarIsland.detectCurrentSelection;
        if (typeof detectCurrentSelection === 'function') {
          detectCurrentSelection();
        }
      }, 100);
    }
  }

  private updateURL(path: string, replace: boolean = false) {
    const url = window.location.origin + path;

    if (replace) {
      window.history.replaceState({ path }, '', url);
    } else {
      window.history.pushState({ path }, '', url);
    }
  }

  private showLoadingIndicator() {
    let indicator = document.getElementById('spa-loading-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'spa-loading-indicator';
      indicator.className = 'fixed top-0 left-0 w-full h-1 bg-blue-600 z-50 transition-all duration-300';
      indicator.innerHTML = '<div class="h-full bg-blue-400 animate-pulse"></div>';
      document.body.appendChild(indicator);
    }
    indicator.style.display = 'block';
    indicator.style.transform = 'translateX(-100%)';
    setTimeout(() => {
      if (indicator) {
        indicator.style.transform = 'translateX(0%)';
      }
    }, 50);
  }

  private hideLoadingIndicator() {
    const indicator = document.getElementById('spa-loading-indicator');
    if (indicator) {
      indicator.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (indicator) {
          indicator.style.display = 'none';
        }
      }, 300);
    }
  }
}

// Inicializar navegación SPA cuando el DOM esté listo
let spaNavigation: SPANavigation | undefined;

function initializeSPANavigation() {
  if (!spaNavigation) {
    spaNavigation = new SPANavigation();
  }

  // Asegurar que esté disponible globalmente
  (window as any).spaNavigation = spaNavigation;

  return spaNavigation;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSPANavigation);
} else {
  initializeSPANavigation();
}

// Asegurar que esté disponible globalmente incluso si ya se inicializó
if (!spaNavigation) {
  initializeSPANavigation();
}

export default spaNavigation;