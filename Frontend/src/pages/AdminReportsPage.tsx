import { useCallback, useEffect, useState } from 'react';
import { Ban, Check, Flag } from 'lucide-react';
import {
  adminApi,
  type AdminReportCase,
  type AdminReportDetail,
  type AdminReportTargetType,
} from '../lib/adminApi';
import { useLanguage } from '../i18n/LanguageProvider';
import { ToastMessage } from '../components/ToastMessage';
import { ReasonChips } from '../components/Badges';

type ResolutionAction = 'ban' | 'dismiss';

export function AdminReportsPage() {
  const { language } = useLanguage();
  const vi = language === 'vi';
  const [targetType, setTargetType] = useState<AdminReportTargetType>('JOB');
  const [queue, setQueue] = useState<Awaited<ReturnType<typeof adminApi.getReports>> | null>(null);
  const [selected, setSelected] = useState<AdminReportCase | null>(null);
  const [detail, setDetail] = useState<AdminReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [resolutionAction, setResolutionAction] = useState<ResolutionAction | null>(null);
  const [resolving, setResolving] = useState(false);

  const loadQueue = useCallback(async (nextType = targetType, background = false) => {
    if (!background) setLoading(true);
    try {
      const result = await adminApi.getReports({ targetType: nextType, page: 0, size: 20 });
      setQueue(result);
      setError(null);
      setSelected((current) => result.content.find((item) => item.targetId === current?.targetId) ?? result.content[0] ?? null);
    } catch {
      setError(vi ? 'Không thể tải danh sách báo cáo.' : 'Could not load reports.');
      setQueue(null);
      setSelected(null);
      setDetail(null);
    } finally {
      if (!background) setLoading(false);
    }
  }, [targetType, vi]);

  useEffect(() => { void loadQueue(); }, [loadQueue]);

  useEffect(() => {
    const poller = window.setInterval(() => { void loadQueue(targetType, true); }, 5_000);
    return () => window.clearInterval(poller);
  }, [loadQueue, targetType]);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    let active = true;
    setDetailLoading(true);
    adminApi.getReportDetail(targetType, selected.targetId)
      .then((result) => { if (active) setDetail(result); })
      .catch(() => { if (active) setError(vi ? 'Không thể tải chi tiết báo cáo.' : 'Could not load report details.'); })
      .finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [selected, targetType, vi]);

  function changeTab(nextType: AdminReportTargetType) {
    if (nextType === targetType) return;
    setTargetType(nextType);
    setSelected(null);
    setDetail(null);
  }

  async function resolve(note: string) {
    if (!selected || !resolutionAction) return;
    setResolving(true);
    try {
      if (resolutionAction === 'ban') {
        await adminApi.banReportedContent(targetType, selected.targetId, note);
      } else {
        await adminApi.dismissReports(targetType, selected.targetId, note);
      }
      setMessage({
        tone: 'success',
        text: resolutionAction === 'ban'
          ? (vi ? 'Đã khóa nội dung và xử lý các báo cáo đang chờ.' : 'Content was banned and pending reports were resolved.')
          : (vi ? 'Đã bỏ qua các báo cáo đang chờ.' : 'Pending reports were dismissed.'),
      });
      setResolutionAction(null);
      await loadQueue();
    } catch {
      setMessage({ tone: 'error', text: vi ? 'Không thể xử lý báo cáo.' : 'Could not resolve reports.' });
    } finally {
      setResolving(false);
    }
  }

  const selectedId = selected?.targetId;
  const jobCount = targetType === 'JOB' ? queue?.totalElements ?? 0 : queue?.pendingJobs ?? 0;
  const cvCount = targetType === 'CV' ? queue?.totalElements ?? 0 : queue?.pendingCvs ?? 0;

  return (
    <section className="admin-reports-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Admin</p>
          <h2>{vi ? 'Trung tâm báo cáo nội dung' : 'Content report center'}</h2>
          <p>{vi ? 'Xem xét JD và CV bị cộng đồng báo cáo.' : 'Review job and CV reports from the community.'}</p>
        </div>
      </div>
      {message ? <ToastMessage {...message} /> : null}
      {error ? <p className="field-validation-hint error">{error}</p> : null}

      <div className="admin-report-tabs" role="tablist" aria-label={vi ? 'Loại nội dung bị báo cáo' : 'Reported content type'}>
        <button className={targetType === 'JOB' ? 'active' : ''} role="tab" aria-selected={targetType === 'JOB'} onClick={() => changeTab('JOB')}>
          {vi ? 'JD bị báo cáo' : 'Reported jobs'} <span>{jobCount}</span>
        </button>
        <button className={targetType === 'CV' ? 'active' : ''} role="tab" aria-selected={targetType === 'CV'} onClick={() => changeTab('CV')}>
          {vi ? 'CV bị báo cáo' : 'Reported CVs'} <span>{cvCount}</span>
        </button>
      </div>

      <div className="admin-report-workspace">
        <aside className="admin-report-list" aria-label={vi ? 'Danh sách nội dung bị báo cáo' : 'Reported content list'}>
          {loading ? <p>{vi ? 'Đang tải...' : 'Loading...'}</p> : null}
          {!loading && queue?.content.length === 0 ? <p className="admin-report-empty">{vi ? 'Không có báo cáo đang chờ xử lý.' : 'No pending reports.'}</p> : null}
          {queue?.content.map((item) => (
            <button key={item.targetId} className={item.targetId === selectedId ? 'active' : ''} onClick={() => setSelected(item)}>
              <span className="admin-report-list-title"><strong>{item.title}</strong><em>{item.pendingCount}</em></span>
              <small>{item.owner}</small>
              <ReasonChips reasons={item.reasons.map((reason) => reportReasonLabel(reason, language))} />
              <time>{formatDate(item.latestReportedAt, language)}</time>
            </button>
          ))}
        </aside>

        <section className="admin-report-detail">
          {detailLoading ? <p>{vi ? 'Đang tải chi tiết...' : 'Loading details...'}</p> : null}
          {!detailLoading && !detail ? <div className="admin-report-empty"><Flag size={22} /><p>{vi ? 'Chọn một JD hoặc CV để xem báo cáo.' : 'Select a job or CV to inspect its reports.'}</p></div> : null}
          {detail ? <ReportDetail detail={detail} language={language} onResolve={setResolutionAction} /> : null}
        </section>
      </div>

      {resolutionAction && selected ? <ResolutionModal
        action={resolutionAction}
        targetType={targetType}
        title={selected.title}
        language={language}
        submitting={resolving}
        onClose={() => setResolutionAction(null)}
        onConfirm={resolve}
      /> : null}
    </section>
  );
}

