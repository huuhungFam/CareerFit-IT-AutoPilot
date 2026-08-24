import { useEffect } from 'react';
import { LogIn, UserRound } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageProvider';

type LoginRequiredModalProps = {
  onClose: () => void;
  nextPath?: string;
  description?: string;
};

export function LoginRequiredModal({ onClose, nextPath, description }: LoginRequiredModalProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const destination = nextPath ?? `${location.pathname}${location.search}`;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={t('loginRequiredTitle')}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="login-prompt-modal">
        <div>
          <p className="eyebrow">{t('loginRequiredEyebrow')}</p>
          <h2>{t('loginRequiredTitle')}</h2>
          <p>{description ?? t('loginRequiredCopy')}</p>
        </div>
        <div className="filter-modal-actions">
          <button type="button" onClick={onClose}>{t('cancel')}</button>
          <button type="button" onClick={() => navigate(`/register?next=${encodeURIComponent(destination)}`)}>
            <UserRound size={17} />
            {t('register')}
          </button>
          <button className="primary-action" type="button" onClick={() => navigate(`/login?next=${encodeURIComponent(destination)}`)}>
            <LogIn size={17} />
            {t('login')}
          </button>
        </div>
      </section>
    </div>
  );
}
