# CareerFit-IT-AutoPilot

Backend update report: xem `BACKEND_DOCUMENTATION.md`.

## Database local

Project uu tien dung PostgreSQL local qua Docker cho development va demo truc tiep tren may ca nhan.

Chay PostgreSQL local:

```powershell
Copy-Item .env.example .env
docker compose up -d
```

Thong tin ket noi mac dinh:

```text
Host: localhost
Port: 5433
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

Backend doc datasource tu cac bien `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` neu duoc set. Neu khong set, backend mac dinh ket noi vao PostgreSQL Docker tai `jdbc:postgresql://localhost:5433/careerfit`.

Chay backend bang Docker neu can:

```powershell
docker compose --profile backend up -d --build
```

Khi chay bang profile `backend`, backend container se ket noi PostgreSQL qua Docker network bang `jdbc:postgresql://postgres:5432/careerfit`. Port PostgreSQL tren may host van la `5433`, con port `5432` chi dung noi bo giua cac container.

Backend Docker image da cai san Tesseract OCR va language data `vie+eng` de doc PDF scan/image-only. Neu chay backend truc tiep bang Maven tren host Windows, can cai Tesseract rieng hoac set `TESSERACT_COMMAND` toi duong dan binary.

Xem log backend:

```powershell
docker compose logs -f backend
```

Huong database chinh:

- Primary DB: PostgreSQL.
- Development DB: PostgreSQL local qua Docker Compose.
- Optional demo/deploy DB: Supabase PostgreSQL hoac PostgreSQL cloud khac.
- Migration: Flyway.
- Demo seed: Flyway seed tao account `ca` / `1` va `re` / `1`; account `ca` co default CV va matching cards mau de test `GET /api/matches/me/cards`.
- File CV: local storage trong development, co the doi sang Supabase Storage/S3 sau.
- Auth: Spring Security JWT/passwordless tu lam, khong phu thuoc Supabase Auth.

Kiem tra nhanh backend/API sau khi chay PostgreSQL va backend:

```powershell
curl.exe -i http://localhost:8080/api/auth/me
curl.exe -i "http://localhost:8080/api/jobs/search?page=0&size=20"
curl.exe -i "http://localhost:8080/api/jobs/search/suggestions?keyword=React"
```

`/api/auth/me` khong token nen ky vong tra `401`; hai endpoint job public nen tra `200`.

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
http://127.0.0.1:5173/candidate/jobs/{jobId}
http://127.0.0.1:5173/candidate/employers/northstar-healthtech
http://127.0.0.1:5173/candidate/upload
http://127.0.0.1:5173/candidate/profile
http://127.0.0.1:5173/candidate/advanced-analytics
http://127.0.0.1:5173/candidate/settings
http://127.0.0.1:5173/recruiter
http://127.0.0.1:5173/recruiter/jobs
http://127.0.0.1:5173/recruiter/analytics
http://127.0.0.1:5173/recruiter/advanced-analytics
http://127.0.0.1:5173/recruiter/settings
http://127.0.0.1:5173/automation/confirm
```

Hien tai UI candidate co cac luong chinh:

- Mac dinh vao trang guest tai `/`: hien tong quan va viec lam public, khong hien cac khoi ca nhan nhu Goi y, Tu dong ung tuyen, Ung tuyen.
- Guest co nav gan giong Candidate de xem duoc Dashboard va Jobs public; cac tab Upload CV, Ho so & CV, Goi y, Ung tuyen va AutoFit se hien man hinh yeu cau dang nhap.
- Header guest chi co Guest chip, nut Dang nhap va chuyen ngon ngu. Sau khi dang nhap, header hien workspace day du va logout/delete account nam trong Settings.
- Login guard va Apply modal truyen `next` intent de sau login quay lai trang vua dinh mo neu role phu hop.
- Login uu tien goi backend `POST /api/auth/login`; token va account duoc luu trong `localStorage`. Neu backend chua chay, frontend fallback ve mock `ca` / `1` cho Candidate va `re` / `1` cho Recruiter de UI van demo duoc.
- Trang tong quan hien search hero, mot so job moi va nut xem tat ca.
- Khi go keyword se hien goi y tim kiem trong luc o input dang focus.
- Bam Search se chuyen sang trang ket qua `/candidate/jobs?keyword=...`.
- Trang ket qua hien list job mot cot, filter bar va link vao job detail.
- Job detail co sticky apply bar khi cuon xuong.
- Nha tuyen dung noi bat co route chi tiet rieng.
- Upload CV co 2 tab: Document Parser va Manual Creation.
- Ho so & CV quan ly nhieu CV, ho so co dinh va Portfolio / Du an.
- Candidate Settings quan ly tai khoan, job alerts, privacy va security.
- Candidate job feed uu tien `GET /api/matches/me/cards` de lay score/potential/reasons. Account demo `ca` / `1` da co default CV va matching seed nen route Candidate Jobs co the lay data that khi backend dang chay.
- Public job feed/detail uu tien `GET /api/jobs/search` va `GET /api/jobs/{jobId}`.
- Recruiter tong quan (`/recruiter`) tach rieng voi trang Viec lam HR Dashboard (`/recruiter/jobs`) va uu tien `GET /api/recruiter/dashboard`, `GET /api/recruiter/jobs`.
- Recruiter Settings quan ly company profile, team permissions, JD defaults va recruiting notifications.
- Trang Thong ke cu cua recruiter van giu tai `/recruiter/analytics`.
- Advanced Analytics UI da co route rieng `/candidate/advanced-analytics` va `/recruiter/advanced-analytics`, su dung market analytics public ket hop analytics theo role. Backend contract cho UI nam tai `Frontend/ADVANCED_ANALYTICS_API.md`.
- UX hien tai da duoc polish: job card co avatar cong ty, metadata co icon, insight row, hover/detail action ro hon; search suggestions va modal co animation; job list co skeleton loading khi API dang fetch; cac interactive surfaces co focus visible, hover lift va reduced-motion support.

Frontend API client nam tai `Frontend/src/lib/api.ts`. Mac dinh client goi `http://localhost:8080/api`; co the doi bang bien moi truong Vite `VITE_API_BASE_URL`.

### Build kiem tra

```powershell
cd Frontend
npm run build
```

Build output se nam trong `Frontend/dist`.

### Ghi chu hien tai

- Frontend da co API client that cho auth, public/candidate jobs, suggestions va recruiter dashboard/jobs.
- Mock data hien chi la fallback khi backend chua chay, request loi hoac database chua co seed du lieu. Voi DB da chay Flyway den V7, public search va candidate demo job cards nen dung du lieu backend.
- Neu port `5173` dang bi dung, chay port khac bang:

```powershell
npm run dev -- --port 5174
```
