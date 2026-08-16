# CareerFit Thesis Report Content Plan

Last updated: August 11, 2026

This plan replaces the previous six-chapter plan. It follows the newer English thesis samples in `Doc/mau-luan-van/`, the written guidance in `MauLuanVan-NienLuan.docx`, and the user's decisions for the CareerFit report.

## 1. Decisions already confirmed

- The complete report is written in English.
- The official English title remains:
  `DESIGN AND IMPLEMENTATION OF A HUMAN-IN-THE-LOOP AI-ASSISTED RECRUITMENT AUTOMATION PLATFORM FOR CV-JD EVALUATION AND RECOMMENDATION IN IT`.
- Do not add a Vietnamese title or Vietnamese abstract.
- Do not add Course 48 to the cover.
- Keep the administrative label `SOFTWARE DEVELOPMENT THESIS PROJECT` and `COURSE: CT250H`.
- Use `FACULTY OF SOFTWARE ENGINEERING`.
- Keep supervisor information as `Ph.D. Nguyen Thanh Khoa`.
- Keep student information as `Pham Huu Hung - B2203557`.
- Keep `Can Tho, August 2026`.
- Do not add Thesis Revision Confirmation or Reviewer/Examiner Comments yet. Track them in `Doc/NOTE_BoSungSau.md`.
- Preserve verified implementation and evaluation evidence. Reorganizing chapters must not weaken or exaggerate claims.
- The August 3 project-sync pass updated the technical diagrams and current interface screenshots; any extra Appendix G tutorial images remain optional.

## 2. Word formatting authority

Use the newer English Word samples as the practical layout authority where they differ from older completed PDFs.

### 2.1 Page setup

- Paper: A4, portrait.
- All sections use the official margins: top 3.0 cm, bottom 3.0 cm, left 3.5 cm, right 2.0 cm.
- Cover pages: thin black page border.
- Main font: Times New Roman, 13 pt.
- Main paragraphs: justified, 1.2-line spacing, approximately 0.75 cm first-line indent.
- Figure and table captions: Times New Roman, 11 pt, italic, centered.
- Front matter page numbers: lowercase Roman numerals.
- Introduction and subsequent content: Arabic page numbers starting at 1.

### 2.2 Heading hierarchy

- Major part and chapter titles: centered, bold, 16 pt, start on a new page.
- Level-2 headings: left aligned, bold, 13-14 pt.
- Level-3 headings: left aligned, bold, 13 pt.
- Use Word heading styles so the Table of Contents remains automatic.
- Avoid level-4 headings unless required for a compact technical subsection.

## 3. Final document order

1. Outer cover.
2. Inner cover.
3. Acknowledgements.
4. Declaration of Originality.
5. Supervisor's Comments.
6. Table of Contents.
7. List of Tables.
8. List of Figures.
9. List of Abbreviations.
10. Abstract.
11. Introduction.
12. Main Content.
13. Chapter 1. Problem Description and Requirements.
14. Chapter 2. Theoretical Background.
15. Chapter 3. System Design and Implementation.
16. Chapter 4. Testing and Evaluation.
17. Conclusion.
18. References (not numbered as Part 4).
19. Appendices (not numbered as Part 5).

## 4. Detailed content plan

## Front matter

### Outer cover

- Ministry, university, college, and faculty names.
- CTU logo.
- `SOFTWARE DEVELOPMENT THESIS PROJECT`.
- `COURSE: CT250H`.
- Official English thesis title.
- Student name and student ID.
- Location and date.
- No supervisor information on the outer cover.

### Inner cover

- Same institutional and project information as the outer cover.
- Supervisor and student information in a balanced two-column block.
- Official English thesis title.
- Location and date.

### Acknowledgements

- Retain the current concise student-level wording.
- Thank the supervisor, lecturers/staff, family, friends, and contributors.
- Keep the student name and date at the end.

### Declaration of Originality

- Declare that the report is the student's original work under the named supervisor.
- Confirm that reused ideas, data, figures, and publications are cited.
- Accept responsibility for accuracy and academic integrity.
- End with date, student label, and student name.

### Supervisor's Comments

- Provide a blank lined page for handwritten or typed comments.
- Include supervisor label, name, and date placeholder.
- Do not add Reviewer/Examiner Comments until the faculty confirms that it is required.

### Table of Contents and lists

- Use automatic Word fields.
- Order: List of Tables, List of Figures, List of Abbreviations.
- Refresh all page numbers after restructuring.
- Ensure renamed chapters, sections, captions, References, and Appendices appear correctly.

### Abstract

Keep the English abstract below 500 words and organize it as:

- `Background:` recruitment information overload and limited control/explanation in automated screening.
- `Objectives:` design an integrated CareerFit platform for matching, recommendation, controlled automation, and auditability.
- `Methods:` TF-IDF, cosine similarity, Rocchio feedback, policy checks, Spring Boot, React/TypeScript, PostgreSQL/Flyway, and verified testing.
- `Results:` 131/131 backend tests across 33 suites, 41/41 integrated Chrome tests, successful TypeScript/ESLint/Vite/bundle checks, controlled ranking improvements, and explicit limitations.
- `Keywords:` retain the current CareerFit keyword set.

## Introduction

The Introduction is not Chapter 1. Its main subsections use numbers 1-7, with numbered nested headings where needed.

### Problem Statement

- Retain the current IT recruitment problem and manual comparison burden.
- Explain why simple keyword filtering and uncontrolled automation are insufficient.
- Identify the need for explainable decision support and human control.

### Background and Related Work

- Retain the current motivation.
- Add a concise summary of lexical retrieval, learned resume-job representations, explainable recommendation, and algorithmic-hiring governance.
- State the research gap: existing approaches rarely integrate job portal workflows, explainable lexical scoring, feedback learning, policy-controlled actions, and audit records in one academic prototype.
- Keep the detailed technical literature discussion in Chapter 2.

### Research Objectives

#### Overall Objective

- Preserve the current overall objective from the approved proposal.

#### Specific Objectives

- Role-based workflows.
- CV/JD ingestion and validation.
- Matching and recommendation.
- Rocchio feedback learning.
- AutoFit policy and actionable email workflow.
- Auditability and evidence-based evaluation.

### Research Subjects and Scope

#### Research Subject

- IT recruitment workflows, CV/JD text, ranking and recommendation, feedback signals, policy-controlled automation, and auditable user actions.

#### Research Scope

- Preserve the current included and excluded scope.
- Keep real hiring-quality validation, large-scale deployment, full ATS lifecycle, and autonomous hiring decisions outside scope.

