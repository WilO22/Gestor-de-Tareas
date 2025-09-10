// src/scripts/toast.ts
// Script procesado por Astro (TypeScript). Externamente importado en Toast.astro

interface ToastOptions {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  persistent?: boolean;
}

function showToast(options: ToastOptions | string) {
  const config: ToastOptions = typeof options === 'string'
    ? { message: options, type: 'info' }
    : { type: 'info', duration: 4000, persistent: false, ...options };

  const container = document.getElementById('toast-container');
  const overlay = document.getElementById('toast-overlay');
  const system = document.getElementById('toast-system');
  
  if (!container || !overlay || !system) {
    console.warn('Toast system not found');
    return;
  }

  system.style.pointerEvents = 'auto';
  overlay.classList.remove('opacity-0');
  overlay.classList.add('opacity-100');

  const toast = document.createElement('div');
  toast.className = 'toast-enter pointer-events-auto';

  const typeConfig: Record<'success'|'error'|'warning'|'info', any> = {
    success: {
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      iconColor: 'text-green-500',
      textColor: 'text-green-800',
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>`
    },
    error: {
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-500',
      textColor: 'text-red-800',
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>`
    },
    warning: {
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      iconColor: 'text-yellow-500',
      textColor: 'text-yellow-800',
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path>`
    },
    info: {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-500',
      textColor: 'text-blue-800',
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>`
    }
  } as const;

  const typeKey = (config.type || 'info') as 'success'|'error'|'warning'|'info';
  const typeStyle = typeConfig[typeKey] || typeConfig.info;

  toast.innerHTML = `
    <div class="mx-auto max-w-lg ${typeStyle.bgColor} ${typeStyle.borderColor} border-2 rounded-xl shadow-2xl overflow-hidden">
      <div class="p-6">
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <div class="w-10 h-10 ${typeStyle.bgColor} rounded-full flex items-center justify-center border-2 ${typeStyle.borderColor}">
              <svg class="w-6 h-6 ${typeStyle.iconColor}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                ${typeStyle.icon}
              </svg>
            </div>
          </div>
          <div class="ml-4 flex-1">
            <p class="text-sm font-semibold ${typeStyle.textColor} leading-6">
              ${config.message}
            </p>
          </div>
          ${!config.persistent ? `
            <div class="ml-4 flex-shrink-0">
              <button onclick="removeToast(this.closest('.toast-enter, .toast-show'))" class="rounded-md ${typeStyle.bgColor} ${typeStyle.textColor} hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-green-50 focus:ring-green-600 p-1.5">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('toast-enter');
    toast.classList.add('toast-show');
  });

  if (!config.persistent) {
    setTimeout(() => removeToast(toast), config.duration);
  }

  overlay.onclick = () => {
    const toasts = container.querySelectorAll('.toast-show');
    toasts.forEach(t => removeToast(t as HTMLElement));
  };
}

function removeToast(toast: HTMLElement | null) {
  if (!toast) return;

  toast.classList.remove('toast-show');
  toast.classList.add('toast-exit');

  setTimeout(() => {
    toast.remove();

    const container = document.getElementById('toast-container');
    const overlay = document.getElementById('toast-overlay');
    const system = document.getElementById('toast-system');

    if (container && overlay && system && container.children.length === 0) {
      overlay.classList.remove('opacity-100');
      overlay.classList.add('opacity-0');

      setTimeout(() => {
        system.style.pointerEvents = 'none';
      }, 300);
    }
  }, 200);
}

// Exponer globalmente
(window as any).showToast = showToast;
(window as any).removeToast = removeToast;
