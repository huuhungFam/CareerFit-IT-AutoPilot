# Hướng Dẫn Đọc Hiểu Frontend CareerFit Cho Backend Developer

> Cập nhật theo mã nguồn ngày 18/07/2026: các luồng API-driven không fallback sang mock khi request lỗi. Source of truth là `src/lib/api.ts`, `src/lib/adminApi.ts`, `src/App.tsx`, `src/pages/AdminPages.tsx` và backend controller/DTO tương ứng.

Tài liệu này viết cho hướng đi backend developer. Mục tiêu không phải biến bạn thành frontend developer chuyên sâu, mà giúp bạn đọc hiểu frontend đủ tốt để:

- biết frontend đang gọi API nào của backend;
- hiểu dữ liệu đi từ backend response tới UI như thế nào;
- debug lỗi contract giữa frontend và backend;
- biết phần nào đã nối backend thật, phần nào chỉ còn state/copy trình bày cục bộ;
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
- Hiển thị loading/error/empty state khi backend lỗi hoặc chưa chạy; không che lỗi bằng mock API data.

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
  "type-check": "tsc --noEmit",
  "lint": "eslint . --max-warnings=0",
  "test": "playwright test --project=chromium",
  "build": "tsc --noEmit && vite build",
  "check-bundle": "...",
  "preview": "vite preview --host 127.0.0.1"
}
```

Ý nghĩa:

- `npm run dev`: chạy dev server.
- `npm run type-check`: kiểm tra TypeScript mà không build.
- `npm run lint`: chạy ESLint, warning cũng làm command fail.
- `npm test`: chạy Playwright project Chromium.
- `npm run build`: TypeScript type-check rồi build production.
- `npm run check-bundle`: đảm bảo bundle production không bị hardcode `localhost:8080/api`.
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

`account` là session object phía frontend. Bản tạm được đọc từ `sessionStorage`, sau đó `restoreSession()` gọi `GET /api/auth/me` để revalidate user với backend. Response `401/403` sẽ xóa session; lỗi mạng tạm thời không tự xóa identity đã được backend xác nhận trước đó.

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
| `/auth/magic-link/verify` | `MagicLinkPage` |
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
| `/candidate/settings` | `ConnectedSettingsPage role="candidate"` |

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
| `/recruiter/settings` | `ConnectedSettingsPage role="recruiter"` |

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

### 10.2 SessionStorage Keys

```ts
const TOKEN_KEY = 'careerfit.accessToken';
const ACCOUNT_KEY = 'careerfit.account';
```

Sau login:

- JWT lưu ở `sessionStorage['careerfit.accessToken']`.
- Account UI lưu ở `sessionStorage['careerfit.account']`.

Logout sẽ xóa cả hai.

`sessionStorage` tách dữ liệu theo tab và tự mất khi đóng tab, nhưng JavaScript vẫn đọc được token. Nó giảm thời gian lưu so với `localStorage`, không loại bỏ rủi ro XSS; production vẫn cần CSP, tránh HTML không tin cậy và có thể cân nhắc HttpOnly cookie nếu đổi kiến trúc auth.

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

  const payload = (await response.json().catch(() => null)) as any;

  if (!response.ok || (payload && payload.success === false)) {
    throw new ApiRequestError(
      payload?.error?.message ?? payload?.message ?? `Request failed: ${response.status}`,
      response.status,
    );
  }

  return (payload?.data !== undefined ? payload.data : payload) as T;
}
```

Backend CareerFit chuẩn hóa response bằng envelope:

```ts
type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error?: { code?: string; message?: string };
};
```

`request<T>` vẫn chấp nhận raw payload để tương thích endpoint đặc biệt, nhưng contract chuẩn của project vẫn là `ApiResponse<T>`. Lỗi HTTP hoặc `success: false` trở thành `ApiRequestError` có cả `message` và `status`, nhờ đó `restoreSession()` phân biệt được `401/403` với lỗi mạng tạm thời. Với `FormData`, hàm không tự set `Content-Type` để browser thêm multipart boundary đúng.

## 11. API Methods Đang Có

Trong `careerfitApi` hiện có:

| Frontend method | Backend endpoint |
| --- | --- |
| `restoreSession()` / `getCurrentUser()` | `GET /api/auth/me` |
| `login(identifier, password)` | `POST /api/auth/login` |
| `register(email, password, fullName, role)` | `POST /api/auth/register` |
| `requestPasswordless(email)` | `POST /api/auth/passwordless/request` |
| `inspectPasswordlessToken(token)` | `GET /api/auth/passwordless/verify?token=...` |
| `verifyPasswordlessToken(token)` | `POST /api/auth/passwordless/verify` |
| `submitMatchFeedback(matchingId, type)` | `POST /api/matches/{matchingId}/feedback?type=...&channel=WEB` |
| `searchJobs(keyword)` | `GET /api/jobs/search` |
| `getJob(jobId)` | `GET /api/jobs/{jobId}` |
| `getFeaturedEmployers()` / `getEmployer(slug)` / `getEmployerJobs(slug)` | `/api/employers/*` public APIs |
| `getSimilarJobs(jobId)` | `GET /api/recommendations/jobs/{jobId}/similar` |
| `getRecommendations(limit)` | `GET /api/recommendations/jobs` |
| `getCandidateJobsPage(params)` | `GET /api/matches/me/cards?...` |
| `submitApplication(jobId)` | `POST /api/applications` |
| `getMyApplications(page, size)` | `GET /api/applications/me?...` |
| `withdrawApplication(applicationId)` | `DELETE /api/applications/{applicationId}` |
| `getSearchSuggestions(keyword)` | `GET /api/jobs/search/suggestions` |
| `getRecruiterDashboard()` | `GET /api/recruiter/dashboard` |
| `getRecruiterJobs()` | `GET /api/recruiter/jobs` |
| `getRecruiterCandidates(jobId, options)` | `GET /api/recruiter/jobs/{jobId}/candidates?...` |
| `inviteCandidate(jobId, candidateId)` | `POST /api/recruiter/jobs/{jobId}/candidates/{candidateId}/invite` |
| `updateApplicationStatus(applicationId, status)` | `PATCH /api/recruiter/applications/{applicationId}/status` |
| `getAutomationPolicy()` | `GET /api/automation/policy` |
| `updateAutomationPolicy(patch)` | `PATCH /api/automation/policy` |
| `updateEmailNotifications(enabled)` | `PATCH /api/automation/policy/email-notifications` |
| `runAutoApplyNow()` | `POST /api/automation/auto-apply/run-now` |
| `getCandidateProfile()` / `updateCandidateProfile(payload)` | `GET/PATCH /api/candidates/me` |
| `updateCandidateAccount(fullName)` | `PATCH /api/candidates/me/account` |
| `uploadCv(file)` / `createManualCv(payload)` | `POST /api/cv/upload`, `POST /api/cv/manual` |
| `getCandidateCvs()` / `getCv(id)` / `getCvStatus(id)` | CV list/detail/status APIs |
| `setDefaultCv(id)` / `deleteCv(id)` | CV default/delete APIs |
| `getPortfolio()` | `GET /api/candidates/me/portfolio` |
| `createPortfolioLink(payload)` | `POST /api/candidates/me/portfolio/links` |
| `updatePortfolioLink(linkId, payload)` | `PATCH /api/candidates/me/portfolio/links/{linkId}` |
| `deletePortfolioLink(linkId)` | `DELETE /api/candidates/me/portfolio/links/{linkId}` |
| `createPortfolioProject(payload)` | `POST /api/candidates/me/portfolio/projects` |
| `updatePortfolioProject(projectId, payload)` | `PATCH /api/candidates/me/portfolio/projects/{projectId}` |
| `deletePortfolioProject(projectId)` | `DELETE /api/candidates/me/portfolio/projects/{projectId}` |
| `getSettings()` / `updateSettings(values)` | `GET/PATCH /api/settings/me` |
| `createJob` / `updateJob` / `updateJobStatus` / `deleteJob` | Recruiter CRUD `/api/jobs/*` |
| `getMarketStats/Trend/Roles` | Basic market analytics APIs |
| `getAdvancedMarket*`, `getCandidateAdvanced*`, `getRecruiterAdvanced*` | Advanced Analytics APIs theo scope |

Các phần đã nối backend thật trong `api.ts`; request lỗi được giữ là lỗi để UI hiển thị đúng trạng thái:

- Login bằng `POST /api/auth/login`; tài khoản test `ca` / `1`, `re` / `1`, `ad` / `1` phải là seed thật từ backend và không tạo mock session nếu backend không chạy.
- Đăng ký bằng `POST /api/auth/register` và yêu cầu magic-link bằng `POST /api/auth/passwordless/request`.
- Public job search/detail/suggestions.
- Candidate job cards từ `/matches/me/cards`.
- Candidate apply, applications list và withdraw.
- Candidate Rocchio feedback; Recruiter dùng invite/application lifecycle actions riêng.
- Recruiter dashboard/jobs.
- Recruiter candidate discovery, invite candidate chưa apply và approve/reject application.
- Automation policy, email notification toggle và Auto-Apply `run-now`.
- Advanced Analytics theo role và market analytics.
- Candidate Portfolio links/projects CRUD, gồm loading, empty, error và delete confirmation state.
- Candidate upload PDF/ảnh/DOCX, OCR status polling và Manual CV.
- Candidate quản lý CV: list, detail, set default và delete có guard không xóa CV mặc định.
- Candidate/Recruiter Settings qua `GET/PATCH /api/settings/me`.
- Candidate fixed-profile account name qua `PATCH /api/candidates/me/account`.
- Candidate recommendations, dashboard counters và dashboard Apply dùng dữ liệu/mutation thật.
- Featured employer, employer detail/open jobs và similar jobs dùng API thật.
- Homepage Job Market Dashboard dùng basic market analytics và salary API thật.
- Recruiter create/edit/status/delete/export CSV cho JD.
- Admin dashboard/users/jobs/audit/email monitor không còn dữ liệu fallback giả.

Các phần UI còn chủ yếu static hoặc chưa có contract hoàn chỉnh:

- Save job/bookmark.
- Follow company và report job.
- Notification inbox/list.
- Delete account.

