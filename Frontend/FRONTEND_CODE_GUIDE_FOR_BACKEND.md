# Hướng Dẫn Đọc Hiểu Frontend CareerFit Cho Backend Developer

Tài liệu này viết cho hướng đi backend developer. Mục tiêu không phải biến bạn thành frontend developer chuyên sâu, mà giúp bạn đọc hiểu frontend đủ tốt để:

- biết frontend đang gọi API nào của backend;
- hiểu dữ liệu đi từ backend response tới UI như thế nào;
- debug lỗi contract giữa frontend và backend;
- biết phần nào đã nối backend thật, phần nào còn mock;
- nhờ Agent sửa frontend có kiểm soát;
- vibe coding frontend ở mức đủ dùng.

Frontend nằm tại:

```text
Frontend
```

Các file quan trọng nhất:

```text
package.json
src/main.tsx
src/App.tsx
src/lib/api.ts
src/types.ts
src/data/mock.ts
src/components/AppShell.tsx
src/i18n/LanguageProvider.tsx
src/styles.css
```

## 1. Frontend Này Là Gì?

Frontend CareerFit là React single-page app cho hệ thống CareerFit IT AutoPilot.

Nó phục vụ các luồng:

- Public user xem danh sách job và job detail.
- Candidate đăng nhập, xem job feed, upload CV, hồ sơ, ứng tuyển, automation.
- Recruiter đăng nhập, xem dashboard, jobs, ranking/applicants, analytics, settings.
- Candidate và recruiter đã có trang Advanced Analytics riêng theo role.
- UI hiện có lớp UX polish: job card có company avatar/metadata icon/insight row, search suggestions và modal có animation, job list có skeleton loading, focus visible và reduced-motion support.
- Gọi backend Spring API nếu backend đang chạy.
- Fallback sang mock data nếu backend lỗi hoặc chưa chạy.

Tech stack:

| Công nghệ | Vai trò |
| --- | --- |
| React 18 | Xây UI bằng component |
| TypeScript | Kiểm tra kiểu dữ liệu |
| Vite | Dev server và build tool |
| React Router | Điều hướng route trong SPA |
| TanStack React Query | Fetch, cache, refetch API |
| Recharts | Chart |
| Lucide React | Icon |
| CSS thường | Toàn bộ style trong `styles.css` |

Với backend developer, trục đọc quan trọng là:

```text
Route -> Page component -> React Query hook -> careerfitApi method -> DTO mapper -> UI type -> component hiển thị
```

## 2. Chạy Frontend

Từ thư mục frontend:

```powershell
cd Frontend
npm install
npm run dev
```

Mặc định Vite chạy tại:

```text
http://127.0.0.1:5173/
```

Build check:

```powershell
npm run build
```

Nếu port 5173 bận:

```powershell
npm run dev -- --port 5174
```

Lưu ý CORS: backend mặc định cho phép `http://localhost:5173` và `http://127.0.0.1:5173`. Nếu đổi port frontend, cần cập nhật `CORS_ORIGINS` ở backend.

Advanced Analytics contract cho UI nằm tại:

```text
Frontend/ADVANCED_ANALYTICS_API.md
```

Route UI hiện tại:

```text
/candidate/advanced-analytics
/recruiter/advanced-analytics
```

`/recruiter/analytics` vẫn là trang Thống kê cũ/basic analytics. Advanced Analytics dùng route riêng để backend developer không nhầm hai contract.

## 3. Cách Đọc Frontend Nếu Bạn Là Backend Dev

Đừng bắt đầu từ CSS. Hãy bắt đầu từ route và API.

Khi thấy một màn hình, hỏi:

1. Route nào render màn hình này?
2. Component/page nào xử lý route đó?
3. Page đó lấy data từ hook nào?
4. Hook đó gọi method nào trong `careerfitApi`?
5. Method đó gọi endpoint backend nào?
6. Backend response được map sang UI type ra sao?

Ví dụ public job search:

```text
/jobs?keyword=React
  -> CandidateJobsPage(isPublic=true)
  -> useJobs({ isPublic, keyword })
  -> careerfitApi.searchJobs(keyword)
  -> GET /api/jobs/search?page=0&size=20&sort=recent&keyword=React
  -> mapPublicJob(dto)
  -> Job[]
  -> JobListWithPreview / JobCard
```

Ví dụ Advanced Analytics recruiter:

```text
/recruiter/advanced-analytics
  -> AdvancedAnalyticsPage(role="recruiter")
  -> useAdvancedMarketAnalytics()
  -> GET /api/analytics/market/overview?rangeDays=30
  -> GET /api/analytics/market/skills?top=12
  -> GET /api/analytics/market/salary
  -> GET /api/analytics/market/trends?days=30
  -> useRecruiterAdvancedAnalytics(true)
  -> GET /api/recruiter/analytics/overview?rangeDays=30
  -> GET /api/recruiter/analytics/trends?days=30
```

Ví dụ Candidate Advanced Analytics tương tự nhưng role panel gọi `/api/candidate/analytics/overview` và `/api/candidate/analytics/match-trends`.

