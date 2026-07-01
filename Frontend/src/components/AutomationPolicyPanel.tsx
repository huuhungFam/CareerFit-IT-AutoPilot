import { Clock, Mail, Radar, ShieldCheck } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import type { AutomationPolicy } from '../types';
import { useLanguage } from '../i18n/LanguageProvider';

export function AutomationPolicyPanel({
  policy,
  onUpdate,
  isSaving = false,
}: {
  policy: AutomationPolicy;
  onUpdate?: (patch: Partial<AutomationPolicy>) => void;
  isSaving?: boolean;
}) {
  const { language, t } = useLanguage();

  return (
    <section className="policy-panel">
      <div className="section-heading">
        <p className="eyebrow">{t('automation')}</p>
        <h2>{t('automationTitle')}</h2>
      </div>
      <div className="policy-grid">
        <PolicyItem icon={<ShieldCheck size={20} />} label={t('autoApply')} value={`${policy.autoApplyThreshold}%`} active={policy.autoApplyEnabled} />
        <PolicyItem icon={<Radar size={20} />} label={t('nextScan')} value={localizeNextScan(policy.nextScanAt, language)} active={policy.scanEnabled} />
        <PolicyItem icon={<Mail size={20} />} label={t('highMatchEmail')} value={`${policy.highMatchThreshold}%`} active={policy.emailNotificationsEnabled} />
        <PolicyItem icon={<Clock size={20} />} label={t('quietHours')} value={`${policy.quietHoursStart} - ${policy.quietHoursEnd}`} active={policy.quietHoursEnabled} />
      </div>
      <div className="settings-grid">
        <label>
          {t('autoApply')}
          <input
            checked={policy.autoApplyEnabled}
            disabled={isSaving}
            onChange={(event) => onUpdate?.({ autoApplyEnabled: event.target.checked })}
            type="checkbox"
          />
        </label>
        <label>
          <RangeSetting
            disabled={!policy.autoApplyEnabled}
            label={t('autoApplyThreshold')}
            max={100}
            min={50}
            onCommit={(value) => onUpdate?.({ autoApplyThreshold: value })}
            value={policy.autoApplyThreshold}
          />
        </label>
        <label>
          {t('emailNotifications')}
          <input
            checked={policy.emailNotificationsEnabled}
            disabled={isSaving}
            onChange={(event) => onUpdate?.({ emailNotificationsEnabled: event.target.checked })}
            type="checkbox"
          />
        </label>
        <label>
          {t('highMatchEmail')}
          <input
            checked={policy.highMatchEmailEnabled}
            disabled={isSaving || !policy.emailNotificationsEnabled}
            onChange={(event) => onUpdate?.({ highMatchEmailEnabled: event.target.checked })}
            type="checkbox"
          />
        </label>
        <label>
          <RangeSetting
            label={t('threshold')}
            max={100}
            min={50}
            onCommit={(value) => onUpdate?.({ highMatchThreshold: value })}
            value={policy.highMatchThreshold}
          />
        </label>
        <label>
          {t('dailyDigest')}
          <input
            checked={policy.dailyDigestEnabled}
            disabled={isSaving || !policy.emailNotificationsEnabled}
            onChange={(event) => onUpdate?.({ dailyDigestEnabled: event.target.checked })}
            type="checkbox"
          />
        </label>
        <label>
          {t('emailQuota')}
          <input
            disabled={isSaving || !policy.emailNotificationsEnabled}
            max="20"
            min="1"
            onChange={(event) => onUpdate?.({ maxEmailsPerDay: Number(event.target.value) })}
            type="number"
            value={policy.maxEmailsPerDay}
          />
        </label>
        <label>
          {t('cooldownHours')}
          <input
            disabled={isSaving || !policy.emailNotificationsEnabled}
            max="168"
            min="0"
            onChange={(event) => onUpdate?.({ notificationCooldownHours: Number(event.target.value) })}
            type="number"
            value={policy.notificationCooldownHours}
          />
        </label>
        <label>
          {t('quietHours')}
          <input
            checked={policy.quietHoursEnabled}
            disabled={isSaving || !policy.emailNotificationsEnabled}
            onChange={(event) => onUpdate?.({ quietHoursEnabled: event.target.checked })}
            type="checkbox"
          />
        </label>
        <label>
          {t('quietStarts')}
          <input
            disabled={isSaving || !policy.quietHoursEnabled}
            onChange={(event) => onUpdate?.({ quietHoursStart: event.target.value })}
            type="time"
            value={policy.quietHoursStart}
          />
        </label>
        <label>
          {t('quietEnds')}
          <input
            disabled={isSaving || !policy.quietHoursEnabled}
            onChange={(event) => onUpdate?.({ quietHoursEnd: event.target.value })}
            type="time"
            value={policy.quietHoursEnd}
          />
        </label>
        <label>
          {t('replacementAfterSkip')}
          <input
            checked={policy.replacementAfterSkipEnabled}
            disabled={isSaving || !policy.emailNotificationsEnabled}
            onChange={(event) => onUpdate?.({ replacementAfterSkipEnabled: event.target.checked })}
            type="checkbox"
          />
        </label>
        <label>
          {t('replacementDelay')}
          <input
            disabled={isSaving || !policy.replacementAfterSkipEnabled}
            min="0"
            onChange={(event) => onUpdate?.({ replacementDelayMinutes: Number(event.target.value) })}
            type="number"
            value={policy.replacementDelayMinutes}
          />
        </label>
      </div>
    </section>
  );
}

function RangeSetting({
  disabled = false,
  label,
  max,
  min,
  onCommit,
  value,
}: {
  disabled?: boolean;
  label: string;
  max: number;
  min: number;
  onCommit: (value: number) => void;
  value: number;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  function commit() {
    if (!disabled && draft !== value) onCommit(draft);
  }

  return (
    <span className="range-setting">
      <span className="range-setting-head">
        <span>{label}</span>
        <output>{draft}%</output>
      </span>
      <input
        aria-label={label}
        disabled={disabled}
        max={max}
        min={min}
        onBlur={commit}
        onChange={(event) => setDraft(Number(event.target.value))}
        onKeyUp={commit}
        onPointerUp={commit}
        type="range"
        value={draft}
      />
    </span>
  );
}

function localizeNextScan(value: string, language: 'vi' | 'en') {
  if (language === 'en') return value;
  return value
    .replace(/Backend scheduled/gi, 'Theo lịch của backend')
    .replace(/Today/gi, 'Hôm nay')
    .replace(/Tomorrow/gi, 'Ngày mai');
}

function PolicyItem({ icon, label, value, active }: { icon: ReactNode; label: string; value: string; active: boolean }) {
  return (
    <div className="policy-item">
      <span className={active ? 'policy-icon active' : 'policy-icon'}>{icon}</span>
      <div>
        <strong>{label}</strong>
        <small>{value}</small>
      </div>
    </div>
  );
}
