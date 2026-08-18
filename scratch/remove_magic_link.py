import sys

with open('Frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('        <Route path="/auth/magic-link/verify" element={<MagicLinkPage onAuthenticated={setAccount} />} />\n', '')

start_idx = content.find('function MagicLinkPage')
if start_idx != -1:
    end_idx = content.find('function ProtectedLayout', start_idx)
    if end_idx != -1:
        content = content[:start_idx] + content[end_idx:]

with open('Frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