function ReportDetail({ detail, language, onResolve }: { detail: AdminReportDetail; language: 'vi' | 'en'; onResolve: (action: ResolutionAction) => void }) {
  const vi = language === 'vi';
  const content = detail.content;
  return <>
    <div className="admin-report-detail-heading">
      <div><p className="eyebrow">{content.targetType === 'JOB' ? (vi ? 'Việc làm' : 'Job') : 'CV'}</p><h3>{content.title}</h3><p>{content.owner}</p></div>
      <span className="admin-report-status">{detail.reportCase.pendingCount} {vi ? 'báo cáo chờ xử lý' : 'pending reports'}</span>
    </div>
    <section className="admin-report-timeline">
      <h4>{vi ? 'Nội dung report' : 'Report timeline'}</h4>
      {detail.reports.map((report) => <article key={report.id}>
        <div><strong>{reportReasonLabel(report.reason, language)}</strong><time>{formatDate(report.createdAt, language)}</time></div>
        <small>{report.reporterEmail ?? (vi ? 'Ẩn danh' : 'Anonymous')}</small>
        {report.comment ? <p>{report.comment}</p> : <p className="muted-copy">{vi ? 'Không có ghi chú bổ sung.' : 'No additional note.'}</p>}
      </article>)}
    </section>
    <section className="admin-report-content-preview">
      <h4>{vi ? 'Nội dung cần xem xét' : 'Content under review'}</h4>
      <dl>
        {content.company ? <div><dt>{vi ? 'Công ty' : 'Company'}</dt><dd>{content.company}</dd></div> : null}
        {content.location ? <div><dt>{vi ? 'Địa điểm' : 'Location'}</dt><dd>{content.location}</dd></div> : null}
        <div><dt>{vi ? 'Trạng thái' : 'Status'}</dt><dd>{content.contentStatus}</dd></div>
        {content.contactEmail ? <div><dt>Email</dt><dd>{content.contactEmail}</dd></div> : null}
      </dl>
      {content.skills.length ? <ReasonChips reasons={content.skills} /> : null}
      <p className="admin-report-description">{content.description || (vi ? 'Không có nội dung chi tiết.' : 'No detailed content available.')}</p>
    </section>
    <div className="admin-report-actions">
      <button type="button" onClick={() => onResolve('dismiss')}><Check size={17} />{vi ? 'Bỏ qua báo cáo' : 'Dismiss reports'}</button>
      <button type="button" className="danger-action" onClick={() => onResolve('ban')}><Ban size={17} />{vi ? `Ban ${content.targetType === 'JOB' ? 'JD' : 'CV'}` : `Ban ${content.targetType}`}</button>
    </div>
  </>;
}

