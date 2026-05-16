import { ArrowRight, Bookmark, Send, ThumbsDown } from 'lucide-react';
import type { MouseEvent } from 'react';
import type { Job } from '../types';
import { useLanguage } from '../i18n/LanguageProvider';
import { MatchingBadge, PotentialBadge, ReasonChips } from './Badges';

interface JobCardProps {
  job: Job;
  onSkip?: (id: string) => void;
  onOpen?: (job: Job) => void;
  onApply?: (job: Job) => void;
  showMatchMeta?: boolean;
}

export function JobCard({ job, onSkip, onOpen, onApply, showMatchMeta = true }: JobCardProps) {
  const { t } = useLanguage();

  function stopAction(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
  }

  return (
    <article
      className="job-card clickable-job-card"
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(job)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen?.(job);
        }
      }}
    >
      <div className="job-card-header">
        <div>
          <p className="eyebrow">{job.company} · {job.postedAt}</p>
          <h3 className="job-title-link">{job.title}</h3>
          <p>{job.location} · {job.seniority} · {job.salary}</p>
        </div>
        {showMatchMeta ? (
          <div className="badge-stack">
            <MatchingBadge score={job.normalizedScore} label={job.label} />
            {job.isPotential ? <PotentialBadge /> : null}
          </div>
        ) : null}
      </div>

      <ReasonChips reasons={[...job.requiredSkills.slice(0, 4), ...job.reasons.slice(0, 1)]} />

      <p className="job-description">{job.description}</p>

      <div className="actions">
        <button
          className="primary-action"
          onClick={(event) => {
            stopAction(event);
            onApply?.(job);
          }}
        >
          <Send size={16} />
          {t('apply')}
        </button>
        <button onClick={stopAction}>
          <Bookmark size={16} />
          {t('save')}
        </button>
        <button
          onClick={(event) => {
            stopAction(event);
            onSkip?.(job.id);
          }}
        >
          <ThumbsDown size={16} />
          {t('skip')}
        </button>
        <button
          className="text-action"
          onClick={(event) => {
            stopAction(event);
            onOpen?.(job);
          }}
        >
          {t('viewDetail')}
          <ArrowRight size={16} />
        </button>
      </div>
    </article>
  );
}