Đây là cách đọc frontend hiệu quả nhất cho người làm backend.

## 4. Package Và Build System

Mở:

```text
package.json
vite.config.ts
tsconfig.json
index.html
```

`package.json` có scripts:

```json
{
  "dev": "vite --host 127.0.0.1",
  "build": "tsc --noEmit && vite build",
  "preview": "vite preview --host 127.0.0.1"
}
```

Ý nghĩa:

- `npm run dev`: chạy dev server.
- `npm run build`: TypeScript type-check rồi build production.
- `npm run preview`: preview build output.

`vite.config.ts`:

```ts
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
```

`index.html` chỉ có root:

```html
<div id="root"></div>
<script type="module" src="/src/main.tsx"></script>
```

React sẽ render toàn bộ app vào `#root`.

## 5. Entry Point: main.tsx

Mở:

```text
src/main.tsx
```

Code chính:

```tsx
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </LanguageProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
```

Ý nghĩa:

- `ReactDOM.createRoot(...).render(...)`: mount app vào HTML.
- `React.StrictMode`: kiểm tra thêm trong dev mode.
- `QueryClientProvider`: cung cấp React Query toàn app.
- `LanguageProvider`: cung cấp hàm dịch `t(key)`.
- `BrowserRouter`: bật routing kiểu `/jobs`, `/candidate`, `/recruiter`.
- `<App />`: component chính.

React Query config:

```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    },
  },
});
```

Ý nghĩa:

- Data được coi là fresh trong 30 giây.
- Khi focus lại tab browser, query có thể refetch.

Backend note: nếu thấy API bị gọi lại khi quay lại tab, đó là hành vi bình thường của React Query.

## 6. App.tsx Là File Gì?

Mở:

```text
src/App.tsx
```

File này hiện đang khá lớn. Nó chứa:

- session/account state;
- route config;
- protected route;
- hầu hết page components;
- custom hooks gọi API;
- một số UI helper.

Không cần đọc từ trên xuống dưới một lần. Hãy đọc theo cụm:

| Cụm | Cần hiểu |
| --- | --- |
| `App()` | session, routes, protectedRoute |
| `LoginPage` | login flow |
| `CandidateHomePage` | home/dashboard public/candidate |
| `CandidateJobsPage` | job search/feed |
| `JobDetailPage` | job detail |
| `RecruiterHomePage` | recruiter dashboard |
| `RecruiterJobsPage` | recruiter job workspace |
| `useJobs`, `useJobDetail`, `useSearchSuggestions` | data fetching |
| `useRecruiterSummary`, `useRecruiterJobs` | recruiter API hooks |

Tìm nhanh bằng:

```powershell
rg -n "function useJobs|function CandidateJobsPage|careerfitApi" src/App.tsx
```

## 7. Routing Và Role Guard

Trong `App()`:

```tsx
const [account, setAccount] = useState<MockAccount | null>(() => careerfitApi.restoreAccount());
```

`account` là session object phía frontend. Nó được restore từ localStorage khi reload page.

Role guard:

```tsx
function protectedRoute(role: Role, element: ReactNode) {
  if (!account) {
    return <LoginRequiredPage nextPath={`${location.pathname}${location.search}`} />;
  }

  if (account.role !== role) {
    return <Navigate to={account.role === 'candidate' ? '/candidate' : '/recruiter'} replace />;
  }

  return element;
}
```

Ý nghĩa:

- Chưa login: hiện màn hình yêu cầu đăng nhập.
- Sai role: redirect về dashboard đúng role.
- Đúng role: render page.

Quan trọng: đây chỉ là guard UX ở frontend. Backend vẫn phải tự bảo vệ endpoint bằng Spring Security.

## 8. Route Map

Public routes:

| Path | Component |
| --- | --- |
| `/` | `CandidateHomePage isPublic` |
| `/jobs` | `CandidateJobsPage isPublic` |
| `/jobs/:jobId` | `JobDetailPage isPublic` |
| `/login` | `LoginPage` |
| `/register` | `LoginPage mode="register"` |
| `/automation/confirm` | `AutomationConfirmPage` |
| `/automation/result` | `AutomationResultPage` |

Candidate routes:

| Path | Component |
| --- | --- |
| `/candidate` | `CandidateHomePage` |
| `/candidate/jobs` | `CandidateJobsPage` |
| `/candidate/jobs/:jobId` | `JobDetailPage` |
| `/candidate/upload` | `UploadPage` |
| `/candidate/profile` | `ProfilePage` |
| `/candidate/recommendations` | `RecommendationsPage` |
| `/candidate/advanced-analytics` | `AdvancedAnalyticsPage` |
| `/candidate/applications` | `ApplicationsPage` |
| `/candidate/automation` | `AutomationPage` |
| `/candidate/settings` | `CandidateSettingsPage` |

Recruiter routes:

| Path | Component |
| --- | --- |
| `/recruiter` | `RecruiterHomePage` |
| `/recruiter/jobs` | `RecruiterJobsPage` |
| `/recruiter/jobs/:jobId` | `RecruiterJobsPage` |
| `/recruiter/jobs/:jobId/ranking` | `RecruiterJobsPage` |
| `/recruiter/jobs/:jobId/applicants` | `RecruiterJobsPage` |
| `/recruiter/jobs/:jobId/potential` | `RecruiterJobsPage` |
| `/recruiter/analytics` | `AnalyticsPage` |
| `/recruiter/advanced-analytics` | `AdvancedAnalyticsPage` |
| `/recruiter/automation` | `AutomationPage` |
| `/recruiter/settings` | `RecruiterSettingsPage` |

## 9. AppShell: Layout Và Navigation

Mở:

```text
src/components/AppShell.tsx
```

`AppShell` là layout chung:

- header;
- brand;
- top navigation;
- role chip;
- notification/settings buttons;
- language switch;
- `<Outlet />` để render route con.

React Router pattern:

```tsx
<Route element={<AppShell role={account?.role ?? 'guest'} />}>
  <Route path="/jobs" element={<CandidateJobsPage isPublic />} />
</Route>
```

`Outlet` trong `AppShell` là nơi route con được hiển thị.

Navigation thay đổi theo role:

- guest: dashboard, jobs, upload, profile, recommendations, applications, automation;
- candidate: dashboard, jobs, upload, profile, recommendations, advanced analytics, applications, automation;
- recruiter: dashboard, jobs, basic analytics, advanced analytics, automation.

## 10. API Client: File Quan Trọng Nhất Với Backend Dev

Mở:

```text
src/lib/api.ts
```

Đây là nơi contract frontend-backend gặp nhau.

### 10.1 API Base URL

```ts
const API_BASE_URL = (importMeta.env?.VITE_API_BASE_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');
```

Default:

```text
http://localhost:8080/api
```

Nếu cần đổi backend URL:

```powershell
$env:VITE_API_BASE_URL="http://localhost:8081/api"
npm run dev
```

Vite chỉ expose env bắt đầu bằng `VITE_`.

### 10.2 LocalStorage Keys

```ts
const TOKEN_KEY = 'careerfit.accessToken';
const ACCOUNT_KEY = 'careerfit.account';
```

Sau login:

- JWT lưu ở `careerfit.accessToken`.
- Account UI lưu ở `careerfit.account`.

Logout sẽ xóa cả hai.

Security note: localStorage tiện cho dev/demo nhưng có rủi ro XSS. Production có thể cần chiến lược token khác.

### 10.3 request<T>

Hàm trung tâm:

```ts
async function request<T>(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error?.message ?? `Request failed: ${response.status}`);
  }

  return payload.data;
}
```

Điều này nghĩa là frontend kỳ vọng backend response luôn có envelope:

```ts
type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error?: { code?: string; message?: string };
};
```

Nếu backend trả raw object không có `success` và `data`, frontend sẽ coi là lỗi.

## 11. API Methods Đang Có

Trong `careerfitApi` hiện có:

| Frontend method | Backend endpoint |
| --- | --- |
| `login(identifier, password)` | `POST /api/auth/login` |
| `requestPasswordless(email)` | `POST /api/auth/passwordless/request` |
| `verifyPasswordless(token)` | `POST /api/auth/passwordless/verify` |
| `searchJobs(keyword)` | `GET /api/jobs/search` |
| `getJob(jobId)` | `GET /api/jobs/{jobId}` |
| `getCandidateJobs()` | `GET /api/matches/me/cards?page=0&size=20` |
| `getSearchSuggestions(keyword)` | `GET /api/jobs/search/suggestions` |
| `getRecruiterDashboard()` | `GET /api/recruiter/dashboard` |
| `getRecruiterJobs()` | `GET /api/recruiter/jobs` |

Các phần UI còn chủ yếu mock/static:

- Apply job.
- Upload CV thật.
- Manual CV submit.
- Candidate profile update.
- CV management.
- Applications list.
- Automation policy update.
- Feedback good/bad/potential.
- Recruiter ranking/applicants chi tiết.
- Analytics thật.

## 12. DTO Mapping: Backend Shape Sang UI Shape

Trong `api.ts`, frontend định nghĩa DTO theo backend response:

```ts
type JobCardDto = {
  id: string;
  title: string;
  company: string;
  location?: string | null;
  remoteType?: string | null;
  seniorityLevel?: string | null;
  employmentType?: string | null;
  salary?: SalaryDisplayDto | null;
  requiredSkills?: string[] | null;
  language?: string | null;
  status?: string | null;
  createdAt?: string | null;
};
```

Sau đó map sang UI type `Job`:

```ts
export function mapPublicJob(dto: JobCardDto | JobDetailDto, index = 0): Job {
  const fallback = publicJobFallback(index);
  return {
    id: dto.id,
    title: dto.title,
    company: dto.company,
    location: [dto.location, dto.remoteType].filter(Boolean).join(', ') || fallback.location,
    seniority: dto.seniorityLevel ?? dto.employmentType ?? fallback.seniority,
    ...
  };
}
```

