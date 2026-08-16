const leadingDescriptionHeading = /(?:mô\s+tả\s+công\s+việc|job\s+description)\s*:?\s*/iu;
const sectionHeadings = [
  /(?:bạn\s+sẽ\s+làm\s+gì\?|trách\s+nhiệm\s+công\s+việc|nhiệm\s+vụ\s+chính|what\s+you(?:'ll|\s+will)\s+do|key\s+responsibilities)\s*:?\s*/giu,
  /(?:yêu\s+cầu\s+công\s+việc|yêu\s+cầu\s+ứng\s+viên|chúng\s+tôi\s+tìm\s+kiếm\s+ai\?|job\s+requirements?|required\s+qualifications?|who\s+you\s+are)\s*:?\s*/giu,
  /(?:quyền\s+lợi(?:\s+được\s+hưởng)?|phúc\s+lợi(?:\s+dành\s+cho\s+bạn)?|chế\s+độ\s+đãi\s+ngộ|employee\s+benefits?|what\s+we\s+offer)\s*:?\s*(?=[•●▪◦])/giu,
];

export function normalizeImportedJobDescription(value) {
  let normalized = String(value ?? '')
    .replace(/\u0000/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!normalized) return '';

  const heading = leadingDescriptionHeading.exec(normalized);
  if (heading && heading.index <= Math.min(1_200, normalized.length * 0.6)) {
    normalized = normalized.slice(heading.index + heading[0].length).trim();
  }

  for (const pattern of sectionHeadings) {
    normalized = normalized.replace(pattern, (match) => `\n\n${match.trim()}\n`);
  }

  return normalized
    .replace(/\s*[•●▪◦]\s*/g, '\n• ')
    .replace(/(?:^|\n)\s*[-–—]\s+/g, '\n• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
