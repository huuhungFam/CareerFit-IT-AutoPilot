import sys

with open('Frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

demo_code = '''function DemoModeSettings({
  data,
  role,
  onUpdate
}: {
  data: any;
  role: 'candidate' | 'recruiter';
  onUpdate: () => void;
}) {
  const { language } = useLanguage();
  const vi = language === 'vi';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const demoModeEnabled = Boolean(data?.demoModeEnabled);
  const timing = data?.effectiveTiming || {
    candidatePollIntervalSeconds: 5,
    firstSuggestionDelaySeconds: 12,
    subsequentSpacingSeconds: 30
  };

  const handleToggle = async (checked: boolean) => {
    setLoading(true);
    setError(null);
    try {
      await careerfitApi.updateSettings({}, checked);
      onUpdate();
    } catch (err) {
      setError(readableError(err, vi ? 'Lỗi cập nhật Demo Mode.' : 'Failed to update Demo Mode.', language));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <div className="action-message tone-warning" style={{ marginBottom: 16 }}>
        {vi
          ? 'Chế độ Demo đang được kiểm soát từ trang Settings này.'
          : 'Demo Mode is controlled from this Settings page.'}
      </div>
      <SettingsSection icon={<Zap size={20} />} title="Demo Mode">
        {error && <p className="form-error">{error}</p>}
        <div className="settings-option-grid">
          <SettingToggle
            title="Enable Demo Mode"
            detail={vi ? 'Rút ngắn thời gian xử lý.' : 'Shortens processing times.'}
            checked={demoModeEnabled}
            onChange={handleToggle}
            disabled={loading}
          />
        </div>
        <div style={{ marginTop: 12, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {vi ? 'Thời gian hiện tại' : 'Current timings'}: Polling: {timing.candidatePollIntervalSeconds}s, First Delay: {timing.firstSuggestionDelaySeconds}s, Subsequent: {timing.subsequentSpacingSeconds}s.
        </div>
      </SettingsSection>
    </div>
  );
}

function ConnectedSettingsPage'''

content = content.replace('function ConnectedSettingsPage', demo_code)

rendered = '''    >
      {!isLoading && !error && data && (
        <DemoModeSettings 
          data={data} 
          role={role} 
          onUpdate={() => queryClient.invalidateQueries({ queryKey: ['settings', role] })} 
        />
      )}
      {message ? <ActionMessage {...message} /> : null}'''

content = content.replace('    >\n      {message ? <ActionMessage {...message} /> : null}', rendered)

with open('Frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
