from pathlib import Path
import shutil

from docx import Document


ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "Doc" / "CareerFit-Thesis-Report.docx"
BACKUP = ROOT / "Doc" / "working" / "CareerFit-Thesis-Report-before-20260722-language-review.docx"


REPLACEMENTS = {
    "Recruitment in the information technology sector requires candidates and recruiters to process large amounts of heterogeneous information from curricula vitae and job descriptions.":
        "Recruitment in the information technology sector requires candidates and recruiters to compare many types of information from curricula vitae and job descriptions. Most job portals support posting, searching, and manual applications, while automated screening tools may not clearly explain how a score is calculated or how an automated action is controlled. This thesis presents CareerFit IT AutoPilot, a web-based recruitment platform that combines a job portal, CV-job description matching, personalized job recommendations, policy-based automation, and Human-in-the-Loop interaction in one workflow.",
    "The system processes candidate profiles, curricula vitae, job descriptions, preferences, and user feedback.":
        "The system processes candidate profiles, curricula vitae, job descriptions, preferences, and user feedback. Text is normalized and represented with Term Frequency-Inverse Document Frequency vectors. Cosine similarity ranks CV-job pairs and candidate-job recommendations, while the Rocchio relevance-feedback method updates learned representations from explicit feedback. An AutoFit policy checks scores, user consent, thresholds, interaction history, quotas, cooldown rules, time zones, and quiet hours before choosing an action. Email-action links expire, store only hashed tokens, show a confirmation page without changing data, and require a POST request to complete the action. Audit records make actions easier to trace and help prevent a link from being used more than once.",
    "The project demonstrates a practical approach to recruitment automation in which explainable scoring and configurable policies assist users without removing human oversight from consequential decisions.":
        "The project shows a practical approach to recruitment automation. Explainable scores and configurable policies support users while people remain responsible for important decisions. Current limitations include lexical vector representations and controlled evaluation data. Semantic representations, larger real-world studies, and stronger management controls are left for future work.",
    "Automation can reduce repetitive work, but a similarity score should not directly trigger a consequential action.":
        "Automation can reduce repetitive work, but a similarity score should not directly trigger an important action. User consent, application state, previous interactions, thresholds, quotas, and special conditions also matter. CareerFit uses a Human-in-the-Loop design so users can review important actions and administrators can trace what happened.",
    "The evaluation scope is also bounded.":
        "The evaluation scope is limited. Controlled or synthetic datasets can show whether Rocchio changes rankings in the expected direction, but they cannot prove recruitment quality in a real production setting. The source and purpose of scraped, seeded, or synthetic data must be stated. Claims about usability, performance, security, or production readiness are limited to the test environment, participants, procedures, and evidence available during the final evaluation.",
    "Recruitment matching is an information-retrieval and decision-support problem in which heterogeneous evidence about candidates and vacancies must be compared.":
        "Recruitment matching is an information-retrieval and decision-support problem that compares different types of evidence about candidates and vacancies. A curriculum vitae usually describes education, work history, projects, technical skills, certifications, languages, and contact information. A job description lists responsibilities, required and preferred skills, seniority, location, employment conditions, and company context. Some data is structured, such as years of experience or location, while other data is free text and may use inconsistent terms. Therefore, exact database filters are useful for fixed conditions but are not enough to rank the overall fit between a candidate and a position.",
    "Before vectorization, text must be converted into a consistent representation.":
        "Before vectorization, text must be converted into a consistent form. A typical pipeline extracts machine-readable text, normalizes character encoding and letter case, separates or standardizes tokens, removes formatting noise, and may filter stop words or apply stemming or lemmatization. For recruitment documents, preprocessing must keep important technical tokens such as framework names, programming languages, versions, and abbreviations. Removing too much information can make a CV and a JD appear less related even when they share an important technology.",
    "This separation matters because a CV describes demonstrated history, whereas a preference profile describes intent.":
        "This separation matters because a CV describes past experience, while a preference profile describes what the candidate wants. A candidate may have Java experience but look for a Go position, so CV-based matching and preference-based recommendation can produce different but valid lists. Keeping the workflows separate also makes evaluation clearer because the labels, candidate sets, and user goals of one task should not be assumed to fit the other task.",
    "A robust update process retains the immutable base vector and recomputes the learned vector from the relevant feedback history.":
        "A reliable update process keeps the original base vector and rebuilds the learned vector from the current feedback history. Updating the previously learned vector again and again can cause cumulative drift: the same recomputation may change the output even when there is no new feedback. In CareerFit, the same base vector, feedback set, and parameters should always produce the same learned vector. This repeatable behavior is important for retries, scheduled jobs, debugging, and audits.",
    "Feedback learning must be evaluated causally rather than by reporting only a final score.":
        "Feedback learning should be evaluated by comparing rankings before and after a defined feedback event in a controlled setup. The experiment records the baseline ranking, adds feedback, rebuilds the representation, and measures the effect on separate holdout items. If the same positive item is used both as feedback and as the only proof of improvement, the result is circular. Chapter 5 therefore separates feedback examples from holdout evaluation and clearly labels synthetic scenarios.",
    "Ranking quality cannot be adequately described by ordinary classification accuracy":
        "Ranking quality cannot be described well by ordinary classification accuracy because users see an ordered list and usually inspect only the first few items. Evaluation therefore needs relevance judgments and metrics that consider the cutoff K, the positions of relevant results, and graded relevance when it is available.",
    "Metric values are meaningful only when the relevance labels, candidate set, cutoff K, and aggregation procedure are documented.":
        "Metric values are meaningful only when the relevance labels, candidate set, cutoff K, and calculation method are documented. A large improvement in a synthetic scenario shows behavior only in that scenario; it does not prove hiring quality in production. Chapter 5 therefore reports the data source, baseline, holdout logic, repeated-run behavior, and threats to validity together with the metric values.",
    "Recruitment decisions can materially affect people":
        "Recruitment decisions can strongly affect people, so a similarity engine should help users set priorities instead of acting as the final decision-maker. CareerFit separates input processing, decision support, actions, learning, and audits. The matching engine provides evidence; the AutoFit policy checks whether an action is allowed; users can review or confirm important actions; feedback changes later rankings; and audit records support investigation. This design does not remove bias, but it makes the control points and system state clearer.",
    "Explainability answers why a particular result or action was produced":
        "Explainability describes why a result or action was produced. Auditability asks whether the inputs, rules, actor, channel, time, and outcome can be checked later. A list of shared skills can explain lexical similarity, but it does not prove that the whole model or decision is fair. In the same way, an audit log records what happened but does not prove that the policy was correct.",
    "Research on algorithmic hiring warns that claims about bias mitigation and performance":
        "Research on algorithmic hiring warns that claims about reducing bias and improving performance must be checked against real practices, data, and organizational context [10]. Explanations can help users understand a result, but they should be based on the features that the system actually uses. Research on explainable recommendation also separates scoring from the user-facing reasons shown with a result [14]. CareerFit therefore uses match reasons and policy outcomes that can be checked instead of unsupported natural-language claims about candidate suitability.",
    "The NIST AI Risk Management Framework organizes AI risk work around governance":
        "The NIST AI Risk Management Framework groups AI risk work into governance, mapping, measurement, and management [9]. CareerFit is not a complete implementation of this framework. However, its design follows several practical ideas: state the scope and limitations, keep people responsible for important actions, measure behavior with defined evidence, and keep records for later review.",
    "Sensitive CV content and credentials should not be copied indiscriminately into logs.":
        "Sensitive CV content and credentials should not be copied into logs without a clear need.",
    "A Candidate account owns one candidate profile and multiple cv, portfolio link, and portfolio project records.":
        "A Candidate account owns one candidate profile, multiple CVs, portfolio links, and portfolio project records.",
    "Scoring and Matching persistence flow":
        "Scoring and matching persistence flow",
    "run-now provides a controlled testing path without changing the policy semantics.":
        "The run-now operation provides a controlled testing path without changing the policy rules.",
    "Using the immutable base vector and the complete current feedback history makes recomputation idempotent for the same data and parameters.":
        "Using the original base vector and the complete feedback history makes recomputation repeatable for the same data and parameters. FeedbackService starts learning after the transaction commits, so Rocchio reads the saved feedback instead of racing the transaction that created it. Job locking prevents two updates from writing separate learned vectors at the same time, and integration tests cover this post-commit behavior.",
    "Actuator exposes health and Prometheus endpoints.":
        "Actuator exposes health and Prometheus endpoints. Micrometer records HTTP request metrics with the application name tag and latency histograms. Console logs include the timestamp, thread, level, request ID when available, logger, and message. These features provide basic monitoring data, but an available endpoint does not by itself prove that the monitoring system works. Chapter 5 must separately check reachability, access rules, Prometheus collection, and dashboard or alert evidence.",
    "The evaluation was designed to answer four questions.":
        "The evaluation was designed to answer four questions. First, does lexical scoring with Rocchio produce repeatable results and move holdout items in the expected direction after feedback? Second, do the backend modules and database migrations pass the unit, integration, security, and contract tests? Third, can the main Guest, Candidate, Recruiter, and Administrator workflows run through the integrated browser application? Fourth, what can be measured about local API latency, authorization, health, and monitoring without presenting the results as production validation?",
    "The evaluation separates algorithmic effectiveness":
        "The evaluation treats algorithm results, software correctness, browser workflows, security checks, and system health as separate areas. Passing one area does not mean that every other area also passes. In particular, the controlled Rocchio benchmark does not measure hiring quality with real production recruitment data, and a passing backend test suite does not prove that browser, monitoring, or deployment work is complete.",
    "This design tests causal behavior":
        "This design checks whether a defined feedback signal moves a related holdout item upward. It does not reproduce real recruiter behavior, naturally unbalanced applicant pools, demographic differences, intentionally misleading CVs, or changes in labor-market terms. The dataset includes a designed shared feature that makes a large improvement possible, so the result should not be treated as the expected effect in production.",
    "Earlier benchmark repetitions exposed a background persistence conflict":
        "Earlier benchmark runs showed a background database conflict even though the main test assertions passed. The current run did not log that exception because feedback learning and matching now start after the first transaction commits, and the benchmark clears previous Matching records before recalculation. This remains important: both test assertions and background errors must be checked.",
    "6.3.4 Green Assertions versus Operational Cleanliness":
        "6.3.4 Test Results versus Background Errors",
    "The benchmark dataset hash and generated JSON support algorithm reproduction.":
        "The dataset hash and generated JSON help reproduce the algorithm experiment. Maven Wrapper, Flyway, Testcontainers, the package lock, and recorded commands help rebuild the environment. Recruiter E2E cleanup is automatic, but exact reproduction is still harder because the working tree is not clean, the local database can change, imported records remain, and some web assets are external. The final thesis release should use a clean commit or archive together with a fixed evidence package.",
    "The controlled Rocchio benchmark demonstrated the intended causal behavior":
        "The controlled Rocchio benchmark showed the expected behavior on its synthetic dataset. With 50 Jobs, 100 unique CVs, 300 training pairs, and 300 holdout pairs, nDCG@5 increased from 0.037737 to 0.837737, Recall@5 and HitRate@5 increased from 0.06 to 0.86, and MRR increased from 0.058755 to 0.842665. These results show adaptation in the designed synthetic scenario, but they do not estimate performance on real recruitment data.",
    "These results support a defensible local demonstration":
        "These results support a well-tested local demonstration; they do not establish production readiness.",
    "The implementation remains bounded by local storage":
        "The implementation is limited by local storage, the availability of external Tesseract software, page and timeout limits, and a simple deterministic tokenizer. It should be described as a working ingestion pipeline rather than a general document-understanding system.",
    "The objective was achieved as an interpretable lexical baseline.":
        "The objective was achieved as an interpretable lexical baseline, not as a semantic matching model. Technology names with punctuation, synonyms, Vietnamese phrases, career changes, and context beyond shared terms remain limitations. The displayed percentage is a normalized similarity score, not a tested probability of recruitment success.",
    "which supports idempotent metric output.":
        "which produces repeatable results for the same inputs.",
    "CareerFit deliberately uses a lexical vector-space baseline":
        "CareerFit uses a lexical vector-space baseline instead of assuming that a dense or generative model is always better. This choice lets users inspect the input tokens, weights, shared terms, feedback centroids, and score calculation. For an academic system, this transparency helps explanation, debugging, boundary testing, and presentation of the implementation.",
    "This is more meaningful than adding a generic approval button after an otherwise opaque automated decision.":
        "This gives users more control than adding a general approval button after an automated decision that they cannot understand.",
    "Human oversight nevertheless does not automatically make a system fair or safe.":
        "However, human oversight does not automatically make a system fair or safe. Users may accept misleading explanations, policies may use unsuitable thresholds, and feedback may repeat individual or organizational bias. HITL must therefore be combined with error analysis, access control, ways to question or appeal results, audit review, and evaluation with representative data.",
    "The earlier background StaleObjectStateException demonstrated why test counts cannot be the only release criterion.":
        "The earlier background StaleObjectStateException showed why test counts cannot be the only release check. JUnit assertions can pass while asynchronous tasks log failures outside the main test flow. Component health and overall health must also be read together. A reliable system report should check logs, health components, output files, and side effects in addition to exit codes.",
    "The defensible differentiation is workflow control":
        "The clearest difference is workflow control: matching and recommendation are separate, policies are explicit, users keep control points, feedback has a visible mathematical effect, and actions can be audited. This difference is limited in scope but is well supported by the implementation.",
    "The controlled dataset is synthetic and intentionally structured to demonstrate causal learning.":
        "The controlled dataset is synthetic and designed to show how feedback changes ranking. It does not include natural language variety, recruiter disagreement, demographic analysis, intentionally misleading CVs, or changing labor-market patterns. The runtime database contains seed and scraped Jobs but no validated relevance labels. TF-IDF uses a manually created static IT corpus, whitespace tokenization, and maximum IDF for unknown terms. Potential detection uses fixed shared-term and seniority rules.",
    "data-subject governance have not been validated":
        "management of users' personal data has not been validated with a real deployment population.",
    "the evaluated worktree is not an immutable release commit":
        "the evaluated working tree is not a fixed release commit; these limits make production operation and exact reproduction of the results more difficult.",
    "associate each release with a clean commit and immutable evidence archive.":
        "associate each release with a clean commit and a fixed evidence archive.",
    "The main contribution is therefore a working and critically evaluated Human-in-the-Loop workflow":
        "The main contribution is therefore a working Human-in-the-Loop workflow that was carefully evaluated, not a claim that the model is always better or ready to make real hiring decisions.",
}


