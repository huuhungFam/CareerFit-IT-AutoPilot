import sys
import re

with open('Frontend/src/lib/api.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Update 1: updateSettings
settings_old = '''  async updateSettings(payload: any) {
    return request<any>('/settings/me', {
      method: 'PATCH',
      body: JSON.stringify({ values: payload }),
      headers: { 'Content-Type': 'application/json' },
    });
  },'''

settings_new = '''  async updateSettings(payload: any, demoModeEnabled?: boolean) {
    const body: any = { values: payload };
    if (demoModeEnabled !== undefined) {
      body.demoModeEnabled = demoModeEnabled;
    }
    return request<any>('/settings/me', {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  },'''

content = content.replace(settings_old, settings_new)

# Update 2: getRecommendations
recs_old = '''  async getRecommendations(limit = 20) {
    const payload = await request<JobRecommendationDto[]>(`/recommendations/jobs?limit=${limit}`);
    return payload.map(mapRecommendation);
  },'''

recs_new = '''  async getRecommendations(limit = 20) {
    const payload = await request<any>(`/recommendations/jobs?limit=${limit}`);
    if (Array.isArray(payload)) {
      return { jobs: payload.map(mapRecommendation), cvStatus: 'ACTIVE', message: '' };
    }
    return {
      jobs: (payload.jobs || []).map(mapRecommendation),
      cvStatus: payload.cvStatus,
      message: payload.message
    };
  },'''

content = content.replace(recs_old, recs_new)

with open('Frontend/src/lib/api.ts', 'w', encoding='utf-8') as f:
    f.write(content)
