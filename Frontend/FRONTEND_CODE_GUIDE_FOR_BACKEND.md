# Huong Dan Doc Hieu Frontend CareerFit Cho Backend Developer

Tai lieu nay khong nham bien ban thanh frontend developer. Muc tieu la giup ban, voi huong di backend Java Spring, doc hieu frontend du sau de:

- biet frontend dang goi API nao cua backend;
- hieu duong di cua data tu backend response den UI;
- debug loi contract giua frontend/backend;
- vibe coding voi Agent mot cach co kiem soat;
- doc React/TypeScript vua du, khong can tu code UI chuyen sau.

Frontend nam tai:

```text
Frontend
```

File nen mo truoc:

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

## 1. Frontend Nay La Gi?

Frontend la React single-page app cho CareerFit IT AutoPilot.

Nhiem vu cua no:

- hien thi public job portal;
- login candidate/recruiter;
- hien candidate dashboard/job feed/job detail/upload/profile/applications/automation;
- hien recruiter dashboard/jobs/ranking/applicants/analytics/settings;
- goi backend Spring API khi co backend;
- fallback sang mock data khi backend loi/chua chay.

Tech stack:

- React 18: UI component.
- TypeScript: type checking.
- Vite: dev server/build tool.
- React Router: client-side routing.
- TanStack React Query: fetch/cache/refetch API.
- Recharts: chart.
- Lucide React: icon.
- CSS thuong trong `styles.css`.

Backend developer can dac biet quan tam 3 file:

```text
src/lib/api.ts    -> noi map backend DTO sang frontend type
src/App.tsx       -> noi route/page/hook goi api
src/types.ts      -> shape data UI dang can
```

## 2. Chay Frontend

Tu thu muc frontend:

```powershell
cd Frontend
npm install
npm run dev
```

Mac dinh:

```text
http://127.0.0.1:5173/
```

Build check:

```powershell
npm run build
```

`package.json` co scripts:

```json
{
  "dev": "vite --host 127.0.0.1",
  "build": "tsc --NoEmit && vite build",
  "preview": "vite preview --host 127.0.0.1"
}
```

Luu y: trong file that la `tsc --noEmit`, y nghia la TypeScript chi type-check, khong tao JS output.

## 3. Tu Duy Doc Frontend Neu Ban La Backend Dev

Khi doc mot man hinh frontend, dung 5 cau hoi:

1. Route nao render man hinh nay?
2. Component/page nao xu ly route do?
3. Page do lay data tu hook nao?
4. Hook do goi method nao trong `careerfitApi`?
5. Method API do expect backend response shape nao va map sang `types.ts` ra sao?

Vi du public job search:

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

Day la cach doc dung cho backend dev. Dung bat dau bang CSS.

## 4. Package Va Build System

Mo:

```text
package.json
vite.config.ts
tsconfig.json
index.html
```

### 4.1 package.json

Dependencies quan trong:

| Package | Can hieu gi |
| --- | --- |
| `react`, `react-dom` | Nen UI |
| `react-router-dom` | Route frontend |
| `@tanstack/react-query` | Goi API, cache, refetch |
| `lucide-react` | Icons |
| `recharts` | Chart |
| `typescript` | Static type |
| `vite` | Dev server/build |

### 4.2 vite.config.ts

```ts
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
```

Vite chay frontend port `5173`.

Backend API khong proxy qua Vite. Client goi truc tiep:

```text
http://localhost:8080/api
```

Neu can doi API base URL, dung env:

```text
VITE_API_BASE_URL=http://localhost:8080/api
```

### 4.3 index.html

File HTML goc chi co:

```html
<div id="root"></div>
<script type="module" src="/src/main.tsx"></script>
```

React se render app vao `#root`.

## 5. Entry Point: main.tsx

Mo:

```text
src/main.tsx
```

Luong khoi tao:

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

Can hieu:

- `ReactDOM.createRoot(...).render(...)`: mount React app vao HTML.
- `React.StrictMode`: dev mode check them mot so loi/lifecycle.
- `QueryClientProvider`: cung cap React Query cho toan app.
- `LanguageProvider`: cung cap i18n `t(key)`.
- `BrowserRouter`: cho phep route `/jobs`, `/candidate`, `/recruiter`.
- `<App />`: component chinh.

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

Y nghia:

- Data duoc coi la fresh trong 30 giay.
- Khi quay lai tab browser, query co the refetch.

Backend note: neu ban thay API bi goi lai khi focus browser, day la React Query behavior, khong phai bug backend.

## 6. App.tsx La File Gi?

Mo:

```text
src/App.tsx
```

File nay hien dang lam nhieu viec:

- khai bao routes;
- quan ly login account state;
- chua hau het page components;
- chua custom hooks goi API;
- chua mot so UI helper.

Day la file lon nhat. Backend dev khong can doc tung dong JSX. Hay doc theo cum:

| Cum | Vi tri/kien thuc |
| --- | --- |
| `App()` | session, route, protectedRoute |
| `LoginPage` | login flow |
| `CandidateHomePage`, `CandidateJobsPage`, `JobDetailPage` | public/candidate job flow |
| `RecruiterHomePage`, `RecruiterJobsPage` | recruiter flow |
| `useJobs`, `useJobDetail`, `useSearchSuggestions` | API hooks candidate/public |
| `useRecruiterSummary`, `useRecruiterJobs` | API hooks recruiter |
| `JobListWithPreview`, `JobDetailContent`, `StickyApplyBar` | display data only |

Dung `rg` de tim nhanh:

```powershell
rg -n "function useJobs|function CandidateJobsPage|careerfitApi" src/App.tsx
```

## 7. Routing Va Role Guard

Trong `App()`:

```tsx
const [account, setAccount] = useState<MockAccount | null>(() => careerfitApi.restoreAccount());
```

`account` la frontend session object. No lay tu localStorage khi reload page.

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

Can hieu:

- Neu chua login: hien page yeu cau dang nhap.
- Neu sai role: redirect ve dashboard dung role.
- Day la guard o frontend, khong thay the backend security.

Backend security van nam o `SecurityConfig`.

### 7.1 Route Map

Routes public:

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
| `/recruiter/automation` | `AutomationPage` |
| `/recruiter/settings` | `RecruiterSettingsPage` |

## 8. AppShell: Layout Va Navigation

Mo:

```text
src/components/AppShell.tsx
```

`AppShell` la layout chung gom:

- header;
- brand;
- top nav;
- role chip;
- notification/settings button;
- language switch;
- `<Outlet />` de render route con.

React Router note:

```tsx
<Route element={<AppShell role={account?.role ?? 'guest'} />}>
  <Route path="/jobs" element={<CandidateJobsPage isPublic />} />
</Route>
```

`Outlet` trong `AppShell` la noi route con hien ra.

Nav link theo role:

- guest: dashboard, jobs, upload, profile, recommendations, applications, automation;
- candidate: dashboard, jobs, upload, profile, recommendations, applications, automation;
- recruiter: dashboard, jobs, analytics, automation.

Guest click feature protected se vao `LoginRequiredPage`.

## 9. API Client: File Quan Trong Nhat Cho Backend Dev

Mo:

```text
src/lib/api.ts
```

Day la noi contract frontend-backend gap nhau.

### 9.1 API Base URL

```ts
const API_BASE_URL = (importMeta.env?.VITE_API_BASE_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');
```

Default:

```text
http://localhost:8080/api
```

Neu backend chay port khac:

```powershell
$env:VITE_API_BASE_URL="http://localhost:8081/api"
npm run dev
```

Vite env note: bien env frontend phai bat dau bang `VITE_` moi doc duoc trong browser.

### 9.2 Local Storage Keys

