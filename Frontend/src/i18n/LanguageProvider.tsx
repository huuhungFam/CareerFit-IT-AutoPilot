import { createContext, useContext, useMemo, useState } from 'react';
import type { Language } from '../types';

type Dictionary = Record<string, string>;

const vi: Dictionary = {
  brand: 'CareerFit IT AutoPilot',
  candidate: 'Candidate',
  recruiter: 'Recruiter',
  dashboard: 'Tổng quan',
  jobs: 'Việc làm',
  upload: 'Upload CV',
  profile: 'Hồ sơ',
  recommendations: 'Gợi ý',
  applications: 'Ứng tuyển',
  automation: 'AutoFit',
  analytics: 'Thống kê',
  login: 'Đăng nhập',
  register: 'Đăng ký',
  notifications: 'Thông báo',
  searchPlaceholder: 'Tìm theo vị trí, kỹ năng hoặc công ty',
  filter: 'Bộ lọc',
  apply: 'Apply',
  save: 'Lưu',
  skip: 'Bỏ qua',
  similar: 'Tương tự',
  score: 'Điểm phù hợp',
  potential: 'Potential',
  reason: 'Lý do',
  autoApply: 'Auto-apply',
  nextScan: 'Lần quét tiếp theo',
  dailyDigest: 'Daily digest',
  highMatchEmail: 'Email high-match',
  quietHours: 'Quiet hours',
  emailQuota: 'Quota email/ngày',
  threshold: 'Ngưỡng',
  status: 'Trạng thái',
  candidateHomeTitle: 'Bảng điều phối nghề nghiệp của bạn',
  candidateHomeCopy: 'Tìm việc như một job portal thông thường, trong khi AutoPilot theo dõi score, cảnh báo và ứng tuyển theo policy bạn đặt.',
  recruiterHomeTitle: 'Control plane tuyển dụng',
  recruiterHomeCopy: 'Theo dõi JD, ranking, potential pool, approval queue và audit summary trên cùng một mặt phẳng vận hành.',
  uploadTitle: 'Upload CV để xếp hạng JD phù hợp',
  uploadCopy: 'Kéo thả PDF, xem trạng thái xử lý và nhận danh sách việc phù hợp khi scoring hoàn tất.',
  profileTitle: 'Hồ sơ mong muốn',
  recommendationsTitle: 'Top JD phù hợp với hồ sơ',
  applicationsTitle: 'Lịch sử ứng tuyển',
  automationTitle: 'Cấu hình AutoFit policy',
  confirmTitle: 'Xác nhận hành động từ email',
  resultTitle: 'Kết quả hành động',
  confirm: 'Xác nhận',
  reject: 'Từ chối',
  validUntil: 'Hết hạn',
  passwordless: 'Gửi magic-link',
  email: 'Email',
  password: 'Mật khẩu',
  sendLink: 'Gửi link',
  signIn: 'Vào dashboard',
  language: 'Ngôn ngữ',
  viewDetail: 'Chi tiết',
  activeJobs: 'JD đang mở',
  pendingApprovals: 'Chờ duyệt',
  highMatches: 'Match cao',
  invitesSent: 'Đã mời',
  jobTrend: 'Xu hướng JD và matching',
};

const en: Dictionary = {
  brand: 'CareerFit IT AutoPilot',
  candidate: 'Candidate',
  recruiter: 'Recruiter',
  dashboard: 'Dashboard',
  jobs: 'Jobs',
  upload: 'Upload CV',
  profile: 'Profile',
  recommendations: 'Recommendations',
  applications: 'Applications',
  automation: 'AutoFit',
  analytics: 'Analytics',
  login: 'Login',
  register: 'Register',
  notifications: 'Notifications',
  searchPlaceholder: 'Search title, skill, or company',
  filter: 'Filters',
  apply: 'Apply',
  save: 'Save',
  skip: 'Skip',
  similar: 'Similar',
  score: 'Match score',
  potential: 'Potential',
  reason: 'Reason',
  autoApply: 'Auto-apply',
  nextScan: 'Next scan',
  dailyDigest: 'Daily digest',
  highMatchEmail: 'High-match email',
  quietHours: 'Quiet hours',
  emailQuota: 'Email quota/day',
  threshold: 'Threshold',
  status: 'Status',
  candidateHomeTitle: 'Your career operations desk',
  candidateHomeCopy: 'Browse jobs like a normal portal while AutoPilot tracks scores, alerts, and policy-based applications.',
  recruiterHomeTitle: 'Recruiting control plane',
  recruiterHomeCopy: 'Manage JDs, rankings, potential pools, approval queues, and audit summaries in one operating surface.',
  uploadTitle: 'Upload CV for JD ranking',
  uploadCopy: 'Drop a PDF, inspect processing state, and receive matched job rankings after scoring.',
  profileTitle: 'Desired profile',
  recommendationsTitle: 'Top JD recommendations',
  applicationsTitle: 'Application history',
  automationTitle: 'AutoFit policy settings',
  confirmTitle: 'Confirm email action',
  resultTitle: 'Action result',
  confirm: 'Confirm',
  reject: 'Reject',
  validUntil: 'Valid until',
  passwordless: 'Send magic link',
  email: 'Email',
  password: 'Password',
  sendLink: 'Send link',
  signIn: 'Enter dashboard',
  language: 'Language',
  viewDetail: 'View detail',
  activeJobs: 'Active jobs',
  pendingApprovals: 'Pending approvals',
  highMatches: 'High matches',
  invitesSent: 'Invites sent',
  jobTrend: 'JD and matching trend',
};

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const storageKey = 'careerfit-language';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = window.localStorage.getItem(storageKey);
    return stored === 'en' || stored === 'vi' ? stored : 'vi';
  });

  const value = useMemo<LanguageContextValue>(() => {
    const dictionary = language === 'vi' ? vi : en;
    return {
      language,
      setLanguage: (nextLanguage) => {
        setLanguageState(nextLanguage);
        window.localStorage.setItem(storageKey, nextLanguage);
        document.documentElement.lang = nextLanguage;
      },
      t: (key) => dictionary[key] ?? key,
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider');
  }
  return context;
}
