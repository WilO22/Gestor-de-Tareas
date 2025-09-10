// src/scripts/modal.ts
export interface ModalOptions {
  closeOnOverlay?: boolean;
  closeOnEscape?: boolean;
  animation?: string;
  animationDuration?: number;
}

function safeGet(id: string) {
  return document.getElementById(id);
}

export function openModal(modalId: string) {
  const overlay = safeGet(`${modalId}-overlay`);
  const modal = safeGet(modalId) as HTMLElement | null;
  if (!overlay || !modal) return;

  overlay.classList.remove('hidden');
  // force reflow
  // @ts-ignore
  void overlay.offsetHeight;

  overlay.classList.remove('opacity-0');
  modal.classList.remove('opacity-0');
  modal.classList.add('opacity-100', 'scale-100', 'translate-y-0', 'translate-x-0');
  modal.focus?.();
  document.body.style.overflow = 'hidden';
}

export function closeModal(modalId: string, animationDuration = 300) {
  const overlay = safeGet(`${modalId}-overlay`);
  const modal = safeGet(modalId) as HTMLElement | null;
  if (!overlay || !modal) return;

  overlay.classList.add('opacity-0');
  modal.classList.remove('opacity-100', 'scale-100', 'translate-y-0', 'translate-x-0');
  modal.classList.add('opacity-0');

  window.setTimeout(() => {
    overlay.classList.add('hidden');
    document.body.style.overflow = 'auto';
  }, animationDuration);
}

export function toggleModal(modalId: string) {
  const overlay = safeGet(`${modalId}-overlay`);
  if (!overlay) return;
  if (overlay.classList.contains('hidden')) {
    openModal(modalId);
  } else {
    closeModal(modalId);
  }
}

export function initModal(modalId: string, opts: ModalOptions = {}) {
  const { closeOnOverlay = true, closeOnEscape = true, animationDuration = 300 } = opts;

  const overlay = safeGet(`${modalId}-overlay`);
  const modal = safeGet(modalId) as HTMLElement | null;
  if (!overlay || !modal) return;

  // Close buttons
  const closeButtons = overlay.querySelectorAll('.modal-close-btn');
  closeButtons.forEach(btn => btn.addEventListener('click', () => closeModal(modalId, animationDuration)));

  if (closeOnOverlay) {
    overlay.addEventListener('click', (_e: Event) => {
      const ev = _e as MouseEvent;
      if (ev.target === overlay) closeModal(modalId, animationDuration);
    });
  }

  if (closeOnEscape) {
    document.addEventListener('keydown', (_e: KeyboardEvent) => {
      if (_e.key === 'Escape' && !overlay.classList.contains('hidden')) {
        closeModal(modalId, animationDuration);
      }
    });
  }

  const actionButtons = overlay.querySelectorAll('[data-action]');
  actionButtons.forEach(btn => {
    btn.addEventListener('click', (_e: Event) => {
      const el = btn as HTMLElement;
      const action = el.dataset.action;
      if (action === 'close') closeModal(modalId, animationDuration);
      else if (action === 'confirm') {
        const event = new CustomEvent('modal-confirm', { detail: { modalId, button: btn } });
        document.dispatchEvent(event);
      }
    });
  });

  // expose helpers
  (window as any)[`openModal_${modalId}`] = () => openModal(modalId);
  (window as any)[`closeModal_${modalId}`] = () => closeModal(modalId, animationDuration);
  (window as any)[`toggleModal_${modalId}`] = () => toggleModal(modalId);

  if (!(window as any).openModal) {
    (window as any).openModal = openModal;
    (window as any).closeModal = closeModal;
    (window as any).toggleModal = toggleModal;
  }
}

export default initModal;