### Research Methods and Content

#### Research Methods

- Applied software-engineering research.
- Requirement analysis.
- Architecture and data design.
- Incremental implementation.
- Controlled algorithm experiment.
- Unit, integration, security, contract, and browser E2E testing.
- Runtime health and local latency observation.
- Threats-to-validity and reproducibility analysis.

#### Research Content

- Explain the Perception -> Decision -> Action -> Learning -> Audit workflow.
- Summarize the sequence from problem analysis to design, implementation, evaluation, and conclusion.
- State that evidence comes from source inspection, automated tests, runtime observations, generated evaluation artifacts, and interface screenshots.

### Key Contributions

- Preserve the current technical, integration, evaluation, and documentation contributions.
- Keep claims limited to an academic prototype.

### Thesis Structure

- Describe the new four-chapter structure and separate Conclusion.

## Main Content

## Chapter 1. Problem Description and Requirements

### 1.1 System Analysis Context

- Move from former Section 3.1.
- Explain CareerFit actors, workflows, system boundary, and operating context.

### 1.2 Stakeholders and Actors

- Move from former Section 3.2.
- Retain the actor-responsibility table.

### 1.3 Functional Requirements

- Move from former Section 3.3.
- Retain endpoint-group traceability and functional-requirement table.

### 1.4 Non-Functional Requirements

- Move from former Section 3.4.
- Cover security, privacy, reliability, performance, maintainability, auditability, and usability.

### 1.5 Use-Case Analysis

Keep the 14 approved role-oriented use cases as concise structured tables with the approved 13 fields.

- Use-case identifier.
- Primary actor.
- Preconditions.
- Trigger.
- Main flow.
- Alternative/exception flows.
- Postconditions.

Use cases:

1. UC-01 Manage Career Profile.
2. UC-02 Explore Jobs.
3. UC-03 Manage Job Applications.
4. UC-04 Provide Matching Feedback.
5. UC-05 Review Personalized Career Insights.
6. UC-06 Manage AutoFit.
7. UC-07 Respond Through Actionable Email.
8. UC-08 Manage Employer Profile and Job Postings.
9. UC-09 Review and Process Applicants.
10. UC-10 Manage Talent Pool and Invitations.
11. UC-11 Review Recruitment Analytics.
12. UC-12 Report Suspicious Recruitment Content.
13. UC-13 Administer Platform Access and Job Visibility.
14. UC-14 Review and Resolve Content Reports.

### 1.6 Chapter Summary

- Summarize the required system behavior and control boundaries.

## Chapter 2. Theoretical Background

### 2.1-2.10 Theoretical background

Retain and refine the existing material:

- Recruitment information and CV-JD matching.
- Text preprocessing and bag-of-words.
- TF-IDF and cosine similarity.
- Matching, recommendation, and ranking.
- Rocchio relevance feedback.
- Ranking metrics.
- Human-in-the-Loop control.
- Explainability and auditability.
- Web/security/audit foundations.
- Related work and research gap.

Close the chapter with `2.10 Theoretical Background Summary`. Architecture, data, security design, and deployment design belong to Chapter 3.

## Chapter 3. System Design and Implementation

### 3.1-3.5 System design

- 3.1 System Architecture.
- 3.2 Module Design.
- 3.3 Data Design.
- 3.4 Security, Failure, and Consistency Design.
- 3.5 Deployment Architecture.

### 3.6-3.19 Implementation

- 3.6 Implementation Overview.
- 3.7 Authentication and Authorization Implementation.
- 3.8 CV Ingestion and Validation.
- 3.9 Text Normalization and TF-IDF Implementation.
- 3.10 Matching and Recommendation Implementation.
- 3.11 Feedback Learning with Rocchio.
- 3.12 Application and Recruiter Workflow.
- 3.13 AutoFit and Background Processing.
- 3.14 Email Action and Audit Implementation.
- 3.15 Persistence and API Implementation.
- 3.16 Frontend Integration.
- 3.17 Deployment and Observability Implementation.
- 3.18 Implementation Limitations.
- 3.19 Chapter Summary.

Figures 2.5-2.7 became Figures 3.1-3.3. The former Chapter 3 figures became Figures 3.4-3.13. Tables 2.2-2.4 became Tables 3.1-3.3, and the former Chapter 3 tables became Tables 3.4-3.9. Screens remain Screen 3.1-Screen 3.6.

## Chapter 4. Testing and Evaluation

Move former Chapter 5 and renumber all headings, figures, tables, and references.

Content:

- Evaluation objectives.
- Environment and data.
- Controlled dataset design.
- Backend automated testing.
- Controlled Rocchio benchmark.
- Concurrency/background-error observation.
- Frontend production build.
- Chromium E2E workflows.
- Security-oriented API checks.
- Runtime health and local latency.
- Answers to research questions.
- Construct, internal, external, and reproducibility threats.
- Chapter summary.

## Conclusion

Move former Chapter 6 into an unnumbered major part.

### 1. Summary of Results

- Consolidate the verified backend, frontend, browser, runtime, and benchmark evidence.

### 2. Achievement of Thesis Objectives

- Role-based recruitment platform.
- CV/JD processing.
- Matching and recommendation.
- Feedback learning.
- AutoFit and email actions.
- Auditability and evaluation.

### 3. Discussion

- Value of an interpretable baseline.
- Human-in-the-Loop as system structure.
- Meaning of the controlled Rocchio improvement.
- Test results versus background errors.
- Product positioning.

### 4. Limitations

- Data and algorithm limitations.
- Evaluation limitations.
- Security and privacy limitations.
- Reliability and maintainability limitations.

### 5. Future Work

- Security hardening.
- Semantic/hybrid retrieval.
- Real recruiter labels and user studies.
- Cross-browser/load/failure testing.
- Clean release and evidence archive.
- External ATS or Job-board integration only after consent, ownership, recovery, and audit contracts are defined.

### 6. Closing Remarks

- State the final contribution without claiming production readiness or autonomous hiring capability.

## References

- Keep the existing 14 references and IEEE-like numbering.
- Ensure every reference remains cited after moving content.
- Add new references only if new theory or externally sourced claims are introduced.

## Appendices

### Appendix A. Requirement-Test Traceability Matrix

- Preserve the requirement-to-test chain.
- Expand into a compact table if page space permits.

### Appendix B. Selected API Contracts

- Preserve representative endpoints, authentication requirements, and ownership boundaries.

### Appendix C. Data Model Summary

- Preserve the core identity, recruitment, automation, and audit entities.

### Appendix D. Evaluation Summary

