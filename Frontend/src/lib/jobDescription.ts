export type JobDescriptionSections = {
  overview: string[];
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
};

type SectionName = keyof JobDescriptionSections;

const LEADING_DESCRIPTION_HEADING = /(?:mô\s+tả\s+công\s+việc|job\s+description)\s*:?\s*/iu;
const SECTION_MARKERS: Array<[SectionName, RegExp]> = [
  ['responsibilities', /(?:bạn\s+sẽ\s+làm\s+gì\?|trách\s+nhiệm\s+công\s+việc|nhiệm\s+vụ\s+chính|what\s+you(?:'ll|\s+will)\s+do|key\s+responsibilities)\s*:?\s*/giu],
  ['requirements', /(?:yêu\s+cầu\s+công\s+việc|yêu\s+cầu\s+ứng\s+viên|chúng\s+tôi\s+tìm\s+kiếm\s+ai\?|job\s+requirements?|required\s+qualifications?|who\s+you\s+are)\s*:?\s*/giu],
  ['benefits', /(?:quyền\s+lợi(?:\s+được\s+hưởng)?|phúc\s+lợi(?:\s+dành\s+cho\s+bạn)?|chế\s+độ\s+đãi\s+ngộ|employee\s+benefits?|what\s+we\s+offer)\s*:?\s*(?=[•●▪◦])/giu],
];

function normalizeWhitespace(value: string) {
  return value
    .split(String.fromCharCode(0)).join('')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function cleanJobDescriptionText(value: string | null | undefined) {
  const normalized = normalizeWhitespace(value ?? '');
  if (!normalized) return '';

  const heading = LEADING_DESCRIPTION_HEADING.exec(normalized);
  if (!heading || heading.index > Math.min(1_200, normalized.length * 0.6)) {
    return normalized;
  }

  return normalized.slice(heading.index + heading[0].length).trim();
}

function addSectionMarkers(value: string) {
  let marked = value;
  for (const [section, pattern] of SECTION_MARKERS) {
    marked = marked.replace(pattern, `\n[[${section}]]\n`);
  }
  return marked
    .replace(/\s*[•●▪◦]\s*/g, '\n• ')
    .replace(/(?:^|\n)\s*[-–—]\s+/g, '\n• ')
    .replace(/\n{3,}/g, '\n\n');
}

function appendEntry(target: string[], value: string) {
  const compact = value
    .replace(/^•\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (compact && !target.includes(compact)) {
    target.push(compact);
  }
}

export function parseJobDescription(value: string | null | undefined): JobDescriptionSections {
  const sections: JobDescriptionSections = {
    overview: [],
    responsibilities: [],
    requirements: [],
    benefits: [],
  };
  const cleaned = cleanJobDescriptionText(value);
  if (!cleaned) return sections;

  let activeSection: SectionName = 'overview';
  for (const block of addSectionMarkers(cleaned).split(/\n+/)) {
    const marker = block.match(/^\[\[(responsibilities|requirements|benefits)\]\]$/);
    if (marker) {
      activeSection = marker[1] as SectionName;
      continue;
    }
    appendEntry(sections[activeSection], block);
  }

  return sections;
}
