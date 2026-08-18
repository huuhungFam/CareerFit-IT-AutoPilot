import sys
import re

with open('Frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'\s*\{mode === \'login\' \? \(\s*<button className="full" type="button" disabled=\{isSubmitting\} onClick=\{requestMagicLink\}>\s*<MailCheck size=\{16\} />\s*\{t\(\'passwordless\'\)\}\s*</button>\s*\) : null\}', '', content, flags=re.DOTALL)

with open('Frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