- Preserve artifact locations and the relationship between evidence and conclusions.

### Appendix E. UAT and Demonstration Script

- Expand into numbered preparation, execution, cleanup, and expected-result steps.
- Include Guest, Candidate, Recruiter, and Administrator workflows.

### Appendix F. Local Deployment Instructions

- Expand prerequisites, environment variables, database startup, backend startup, frontend startup, health verification, demo data, and shutdown/cleanup.

### Appendix G. Role-Based User Guide

- Add textual instructions now.
- Add screenshots only in the later image pass.
- Cover Guest, Candidate, Recruiter, and Administrator tasks.

## 5. Figure and screenshot plan - implemented and verified

Existing figures remain in the report, but their numbering must follow the new chapters.

### 5.1 Renumbering plan

- Former Figures 1.1-1.2 remain Introduction figures.
- Former Figures 3.1-3.6 become Figures 1.3-1.8.
- Former Figures 2.1-2.4 remain Figures 2.1-2.4.
- Former Figures 3.7-3.9 become Figures 2.5-2.7.
- Former Figures 4.1-4.10 become Figures 3.1-3.10.
- Former Screens 4.1-4.6 become Screens 3.1-3.6.
- Former Figures 5.1-5.4 become Figures 4.1-4.4.

### 5.2 August 3 image decisions

- Seven implementation diagrams were regenerated to cover the current CV review/confirmation flow, skill-transfer Potential assessment, current data domains, per-account AutoFit guard, and server-side frontend catalogue flow.
- Six body screenshots now show Candidate urgent Jobs, Candidate AutoFit settings, Candidate CV upload, Recruiter Jobs/applicants, Recruiter Talent Pool/Potential CV, and Administrator audit logs.
- Captions, image alt text, List of Figures, and pagination were refreshed after replacement.
- Extra step-by-step screenshots in Appendix G are optional and should be added only if the faculty requests a visual user manual.
- Terminal screenshots are not required because they do not materially improve the present deployment guide.

## 6. Final QA checklist

- All front-matter pages appear in the required order.
- Two covers use the same title and identity data.
- No Vietnamese abstract or Vietnamese title is added.
- Deferred committee/reviewer forms are not inserted.
- Introduction and Conclusion are separate major parts.
- Exactly four numbered chapters appear in Main Content.
- All headings, captions, tables, figures, screens, and cross-references are renumbered.
- Table of Contents, List of Tables, and List of Figures are updated.
- Main text is Times New Roman 13 pt with 1.2-line spacing.
- All sections use the official margins: top/bottom/left/right = 3.0/3.0/3.5/2.0 cm.
- No text overlaps, clipping, broken tables, or nearly blank overflow pages remain.
- Every reference is cited and every citation has a reference entry.
- The Abstract remains below 500 words.
- Appendices include usable deployment, demo, and role-based instructions.
- The final DOCX is rendered page by page and visually inspected before delivery.

## 7. Implementation status - July 26, 2026

Completed in `Doc/CareerFit-Thesis-Report.docx`:

- Converted the former six-chapter report into the approved English structure with an Introduction, four main chapters, a separate Conclusion, References, and Appendices A-G.
- Added the outer cover, inner cover, Declaration of Originality, Supervisor's Comments, structured English Abstract, six use-case tables, expanded UAT/deployment instructions, and role-based user guide.
- Kept Thesis Revision Confirmation and Reviewer/Examiner Comments out of the report; deferred items are recorded in `Doc/NOTE_BoSungSau.md`.
- Renumbered all retained tables, figures, screens, chapter headings, and visible cross-references.
- Rebuilt and refreshed the automatic Table of Contents, List of Tables, and List of Figures.
- Applied the newer English-sample formatting: A4, specified cover/body margins, Times New Roman 13 pt body text, 1.2-line spacing, 0.75 cm first-line indent, 11 pt captions, Roman front-matter numbering, and Arabic body numbering.
- Completed spelling, suspicious-character, repetition, field, style, accessibility, and visual-layout checks.
- Final Word statistics after this pass: 82 physical pages, approximately 19,936 words, 33 tables, and 37 inline images including the two cover logos.
- Rendered and visually inspected every page. No clipping, overlap, broken table, blank overflow page, or visible field code remains.

Deferred image work:

- The existing six interface screenshots are retained as current implementation evidence, but their UI content is mostly Vietnamese. In the later image pass, recapture the same workflows with the English locale if the final submission must be visually English-only.
- Decide whether Appendix G needs additional English screenshots for login/session restoration, application history, Recruiter Job creation, and Administrator user management.
- After any screenshot replacement or new figure insertion, update alt text, captions, in-text references, List of Figures, and final pagination, then repeat the full render review.

## 8. Margin and pagination update - July 30, 2026

- Applied A4 portrait and the official margins to all three Word sections: top 3.0 cm, bottom 3.0 cm, left 3.5 cm, and right 2.0 cm.
- Refreshed the Table of Contents, Lists of Tables/Figures, page numbers, and pagination.
- Compacted the TOC styles slightly to remove a nearly blank overflow page without changing report content.
- Prevented individual table rows from splitting across page boundaries.
- Final statistics: 89 physical pages; Appendices start on physical page 86, leaving 85 pages before the appendices, within the encouraged 80-90-page range.
- Rendered and visually inspected all 89 pages. No clipping, overlap, broken table row, blank overflow page, or margin violation is visible.
- Backup before applying the official margins: `Doc/working/CareerFit-Thesis-Report-before-required-margins-20260730.docx`.

## 9. Project synchronization and final QA - August 3, 2026

Completed in `Doc/CareerFit-Thesis-Report.docx`:

- Compared the report against the current dirty working tree at Git HEAD `242e13a8f7d16fc9ebcab9780264c2c2b2b4ef06`.
- Updated authentication to email/password JWT only; passwordless login is removed, while signed one-time email actions remain.
- Updated CV ingestion to include image preprocessing, OCR cleanup, `DRAFT`/`REVIEW_REQUIRED`, section editing, and Candidate confirmation before vectorization and scoring.
- Updated Potential from the old shared-term heuristic to the versioned skill-transfer model with aliases, transfer edges, role families, shared foundations, seniority compatibility, thresholds, and guard conditions. Potential remains separate from the direct cosine score and label.
- Added the current Skill catalogue/autocomplete, required Recruiter company profile, JD quality preview, Job draft/publish, urgent hiring, deadlines, application counts, server-side filters/pagination/sorting, Talent Pool, CV bookmarks, and invitations.
- Updated per-account AutoFit and notification controls: enable/pause, category rules, thresholds, quota, cooldown, quiet hours, reminders, and audit/delivery outcomes.
- Updated the schema description from Flyway V1-V15 to V1-V24 and removed the obsolete `EmailToken` entity from the current data model.
- Refreshed all evaluation claims using the August 3 run: 142 application source files, 35 test source files, 24 migrations, 33 Surefire suites, and 131/131 passing tests. TypeScript, ESLint, Vite, and bundle checks passed; Vite transformed 2,361 modules and the largest JS chunk was 387.39 kB. All 41 integrated desktop-Chrome tests passed in 42.1 seconds.
- Kept the controlled Rocchio artifact and its scope: nDCG@5 0.037737 to 0.837737 on the synthetic holdout design; this is not a real hiring-effectiveness claim.
- Replaced/regenerated 7 technical diagrams and 6 interface screenshots, updated captions and alt text, then refreshed TOC/List of Tables/List of Figures.
- Final Word statistics: 90 physical pages, approximately 19,801 words, 33 tables, and 37 inline images. Appendices start on physical page 87, so the report has 86 physical pages before appendices, within the encouraged 80-90-page range.
- Verified all three sections as A4 with top/bottom/left/right margins 3.0/3.0/3.5/2.0 cm; main text is Times New Roman 13 pt with 1.2-line spacing.
- Rendered and visually inspected all pages through Word/PDF/PNG output. No clipping, overlap, distorted image, broken table, or actual blank overflow page remains. A blank page seen in one parallel PDF chunk was re-exported separately and confirmed to be only a chunk-export artifact.
- Accessibility audit reports 0 high, 0 medium, and 0 low findings. cspell findings are limited to names, academic terms, class/tool names, acronyms, and valid technical words.
- Backup before this synchronization: `Doc/working/CareerFit-Thesis-Report-before-20260803-project-sync.docx`.

## 10. Content reporting synchronization and table-font correction - August 7, 2026

Completed in `Doc/CareerFit-Thesis-Report.docx`:

- Rechecked the updated working tree at Git HEAD `242e13a8f7d16fc9ebcab9780264c2c2b2b4ef06`; 209 modified/untracked entries were present when the new evidence was collected.
- Added the implemented Trust & Safety scope throughout the Abstract, Introduction, requirements, design, implementation, evaluation, Conclusion, and Appendices: Candidate reports an active Job; Recruiter reports a CV only through an owned Job that gives visibility; Administrator reviews grouped cases and chooses Ban or Dismiss.
- Updated the data model to Flyway V1-V25. V25 adds `content_report`, JOB/CV target types, fixed report reasons, `PENDING`/`DISMISSED`/`ACTIONED`, target report counters, queue/target indexes, a partial unique pending-report rule, and `BANNED` for Job and CV.
- Documented moderation consistency rules: target rows are locked during important changes; banning clears the pending counter and resolves pending reports; a banned CV is removed as the default; moderation events are audited.
- Updated frontend coverage for Job/CV report modals, report badges/history, the Administrator Report moderation tab, case detail, and Ban/Dismiss actions.
- Fresh backend evidence: 148 application source files, 37 test source files, 25 Flyway migrations, 35 Surefire suites, and 141/141 tests passed with 0 failures, errors, or skips. Aggregated Surefire suite time was 102.453 s, and the JAR build passed.
- Fresh frontend evidence: TypeScript, ESLint, Vite production build, and bundle check passed; Vite transformed 2,362 modules. The largest JS chunk remains the charts chunk at 387.39 kB (112.63 kB gzip). All 46 integrated desktop-Chrome tests passed, including Candidate Job report, Recruiter CV report, and Administrator Job-ban contracts.
- Set the effective font of every table cell to Times New Roman 13 pt. Table paragraphs use single spacing with no extra paragraph spacing so the larger font remains readable and compact. Word COM verification found 0 table cells with a different effective font or size.
- Refreshed the Table of Contents, List of Tables, List of Figures, fields, and pagination. Final Word statistics: 96 physical pages, approximately 19,952 words, 33 tables, and 37 inline images; Appendices start on physical page 93.
- All three sections remain A4 with top/bottom/left/right margins 3.0/3.0/3.5/2.0 cm. Main body remains Times New Roman 13 pt with 1.2-line spacing; captions remain 11 pt italic.
- The canonical document renderer was attempted but LibreOffice is not installed in this Windows workspace. The document was therefore exported with Microsoft Word to PDF, rendered into 96 PNG pages with Poppler, and visually reviewed through eight contact sheets. No clipping, overlap, broken table, distorted image, blank overflow page, or visible field code was found.
- Structural review found 0 suspicious characters, 0 adjacent repeated-word errors, 0 drawings missing alt text, and 0 tables missing the repeating-header flag. Accessibility audit found 0 high, medium, or low issues.
- Backup before this synchronization: `Doc/working/CareerFit-Thesis-Report-before-20260807-project-sync-and-table-font.docx`.
- Update scripts: `scripts/update-thesis-20260807.py` and `scripts/fix-thesis-20260807-residuals.py`.

## 11. Final role-based use-case scope - August 9, 2026

Completed in `Doc/CareerFit-Thesis-Report.docx`:

- Replaced the earlier six broad use cases with fourteen role-based user goals that match the current frontend and protected backend workflows.
- Candidate scope: manage CV/profile/portfolio and match results; search and review Jobs; manage applications and Recruiter invitations; submit match feedback; review recommendations and analytics; configure/run AutoFit; report suspicious recruitment content.
- Recruiter scope: report a visible CV; manage company profile and Job lifecycle; review/process applicants; manage Talent Pool and invitations; review analytics and configure recruitment notifications.
- Administrator scope: suspend/activate users; hide/restore Jobs without publishing an ineligible lifecycle state; review and resolve Job/CV reports.
- Email scope: one actionable-email use case with scenarios for `MATCH_NOTIFICATION`, `DAILY_DIGEST`, and `RECRUITER_INVITATION`. Passive lifecycle emails remain notifications rather than separate use cases.
- Kept Figure 1.5 CV review, Figure 1.6 feedback recomputation, Figure 1.7 AutoFit, and Figure 1.8 email-action sequence. Replaced Figure 1.4 with a new fourteen-use-case role overview.
- Updated the actor table, functional-requirement groups, Chapter 1 summary, Appendix A traceability paragraph, Table of Contents, List of Tables, List of Figures, fields, and pagination.
- Final Word statistics after this update: 100 physical pages, approximately 21,830 words, 41 tables, and 37 inline images.
- All 874 non-empty Word table cells have an effective Times New Roman 13 pt font. Structural review found 0 suspicious characters, 0 adjacent repeated words, 0 drawings missing alt text, and 0 tables missing the repeating-header flag. Accessibility audit found 0 high, medium, or low issues.
- Microsoft Word PDF export and Poppler rendering were used because LibreOffice is unavailable. The complete document and the affected use-case pages were visually checked; no clipping, overlap, broken row, distorted image, blank overflow page, or visible field code was found. UC-05 was moved to the next page to avoid an orphan heading/table header below Figure 1.6.
- Update scripts: `scripts/update-thesis-usecases-20260809.py`, `scripts/word-table-font-audit-20260809.ps1`, and `scripts/make-docx-contact-sheets-20260809.py`.

