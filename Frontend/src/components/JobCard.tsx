import { ArrowRight, Bookmark, Send, ThumbsDown } from 'lucide-react';
import type { Job } from '../types';
import { useLanguage } from '../i18n/LanguageProvider';
import { MatchingBadge, PotentialBadge, ReasonChips } from './Badges';

interface JobCardProps {
  job: Job;
  onSkip?: (id: string) => void;
  onOpen?: (job: Job) => void;
}

export function JobCard({ job, onSkip, onOpen }: JobCardProps) {
  const { t } = useLanguage();

  return (
    <article className="job-card">
      <div className="job-card-header">
        <div>
          <p className="eyebrow">{job.company} · {job.postedAt}</p>
          <h3>{job.title}</h3>
          <p>{job.location} · {job.seniority} · {job.salary}</p>
        </div>
        <div className="badge-stack">
          <MatchingBadge score={job.normalizedScore} label={job.label} />
          {job.isPotential ? <PotentialBadge /> : null}
        </div>
      </div>

      <ReasonChips reasons={[...job.requiredSkills.slice(0, 4), ...job.reasons.slice(0, 1)]} />

      <p className="job-description">{job.description}</p>

      <div className="actions">
        <button className="primary-action">
          <Send size={16} />
          {t('apply')}
        </button>
        <button>
          <Bookmark size={16} />
          {t('save')}
        </button>
        <button onClick={() => onSkip?.(job.id)}>
          <ThumbsDown size={16} />
          {t('skip')}
        </button>
        <button className="text-action" onClick={() => onOpen?.(job)}>
          {t('viewDetail')}
          <ArrowRight size={16} />
        </button>
      </div>
    </article>
  );
}