`src/data/mock.ts` chỉ còn được dùng cho một số giá trị/state trình bày cục bộ. Không được dùng trong `queryFn.catch`, mapper DTO, Admin API hoặc candidate/recruiter data fetch để biến lỗi backend thành dữ liệu giả.

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
export function mapPublicJob(dto: JobCardDto | JobDetailDto): Job {
  return {
    id: dto.id,
    title: dto.title,
    company: dto.company,
    location: [dto.location, dto.remoteType].filter(Boolean).join(', '),
    seniority: dto.seniorityLevel ?? dto.employmentType ?? '',
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

## 13. Giá Trị An Toàn Trong Mapper

Mapper chỉ dùng giá trị rỗng hoặc mặc định nghiệp vụ an toàn:

```ts
requiredSkills: dto.requiredSkills ?? []
normalizedScore: Number(dto.normalizedScore ?? 0)
```

Ví dụ:

```ts
location: [dto.location, dto.remoteType].filter(Boolean).join(', ')
```

Hệ quả:

- Field nullable không làm UI crash.
- Frontend không lấy field từ một mock job khác để bù contract thiếu.
- API lỗi vẫn đi qua error state của React Query.

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
- `Role`: `guest` ở app shell, và account role `candidate | recruiter | admin`.
- `AutomationPolicy`: shape panel AutoFit.
- `Application`: UI type map từ application backend.
- `RecruiterSummary`: stats recruiter.
- `TrendPoint`: data chart.
- `EmailAction`: UI model cho trạng thái action trong email/automation.

## 16. Login Flow

Trong `App.tsx`:

```tsx
async function handleLogin(username: string, password: string) {
  const normalizedUsername = username.trim();
  try {
    const apiAccount = await careerfitApi.login(normalizedUsername, password);
    setAccount(apiAccount);
    return apiAccount;
  } catch {
    return null;
  }
}
```

Flow:

```text
1. User nhập username/password.
2. Frontend gửi nguyên identifier vào backend, ví dụ `ca`, `re`, hoặc `ad`.
3. Backend seed test accounts dùng identifier ngắn `ca`, `re`, `ad`, nên đây là tài khoản thật phục vụ test nhanh.
4. API client gọi `POST /auth/login`.
5. Nếu thành công, lưu JWT + account vào `sessionStorage`.
6. setAccount để UI đổi role.
7. Nếu backend lỗi hoặc không có seed account tương ứng, login thất bại và UI giữ ở trang đăng nhập.
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
  const { data } = useQuery({
    queryKey: ['job-search-suggestions', query],
    enabled: query.trim().length > 0,
    queryFn: () => careerfitApi.getSearchSuggestions(query),
    staleTime: 60_000,
    retry: false,
  });

  return data ?? [];
}
```

Ý nghĩa:

- Query rỗng thì không gọi API.
- Gọi backend suggestions.
- Backend trả rỗng thì UI không hiện suggestions; backend lỗi được React Query giữ là lỗi.

### 17.2 useJobs

```tsx
function useJobs({ isPublic, keyword = '' }) {
  return useQuery({
    queryKey: [isPublic ? 'public-jobs' : 'candidate-jobs', keyword],
    queryFn: () => isPublic ? careerfitApi.searchJobs(keyword) : careerfitApi.getCandidateJobs(),
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
React Query giữ error state; page hiện thông báo và nút Retry
```

Quan trọng: candidate route cần JWT. Nếu token sai, API trả `401/403`; UI không thay bằng mock job. Khi debug vẫn cần xem Network vì React Query có thể đang hiển thị cache của request thành công trước đó.

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

`TopEmployers` gọi `GET /api/employers/featured`. `JobMarketDashboard` gọi `/api/analytics/stats`, `/trend`, `/roles` và `/api/analytics/market/salary`; mỗi cụm có loading/error/empty state riêng. Job trong employer detail lấy ID thật từ employer jobs API để link chi tiết không dẫn tới `404` giả.

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
useJobDetail(jobId, isPublic)
```

UI:

- `JobDetailContent`
- `StickyApplyBar`
- `LoginPromptModal` nếu public user bấm apply.

Apply button của Candidate gọi `careerfitApi.submitApplication(jobId)` -> `POST /api/applications`, sau đó invalidate/refetch danh sách ứng tuyển khi cần. Guest/public user vẫn mở `LoginPromptModal` thay vì submit application. Khu vực similar jobs gọi `GET /api/recommendations/jobs/{jobId}/similar`.

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
useQuery(['recruiter-candidates', selectedJob.id, candidateOptions])
  -> GET /api/recruiter/jobs/{jobId}/candidates?label=...&isPotential=...&applicationStatus=...&minScore=...&sort=...
```

Frontend không gọi riêng 3 endpoint legacy sau cho từng subview:

```text
GET /api/recruiter/jobs/{jobId}/ranking
GET /api/recruiter/jobs/{jobId}/applicants
GET /api/recruiter/jobs/{jobId}/top-candidates
```

Thay vào đó, `RecruiterJobsPage` dùng một discovery endpoint chung `/api/recruiter/jobs/{jobId}/candidates` và đổi query theo tab/filter. Nếu backend vẫn giữ các endpoint legacy này, chúng nên được xem là backward-compatible/read-only, không phải contract chính của UI hiện tại.

Recruiter candidate UI hiện có filter theo:

```text
match=HIGH
match=POTENTIAL
match=HIGH_OR_POTENTIAL
match=APPLIED
match=NOT_APPLIED
```

Frontend ưu tiên các field backend sau nếu endpoint ranking/applicant sau này trả về:

```ts
type RecruiterCandidateCardDto = {
  matchingId: string;
  name: string;
  title: string;
  normalizedScore: number;
  label: 'HIGH' | 'MEDIUM' | 'LOW' | 'POTENTIAL';
  isPotential: boolean;
  applicationStatus: 'APPLIED' | 'NOT_APPLIED';
  tieBreakReason?: string;
  skillOverlapCount?: number;
  jobFreshness?: string;
  salaryFit?: string;
  locationFit?: string;
};
```

Nếu backend không trả tie-break metadata, frontend vẫn sort ổn định theo score, label priority, và tên. Nếu filter không có ứng viên phù hợp, UI hiện empty state riêng thay vì để bảng trống.

### 18.7 Restore Session Và Magic Link

Khi `App()` mount:

```text
sessionStorage account/token
  -> careerfitApi.restoreSession()
  -> GET /api/auth/me
  -> map MeResponseDto thành MockAccount
  -> giữ route hiện tại nếu role hợp lệ
```

Route `/auth/magic-link/verify?token=...` chạy hai bước có chủ đích:

1. `GET /api/auth/passwordless/verify?token=...` chỉ inspect để hiển thị xác nhận.
2. Khi user bấm tiếp tục, `POST /api/auth/passwordless/verify` consume token, lưu JWT, gọi `/auth/me`, rồi redirect theo role.

Tách inspect và consume giúp việc chỉ mở link chưa tự đăng nhập hoặc dùng mất token.

### 18.8 Upload CV Và Polling

`UploadPage` gọi `uploadCv(file)` hoặc `createManualCv(payload)`. Backend trả `202 Accepted` cùng `cvId`; frontend tiếp tục:

```text
waitForCvProcessing(cvId)
  -> GET /api/cv/{cvId}/status mỗi 1,2 giây
  -> SCORING_DONE: invalidate CV, candidate jobs và recommendations
  -> FAILED: hiện failureReason
  -> quá 90 giây: báo timeout và cho kiểm tra lại
```

Polling cho phép tối đa ba lỗi tạm thời liên tiếp, nhưng dừng ngay với lỗi `4xx`. `AbortSignal` hủy vòng lặp nếu component unmount hoặc user bắt đầu upload khác.

`ProfilePage` dùng API thật để list/detail/set-default/delete CV. UI không cho xóa CV mặc định vì backend cũng enforce quy tắc này.

### 18.9 Recommendations Và Settings

`/candidate/recommendations` gọi riêng `GET /api/recommendations/jobs?limit=20`, không tái sử dụng matching feed. Điều này quan trọng vì recommendation có `finalScore`/boost theo profile, còn `/matches/me/cards` là score matching trực tiếp.

`ConnectedSettingsPage` gọi:

```text
GET /api/settings/me
PATCH /api/settings/me { values: <draft> }
```

Candidate và Recruiter dùng chung page component nhưng render field khác theo role. Frontend chỉ gửi map `values`; backend mới là nơi whitelist key, validate kiểu/range và merge với default.

## 19. Mock Data Và Error State

Mở:

```text
src/data/mock.ts
```

File này vẫn chứa một số fixture/default cũ như:

- `candidate`
- `preference`
- `automationPolicy`
- `jobs`
- `applications`
- `recruiterSummary`
- `trends`
- `emailAction`
- `delay`

Quy tắc hiện tại:

1. API lỗi phải đi vào `isError`/catch và hiển thị lỗi có thể retry, không trả fixture giả.
2. Login/register/magic-link chỉ tạo session khi backend trả JWT thật.
3. Mapper chỉ dùng giá trị rỗng/an toàn cho field optional như `[]`, `''`, `0` hoặc `Low`; không lấy một job mock khác để bù field thiếu.
4. Default cục bộ có thể dùng cho form draft trước khi query hoàn tất, nhưng khi backend đã trả data thì backend là nguồn sự thật.
5. Muốn biết một fixture còn được dùng ở đâu, chạy `rg -n "candidate|automationPolicy|jobs|applications" src` rồi đọc import thực tế; đừng suy luận chỉ từ việc file vẫn tồn tại.

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

Hiển thị `AutomationPolicy` bằng controlled inputs. Component nhận:

```ts
{
  policy: AutomationPolicy;
  onUpdate?: (patch: Partial<AutomationPolicy>) => void;
  isSaving?: boolean;
}
```

Trang `AutomationPage` gọi:

- `careerfitApi.getAutomationPolicy()`
- `careerfitApi.updateAutomationPolicy(patch)`
- `careerfitApi.updateEmailNotifications(enabled)` khi patch chỉ đổi `emailNotificationsEnabled`
- `careerfitApi.runAutoApplyNow()` cho nút `Run now`

Khi `emailNotificationsEnabled = false`, UI disable các control phụ thuộc email như high-match email, daily digest, email quota, cooldown, quiet hours và replacement-after-skip.

`src/lib/api.ts` chuẩn hóa contract Automation trước khi trả về UI:

- Backend `autopilotEnabled`/`notifyOnHighOnly` -> UI `highMatchEmailEnabled`.
- Backend `minScoreToNotify` -> UI `highMatchThreshold`.
- Backend `digestEnabled` -> UI `dailyDigestEnabled`.
- Backend `maxNotificationsPerDay` -> UI `maxEmailsPerDay`.
- UI patch cũng được map ngược trước khi gửi `PATCH /api/automation/policy`.

### 20.4 Candidate Jobs Pagination

Route `/candidate/jobs` gọi `careerfitApi.getCandidateJobsPage({ page, size: 20 })`. UI giữ các page đã tải trong state, render danh sách gộp, và nút `Xem thêm 20 việc làm` chỉ hiện khi `page + 1 < totalPages`.

### 20.5 Recruiter Portfolio Review

Recruiter candidate discovery dùng `GET /api/recruiter/jobs/{jobId}/candidates`. Mỗi candidate item có thể có:

- `portfolioVisible`
- `portfolio`
- `portfolioHiddenReason`

`CandidateReviewModal` chỉ render link/project portfolio khi `portfolioVisible=true`. Backend enforce quyền hiển thị theo setting `showPortfolioAfterApply` và trạng thái application; frontend không tự bypass bằng cách gọi Candidate Portfolio API.

### 20.6 StatCard

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
export type Role = 'candidate' | 'recruiter' | 'admin';
```

Chỉ cho phép ba giá trị role chính của UI.

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

Magic-link completion:

```http
GET  /api/auth/passwordless/verify?token=<raw-token>
POST /api/auth/passwordless/verify
GET  /api/auth/me
```

`GET` chỉ inspect. `POST` nhận `{ "token": "..." }`, consume token và trả `AuthResponseDto`; frontend lưu session rồi gọi `/auth/me` để lấy identity hiện hành. Reload page cũng revalidate bằng `/auth/me`, không chỉ tin object trong storage.

Test login đang dùng:

- Candidate: `ca` / `1`
- Recruiter: `re` / `1`
- Admin: `ad` / `1`

Ba account trên là data thật từ Flyway seed. Khi backend không chạy hoặc seed chưa có, frontend không tự tạo phiên mock cho login; cần khởi động backend và kiểm seed account trước khi test các route role-specific.

### 25.1.1 Admin MVP Contract

Frontend Admin nằm trong:

- `src/pages/AdminPages.tsx`: Dashboard, User Management, Job Moderation, Audit Logs, Email Monitor.
- `src/lib/adminApi.ts`: API client cho `/api/admin/*`, dùng chung hàm `request()` từ `src/lib/api.ts` để kế thừa auth header và error envelope.
- `src/components/AppShell.tsx`: sidebar/nav riêng cho role `admin`.
- `src/App.tsx`: route guard và redirect sau login cho `/admin/*`.

Các route UI:

```text
/admin
/admin/users
/admin/jobs
/admin/audit-logs
/admin/email-monitor
```

Các endpoint backend đang dùng:

```http
GET  /api/admin/dashboard
GET  /api/admin/users
GET  /api/admin/users/{userId}
POST /api/admin/users/{userId}/suspend
POST /api/admin/users/{userId}/activate
GET  /api/admin/jobs
POST /api/admin/jobs/{jobId}/hide
POST /api/admin/jobs/{jobId}/restore
GET  /api/admin/audit-logs
GET  /api/admin/email-actions
POST /api/admin/email-actions/{actionId}/retry
GET  /api/admin/email-tokens
POST /api/admin/email-tokens/{tokenId}/revoke
```

Yêu cầu UI Admin:

- Chỉ role `admin` được vào route `/admin/*`; candidate/recruiter phải bị redirect hoặc bị chặn.
- Nếu Admin API lỗi, page phải hiện error panel rõ ràng, không để loading vô hạn.
- Email action/token không được hiển thị raw token; chỉ hiển thị id/token đã redact từ backend.
- Nút suspend/activate/hide/restore/retry/revoke phải refetch dữ liệu sau khi action thành công.

### 25.2 Rocchio Feedback

Feedback UI hiện đã được mô tả trực tiếp trong tài liệu này và trong `srs.md` / `TEST_CASES.md`; prompt triển khai riêng đã được dọn khỏi repo.

Backend endpoint:

```http
POST /api/matches/{matchingId}/feedback?type=GOOD_MATCH&channel=WEB
```

Allowed `type`:

```ts
type FeedbackType = 'GOOD_MATCH' | 'POTENTIAL' | 'BAD_MATCH' | 'NOT_INTERESTED';
```

Frontend chỉ hiển thị Rocchio feedback cho Candidate matched job cards/details có `matchingId`. Public cards và Recruiter applicant/ranking cards không hiển thị controls này. Backend yêu cầu JWT Candidate, kiểm tra Candidate sở hữu CV của matching và trả `403` nếu Recruiter gọi route.

Rocchio feedback không thay thế application lifecycle. Recruiter dùng các action `Invite`, `Review`, `Approve`, `Reject` qua recruiter/application API riêng; frontend không gửi `role=RECRUITER` hoặc Mark Potential qua Candidate feedback endpoint.

### 25.2.1 Matching Edge Cases And Validation Signals

Frontend hiện có UI cho các edge case matching:

- no match: CTA reset filters, clear search, update profile, upload another CV;
- low-match-only: warning nhẹ và CTA improve CV / relax preferences / show broader jobs;
- tied score: tie-break note nếu có metadata.

Backend có thể cải thiện UI bằng cách trả thêm:

```ts
type TieBreakMetadata = {
  tieBreakReason?: string;
  skillOverlapCount?: number;
  jobFreshness?: string;
  salaryFit?: string;
  locationFit?: string;
};
```

Validation signals nên phân biệt:

```ts
type ValidationSeverity = 'ERROR' | 'WARNING' | 'QUALITY';

type ValidationSignal = {
  code: string;
  severity: ValidationSeverity;
  field?: string;
  message: string;
  suggestion?: string;
  blocking: boolean;
};
```

Frontend đang có pattern field-level suggestion cho Candidate Manual CV Builder và Fixed Profile. Khi backend trả validation thật, mapper nên đưa signal về đúng field thay vì chỉ toast lỗi tổng.

### 25.3 Public Job List

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

### 25.4 Public Job Detail

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

### 25.5 Candidate Matching Cards

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

### 25.6 Search Suggestions

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

### 25.7 Recruiter Dashboard

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

### 25.8 Recruiter Jobs

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

### 26.1 Phân Biệt Cache Với Dữ Liệu Backend

API-driven flow hiện không fallback mock. Nếu UI vẫn có data sau khi backend vừa lỗi, nguyên nhân thường là React Query cache, request chưa refetch, hoặc page đang hiển thị state cục bộ không thuộc API đó.

Cách kiểm tra:

```text
1. Mở DevTools Network.
2. Filter "api".
3. Xem status code.
4. Xem response có success/data không.
5. Xem Authorization header.
6. Clear `sessionStorage` nếu nghi token/account cũ.
```

Storage keys:

```text
sessionStorage: careerfit.accessToken, careerfit.account
localStorage: careerfit-language
```

### 26.2 401 Unauthorized

Kiểm tra:

- Đã login backend thành công chưa?
- `sessionStorage` có `careerfit.accessToken` không?
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

`request<T>` hiện vẫn trả được raw object này, nhưng mapper/type có thể fail vì shape không đúng contract mong đợi và metadata/error envelope bị mất.

Khi mismatch, sửa một trong hai nơi:

- backend DTO/response;
- frontend DTO/mapper trong `api.ts`.

Với vai trò backend dev, nên ưu tiên giữ API contract nhất quán và chỉ sửa mapper khi UI naming khác.

## 27. Những Phần Đã Nối Backend Thật

Đã có API client thật:

- Auth login/register, magic-link inspect/consume, `/auth/me` session revalidation.
- Public job search/detail/suggestions, featured employer/detail/jobs và similar jobs.
- Homepage market dashboard và Advanced Analytics market/candidate/recruiter.
- Candidate matching cards có pagination, recommendations riêng, apply/applications/withdraw và feedback.
- Candidate upload/manual CV có polling, profile/account update, CV management và Portfolio CRUD.
- Automation policy, email toggle, Auto-Apply run-now và Candidate/Recruiter settings.
- Recruiter dashboard, JD create/edit/status/delete/export, candidate discovery/invite/application status.
- Admin dashboard/users/jobs/audit/email monitor.

Backend capability chưa có UI đầy đủ:

- Save job/bookmark.
- Recruiter company profile self-service `GET/PUT /api/employers/me`.
- Automation pause/resume.
- Recruiter ranking/applicants/stats/top-candidates và analytics funnel/skill-gap theo job ở mức drill-down đầy đủ.
- Admin user detail, matching rebuild/batch rebuild và revoke email token trên UI.
- Analytics event tracking từ interaction frontend.
- Notification inbox, report job và delete account vì chưa có contract hoàn chỉnh tương ứng.

Đây là roadmap thực tế nếu muốn tiếp tục nối frontend-backend.

## 28. Khi Nhờ Agent Sửa Frontend

Nên yêu cầu theo format:

```text
Sửa frontend route X để gọi backend endpoint Y.
Backend request body là ...
Backend response data là ...
Map sang UI type ... như sau ...
Khi API lỗi, hiển thị loading/error/empty state rõ ràng; không fallback mock.
Không đổi layout lớn.
Chạy npm run build sau khi sửa.
```

Ví dụ:

```text
Connect nút Save/Bookmark trên JobCard vào endpoint lưu job khi backend bổ sung.
Request body: { jobId }.
Response data: SavedJobResponse.
Sau khi success hiển thị trạng thái Saved và refetch danh sách saved jobs nếu có.
Không fallback mock khi backend lỗi.
Sửa tối thiểu trong src/lib/api.ts và src/App.tsx.
Chạy npm run build.
```

Checklist review:

- Có method mới trong `careerfitApi` không?
- Endpoint đúng backend không?
- Request body đúng DTO backend không?
- Có gửi JWT không?
- Mapper xử lý null/empty không?
- UI có loading/error/empty/retry state hợp lý không?
- `npm run build` pass không?

## 29. Nếu Muốn Connect Thêm API Thật

Thứ tự an toàn:

1. Đọc backend controller/service/DTO.
2. Ghi request/response JSON expected.
3. Thêm DTO type vào `src/lib/api.ts`.
4. Thêm method vào `careerfitApi`.
5. Thêm mapper backend DTO -> UI type nếu cần.
6. Trong `App.tsx`, thay mock/hardcoded bằng `useQuery` hoặc mutation.
7. Thêm loading/error/empty/retry state, không che lỗi bằng mock.
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
10. `src/data/mock.ts`: chỉ đọc khi component thực sự import fixture/default liên quan.
11. `src/styles.css`: chỉ đọc class liên quan khi cần.

## 32. Bài Tập Đọc Hiểu

1. Login `ca / 1`, xem `sessionStorage` có token/account không và kiểm tra `GET /api/auth/me` khi reload.
2. Mở `/jobs?keyword=React`, xem request `/api/jobs/search`.
3. Mở `/candidate/jobs`, xem request `/api/matches/me/cards` có Authorization không.
4. Trong `api.ts`, đọc `mapCandidateJob`.
5. Stop backend, reload frontend, kiểm tra error/retry state và phân biệt data cache còn giữ.
6. Login `re / 1`, mở `/recruiter`, xem request `/api/recruiter/dashboard`.
7. Login `ad / 1`, mở `/admin`, xem request `/api/admin/dashboard`.
8. Mở `/admin/users`, `/admin/jobs`, `/admin/audit-logs`, `/admin/email-monitor` và kiểm tra các request `/api/admin/*`.
9. Tìm một text trên UI trong `LanguageProvider.tsx`.
10. Tìm một class trong JSX rồi sang `styles.css`.
11. Chạy `npm run build` để thấy type-check hoạt động.
12. Chọn một button chưa nối backend và lần ngược xem nó đang gọi handler nào.

## 33. Các Điểm Cần Cẩn Thận

- API-driven flow không fallback mock; tuy vậy cache vẫn có thể làm UI giữ data cũ cho đến lần refetch.
- `src/lib/api.ts` là source of truth cho contract hiện tại.
- `App.tsx` lớn, khi sửa nên scoped theo route/hook cụ thể.
- Protected route frontend chỉ là UX guard; backend security vẫn bắt buộc.
- Role `admin` cần được normalize từ backend role `ADMIN`; nếu login được nhưng bị đẩy về sai route, kiểm tra mapper role trong `src/lib/api.ts`.
- Token/account lưu `sessionStorage`; language preference mới lưu `localStorage`.
- React Query có cache/refetch, request có thể không gọi lại ngay nếu data còn fresh.
- Một số button có UI nhưng chưa nối backend.
- Basic/advanced market dashboard dùng API thật; một số copy/label minh họa vẫn là frontend presentation.
- Label null/unknown mặc định thành `Low`, không được nâng sai thành `High`.
- Mapper không dùng mock để che field null từ backend.

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

## 35. Backend Contract Bổ Sung, Cập Nhật 18/07/2026

Implementation status: frontend đã nối các contract chính trong `src/lib/api.ts`, `AutomationPolicyPanel`, `RecruiterJobsPage`, Settings và Admin pages. Mock data không còn được dùng làm fallback cho request lỗi hoặc mock job id.

### 35.1 Email Notification Toggle

Frontend gửi boolean xuống Backend, nhưng Backend vẫn là nơi quyết định cuối cùng trước khi gửi email.

```http
PATCH /api/automation/policy/email-notifications
Authorization: Bearer <jwt>
Content-Type: application/json
```

```json
{ "enabled": false }
```

Response là `AutomationPolicy.PolicySummary`, có thêm các field:

```ts
type AutomationPolicySummaryDto = {
  autopilotEnabled: boolean;
  autoApplyEnabled: boolean;
  autoApplyThreshold: number;
  emailNotificationsEnabled: boolean;
  digestEnabled: boolean;
  digestFrequency: string;
  minScoreToNotify: number;
  notifyOnHighOnly: boolean;
  notifyPotential: boolean;
  maxNotificationsPerDay: number;
  notificationCooldownHours: number;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  replacementAfterSkipEnabled: boolean;
  replacementDelayMinutes: number;
  pausedUntil: string | null;
  updatedAt: string;
};
```

UI nên render toggle chính là `emailNotificationsEnabled`. Khi false, Backend sẽ skip lifecycle/action/digest email bằng no-spam guard; Frontend không cần tự suy đoán các flow nào có gửi mail.

Auto-Apply dùng cùng policy endpoint:

```http
PATCH /api/automation/policy
Authorization: Bearer <jwt>
Content-Type: application/json
```

```json
{
  "autoApplyEnabled": true,
  "autoApplyThreshold": 80
}
```

Rule backend:

- `autoApplyThreshold` hợp lệ trong khoảng `50-100`.
- Auto-Apply chỉ tạo application nội bộ trong CareerFit, không submit sang website bên thứ ba.
- Nếu muốn test ngay, UI có thể gọi endpoint chạy một lần:

```http
POST /api/automation/auto-apply/run-now
Authorization: Bearer <jwt>
```

Response:

```ts
type AutoApplyRunNowResponse = {
  created: number;
  reason: "CREATED_APPLICATIONS" | "NO_ELIGIBLE_MATCHES" | "AUTO_APPLY_DISABLED";
};
```

Frontend hiện gọi endpoint này từ nút `Run now` trong trang Automation để test/demo, còn scheduler backend vẫn chạy nền mỗi 2 giờ.

Nếu `autoApplyThreshold` ngoài range `50-100`, backend trả structured validation field:

```ts
{
  severity: "ERROR",
  field: "autoApplyThreshold",
  reason: "AUTO_APPLY_THRESHOLD_RANGE",
  message: "Auto-Apply threshold must be between 50 and 100."
}
```

### 35.2 List Metadata Contract

Các list endpoint quan trọng có metadata để UI render empty/result state nhất quán:

```ts
type ListMetaDto = {
  generatedAt?: string | null;
  lastUpdatedAt?: string | null;
  resultState?: "READY" | "NO_MATCH" | "LOW_MATCH_ONLY" | "HIGH_TIE" | "PROCESSING" | "FAILED" | "NO_FILTERED_RESULTS" | "NO_CANDIDATE_MATCHES" | string;
  message?: string | null;
  suggestions?: string[] | null;
};
```

Áp dụng:

- Candidate match endpoints: `data.meta`.
- Candidate applications: `data.meta`.
- Recruiter applicants: `data.meta`.
- Recruiter ranking: `data.meta`.
- Recruiter candidate discovery: `data.resultState`, `data.message`, `data.generatedAt`, `data.lastUpdatedAt`, `data.suggestions`.

### 35.3 Candidate Application Flow

Candidate apply thật:

```http
POST /api/applications
Authorization: Bearer <jwt>
Content-Type: application/json
```

```json
{
  "jobId": "<job-id>",
  "coverLetter": "optional"
}
```

Candidate xem lịch sử:

```http
GET /api/applications/me?page=0&size=50
Authorization: Bearer <jwt>
```

Candidate withdraw:

```http
DELETE /api/applications/{applicationId}
Authorization: Bearer <jwt>
```

Frontend hiện dùng:

- `careerfitApi.submitApplication(job.id)` từ job card/detail.
- `careerfitApi.getMyApplications()` cho `/candidate/applications`.
- `careerfitApi.withdrawApplication(applicationId)` cho action withdraw/skip.

`GET /api/applications/me` trả thêm:

```ts
type MyApplicationPageDto = {
  applications: MyApplicationDto[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
  meta?: ListMetaDto | null;
};
```

### 35.4 Recruiter Candidate Discovery

Route mới cho trang recruiter job candidates/ranking filter:

```http
GET /api/recruiter/jobs/{jobId}/candidates?label=HIGH&isPotential=false&applicationStatus=NONE&minScore=70&sort=score_desc&page=0&size=20
```

Query hợp lệ:

```text
label=HIGH|MEDIUM|LOW|POTENTIAL
isPotential=true|false
applicationStatus=NONE|PENDING|AUTO_APPLIED|APPROVED|REJECTED|INVITED|NOT_INTERESTED|INTERVIEW_RESCHEDULED|INTERVIEW_CANCELLED
sort=score_desc|updated_desc|experience_desc|status_asc
```

Response data:

```ts
type RecruiterCandidateDiscoveryPageDto = {
  jobId: string;
  jobTitle: string;
  resultState: "READY" | "HIGH_TIE" | "NO_CANDIDATE_MATCHES" | "NO_FILTERED_RESULTS";
  message: string;
  candidates: RecruiterCandidateDiscoveryDto[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
  generatedAt?: string | null;
  lastUpdatedAt?: string | null;
  suggestions?: string[] | null;
};

type RecruiterCandidateDiscoveryDto = {
  matchingId: string;
  cvId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  desiredTitle?: string;
  location?: string;
  yearsOfExperience?: number;
  topSkills: string[];
  cvSummary?: string;
  normalizedScore: number;
  label: "HIGH" | "MEDIUM" | "LOW" | "POTENTIAL";
  isPotential: boolean;
  applicationId?: string | null;
  applicationStatus: string;
  hasApplied: boolean;
  matchReasons: string[];
  potentialReason?: string | null;
  matchedAt: string;
  tie: RankingTieMetaDto;
};
```

Invite candidate chưa apply:

```http
POST /api/recruiter/jobs/{jobId}/candidates/{candidateId}/invite
```

Frontend hiện gọi endpoint này từ nút `Invite`, sau đó refetch candidate discovery.

Recruiter update lifecycle status:

```http
PATCH /api/recruiter/applications/{applicationId}/status
Authorization: Bearer <jwt>
Content-Type: application/json
```

```json
{
  "status": "APPROVED",
  "recruiterNotes": "optional"
}
```

Frontend hiện dùng endpoint này cho Approve/Reject trong recruiter candidate cards khi item có `applicationId`.

### 35.5 Ranking Tie Metadata

Endpoint cũ `/api/recruiter/jobs/{jobId}/ranking` vẫn dùng được, nhưng mỗi candidate có thêm:

```ts
type RankingTieMetaDto = {
  rank: number;
  tieRank: number;
  tieGroupSize: number;
  tied: boolean;
  sortKey: string;
  lastUpdatedAt: string;
};
```

UI nên dùng `tied=true` và `tieGroupSize > 1` để hiển thị nhãn kiểu “Đồng hạng 1/3” hoặc tooltip giải thích thứ tự phụ. Không tự random hoặc tự sort lại nếu không cần.

### 35.6 Validation Error Mapper

Backend validation lỗi trả trong `error.fieldErrors.fields[]`:

```ts
type BackendValidationErrorDetails = {
  code: "VALIDATION_FAILED";
  message: string;
  fields: Array<{
    severity: "ERROR" | "WARNING" | "QUALITY_FLAG";
    field: string;
    reason: string;
    message: string;
    suggestion?: string | null;
  }>;
};
```

Frontend nên map `field` vào field-level error/warning. `ERROR` chặn submit; `WARNING` và `QUALITY_FLAG` nên hiển thị cảnh báo hoặc suggestion, không coi là lỗi hệ thống.
