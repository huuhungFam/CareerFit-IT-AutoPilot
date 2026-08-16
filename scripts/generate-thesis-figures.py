from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, math

ROOT=Path(r"C:\CODING\Thesis")
OUT=ROOT/"Doc"/"figures"; OUT.mkdir(parents=True,exist_ok=True)
W,H=1600,900
FONT=r"C:\Windows\Fonts\arial.ttf"; BOLD=r"C:\Windows\Fonts\arialbd.ttf"

def f(size,bold=False): return ImageFont.truetype(BOLD if bold else FONT,size)
def wrap(draw,text,font,maxw):
    words=text.split(); lines=[]; cur=""
    for w in words:
        test=(cur+" "+w).strip()
        if draw.textbbox((0,0),test,font=font)[2]<=maxw: cur=test
        else:
            if cur: lines.append(cur)
            cur=w
    if cur: lines.append(cur)
    return lines
def arrow(d,a,b,color="#4f46e5"):
    d.line([a,b],fill=color,width=5)
    ang=math.atan2(b[1]-a[1],b[0]-a[0]); L=18
    pts=[b,(b[0]-L*math.cos(ang-.55),b[1]-L*math.sin(ang-.55)),(b[0]-L*math.cos(ang+.55),b[1]-L*math.sin(ang+.55))]
    d.polygon(pts,fill=color)
def box(d,xy,text,fill="#eef2ff",outline="#4f46e5"):
    x1,y1,x2,y2=xy; d.rounded_rectangle(xy,18,fill=fill,outline=outline,width=4)
    font=f(27,True); lines=wrap(d,text,font,x2-x1-30); total=len(lines)*34
    for i,line in enumerate(lines):
        bb=d.textbbox((0,0),line,font=font); d.text((x1+(x2-x1-(bb[2]-bb[0]))/2,y1+(y2-y1-total)/2+i*34),line,font=font,fill="#172554")
