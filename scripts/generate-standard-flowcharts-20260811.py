from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "Doc" / "figures"
OUTPUT.mkdir(parents=True, exist_ok=True)

WIDTH = 1800
HEIGHT = 2600
BLACK = "#111111"
WHITE = "#ffffff"
LINE = 6
FONT = ImageFont.truetype("arial.ttf", 44)
FONT_SMALL = ImageFont.truetype("arial.ttf", 32)
FONT_DECISION = ImageFont.truetype("arial.ttf", 30)
FONT_BOLD = ImageFont.truetype("arialbd.ttf", 44)
FONT_LABEL = ImageFont.truetype("arialbd.ttf", 30)


class Flowchart:
    def __init__(self, height: int = HEIGHT):
        self.image = Image.new("RGB", (WIDTH, height), WHITE)
        self.draw = ImageDraw.Draw(self.image)
        self.height = height

    def _wrapped(self, text: str, font, max_width: int) -> list[str]:
        lines: list[str] = []
        for source_line in text.split("\n"):
            words = source_line.split()
            current = ""
            for word in words:
                candidate = word if not current else f"{current} {word}"
                if self.draw.textbbox((0, 0), candidate, font=font)[2] <= max_width:
                    current = candidate
                else:
                    if current:
                        lines.append(current)
                    current = word
            lines.append(current)
        return [line for line in lines if line]

    def _text(self, box, text: str, font=FONT, padding: int = 42):
        x1, y1, x2, y2 = box
        lines = self._wrapped(text, font, x2 - x1 - 2 * padding)
        line_height = font.getbbox("Ag")[3] - font.getbbox("Ag")[1] + 10
        total = line_height * len(lines)
        y = (y1 + y2 - total) / 2
        for line in lines:
            bounds = self.draw.textbbox((0, 0), line, font=font)
            width = bounds[2] - bounds[0]
            self.draw.text(((x1 + x2 - width) / 2, y), line, font=font, fill=BLACK)
            y += line_height

    def terminal(self, box, text: str, small: bool = False):
        self.draw.rounded_rectangle(box, radius=55, outline=BLACK, width=LINE, fill=WHITE)
        self._text(box, text, FONT_SMALL if small else FONT_BOLD, padding=24 if small else 42)
        return box

    def process(self, box, text: str, small: bool = False):
        self.draw.rectangle(box, outline=BLACK, width=LINE, fill=WHITE)
        self._text(box, text, FONT_SMALL if small else FONT)
        return box

    def io(self, box, text: str, small: bool = False):
        x1, y1, x2, y2 = box
        skew = 60
        points = [(x1 + skew, y1), (x2, y1), (x2 - skew, y2), (x1, y2)]
        self.draw.polygon(points, outline=BLACK, fill=WHITE)
        self.draw.line(points + [points[0]], fill=BLACK, width=LINE, joint="curve")
        self._text(box, text, FONT_SMALL if small else FONT)
        return box

    def decision(self, box, text: str, small: bool = False):
        x1, y1, x2, y2 = box
        cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
        points = [(cx, y1), (x2, cy), (cx, y2), (x1, cy)]
        self.draw.polygon(points, outline=BLACK, fill=WHITE)
        self.draw.line(points + [points[0]], fill=BLACK, width=LINE, joint="curve")
        self._text(box, text, FONT_DECISION if small else FONT, padding=155 if small else 120)
        return box

    def note(self, box, text: str):
        self.draw.rounded_rectangle(box, radius=24, outline=BLACK, width=4, fill=WHITE)
        self._text(box, text, FONT_SMALL, padding=30)
        return box

    def connector(self, box, text: str):
        self.draw.ellipse(box, outline=BLACK, width=LINE, fill=WHITE)
        self._text(box, text, FONT_BOLD, padding=8)
        return box

    def label(self, xy, text: str):
        self.draw.text(xy, text, font=FONT_LABEL, fill=BLACK)

    def arrow(self, start, end, label: str | None = None, label_xy=None):
        self.draw.line([start, end], fill=BLACK, width=LINE)
        self._arrowhead(start, end)
        if label:
            if label_xy is None:
                label_xy = ((start[0] + end[0]) / 2 + 12, (start[1] + end[1]) / 2 - 42)
            self.label(label_xy, label)

    def poly_arrow(self, points, label: str | None = None, label_xy=None):
        self.draw.line(points, fill=BLACK, width=LINE, joint="curve")
        self._arrowhead(points[-2], points[-1])
        if label:
            self.label(label_xy or points[len(points) // 2], label)

    def _arrowhead(self, start, end):
        angle = math.atan2(end[1] - start[1], end[0] - start[0])
        length = 25
        spread = 0.55
        p1 = (end[0] - length * math.cos(angle - spread), end[1] - length * math.sin(angle - spread))
        p2 = (end[0] - length * math.cos(angle + spread), end[1] - length * math.sin(angle + spread))
        self.draw.polygon([end, p1, p2], fill=BLACK)

    def save(self, name: str):
        path = OUTPUT / name
        self.image.save(path, dpi=(300, 300), optimize=True)
        return path


def cx_box(y, width=1040, height=130, cx=820):
    return (cx - width // 2, y, cx + width // 2, y + height)


def bottom(box):
    return ((box[0] + box[2]) / 2, box[3])


def top(box):
    return ((box[0] + box[2]) / 2, box[1])


def right(box):
    return (box[2], (box[1] + box[3]) / 2)


def left(box):
    return (box[0], (box[1] + box[3]) / 2)


def cv_processing():
    f = Flowchart(2680)
    start = f.terminal(cx_box(45, 420, 100), "START")
    input_cv = f.io(cx_box(205, 1080, 140), "Candidate uploads a CV or saves a manual CV")
    extract = f.process(cx_box(410, 1080, 150), "Validate file and extract text\n(PDFBox, POI, or OCR)")
    valid = f.decision(cx_box(625, 920, 190), "Valid content and at least 50 characters?", small=True)
    failed = f.process((1380, 650, 1760, 790), "Set CV to FAILED\nand record reason", small=True)
    failed_end = f.terminal((1425, 875, 1715, 965), "END")
    draft = f.process(cx_box(900, 1080, 150), "Build draft sections and skills; record sparse warning when needed")
    review_state = f.process(cx_box(1110, 980, 130), "Set status to REVIEW_REQUIRED")
    review = f.io(cx_box(1300, 1080, 140), "Candidate reviews or edits the extracted CV")
    confirm = f.decision(cx_box(1500, 900, 180), "Candidate confirms the review?", small=True)
    wait = f.process((1380, 1520, 1760, 1660), "Keep REVIEW_REQUIRED\nfor later editing", small=True)
    wait_end = f.terminal((1375, 1710, 1765, 1800), "WAIT / END")
    normalize = f.process(cx_box(1745, 1080, 145), "Normalize confirmed text and build the TF-IDF vector")
    states = f.process(cx_box(1950, 1080, 145), "Set PROCESSING, then SCORING_DONE after vectorization")
    score = f.process(cx_box(2155, 1080, 145), "After commit, score eligible ACTIVE Jobs and store Matching results")
    output = f.io(cx_box(2360, 1080, 135), "Display processing status and available results")
    end = f.terminal(cx_box(2545, 420, 90), "END")

    for a, b in [(start, input_cv), (input_cv, extract), (extract, valid), (draft, review_state),
                 (review_state, review), (review, confirm), (normalize, states), (states, score),
                 (score, output), (output, end)]:
        f.arrow(bottom(a), top(b))
    f.arrow(bottom(valid), top(draft), "YES", (840, 835))
    f.arrow(right(valid), left(failed), "NO", (1290, 630))
    f.arrow(bottom(failed), top(failed_end))
    f.arrow(bottom(confirm), top(normalize), "YES", (840, 1690))
    f.arrow(right(confirm), left(wait), "NO", (1290, 1500))
    f.arrow(bottom(wait), top(wait_end))
    return f.save("flowchart-cv-processing-20260811.png")


def matching_potential():
    f = Flowchart(2860)
    start = f.terminal(cx_box(35, 420, 95), "START")
    inputs = f.io(cx_box(185, 1120, 135), "Input: owned SCORING_DONE CV and an ACTIVE Job")
    eligible = f.decision(cx_box(380, 900, 175), "Inputs eligible for scoring?", small=True)
    skip = f.terminal((1380, 420, 1740, 515), "SKIP / END")
    load_cv = f.process(cx_box(610, 1080, 130), "Load the persisted CV TF-IDF vector")
    learned = f.decision(cx_box(790, 900, 175), "Non-empty learned Job vector available?", small=True)
    use_learned = f.process((1360, 812, 1760, 943), "Use learned Job vector", small=True)
    use_original = f.process(cx_box(1020, 980, 125), "Use original Job TF-IDF vector")
    cosine = f.process(cx_box(1200, 1080, 135), "Calculate cosine similarity as the direct score")
    high = f.decision(cx_box(1390, 880, 175), "Direct score >= 90?", small=True)
    high_label = f.process((1360, 1390, 1760, 1555), "Label HIGH;\ndo not add Potential", small=True)
    high_store = f.process((1360, 1620, 1760, 1785), "Generate reasons and\nstore the HIGH result", small=True)
    high_end = f.terminal((1415, 1850, 1705, 1940), "END")
    medium = f.decision(cx_box(1620, 880, 175), "Direct score >= 70?", small=True)
    medium_label = f.process((25, 1640, 335, 1775), "Label MEDIUM", small=True)
    low_label = f.process(cx_box(1845, 840, 115), "Label LOW")
    potential = f.process(cx_box(2010, 1080, 145), "Evaluate Potential score, compatibility, transfer evidence, and seniority gap")
    guards = f.decision(cx_box(2215, 1020, 190), "All Potential guards satisfied?", small=True)
    set_potential = f.process((1360, 2230, 1760, 2390), "Set isPotential=true\nand store explanation", small=True)
    no_potential = f.process(cx_box(2440, 920, 125), "Keep isPotential=false")
    store = f.process(cx_box(2600, 1080, 120), "Generate reasons and store score, label, and Potential result")
    end = f.terminal(cx_box(2770, 420, 85), "END")

    for a, b in [(start, inputs), (inputs, eligible), (load_cv, learned), (use_original, cosine),
                 (cosine, high), (medium, low_label), (low_label, potential), (potential, guards),
                 (no_potential, store), (store, end), (high_label, high_store), (high_store, high_end)]:
        f.arrow(bottom(a), top(b))
    f.arrow(bottom(eligible), top(load_cv), "YES", (840, 565))
    f.arrow(right(eligible), left(skip), "NO", (1290, 380))
    f.arrow(right(learned), left(use_learned), "YES", (1290, 790))
    f.arrow(bottom(learned), top(use_original), "NO", (840, 970))
    f.poly_arrow([bottom(use_learned), (1560, 1090), (1320, 1090), (1320, 1268), right(cosine)])
    f.arrow(right(high), left(high_label), "YES", (1290, 1420))
    f.arrow(bottom(high), top(medium), "NO", (855, 1575))
    f.arrow(left(medium), right(medium_label), "YES", (255, 1600))
    f.arrow(bottom(medium), top(low_label), "NO", (855, 1810))
    f.poly_arrow([bottom(medium_label), (180, (potential[1] + potential[3]) / 2), left(potential)])
    f.arrow(right(guards), left(set_potential), "YES", (1290, 2245))
    f.arrow(bottom(guards), top(no_potential), "NO", (855, 2410))
    f.poly_arrow([bottom(set_potential), (1560, (store[1] + store[3]) / 2), right(store)])
    return f.save("flowchart-matching-potential-20260811.png")


def rocchio_feedback():
    f = Flowchart(2760)
    start = f.terminal(cx_box(40, 420, 95), "START")
    feedback = f.io(cx_box(190, 1080, 135), "Candidate submits feedback for an owned Matching")
    valid = f.decision(cx_box(385, 900, 175), "Matching exists and Candidate owns the CV?", small=True)
    reject = f.terminal((1420, 420, 1760, 525), "REJECT / END")
    upsert = f.process(cx_box(620, 1080, 135), "Upsert feedback and write the audit record")
    learning = f.decision(cx_box(815, 930, 185), "Feedback contributes to Rocchio learning?", small=True)
    no_learning = f.process((1360, 820, 1760, 995), "Persist NOT_INTERESTED;\nno immediate learning", small=True)
    no_end = f.terminal((1415, 1070, 1705, 1160), "END")
    after_commit = f.process(cx_box(1070, 1080, 130), "After commit, lock the Job and load the original vector q0")
    history = f.process(cx_box(1260, 1080, 135), "Load the complete feedback history")
    classify = f.process(cx_box(1455, 1120, 150), "GOOD_MATCH/POTENTIAL -> positive; BAD_MATCH -> negative")
    centroids = f.process(cx_box(1665, 1080, 140), "Compute positive and negative centroids when available")
    formula = f.process(cx_box(1865, 1120, 155), "q_new = 1.0q0 + 0.75 positive_centroid - 0.15 negative_centroid")
    clean = f.process(cx_box(2080, 1080, 135), "Remove negative weights and save the learned Job vector")
    stale = f.process(cx_box(2275, 1080, 135), "Mark related Matchings as needsRecompute")
    scheduled = f.process(cx_box(2470, 1080, 120), "Scheduler recomputes stale Matchings later")
    end = f.terminal(cx_box(2635, 420, 85), "END")

    for a, b in [(start, feedback), (feedback, valid), (upsert, learning), (after_commit, history),
                 (history, classify), (classify, centroids), (centroids, formula), (formula, clean),
                 (clean, stale), (stale, scheduled), (scheduled, end)]:
        f.arrow(bottom(a), top(b))
    f.arrow(bottom(valid), top(upsert), "YES", (855, 570))
    f.arrow(right(valid), left(reject), "NO", (1290, 390))
    f.arrow(bottom(learning), top(after_commit), "YES", (855, 1015))
    f.arrow(right(learning), left(no_learning), "NO", (1290, 825))
    f.arrow(bottom(no_learning), top(no_end))
    return f.save("flowchart-rocchio-feedback-20260811.png")


def autofit_decision():
    f = Flowchart(2820)
    start = f.terminal(cx_box(35, 420, 95), "START")
    trigger = f.io(cx_box(180, 1100, 140), "Manual request or system-configured AutoFit schedule")
    policy = f.decision(cx_box(380, 900, 175), "AutoFit policy enabled?", small=True)
    no_policy = f.terminal((1380, 420, 1730, 515), "END")
    cv = f.decision(cx_box(615, 960, 185), "Owned default CV exists and is SCORING_DONE?", small=True)
    no_cv = f.process((1360, 640, 1760, 775), "Report no eligible default CV", small=True)
    no_cv_end = f.terminal((1415, 825, 1705, 915), "END")
    load = f.process(cx_box(860, 1100, 145), "Load Matchings for ACTIVE Jobs at or above the configured threshold")
    more = f.decision(cx_box(1065, 900, 175), "Another eligible Matching available?", small=True)
    loop_in = f.connector((235, 1118, 315, 1198), "A")
    summary = f.io((1360, 1070, 1760, 1235), "Display or record the run summary", small=True)
    end = f.terminal((1415, 1300, 1705, 1390), "END")
    duplicate = f.decision(cx_box(1300, 900, 175), "Application already exists for Candidate and Job?", small=True)
    skip = f.process((20, 1320, 310, 1455), "Skip this duplicate Matching", small=True)
    skip_return = f.connector((125, 1490, 205, 1570), "A")
    limit = f.decision(cx_box(1535, 900, 175), "Three Applications already created in this run?", small=True)
    limit_summary = f.io((1360, 1540, 1760, 1705), "Record the per-run limit summary", small=True)
    limit_end = f.terminal((1415, 1760, 1705, 1850), "END")
    create = f.process(cx_box(1770, 1100, 140), "Create a non-duplicate AUTO_APPLIED Application")
    audit = f.process(cx_box(1970, 1000, 130), "Write audit outcome and increment the run count")
    continue_scan = f.process(cx_box(2160, 940, 125), "Continue with the next eligible Matching")
    continue_return = f.connector((780, 2340, 860, 2420), "A")
    note = f.note((250, 2480, 1370, 2670), "Email notification enablement, quota, cooldown, quiet hours, and preferences are evaluated separately; they are not AutoApply eligibility rules.")

    f.arrow(bottom(start), top(trigger))
    f.arrow(bottom(trigger), top(policy))
    f.arrow(bottom(policy), top(cv), "YES", (855, 570))
    f.arrow(right(policy), left(no_policy), "NO", (1290, 390))
    f.arrow(bottom(cv), top(load), "YES", (855, 810))
    f.arrow(right(cv), left(no_cv), "NO", (1290, 625))
    f.arrow(bottom(no_cv), top(no_cv_end))
    f.arrow(bottom(load), top(more))
    f.arrow(right(loop_in), left(more))
    f.arrow(right(more), left(summary), "NO", (1290, 1075))
    f.arrow(bottom(summary), top(end))
    f.arrow(bottom(more), top(duplicate), "YES", (855, 1255))
    f.arrow(bottom(duplicate), top(limit), "NO", (855, 1490))
    f.arrow(left(duplicate), right(skip), "YES", (265, 1275))
    f.arrow(bottom(skip), top(skip_return))
    f.arrow(bottom(limit), top(create), "NO", (855, 1725))
    f.arrow(right(limit), left(limit_summary), "YES", (1290, 1555))
    f.arrow(bottom(limit_summary), top(limit_end))
    f.arrow(bottom(create), top(audit))
    f.arrow(bottom(audit), top(continue_scan))
    f.arrow(bottom(continue_scan), top(continue_return))
    f.label((875, 2355), "NEXT MATCHING")
    return f.save("flowchart-autofit-20260811.png")


def tfidf_construction():
    f = Flowchart(2700)
    start = f.terminal(cx_box(30, 420, 90), "START")
    startup = f.io(cx_box(165, 1080, 125), "Application startup: initialize TF-IDF service")
    load = f.process(cx_box(345, 1060, 125), "Load the static corpus of 49 seeded IT documents")
    unique = f.process(cx_box(525, 1100, 135), "For each document, create a unique lowercase term set")
    df = f.process(cx_box(715, 1080, 130), "Count document frequency df(t) for every seeded term")
    idf = f.process(cx_box(900, 1120, 145), "Compute smoothed IDF: ln(1 + N / (1 + df(t)))")
    persist = f.process(cx_box(1100, 1040, 125), "Keep the IDF map in memory for deterministic scoring")
    tokens = f.io(cx_box(1280, 1080, 125), "Runtime input: normalized CV or Job tokens")
    empty = f.decision(cx_box(1460, 900, 175), "Token list empty?", small=True)
    empty_end = f.terminal((1360, 1498, 1780, 1598), "EMPTY VECTOR / END", small=True)
    tf = f.process(cx_box(1695, 1080, 130), "Count term occurrences and divide by total tokens to obtain TF")
    lookup = f.process(cx_box(1880, 1120, 145), "Use seeded IDF when known; otherwise use ln(1 + N)")
    weight = f.process(cx_box(2080, 1080, 130), "Calculate TF-IDF weight for each unique term")
    output = f.io(cx_box(2265, 1080, 125), "Return the sparse TF-IDF vector")
    end = f.terminal(cx_box(2440, 420, 90), "END")

    for a, b in [
        (start, startup), (startup, load), (load, unique), (unique, df), (df, idf),
        (idf, persist), (persist, tokens), (tokens, empty), (tf, lookup),
        (lookup, weight), (weight, output), (output, end),
    ]:
        f.arrow(bottom(a), top(b))
    f.arrow(right(empty), left(empty_end), "YES", (1290, 1450))
    f.arrow(bottom(empty), top(tf), "NO", (840, 1660))
    return f.save("flowchart-tfidf-construction-20260811.png")


def notification_policy():
    f = Flowchart(3000)
    start = f.terminal(cx_box(25, 420, 90), "START")
    request = f.io(cx_box(155, 1100, 130), "Notification request: recipient, email type, and context key")
    recipient = f.decision(cx_box(345, 860, 170), "Recipient exists and has an ID?", small=True)
    skip_recipient = f.terminal((1360, 370, 1780, 490), "SKIP: RECIPIENT MISSING", small=True)
    load = f.process(cx_box(570, 1080, 130), "Load or create the recipient's automation policy and settings")
    enabled = f.decision(cx_box(755, 880, 175), "Global email and email-type preference enabled?", small=True)
    skip_disabled = f.terminal((1360, 778, 1780, 908), "SKIP: EMAIL DISABLED", small=True)
    quiet = f.decision(cx_box(990, 860, 170), "Current local time is inside enabled quiet hours?", small=True)
    skip_quiet = f.terminal((1360, 1012, 1780, 1137), "SKIP: QUIET HOURS", small=True)
    quota = f.decision(cx_box(1220, 860, 170), "Daily delivery quota remains available?", small=True)
    skip_quota = f.terminal((1360, 1242, 1780, 1367), "SKIP: DAILY QUOTA", small=True)
    duplicate = f.decision(cx_box(1450, 860, 170), "Same email type and context was already sent?", small=True)
    skip_duplicate = f.terminal((1360, 1472, 1780, 1597), "SKIP: DUPLICATE", small=True)
    cooldown = f.decision(cx_box(1680, 860, 170), "Category-wide cooldown is active?", small=True)
    skip_cooldown = f.terminal((1360, 1702, 1780, 1827), "SKIP: COOLDOWN", small=True)
    allow = f.terminal(cx_box(1920, 620, 105), "RETURN SEND")
    send = f.process(cx_box(2085, 1080, 130), "Caller attempts delivery through the configured mail service")
    delivered = f.decision(cx_box(2275, 900, 170), "Delivery succeeds?", small=True)
    sent = f.process((120, 2480, 680, 2610), "Write a SENT delivery log", small=True)
    sent_end = f.terminal((240, 2690, 560, 2780), "END")
    failed = f.process((1050, 2480, 1610, 2610), "Write a FAILED delivery log", small=True)
    failed_end = f.terminal((1170, 2690, 1490, 2780), "END")

    for a, b in [(start, request), (request, recipient), (load, enabled), (allow, send), (send, delivered)]:
        f.arrow(bottom(a), top(b))
    f.arrow(bottom(recipient), top(load), "YES", (855, 525))
    f.arrow(right(recipient), left(skip_recipient), "NO", (1290, 330))
    f.arrow(bottom(enabled), top(quiet), "YES", (855, 940))
    f.arrow(right(enabled), left(skip_disabled), "NO", (1290, 745))
    f.arrow(bottom(quiet), top(quota), "NO", (855, 1175))
    f.arrow(right(quiet), left(skip_quiet), "YES", (1290, 975))
    f.arrow(bottom(quota), top(duplicate), "YES", (855, 1405))
    f.arrow(right(quota), left(skip_quota), "NO", (1290, 1205))
    f.arrow(bottom(duplicate), top(cooldown), "NO", (855, 1635))
    f.arrow(right(duplicate), left(skip_duplicate), "YES", (1290, 1435))
    f.arrow(bottom(cooldown), top(allow), "NO", (855, 1870))
    f.arrow(right(cooldown), left(skip_cooldown), "YES", (1290, 1665))
    f.poly_arrow([left(delivered), (220, (delivered[1] + delivered[3]) / 2), (220, 2415), (400, 2415), top(sent)], "YES", (270, 2320))
    f.poly_arrow([right(delivered), (1640, (delivered[1] + delivered[3]) / 2), (1640, 2415), (1330, 2415), top(failed)], "NO", (1510, 2320))
    f.arrow(bottom(sent), top(sent_end))
    f.arrow(bottom(failed), top(failed_end))
    return f.save("flowchart-notification-policy-20260811.png")


def email_action_redemption():
    f = Flowchart(2860)
    start = f.terminal(cx_box(25, 420, 90), "START")
    open_link = f.io(cx_box(155, 1080, 125), "Candidate opens the raw-token action link")
    get_action = f.process(cx_box(335, 1080, 130), "GET hashes the token and loads the email action by SHA-256 hash")
    get_valid = f.decision(cx_box(525, 900, 180), "Action exists, is PENDING, and is unexpired?", small=True)
    get_reject = f.terminal((1360, 548, 1780, 683), "INVALID / USED / EXPIRED\nEND", small=True)
    confirm_page = f.process(cx_box(760, 1080, 135), "Display a non-mutating confirmation page")
    confirms = f.decision(cx_box(955, 860, 170), "Candidate confirms the action?", small=True)
    leave = f.terminal((1360, 978, 1780, 1103), "LEAVE PENDING / END", small=True)
    post_action = f.process(cx_box(1185, 1080, 130), "POST hashes the token and reloads the action")
    post_valid = f.decision(cx_box(1375, 900, 180), "Action still exists and is PENDING?", small=True)
    post_reject = f.terminal((1360, 1403, 1780, 1528), "REJECT / NO CHANGE / END", small=True)
    expired = f.decision(cx_box(1605, 860, 170), "Action has expired?", small=True)
    mark_expired = f.terminal((1360, 1625, 1780, 1755), "MARK EXPIRED / END", small=True)
    supported = f.decision(cx_box(1840, 940, 180), "Supported feedback/invitation action and referenced record available?", small=True)
    unsupported = f.terminal((1360, 1860, 1780, 2000), "UNAVAILABLE OR OUT OF SCOPE\nEND", small=True)
    execute = f.process(cx_box(2070, 1080, 125), "Execute Matching Feedback or Recruiter-invitation response")
    success = f.decision(cx_box(2230, 860, 170), "Transaction succeeds?", small=True)
    rollback = f.terminal((1360, 2250, 1780, 2380), "ROLLBACK / ERROR / END", small=True)
    redeem = f.process(cx_box(2445, 1080, 125), "Mark the email action REDEEMED and save it")
    result = f.io(cx_box(2600, 1080, 110), "Display the success result")
    end = f.terminal(cx_box(2740, 420, 85), "END")

    for a, b in [
        (start, open_link), (open_link, get_action), (get_action, get_valid),
        (get_valid, confirm_page), (confirm_page, confirms), (confirms, post_action),
        (post_action, post_valid), (post_valid, expired), (expired, supported),
        (supported, execute), (execute, success), (success, redeem), (redeem, result), (result, end),
    ]:
        f.arrow(bottom(a), top(b))
    f.label((855, 710), "YES")
    f.arrow(right(get_valid), left(get_reject), "NO", (1290, 510))
    f.label((855, 1120), "YES")
    f.arrow(right(confirms), left(leave), "NO", (1290, 940))
    f.label((855, 1550), "YES")
    f.arrow(right(post_valid), left(post_reject), "NO", (1290, 1360))
    f.arrow(bottom(expired), top(supported), "NO", (855, 1800))
    f.arrow(right(expired), left(mark_expired), "YES", (1290, 1590))
    f.arrow(bottom(supported), top(execute), "YES", (855, 2035))
    f.arrow(right(supported), left(unsupported), "NO", (1290, 1835))
    f.arrow(bottom(success), top(redeem), "YES", (855, 2395))
    f.arrow(right(success), left(rollback), "NO", (1290, 2215))
    return f.save("flowchart-email-action-redemption-20260811.png")


paths = [
    cv_processing(), matching_potential(), rocchio_feedback(), autofit_decision(),
    tfidf_construction(), notification_policy(), email_action_redemption(),
]
for path in paths:
    print(path)