Vì sao cần mapper?

- Backend DTO thường giữ field nghiệp vụ rõ ràng.
- UI type thường đã format sẵn để render.
- Một field UI có thể ghép từ nhiều field backend.

Ví dụ:

```text
backend: location + remoteType
frontend: location string đã ghép
```

```text
backend: salary object
frontend: salary string
```

Backend developer nên đọc mapper để biết frontend thực sự cần field nào.

## 13. Fallback Mock Trong Mapper

Mapper dùng fallback:

```ts
const fallback = publicJobFallback(index);
```

Ví dụ:

```ts
requiredSkills: dto.requiredSkills?.length ? dto.requiredSkills : fallback.requiredSkills
```

Hệ quả:

- UI vẫn đẹp khi backend thiếu field.
- Nhưng lỗi backend thiếu field có thể bị che.
- Khi test contract thật, phải xem Network response, không chỉ nhìn UI.

## 14. Label Mapping

Backend label:

```text
LOW / MEDIUM / HIGH / POTENTIAL
```

Frontend label:

```ts
type MatchLabel = 'Low' | 'Medium' | 'High' | 'Potential';
```

Mapping:

```ts
function normalizeLabel(label?: string | null): MatchLabel {
  const normalized = label?.toLowerCase();
  if (normalized === 'low') return 'Low';
  if (normalized === 'medium') return 'Medium';
  if (normalized === 'potential') return 'Potential';
  return 'High';
}
```

Nếu backend trả label null hoặc unknown, frontend mặc định là `High`. Khi debug điểm matching, cần nhớ điểm này.

## 15. types.ts: UI Domain Model

Mở:

```text
src/types.ts
```

Type quan trọng nhất:

```ts
export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  seniority: string;
  language: string;
  salary: string;
  requiredSkills: string[];
  optionalSkills: string[];
  description: string;
  normalizedScore: number;
  label: MatchLabel;
  isPotential: boolean;
  reasons: string[];
  status: 'new' | 'saved' | 'applied' | 'skipped';
  postedAt: string;
}
```

Nhiều backend DTO cuối cùng đều bị map về `Job` để UI render card/detail.

Các type khác:

- `MockAccount`: session frontend.
- `Role`: `candidate | recruiter`.
- `AutomationPolicy`: shape panel AutoFit.
- `Application`: application mock.
- `RecruiterSummary`: stats recruiter.
- `TrendPoint`: data chart.
- `EmailAction`: mock email action confirm.

## 16. Login Flow

Trong `App.tsx`:

```tsx
async function handleLogin(username: string, password: string) {
  try {
    const apiAccount = await careerfitApi.login(username, password);
    setAccount(apiAccount);
    return apiAccount;
  } catch {
    const nextAccount = mockAccounts.find((item) => item.username === username.trim() && item.password === password);
    if (!nextAccount) {
      return null;
    }

    setAccount(nextAccount);
    return nextAccount;
  }
}
```

Flow:

```text
1. User nhập username/password.
2. Gọi careerfitApi.login.
3. API client POST /auth/login.
4. Nếu thành công, lưu JWT + account vào localStorage.
5. setAccount để UI đổi role.
6. Nếu backend lỗi, fallback mock ca/1 hoặc re/1.
```

Backend expected response:

```json
{
  "success": true,
  "data": {
    "accessToken": "...",
    "tokenType": "Bearer",
    "expiresIn": 86400,
    "user": {
      "id": "...",
      "email": "ca",
      "fullName": "Demo Candidate",
      "role": "CANDIDATE",
      "emailVerified": true
    }
  }
}
```

`toAccount(payload)` map role backend sang role frontend:

```text
CANDIDATE -> candidate
RECRUITER -> recruiter
```

## 17. React Query Hooks

Các hook cuối `App.tsx` là nơi gọi API.

### 17.1 useSearchSuggestions

```tsx
function useSearchSuggestions(query: string) {
  const fallback = useMemo(() => getMockSearchSuggestions(query), [query]);
  const { data } = useQuery({
    queryKey: ['job-search-suggestions', query],
    enabled: query.trim().length > 0,
    queryFn: () => careerfitApi.getSearchSuggestions(query),
    staleTime: 60_000,
    retry: false,
  });

  return data?.some((group) => group.items.length > 0) ? data : fallback;
}
```

Ý nghĩa:

- Query rỗng thì không gọi API.
- Gọi backend suggestions.
- Nếu backend trả rỗng hoặc lỗi, dùng mock suggestions.

### 17.2 useJobs

```tsx
function useJobs({ isPublic, keyword = '' }) {
  return useQuery({
    queryKey: [isPublic ? 'public-jobs' : 'candidate-jobs', keyword],
    queryFn: async () => {
      try {
        return isPublic ? await careerfitApi.searchJobs(keyword) : await careerfitApi.getCandidateJobs();
      } catch {
        await delay(160);
        return keyword ? getLocallyFilteredJobs(jobs, keyword) : jobs;
      }
    },
    refetchInterval: 60_000,
  });
}
```