def replace_by_prefix(document: Document) -> list[tuple[str, str]]:
    changed = []
    remaining = dict(REPLACEMENTS)
    partial_replacements = {
        "which supports idempotent metric output.",
        "A Candidate account owns one candidate profile and multiple cv, portfolio link, and portfolio project records.",
        "Sensitive CV content and credentials should not be copied indiscriminately into logs.",
        "Scoring and Matching persistence flow",
        "run-now provides a controlled testing path without changing the policy semantics.",
        "This is more meaningful than adding a generic approval button after an otherwise opaque automated decision.",
        "data-subject governance have not been validated",
        "the evaluated worktree is not an immutable release commit",
        "associate each release with a clean commit and immutable evidence archive.",
        "The main contribution is therefore a working and critically evaluated Human-in-the-Loop workflow",
        "These results support a defensible local demonstration",
    }
    for paragraph in document.paragraphs:
        for prefix, replacement in list(remaining.items()):
            if paragraph.text.startswith(prefix) or (
                prefix in partial_replacements and prefix in paragraph.text
            ):
                old = paragraph.text
                if prefix in partial_replacements:
                    paragraph.text = old.replace(prefix, replacement)
                else:
                    paragraph.text = replacement
                changed.append((old, paragraph.text))
                del remaining[prefix]
                break
    if remaining:
        missing = "\n".join(remaining)
        raise RuntimeError(f"Replacement prefixes not found:\n{missing}")
    return changed


if not BACKUP.exists():
    BACKUP.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(REPORT, BACKUP)

document = Document(REPORT)
changes = replace_by_prefix(document)
document.save(REPORT)
print(f"Updated {len(changes)} paragraphs in {REPORT}")
