from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "Doc" / "figures"
SCHEMA_FILE = ROOT / "Doc" / "working" / "careerfit-schema-physical-columns-20260811.txt"
OUT.mkdir(parents=True, exist_ok=True)

W, H = 2800, 1900
BLACK = "#111111"
MID = "#555555"
LINE = "#333333"
LIGHT = "#E6E6E6"
PALE = "#F7F7F7"
WHITE = "#FFFFFF"


def font(size: int, bold: bool = False, italic: bool = False):
    base = Path("C:/Windows/Fonts")
    if bold and italic:
        name = "arialbi.ttf"
    elif bold:
        name = "arialbd.ttf"
    elif italic:
        name = "ariali.ttf"
    else:
        name = "arial.ttf"
    return ImageFont.truetype(str(base / name), size)


F_TITLE = font(58, bold=True)
F_SUB = font(31)
F_BOX = font(33, bold=True)
F_BOX_SMALL = font(27, bold=True)
F_FIELD = font(28)
F_SMALL = font(25)
F_TINY = font(22)
F_STEREO = font(25, italic=True)


def canvas(title: str, subtitle: str):
    image = Image.new("RGB", (W, H), WHITE)
    draw = ImageDraw.Draw(image)
    draw.text((W // 2, 42), title, font=F_TITLE, fill=BLACK, anchor="ma")
    draw.text((W // 2, 116), subtitle, font=F_SUB, fill=MID, anchor="ma")
    return image, draw


def wrap(draw, text: str, face, max_width: int):
    result = []
    for paragraph in text.split("\n"):
        words = paragraph.split()
        if not words:
            result.append("")
            continue
        current = words[0]
        for word in words[1:]:
            trial = current + " " + word
            if draw.textbbox((0, 0), trial, font=face)[2] <= max_width:
                current = trial
            else:
                result.append(current)
                current = word
        result.append(current)
    return result


def concept(draw, box, stereotype: str, name: str, detail: str = ""):
    x1, y1, x2, y2 = box
    draw.rounded_rectangle(box, radius=18, fill=WHITE, outline=BLACK, width=4)
    draw.text(((x1 + x2) // 2, y1 + 20), f"«{stereotype}»", font=F_STEREO, fill=MID, anchor="ma")
    draw.text(((x1 + x2) // 2, y1 + 61), name, font=F_BOX, fill=BLACK, anchor="ma")
    if detail:
        lines = wrap(draw, detail, F_SMALL, x2 - x1 - 36)
        y = y1 + 116
        for line in lines[:3]:
            draw.text(((x1 + x2) // 2, y), line, font=F_SMALL, fill=BLACK, anchor="ma")
            y += 34


def entity(draw, box, name: str, fields: list[str], stereotype: str = "entity", external: bool = False):
    x1, y1, x2, y2 = box
    fill = PALE if external else WHITE
    header = "#D5D5D5" if external else LIGHT
    draw.rectangle(box, fill=fill, outline=BLACK, width=4)
    header_h = 78
    draw.rectangle((x1, y1, x2, y1 + header_h), fill=header, outline=BLACK, width=4)
    draw.text(((x1 + x2) // 2, y1 + 7), f"«{stereotype}»", font=F_TINY, fill=MID, anchor="ma")
    name_face = F_BOX if draw.textbbox((0, 0), name, font=F_BOX)[2] <= x2 - x1 - 30 else F_BOX_SMALL
    draw.text(((x1 + x2) // 2, y1 + 38), name, font=name_face, fill=BLACK, anchor="ma")
    y = y1 + 94
    step = min(42, max(31, (y2 - y - 10) // max(1, len(fields))))
    for index, field in enumerate(fields):
        if index:
            draw.line((x1 + 12, y - 7, x2 - 12, y - 7), fill="#D0D0D0", width=1)
        draw.text((x1 + 18, y), field, font=F_FIELD, fill=BLACK, anchor="la")
        y += step


def relationship(draw, start, end, left="1", right="0..*", via=None, dashed=False):
    points = [start] + (via or []) + [end]
    for p1, p2 in zip(points, points[1:]):
        if dashed:
            x1, y1 = p1
            x2, y2 = p2
            length = max(abs(x2 - x1), abs(y2 - y1))
            if length == 0:
                continue
            steps = max(1, length // 24)
            for i in range(0, steps, 2):
                a = i / steps
                b = min(1, (i + 1) / steps)
                draw.line((x1 + (x2 - x1) * a, y1 + (y2 - y1) * a,
                           x1 + (x2 - x1) * b, y1 + (y2 - y1) * b), fill=LINE, width=4)
        else:
            draw.line((*p1, *p2), fill=LINE, width=4)
    # Draw.io-like cardinality labels immediately outside the connected boxes.
    first = points[1]
    last = points[-2]
    def label_point(edge, neighbor, from_start):
        dx, dy = neighbor[0] - edge[0], neighbor[1] - edge[1]
        length = max(1.0, (dx * dx + dy * dy) ** 0.5)
        ux, uy = dx / length, dy / length
        # Move along the connector and slightly above/left of it.
        return edge[0] + ux * 38 - uy * 18, edge[1] + uy * 38 + ux * 18
    label_specs = (
        (*label_point(start, first, True), left),
        (*label_point(end, last, False), right),
    )
    for x, y, label in label_specs:
        bbox = draw.textbbox((x, y), label, font=F_TINY, anchor="mm")
        draw.rectangle((bbox[0] - 6, bbox[1] - 3, bbox[2] + 6, bbox[3] + 3), fill=WHITE)
        draw.text((x, y), label, font=F_TINY, fill=BLACK, anchor="mm")


def save(image, filename: str):
    path = OUT / filename
    image.save(path, dpi=(300, 300), optimize=True)
    print(path)


def load_schema():
    schema = {}
    for raw in SCHEMA_FILE.read_text(encoding="utf-8-sig").splitlines():
        table, column, sql_type, nullable, default = raw.split("|", 4)
        schema.setdefault(table, []).append({
            "name": column,
            "type": sql_type,
            "nullable": nullable == "YES",
            "default": default,
        })
    return schema


FK_NAMES = {
    "user_id", "candidate_id", "recruiter_id", "job_id", "cv_id", "matching_id",
    "application_id", "recipient_id", "recipient_user_id", "reporter_id", "resolved_by",
    "actor_user_id",
}


def selected_fields(schema, table: str, physical: bool):
    columns = schema[table]
    preferred = [c for c in columns if c["name"] == "id" or c["name"] in FK_NAMES]
    important_names = {
        "email", "role", "status", "full_name", "settings", "display_name", "source",
        "is_default", "company_name", "slug", "title", "required_skills", "raw_score",
        "normalized_score", "label", "feedback_type", "action", "action_type", "token_hash",
        "auto_apply_enabled", "auto_apply_threshold", "job_type", "email_type", "target_type",
        "event_type", "action_type", "snapshot_date", "canonical_key", "normalized_name",
        "reason", "is_urgent", "application_deadline",
    }
    for column in columns:
        if column not in preferred and column["name"] in important_names:
            preferred.append(column)
    for column in columns:
        if len(preferred) >= 6:
            break
        if column not in preferred and column["name"] not in {"created_at", "updated_at", "version"}:
            preferred.append(column)
    preferred = preferred[:6]
    rows = []
    for column in preferred:
        prefix = "PK" if column["name"] == "id" else ("FK" if column["name"] in FK_NAMES else "")
        label = f"{prefix} {column['name']}".strip()
        if physical:
            label += f" : {column['type']}"
        rows.append(label)
    omitted = len(columns) - len(preferred)
    if omitted > 0:
        rows.append(f"+ {omitted} additional columns")
    return rows


def conceptual():
    image, draw = canvas(
        "CareerFit Conceptual Data Model",
        "Business concepts and relationships; implementation tables and data types are intentionally omitted",
    )
    boxes = {
        "User": (1040, 185, 1760, 365),
        "Candidate": (120, 500, 740, 710),
        "Career": (820, 500, 1440, 710),
        "Employer": (1560, 500, 2180, 710),
        "Job": (2240, 500, 2740, 710),
        "Matching": (260, 950, 880, 1160),
        "Application": (990, 950, 1610, 1160),
        "Talent": (1720, 950, 2340, 1160),
        "Automation": (130, 1410, 750, 1635),
        "Communication": (850, 1410, 1470, 1635),
        "Moderation": (1570, 1410, 2190, 1635),
        "Evidence": (2290, 1410, 2760, 1635),
    }
    concept(draw, boxes["User"], "business concept", "User Account", "identity, role, access state")
    concept(draw, boxes["Candidate"], "actor profile", "Candidate Profile", "career preferences and portfolio")
    concept(draw, boxes["Career"], "career evidence", "CV and Skills", "reviewed candidate evidence")
    concept(draw, boxes["Employer"], "actor profile", "Employer Profile", "Recruiter-owned company information")
    concept(draw, boxes["Job"], "recruitment object", "Job Posting", "requirements and publication state")
    concept(draw, boxes["Matching"], "decision support", "Matching and Feedback", "scores, reasons, Potential, judgments")
    concept(draw, boxes["Application"], "business workflow", "Job Application", "apply, withdraw, invite, decide")
    concept(draw, boxes["Talent"], "recruiter workflow", "Talent Pool", "saved Candidates and invitations")
    concept(draw, boxes["Automation"], "policy", "AutoFit", "Candidate-controlled application policy")
    concept(draw, boxes["Communication"], "communication", "Email and Notification", "actionable links and delivery records")
    concept(draw, boxes["Moderation"], "governance", "Content Report", "reporting and Administrator resolution")
    concept(draw, boxes["Evidence"], "evidence", "Analytics and Audit", "events, trends, and action history")

    relationship(draw, (1040, 275), (740, 605), "1", "0..1", [(830, 275), (830, 605)])
    relationship(draw, (1760, 275), (1870, 500), "1", "0..1", [(1870, 275)])
    relationship(draw, (740, 605), (820, 605), "1", "0..*")
    relationship(draw, (2180, 605), (2240, 605), "1", "0..*")
    relationship(draw, (1130, 710), (570, 950), "1", "0..*", [(1130, 830), (570, 830)])
    relationship(draw, (2490, 710), (570, 950), "1", "0..*", [(2490, 860), (570, 860)])
    relationship(draw, (430, 710), (1300, 950), "1", "0..*", [(430, 900), (1300, 900)])
    relationship(draw, (2490, 710), (1300, 950), "1", "0..*", [(2490, 900), (1300, 900)])
    relationship(draw, (2490, 710), (2030, 950), "1", "0..*", [(2490, 900), (2030, 900)])
    relationship(draw, (430, 1160), (440, 1410), "1", "0..1")
    relationship(draw, (1300, 1160), (1160, 1410), "1", "0..*")
    relationship(draw, (2030, 1160), (1160, 1410), "1", "0..*")
    relationship(draw, (2490, 710), (1880, 1410), "1", "0..*", [(2650, 710), (2650, 1320), (1880, 1320)])
    relationship(draw, (1880, 1635), (2525, 1635), "1", "0..*", dashed=True)
    save(image, "data-cdm-careerfit-20260811.png")


def draw_model(title, subtitle, boxes, fields, links, filename, physical=False, schema=None):
    image, draw = canvas(title, subtitle)
    for name, spec in boxes.items():
        display, box, external = spec
        if physical:
            rows = selected_fields(schema, name, True) if not external else ["Referenced by foreign keys"]
            entity(draw, box, display, rows, stereotype="table" if not external else "external table", external=external)
        else:
            entity(draw, box, display, fields[name], stereotype="logical entity" if not external else "external entity", external=external)
    for start_name, start_point, end_name, end_point, left, right, via, dashed in links:
        relationship(draw, start_point, end_point, left, right, via, dashed)
    note = "Physical column names and PostgreSQL types" if physical else "Logical attributes; PostgreSQL types are omitted"
    draw.text((W // 2, H - 58), note + ". Full field definitions are listed in Appendix C.", font=F_SMALL, fill=MID, anchor="ms")
    save(image, filename)


def build_models(schema):
    # Identity, Candidate, CV, Portfolio, and skill catalogue.
    identity_boxes = {
        "user_account": ("USER_ACCOUNT", (1040, 180, 1760, 515), False),
        "user_settings": ("USER_SETTINGS", (80, 650, 760, 985), False),
        "candidate": ("CANDIDATE", (1060, 650, 1780, 1030), False),
        "skills": ("SKILLS", (2040, 650, 2720, 985), False),
        "candidate_portfolio_link": ("CANDIDATE_PORTFOLIO_LINK", (80, 1240, 820, 1635), False),
        "cv": ("CV", (1030, 1240, 1810, 1675), False),
        "candidate_portfolio_project": ("CANDIDATE_PORTFOLIO_PROJECT", (1990, 1240, 2740, 1675), False),
    }
    identity_fields = {
        "user_account": ["PK id", "email", "password hash", "role", "active / verified", "preferred language"],
        "user_settings": ["PK id", "FK user", "settings", "created / updated"],
        "candidate": ["PK id", "FK user", "desired role and seniority", "skills and work model", "salary preferences", "experience and profile"],
        "skills": ["PK id", "canonical and normalized name", "search text", "category", "popularity", "active flag"],
        "candidate_portfolio_link": ["PK id", "FK Candidate", "link type", "URL", "created / updated"],
        "cv": ["PK id", "FK Candidate", "display name and source", "review / processing state", "text and sections", "skills, terms, and file metadata"],
        "candidate_portfolio_project": ["PK id", "FK Candidate", "name and role", "summary", "technology stack", "URL and impact"],
    }
    identity_links = [
        ("user_account", (1040, 345), "user_settings", (760, 815), "1", "0..1", [(900, 345), (900, 815)], False),
        ("user_account", (1400, 515), "candidate", (1420, 650), "1", "0..1", None, False),
        ("candidate", (1180, 1030), "candidate_portfolio_link", (700, 1240), "1", "0..*", [(1180, 1135), (700, 1135)], False),
        ("candidate", (1420, 1030), "cv", (1420, 1240), "1", "0..*", None, False),
        ("candidate", (1660, 1030), "candidate_portfolio_project", (2110, 1240), "1", "0..*", [(1660, 1135), (2110, 1135)], False),
        ("skills", (2040, 815), "cv", (1810, 1450), "0..*", "0..*", [(1900, 815), (1900, 1450)], True),
    ]
    draw_model("CareerFit Logical Data Model - Identity and Career Profile", "Normalized logical entities and their cardinalities", identity_boxes, identity_fields, identity_links, "data-ldm-identity-20260811.png")
    draw_model("CareerFit Physical Data Model - Identity and Career Profile", "Final PostgreSQL tables after Flyway V1-V25; representative columns", identity_boxes, identity_fields, identity_links, "data-pdm-identity-20260811.png", True, schema)

    # Recruitment and matching domain. Candidate and CV are external references here.
    recruitment_boxes = {
        "employer_profile": ("EMPLOYER_PROFILE", (70, 180, 760, 535), False),
        "job": ("JOB", (1030, 180, 1780, 575), False),
        "candidate": ("CANDIDATE", (2070, 180, 2730, 500), True),
        "cv": ("CV", (2070, 680, 2730, 1000), True),
        "matching": ("MATCHING", (1030, 700, 1780, 1095), False),
        "application": ("APPLICATION", (70, 750, 760, 1145), False),
        "feedback": ("FEEDBACK", (1030, 1350, 1780, 1725), False),
        "recruiter_cv_bookmark": ("RECRUITER_CV_BOOKMARK", (2010, 1280, 2740, 1675), False),
        "recommendation_interaction": ("RECOMMENDATION_INTERACTION", (70, 1370, 790, 1745), False),
    }
    recruitment_fields = {
        "employer_profile": ["PK id", "FK Recruiter account", "company identity", "industry and size", "location and website", "benefits and featured state"],
        "job": ["PK id", "FK Recruiter account", "title and JD", "skills and employment fields", "salary and deadline", "vectors and lifecycle state"],
        "candidate": ["PK id", "Candidate career profile"],
        "cv": ["PK id", "FK Candidate", "reviewed career evidence"],
        "matching": ["PK id", "FK CV", "FK Job", "raw / normalized score", "label and Potential", "reasons and recomputation state"],
        "application": ["PK id", "FK Candidate / Job", "optional CV / Matching", "application state", "manual or AutoFit source", "cover letter and notes"],
        "feedback": ["PK id", "FK Matching", "FK actor account", "actor role", "feedback type and channel", "metadata"],
        "recruiter_cv_bookmark": ["PK id", "FK Job", "FK Candidate", "FK CV", "saved time"],
        "recommendation_interaction": ["PK id", "FK Candidate", "FK Job", "interaction action", "source channel", "metadata"],
    }
    recruitment_links = [
        ("employer_profile", (760, 355), "job", (1030, 355), "1", "0..*", None, False),
        ("job", (1780, 400), "matching", (1780, 850), "1", "0..*", [(1900, 400), (1900, 850)], False),
        ("cv", (2070, 840), "matching", (1780, 900), "1", "0..*", None, False),
        ("candidate", (2400, 500), "cv", (2400, 680), "1", "0..*", None, False),
        ("job", (1030, 500), "application", (760, 900), "1", "0..*", [(900, 500), (900, 900)], False),
        ("candidate", (2070, 340), "application", (760, 1000), "1", "0..*", [(1930, 340), (1930, 1220), (430, 1220), (430, 1145)], False),
        ("matching", (1400, 1095), "feedback", (1400, 1350), "1", "0..*", None, False),
        ("job", (1650, 575), "recruiter_cv_bookmark", (2240, 1280), "1", "0..*", [(1650, 1200), (2240, 1200)], False),
        ("cv", (2400, 1000), "recruiter_cv_bookmark", (2400, 1280), "1", "0..*", None, False),
        ("candidate", (2200, 500), "recommendation_interaction", (500, 1370), "1", "0..*", [(1980, 500), (1980, 1260), (500, 1260)], False),
        ("job", (1030, 450), "recommendation_interaction", (790, 1535), "1", "0..*", [(870, 450), (870, 1535)], False),
    ]
    draw_model("CareerFit Logical Data Model - Recruitment and Matching", "Recruitment records, decision-support results, applications, and Talent Pool", recruitment_boxes, recruitment_fields, recruitment_links, "data-ldm-recruitment-20260811.png")
    draw_model("CareerFit Physical Data Model - Recruitment and Matching", "Final PostgreSQL tables after Flyway V1-V25; representative columns", recruitment_boxes, recruitment_fields, recruitment_links, "data-pdm-recruitment-20260811.png", True, schema)

    communication_boxes = {
        "user_account": ("USER_ACCOUNT", (100, 180, 770, 490), True),
        "automation_policy": ("AUTOMATION_POLICY", (1020, 180, 1790, 580), False),
        "matching": ("MATCHING", (2070, 180, 2730, 490), True),
        "application": ("APPLICATION", (2070, 720, 2730, 1030), True),
        "email_action_token": ("EMAIL_ACTION_TOKEN", (1020, 760, 1790, 1155), False),
        "email_action": ("EMAIL_ACTION", (100, 740, 770, 1115), False),
        "notification_job": ("NOTIFICATION_JOB", (320, 1370, 1010, 1725), False),
        "notification_delivery_log": ("NOTIFICATION_DELIVERY_LOG", (1550, 1370, 2400, 1725), False),
    }
    communication_fields = {
        "user_account": ["PK id", "authenticated recipient"],
        "automation_policy": ["PK id", "FK User", "AutoFit enablement / threshold", "digest and notification policy", "quiet hours / limits", "pause and schedule fields"],
        "matching": ["PK id", "Feedback action target"],
        "application": ["PK id", "Invitation action target"],
        "email_action_token": ["PK id", "hashed one-time token", "FK recipient", "optional Matching / Application", "action and redemption state", "expiry timestamps"],
        "email_action": ["PK id", "FK recipient", "action and target", "template and subject", "delivery lifecycle", "timestamps"],
        "notification_job": ["PK id", "job type", "JSON payload", "processing state", "retry schedule", "timestamps"],
        "notification_delivery_log": ["PK id", "FK recipient", "email type", "deduplication context", "outcome and reason", "created time"],
    }
    communication_links = [
        ("user_account", (770, 335), "automation_policy", (1020, 335), "1", "0..1", None, False),
        ("user_account", (440, 490), "email_action", (440, 740), "1", "0..*", None, False),
        ("user_account", (770, 420), "email_action_token", (1020, 900), "1", "0..*", [(900, 420), (900, 900)], False),
        ("matching", (2070, 335), "email_action_token", (1790, 900), "1", "0..*", [(1940, 335), (1940, 900)], False),
        ("application", (2070, 875), "email_action_token", (1790, 1000), "1", "0..*", None, False),
        ("notification_job", (1010, 1540), "notification_delivery_log", (1550, 1540), "0..*", "0..*", None, True),
        ("user_account", (300, 490), "notification_delivery_log", (1750, 1370), "1", "0..*", [(80, 490), (80, 1280), (1750, 1280)], False),
    ]
    draw_model("CareerFit Logical Data Model - Automation and Communication", "Account policy, actionable email, notification queue, and delivery evidence", communication_boxes, communication_fields, communication_links, "data-ldm-communication-20260811.png")
    draw_model("CareerFit Physical Data Model - Automation and Communication", "Final PostgreSQL tables after Flyway V1-V25; representative columns", communication_boxes, communication_fields, communication_links, "data-pdm-communication-20260811.png", True, schema)

    governance_boxes = {
        "user_account": ("USER_ACCOUNT", (80, 180, 720, 490), True),
        "job": ("JOB", (1080, 180, 1720, 490), True),
        "cv": ("CV", (2080, 180, 2720, 490), True),
        "content_report": ("CONTENT_REPORT", (80, 720, 790, 1115), False),
        "analytics_event": ("ANALYTICS_EVENT", (1040, 720, 1760, 1115), False),
        "audit_log": ("AUDIT_LOG", (2010, 720, 2730, 1115), False),
        "job_trend_snapshot": ("JOB_TREND_SNAPSHOT", (450, 1370, 1200, 1745), False),
        "job_market_snapshot": ("JOB_MARKET_SNAPSHOT", (1600, 1370, 2350, 1745), False),
    }
    governance_fields = {
        "user_account": ["PK id", "reporter, resolver, or event actor"],
        "job": ["PK id", "reportable and trend-tracked target"],
        "cv": ["PK id", "reportable target"],
        "content_report": ["PK id", "FK reporter / resolver", "polymorphic Job or CV target", "reason and comment", "moderation state", "resolution timestamps"],
        "analytics_event": ["PK id", "optional FK actor", "event and subject", "JSON metadata", "occurred time", "created time"],
        "audit_log": ["PK id", "actor and action", "polymorphic target", "result and source", "request evidence", "JSON metadata and time"],
        "job_trend_snapshot": ["PK id", "FK Job", "snapshot date", "view count", "application count", "created time"],
        "job_market_snapshot": ["PK id", "snapshot date", "Job and employer counts", "role distribution", "salary distribution", "created time"],
    }
    governance_links = [
        ("user_account", (400, 490), "content_report", (400, 720), "1", "0..*", None, False),
        ("job", (1400, 490), "content_report", (790, 850), "1", "0..*", [(1400, 620), (790, 620)], True),
        ("cv", (2400, 490), "content_report", (790, 970), "1", "0..*", [(2400, 650), (900, 650), (900, 970)], True),
        ("user_account", (720, 330), "analytics_event", (1040, 850), "1", "0..*", [(900, 330), (900, 850)], False),
        ("user_account", (720, 420), "audit_log", (2010, 850), "1", "0..*", [(1900, 420), (1900, 850)], True),
        ("job", (1300, 490), "job_trend_snapshot", (900, 1370), "1", "0..*", [(1300, 1250), (900, 1250)], False),
        ("job", (1500, 490), "job_market_snapshot", (1975, 1370), "0..*", "0..*", [(1500, 1260), (1975, 1260)], True),
    ]
    draw_model("CareerFit Logical Data Model - Governance and Analytics", "Content moderation, event evidence, audit history, and aggregate snapshots", governance_boxes, governance_fields, governance_links, "data-ldm-governance-20260811.png")
    draw_model("CareerFit Physical Data Model - Governance and Analytics", "Final PostgreSQL tables after Flyway V1-V25; representative columns", governance_boxes, governance_fields, governance_links, "data-pdm-governance-20260811.png", True, schema)


def main():
    schema = load_schema()
    expected = {
        "analytics_event", "application", "audit_log", "automation_policy", "candidate",
        "candidate_portfolio_link", "candidate_portfolio_project", "content_report", "cv",
        "email_action", "email_action_token", "employer_profile", "feedback", "job",
        "job_market_snapshot", "job_trend_snapshot", "matching", "notification_delivery_log",
        "notification_job", "recommendation_interaction", "recruiter_cv_bookmark", "skills",
        "user_account", "user_settings",
    }
    if set(schema) != expected:
        raise RuntimeError(f"Unexpected schema tables: {sorted(set(schema) ^ expected)}")
    conceptual()
    build_models(schema)


if __name__ == "__main__":
    main()