## 12. Double-line cover frame - August 9, 2026

- Replaced the single-line border on the two cover pages with the double black frame shown in the approved visual sample.
- The frame is applied only to the first Word section, which contains physical pages 1-2. Sections beginning with Acknowledgements and Main Content remain borderless.
- The border is offset from the page edge by 12 pt (approximately 4.2 mm) on all four sides and uses a 2.25 pt double-line setting.
- Cover content, official margins, pagination, and the remaining report layout are unchanged. Both cover pages were exported through Word and visually verified.
- Backup: `Doc/working/CareerFit-Thesis-Report-before-20260809-double-cover-border.docx`.
- Update script: `scripts/update-cover-double-border-20260809.py`.

## 13. Introduction heading numbering - August 9, 2026

- Numbered the Introduction's main headings from `1. Problem Statement` through `7. Thesis Structure`.
- Numbered the nested headings as `3.1`/`3.2`, `4.1`/`4.2`, and `5.1`/`5.2`, while preserving the existing Heading 2/Heading 3 hierarchy.
- Refreshed the automatic Table of Contents so the same numbering appears in the front matter.
- Compacted the Thesis Structure paragraph without changing its meaning, removing the nearly blank continuation page at the end of the Introduction.
- Final Word statistics after repagination: 99 physical pages and approximately 21,819 words.
- Backup: `Doc/working/CareerFit-Thesis-Report-before-20260809-introduction-numbering.docx`.
- Update scripts: `scripts/number-introduction-headings-20260809.py` and `scripts/compact-introduction-ending-20260809.py`.

## 14. Remove Introduction figures - August 9, 2026

- Removed the former Figure 1.1 (`CareerFit problem context and principal information flows`) and Figure 1.2 (`Scope boundary of the CareerFit thesis`) from the Introduction, including their image paragraphs and captions.
- No narrative paragraph referenced either deleted figure, so no broken in-text reference remains.
- Renumbered the six remaining Chapter 1 figures continuously as Figures 1.1-1.6 and updated their accessible title/description text where a figure number was present.
- Refreshed the List of Figures, Table of Contents, fields, and pagination.
- The Introduction now occupies physical pages 14-18; Part 2 begins on physical page 19. Final Word statistics: 98 physical pages, approximately 21,783 words, 41 tables, and 35 inline images.
- Visual and structural QA found no clipping, broken caption, missing drawing alt text, suspicious character, or adjacent repeated-word error.
- Backup: `Doc/working/CareerFit-Thesis-Report-before-20260809-remove-introduction-figures.docx`.
- Update script: `scripts/remove-introduction-figures-20260809.py`.

## 15. Approved UC-01 through UC-14 specifications - August 9, 2026

- Replaced all fourteen detailed specifications with the approved 13-field structure while preserving IDs `UC-01` through `UC-14`.
- Applied the final refinements: UC-06 includes `A6 – Save configuration without running AutoFit`; UC-14 uses `E2 – Action was already redeemed`, while expired actions remain exclusively in E3.
- Synchronized subsections 1.5.1-1.5.14, table captions, cached TOC/List of Tables entries, actor definitions, Table 1.3, Appendix A, and implementation wording in Chapter 3.
- Replaced Figure 1.2 with the approved fourteen-use-case overview. Renamed and revised Figure 3.8 as a notification-policy guard so quota, cooldown, and quiet hours are not presented as AutoApply eligibility rules.
- Verified implementation-sensitive statements: AutoFit threshold 50-100; default CV must be `SCORING_DONE`; eligible Jobs are `ACTIVE`; duplicates are skipped; a run creates at most three `AUTO_APPLIED` Applications; recruiter decisions are blocked for a `BANNED` CV; expired email actions are recorded as `EXPIRED` only during POST redemption.
- Final structural audit: A4; margins top/bottom/left/right 3/3/3.5/2 cm; Times New Roman 13 pt body and all table content; 1.2 line spacing; 14 headings, 14 captions, and 14 tables with 13 specification fields; no replacement or NUL characters.
- Latest Word-native pagination before the final same-size Figure 3.8 label correction: 124 pages and approximately 26,734 words. The full Word-to-PDF render and affected pages were visually checked with no clipping, overlap, or broken table layout.
- Update script: `scripts/update-approved-usecase-specifications-20260809.py`.

## 16. Actor-grouped Use Case order - August 10, 2026

- Reordered the detailed specifications as Candidate (`UC-01`–`UC-07`), Recruiter (`UC-08`–`UC-11`), shared Candidate/Recruiter reporting (`UC-12`), and Administrator (`UC-13`–`UC-14`).
- ID changes: old `UC-14` became `UC-07`; old `UC-07` became `UC-12`; old `UC-12` became `UC-13`; old `UC-13` became `UC-14`.
- Moved each complete heading-caption-table-figure block, then synchronized Related Use Cases, Chapter 3 wording, Appendix A traceability, TOC, and List of Tables.
- Figure 1.2 was deliberately not redrawn. An English note directly below it records the new actor grouping, and the manual redraw task is also recorded in `NOTE_BoSungSau.md`.
- Word-native render: 125 pages. Figure 1.2, all actor-group transition points, and the Chapter 1 ending were visually checked without clipping, overlap, or broken tables.
- Backup: `Doc/working/CareerFit-Thesis-Report-before-20260810-usecase-reorder.docx`; script: `scripts/reorder-usecases-by-actor-20260810.py`.

## 17. Standard algorithm flowcharts and final figure placement - August 11, 2026

