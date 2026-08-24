import { ArrowRight, Bookmark, BriefcaseBusiness, MapPin, Send, Sparkles, ThumbsDown, Zap } from 'lucide-react';
import type { MouseEvent, ReactNode } from 'react';
import type { Job } from '../types';
import { useLanguage } from '../i18n/LanguageProvider';
import { MatchingBadge, PotentialBadge, ReasonChips } from './Badges';

interface JobCardProps {
  job: Job;
  onSkip?: (id: string) => void;
  onOpen?: (job: Job) => void;
  onApply?: (job: Job) => void;
  onSave?: (job: Job) => void;
  isSaved?: boolean;
  isSaving?: boolean;
  showMatchMeta?: boolean;
  feedbackSlot?: ReactNode;
}

export function JobCard({ job, onSkip, onOpen, onApply, onSave, isSaved = false, isSaving = false, showMatchMeta = true, feedbackSlot }: JobCardProps) {
  const { language, t } = useLanguage();
  const saved = isSaved || Boolean(job.isSaved);
  const hasApplied = Boolean(job.applicationStatus);
  const companyMark = job.company
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  function stopAction(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
  }

  return (
    <article
      className={`job-card${onOpen ? ' clickable-job-card' : ''}`}
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={() => onOpen?.(job)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen?.(job);
        }
      }}
    >
      <div className="job-card-header">
        <div className="job-card-titleline">
          <span className="job-company-avatar">{companyMark || 'CF'}</span>
          <div>
            <p className="eyebrow">{job.company} · {localizePostedAt(job.postedAt, language)}</p>
            <h3 className="job-title-link">{job.title}</h3>
            <p className="job-meta-line">
              <span><MapPin size={14} />{localizeJobMetadata(job.location, language)}</span>
              <span><BriefcaseBusiness size={14} />{localizeJobMetadata(job.seniority, language)}</span>
              <span>{localizeJobMetadata(job.salary, language)}</span>
            </p>
          </div>
        </div>
        {showMatchMeta && job.hasMatching !== false ? (
          <div className="badge-stack">
            <MatchingBadge score={job.normalizedScore} label={job.label} />
            {job.isPotential ? <PotentialBadge jobTitle={job.title} /> : null}
          </div>
        ) : null}
      </div>

      {hasApplied || saved ? <div className="job-card-state-row">
        {hasApplied ? <span className="job-card-application-state">{language === 'vi' ? 'Đã ứng tuyển' : 'Applied'}</span> : null}
        {saved ? <span className="job-card-saved-state">{language === 'vi' ? 'Đã lưu' : 'Saved'}</span> : null}
        {job.isUrgent ? <span className="job-card-urgent-state"><Zap size={13} />{language === 'vi' ? 'Tuyển gấp' : 'Urgent hiring'}</span> : null}
      </div> : null}
      {!hasApplied && !saved && job.isUrgent ? <div className="job-card-state-row"><span className="job-card-urgent-state"><Zap size={13} />{language === 'vi' ? 'Tuyển gấp' : 'Urgent hiring'}</span></div> : null}

      <ReasonChips reasons={[...job.requiredSkills.slice(0, 4), ...job.reasons.slice(0, 1)]} />

      {job.description ? <p className="job-description">{job.description}</p> : null}

      <div className="job-insight-row">
        <span>
          <Sparkles size={14} />
          {job.reasons[0] ?? job.requiredSkills[0]}
        </span>
        <span>{job.requiredSkills.length + job.optionalSkills.length} {t('skills')}</span>
      </div>

      {feedbackSlot}

      <div className="actions job-card-actions">
        <button
          className="primary-action"
          disabled={!onApply || hasApplied}
          title={hasApplied ? (language === 'vi' ? 'Bạn đã ứng tuyển công việc này.' : 'You have already applied for this job.') : !onApply ? (language === 'vi' ? 'Hãy mở chi tiết công việc để ứng tuyển.' : 'Open the job detail to apply.') : undefined}
          onClick={(event) => {
            stopAction(event);
            onApply?.(job);
          }}
        >
          <Send size={16} />
          {hasApplied ? (language === 'vi' ? 'Đã ứng tuyển' : 'Applied') : t('apply')}
        </button>
        <button
          className={saved ? 'saved-job-action' : ''}
          disabled={!onSave || isSaving}
          title={!onSave ? (language === 'vi' ? 'Đăng nhập bằng tài khoản ứng viên để lưu việc làm.' : 'Sign in as a candidate to save jobs.') : undefined}
          onClick={(event) => {
            stopAction(event);
            onSave?.(job);
          }}
        >
          <Bookmark size={16} />
          {isSaving ? (language === 'vi' ? 'Đang lưu...' : 'Saving...') : saved ? (language === 'vi' ? 'Đã lưu' : 'Saved') : t('save')}
        </button>
        <button
          disabled={!onSkip}
          title={!onSkip ? (language === 'vi' ? 'Phản hồi này chỉ khả dụng trong danh sách gợi ý.' : 'This feedback is only available in recommendation lists.') : undefined}
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
          disabled={!onOpen}
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

function localizePostedAt(value: string, language: 'vi' | 'en') {
  if (language === 'en') return value;
  return value
    .replace(/^(\d+)h ago$/i, '$1 giờ trước')
    .replace(/^(\d+)d ago$/i, '$1 ngày trước')
    .replace(/^Today$/i, 'Hôm nay')
    .replace(/^Yesterday$/i, 'Hôm qua');
}

function localizeJobMetadata(value: string, language: 'vi' | 'en') {
  if (language === 'en') return value;
  return value
    .replace(/Ho Chi Minh City/gi, 'TP. Hồ Chí Minh')
    .replace(/Ha Noi/gi, 'Hà Nội')
    .replace(/Remote Vietnam/gi, 'Từ xa tại Việt Nam')
    .replace(/\bHybrid\b/gi, 'Kết hợp')
    .replace(/\bRemote\b/gi, 'Từ xa')
    .replace(/\bOnsite\b/gi, 'Tại văn phòng')
    .replace(/\bMid-Senior\b/gi, 'Trung - cao cấp')
    .replace(/\bSenior\b/gi, 'Cao cấp')
    .replace(/\bLead\b/gi, 'Trưởng nhóm')
    .replace(/Unknown Location/gi, 'Chưa xác định địa điểm')
    .replace(/^UNKNOWN$/gi, 'Chưa xác định')
    .replace(/\bNegotiable\b/gi, 'Thỏa thuận');
}
