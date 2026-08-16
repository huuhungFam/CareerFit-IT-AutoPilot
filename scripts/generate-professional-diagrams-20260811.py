from pathlib import Path
from math import atan2, cos, sin, pi
from PIL import Image, ImageDraw, ImageFont


OUT = Path("Doc/figures")
OUT.mkdir(parents=True, exist_ok=True)

W, H = 2400, 1500
BLACK = "#111111"
DARK = "#303030"
MID = "#6A6A6A"
LIGHT = "#E7E7E7"
PALE = "#F7F7F7"
WHITE = "#FFFFFF"


def font(size, bold=False, italic=False):
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


F_TITLE = font(54, bold=True)
F_SUB = font(36, bold=True)
F_BODY = font(30)
F_SMALL = font(25)
F_TINY = font(22)
F_ITALIC = font(25, italic=True)


def canvas(title, subtitle=None, height=H):
    im = Image.new("RGB", (W, height), WHITE)
    d = ImageDraw.Draw(im)
    d.text((W // 2, 45), title, font=F_TITLE, fill=BLACK, anchor="ma")
    if subtitle:
        d.text((W // 2, 112), subtitle, font=F_SMALL, fill=MID, anchor="ma")
    return im, d


def wrap(d, text, f, max_width):
    lines = []
    for para in text.split("\n"):
        if not para:
            lines.append("")
            continue
        words = para.split()
        current = ""
        for word in words:
            trial = word if not current else current + " " + word
            if d.textbbox((0, 0), trial, font=f)[2] <= max_width:
                current = trial
            else:
                if current:
                    lines.append(current)
                current = word
        if current:
            lines.append(current)
    return lines


def text_center(d, box, text, f=F_BODY, fill=BLACK, spacing=8):
    x1, y1, x2, y2 = box
    lines = wrap(d, text, f, x2 - x1 - 34)
    heights = [d.textbbox((0, 0), line or " ", font=f)[3] for line in lines]
    total = sum(heights) + spacing * max(0, len(lines) - 1)
    y = (y1 + y2 - total) / 2
    for line, hh in zip(lines, heights):
        d.text(((x1 + x2) / 2, y), line, font=f, fill=fill, anchor="ma")
        y += hh + spacing


def text_left(d, box, text, f=F_SMALL, fill=BLACK, spacing=6, pad=22):
    x1, y1, x2, _ = box
    y = y1 + pad
    for line in wrap(d, text, f, x2 - x1 - 2 * pad):
        d.text((x1 + pad, y), line, font=f, fill=fill, anchor="la")
        y += d.textbbox((0, 0), line or " ", font=f)[3] + spacing


def arrow(d, p1, p2, width=4, fill=BLACK, head=20, dashed=False):
    x1, y1 = p1
    x2, y2 = p2
    if dashed:
        length = max(1, ((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5)
        ux, uy = (x2 - x1) / length, (y2 - y1) / length
        pos = 0
        while pos < length - head:
            end = min(pos + 22, length - head)
            d.line((x1 + ux * pos, y1 + uy * pos, x1 + ux * end, y1 + uy * end), fill=fill, width=width)
            pos += 36
    else:
        d.line((x1, y1, x2, y2), fill=fill, width=width)
    ang = atan2(y2 - y1, x2 - x1)
    pts = [
        (x2, y2),
        (x2 - head * cos(ang - pi / 6), y2 - head * sin(ang - pi / 6)),
        (x2 - head * cos(ang + pi / 6), y2 - head * sin(ang + pi / 6)),
    ]
    d.polygon(pts, fill=fill)


def line_label(d, p1, p2, label, f=F_TINY, offset=-18):
    x = (p1[0] + p2[0]) / 2
    y = (p1[1] + p2[1]) / 2 + offset
    bb = d.textbbox((x, y), label, font=f, anchor="mm")
    d.rectangle((bb[0] - 7, bb[1] - 3, bb[2] + 7, bb[3] + 3), fill=WHITE)
    d.text((x, y), label, font=f, fill=BLACK, anchor="mm")


def uml_component(d, box, stereotype, name, details=""):
    x1, y1, x2, y2 = box
    d.rectangle(box, fill=WHITE, outline=BLACK, width=4)
    # UML component glyph
    gx, gy = x2 - 92, y1 + 22
    d.rectangle((gx, gy, gx + 54, gy + 42), outline=BLACK, width=3)
    d.rectangle((gx - 12, gy + 7, gx + 12, gy + 18), fill=WHITE, outline=BLACK, width=3)
    d.rectangle((gx - 12, gy + 25, gx + 12, gy + 36), fill=WHITE, outline=BLACK, width=3)
    d.text(((x1 + x2) / 2, y1 + 20), f"«{stereotype}»", font=F_ITALIC, fill=MID, anchor="ma")
    d.text(((x1 + x2) / 2, y1 + 60), name, font=F_SUB, fill=BLACK, anchor="ma")
    if details:
        text_center(d, (x1 + 18, y1 + 110, x2 - 18, y2 - 12), details, F_SMALL)


def uml_package(d, box, name, fill=PALE):
    x1, y1, x2, y2 = box
    tab_w = min(360, max(210, (x2 - x1) * 0.34))
    d.rectangle((x1, y1 + 42, x2, y2), fill=fill, outline=BLACK, width=4)
    d.rectangle((x1, y1, x1 + tab_w, y1 + 44), fill=fill, outline=BLACK, width=4)
    d.line((x1 + tab_w, y1 + 42, x2, y1 + 42), fill=BLACK, width=4)
    d.text((x1 + 20, y1 + 9), name, font=F_SMALL, fill=BLACK, anchor="la")


def note(d, box, text):
    x1, y1, x2, y2 = box
    fold = 28
    d.polygon([(x1, y1), (x2 - fold, y1), (x2, y1 + fold), (x2, y2), (x1, y2)], fill=PALE, outline=BLACK)
    d.line((x2 - fold, y1, x2 - fold, y1 + fold, x2, y1 + fold), fill=BLACK, width=3)
    text_left(d, box, text, F_TINY, pad=16)


def actor(d, center, label):
    x, y = center
    d.ellipse((x - 30, y - 90, x + 30, y - 30), outline=BLACK, width=4)
    d.line((x, y - 30, x, y + 45), fill=BLACK, width=4)
    d.line((x - 55, y - 2, x + 55, y - 2), fill=BLACK, width=4)
    d.line((x, y + 45, x - 48, y + 105), fill=BLACK, width=4)
    d.line((x, y + 45, x + 48, y + 105), fill=BLACK, width=4)
    d.text((x, y + 122), label, font=F_SMALL, fill=BLACK, anchor="ma")


def save(im, name):
    path = OUT / name
    im.save(path, dpi=(300, 300), optimize=True)
    print(path, im.size)


def architecture():
    im, d = canvas("CareerFit Container and Component Architecture", "UML component view with external dependencies")
    actor(d, (150, 620), "Candidate")
    actor(d, (150, 980), "Recruiter / Administrator")
    uml_package(d, (355, 200, 2160, 1370), "CareerFit System")
    uml_component(d, (470, 310, 1030, 600), "web application", "React / Vite Frontend", "Role-based routes\nForms, dashboards, reports")
    uml_component(d, (1260, 310, 2020, 600), "application", "Spring Boot Backend", "REST API and domain services\nJWT authorization and ownership checks")
    uml_component(d, (500, 820, 1020, 1120), "database", "PostgreSQL", "Users, jobs, CV metadata,\napplications, matching and feedback")
    uml_component(d, (1240, 820, 1680, 1120), "storage", "CV File Storage", "Uploaded CV documents")
    uml_component(d, (1780, 820, 2090, 1120), "external service", "SMTP Server", "Optional email delivery")
    arrow(d, (255, 610), (470, 500)); line_label(d, (255, 610), (470, 500), "HTTPS")
    arrow(d, (255, 960), (470, 545)); line_label(d, (255, 960), (470, 545), "HTTPS")
    arrow(d, (1030, 455), (1260, 455)); line_label(d, (1030, 455), (1260, 455), "JSON / HTTPS")
    arrow(d, (1490, 600), (850, 820)); line_label(d, (1490, 600), (850, 820), "JPA / SQL")
    arrow(d, (1650, 600), (1460, 820)); line_label(d, (1650, 600), (1460, 820), "file I/O")
    arrow(d, (1840, 600), (1935, 820)); line_label(d, (1840, 600), (1935, 820), "SMTP")
    note(d, (1080, 1185, 2025, 1320), "The background scheduler is an internal backend mechanism, not an external UML actor.")
    save(im, "uml-careerfit-architecture-20260811.png")


def entity(d, box, name, fields):
    x1, y1, x2, y2 = box
    d.rectangle(box, fill=WHITE, outline=BLACK, width=3)
    header_h = 50
    d.rectangle((x1, y1, x2, y1 + header_h), fill=LIGHT, outline=BLACK, width=3)
    d.text(((x1 + x2) / 2, y1 + 9), name, font=F_SMALL, fill=BLACK, anchor="ma")
    y = y1 + header_h + 12
    for fld in fields:
        d.text((x1 + 16, y), fld, font=F_TINY, fill=BLACK, anchor="la")
        y += 30


def crowfoot(d, p1, p2, left="1", right="0..*"):
    d.line((*p1, *p2), fill=BLACK, width=3)
    dx, dy = p2[0] - p1[0], p2[1] - p1[1]
    length = max(1, (dx * dx + dy * dy) ** 0.5)
    ux, uy = dx / length, dy / length
    px, py = -uy, ux
    # bar at p1
    bx, by = p1[0] + ux * 18, p1[1] + uy * 18
    d.line((bx - px * 14, by - py * 14, bx + px * 14, by + py * 14), fill=BLACK, width=3)
    # crow foot at p2
    cx, cy = p2[0] - ux * 18, p2[1] - uy * 18
    d.line((p2[0], p2[1], cx + px * 18, cy + py * 18), fill=BLACK, width=3)
    d.line((p2[0], p2[1], cx - px * 18, cy - py * 18), fill=BLACK, width=3)
    d.line((p2[0], p2[1], cx, cy), fill=BLACK, width=3)
    line_label(d, p1, p2, f"{left}     {right}", F_TINY, -20)


def erd():
    im, d = canvas("CareerFit Core Logical Data Model", "Crow's-foot ERD; selected fields only")
    boxes = {
        "UserAccount": (55, 210, 415, 420),
        "CandidateProfile": (540, 210, 925, 420),
        "CV": (1050, 210, 1410, 430),
        "Matching": (1535, 210, 1900, 430),
        "Feedback": (2025, 210, 2370, 430),
        "RecruiterCompany": (55, 875, 415, 1085),
        "Job": (540, 875, 925, 1095),
        "Application": (1110, 875, 1495, 1095),
        "EmailAction": (1700, 875, 2070, 1095),
        "AutomationPolicy": (2025, 1190, 2370, 1400),
    }
    entity(d, boxes["UserAccount"], "USER_ACCOUNT", ["PK id", "email", "role", "status"])
    entity(d, boxes["CandidateProfile"], "CANDIDATE_PROFILE", ["PK/FK user_id", "skills", "preferences", "portfolio"])
    entity(d, boxes["RecruiterCompany"], "RECRUITER_COMPANY", ["PK/FK user_id", "company_name", "profile_status"])
    entity(d, boxes["CV"], "CV", ["PK id", "FK candidate_id", "review_status", "is_default"])
    entity(d, boxes["Job"], "JOB", ["PK id", "FK recruiter_id", "status", "description"])
    entity(d, boxes["Matching"], "MATCHING", ["PK id", "FK cv_id", "FK job_id", "score, potential"])
    entity(d, boxes["Application"], "APPLICATION", ["PK id", "FK candidate_id", "FK job_id", "status"])
    entity(d, boxes["Feedback"], "MATCHING_FEEDBACK", ["PK id", "FK matching_id", "candidate_label", "weight"])
    entity(d, boxes["AutomationPolicy"], "AUTOMATION_POLICY", ["PK/FK candidate_id", "enabled", "threshold"])
    entity(d, boxes["EmailAction"], "EMAIL_ACTION", ["PK id", "FK application_id", "action_type", "redeemed_at"])
    # Candidate profile and CV chain.
    crowfoot(d, (415, 315), (540, 315), "1", "0..1")
    crowfoot(d, (925, 315), (1050, 315), "1", "0..*")
    crowfoot(d, (1410, 315), (1535, 315), "1", "0..*")
    crowfoot(d, (1900, 315), (2025, 315), "1", "0..*")
    # Recruiter ownership and job records.
    crowfoot(d, (235, 420), (235, 875), "1", "0..1")
    crowfoot(d, (415, 980), (540, 980), "1", "0..*")
    # Job contributes to matching through a routed relationship.
    d.line((925, 915, 1000, 915, 1000, 560, 1460, 560, 1460, 405, 1535, 405), fill=BLACK, width=3)
    arrow(d, (1460, 405), (1535, 405), width=3, head=17)
    d.text((1230, 525), "1                                  0..*", font=F_TINY, fill=BLACK, anchor="ma")
    # Candidate and Job both participate in Application.
    d.line((730, 420, 730, 780, 1180, 780, 1180, 875), fill=BLACK, width=3)
    arrow(d, (1180, 780), (1180, 875), width=3, head=17)
    d.text((905, 750), "1                 0..*", font=F_TINY, fill=BLACK, anchor="ma")
    crowfoot(d, (925, 1030), (1110, 1030), "1", "0..*")
    crowfoot(d, (1495, 985), (1700, 985), "1", "0..*")
    # Candidate-owned AutoFit configuration.
    d.line((805, 420, 805, 1320, 2025, 1320), fill=BLACK, width=3)
    arrow(d, (805, 1320), (2025, 1320), width=3, head=17)
    d.text((1440, 1290), "1                                  0..1", font=F_TINY, fill=BLACK, anchor="ma")
    save(im, "erd-careerfit-core-20260811.png")


def node3d(d, box, stereotype, name, details):
    x1, y1, x2, y2 = box
    off = 24
    d.polygon([(x1, y1 + off), (x1 + off, y1), (x2, y1), (x2 - off, y1 + off)], fill=LIGHT, outline=BLACK)
    d.polygon([(x2 - off, y1 + off), (x2, y1), (x2, y2 - off), (x2 - off, y2)], fill="#D5D5D5", outline=BLACK)
    d.rectangle((x1, y1 + off, x2 - off, y2), fill=WHITE, outline=BLACK, width=4)
    d.text(((x1 + x2 - off) / 2, y1 + 45), f"«{stereotype}»", font=F_ITALIC, fill=MID, anchor="ma")
    d.text(((x1 + x2 - off) / 2, y1 + 85), name, font=F_SUB, fill=BLACK, anchor="ma")
    text_center(d, (x1 + 20, y1 + 135, x2 - off - 20, y2 - 15), details, F_SMALL)


def deployment():
    im, d = canvas("Local and Containerized Deployment Topology", "UML deployment diagram")
    node3d(d, (80, 270, 560, 650), "device", "Client Device", "Web browser\nCareerFit React UI")
    node3d(d, (760, 210, 1560, 770), "execution environment", "Application Host", "Frontend: Vite/static assets, port 5173\nBackend: Spring Boot, port 8080\nInternal AutoFit scheduler")
    node3d(d, (1760, 240, 2300, 630), "database node", "PostgreSQL", "Local: host port 5433\nCompose service: port 5432")
    node3d(d, (760, 970, 1260, 1320), "storage", "CV Volume", "Uploaded CV files")
    node3d(d, (1550, 970, 2110, 1320), "external node", "SMTP Provider", "Optional notification delivery")
    arrow(d, (560, 440), (760, 440)); line_label(d, (560, 440), (760, 440), "HTTP(S)")
    arrow(d, (1560, 450), (1760, 450)); line_label(d, (1560, 450), (1760, 450), "JDBC")
    arrow(d, (1110, 770), (1010, 970)); line_label(d, (1110, 770), (1010, 970), "volume mount")
    arrow(d, (1370, 770), (1770, 970)); line_label(d, (1370, 770), (1770, 970), "SMTP")
    note(d, (80, 1110, 610, 1305), "Docker Compose groups the application and database services for the local deployment profile.")
    save(im, "uml-deployment-20260811.png")


def backend_modules():
    im, d = canvas("Backend Module Structure and Request Path", "Layered component diagram")
    uml_package(d, (70, 240, 2330, 1325), "Spring Boot Modular Monolith")
    # layers
    layers = [
        (170, 345, 2230, 525, "API layer", ["REST Controllers", "DTO Validation", "Error Mapping"]),
        (170, 590, 2230, 850, "Domain service layer", ["Auth & Security", "Candidate / CV", "Employer / Job", "Matching & Recommendation", "Application / Talent Pool", "Automation / Notification", "Admin / Reporting"]),
        (170, 925, 2230, 1135, "Persistence and integration layer", ["JPA Repositories", "CV File Storage", "SMTP Adapter"]),
    ]
    for x1, y1, x2, y2, label, items in layers:
        d.rectangle((x1, y1, x2, y2), fill=WHITE, outline=BLACK, width=4)
        d.rectangle((x1, y1, x1 + 320, y2), fill=LIGHT, outline=BLACK, width=3)
        text_center(d, (x1 + 15, y1 + 15, x1 + 305, y2 - 15), label, F_SMALL)
        usable_x1 = x1 + 350
        gap = 20
        bw = (x2 - usable_x1 - gap * (len(items) - 1) - 30) / len(items)
        for i, item in enumerate(items):
            bx1 = usable_x1 + i * (bw + gap)
            bx2 = bx1 + bw
            d.rectangle((bx1, y1 + 34, bx2, y2 - 34), fill=PALE, outline=DARK, width=3)
            text_center(d, (bx1 + 8, y1 + 40, bx2 - 8, y2 - 40), item, F_TINY)
    arrow(d, (1200, 525), (1200, 590)); line_label(d, (1200, 525), (1200, 590), "validated request", offset=-30)
    arrow(d, (1200, 850), (1200, 925)); line_label(d, (1200, 850), (1200, 925), "repository / adapter", offset=-30)
    arrow(d, (2150, 925), (2150, 850), dashed=True); line_label(d, (2150, 925), (2150, 850), "result", offset=30)
    note(d, (380, 1175, 2020, 1285), "Business rules remain in domain services; controllers and repositories do not define actor-level use cases.")
    save(im, "uml-backend-modules-20260811.png")


def participant(d, x, label, top=240, bottom=1320):
    tw = max(260, d.textbbox((0, 0), label, font=F_SMALL)[2] + 60)
    d.rectangle((x - tw / 2, top, x + tw / 2, top + 74), fill=LIGHT, outline=BLACK, width=3)
    text_center(d, (x - tw / 2, top, x + tw / 2, top + 74), label, F_SMALL)
    # dashed lifeline
    y = top + 74
    while y < bottom:
        d.line((x, y, x, min(y + 18, bottom)), fill=MID, width=2)
        y += 31


def message(d, xs, xr, y, label, dashed=False, return_arrow=False):
    arrow(d, (xs, y), (xr, y), width=3, fill=MID if dashed else BLACK, head=16, dashed=dashed)
    f = F_TINY
    d.text(((xs + xr) / 2, y - 35), label, font=f, fill=BLACK, anchor="mm")


def jwt_sequence():
    im, d = canvas("JWT Authentication, Authorization, and Ownership Checks", "UML sequence diagram", height=1650)
    xs = [190, 650, 1110, 1570, 2050]
    labels = ["Browser", "JWT Filter", "Security Rules", "REST Controller", "Domain Service"]
    for x, label in zip(xs, labels):
        participant(d, x, label, bottom=1330)
    y = 390
    message(d, xs[0], xs[1], y, "1. Request with Bearer JWT"); y += 125
    message(d, xs[1], xs[1] + 170, y, "2. Validate token and claims"); y += 125
    message(d, xs[1], xs[2], y, "3. User identity and role"); y += 125
    message(d, xs[2], xs[3], y, "4. Role-authorized request"); y += 125
    message(d, xs[3], xs[4], y, "5. Invoke business operation"); y += 125
    message(d, xs[4], xs[4] - 190, y, "6. Verify resource ownership"); y += 125
    message(d, xs[4], xs[3], y, "7. Business result", dashed=True); y += 125
    message(d, xs[3], xs[0], y, "8. HTTP response", dashed=True)
    note(d, (95, 1380, 725, 1565), "Invalid or missing JWT -> 401 Unauthorized")
    note(d, (820, 1380, 1500, 1565), "Wrong role or failed ownership check -> 403 Forbidden")
    note(d, (1600, 1380, 2310, 1565), "Valid authorization -> continue with the domain operation")
    save(im, "uml-jwt-sequence-20260811.png")


def state(d, box, label, fill=WHITE):
    d.rounded_rectangle(box, radius=45, fill=fill, outline=BLACK, width=4)
    text_center(d, box, label, F_SMALL)


def transition(d, p1, p2, label, bend=None):
    if bend is None:
        arrow(d, p1, p2, width=3, head=17)
        line_label(d, p1, p2, label, F_TINY, -24)
    else:
        d.line((*p1, *bend, *p2), fill=BLACK, width=3)
        arrow(d, bend, p2, width=3, head=17)
        line_label(d, p1, bend, label, F_TINY, -24)


def application_state():
    im, d = canvas("Application and Invitation State Machine", "Actor-visible application statuses", height=1700)
    d.ellipse((75, 270, 130, 325), fill=BLACK)
    state(d, (300, 215, 700, 385), "PENDING")
    state(d, (300, 625, 700, 795), "AUTO_APPLIED")
    state(d, (300, 1035, 700, 1205), "INVITED")
    state(d, (1100, 215, 1500, 385), "APPROVED", LIGHT)
    state(d, (1100, 625, 1500, 795), "REJECTED", LIGHT)
    state(d, (1100, 1035, 1540, 1205), "NOT_INTERESTED", LIGHT)
    state(d, (1810, 215, 2300, 385), "INTERVIEW_RESCHEDULED")
    state(d, (1810, 625, 2300, 795), "INTERVIEW_CANCELLED")
    # Initial triggers, drawn as separate orthogonal paths.
    arrow(d, (130, 297), (300, 297)); line_label(d, (130, 297), (300, 297), "manual application")
    d.line((103, 325, 103, 710, 300, 710), fill=BLACK, width=3); arrow(d, (103, 710), (300, 710), width=3, head=17)
    d.text((130, 665), "AutoFit application", font=F_TINY, fill=BLACK, anchor="la")
    d.line((88, 325, 88, 1120, 300, 1120), fill=BLACK, width=3); arrow(d, (88, 1120), (300, 1120), width=3, head=17)
    d.text((115, 1075), "recruiter invitation", font=F_TINY, fill=BLACK, anchor="la")
    # Recruiter decisions.
    arrow(d, (700, 300), (1100, 300), width=3, head=17); line_label(d, (700, 300), (1100, 300), "recruiter approves")
    arrow(d, (700, 710), (1100, 710), width=3, head=17); line_label(d, (700, 710), (1100, 710), "recruiter rejects")
    d.line((700, 670, 860, 670, 860, 385, 1100, 385), fill=BLACK, width=3); arrow(d, (860, 385), (1100, 385), width=3, head=17)
    d.text((875, 430), "recruiter approves", font=F_TINY, fill=BLACK, anchor="la")
    d.line((700, 345, 940, 345, 940, 625, 1100, 625), fill=BLACK, width=3); arrow(d, (940, 625), (1100, 625), width=3, head=17)
    d.text((955, 575), "recruiter rejects", font=F_TINY, fill=BLACK, anchor="la")
    # Invitation response.
    d.line((700, 1080, 820, 1080, 820, 385, 700, 385), fill=BLACK, width=3); arrow(d, (820, 385), (700, 385), width=3, head=17)
    d.text((835, 920), "candidate accepts", font=F_TINY, fill=BLACK, anchor="la")
    arrow(d, (700, 1120), (1100, 1120), width=3, head=17); line_label(d, (700, 1120), (1100, 1120), "candidate declines")
    # Withdrawal from an eligible active application.
    d.line((700, 755, 980, 755, 980, 1075, 1100, 1075), fill=BLACK, width=3); arrow(d, (980, 1075), (1100, 1075), width=3, head=17)
    d.text((995, 935), "candidate withdraws", font=F_TINY, fill=BLACK, anchor="la")
    # Operational interview updates after approval.
    arrow(d, (1500, 300), (1810, 300), width=3, head=17); line_label(d, (1500, 300), (1810, 300), "reschedule interview")
    d.line((1500, 350, 1660, 350, 1660, 710, 1810, 710), fill=BLACK, width=3); arrow(d, (1660, 710), (1810, 710), width=3, head=17)
    d.text((1680, 665), "cancel interview", font=F_TINY, fill=BLACK, anchor="la")
    note(d, (460, 1350, 1960, 1540), "Withdrawal is blocked after APPROVED or REJECTED. All state changes remain subject to the implemented ownership and CV-visibility checks.")
    save(im, "uml-application-state-20260811.png")


def frontend_sequence():
    im, d = canvas("Frontend Request and API-Response Sequence", "Server-side catalogue, pagination, and protected routes", height=1650)
    xs = [170, 610, 1060, 1510, 1990]
    labels = ["User", "React Page", "Query / API Client", "REST Controller", "Domain Service"]
    for x, label in zip(xs, labels):
        participant(d, x, label, bottom=1330)
    y = 390
    message(d, xs[0], xs[1], y, "1. Open page or submit filters"); y += 120
    message(d, xs[1], xs[2], y, "2. Request data with paging/filter state"); y += 120
    message(d, xs[2], xs[3], y, "3. HTTP request + JWT when required"); y += 120
    message(d, xs[3], xs[4], y, "4. Validate and execute query"); y += 120
    message(d, xs[4], xs[3], y, "5. Page/result model", dashed=True); y += 120
    message(d, xs[3], xs[2], y, "6. JSON response or error envelope", dashed=True); y += 120
    message(d, xs[2], xs[1], y, "7. Cache/update request state", dashed=True); y += 120
    message(d, xs[1], xs[0], y, "8. Render results, empty state, or error", dashed=True)
    note(d, (140, 1380, 720, 1565), "Filters and pagination are executed by the server.")
    note(d, (895, 1380, 1515, 1565), "401/403 responses are mapped to authentication or authorization UI states.")
    note(d, (1650, 1380, 2250, 1565), "The frontend does not reproduce backend business rules.")
    save(im, "uml-frontend-sequence-20260811.png")


def latency_chart():
    im, d = canvas("Observed Local Job-Search Latency", "50 requests; milliseconds")
    x0, x1 = 250, 2200
    y = 710
    vmin, vmax = 40.0, 105.0
    def xp(v):
        return x0 + (v - vmin) / (vmax - vmin) * (x1 - x0)
    d.line((x0, y, x1, y), fill=BLACK, width=5)
    for tick in range(40, 106, 5):
        x = xp(tick)
        h = 30 if tick % 10 == 0 else 18
        d.line((x, y - h, x, y + h), fill=BLACK, width=3)
        if tick % 10 == 0:
            d.text((x, y + 55), str(tick), font=F_SMALL, fill=BLACK, anchor="ma")
    d.text((x1, y + 115), "Response time (ms)", font=F_SMALL, fill=BLACK, anchor="ra")
    # range and inter-statistic band
    mn, p50, mean, p95, mx = 44.99, 55.20, 61.79, 85.11, 99.32
    d.line((xp(mn), y, xp(mx), y), fill=DARK, width=12)
    d.rectangle((xp(p50), y - 58, xp(p95), y + 58), fill="#D9D9D9", outline=BLACK, width=3)
    markers = [(mn, "Minimum\n44.99", -1), (p50, "Median (p50)\n55.20", 1), (mean, "Mean\n61.79", -1), (p95, "p95\n85.11", 1), (mx, "Maximum\n99.32", -1)]
    for v, label, direction in markers:
        x = xp(v)
        d.ellipse((x - 13, y - 13, x + 13, y + 13), fill=BLACK)
        top = 380 if direction < 0 else 880
        d.line((x, y + direction * 20, x, top + (110 if direction < 0 else -20)), fill=MID, width=3)
        box = (x - 150, top, x + 150, top + 115)
        d.rectangle(box, fill=WHITE, outline=BLACK, width=3)
        text_center(d, box, label, F_SMALL)
    note(d, (510, 1190, 1890, 1350), "The shaded interval spans p50 to p95. Values describe the observed local test run and are not production guarantees.")
    save(im, "chart-job-search-latency-20260811.png")


if __name__ == "__main__":
    architecture()
    erd()
    deployment()
    backend_modules()
    jwt_sequence()
    application_state()
    frontend_sequence()
    latency_chart()
