from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Pt


ROOT = Path(r"C:\CODING\Thesis")
SOURCE = ROOT / "Doc" / "CareerFit-Thesis-Report.docx"
OUTPUT = ROOT / "Doc" / "working" / "CareerFit-Thesis-Report-final-spacing-fix-20260812.docx"


LEFT_ALIGN_TEXTS = {
    "The research models CareerFit as a Perception-Decision-Action-Learning-Audit workflow. It first identifies recruitment roles, requirements, and control boundaries; then designs and implements the data, matching, recommendation, feedback, automation, email action, and audit modules. Finally, the study evaluates algorithm behavior, software correctness, browser workflows, authorization, runtime health, and local latency within the stated experimental scope.",
    "Chapter 2 presents the theoretical background.",
    "Chapter 3 presents the system design and implementation.",
    "The Conclusion discusses achievements, limitations, and future work.",
    "Negative weights are removed rather than persisted. The learned vector is stored in learnedProfileVectorJson. Every Matching associated with the Job is then marked needsRecompute=true. AutomationScheduler.recomputeStaleMatchings rescans these rows every 30 minutes and clears the marker only after successful scoring.",
    "Earlier commands are recorded in evidence/CHAPTER5_EVIDENCE_20260703.md. For the August 12 refresh, Surefire XML, Maven output, TypeScript/ESLint/Vite results, Playwright output, the current report, and evaluation/result.json are the main evidence. The report states the working-tree limitation instead of treating the commit hash as a complete release identifier. The isolated stack exposes the application at localhost:18080, while one P0 request helper still targets localhost:8080. The final 49-test run therefore used a temporary loopback proxy from port 8080 to 18080; no frontend or backend implementation code was changed for this run.",
    "Stores external portfolio links owned by a Candidate.",
    "Stores structured project entries in a Candidate portfolio.",
    "Stores Candidate interactions with personalized Job recommendations.",
    "Stores queued notification work and its retry lifecycle.",
    "Stores date-based aggregate Job-market counts and distributions.",
}


def has_section_properties(paragraph) -> bool:
    return paragraph._p.pPr is not None and paragraph._p.pPr.sectPr is not None


def normalize_runs(paragraph) -> None:
    for run in paragraph.runs:
        run.font.name = "Times New Roman"
        run.font.size = Pt(13)


def main() -> None:
    document = Document(SOURCE)
    left_aligned = 0
    section_break_styles_fixed = 0

    for paragraph in document.paragraphs:
        text = paragraph.text.strip()
        if text in LEFT_ALIGN_TEXTS:
            paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
            normalize_runs(paragraph)
            left_aligned += 1

        # Word stores a next-section break on an otherwise empty paragraph.
        # It must not use a heading style because that creates a blank TOC entry.
        if not text and has_section_properties(paragraph):
            style_name = paragraph.style.name if paragraph.style else ""
            if style_name.startswith("Heading"):
                paragraph.style = document.styles["Normal"]
                paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
                section_break_styles_fixed += 1

    if left_aligned != len(LEFT_ALIGN_TEXTS):
        raise RuntimeError(
            f"Expected to align {len(LEFT_ALIGN_TEXTS)} paragraphs, found {left_aligned}."
        )
    if section_break_styles_fixed != 2:
        raise RuntimeError(
            f"Expected to fix 2 section-break heading styles, found {section_break_styles_fixed}."
        )

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    document.save(OUTPUT)
    SOURCE.write_bytes(OUTPUT.read_bytes())
    print(f"Saved: {SOURCE}")
    print(f"Working copy: {OUTPUT}")
    print(f"Left-aligned paragraphs: {left_aligned}")
    print(f"Section-break heading styles fixed: {section_break_styles_fixed}")


if __name__ == "__main__":
    main()
