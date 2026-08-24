import { useEffect } from 'react';

const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function activeModal() {
  const modals = [...document.querySelectorAll<HTMLElement>('.modal-backdrop')];
  return modals[modals.length - 1] ?? null;
}

export function ModalAccessibilityBoundary() {
  useEffect(() => {
    const syncModalState = () => {
      const modal = activeModal();
      if (!modal) {
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        return;
      }

      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${window.innerWidth - document.documentElement.clientWidth}px`;
      const autofocus = modal.querySelector<HTMLElement>('[data-autofocus], button[aria-label*="Đóng"], button[aria-label*="Close"], button, input, select, textarea');
      if (autofocus && !modal.contains(document.activeElement)) autofocus.focus();
    };

    const observer = new MutationObserver(syncModalState);
    observer.observe(document.body, { childList: true, subtree: true });
    syncModalState();

    const onKeyDown = (event: KeyboardEvent) => {
      const modal = activeModal();
      if (!modal) return;

      if (event.key === 'Escape') {
        const dismiss = modal.querySelector<HTMLButtonElement>('[data-modal-close], button[aria-label*="Đóng"], button[aria-label*="Close"], .filter-modal-actions button:first-child');
        dismiss?.click();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = [...modal.querySelectorAll<HTMLElement>(focusableSelector)].filter((element) => !element.hasAttribute('hidden'));
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      observer.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, []);

  return null;
}
