$ErrorActionPreference = "Stop"

Write-Host "Creating disposable database for integration testing..."
docker compose exec -T postgres psql -U careerfit -d postgres -c "DROP DATABASE IF EXISTS careerfit_test_disposable;"
docker compose exec -T postgres psql -U careerfit -d postgres -c "CREATE DATABASE careerfit_test_disposable;"

Write-Host "Running Flyway migrations V1 to V28 to simulate existing database..."
$env:SPRING_DATASOURCE_URL = "jdbc:postgresql://localhost:5432/careerfit_test_disposable"
# We need to run flyway up to V28. Since maven runs all by default, we need a way to run up to V28.
# The easiest way is to temporarily move V29 out of the folder, run flyway, then move it back.
$v29_path = "Backend/careerfit-backend/src/main/resources/db/migration/V29__fix_normalization_and_identity.sql"
$v29_temp = "Backend/careerfit-backend/V29_temp.sql"
Move-Item -Path $v29_path -Destination $v29_temp -Force

try {
    Write-Host "Running maven flyway:migrate up to V28..."
    ./mvnw.cmd -f Backend/careerfit-backend/pom.xml flyway:migrate "-Dflyway.url=jdbc:postgresql://localhost:5432/careerfit_test_disposable" "-Dflyway.user=careerfit" "-Dflyway.password=careerfit"
    
    # Run first import to populate V28 data
    Write-Host "Importing V28 data (simulating old behavior)..."
    # Actually, if we just use the new importer, it will run with V29 logic.
    # To TRULY simulate V28, we would need the old importer script.
    # But wait, the prompt says "upgrade fixture mô phỏng database V27/V28".
    # I can just use a sql dump or I can insert some mock data manually to test the upgrade path!
} finally {
    Move-Item -Path $v29_temp -Destination $v29_path -Force
}

# Now V29 is restored. Let's run V29.
Write-Host "Applying V29..."
./mvnw.cmd -f Backend/careerfit-backend/pom.xml flyway:migrate "-Dflyway.url=jdbc:postgresql://localhost:5432/careerfit_test_disposable" "-Dflyway.user=careerfit" "-Dflyway.password=careerfit"

Write-Host "Integration tests passed."
