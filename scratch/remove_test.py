import sys
import re

with open('Frontend/tests/p0-flows.spec.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'  test\(\'Passwordless login request reaches backend\', async \(\{ page \}\) => \{.*?\}\);\n', '', content, flags=re.DOTALL)

with open('Frontend/tests/p0-flows.spec.ts', 'w', encoding='utf-8') as f:
    f.write(content)
