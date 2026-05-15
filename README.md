# CareerFit-IT-AutoPilot

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
http://127.0.0.1:5173/candidate
http://127.0.0.1:5173/candidate/jobs
http://127.0.0.1:5173/candidate/upload
http://127.0.0.1:5173/recruiter
http://127.0.0.1:5173/recruiter/analytics
http://127.0.0.1:5173/automation/confirm
```

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
