import { Clock, Mail, Radar, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AutomationPolicy } from '../types';
import { useLanguage } from '../i18n/LanguageProvider';

export function AutomationPolicyPanel({ policy }: { policy: AutomationPolicy }) {
  const { t } = useLanguage();

  return (
    <section className="policy-panel">
      <div className="section-heading">
        <p className="eyebrow">{t('automation')}</p>
        <h2>{t('automationTitle')}</h2>
      </div>
      <div className="policy-grid">
        <PolicyItem icon={<ShieldCheck size={20} />} label={t('autoApply')} value={`${policy.autoApplyThreshold}%`} active={policy.autoApplyEnabled} />
        <PolicyItem icon={<Radar size={20} />} label={t('nextScan')} value={policy.nextScanAt} active={policy.scanEnabled} />
        <PolicyItem icon={<Mail size={20} />} label={t('highMatchEmail')} value={`${policy.highMatchThreshold}%`} active={policy.highMatchEmailEnabled} />
        <PolicyItem icon={<Clock size={20} />} label={t('quietHours')} value={`${policy.quietHoursStart} - ${policy.quietHoursEnd}`} active={policy.quietHoursEnabled} />
      </div>
      <div className="settings-grid">
        <label>
          {t('threshold')}
          <input type="range" min="50" max="100" defaultValue={policy.autoApplyThreshold} />
        </label>
        <label>
          {t('dailyDigest')}
          <input type="time" defaultValue={policy.dailyDigestTime} />
        </label>
        <label>
          {t('emailQuota')}
          <input type="number" defaultValue={policy.maxEmailsPerDay} min="1" max="20" />
        </label>
        <label>
          Timezone
          <select defaultValue={policy.timezone}>
            <option>Asia/Ho_Chi_Minh</option>
            <option>UTC</option>
            <option>Asia/Singapore</option>
          </select>
        </label>
      </div>
    </section>
  );
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
