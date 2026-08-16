from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import math
import textwrap

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "Doc" / "working" / "thesis-unpacked-functional-design-20260811" / "word" / "media"
OUT = ROOT / "Doc" / "working" / "functional-design-assets-20260811"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    path = Path(r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf")
    return ImageFont.truetype(str(path), size=size)


def annotate_screenshot(source_name: str, output_name: str, markers: list[tuple[int, int, int]]) -> None:
    image = Image.open(SOURCE / source_name).convert("RGB")
    draw = ImageDraw.Draw(image)
    radius = max(18, round(min(image.size) * 0.032))
    number_font = font(max(20, radius), bold=True)

    for number, x, y in markers:
        x = max(radius + 3, min(image.width - radius - 3, x))
        y = max(radius + 3, min(image.height - radius - 3, y))
        draw.ellipse(
            (x - radius, y - radius, x + radius, y + radius),
            fill="white",
            outline="black",
            width=max(3, radius // 7),
        )
        label = str(number)
        box = draw.textbbox((0, 0), label, font=number_font)
        draw.text(
            (x - (box[2] - box[0]) / 2, y - (box[3] - box[1]) / 2 - box[1]),
            label,
            fill="black",
            font=number_font,
        )

    image.save(OUT / output_name, quality=96)


@dataclass(frozen=True)
class Message:
    src: int
    dst: int
    label: str
    dashed: bool = False


@dataclass(frozen=True)
class Divider:
    label: str


def wrapped_lines(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    lines: list[str] = []
    for source_line in text.splitlines() or [text]:
        words = source_line.split()
        current = ""
        for word in words:
            if draw.textbbox((0, 0), word, font=fnt)[2] > max_width:
                if current:
                    lines.append(current)
                    current = ""
                chunk = ""
                for char in word:
                    trial = chunk + char
                    if chunk and draw.textbbox((0, 0), trial, font=fnt)[2] > max_width:
                        lines.append(chunk)
                        chunk = char
                    else:
                        chunk = trial
                current = chunk
                continue
            trial = word if not current else f"{current} {word}"
            if draw.textbbox((0, 0), trial, font=fnt)[2] <= max_width:
                current = trial
            else:
                if current:
                    lines.append(current)
                current = word
        if current:
            lines.append(current)
    return lines or [""]


def dashed_line(draw: ImageDraw.ImageDraw, xy: tuple[int, int, int, int], fill: str, width: int, dash: int = 14) -> None:
    x1, y1, x2, y2 = xy
    distance = math.hypot(x2 - x1, y2 - y1)
    if distance == 0:
        return
    ux, uy = (x2 - x1) / distance, (y2 - y1) / distance
    pos = 0.0
    while pos < distance:
        end = min(pos + dash, distance)
        draw.line((x1 + ux * pos, y1 + uy * pos, x1 + ux * end, y1 + uy * end), fill=fill, width=width)
        pos += dash * 1.75


def arrow(draw: ImageDraw.ImageDraw, x1: int, y: int, x2: int, dashed: bool) -> None:
    if dashed:
        dashed_line(draw, (x1, y, x2, y), fill="black", width=3, dash=15)
    else:
        draw.line((x1, y, x2, y), fill="black", width=3)
    direction = 1 if x2 > x1 else -1
    draw.polygon(
        [(x2, y), (x2 - direction * 16, y - 8), (x2 - direction * 16, y + 8)],
        fill="black",
    )


def sequence_diagram(
    output_name: str,
    title: str,
    participants: list[str],
    events: list[Message | Divider],
) -> None:
    width = 2000
    header_top = 95
    header_height = 150
    left = 120
    right = 120
    message_font = font(38)
    header_font = font(36, bold=True)
    title_font = font(44, bold=True)
    divider_font = font(32, bold=True)
    line_step = 45
    event_gap = 95
    divider_gap = 95
    count = len(participants)
    xs = [round(left + i * (width - left - right) / (count - 1)) for i in range(count)]

    # Measure the same wrapped lines that will actually be drawn. Estimating by
    # character count can make the final message fall outside the PNG when a
    # narrow participant interval forces an additional line.
    measure_image = Image.new("RGB", (1, 1), "white")
    measure_draw = ImageDraw.Draw(measure_image)
    height = header_top + header_height + 65
    for event in events:
        if isinstance(event, Divider):
            height += divider_gap
        else:
            label_width = max(250, abs(xs[event.dst] - xs[event.src]) - 60)
            line_count = len(wrapped_lines(measure_draw, event.label, message_font, label_width))
            height += event_gap + max(0, line_count - 1) * line_step
    height += 180

    image = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(image)
    draw.text((width / 2, 28), title, font=title_font, fill="black", anchor="ma")

    box_width = min(320, round((width - left - right) / (count - 1) * 0.86))
    for x, participant in zip(xs, participants):
        lines = wrapped_lines(draw, participant, header_font, box_width - 24)
        box_left = x - box_width // 2
        box_right = x + box_width // 2
        draw.rounded_rectangle(
            (box_left, header_top, box_right, header_top + header_height),
            radius=8,
            fill="#F2F2F2",
            outline="black",
            width=3,
        )
        total_h = len(lines) * 47
        ty = header_top + (header_height - total_h) / 2 + 2
        for line in lines:
            draw.text((x, ty), line, font=header_font, fill="black", anchor="ma")
            ty += 47
        dashed_line(draw, (x, header_top + header_height, x, height - 42), fill="#555555", width=2, dash=13)

    y = header_top + header_height + 65
    step = 0
    for event in events:
        if isinstance(event, Divider):
            y += divider_gap
            band_top = y - 25
            band_bottom = y + 20
            draw.rectangle((left - 45, band_top, width - right + 45, band_bottom), fill="#EEEEEE", outline="#555555", width=2)
            draw.text((left - 22, y - 17), event.label, font=divider_font, fill="black")
            continue

        step += 1
        x1, x2 = xs[event.src], xs[event.dst]
        label_width = max(250, abs(x2 - x1) - 60)
        lines = wrapped_lines(draw, event.label, message_font, label_width)
        y += event_gap + max(0, len(lines) - 1) * line_step
        arrow(draw, x1, y, x2, event.dashed)
        text_y = y - 12 - len(lines) * line_step
        for line in lines:
            draw.text(((x1 + x2) / 2, text_y), line, font=message_font, fill="black", anchor="ma")
            text_y += line_step

        circle_x = x1 + (24 if x2 > x1 else -24)
        draw.ellipse((circle_x - 20, y - 20, circle_x + 20, y + 20), fill="black")
        step_label = str(step)
        small = font(24, bold=True)
        draw.text((circle_x, y - 1), step_label, font=small, fill="white", anchor="mm")

    image.save(OUT / output_name, quality=96)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    annotate_screenshot(
        "image30.png",
        "interface-explore-jobs-annotated.png",
        [(1, 615, 123), (2, 92, 238), (3, 405, 238), (4, 1090, 238), (5, 810, 448), (6, 75, 548)],
    )
    annotate_screenshot(
        "image31.png",
        "interface-autofit-annotated.png",
        [(1, 612, 124), (2, 60, 379), (3, 70, 474), (4, 357, 474), (5, 663, 474), (6, 949, 474), (7, 104, 581)],
    )
    annotate_screenshot(
        "image32.png",
        "interface-cv-upload-annotated.png",
        [(1, 630, 125), (2, 244, 465), (3, 488, 620), (4, 868, 526)],
    )
    annotate_screenshot(
        "image33.png",
        "interface-recruiter-jobs-annotated.png",
        [(1, 470, 123), (2, 118, 308), (3, 186, 414), (4, 801, 414), (5, 1135, 414), (6, 127, 545), (7, 1114, 586), (8, 521, 544)],
    )
    annotate_screenshot(
        "image34.png",
        "interface-talent-pool-annotated.png",
        [(1, 410, 124), (2, 56, 186), (3, 635, 316), (4, 410, 429), (5, 704, 659), (6, 829, 661), (7, 974, 661), (8, 1166, 661)],
    )
    annotate_screenshot(
        "image35.png",
        "interface-admin-audit-annotated.png",
        [(1, 84, 123), (2, 222, 123), (3, 327, 123), (4, 429, 123), (5, 575, 123), (6, 75, 289)],
    )

    sequence_diagram(
        "sequence-explore-jobs.png",
        "Explore Jobs - Sequence Diagram",
        ["Candidate / Guest", "React Jobs UI", "JobController", "JobService", "PostgreSQL"],
        [
            Message(0, 1, "Enter keyword and filters"),
            Message(1, 2, "GET /api/jobs/search with paging and filters"),
            Message(2, 3, "search(criteria)"),
            Message(3, 4, "Query eligible active Jobs and employer data"),
            Message(4, 3, "Return result page", True),
            Message(3, 2, "Return Jobs and result metadata", True),
            Message(2, 1, "Return API response", True),
            Message(1, 0, "Display catalogue and empty-state or match guidance", True),
            Divider("Open a selected Job"),
            Message(0, 1, "Select a Job"),
            Message(1, 2, "GET /api/jobs/{id}"),
            Message(2, 3, "getById(jobId)"),
            Message(3, 4, "Load Job and employer profile"),
            Message(4, 3, "Return Job detail", True),
            Message(3, 1, "Display Job detail", True),
        ],
    )

    sequence_diagram(
        "sequence-autofit.png",
        "Manage AutoFit - Sequence Diagram",
        ["Candidate", "React AutoFit UI", "Automation Controller", "Policy / AutoApply Service", "PostgreSQL"],
        [
            Message(0, 1, "Open AutoFit settings"),
            Message(1, 2, "GET /api/automation/policy"),
            Message(2, 3, "getOrCreate(userId)"),
            Message(3, 4, "Load or create automation policy"),
            Message(4, 1, "Return current policy summary", True),
            Message(0, 1, "Change consent, thresholds, or schedule-related settings"),
            Message(1, 2, "PATCH /api/automation/policy"),
            Message(2, 3, "Validate and update owned policy"),
            Message(3, 4, "Persist automation policy"),
            Message(4, 1, "Return saved configuration", True),
            Divider("Optional manual AutoFit run"),
            Message(0, 1, "Request Run now"),
            Message(1, 2, "POST /api/automation/auto-apply/run-now"),
            Message(2, 3, "runForPolicy(policy)"),
            Message(3, 4, "Validate default CV; read Matchings; create eligible Applications"),
            Message(4, 1, "Return number of created Applications", True),
        ],
    )

    sequence_diagram(
        "sequence-cv-upload.png",
        "Upload and Confirm CV - Sequence Diagram",
        ["Candidate", "React CV UI", "CV Controller", "CV Processing Service", "PostgreSQL"],
        [
            Message(0, 1, "Select a supported CV"),
            Message(1, 2, "POST /api/cv/upload"),
            Message(2, 3, "acceptDocumentUpload(file, userId)"),
            Message(3, 4, "Extract and validate content; save the review state"),
            Message(4, 3, "Return the saved CV state", True),
            Message(3, 1, "Return CV identifier and processing state", True),
            Divider("Candidate review and confirmation"),
            Message(0, 1, "Edit extracted fields and confirm"),
            Message(1, 2, "POST /api/cv/{id}/review/confirm"),
            Message(2, 3, "confirmReview(cvId, review, userId)"),
            Message(3, 4, "Save confirmed CV and scoring state"),
            Message(3, 1, "Return accepted status; Matching starts after commit", True),
        ],
    )

    sequence_diagram(
        "sequence-recruiter-jobs.png",
        "Manage Job Postings and Applicants - Sequence Diagram",
        ["Recruiter", "React Recruiter UI", "Job / Application Controller", "Job / Application Service", "PostgreSQL"],
        [
            Message(0, 1, "Open Jobs workspace"),
            Message(1, 2, "GET /api/jobs/mine with status and paging"),
            Message(2, 3, "getMyJobs(recruiterId, filters)"),
            Message(3, 4, "Query recruiter-owned Jobs"),
            Message(4, 1, "Return Job page", True),
            Divider("Publish a valid draft"),
            Message(0, 1, "Select Publish"),
            Message(1, 2, "POST /api/jobs/{id}/publish"),
            Message(2, 3, "Validate ownership, company, JD quality, and deadline"),
            Message(3, 4, "Set Job to ACTIVE and persist"),
            Message(4, 1, "Return published Job", True),
            Divider("Review applicants for the selected Job"),
            Message(0, 1, "Open applicant list"),
            Message(1, 2, "GET applicants for {jobId}"),
            Message(2, 3, "Verify ownership and load applicant page"),
            Message(3, 4, "Query Applications, Candidates, CVs, and Matching context"),
            Message(4, 1, "Display applicants and current states", True),
        ],
    )

    sequence_diagram(
        "sequence-talent-pool.png",
        "Manage Talent Pool and Invitations - Sequence Diagram",
        ["Recruiter", "React Talent UI", "Recruiter APIs", "Talent / Application Service", "PostgreSQL"],
        [
            Message(0, 1, "Select an owned Job"),
            Message(1, 2, "Request Matching and Potential CV views"),
            Message(2, 3, "Verify Job ownership and query visible candidates"),
            Message(3, 4, "Load Matchings, CVs, Applications, and bookmarks"),
            Message(4, 1, "Display candidate groups and states", True),
            Divider("Bookmark a Candidate"),
            Message(0, 1, "Select Bookmark"),
            Message(1, 2, "PUT Talent Pool bookmark"),
            Message(2, 3, "bookmark(jobId, candidateId, recruiterId)"),
            Message(3, 4, "Upsert recruiter CV bookmark"),
            Message(4, 1, "Return bookmark state", True),
            Divider("Invite an eligible Candidate"),
            Message(0, 1, "Select Invite"),
            Message(1, 2, "POST recruiter invitation"),
            Message(2, 3, "Validate and create invitation Application"),
            Message(3, 4, "Persist invitation and audit state"),
            Message(4, 1, "Display pending invitation", True),
        ],
    )

    sequence_diagram(
        "sequence-admin-audit.png",
        "Review Administrative Audit Activity - Sequence Diagram",
        ["Administrator", "React Admin UI", "Admin Audit Log Controller", "Audit Log Repository", "PostgreSQL"],
        [
            Message(0, 1, "Open Audit logs"),
            Message(1, 2, "GET /api/admin/audit-logs with paging and filters"),
            Message(2, 3, "Request ordered audit entries"),
            Message(3, 4, "Query audit_log records"),
            Message(4, 3, "Return audit page", True),
            Message(3, 2, "Map entries to audit response", True),
            Message(2, 1, "Return paginated result", True),
            Message(1, 0, "Display time, actor, action, target, and result", True),
        ],
    )

    for path in sorted(OUT.glob("*.png")):
        print(f"{path.name}: {path.stat().st_size} bytes")


if __name__ == "__main__":
    main()
