// src/scripts/tooltip.ts
export interface TooltipOptions {
  tooltipId: string;
  trigger: 'hover' | 'click' | 'focus';
  show?: boolean;
}

function queryTooltip(id: string) {
  return document.getElementById(id);
}

export function initTooltip(opts: TooltipOptions) {
  const { tooltipId, trigger, show = false } = opts;
  const triggerElement = document.querySelector(`[aria-describedby="${tooltipId}"]`);
  const tooltip = queryTooltip(tooltipId);
  if (!triggerElement || !tooltip) return;

  let isVisible = show;
  let timeoutId: number | undefined;

  function showTooltip() {
    if (isVisible) return;
    isVisible = true;
    if (!tooltip) return;
    tooltip.classList.remove('opacity-0', 'pointer-events-none');
    tooltip.classList.add('opacity-100', 'pointer-events-auto');
  }

  function hideTooltip() {
    if (!isVisible) return;
    isVisible = false;
    if (!tooltip) return;
    tooltip.classList.remove('opacity-100', 'pointer-events-auto');
    tooltip.classList.add('opacity-0', 'pointer-events-none');
  }

  if (trigger === 'hover') {
    triggerElement.addEventListener('mouseenter', () => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(showTooltip, 300);
    });
    triggerElement.addEventListener('mouseleave', () => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(hideTooltip, 300);
    });
    tooltip.addEventListener('mouseenter', () => clearTimeout(timeoutId));
    tooltip.addEventListener('mouseleave', () => { timeoutId = window.setTimeout(hideTooltip, 300); });
  } else if (trigger === 'click') {
    triggerElement.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isVisible) hideTooltip(); else showTooltip();
    });
    document.addEventListener('click', (e) => {
      if (!(triggerElement as Element).contains(e.target as Node) && !tooltip.contains(e.target as Node)) {
        hideTooltip();
      }
    });
  } else if (trigger === 'focus') {
    triggerElement.addEventListener('focus', showTooltip);
    triggerElement.addEventListener('blur', hideTooltip);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isVisible) hideTooltip();
  });
}

export default initTooltip;
