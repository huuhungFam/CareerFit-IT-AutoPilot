import { Clock, Mail, Radar, ShieldCheck } from 'lucide-react';
import { useState, type ReactNode } from 'react';
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
      <div className="automation-settings-layout">
        <PolicyGroup icon={<ShieldCheck size={19} />} title={language === 'vi' ? 'Tự động ứng tuyển' : 'Auto-apply'}>
          <ToggleSetting label={t('autoApply')} checked={policy.autoApplyEnabled} disabled={isSaving} onChange={(checked) => onUpdate?.({ autoApplyEnabled: checked })} />
          <RangeSetting key={`auto-apply-${policy.autoApplyThreshold}`} disabled={isSaving || !policy.autoApplyEnabled} label={t('autoApplyThreshold')} max={100} min={50} onCommit={(value) => onUpdate?.({ autoApplyThreshold: value })} value={policy.autoApplyThreshold} />
        </PolicyGroup>

        <PolicyGroup icon={<Mail size={19} />} title={language === 'vi' ? 'Thông báo email' : 'Email notifications'}>
          <ToggleSetting label={t('emailNotifications')} checked={policy.emailNotificationsEnabled} disabled={isSaving} onChange={(checked) => onUpdate?.({ emailNotificationsEnabled: checked })} />
          <ToggleSetting label={t('highMatchEmail')} checked={policy.highMatchEmailEnabled} disabled={isSaving || !policy.emailNotificationsEnabled} onChange={(checked) => onUpdate?.({ highMatchEmailEnabled: checked })} />
          <RangeSetting key={`high-match-${policy.highMatchThreshold}`} disabled={isSaving || !policy.emailNotificationsEnabled || !policy.highMatchEmailEnabled} label={t('threshold')} max={100} min={50} onCommit={(value) => onUpdate?.({ highMatchThreshold: value })} value={policy.highMatchThreshold} />
          <ToggleSetting label={t('dailyDigest')} checked={policy.dailyDigestEnabled} disabled={isSaving || !policy.emailNotificationsEnabled} onChange={(checked) => onUpdate?.({ dailyDigestEnabled: checked })} />
          <div className="automation-number-grid">
            <NumberSetting label={t('emailQuota')} min={1} max={20} disabled={isSaving || !policy.emailNotificationsEnabled} value={policy.maxEmailsPerDay} onChange={(value) => onUpdate?.({ maxEmailsPerDay: value })} />
            <NumberSetting label={t('cooldownHours')} min={0} max={168} disabled={isSaving || !policy.emailNotificationsEnabled} value={policy.notificationCooldownHours} onChange={(value) => onUpdate?.({ notificationCooldownHours: value })} />
          </div>
        </PolicyGroup>

        <PolicyGroup icon={<Clock size={19} />} title={language === 'vi' ? 'Khung giờ yên lặng' : 'Quiet hours'}>
          <ToggleSetting label={t('quietHours')} checked={policy.quietHoursEnabled} disabled={isSaving || !policy.emailNotificationsEnabled} onChange={(checked) => onUpdate?.({ quietHoursEnabled: checked })} />
          <div className="automation-number-grid">
            <TimeSetting label={t('quietStarts')} disabled={isSaving || !policy.quietHoursEnabled} value={policy.quietHoursStart} onChange={(value) => onUpdate?.({ quietHoursStart: value })} />
            <TimeSetting label={t('quietEnds')} disabled={isSaving || !policy.quietHoursEnabled} value={policy.quietHoursEnd} onChange={(value) => onUpdate?.({ quietHoursEnd: value })} />
          </div>
        </PolicyGroup>

        <PolicyGroup icon={<Radar size={19} />} title={language === 'vi' ? 'Gợi ý thay thế' : 'Replacement suggestions'}>
          <ToggleSetting label={t('replacementAfterSkip')} checked={policy.replacementAfterSkipEnabled} disabled={isSaving || !policy.emailNotificationsEnabled} onChange={(checked) => onUpdate?.({ replacementAfterSkipEnabled: checked })} />
          <NumberSetting label={t('replacementDelay')} min={0} disabled={isSaving || !policy.replacementAfterSkipEnabled} value={policy.replacementDelayMinutes} onChange={(value) => onUpdate?.({ replacementDelayMinutes: value })} />
        </PolicyGroup>
      </div>
    </section>
  );
}

function PolicyGroup({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return <section className="automation-policy-group"><div className="automation-policy-group-heading"><span>{icon}</span><h3>{title}</h3></div><div className="automation-policy-group-content">{children}</div></section>;
}

function ToggleSetting({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled: boolean; onChange: (checked: boolean) => void }) {
  return <label className="automation-toggle-row"><span>{label}</span><input checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} type="checkbox" /></label>;
}

function NumberSetting({ label, min, max, disabled, value, onChange }: { label: string; min: number; max?: number; disabled: boolean; value: number; onChange: (value: number) => void }) {
  return <label className="automation-field"><span>{label}</span><input disabled={disabled} min={min} max={max} onChange={(event) => onChange(Number(event.target.value))} type="number" value={value} /></label>;
}

function TimeSetting({ label, disabled, value, onChange }: { label: string; disabled: boolean; value: string; onChange: (value: string) => void }) {
  return <label className="automation-field"><span>{label}</span><input disabled={disabled} onChange={(event) => onChange(event.target.value)} type="time" value={value} /></label>;
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

function localizeNextScan(value: string | null | undefined, language: 'vi' | 'en') {
  if (!value) return language === 'vi' ? 'Theo lịch của backend' : 'Backend scheduled';
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
