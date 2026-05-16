# CareerFit-IT-AutoPilot

## Database local

Project uu tien dung PostgreSQL local qua Docker cho development va demo truc tiep tren may ca nhan.

Chay PostgreSQL local:

```powershell
docker compose up -d
```

Thong tin ket noi mac dinh:

```text
Host: localhost
Port: 5432
Database: careerfit
Username: careerfit
Password: careerfit
```

Dung database:

```powershell
docker compose down
```

Dung va xoa sach du lieu local:

```powershell
docker compose down -v
```

Luu y: `down -v` se xoa volume PostgreSQL local. Schema backend nen duoc tao bang Flyway migration, khong tao bang thu cong.

Huong database chinh:

- Primary DB: PostgreSQL.
- Development DB: PostgreSQL local qua Docker Compose.
- Optional demo/deploy DB: Supabase PostgreSQL hoac PostgreSQL cloud khac.
- Migration: Flyway.
- File CV: local storage trong development, co the doi sang Supabase Storage/S3 sau.
- Auth: Spring Security JWT/passwordless tu lam, khong phu thuoc Supabase Auth.

## Frontend

Frontend nam trong thu muc `Frontend` va hien dang chay bang React 18, TypeScript, Vite.

### Yeu cau

- Node.js 20.x
- npm 10.x hoac tuong duong

### Khoi dong moi truong local

```powershell
cd Frontend
npm install
npm run dev
```

Mac dinh Vite se mo dev server tai:

```text
http://127.0.0.1:5173/
```

Mot so route co the dung de kiem tra nhanh:

```text
http://127.0.0.1:5173/
http://127.0.0.1:5173/jobs
http://127.0.0.1:5173/login
http://127.0.0.1:5173/candidate
http://127.0.0.1:5173/candidate/jobs
http://127.0.0.1:5173/candidate/jobs?keyword=React
http://127.0.0.1:5173/candidate/jobs/senior-frontend-engineer
http://127.0.0.1:5173/candidate/employers/northstar-healthtech
http://127.0.0.1:5173/candidate/upload
http://127.0.0.1:5173/candidate/profile
http://127.0.0.1:5173/candidate/settings
http://127.0.0.1:5173/recruiter
http://127.0.0.1:5173/recruiter/jobs
http://127.0.0.1:5173/recruiter/analytics
http://127.0.0.1:5173/recruiter/settings
http://127.0.0.1:5173/automation/confirm
```

Hien tai UI candidate co cac luong chinh:

- Mac dinh vao trang guest tai `/`: hien tong quan va viec lam public, khong hien cac khoi ca nhan nhu Goi y, Tu dong ung tuyen, Ung tuyen.
- Guest chi thay nut Dang nhap va chuyen ngon ngu tren header; cac route tinh nang se hien man hinh yeu cau dang nhap.
- Tai khoan demo: `ca` / `1` vao Candidate, `re` / `1` vao Recruiter.
- Trang tong quan hien search hero, mot so job moi va nut xem tat ca.
- Khi go keyword se hien goi y tim kiem trong luc o input dang focus.
- Bam Search se chuyen sang trang ket qua `/candidate/jobs?keyword=...`.
- Trang ket qua hien list job mot cot, filter bar va link vao job detail.
- Job detail co sticky apply bar khi cuon xuong.
- Nha tuyen dung noi bat co route chi tiet rieng.
- Upload CV co 2 tab: Document Parser va Manual Creation.
- Ho so & CV quan ly nhieu CV, ho so co dinh va Portfolio / Du an.
- Candidate Settings quan ly tai khoan, job alerts, privacy va security.
- Recruiter tong quan (`/recruiter`) tach rieng voi trang Viec lam HR Dashboard (`/recruiter/jobs`).
- Recruiter Settings quan ly company profile, team permissions, JD defaults va recruiting notifications.

Luu y backend contract can dong bo voi cac API search, employer, candidate CV/profile/portfolio, recruiter workspace va job-market analytics trong `srs.md`, `architecture.md` va `Backend/backend-implementation-guide.md`.

### Build kiem tra

```powershell
cd Frontend
npm run build
```

Build output se nam trong `Frontend/dist`.

### Ghi chu hien tai

- Frontend dang dung mock data de chay doc lap khi backend chua noi that.
- Backend base URL sau nay nen dat qua bien moi truong Vite, vi du `VITE_API_BASE_URL`.
- Neu port `5173` dang bi dung, chay port khac bang:

```powershell
npm run dev -- --port 5174
```
