# Remediation report — Checkpoint 2

## Acceptance evidence

| Acceptance area | Evidence |
|---|---|
| Settings and Demo Mode | `Phase2SettingsCatalogCvIntegrationTest.testSettingsContractAndDemoToggle`; `phase2-ui.spec.ts` PATCH/timing test |
| Active catalog without CV | `testActiveCatalogBehaviors`; browser catalog test |
| CV terminal states and retry | `testCvPipelineTerminalStatesAndRetryAuthorization` |
| Scraped JD cleanup | `job-description.spec.ts` |
| Dead passwordless UI | Login route, component, settings preference, and API methods removed; stale Playwright flow removed |

## Commands completed

- `./mvnw.cmd test-compile` — PASS
- `./mvnw.cmd '-Dtest=Phase1OutboxPolicyTest,Phase2SettingsCatalogCvIntegrationTest' test` — PASS (9 + 3 tests)
- `npm run type-check` — PASS
- `npx playwright test tests/phase2-ui.spec.ts tests/job-description.spec.ts --project=chromium --reporter=line` — PASS (3 tests)
- `git diff --check` — PASS

No migration, reset, import, Phase 3 feature, commit, or push was performed.
