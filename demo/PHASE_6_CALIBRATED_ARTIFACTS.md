# Phase 6 calibrated live-demo artifacts

## Candidate CV

Upload [CV_Candidate_CF_Demo_Matching.docx](CV_Candidate_CF_Demo_Matching.docx) through the normal Candidate upload page after the reset and registration. It is intentionally bilingual and contains the Frontend baseline used by the calibration test.

## Three recruiter-owned live jobs

Do not seed these jobs. Create them through the Recruiter UI only after registering `phamhuuhung216@gmail.com`.

Use **CareerFit Live Demo** as the company, `Can Tho / Hybrid` as location, `FULL_TIME` as employment, and `vi` as the job language. The uploaded bilingual CV is detected as Vietnamese; matching the actual CV language is essential to use the same production tokenization path as the live demo. Copy the candidate CV's text as the shared Frontend capability baseline for all three job descriptions; this is a controlled thesis-demo fixture, not a special-case in the scoring code. Then append the indicated platform-requirement block exactly.

| Job | UI title | Append to the shared Frontend baseline | Real scoring target |
| --- | --- | --- | --- |
| 1 | `CF-DEMO-01 Frontend Engineer` | Nothing | `HIGH`, 100.00 in `LiveDemoCalibrationTest` |
| 2 | `CF-DEMO-02 Full-stack Delivery Engineer` | Repeat the block below **2 times**, then append the short tail below | 80–89 band in the live production pipeline |
| 3 | `CF-DEMO-03 Cloud Platform Engineer` | Repeat the block below **4 times** | 65–74 band in the live production pipeline; the app presents it as a transferable/potential role |

```text
Kubernetes Terraform AWS Linux networking observability security cloud platform incident reliability infrastructure orchestration deployment monitoring automation
```

Job 2 short tail:

```text
Kubernetes Terraform AWS Linux networking observability security cloud
```

The calibration test loads the real DOCX text, tokenizes it with `TextNormalizationService`, builds vectors with the production `TfIdfService`, and invokes production `ScoringService`. It asserts the bands above; it does not persist jobs, alter algorithm thresholds, or special-case either live-demo account.

## Live evidence sheet

After reset approval, record these values in the Phase 6 report:

1. reset manifest (993 total / 974 imported) and UTC start time;
2. registration time for Candidate and Recruiter;
3. CV upload time, `SCORING_DONE` time, extracted summary and skills;
4. the three job IDs, activation times, owner email and post-create total (996);
5. match score/label and Candidate UI visibility time for each job;
6. first outbox scheduled/sent time, later send spacing, and outbox deduplication keys;
7. Candidate email-action and resulting Recruiter alert IDs/times;
8. internal application ID and Recruiter applicant-view proof; and
9. final reset manifest after restoring the baseline.