def flow(filename,title,nodes,vertical=False):
    im=Image.new("RGB",(W,H),"white");d=ImageDraw.Draw(im)
    d.text((70,45),title,font=f(42,True),fill="#111827")
    n=len(nodes); coords=[]
    if vertical:
        bw,bh=560,90; gap=(H-180-n*bh)/(n-1 if n>1 else 1)
        for i,node in enumerate(nodes):
            x1=(W-bw)//2;y1=130+i*(bh+gap);coords.append((x1,y1,x1+bw,y1+bh));box(d,coords[-1],node)
        for a,b in zip(coords,coords[1:]): arrow(d,((a[0]+a[2])//2,a[3]),((b[0]+b[2])//2,b[1]))
    else:
        cols=min(4,n); rows=math.ceil(n/cols); bw=330;bh=130
        for i,node in enumerate(nodes):
            r=i//cols;c=i%cols;x1=70+c*385;y1=170+r*270;coords.append((x1,y1,x1+bw,y1+bh));box(d,coords[-1],node)
        for i in range(n-1):
            a,b=coords[i],coords[i+1]
            if i//cols==(i+1)//cols: arrow(d,(a[2],(a[1]+a[3])//2),(b[0],(b[1]+b[3])//2))
            else: arrow(d,((a[0]+a[2])//2,a[3]),((b[0]+b[2])//2,b[1]))
    d.text((70,845),"CareerFit IT AutoPilot — thesis diagram",font=f(20),fill="#64748b")
    im.save(OUT/filename,quality=95)

figs={
"fig-1-1.png":("CareerFit problem context",["Candidate: profile, CV, preferences","CareerFit: matching, recommendation, policy","Recruiter: JD, ranking, feedback","Audit and controlled actions"]),
"fig-1-2.png":("Thesis scope boundary",["In scope: Job portal","In scope: CV–JD matching","In scope: AutoFit and HITL","Out of scope: payroll and full ATS","Out of scope: third-party auto-submit","Future: semantic and hybrid retrieval"]),
"fig-2-1.png":("Three distinct recruitment concepts",["CV–JD matching: demonstrated evidence","Profile recommendation: candidate intent","Recruitment action: apply, invite, review"]),
"fig-2-2.png":("TF-IDF and cosine pipeline",["CV / JD text","Normalize and tokenize","Static-corpus TF-IDF","Sparse vectors","Cosine similarity","Score, label and reasons"]),
"fig-2-3.png":("Rocchio relevance feedback",["Original Job vector q0","Positive CV centroid","Negative CV centroid","q = αq0 + βpositive − γnegative","Recompute Matchings"]),
"fig-2-4.png":("Human-in-the-Loop cycle",["Perception: CV, JD and state","Decision support: score and policy","Human control: review or consent","Action: apply, invite or notify","Learning: explicit feedback","Audit: reconstruct outcome"]),
"fig-3-1.png":("System context",["Guest / Candidate","React web client","Spring Boot modular monolith","PostgreSQL and CV storage","Recruiter / Administrator","SMTP provider and scheduler"]),
"fig-3-2.png":("Role-oriented use cases",["Guest: search and view Jobs","Candidate: review CV, match, apply, AutoFit","Recruiter: company, Job draft, Talent Pool","Administrator: moderate and audit","Scheduler: recompute, remind and notify"]),
"fig-3-3.png":("CV review and matching sequence",["Upload file or save manual draft","Extract text or run OCR","Clean and split CV sections","Candidate reviews and edits","Candidate confirms CV","Vectorize and score active Jobs","Persist and return match cards"]),
"fig-3-4.png":("Feedback recomputation sequence",["Submit feedback","Upsert feedback and audit","After commit: Rocchio update","Mark Matchings stale","Scheduled recomputation"]),
"fig-3-5.png":("AutoFit decision flow",["Policy enabled?","Candidate and default CV valid?","Job active and score above threshold?","Existing interaction/application?","Create action or skip","Audit and notify"]),
"fig-3-6.png":("Hardened email-action sequence",["Email contains raw one-time token","GET hashes token and shows confirmation","User confirms with POST","Validate pending and expiry","Execute, redeem and audit"]),
"fig-3-7.png":("Modular-monolith architecture",["React presentation","REST controllers and DTOs","Domain services","JPA repositories","PostgreSQL / JSONB","Async, scheduler, mail and metrics"]),
"fig-3-8.png":("Data domains and relationships",["Identity: UserAccount and role profile","Candidate: CV review, skills, portfolio","Recruitment: Job, Matching, Application","Recruiter: company and CV bookmark","Learning: Feedback and vectors","Automation: Policy and EmailAction","Operations: Audit, Analytics, DeliveryLog"]),
"fig-3-9.png":("Local deployment addresses",["Browser: 127.0.0.1:5173","Host backend: localhost:8080","Host DB endpoint: localhost:5433","Compose DB service: postgres:5432","Named volumes preserve data"]),
"fig-4-1.png":("Backend request path",["Controller","DTO validation","Domain service and transaction","Repository","PostgreSQL","API envelope"]),
"fig-4-2.png":("JWT request processing",["Authorization: Bearer token","JWT validation","Reload active account","Resolve user UUID","URL role rule","Service ownership check"]),
"fig-4-3.png":("CV ingestion and review implementation",["Magic bytes and MIME validation","PDFBox / POI extraction","Image preprocessing and OCR","OCR cleanup and section parsing","DRAFT or REVIEW_REQUIRED","User edit and confirmation","TF-IDF and async matching"]),
"fig-4-4.png":("Static-corpus TF-IDF",["49 seeded IT documents","Build IDF once at startup","Normalize runtime document","Compute TF × smoothed IDF","Persist JSON vector"]),
"fig-4-5.png":("Direct match and Potential assessment",["Load CV and Job vectors","Cosine score × 100","Assign LOW / MEDIUM / HIGH","Resolve skill aliases and families","Check transfer, foundation and seniority","Set separate Potential flag and reason","Upsert unique Matching"]),
"fig-4-6.png":("Feedback implementation",["Feedback API","Transactional upsert","Commit transaction","Async Rocchio from base vector","Mark stale","Scheduler recomputes"]),
"fig-4-7.png":("Application state flow",["PENDING / AUTO_APPLIED","INVITED","APPROVED","REJECTED","NOT_INTERESTED"]),
"fig-4-8.png":("Per-account automation guard",["Enabled and not paused?","Category allowed?","Threshold and interaction checks","Quota and cooldown available?","Outside quiet hours?","Apply, invite, remind or skip","Audit and delivery log"]),
"fig-4-9.png":("Secure email-action implementation",["Generate random token","Store SHA-256 hash","GET is non-mutating confirmation","POST executes once","Redeemed/expired state prevents replay"]),
"fig-4-10.png":("Frontend data flow",["Role route and workspace","React Query hook","Server-side filters and pagination","Central request helper","REST API","DTO mapper without mock fallback","Loading / error / empty / data UI"]),
"fig-5-1.png":("Evaluation environments",["JUnit unit tests","Testcontainers PostgreSQL","Controlled synthetic benchmark","Compose integration runtime","Playwright browser E2E","Evidence artifacts"]),
"fig-5-3.png":("P0 end-to-end coverage",["Guest search and detail","Candidate apply and withdraw","Recruiter create and delete test JD","Admin suspend and reactivate"]),
"fig-5-4.png":("Observed local Job-search latency",["30 sequential warm requests","Minimum 44.99 ms","Median 55.20 ms","Mean 61.79 ms","p95 85.11 ms","Maximum 99.32 ms"]),
}
for name,(title,nodes) in figs.items(): flow(name,title,nodes)

# Metric bar chart
im=Image.new("RGB",(W,H),"white");d=ImageDraw.Draw(im);d.text((70,45),"Controlled benchmark: baseline versus Rocchio",font=f(42,True),fill="#111827")
data=json.loads((ROOT/"evaluation"/"result.json").read_text())
items=[("P@5",data["baseline"]["avgPAt5"],data["rocchio"]["avgPAt5"]),("Recall@5",data["baseline"]["avgRecallAt5"],data["rocchio"]["avgRecallAt5"]),("nDCG@5",data["baseline"]["avgNdcgAt5"],data["rocchio"]["avgNdcgAt5"]),("MRR",data["baseline"]["avgMrr"],data["rocchio"]["avgMrr"]),("HitRate@5",data["baseline"]["avgHitRate5"],data["rocchio"]["avgHitRate5"])]
for i,(lab,a,b) in enumerate(items):
    x=140+i*285;base=760;scale=560
    d.rectangle((x,base-a*scale,x+75,base),fill="#94a3b8");d.rectangle((x+95,base-b*scale,x+170,base),fill="#4f46e5")
    d.text((x,790),lab,font=f(23,True),fill="#111827");d.text((x,base-a*scale-32),f"{a:.3f}",font=f(19),fill="#475569");d.text((x+95,base-b*scale-32),f"{b:.3f}",font=f(19),fill="#312e81")
d.rectangle((1180,100,1220,130),fill="#94a3b8");d.text((1235,100),"Baseline",font=f(22),fill="#111827");d.rectangle((1180,145,1220,175),fill="#4f46e5");d.text((1235,145),"Rocchio",font=f(22),fill="#111827")
im.save(OUT/"fig-5-2.png")
print(f"generated {len(figs)+1} figures in {OUT}")
