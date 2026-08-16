import sys

with open('Frontend/src/lib/api.ts', 'r', encoding='utf-8') as f:
    content = f.read()

methods = """
  async getJobFieldSuggestions(field: JobSuggestionField, keyword: string) {
    const payload = await request<any>(`/jobs/search/suggestions?keyword=${encodeURIComponent(keyword)}`);
    if (field === 'title') return payload.titles || [];
    if (field === 'company') return payload.companies || [];
    return [];
  },
  async getSkillSuggestions(keyword: string) {
    const payload = await request<any>(`/jobs/search/suggestions?keyword=${encodeURIComponent(keyword)}`);
    return payload.skills || [];
  },
};
"""

content = content.replace("  },\n};", "  }," + methods)

with open('Frontend/src/lib/api.ts', 'w', encoding='utf-8') as f:
    f.write(content)