Nếu public:

```text
GET /api/jobs/search
```

Nếu candidate:

```text
GET /api/matches/me/cards
```

Nếu lỗi:

```text
mock jobs
```

Quan trọng: candidate route cần JWT. Nếu token sai, API lỗi, UI vẫn có thể fallback mock. Đừng kết luận backend đúng chỉ vì UI vẫn có data.

### 17.3 useJobDetail

Public detail:

```text
GET /api/jobs/{jobId}
```

Candidate detail gọi thêm:

```text
GET /api/matches/me/cards
```

Mục tiêu là merge job detail public với score cá nhân:

```ts
{
  ...publicJob,
  normalizedScore: personalizedJob.normalizedScore,
  label: personalizedJob.label,
  isPotential: personalizedJob.isPotential,
  reasons: personalizedJob.reasons,
}
```

Backend note: endpoint job detail public không cần trả score cá nhân. Score đến từ matching endpoint.

### 17.4 useRecruiterSummary và useRecruiterJobs

```text
GET /api/recruiter/dashboard
GET /api/recruiter/jobs
```

Cần JWT role recruiter.

## 18. Data Flow Các Màn Hình Chính

### 18.1 Public Home

Route:

```text
/
```

Component:

```text
CandidateHomePage isPublic
```

Data:

```text
useJobs({ isPublic: true })
  -> careerfitApi.searchJobs('')
  -> GET /api/jobs/search?page=0&size=20&sort=recent
```

Backend connected:

- public job search;
- search suggestions.

Static/mock:

- market dashboard numbers;
- top employers list.

### 18.2 Public Jobs Search

Route:

```text
/jobs?keyword=React
```

Component:

```text
CandidateJobsPage isPublic
```

Data:

```text
useJobs({ isPublic: true, keyword })
```

Search update URL bằng:

```tsx
setSearchParams(keyword ? { keyword } : {});
```

Khi URL query đổi, React Query refetch theo `queryKey`.

### 18.3 Candidate Job Feed

Route:

```text
/candidate/jobs
```

Data:

```text
useJobs({ isPublic: false })
  -> careerfitApi.getCandidateJobs()
  -> GET /api/matches/me/cards?page=0&size=20
```

Backend response expected:

```ts
type CandidateJobListDto = {
  jobs: CandidateJobCardDto[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
};
```

Mỗi candidate job card cần:

- `id`
- `title`
- `company`
- `location`
- `remoteType`
- `seniorityLevel`
- `employmentType`
- `salaryDisplay`
- `requiredSkills`
- `optionalSkills`
- `normalizedScore`
- `label`
- `isPotential`
- `reasons`
- `potentialReason`
- `matchedAt`

### 18.4 Job Detail

Routes:

```text
/jobs/:jobId
/candidate/jobs/:jobId
```

Component:

```text
JobDetailPage
```

Data:

```text
useJobDetail(jobId, fallbackJob, isPublic)
```

UI:

- `JobDetailContent`
- `StickyApplyBar`
- `LoginPromptModal` nếu public user bấm apply.

Apply button hiện chưa submit backend application thật.

### 18.5 Recruiter Dashboard

Route:

```text
/recruiter
```

Data:

```text
useRecruiterSummary()
  -> GET /api/recruiter/dashboard
```

Mapping:

```ts
return {
  activeJobs: payload.activeJobs,
  pendingApprovals: payload.pendingReview,
  highMatches: payload.totalApplicants,
  invitesSent: payload.recentJobs,
};
```

Backend field name và UI field name khác nhau, nên mapper là nơi cần đọc.

### 18.6 Recruiter Jobs

Routes:

```text
/recruiter/jobs
/recruiter/jobs/:jobId
/recruiter/jobs/:jobId/ranking
/recruiter/jobs/:jobId/applicants
/recruiter/jobs/:jobId/potential
```

Tất cả render:

```text
RecruiterJobsPage
```

Data hiện có:

```text
useRecruiterJobs()
  -> GET /api/recruiter/jobs
```

Các route ranking/applicants/potential hiện chưa gọi endpoint riêng như:

```text
GET /api/recruiter/jobs/{jobId}/ranking
GET /api/recruiter/jobs/{jobId}/applicants
GET /api/recruiter/jobs/{jobId}/top-candidates
```

Nếu cần nối thật, bắt đầu từ `api.ts` và `RecruiterJobsPage`.

## 19. Mock Data Và Fallback

Mở:

```text
src/data/mock.ts
```

Mock gồm:

- `mockAccounts`
- `candidate`
- `preference`
- `automationPolicy`
- `jobs`
- `applications`
- `recruiterSummary`
- `trends`
- `emailAction`
- `delay`

Mock được dùng khi:

1. UI chưa nối backend thật.
2. Backend chưa chạy hoặc request lỗi.
3. Backend response thiếu field, mapper fallback.

Cách kiểm tra data thật:

```text
1. Mở DevTools Network.
2. Filter "api".
3. Xem request có gọi localhost:8080/api không.
4. Xem response JSON.
5. Xem Authorization header.
```