```ts
const TOKEN_KEY = 'careerfit.accessToken';
const ACCOUNT_KEY = 'careerfit.account';
```

Sau login:

- token JWT luu vao `careerfit.accessToken`;
- account UI luu vao `careerfit.account`.

Logout:

```ts
clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(ACCOUNT_KEY);
}
```

Security note: localStorage de demo/dev thi don gian, nhung co rui ro XSS. Production co the can chien luoc token khac.

### 9.3 request<T>

Ham trung tam:

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

Y nghia voi backend:

- Frontend mac dinh gui `Content-Type: application/json`.
- Neu co token, gui `Authorization: Bearer <token>`.
- Frontend ky vong backend response la envelope:

```ts
type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error?: { code?: string; message?: string };
};
```

Nghia la backend phai tra dung dang `ApiResponse<T>` nhu backend guide da noi.

Neu backend tra raw object khong co `success/data`, frontend se coi la loi.

### 9.4 API Methods Dang Co

`careerfitApi` hien co:

| Method frontend | Backend endpoint |
| --- | --- |
| `login(identifier, password)` | `POST /api/auth/login` |
| `searchJobs(keyword)` | `GET /api/jobs/search` |
| `getJob(jobId)` | `GET /api/jobs/{jobId}` |
| `getCandidateJobs()` | `GET /api/matches/me/cards?page=0&size=20` |
| `getSearchSuggestions(keyword)` | `GET /api/jobs/search/suggestions` |
| `getRecruiterDashboard()` | `GET /api/recruiter/dashboard` |
| `getRecruiterJobs()` | `GET /api/recruiter/jobs` |

Nhieu UI action khac hien van mock/static, chua goi backend:

- apply job button;
- upload CV real multipart;
- profile update;
- automation update;
- applications list;
- recruiter create/edit JD;
- feedback good/bad match.

Day la thong tin quan trong khi vibe coding: khong gia dinh tat ca UI da connected backend.

## 10. DTO Mapping: Backend Shape -> UI Shape

Trong `api.ts`, frontend dinh nghia DTO rieng cho backend response:

```ts
type JobCardDto = {
  id: string;
  title: string;
  company: string;
  companyLogoUrl?: string | null;
  location?: string | null;
  remoteType?: string | null;
  seniorityLevel?: string | null;
  employmentType?: string | null;
  salary?: SalaryDisplayDto | null;
  requiredSkills?: string[] | null;
  domain?: string | null;
  language?: string | null;
  status?: string | null;
  createdAt?: string | null;
};
```

Sau do map sang UI type `Job`:

```ts
export function mapPublicJob(dto: JobCardDto | JobDetailDto, index = 0): Job {
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

### 10.1 Vi Sao Can Map?

Backend DTO va UI model khong phai luc nao giong nhau.

Vi du backend job detail:

```json
{
  "id": "...",
  "title": "Senior Java Developer",
  "company": "FPT Software",
  "location": "Ho Chi Minh",
  "remoteType": "Hybrid",
  "seniorityLevel": "Senior",
  "salary": {
    "mode": "RANGE",
    "min": 2000,
    "max": 3500,
    "currency": "USD"
  }
}
```

Frontend `Job` can:

```ts
{
  location: "Ho Chi Minh, Hybrid",
  seniority: "Senior",
  salary: "USD 2000 - 3500"
}
```

`mapPublicJob` la adapter.

Backend developer can doc adapter de biet frontend can field nao that su.

### 10.2 Fallback Mock Trong Mapping

Cac mapper hay dung:

```ts
const fallback = publicJobFallback(index);
```

Neu backend field null/empty, frontend lay mock fallback.

Vi du:

```ts
requiredSkills: dto.requiredSkills?.length ? dto.requiredSkills : fallback.requiredSkills
```

He qua:

- UI van dep khi backend data thieu.
- Nhung bug backend "thieu field" co the bi che boi fallback.
- Khi test contract that, can check network response, khong chi nhin UI.

### 10.3 Label Mapping

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

Neu backend tra label la null/unknown, frontend mac dinh `High`. Khi debug diem matching, can chu y diem nay.

## 11. types.ts: UI Domain Model

Mo:

```text
src/types.ts
```

Day la model frontend dung de render.

Quan trong nhat:

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

Backend DTO co the rat nhieu field, nhung UI job card/detail hien dung field tren.

Type khac:

- `MockAccount`: frontend account session.
- `Role`: `candidate | recruiter`.
- `AutomationPolicy`: shape panel AutoFit hien tai.
- `Application`: application mock list.
- `RecruiterSummary`: dashboard stats.
- `TrendPoint`: chart data.
- `EmailAction`: mock email action confirm page.

Backend dev nen so sanh:

```text
Backend DTO -> api.ts DTO -> mapper -> types.ts -> component props
```

Day la cach tim mismatch.

## 12. Login Flow

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
1. User nhap username/password.
2. Goi careerfitApi.login.
3. API client POST /auth/login.
4. Neu thanh cong: save JWT + account vao localStorage.
5. setAccount de UI chuyen role.
6. Neu backend loi: fallback mock ca/1 hoac re/1.
```

