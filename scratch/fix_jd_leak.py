import sys

with open('Frontend/src/lib/api.ts', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = '''
  let rawDesc = detail.originalText ?? 'No description provided.';
  const startMatch = rawDesc.match(/(Mô tả Công việc|M t\\? Cng vi\\?c|Job Description|K\\?T N\\?I D\\?I TAC)/i);
  if (startMatch && startMatch.index !== undefined && startMatch.index < 500) {
    rawDesc = rawDesc.substring(startMatch.index);
  }
'''

content = content.replace(
    'const detail = dto.detail || {};',
    'const detail = dto.detail || {};\n' + replacement
)

content = content.replace(
    'description: detail.originalText ?? \'No description provided.\',',
    'description: rawDesc,'
)

with open('Frontend/src/lib/api.ts', 'w', encoding='utf-8') as f:
    f.write(content)
