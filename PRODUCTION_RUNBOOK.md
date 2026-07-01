# CareerFit Production Runbook

## Security Trust Boundaries

### 1. Prometheus and Metrics
Prometheus scrapes the `/actuator/prometheus` endpoint which is exposed via the Spring Boot backend without authentication.
**Trust Boundary**: The `prometheus` container is placed securely within the Docker `internal` network. The backend container only exposes the `8080` port to the internal network. Externally, the backend is inaccessible except through the Nginx reverse proxy. The Nginx reverse proxy DOES NOT forward `/actuator/**` paths. As such, only internal containers can access the metrics endpoints.

### 2. Frontend Reverse Proxy (Nginx)
The `careerfit-prod-frontend` container acts as the ingress (Edge) and serves static files while proxying API requests to the `careerfit-prod-backend` container on the internal network.
**Trust Boundary**: Nginx intercepts all traffic and proxies to `/api/`. It explicitly drops untrusted `X-Forwarded-For` headers from the internet and overwrites them with `$remote_addr`. The backend is configured to use the Spring Framework's forwarded header strategy securely.

### 3. TLS Offloading
Currently, Nginx inside the Docker network exposes port 80.
**Trust Boundary**: It is heavily recommended to place an external reverse proxy (like Cloudflare, AWS ALB, or an external Nginx/Traefik instance) in front of the application server to handle TLS termination. This external proxy should forward requests to port 80 of the Docker host. The backend application will safely generate secure links because `APP_BASE_URL` forces HTTPS context and HSTS headers are injected natively by Spring Security.

## Backup and Restore Procedures

### Database Backups
- Use `scripts/backup.ps1` to dump the production database securely.
- Usage: `.\scripts\backup.ps1`

### Database Restoration
- Use `scripts/restore.ps1` to restore the production database from a previous SQL dump.
- Usage: `.\scripts\restore.ps1 -BackupFile ".\backups\careerfit_TIMESTAMP.sql"`
- Note: Restoration overwrites existing data. Please double check before executing.
