import { useEffect, useRef } from 'react';

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

export default function useDialogFocus({ onDismiss, dismissDisabled = false } = {}) {
  const dialogRef = useRef(null);
  const dismissRef = useRef(onDismiss);
  const disabledRef = useRef(dismissDisabled);
  dismissRef.current = onDismiss;
  disabledRef.current = dismissDisabled;

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const dialog = dialogRef.current;
    const focusable = () => [...(dialog?.querySelectorAll(FOCUSABLE) || [])];
    const frame = requestAnimationFrame(() => {
      (dialog?.querySelector('[data-initial-focus]') || focusable()[0] || dialog)?.focus?.();
    });
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !disabledRef.current) {
        event.preventDefault();
        dismissRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return event.preventDefault();
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, []);

  return dialogRef;
}
