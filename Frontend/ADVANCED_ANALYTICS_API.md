# Advanced Analytics API Contract

Status: backend đã implement các endpoint trong tài liệu này. Tài liệu backend hiện nằm tại `../Backend/careerfit-backend/README.md` và `../Backend/careerfit-backend/BACKEND_CODE_GUIDE.md`.

Frontend route hiện tại:

- Candidate: `/candidate/advanced-analytics`
- Recruiter: `/recruiter/advanced-analytics`
- Chưa có route public riêng; market widgets hiện được dùng trong hai route Advanced Analytics theo role.

Lưu ý: `/recruiter/analytics` vẫn là trang Thống kê cũ/basic analytics. Advanced Analytics phải nằm ở route riêng để không phá UI cũ.

Các route role-specific phải dùng JWT thật khi gọi endpoint role-scoped. UI không fallback sang số liệu mock khi request API thất bại; cần hiển thị loading/error/empty state rõ ràng.

Trạng thái wiring 2026-07-18:

- Đã nối market overview, skills, salary, trends; candidate overview/match trends; recruiter overview/trends.
- Candidate skill-demand/profile-gaps hiện được hiển thị từ payload overview; API client có method riêng nhưng trang chưa gọi riêng.
- Chưa có UI drill-down cho recruiter job funnel và skill-gap.
- Chưa phát `POST /api/analytics/events` từ các interaction frontend.
- Xem ma trận tổng thể tại [BACKEND_UI_COVERAGE.md](BACKEND_UI_COVERAGE.md).

## Auth

- Candidate endpoints yêu cầu role `CANDIDATE`.
- Recruiter endpoints yêu cầu role `RECRUITER`.
- Market GET endpoints là public giống `/api/analytics/stats`.
- Event tracking `POST /api/analytics/events` yêu cầu đăng nhập.

## Candidate Endpoints

### `GET /api/candidate/analytics/overview`

Dùng cho cards tổng quan đầu trang.

Response `data`:

```ts
type CandidateOverview = {
  profileCompleteness: number;
  cvCount: number;
  scoringDoneCvCount: number;
  totalMatches: number;
  highMatches: number;
  potentialMatches: number;
  averageMatchScore: number;
  bestMatchScore: number;
  totalApplications: number;
  applicationFunnel: Record<string, number>;
  skillDemand: SkillDemandItem[];
  profileGaps: ProfileGapItem[];
};
```

### `GET /api/candidate/analytics/skill-demand`

Dùng cho bar chart/list skill của candidate.

```ts
type SkillDemandItem = {
  skill: string;
  jobCount: number;
  candidateHasSkill: boolean;
};
```

### `GET /api/candidate/analytics/profile-gaps?top=12`

Dùng cho missing skill recommendations.

```ts
type ProfileGapItem = {
  skill: string;
  marketDemand: number;
  reason: string;
};
```

### `GET /api/candidate/analytics/match-trends?days=30`

Dùng cho line chart.

```ts
type TrendPoint = {
  date: string;
  jobs: number;
  matches: number;
  applications: number;
  views: number;
  avgMatchScore: number;
};
```

## Recruiter Endpoints

### `GET /api/recruiter/analytics/overview?rangeDays=30`

Dùng cho KPI cards, top jobs và overview chart.

```ts
type RecruiterOverview = {
  totalJobs: number;
  activeJobs: number;
  totalApplicants: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  invited: number;
  autoApplied: number;
  totalMatchings: number;
  highMatchings: number;
  potentialMatchings: number;
  averageMatchScore: number;
  jobViews: number;
  topJobs: JobPerformanceItem[];
};

type JobPerformanceItem = {
  jobId: string;
  title: string;
  status: string;
  views: number;
  matches: number;
  applications: number;
  avgMatchScore: number;
};
```

### `GET /api/recruiter/analytics/jobs/{jobId}/funnel?rangeDays=30`

Dùng cho funnel chart theo job.

```ts
type JobFunnel = {
  jobId: string;
  title: string;
  status: string;
  steps: {
    views: number;
    matches: number;
    applications: number;
    invited: number;
    approved: number;
    rejected: number;
  };
  conversionRates: Record<string, number>;
};
```

### `GET /api/recruiter/analytics/jobs/{jobId}/skill-gap`

Dùng cho required skill coverage chart.

```ts
type JobSkillGapItem = {
  skill: string;
  matchedCandidateCount: number;
  candidateHasSkill: number;
  candidateMissingSkill: number;
  coverageRate: number;
};
```

### `GET /api/recruiter/analytics/trends?days=30`

Same `TrendPoint`.

## Market Endpoints

### `GET /api/analytics/market/overview?rangeDays=30`

```ts
type MarketOverview = {
  activeJobs: number;
  totalJobs: number;
  newJobsInRange: number;
  employers: number;
  jobViews: number;
  jobSearches: number;
  applications: number;
  matchings: number;
  topSkills: SkillDemandItem[];
  salaryDistribution: SalaryBucket[];
};

type SalaryBucket = {
  currency: string;
  seniority: string;
  jobCount: number;
  minSalary: number;
  averageSalary: number;
  maxSalary: number;
};
```

### Other Market APIs

- `GET /api/analytics/market/skills?top=20`
- `GET /api/analytics/market/salary`
- `GET /api/analytics/market/trends?days=30`

## Event Tracking

UI nên bắn event sau khi user tương tác thật. Event metrics có thể bằng `0` cho tới khi UI tích hợp phần này.

### `POST /api/analytics/events`

```ts
type AnalyticsEventRequest = {
  eventType:
    | "JOB_VIEWED"
    | "JOB_SEARCHED"
    | "JOB_APPLIED"
    | "CV_UPLOADED"
    | "MATCH_CARD_VIEWED"
    | "MATCH_CARD_CLICKED"
    | "AUTOFIT_ENABLED"
    | "RECRUITER_VIEWED_CANDIDATE"
    | "APPLICATION_STATUS_CHANGED";
  subjectType?: "JOB" | "CV" | "MATCHING" | "CANDIDATE" | "APPLICATION";
  subjectId?: string;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
};
```

Ví dụ:

```ts
await api.post("/analytics/events", {
  eventType: "JOB_VIEWED",
  subjectType: "JOB",
  subjectId: jobId,
  metadata: { source: "candidate_analytics" },
});
```

## UI Notes

- Candidate page nên ưu tiên: profile completeness, best/avg match score, application funnel, skill demand, profile gaps, match trend.
- Recruiter page nên ưu tiên: active jobs, applicant funnel, high/potential matches, average match score, top jobs, per-job funnel, per-job skill gap.
- Khi `views` hoặc `jobSearches` bằng `0`, hiển thị là “Chưa có dữ liệu tracking” thay vì coi là lỗi.