function ResolutionModal({ action, targetType, title, language, submitting, onClose, onConfirm }: {
  action: ResolutionAction; targetType: AdminReportTargetType; title: string; language: 'vi' | 'en'; submitting: boolean; onClose: () => void; onConfirm: (note: string) => void;
}) {
  const vi = language === 'vi';
  const ban = action === 'ban';
  const [note, setNote] = useState('');
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={ban ? (vi ? 'Xác nhận ban nội dung' : 'Confirm content ban') : (vi ? 'Bỏ qua báo cáo' : 'Dismiss reports')}>
    <section className="candidate-review-modal admin-resolution-modal">
      <div><p className="eyebrow">Admin</p><h2>{ban ? (vi ? `Ban ${targetType === 'JOB' ? 'JD' : 'CV'}?` : `Ban ${targetType}?`) : (vi ? 'Bỏ qua báo cáo?' : 'Dismiss reports?')}</h2><p>{title}</p><small>{ban ? (vi ? 'Nội dung sẽ bị ẩn khỏi các luồng công khai và matching.' : 'Content will be hidden from public and matching flows.') : (vi ? 'Tất cả report đang chờ sẽ được đóng, nội dung vẫn hoạt động.' : 'All pending reports will be closed and content remains active.')}</small></div>
      <label>{vi ? 'Ghi chú xử lý (không bắt buộc)' : 'Resolution note (optional)'}<textarea value={note} maxLength={500} rows={4} onChange={(event) => setNote(event.target.value)} /></label>
      <div className="filter-modal-actions"><button type="button" onClick={onClose} disabled={submitting}>{vi ? 'Hủy' : 'Cancel'}</button><button type="button" className={ban ? 'danger-action' : 'primary-action'} disabled={submitting} onClick={() => onConfirm(note)}>{submitting ? '...' : ban ? (vi ? 'Xác nhận ban' : 'Confirm ban') : (vi ? 'Xác nhận bỏ qua' : 'Confirm dismiss')}</button></div>
    </section>
  </div>;
}

function reportReasonLabel(reason: string, language: 'vi' | 'en') {
  const vi: Record<string, string> = {
    IMPERSONATION: 'Giả mạo', FRAUD_SCAM: 'Lừa đảo', FALSE_INFORMATION: 'Thông tin sai lệch',
    INAPPROPRIATE_CONTENT: 'Nội dung không phù hợp', DISCRIMINATION_HARASSMENT: 'Phân biệt đối xử/quấy rối',
    PRIVACY_VIOLATION: 'Vi phạm quyền riêng tư', SPAM: 'Spam', OTHER: 'Khác',
  };
  if (language === 'vi') return vi[reason] ?? reason;
  return reason.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string, language: 'vi' | 'en') {
  return new Date(value).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US');
}
