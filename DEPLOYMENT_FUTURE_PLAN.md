# Ke Hoach Trien Khai CareerFit Trong Tuong Lai

## 1. Muc dich

Tai lieu nay ghi lai ke hoach dua CareerFit tu ban demo do an len moi truong Production. Hien tai **chua trien khai**, khong tao server, domain, database Production hay secret Production.

## 2. Hai muc hoan thanh

### Muc A - Bao cao, demo va bao ve do an

Du an du dieu kien su dung o muc nay khi:

- Ma nguon release da duoc commit va push.
- Backend tests, frontend build va cac E2E flow cot loi da pass tren moi truong local.
- Co du lieu demo va ba tai khoan `ca / 1`, `re / 1`, `ad / 1`.
- Co kich ban demo du phong khi email, OCR hoac Internet khong on dinh.
- Tai lieu kien truc, API, thuat toan, test va gioi han nghien cuu khop voi code.
- Nguoi trinh bay co the giai thich ro benchmark tong hop khong thay the danh gia bang du lieu nguoi dung that.

Muc nay khong bat buoc co domain, HTTPS, cloud server hoac nguoi dung that. Laptop local va Docker co the duoc xem la moi truong trinh dien.

### Muc B - Production

Production la moi truong he thong that phuc vu nguoi dung qua Internet, su dung domain, HTTPS, database ben vung, secret that, backup, monitoring va quy trinh xu ly su co. Du an chi dat muc nay sau khi da trien khai va kiem tra tren ha tang dich.

## 3. Trang thai hien tai

- Muc A: da san sang ve ma nguon va kiem thu local; van can dien tap buoi demo/UAT cuoi tren may se dung de bao ve.
- Muc B: chua bat dau trien khai.
- Release commit: `bd648595a39d11b05570a6bf4acd9ad8cfc9c2be`.
- Khong duoc ghi nhan trang thai Production PASS truoc khi hoan thanh tat ca cong trien khai ben duoi.

## 4. Ke hoach trien khai sau nay

### Giai doan 0 - Quyet dinh pham vi

- Xac dinh deploy de thu nghiem rieng, pilot noi bo hay phuc vu cong khai.
- Chon nha cung cap VPS/cloud va ngan sach hang thang.
- Chon domain va nguoi quan ly tai khoan ha tang.
- Xac dinh du lieu nao duoc phep dua len server.

**Dieu kien qua cong:** co quyet dinh bang van ban ve pham vi, chi phi va nguoi chiu trach nhiem.

### Giai doan 1 - Chuan bi ha tang

- Tao server Linux, firewall va tai khoan deploy khong dung root truc tiep.
- Cai Docker Engine va Docker Compose.
- Cau hinh domain, DNS va reverse proxy TLS.
- Chi mo cac cong public can thiet; PostgreSQL, Prometheus va backend internal khong public truc tiep.

**Dieu kien qua cong:** domain truy cap bang HTTPS va cac dich vu noi bo khong bi lo ra Internet.

### Giai doan 2 - Secret va cau hinh

- Tao `JWT_SECRET`, mat khau PostgreSQL, SMTP App Password va Grafana password rieng cho Production.
- Cau hinh `SPRING_PROFILES_ACTIVE=prod`, `APP_BASE_URL`, `CORS_ORIGINS` va mail settings.
- Tat expose token va demo shortcut khong phu hop Production.
- Luu secret bang secret manager hoac file chi tai server, khong commit Git.

**Dieu kien qua cong:** Production validator pass va secret scan khong phat hien secret trong repository/log.

### Giai doan 3 - Du lieu, storage va OCR

- Tao PostgreSQL Production va volume ben vung.
- Backup truoc khi chay migration; xac minh Flyway tu V1 den migration moi nhat.
- Mount volume ben vung cho CV upload.
- Xac minh Tesseract `vie+eng` trong backend image neu bat OCR.
- Chi import scraped jobs da duoc lam sach va co provenance.

**Dieu kien qua cong:** migration pass, upload/parse CV pass va backup co the restore tren moi truong thu nghiem.

### Giai doan 4 - Trien khai ung dung

- Deploy dung release SHA da duyet.
- Khoi dong stack Production bang Compose.
- Xac minh readiness/health cua database, backend va frontend.
- Khong chay seed/demo credential tren he thong cong khai neu khong co co che bao ve.

**Dieu kien qua cong:** tat ca container healthy va khong co migration/startup error.

### Giai doan 5 - Smoke test va UAT

- Test public search, suggestions, login va role authorization.
- Test Candidate upload CV, OCR, matching, apply va Auto-Apply policy.
- Test Recruiter JD, candidate discovery, invite va application lifecycle.
- Test Admin dashboard, audit log, suspend/activate va job moderation.
- Test email that, link action, toggle va no-spam rules.
- Chay UAT tren domain Production, khong chi tren localhost.

**Dieu kien qua cong:** cac flow P0 pass, khong co loi security/data loss va nguoi dung chap nhan ket qua UAT.

### Giai doan 6 - Monitoring, backup va rollback

- Xac minh Prometheus target, histogram, alert rules va Grafana dashboard.
- Cau hinh noi nhan alert.
- Lap lich backup PostgreSQL va retention.
- Dien tap restore va rollback ve release truoc.
- Ghi lai RTO/RPO va nguoi xu ly su co.

**Dieu kien qua cong:** co bang chung alert, backup, restore va rollback hoat dong.

### Giai doan 7 - Mo Production va theo doi

- Mo quyen truy cap theo pham vi da phe duyet.
- Theo doi log, latency, error rate, email failure, OCR failure va disk usage.
- Danh gia lai sau 24 gio, 7 ngay va 30 ngay.
- Ghi technical debt va tao release tiep theo neu can.

**Dieu kien hoan thanh:** he thong on dinh theo thoi gian theo doi va khong con loi nghiem trong.

## 5. Ke hoach rieng cho buoi bao ve

1. Dung release commit da xac minh, khong cap nhat code sat gio trinh bay.
2. Khoi dong Docker va toan bo he thong truoc buoi bao ve.
3. Chay nhanh login ba role va mot flow Candidate/Recruiter/Admin.
4. Chuan bi san CV text PDF, scanned PDF va JD demo.
5. Kiem tra SMTP/OCR; neu mang yeu, dung evidence va ket qua da tao san de minh hoa.
6. Backup database demo truoc buoi trinh bay.
7. Chuan bi anh/video du phong cho cac flow phu thuoc Internet.
8. Trinh bay ro day la demo local da duoc kiem thu, khong tuyen bo da van hanh Production.

## 6. Dieu kien bat dau deploy

Chi bat dau khi nguoi dung chu dong phe duyet:

- Nen tang dich va server.
- Domain.
- Ngan sach.
- Cach quan ly secret.
- Du lieu duoc phep dua len Production.
- Thoi gian bao tri va rollback.

Cho den luc do, du an dung o trang thai **release cho bao cao/demo**, khong co hanh dong deploy nao duoc thuc hien.
