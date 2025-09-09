// src/utils/dom.utils.ts
// Utilidades para manipulación del DOM

/**
 * Obtiene las coordenadas de un elemento
 */
export function getElementPosition(element: HTMLElement): { x: number; y: number; width: number; height: number } {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + window.scrollX,
    y: rect.top + window.scrollY,
    width: rect.width,
    height: rect.height
  };
}

/**
 * Verifica si un elemento está visible en el viewport
 */
export function isElementInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Hace scroll suave hacia un elemento
 */
export function scrollToElement(element: HTMLElement, offset: number = 0): void {
  const elementPosition = element.offsetTop - offset;
  window.scrollTo({
    top: elementPosition,
    behavior: 'smooth'
  });
}

/**
 * Copia texto al portapapeles
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback para navegadores que no soportan Clipboard API.
      // Intentamos usar un textarea temporal y execCommand como último recurso.
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        // execCommand está deprecado pero es un fallback en navegadores antiguos.
        // @ts-ignore: Legacy API fallback
        const success = document.execCommand && document.execCommand('copy');
        textArea.remove();
        return !!success;
      } catch (e) {
        textArea.remove();
        return false;
      }
    }
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    return false;
  }
}

/**
 * Debounce para optimizar llamadas frecuentes
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), wait);
  };
}

/**
 * Throttle para limitar la frecuencia de ejecución
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Añade event listener con cleanup automático
 */
export function addEventListenerWithCleanup(
  element: Element | Window | Document,
  event: string,
  handler: EventListener,
  options?: boolean | AddEventListenerOptions
): () => void {
  element.addEventListener(event, handler, options);
  
  return () => {
    element.removeEventListener(event, handler, options);
  };
}

/**
 * Obtiene datos de un elemento usando data attributes
 */
export function getElementData(element: HTMLElement, key: string): string | null {
  return element.dataset[key] || null;
}

/**
 * Establece datos en un elemento usando data attributes
 */
export function setElementData(element: HTMLElement, key: string, value: string): void {
  element.dataset[key] = value;
}

/**
 * Encuentra el elemento padre más cercano que coincida con un selector
 */
export function findClosestParent(element: HTMLElement, selector: string): HTMLElement | null {
  return element.closest(selector) as HTMLElement | null;
}

/**
 * Crea un elemento con atributos y contenido
 */
export function createElement(
  tag: string,
  attributes: Record<string, string> = {},
  content: string = ''
): HTMLElement {
  const element = document.createElement(tag);
  
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  
  if (content) {
    element.innerHTML = content;
  }
  
  return element;
}

/**
 * Remueve todos los event listeners de un elemento
 */
export function removeAllEventListeners(element: HTMLElement): HTMLElement {
  const newElement = element.cloneNode(true) as HTMLElement;
  element.parentNode?.replaceChild(newElement, element);
  return newElement;
}

/**
 * Detecta clics fuera de un elemento
 */
export function onClickOutside(
  element: HTMLElement,
  callback: () => void
): () => void {
  const handleClick = (event: Event) => {
    if (!element.contains(event.target as Node)) {
      callback();
    }
  };
  
  document.addEventListener('click', handleClick);
  
  return () => {
    document.removeEventListener('click', handleClick);
  };
}
