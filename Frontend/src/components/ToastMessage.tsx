import { CheckCircle2, XCircle } from 'lucide-react';
import { createPortal } from 'react-dom';

export function ToastMessage({ tone, text }: { tone: 'success' | 'error'; text: string }) {
  const Icon = tone === 'success' ? CheckCircle2 : XCircle;
  return createPortal(
    <div className={`action-message ${tone}`} role={tone === 'error' ? 'alert' : 'status'} aria-live="polite">
      <span className="action-message-icon"><Icon size={22} /></span>
      <span>{text}</span>
    </div>,
    document.body,
  );
}
