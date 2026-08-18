import sys
import re

with open('Frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# remove requestMagicLink function
content = re.sub(r'  async function requestMagicLink\(\) \{.*?setIsSubmitting\(false\);\n    \}\n  \}', '', content, flags=re.DOTALL)

# remove button
content = re.sub(r'          \{mode === \'login\' \? \(\s*<button className="full" type="button" disabled=\{isSubmitting\} onClick=\{requestMagicLink\}>\s*<MailCheck size=\{16\} />\s*\{t\(\'passwordless\'\)\}\s*</button>\s*\) : null\}\n', '', content)

with open('Frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