- Kept all fourteen approved Use Case specifications unchanged.
- Removed the three process/algorithm figures that were mixed into Chapter 1. Chapter 1 now contains only the system context and actor-oriented Use Case diagrams: Figures 1.1-1.6 (context, overall, Candidate, Recruiter, shared reporting, and Administrator).
- Replaced the Chapter 3 CV-processing, CV-Job matching/Potential, and Rocchio-feedback figures with large monochrome flowcharts that use standard terminator, input/output, process, decision, arrow, and connector notation.
- Added `Figure 3.11. AutoFit eligibility and application decision flowchart` after Section 3.13.2. Renumbered the notification, actionable-email, and frontend figures as Figures 3.12-3.14.
- AutoFit is shown according to verified behavior: enabled policy, owned default `SCORING_DONE` CV, `ACTIVE` Jobs, configured threshold, duplicate skipping, and the three-Application per-run limit. Email quota, cooldown, quiet hours, and preferences are explicitly kept outside AutoApply eligibility.
- Refreshed the Table of Contents, List of Figures, captions, page numbers, and Word fields. Final Word pagination is 121 physical pages; the four main chapters remain within the requested 70-120 logical-page range.
- Structural QA: 41 tables and all 1,036 cells are unchanged and use Times New Roman 13 pt; 14 Use Case headings remain; Chapter 1 has 6 figures and Chapter 3 has 14 figures; all figure captions are immediately below their images.
- Microsoft Word PDF export was rasterized and all 121 pages were visually reviewed. The four new flowchart pages (physical pages 78, 82, 84, and 87) were also checked at full resolution; no clipping, overlap, broken caption, or unreadable branch was found.
- Assets: `Doc/figures/flowchart-cv-processing-20260811.png`, `flowchart-matching-potential-20260811.png`, `flowchart-rocchio-feedback-20260811.png`, and `flowchart-autofit-20260811.png`.
- Backup: `Doc/working/CareerFit-Thesis-Report-before-20260811-standard-flowcharts.docx`; scripts: `scripts/generate-standard-flowcharts-20260811.py`, `scripts/relocate-and-replace-flowcharts-20260811.py`, and `scripts/audit-standard-flowcharts-20260811.py`.

## 18. Additional standard flowcharts - August 11, 2026

- Replaced three remaining Chapter 3 pipeline/block images with standard monochrome flowcharts while keeping all narrative, tables, Use Cases, IDs, and implementation unchanged.
- `Figure 3.7` now shows startup construction of the deterministic TF-IDF IDF map from the 49-document static seed corpus and runtime sparse-vector construction, including the empty-token branch and unknown-term IDF rule.
- `Figure 3.12` now shows notification-policy evaluation in implementation order: recipient, global/type preference, quiet hours, daily quota, exact-context deduplication, category cooldown, delivery, and SENT/FAILED logging.
- `Figure 3.13` now shows the non-mutating GET confirmation followed by POST revalidation, expiry handling, supported feedback/invitation dispatch, transactional failure, REDEEMED state, and the success result.
- Updated captions and the List of Figures. Final pagination is 124 physical pages.
- Structural and visual QA passed: 41 tables and 1,036 table cells unchanged; 14 Use Case headings unchanged; no replacement/NUL characters, field errors, missing image alternative text, clipping, overlap, or broken caption.
- The three new source images are `Doc/figures/flowchart-tfidf-construction-20260811.png`, `flowchart-notification-policy-20260811.png`, and `flowchart-email-action-redemption-20260811.png`.
- Backup: `Doc/working/CareerFit-Thesis-Report-before-20260811-additional-flowcharts.docx`; script: `scripts/replace-additional-flowcharts-20260811.py`.

## 19. Remove placeholder block diagrams and replace essential visuals - August 11, 2026

- Removed all four Chapter 2 diagrams that used the simple connected-box style. Their content was already explained by the theoretical text, so Chapter 2 now contains no figures.
- Removed the redundant evaluation-environment and P0-workflow block diagrams from Chapter 4 because Tables 4.1 and 4.5 already provide the evidence.
- Replaced the essential Chapter 3 visuals with notation-specific monochrome diagrams: UML component architecture, crow's-foot ERD, UML deployment, layered module view, JWT/authorization sequence, application state machine, and frontend/API sequence.
- Replaced the former latency block image with a statistical range plot based on the verified local measurements: minimum 44.99 ms, p50 55.20 ms, mean 61.79 ms, p95 85.11 ms, and maximum 99.32 ms across 50 requests.
- Chapter 4 figures were renumbered continuously: the benchmark chart is Figure 4.1 and the latency plot is Figure 4.2. Captions and the List of Figures were refreshed.
- Preserved the six Chapter 1 context/Use Case diagrams and the seven standard algorithm flowcharts in Chapter 3. The approved 14 Use Cases, 41 tables, 1,036 table cells, narrative content, and implementation were not changed.
- Final pagination is 122 physical pages; the Introduction, four main chapters, and Conclusion occupy 103 logical pages, within the required 70-120-page core-content range.
- Structural QA: Chapter 1 has 6 figures, Chapter 2 has 0, Chapter 3 has 14, and Chapter 4 has 2; all figure captions are immediately below a drawing; all List of Figures entries match the current captions; all drawings have alternative text.
- Microsoft Word export and Poppler rasterization were used to inspect all 122 pages, with the changed figure pages checked at full resolution. No clipping, overlap, broken caption, unreadable diagram, or blank overflow page remains.
- Backup: `Doc/working/CareerFit-Thesis-Report-before-20260811-remove-placeholder-diagrams.docx`.
- Scripts: `scripts/generate-professional-diagrams-20260811.py`, `scripts/remove-placeholder-and-replace-diagrams-20260811.py`, and `scripts/fix-professional-diagram-pagination-20260811.py`.

## 20. Exact official-template border on the first two cover pages - August 11, 2026

- Replaced the previously approximated double-line cover border with the exact page-border definition copied from the first section of `Doc/mau-luan-van/Thesis template_SE_English_updated.docx`.
- The border uses the official template's `twistedLines1` Word border artwork, including the navy main line, fine black companion lines, and crossed-square corner details.
- Applied the border only to the first section, which contains physical pages 1 and 2. Page 3 and all later sections remain borderless.
- Preserved all cover text, images, tables, drawings, section structure, and pagination. The report remains 122 physical pages.
- Refreshed Word fields and exported the document through Microsoft Word. Physical pages 1-2 were checked at full resolution, and page 3 was checked to confirm that the border does not continue beyond the covers.
- Backup: `Doc/working/CareerFit-Thesis-Report-before-20260811-template-cover-border.docx`; script: `scripts/copy-template-cover-border-20260811.py`.

## 21. CDM, LDM, PDM, and full Data Dictionary - August 11, 2026

