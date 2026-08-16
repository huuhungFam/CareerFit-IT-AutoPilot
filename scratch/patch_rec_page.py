import sys

with open('Frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_code = '''function RecommendationsPage() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [hiddenJobIds, setHiddenJobIds] = useState<string[]>([]);
  const [actionMessage, setActionMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const recommendationsQuery = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => careerfitApi.getRecommendations(20),
  });
  const recommendedJobs = (recommendationsQuery.data ?? []).filter((job) => !hiddenJobIds.includes(job.id));

  async function applyToJob(job: Job) {
    setActionMessage(null);
    try {
      await careerfitApi.submitApplication(job.id);
      await queryClient.invalidateQueries({ queryKey: ['my-applications'] });
      navigate('/candidate/applications');
    } catch (error) {
      setActionMessage({
        tone: 'error',
        text: readableError(error, language === 'vi' ? 'KhA'ng th cng tuyn cA'ng vic nAy.' : 'Could not submit this application.', language),
      });
    }
  }

  async function skipJob(id: string, options?: { feedbackSaved?: boolean }) {
    const job = recommendedJobs.find((item) => item.id === id);
    setActionMessage(null);
    try {
      if (!options?.feedbackSaved && job?.matchingId) {
        await careerfitApi.submitMatchFeedback(job.matchingId, 'NOT_INTERESTED');
      }
      setHiddenJobIds((current) => [...current, id]);
      setActionMessage({
        tone: 'success',
        text: language === 'vi' ? '?A ghi nh-n phn h"i vA cn cA'ng vic nAy.' : 'Feedback saved and job hidden.',
      });
    } catch (error) {
      setActionMessage({
        tone: 'error',
        text: readableError(error, language === 'vi' ? 'KhA'ng th ghi nh-n phn h"i.' : 'Could not save feedback.', language),
      });
    }
  }

  return (
    <div className="page-stack">
      <section className="section-heading">
        <p className="eyebrow">{t('recommendations')}</p>
        <h2>{t('recommendationsTitle')}</h2>
      </section>
      {actionMessage ? <ActionMessage {...actionMessage} /> : null}
      {recommendationsQuery.isError ? (
        <section className="query-error-panel">
          <ActionMessage tone="error" text={readableError(recommendationsQuery.error, language === 'vi' ? 'KhA'ng th ti gi A vic lAm.' : 'Could not load job recommendations.', language)} />
          <button type="button" onClick={() => recommendationsQuery.refetch()}>{language === 'vi' ? 'Th- li' : 'Retry'}</button>
        </section>
      ) : null}
      <JobListWithPreview
        jobs={recommendedJobs}
        isLoading={recommendationsQuery.isLoading || recommendationsQuery.isFetching}
        onOpen={(job) => navigate(`/candidate/jobs/${job.id}`)}
        onApply={applyToJob}
        onSkip={skipJob}
        emptyTitle={t('noMatchingJobs')}
        emptyCopy={t('noMatchingJobsCopy')}
        emptyActions={<button onClick={() => navigate('/candidate/jobs')}>{t('viewAll')}</button>}
      />
    </div>
  );
}'''

new_code = '''function RecommendationsPage() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [hiddenJobIds, setHiddenJobIds] = useState<string[]>([]);
  const [actionMessage, setActionMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const settingsQuery = useQuery<any>({
    queryKey: ['settings', 'candidate'],
    queryFn: () => careerfitApi.getSettings()
  });

  const demoModeEnabled = settingsQuery.data?.demoModeEnabled;
  const pollInterval = demoModeEnabled ? 5_000 : 300_000;

  const recommendationsQuery = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => careerfitApi.getRecommendations(20),
    refetchInterval: pollInterval
  });

  const recommendedJobs = (recommendationsQuery.data?.jobs ?? []).filter((job: any) => !hiddenJobIds.includes(job.id));
  const cvStatus = recommendationsQuery.data?.cvStatus;
  const cvMessage = recommendationsQuery.data?.message;

  const isRefetching = recommendationsQuery.isFetching;
  const lastRefresh = new Date(recommendationsQuery.dataUpdatedAt || Date.now());

  async function applyToJob(job: Job) {
    setActionMessage(null);
    try {
      await careerfitApi.submitApplication(job.id);
      await queryClient.invalidateQueries({ queryKey: ['my-applications'] });
      navigate('/candidate/applications');
    } catch (error) {
      setActionMessage({
        tone: 'error',
        text: readableError(error, language === 'vi' ? 'Không thể ứng tuyển công việc này.' : 'Could not submit this application.', language),
      });
    }
  }

  async function skipJob(id: string, options?: { feedbackSaved?: boolean }) {
    const job = recommendedJobs.find((item: any) => item.id === id);
    setActionMessage(null);
    try {
      if (!options?.feedbackSaved && job?.matchingId) {
        await careerfitApi.submitMatchFeedback(job.matchingId, 'NOT_INTERESTED');
      }
      setHiddenJobIds((current) => [...current, id]);
      setActionMessage({
        tone: 'success',
        text: language === 'vi' ? 'Đã ghi nhận phản hồi và ẩn công việc này.' : 'Feedback saved and job hidden.',
      });
    } catch (error) {
      setActionMessage({
        tone: 'error',
        text: readableError(error, language === 'vi' ? 'Không thể ghi nhận phản hồi.' : 'Could not save feedback.', language),
      });
    }
  }

  return (
    <div className="page-stack">
      <section className="section-heading">
        <p className="eyebrow">{t('recommendations')}</p>
        <h2>{t('recommendationsTitle')}</h2>
      </section>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button className="secondary-action" onClick={() => recommendationsQuery.refetch()} disabled={isRefetching}>
          <RefreshCcw size={16} /> {language === 'vi' ? 'Làm mới' : 'Refresh'}
        </button>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {language === 'vi' ? 'Cập nhật lần cuối:' : 'Last updated:'} {lastRefresh.toLocaleTimeString()}
          {isRefetching && ' (Đang tải...)'}
        </span>
      </div>

      {cvStatus !== 'SCORING_DONE' && cvStatus !== 'ACTIVE' && cvMessage && (
        <ActionMessage tone="info" text={cvMessage} />
      )}

      {actionMessage ? <ActionMessage {...actionMessage} /> : null}
      
      {recommendationsQuery.isError ? (
        <section className="query-error-panel">
          <ActionMessage tone="error" text={readableError(recommendationsQuery.error, language === 'vi' ? 'Không thể tải gợi ý việc làm.' : 'Could not load job recommendations.', language)} />
          <button type="button" onClick={() => recommendationsQuery.refetch()}>{language === 'vi' ? 'Thử lại' : 'Retry'}</button>
        </section>
      ) : null}
      <JobListWithPreview
        jobs={recommendedJobs}
        isLoading={recommendationsQuery.isLoading || recommendationsQuery.isFetching}
        onOpen={(job) => navigate(`/candidate/jobs/${job.id}`)}
        onApply={applyToJob}
        onSkip={skipJob}
        emptyTitle={t('noMatchingJobs')}
        emptyCopy={t('noMatchingJobsCopy')}
        emptyActions={<button onClick={() => navigate('/candidate/jobs')}>{t('viewAll')}</button>}
      />
    </div>
  );
}'''

if old_code in content:
    content = content.replace(old_code, new_code)
    with open('Frontend/src/App.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced RecommendationsPage!")
else:
    print("Failed to find old code block!")
