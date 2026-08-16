import sys

path = 'Frontend/src/components/ToastMessage.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("tone: 'success' | 'error'", "tone: 'success' | 'error' | 'info' | 'warning'")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
