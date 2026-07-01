import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataset = {
  jobs: [],
  cvs: [],
  groundTruth: []
};

const domains = ['Backend', 'Frontend', 'Data', 'DevOps', 'QA', 'Security', 'Mobile'];
const seniorities = ['INTERN', 'FRESHER', 'JUNIOR', 'MID', 'SENIOR', 'LEAD'];

let jobIdCounter = 1;
let cvIdCounter = 1;

const latentSkills = {
  'Backend': 'Redis, Docker, Kafka',
  'Frontend': 'Figma, React, Redux',
  'Data': 'Pandas, Numpy, Spark',
  'DevOps': 'Kubernetes, Terraform, Ansible',
  'QA': 'Selenium, Cypress, Jest',
  'Security': 'Cryptography, OWASP, Burp',
  'Mobile': 'Swift, Kotlin, Flutter'
};

// Generate 50 jobs
for (let i = 0; i < 50; i++) {
  const domain = domains[i % domains.length];
  const seniority = seniorities[i % seniorities.length];
  
  dataset.jobs.push({
    id: `job${i + 1}`,
    title: `${seniority} Software Engineer`,
    requiredSkills: ['Software', 'Agile', 'Git', 'JIRA', 'Scrum'],
    domain: domain,
    seniorityLevel: seniority,
    originalText: `Looking for an Agile Software Engineer. Tools: Git, JIRA, Scrum.`,
    language: "en"
  });

  // Unique latent skills for this job!
  const latentSkill = `latent_a_${i}, latent_b_${i}, latent_c_${i}`;

  // Exactly 2 CVs for this job
  for (let j = 0; j < 2; j++) {
    const cvId = `cv_job_${i + 1}_${j}`;
    dataset.cvs.push({
      id: cvId,
      rawText: `I am an Agile Software Engineer. Tools: Git, JIRA, Scrum, ${latentSkill}.`,
      language: "en"
    });
  }
}

// Create Ground Truth Pairs
for (let i = 0; i < dataset.jobs.length; i++) {
  const job = dataset.jobs[i];
  const jobIndex = parseInt(job.id.replace("job", "")) - 1;
  
  let trainNeg = 0;
  let holdoutNeg = 0;

  for (let j = 0; j < dataset.cvs.length; j++) {
    const cv = dataset.cvs[j];
    
    // The 2 CVs created for this job are Positive
    if (cv.id.startsWith(`cv_job_${jobIndex + 1}_`)) {
      dataset.groundTruth.push({
        cvId: cv.id,
        jobId: job.id,
        relevance: 3,
        labelSource: "AGENT_PROVISIONAL",
        purpose: cv.id.endsWith("_0") ? "train" : "holdout"
      });
    } else {
      // The other 98 CVs are Negative for this job
      let purpose = "skip";
      if (trainNeg < 5) { purpose = "train"; trainNeg++; }
      else if (holdoutNeg < 5) { purpose = "holdout"; holdoutNeg++; }
      
      if (purpose !== "skip") {
        dataset.groundTruth.push({
          cvId: cv.id,
          jobId: job.id,
          relevance: 0,
          labelSource: "AGENT_PROVISIONAL",
          purpose: purpose
        });
      }
    }
  }
}

// --- INVARIANT VALIDATIONS ---
if (dataset.jobs.length !== 50) {
  console.error(`Invariant failed: Expected 50 jobs, got ${dataset.jobs.length}`);
  process.exit(1);
}
if (dataset.cvs.length !== 100) {
  console.error(`Invariant failed: Expected 100 CVs, got ${dataset.cvs.length}`);
  process.exit(1);
}

const jobIds = new Set(dataset.jobs.map(j => j.id));
if (jobIds.size !== 50) {
  console.error(`Invariant failed: Duplicate Job IDs detected`);
  process.exit(1);
}

const cvIds = new Set(dataset.cvs.map(c => c.id));
if (cvIds.size !== 100) {
  console.error(`Invariant failed: Duplicate CV IDs detected`);
  process.exit(1);
}

const pairKeys = new Set();
dataset.groundTruth.forEach(gt => {
  if (!cvIds.has(gt.cvId) || !jobIds.has(gt.jobId)) {
    console.error(`Invariant failed: Invalid CV/Job ID in groundTruth`);
    process.exit(1);
  }
  const key = gt.cvId + "_" + gt.jobId;
  if (pairKeys.has(key)) {
    console.error(`Invariant failed: Duplicate pair ${key}`);
    process.exit(1);
  }
  pairKeys.add(key);
});

// Check if each job has train pos, holdout pos, train neg, holdout neg
for (const jobId of jobIds) {
  const gts = dataset.groundTruth.filter(g => g.jobId === jobId);
  const hasTrainPos = gts.some(g => g.purpose === 'train' && g.relevance >= 2);
  const hasHoldoutPos = gts.some(g => g.purpose === 'holdout' && g.relevance >= 2);
  const hasTrainNeg = gts.some(g => g.purpose === 'train' && g.relevance === 0);
  const hasHoldoutNeg = gts.some(g => g.purpose === 'holdout' && g.relevance === 0);
  
  if (!hasTrainPos || !hasHoldoutPos || !hasTrainNeg || !hasHoldoutNeg) {
    console.error(`Invariant failed: Job ${jobId} does not have required positive/negative train/holdout splits`);
    process.exit(1);
  }
}

const outputPath = path.join(__dirname, '../evaluation/controlled-dataset.json');
let retries = 5;
while (retries > 0) {
  try {
    fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2));
    break;
  } catch (e) {
    // Only retry for transient write locks/permissions
    if (['EBUSY', 'EPERM', 'UNKNOWN'].includes(e.code)) {
        retries--;
        if (retries === 0) {
            console.error(`Failed to write file after retries:`, e);
            process.exit(1);
        }
        const Atomics = globalThis.Atomics;
        const SharedArrayBuffer = globalThis.SharedArrayBuffer;
        if (Atomics && SharedArrayBuffer) {
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
        }
    } else {
        console.error(`Fatal I/O error:`, e);
        process.exit(1);
    }
  }
}

const hash = crypto.createHash('sha256').update(JSON.stringify(dataset)).digest('hex');
console.log('Dataset generated deterministically with ' + dataset.jobs.length + ' jobs and ' + dataset.cvs.length + ' cvs. Pairs: ' + dataset.groundTruth.length);
console.log('Dataset Hash: ' + hash);