Backend can tra:

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

`toAccount(payload)` map:

```ts
return {
  username: payload.user.email,
  password: '',
  role: normalizeRole(payload.user.role),
  displayName: payload.user.fullName,
};
```

Role backend `CANDIDATE` thanh frontend `candidate`; `RECRUITER` thanh `recruiter`.

## 13. React Query Hooks

Cac hook cuoi `App.tsx` la noi page lay data.

### 13.1 useSearchSuggestions

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

Y nghia:

- Query rong thi khong goi API.
- Goi backend suggestions.
- Neu backend khong tra item nao, dung mock fallback.
- `retry: false`: loi khong retry.

### 13.2 useJobs

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

Neu public:

```text
GET /api/jobs/search
```

Neu candidate:

```text
GET /api/matches/me/cards
```

Neu loi:

```text
mock jobs
```

Quan trong: candidate route can JWT. Neu token invalid, API loi, UI fallback mock nen nguoi dung van thay data. Khi debug auth, hay xem Network tab.

### 13.3 useJobDetail

```text
GET /api/jobs/{jobId}
```

Neu route candidate, hook goi them:

```text
GET /api/matches/me/cards
```

Muc dich: public job detail lay thong tin JD, candidate jobs lay score/reasons ca nhan. Sau do merge:

```ts
{
  ...publicJob,
  normalizedScore: personalizedJob.normalizedScore,
  label: personalizedJob.label,
  isPotential: personalizedJob.isPotential,
  reasons: personalizedJob.reasons,
}
```

Backend note: job detail endpoint public khong can score. Score den tu matching endpoint.

### 13.4 useRecruiterSummary va useRecruiterJobs

```text
GET /api/recruiter/dashboard
GET /api/recruiter/jobs
```

Can role `RECRUITER`. Neu loi thi fallback mock.

## 14. Data Flow Cac Man Hinh Chinh

### 14.1 Public Home

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

UI:

- `SearchHero`
- `JobMarketDashboard`
- `TopEmployers`
- `JobListWithPreview`

Backend connected:

- public job search;
- suggestions khi search.

Backend not connected/static:

- market numbers trong `JobMarketDashboard` dang hardcoded trong component.
- top employers la local `topEmployers`.

### 14.2 Public Jobs Search

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

Search action:

```tsx
setSearchParams(keyword ? { keyword } : {});
```

React Router update URL, hook refetch theo `queryKey`.

### 14.3 Candidate Job Feed

Route:

```text
/candidate/jobs
```

Component:

```text
CandidateJobsPage
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

Moi job card can:

- id/title/company;
- location/remoteType/seniority/employmentType;
- salaryDisplay;
- requiredSkills/optionalSkills;
- normalizedScore;
- label;
- isPotential;
- reasons;
- potentialReason;
- matchedAt.

### 14.4 Job Detail

Public:

```text
/jobs/:jobId
```

Candidate:

```text
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
- `LoginPromptModal` neu public apply.