- Reworked Section 3.3 into `3.3.1 Data Design Overview`, `3.3.2 Conceptual Data Model`, `3.3.3 Logical Data Model`, `3.3.4 Physical Data Model`, and `3.3.5 Data Dictionary`.
- Verified the final PostgreSQL schema directly from the running CareerFit database after Flyway V1-V25: 24 active tables and 293 persisted columns. The obsolete `email_token` table is excluded because V16 removes it.
- Added nine monochrome draw.io-style diagrams: one compact CDM, four domain-cluster LDM diagrams, and four corresponding PDM diagrams. They use rectangular entity/table nodes, light-gray headers, orthogonal relationship lines, cardinalities, PK/FK labels, and no decorative color pipeline style.
- Preserved the existing integrity-constraint table after the PDM discussion and renumbered the remaining Chapter 3 figures continuously as Figures 3.11-3.22.
- Replaced the short Appendix C schema summary with `Appendix C. Full Data Dictionary`: one physical-table catalogue plus 24 field-level dictionary tables. Each persisted column records PostgreSQL type, nullability, key role, default/check constraint, and a concise description.
- Updated the Table of Contents, List of Tables, List of Figures, captions, cross-references, and pagination. Table captions remain above tables and figure captions remain directly below drawings.
- Final Word pagination is 182 physical pages. The thesis core from Introduction through Conclusion ends at logical page 111, within the requested 70-120-page range; detailed schema material is kept in Appendix C.
- Structural QA passed: 66 tables, 38 drawings, Figures 3.1-3.22 continuous, 25 Appendix C captions, 24 dictionary tables, 293 dictionary rows, A4 margins 3/3/3.5/2 cm, Times New Roman 13 pt table content, and no broken bookmark, replacement, or NUL characters.
- Microsoft Word export and Poppler rasterization were used to inspect all 182 pages. No clipping, overlap, detached caption, broken table, unreadable diagram, or blank overflow page remains.
- Backup: `Doc/working/CareerFit-Thesis-Report-before-20260811-data-design.docx`.
- Scripts: `scripts/generate-data-design-diagrams-20260811.py`, `scripts/apply-data-design-restructure-20260811.py`, `scripts/fix-data-design-caption-spacing-20260811.py`, `scripts/fix-data-design-figure-pagination-20260811.py`, and `scripts/audit-data-design-restructure-20260811.py`.

## 22. Flowchart alignment and figure enlargement - August 11, 2026

- Redrew all seven Chapter 3 algorithm/process flowcharts without changing their verified workflow content.
- Moved `YES`/`NO` labels away from decision borders, added a white clearance area behind branch labels, aligned side-result nodes with the relevant decision centers, and straightened horizontal branch arrows.
- Replaced the seven embedded flowchart images and enlarged them from 5.20 to 5.30 inches while keeping the tallest figure and its caption inside the A4 content area.
- Enlarged all remaining Chapter 3/4 technical diagrams, data-model diagrams, screenshots, and charts to 6.10 inches, matching the usable 15.5 cm page width.
- Refreshed the Table of Contents, List of Figures, fields, and pagination. Final pagination is 183 physical pages; the core content ends at logical page 112, still within the required 70-120-page range.
- Full render and structural QA passed: no clipping, overlap, detached caption, broken arrow, font regression, or text/table change. The report retains 66 tables, 38 drawings, 24 data-dictionary tables, and 293 dictionary columns.
- Backup: `Doc/working/CareerFit-Thesis-Report-before-20260811-figure-refinement.docx`.
- Scripts: `scripts/generate-standard-flowcharts-20260811.py` and `scripts/refine-and-enlarge-thesis-figures-20260811.py`.

## 23. Appendix C left alignment and final flowchart spacing - August 11, 2026

- Left-aligned every paragraph in all 25 Appendix C tables, including header cells, identifiers, PostgreSQL types, constraints, and descriptions.
- Kept all table content at Times New Roman 13 pt and assigned explicit portrait-page column widths across the 15.5 cm usable area. Narrow cell padding and top vertical alignment improve readability without changing the data-dictionary content.
- Removed one completely empty trailing row from Table App.C.25; the appendix still contains exactly 24 schema tables and 293 persisted-column rows.
- Regenerated and reinserted all seven Chapter 3 flowcharts. Decision text now uses additional internal clearance, side-result boxes have wider gaps, `YES`/`NO` labels no longer cover borders, and branch connectors use visible horizontal/vertical segments without crossing unrelated nodes.
- Refreshed Word fields, the Table of Contents, Lists of Tables/Figures, and pagination. Final pagination remains 183 physical pages.
- Structural QA passed: 66 tables, 38 drawings, 25 Appendix C captions, 24 dictionary tables, 293 dictionary rows, Times New Roman 13 pt table content, A4 margins 3/3/3.5/2 cm, and no bookmark, replacement-character, or NUL errors.
- Microsoft Word export was rasterized and all 183 pages were reviewed via contact sheets; all seven flowchart pages and representative Appendix C pages were also inspected at full resolution.
- Backup: `Doc/working/CareerFit-Thesis-Report-before-20260811-flowchart-and-dictionary-fix.docx`.
- Scripts: `scripts/generate-standard-flowcharts-20260811.py` and `scripts/fix-appendix-c-alignment-and-flowcharts-20260811.py`.

## 24. Functional Design based on the updated thesis example - August 11, 2026

- Added `3.4 Functional Design` immediately after Data Design. The section follows the reference pattern: purpose, numbered implementation screenshot, interface-component table, processing logic, and a large sequence diagram.
- Candidate functions: Explore Jobs, Manage AutoFit, and Upload and Confirm a CV. Recruiter functions: Manage Job Postings and Applicants, and Manage Talent Pool and Invitations. Administrator function: Review Administrative Audit Activity.
- Reused the six verified frontend screenshots that were previously grouped in Frontend Integration, annotated their visible controls, and moved them into the relevant role/function subsections. No new UI or implementation behavior was invented.
- Added six three-column interface-component tables (`Table 3.3`-`Table 3.8`) and six readable monochrome sequence diagrams. Data-used tables were intentionally not repeated because Section 3.3 and Appendix C already contain the data models and full dictionary.
- Renumbered all following Chapter 3 headings, figures, and tables. Refreshed the Table of Contents through Heading 4, List of Figures, List of Tables, page numbers, and all Word fields.
- The final document has 193 physical pages, 72 tables, and 44 drawings. Chapters 1-4 occupy logical pages 6-113 (108 pages), within the required 70-120-page core range.
- Visual QA covered all Functional Design pages at full resolution. Screenshots, numbered markers, tables, sequence arrows, participant labels, captions, and page boundaries are readable and do not overlap or clip.
- Backup: `Doc/working/CareerFit-Thesis-Report-before-20260811-functional-design.docx`.
- Main scripts: `scripts/generate-functional-design-assets-20260811.py`, `scripts/add-functional-design-section-20260811.py`, `scripts/refine-functional-design-layout-20260811.py`, `scripts/compact-functional-design-section-20260811.py`, and `scripts/replace-functional-design-sequences-20260811.py`.