## 20. Components Cơ Bản

### 20.1 JobCard

Mở:

```text
src/components/JobCard.tsx
```

Props:

```ts
interface JobCardProps {
  job: Job;
  onSkip?: (id: string) => void;
  onOpen?: (job: Job) => void;
  onApply?: (job: Job) => void;
  showMatchMeta?: boolean;
}
```

`JobCard` chỉ biết render UI type `Job`. Nó không biết backend DTO.

Button:

- Apply gọi `onApply`.
- Save hiện UI, chưa nối backend.
- Skip gọi `onSkip`.
- Detail gọi `onOpen`.

### 20.2 Badges

Mở:

```text
src/components/Badges.tsx
```

`MatchingBadge` hiển thị:

```text
score% · Cao / Trung bình
```

Màu phụ thuộc vào score.

Lưu ý:

```ts
const labelText = label === 'High' ? t('matchHigh') : t('matchMedium');
```

Nếu label là `Low` hoặc `Potential`, text vẫn rơi vào `matchMedium`. Nếu cần hiển thị chính xác hơn, sửa ở đây.

### 20.3 AutomationPolicyPanel

Mở:

```text
src/components/AutomationPolicyPanel.tsx
```

Hiển thị `AutomationPolicy`. Các input/range/time hiện dùng `defaultValue`, chưa submit backend.

### 20.4 StatCard

Component hiển thị label/value/detail. Không có logic backend.

## 21. i18n: LanguageProvider

Mở:

```text
src/i18n/LanguageProvider.tsx
```

Có hai dictionary:

```ts
const vi: Dictionary = { ... }
const en: Dictionary = { ... }
```

Hook:

```ts
const { language, setLanguage, t } = useLanguage();
```

Sử dụng:

```tsx
{t('jobs')}
```

Nếu thiếu key:

```ts
t: (key) => dictionary[key] ?? key
```

UI sẽ hiện chính key. Nếu bạn thấy text như `missingKeyName`, nghĩa là thiếu translation.

Ngôn ngữ lưu ở localStorage:

```text
careerfit-language
```

## 22. CSS Và Visual Layer

Mở:

```text
src/styles.css
```

Backend dev không cần học sâu CSS, nhưng cần biết:

- Toàn bộ style nằm trong một file lớn.
- Class name trong JSX phải khớp CSS.
- Responsive có `@media (max-width: 1080px)` và `@media (max-width: 720px)`.
- CSS variables nằm ở `:root`.

Class quan trọng:

```text
.app-shell
.site-header
.portal-hero
.job-card
.match-badge
.jd-detail-page
.sticky-apply-bar
.recruiter-hr-dashboard
.settings-route
```

Khi UI vỡ layout:

```text
1. Tìm class trong JSX.
2. Search class trong styles.css.
3. Sửa đúng block CSS đó.
4. Chạy lại UI và kiểm tra responsive.
```

## 23. TypeScript Vừa Đủ Dùng

### 23.1 type và interface

```ts
export type Role = 'candidate' | 'recruiter';
```

Chỉ cho phép hai giá trị.

```ts
export interface Job { ... }
```

Mô tả shape object.

### 23.2 Optional và null

```ts
companyLogoUrl?: string | null;
```

Field có thể không tồn tại hoặc tồn tại nhưng null.

Fallback:

```ts
dto.location ?? fallback.location
```

`??` chỉ fallback khi giá trị là `null` hoặc `undefined`.

### 23.3 Generic

```ts
async function request<T>(...): Promise<T>
```

Gọi:

```ts
request<JobListDto>('/jobs/search')
```

Nghĩa là data response được type-check như `JobListDto`.

### 23.4 JSX

```tsx
return <JobCard job={job} onOpen={...} />;
```

JSX là syntax giống HTML trong TypeScript.

### 23.5 Hook

Hook thường bắt đầu bằng `use`:

- `useState`
- `useEffect`
- `useMemo`
- `useQuery`
- `useNavigate`
- `useParams`
- `useSearchParams`
- `useLanguage`

Quy tắc: hook phải được gọi ở top-level của component/hook, không gọi trong if/loop.

## 24. React Vừa Đủ Dùng

Component:

```tsx
function StatCard({ label, value, detail }: StatCardProps) {
  return <section>...</section>;
}
```

State:

```tsx
const [query, setQuery] = useState('');
```

Effect:

```tsx
useEffect(() => {
  window.scrollTo({ top: 0 });
}, [job.id]);
```

Conditional render:

```tsx
{isFilterOpen ? <FilterModal /> : null}
```

Derived data:

```tsx
const filteredJobs = useFilteredJobs(sourceJobs, query);
```

## 25. Contract Backend-Frontend Đang Dùng

### 25.1 Auth

Request:

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "ca",
  "password": "1"
}
```

Expected data:

```ts
type AuthResponseDto = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    emailVerified: boolean;
  };
};
```

Passwordless request:

```http
POST /api/auth/passwordless/request
Content-Type: application/json