Backend connected:

- job detail;
- candidate matching overlay neu logged in candidate.

Apply button hien chua submit backend application.

### 14.5 Recruiter Dashboard

Route:

```text
/recruiter
```

Component:

```text
RecruiterHomePage
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

Backend field name khac UI field name, map o api.ts.

### 14.6 Recruiter Jobs

Route:

```text
/recruiter/jobs
/recruiter/jobs/:jobId
/recruiter/jobs/:jobId/ranking
/recruiter/jobs/:jobId/applicants
/recruiter/jobs/:jobId/potential
```

Tat ca render:

```text
RecruiterJobsPage
```

Data:

```text
useRecruiterJobs()
  -> GET /api/recruiter/jobs
```

Luu y: cac sub-route ranking/applicants/potential hien chu yeu thay UI tab/detail trong cung page, chua goi rieng:

- `/api/recruiter/jobs/{jobId}/ranking`
- `/api/recruiter/jobs/{jobId}/applicants`
- `/api/recruiter/jobs/{jobId}/top-candidates`

Neu can connect that, bat dau o `RecruiterJobsPage` va them methods vao `api.ts`.

## 15. Mock Data Va Fallback

Mo:

```text
src/data/mock.ts
```

Mock chua:

- `mockAccounts`: `ca/1`, `re/1`.
- `candidate`
- `preference`
- `automationPolicy`
- `jobs`
- `applications`
- `recruiterSummary`
- `trends`
- `emailAction`
- `delay`

Mock dung trong 3 truong hop:

1. UI static/prototype chua connect API.
2. API loi/chua chay backend.
3. Backend response thieu data, mapper fallback field.

Backend dev can nho: UI hien data khong dong nghia la backend da tra data.

Cach check that:

- Mo DevTools Network.
- Check request co goi `localhost:8080/api` khong.
- Check response co field dung khong.
- Tam thoi stop backend xem UI fallback ra sao.

## 16. Component Co Ban

### 16.1 JobCard

Mo:

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

`JobCard` chi render `Job` UI type. No khong biet backend DTO.

Button action:

- Apply: goi `onApply`.
- Save: hien UI only.
- Skip: goi `onSkip`.
- Detail: goi `onOpen`.

`event.stopPropagation()` ngan button click kich hoat card click.

### 16.2 Badges

Mo:

```text
src/components/Badges.tsx
```

`MatchingBadge` hien:

```text
score% · High/Medium
```

Color theo score.

Luu y:

```ts
const labelText = label === 'High' ? t('matchHigh') : t('matchMedium');
```

Neu label la `Low` hoac `Potential`, text van rơi vao `matchMedium`. Neu can hien dung label hon, sua o day.

### 16.3 AutomationPolicyPanel

Mo:

```text
src/components/AutomationPolicyPanel.tsx
```

Hien policy tu `AutomationPolicy` type. Hien tai input/range/time la uncontrolled `defaultValue`, chua submit backend.

### 16.4 StatCard

Small display component. Khong co backend concern.

## 17. i18n: LanguageProvider

Mo:

```text
src/i18n/LanguageProvider.tsx
```

Co dictionary:

```ts
const vi: Dictionary = { ... }
const en: Dictionary = { ... }
```

Hook:

```ts
const { language, setLanguage, t } = useLanguage();
```

Dung:

```tsx
{t('jobs')}
```

Neu key thieu:

```ts
t: (key) => dictionary[key] ?? key
```

UI se hien chinh key. Khi thay text nhu `someMissingKey`, nghia la thieu translation.

Language luu localStorage:

```text
careerfit-language
```

## 18. CSS Va Visual Layer

Mo:

```text
src/styles.css
```

Backend dev khong can hoc CSS sau, nhung can biet:

- Toan bo style nam mot file lon.
- Class name trong JSX phai match CSS.
- Responsive co `@media (max-width: 1080px)` va `@media (max-width: 720px)`.
- UI dung CSS variables o `:root`.
- Cac class quan trong:
  - `.app-shell`
  - `.site-header`
  - `.portal-hero`
  - `.job-card`
  - `.match-badge`
  - `.jd-detail-page`
  - `.sticky-apply-bar`
  - `.recruiter-hr-dashboard`
  - `.settings-route`

Khi vibe coding UI:

- Neu them component moi, can class name va CSS tuong ung.
- Neu thay layout vo, search class trong `styles.css`.
- Neu text tran/out of layout, sua CSS chinh xac class do, khong sua data.

## 19. TypeScript Kien Thuc Vua Du

### 19.1 type vs interface

Trong project:

```ts
export type Role = 'candidate' | 'recruiter';
```

Union string type: chi cho 2 gia tri.

```ts
export interface Job { ... }
```

Interface mo ta object shape.

### 19.2 Optional va Null

Backend DTO hay co:

```ts
companyLogoUrl?: string | null;
```

Y nghia:

- field co the khong ton tai;
- hoac ton tai nhung null.

Frontend thuong dung:

```ts
dto.location ?? fallback.location
```

`??` chi fallback khi null/undefined.

### 19.3 Generic

```ts
async function request<T>(...): Promise<T>
```

`T` la type data response. Goi:

```ts
request<JobListDto>('/jobs/search')
```

Nghia la payload data duoc type-check nhu `JobListDto`.

### 19.4 JSX

JSX la syntax HTML-like trong TypeScript:

```tsx
return <JobCard job={job} onOpen={...} />;
```

Props la tham so component.

### 19.5 Hook

Hook la function React bat dau bang `use...`:

- `useState`: local state.
- `useEffect`: side effect sau render.
- `useMemo`: cache computed value.
- `useQuery`: fetch/cache server state.
- `useNavigate`, `useParams`, `useSearchParams`: React Router.
- `useLanguage`: custom context hook.

Quy tac: hook chi goi o top-level cua component/hook, khong goi trong if/loop.

## 20. React Kien Thuc Vua Du

### 20.1 Component

Component la function tra JSX:

```tsx
function StatCard({ label, value, detail }: StatCardProps) {
  return <section>...</section>;
}
```

Doc nhu method render.

### 20.2 State

```tsx
const [query, setQuery] = useState('');
```

`query` la gia tri hien tai. `setQuery` cap nhat va trigger re-render.

### 20.3 Effect

```tsx
useEffect(() => {
  window.scrollTo({ top: 0 });
}, [job.id]);
```

Chay khi `job.id` doi.

### 20.4 Derived Data

```tsx
const filteredJobs = useFilteredJobs(sourceJobs, query);
```

`useFilteredJobs` filter local data theo query.

### 20.5 Conditional Render

```tsx
{isFilterOpen ? <FilterModal /> : null}
```

Neu state true thi hien modal.

## 21. Contract Backend-Frontend Dang Dung

### 21.1 Auth

Frontend request:

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

### 21.2 Public Job List

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

### 21.3 Public Job Detail

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

### 21.4 Candidate Matching Cards

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

Candidate job card:

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

### 21.5 Search Suggestions

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

### 21.6 Recruiter Dashboard

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

### 21.7 Recruiter Jobs

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

## 22. Cach Debug Loi Backend-Frontend

### 22.1 UI van hien data nhung backend loi

Nguyen nhan thuong gap:

- frontend fallback sang mock.
- mapper dung fallback field.
- React Query cache data cu.

Can lam:

```text
1. Mo DevTools Network.
2. Filter "api".
3. Check status code.
4. Check response JSON co success/data khong.
5. Check Authorization header neu endpoint protected.
6. Clear localStorage neu nghi token/account cu.
```

LocalStorage keys:

```text
careerfit.accessToken
careerfit.account
careerfit-language
```

### 22.2 401 Unauthorized

Kiem tra:

- Da login backend thanh cong chua?
- LocalStorage co `careerfit.accessToken` khong?
- Request co header `Authorization: Bearer ...` khong?
- Backend route co role dung khong?
- Token role la `CANDIDATE` hay `RECRUITER`?

### 22.3 403 Forbidden

Thuong do:

- login candidate nhung goi recruiter route;
- login recruiter nhung goi candidate route;
- backend service check ownership fail.

Frontend guard giup redirect sai role, nhung request van co the 403 neu UI/hook goi sai endpoint.

### 22.4 CORS Error

Backend `application.yml` cho phep:

```yaml
app.cors.allowed-origins: http://localhost:5173,http://127.0.0.1:5173
```

Frontend chay `127.0.0.1:5173`. Neu doi port 5174, can set:

```text
CORS_ORIGINS=http://localhost:5174,http://127.0.0.1:5174
```

hoac sua backend config/env.

### 22.5 Response shape mismatch

Neu backend tra:

```json
{ "jobs": [] }
```

Frontend fail vi expect:

```json
{ "success": true, "data": { "jobs": [] } }
```

Neu backend field name khac, sua 1 trong 2:

- backend DTO field;
- frontend DTO/mapper trong `api.ts`.

Voi vai tro backend dev, uu tien giu backend API contract on dinh va cap nhat mapper neu UI naming khac.

## 23. Khi Can Nho Agent Sua Frontend, Nen Yeu Cau The Nao?

Dung format nay de vibe coding hieu qua:

```text
Sua frontend route X de goi backend endpoint Y.
Backend response shape la ...
Map sang UI type ... nhu sau ...
Neu API loi thi fallback mock nhu pattern hien tai.
Khong doi layout lon, chi update api.ts + hook/page lien quan.
Chay npm run build sau khi sua.
```

Vi du:

```text
Connect nut Apply tren JobDetailPage vao POST /api/applications.
Request body: { jobId, cvId?, coverLetter? }.
Response data: MyApplicationResponse.
Sau khi success hien trang thai Applied tren UI.
Giu fallback mock neu backend loi.
Sua toi thieu trong src/lib/api.ts va src/App.tsx.
```

Checklist review output cua Agent:

- Co them method trong `careerfitApi` khong?
- Method do dung endpoint backend chua?
- Request body dung DTO backend chua?
- Co gui JWT tu `request<T>` khong?
- Mapper co xu ly null/empty khong?
- UI co fallback hop ly khong?
- `npm run build` pass khong?

## 24. Neu Muon Connect Them API That

Thu tu lam an toan:

1. Doc backend controller/service/DTO.
2. Ghi expected request/response JSON.
3. Them DTO type vao `src/lib/api.ts`.
4. Them method vao `careerfitApi`.
5. Them mapper backend DTO -> UI type neu can.
6. Trong `App.tsx`, thay mock/hardcoded bang `useQuery` hoac mutation.
7. Giu fallback mock neu frontend can demo khi backend down.
8. Test Network tab.
9. Chay `npm run build`.

Backend dev khong can tu viet CSS neu feature chi la connect API. Hay giu UI hien co.

## 25. Nhung Phan Chua Fully Connected Backend

Theo code hien tai, cac phan da co API client that:

- Login.
- Public job search.
- Public job detail.
- Candidate matching cards.
- Search suggestions.
- Recruiter dashboard.
- Recruiter jobs list.

Cac phan chu yeu van mock/static:

- Upload CV UI chua POST multipart `/api/cv/upload`.
- Manual CV form chua POST `/api/cv/manual`.
- Candidate profile update chua PATCH `/api/candidates/me`.
- CV management chua GET/POST/PATCH/DELETE real.
- Apply button chua POST `/api/applications`.
- Applications page chua GET `/api/applications/me`.
- Automation policy panel chua GET/PATCH `/api/automation/policy`.
- Feedback good/bad/potential chua POST `/api/matches/{matchingId}/feedback`.
- Recruiter ranking/applicants detail chua goi endpoints rieng.
- Analytics page con dung mock trends/static chart.
- Employer detail/top employers con local static data.

Day la roadmap ket noi frontend-backend sau nay.

## 26. Luu Y Ve Naming Contract

Backend dung Java naming trong DTO record, Jackson tra camelCase:

```java
normalizedScore
isPotential
requiredSkills
salaryDisplay
```

Frontend DTO cung camelCase.

Nhung frontend UI type co ten khac:

```text
seniorityLevel -> seniority
salaryDisplay / salary object -> salary string
matchReasons -> reasons
createdAt/matchedAt -> postedAt
```

Vi vay mismatch thuong nam o mapper, khong nam o component.

## 27. Thu Tu Doc Code De Hoc Nhanh

Doc theo thu tu:

1. `package.json`: biet stack.
2. `src/main.tsx`: providers.
3. `src/types.ts`: UI model.
4. `src/lib/api.ts`: backend contract va mapping.
5. `src/App.tsx` phan `App()` route/protectedRoute.
6. `src/App.tsx` cac hook cuoi file.
7. `src/components/AppShell.tsx`: layout/nav.
8. `src/components/JobCard.tsx`: card render `Job`.
9. `src/i18n/LanguageProvider.tsx`: `t(key)`.
10. `src/data/mock.ts`: fallback.
11. `src/styles.css`: chi doc class lien quan khi can.

Khong can doc het `App.tsx` tu tren xuong duoi trong mot lan. Hay tim theo route/hook.

## 28. Bai Tap Doc Hieu Cho Backend Dev

Lam cac bai nay de nam frontend:

1. Login `ca / 1`, xem localStorage co token/account khong.
2. Mo `/jobs?keyword=React`, xem Network request `/api/jobs/search`.
3. Mo `/candidate/jobs`, xem request `/api/matches/me/cards` co Authorization khong.
4. Trong `api.ts`, xem `mapCandidateJob` map `normalizedScore`, `label`, `reasons` the nao.
5. Doi backend endpoint search tra thieu `requiredSkills`, xem UI fallback ra sao.
6. Login `re / 1`, mo `/recruiter`, xem request `/api/recruiter/dashboard`.
7. Stop backend, reload frontend, xem UI fallback mock.
8. Tim mot text tren UI trong `LanguageProvider.tsx`.
9. Tim mot class UI trong JSX roi sang `styles.css` xem style.
10. Chay `npm run build` de biet type error hien ra nhu the nao.

## 29. Cac Diem Nen Can Than

- Frontend fallback mock rat nhieu, nen nhin UI khong du de ket luan backend dung.
- `api.ts` la source of truth cho frontend-backend contract hien tai.
- `App.tsx` dang qua lon, khi sua nen scoped theo function/hook cu the.
- Protected route frontend chi la UX guard, backend security van bat buoc.
- Token luu localStorage, neu test role bi la, clear localStorage.
- React Query co cache/refetch, nen request co the khong goi lai ngay neu data con fresh.
- Mot so UI action co button nhung chua connect backend.
- Recharts/market dashboard co nhieu data hardcoded, khong phai tat ca den tu backend analytics.
- Label mapping mac dinh unknown -> `High`, can chu y khi test matching label.
- Mapper fallback mock co the che bug field null.

## 30. Tom Tat Mot Cau

Voi backend developer, frontend CareerFit can doc theo truc:

```text
Route -> Page component -> React Query hook -> careerfitApi method -> DTO mapper -> UI type -> presentational component
```

Neu nam duoc truc nay, ban co the review contract, debug API, va vibe coding frontend mot cach an toan ma khong can tro thanh nguoi code UI chuyen sau.

