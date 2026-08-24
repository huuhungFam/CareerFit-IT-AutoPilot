import { CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

export function ToastMessage({ tone, text }: { tone: 'success' | 'error' | 'info' | 'warning'; text: string }) {
  const toastId = `${tone}:${text}`;
  const [dismissedToastId, setDismissedToastId] = useState<string | null>(null);
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'error' ? XCircle : tone === 'warning' ? TriangleAlert : Info;

  useEffect(() => {
    const timer = window.setTimeout(() => setDismissedToastId(toastId), tone === 'error' ? 10_000 : 5_000);
    return () => window.clearTimeout(timer);
  }, [toastId, tone]);

  if (dismissedToastId === toastId) return null;
  return createPortal(
    <div className={`action-message ${tone}`} role={tone === 'error' ? 'alert' : 'status'} aria-live={tone === 'error' ? 'assertive' : 'polite'}>
      <span className="action-message-icon"><Icon size={22} /></span>
      <span>{text}</span>
      <button className="toast-dismiss" type="button" aria-label="Đóng thông báo" title="Đóng thông báo" onClick={() => setDismissedToastId(toastId)}><X size={18} /></button>
    </div>,
    document.body,
  );
}