## 25. Focused content reduction - August 12, 2026

- Executed the approved reduction plan without changing the implementation, the 14 Use Case structure, Functional Design, Data Design, figures, or appendices.
- Kept Sections `2.2.2 Bag-of-Words Representation`, `2.3.1 Term Frequency and Inverse Document Frequency`, and `2.3.2 Cosine Similarity` byte-equivalent at the paragraph/style level to the pre-edit backup.
- Reduced overlap in the Introduction among the Problem Statement, Background, Objectives, Scope, and Contributions.
- Shortened Chapter 2 in project-independent explanations while retaining CareerFit-specific treatment of Vietnamese text, OCR, technical tokens, matching, feedback, evaluation, security, actionable-email tokens, and auditability. Existing reference `[2]` is now cited where normalization and information-retrieval evaluation concepts are summarized.
- Clarified the CDM and LDM purposes in Sections 3.3.2 and 3.3.3. Removed repeated descriptions of the architecture stack, Appendix C, authentication controls, deployment, persistence/API conventions, and frontend page inventory elsewhere in Chapter 3.
- Preserved Functional Design and the verified separation of CV-Job Matching, profile-oriented Recommendation, Potential assessment, Rocchio feedback, AutoFit, and actionable email.
- Condensed repeated test-suite descriptions, concurrency observations, runtime-health statements, and the Chapter 4 summary without changing any recorded evidence or claiming a new test run.
- Consolidated the Conclusion so that results, objective achievement, limitations, future work, and closing remarks no longer repeat full feature/test inventories.
- Word count changed from 31,704 to 29,849 and pagination from 193 to 190 physical pages. The core Chapters 1-4 occupy logical pages 6-111 (106 pages), within the required 70-120-page range.
- Final QA: 1,102 paragraphs, 72 tables, 44 drawings, 14 Use Case headings, no field-reference errors or invalid characters. All edited/core pages were exported through Microsoft Word and visually reviewed; no clipping, detached caption, broken table/figure, or abnormal blank page was found.
- Backup: `Doc/working/CareerFit-Thesis-Report-before-20260812-content-reduction.docx`.
- Scripts: `scripts/reduce-thesis-content-20260812.py` and `scripts/audit-content-reduction-20260812.py`.

## 26. Vietnamese recruitment-portal and project-inspiration references - August 12, 2026

- Added five web references as `[15]`-`[19]`: ITviec, CareerViet, TopDev, TopCV Pro, and the CareerViet Talent Community article about AI Matching.
- Added `[15]`-`[18]` in Introduction Section 2 to establish the practical Vietnamese recruitment-portal context without treating portal marketing pages as academic algorithm evidence.
- Added `[19]` in Section 2.9 to identify the CareerViet AI Matching article as a practical source of project inspiration. The paragraph explicitly distinguishes this industry example from evidence of algorithmic effectiveness.
- Each reference contains the organization, page title, `[Online]` marker, clickable URL, and access date `Aug. 12, 2026`.
- Refreshed Word fields and pagination. The report remains 190 physical pages; the References section now spans logical pages 119-120 and Appendices begin on logical page 121.
- Structural and visual QA passed: 19 numbered references, working external hyperlink relationships, 72 tables, 44 drawings, 14 Use Case headings, no field errors, and no change to protected Sections 2.2.2, 2.3.1, or 2.3.2.
- Backup: `Doc/working/CareerFit-Thesis-Report-before-20260812-web-references.docx`.
- Script: `scripts/add-recruitment-web-references-20260812.py`.

## 27. Final typography, evidence, appendix, and visual QA pass - August 12, 2026

- Normalized the report to the current teacher template: Times New Roman 13 pt body and table text, 1.2 line spacing, consistent Heading 1-4 hierarchy, 12 pt italic captions, table captions above tables, and figure captions below figures.
- Removed justify-induced wide word spacing from tables and from the remaining 11 short or code-heavy paragraphs. The final typography audit reports zero non-Times New Roman direct fonts and zero wide-word-spacing risks.
- Removed two blank TOC candidates by changing section-break-only paragraphs from Heading 2 to Normal. The previously removed empty Heading 3 before Section 1.5.1 remains absent.
- Converted Appendix A traceability and Appendix B selected API contracts into concise tables. Appendix C contains the 24-table/293-column dictionary in landscape sections with continuous page numbering and left-aligned 13 pt content.
- Renamed the Conclusion tables to `Table Con.1`-`Table Con.3` and refreshed the Table of Contents, List of Tables, List of Figures, captions, and pagination through Microsoft Word.
- Kept the focused 19-source bibliography. No extra generic website sources were added; `[15]`-`[19]` remain limited to the four relevant Vietnamese recruitment portals and the CareerViet AI Matching inspiration article.
- Re-ran the current evidence on August 12: backend 141/141 tests passed across 35 suites; frontend production build, ESLint, and bundle check passed; 49/49 Chromium E2E tests passed; the controlled benchmark retained the recorded baseline and Rocchio metrics.
- The final document has 213 physical pages, 74 tables, 44 drawings, 30,314 Word-counted words, and five sections. Chapters 1-4 end at logical page 119; the detailed data dictionary is in Appendix C and excluded from the core-page recommendation.
- Structural audit: 1,114 body paragraphs, no empty headings, repeated sentences, replacement characters, NUL, soft hyphen, NBSP, or direct non-Times fonts; no wide-word-spacing risk remains.
- Microsoft Word exported all 213 pages to PDF, and all 18 contact sheets were visually inspected. No clipping, overflow, overlap, corrupt glyph, broken caption, or abnormal blank TOC entry was found.
- Final file: `Doc/CareerFit-Thesis-Report.docx`; pre-pass backup: `Doc/working/CareerFit-Thesis-Report-before-final-format-20260812.docx`.
- Main scripts: `scripts/final-format-and-content-polish-20260812.py`, `scripts/final-word-spacing-and-section-style-fix-20260812.py`, `scripts/word-refresh-export-final-20260812.ps1`, and `scripts/audit-thesis-typography-content-20260812.py`.
