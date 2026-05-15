import type { MatchLabel } from '../types';
import { useLanguage } from '../i18n/LanguageProvider';

export function MatchingBadge({ score, label }: { score: number; label: MatchLabel }) {
  return (
    <span className={`match-badge ${label.toLowerCase()}`}>
      {score}% · {label}
    </span>
  );
}

export function PotentialBadge() {
  const { t } = useLanguage();
  return <span className="potential-badge">{t('potential')}</span>;
}

export function ReasonChips({ reasons }: { reasons: string[] }) {
  return (
    <div className="chips">
      {reasons.map((reason) => (
        <span key={reason}>{reason}</span>
      ))}
    </div>
  );
}
