import { spawnSync } from "node:child_process";
import crypto from "node:crypto";

const DB = "careerfit_test_disposable";
const DB_URL = `jdbc:postgresql://localhost:5433/${DB}`;
const MAVEN_CMD = ".\\Backend\\careerfit-backend\\mvnw.cmd";
let failures = 0;

function assert(condition, msg) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    failures++;
  } else {
    console.log(`  ✓ ${msg}`);
  }
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    stdio: opts.capture ? "pipe" : "inherit",
    env: { ...process.env, ...(opts.env || {}) },
    shell: true,
    encoding: "utf8",
  });
  if (!opts.allowFail && result.status !== 0) {
    throw new Error(`Command failed (exit ${result.status}): ${cmd} ${args.join(" ")}\n${result.stderr || ""}`);
  }
  return result;
}

function runSql(sql, db = DB) {
  const result = spawnSync(
    "docker",
    ["compose", "exec", "-T", "postgres", "psql", "-U", "careerfit", "-d", db, "-v", "ON_ERROR_STOP=1", "-t", "-A"],
    { input: sql, encoding: "utf8" }
  );
  if (result.status !== 0) {
    console.error(`SQL stderr: ${result.stderr}`);
    throw new Error(`SQL failed (exit ${result.status}): ${sql.slice(0, 200)}`);
  }
  return result.stdout.trim();
}

function flyway(target) {
  const args = [
    "-f", "Backend/careerfit-backend/pom.xml",
    "flyway:migrate",
    `-Dflyway.url=${DB_URL}`,
    "-Dflyway.user=careerfit",
    "-Dflyway.password=careerfit",
  ];
  if (target) args.push(`-Dflyway.target=${target}`);
  run(MAVEN_CMD, args);
}

try {
  console.log("=== 1. RECREATING DISPOSABLE DATABASE ===");
  runSql("DROP DATABASE IF EXISTS careerfit_test_disposable;", "postgres");
  runSql("CREATE DATABASE careerfit_test_disposable;", "postgres");

  console.log("\n=== 2. RUNNING FLYWAY ===");
  flyway("32");

  console.log("\n=== 3. VERIFYING SUCCESS ===");
  assert(true, "All migrations succeeded on disposable database!");

} catch (e) {
  console.error("FATAL ERROR:", e);
  process.exit(1);
} finally {
  runSql("DROP DATABASE IF EXISTS careerfit_test_disposable;", "postgres");
  if (failures > 0) {
    console.error(`\n❌ Tests finished with ${failures} failures.`);
    process.exit(1);
  } else {
    console.log(`\n✅ All tests passed!`);
    process.exit(0);
  }
}