{
  "email": "candidate@example.com"
}
```

Expected data:

```ts
type PasswordlessRequestResponseDto = {
  message: string;
  token: string | null; // dev only; prod returns null
  expiresInMinutes: number;
};
```

Frontend should show a neutral success message after request. In dev it may use `data.token` for local testing; in prod the user receives the link by email and `token` is null.

### 25.2 Public Job List

Request:

```http
GET /api/jobs/search?page=0&size=20&sort=recent&keyword=React
```

Expected:

```ts
type JobListDto = {
  jobs: JobCardDto[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
};
```

### 25.3 Public Job Detail

Request:

```http
GET /api/jobs/{jobId}
```

Expected:

```ts
type JobDetailDto = JobCardDto & {
  niceToHaveSkills?: string[] | null;
  originalText?: string | null;
  updatedAt?: string | null;
};
```

### 25.4 Candidate Matching Cards

Request:

```http
GET /api/matches/me/cards?page=0&size=20
Authorization: Bearer <token>
```

Expected:

```ts
type CandidateJobListDto = {
  jobs: CandidateJobCardDto[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
};
```

Card DTO:

```ts
type CandidateJobCardDto = {
  matchingId?: string | null;
  id: string;
  title: string;
  company: string;
  companyLogoUrl?: string | null;
  location?: string | null;
  remoteType?: string | null;
  seniorityLevel?: string | null;
  employmentType?: string | null;
  salaryDisplay?: string | null;
  requiredSkills?: string[] | null;
  optionalSkills?: string[] | null;
  normalizedScore?: number | string | null;
  label?: string | null;
  isPotential?: boolean;
  reasons?: string[] | null;
  potentialReason?: string | null;
  matchedAt?: string | null;
};
```

### 25.5 Search Suggestions

Request:

```http
GET /api/jobs/search/suggestions?keyword=React
```

Expected:

```ts
type SuggestionsDto = {
  titles?: string[] | null;
  companies?: string[] | null;
  skills?: string[] | null;
};
```

### 25.6 Recruiter Dashboard

Request:

```http
GET /api/recruiter/dashboard
Authorization: Bearer <token>
```

Expected:

```ts
type RecruiterDashboardDto = {
  totalJobs: number;
  activeJobs: number;
  totalApplicants: number;
  pendingReview: number;
  recentJobs: number;
};
```

### 25.7 Recruiter Jobs

Request:

```http
GET /api/recruiter/jobs
Authorization: Bearer <token>
```

Expected:

```ts
type RecruiterJobDto = {
  id: string;
  title: string;
  company: string;
  location?: string | null;
  seniorityLevel?: string | null;
  status?: string | null;
  applicantCount?: number;
  matchCount?: number;
  createdAt?: string | null;
};
```

## 26. Debug Lỗi Backend-Frontend

### 26.1 UI vẫn có data dù backend lỗi

Nguyên nhân thường gặp:

- fallback mock;
- mapper fallback field;
- React Query cache;
- request bị catch rồi trả mock.

Cách kiểm tra:

```text
1. Mở DevTools Network.
2. Filter "api".
3. Xem status code.
4. Xem response có success/data không.
5. Xem Authorization header.
6. Clear localStorage nếu nghi token/account cũ.
```

LocalStorage keys:

```text
careerfit.accessToken
careerfit.account
careerfit-language
```

### 26.2 401 Unauthorized

Kiểm tra:

- Đã login backend thành công chưa?
- localStorage có `careerfit.accessToken` không?
- Request có `Authorization: Bearer ...` không?
- JWT hết hạn chưa?
- Backend route có yêu cầu role không?

### 26.3 403 Forbidden

Thường do:

- candidate gọi recruiter route;
- recruiter gọi candidate route;
- user không sở hữu resource;
- backend service check ownership fail.

### 26.4 CORS Error

Backend config mặc định:

```yaml
app.cors.allowed-origins: http://localhost:5173,http://127.0.0.1:5173
```

Nếu frontend chạy port 5174, cần cập nhật CORS ở backend.

### 26.5 Response Shape Mismatch

Frontend kỳ vọng:

```json
{
  "success": true,
  "data": {}
}
```

Nếu backend trả:

```json
{
  "jobs": []
}
```

Frontend sẽ fail vì `payload.success` không tồn tại.

Khi mismatch, sửa một trong hai nơi:

- backend DTO/response;
- frontend DTO/mapper trong `api.ts`.

Với vai trò backend dev, nên ưu tiên giữ API contract nhất quán và chỉ sửa mapper khi UI naming khác.

## 27. Những Phần Đã Nối Backend Thật

Đã có API client thật:

- Login.
- Public job search.
- Public job detail.
- Candidate matching cards.
- Search suggestions.
- Recruiter dashboard.
- Recruiter jobs list.

Chưa nối đầy đủ backend:

- Upload CV.
- Manual CV.
- Candidate profile update.
- CV management.
- Apply job.
- Applications page.
- Automation policy update.
- Feedback good/bad/potential.
- Recruiter ranking/applicants chi tiết.
- Analytics page.
- Employer detail/top employers.

Đây là roadmap thực tế nếu muốn tiếp tục nối frontend-backend.

## 28. Khi Nhờ Agent Sửa Frontend

Nên yêu cầu theo format:

```text
Sửa frontend route X để gọi backend endpoint Y.
Backend request body là ...
Backend response data là ...
Map sang UI type ... như sau ...
Giữ fallback mock nếu API lỗi.
Không đổi layout lớn.
Chạy npm run build sau khi sửa.
```

Ví dụ:

```text
Connect nút Apply trên JobDetailPage vào POST /api/applications.
Request body: { jobId, cvId?, coverLetter? }.
Response data: MyApplicationResponse.
Sau khi success hiển thị trạng thái Applied.
Giữ fallback mock nếu backend lỗi.
Sửa tối thiểu trong src/lib/api.ts và src/App.tsx.
Chạy npm run build.
```

Checklist review:

- Có method mới trong `careerfitApi` không?
- Endpoint đúng backend không?
- Request body đúng DTO backend không?
- Có gửi JWT không?
- Mapper xử lý null/empty không?
- UI có fallback hợp lý không?
- `npm run build` pass không?

## 29. Nếu Muốn Connect Thêm API Thật

Thứ tự an toàn:

1. Đọc backend controller/service/DTO.
2. Ghi request/response JSON expected.
3. Thêm DTO type vào `src/lib/api.ts`.
4. Thêm method vào `careerfitApi`.
5. Thêm mapper backend DTO -> UI type nếu cần.
6. Trong `App.tsx`, thay mock/hardcoded bằng `useQuery` hoặc mutation.
7. Giữ fallback mock nếu cần demo khi backend down.
8. Test bằng DevTools Network.
9. Chạy `npm run build`.

Không cần viết lại UI nếu chỉ đang connect API.

## 30. Naming Contract Cần Chú Ý

Backend Java DTO trả camelCase:

```text
normalizedScore
isPotential
requiredSkills
salaryDisplay
createdAt
```

Frontend UI type có thể đổi tên:

```text
seniorityLevel -> seniority
salaryDisplay / salary object -> salary string
matchReasons / reasons -> reasons
createdAt / matchedAt -> postedAt
```

Vì vậy mismatch thường nằm ở mapper, không nằm ở component.

## 31. Thứ Tự Đọc Code Khuyến Nghị

1. `package.json`: biết stack.
2. `src/main.tsx`: providers.
3. `src/types.ts`: UI model.
4. `src/lib/api.ts`: API contract và mapping.
5. `src/App.tsx` phần `App()` routes/protectedRoute.
6. `src/App.tsx` các hook cuối file.
7. `src/components/AppShell.tsx`: layout/nav.
8. `src/components/JobCard.tsx`: card render `Job`.
9. `src/i18n/LanguageProvider.tsx`: translation.
10. `src/data/mock.ts`: fallback.
11. `src/styles.css`: chỉ đọc class liên quan khi cần.

## 32. Bài Tập Đọc Hiểu

1. Login `ca / 1`, xem localStorage có token/account không.
2. Mở `/jobs?keyword=React`, xem request `/api/jobs/search`.
3. Mở `/candidate/jobs`, xem request `/api/matches/me/cards` có Authorization không.
4. Trong `api.ts`, đọc `mapCandidateJob`.
5. Stop backend, reload frontend, xem fallback mock hoạt động ra sao.
6. Login `re / 1`, mở `/recruiter`, xem request `/api/recruiter/dashboard`.
7. Tìm một text trên UI trong `LanguageProvider.tsx`.
8. Tìm một class trong JSX rồi sang `styles.css`.
9. Chạy `npm run build` để thấy type-check hoạt động.
10. Chọn một button chưa nối backend và lần ngược xem nó đang gọi handler nào.

## 33. Các Điểm Cần Cẩn Thận

- Frontend fallback mock nhiều, nên UI có data không đảm bảo backend đúng.
- `src/lib/api.ts` là source of truth cho contract hiện tại.
- `App.tsx` lớn, khi sửa nên scoped theo route/hook cụ thể.
- Protected route frontend chỉ là UX guard; backend security vẫn bắt buộc.
- Token lưu localStorage, khi test role nên clear localStorage nếu thấy hành vi lạ.
- React Query có cache/refetch, request có thể không gọi lại ngay nếu data còn fresh.
- Một số button có UI nhưng chưa nối backend.
- Analytics/market dashboard còn nhiều data hardcoded.
- Label unknown đang fallback thành `High`.
- Mapper fallback mock có thể che lỗi field null từ backend.

## 34. Tóm Tắt

Với backend developer, hãy đọc frontend theo trục:

```text
Route
  -> Page component
  -> React Query hook
  -> careerfitApi method
  -> Backend endpoint
  -> DTO mapper
  -> UI type
  -> Presentational component
```

Nắm được trục này là đủ để bạn debug API, review contract, và nhờ Agent sửa frontend một cách an toàn mà không cần tự trở thành frontend developer chuyên sâu.
