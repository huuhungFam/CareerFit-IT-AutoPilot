import sys

with open('Frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("{ tone, text }: { tone: 'success' | 'error'; text: string }", "{ tone, text }: { tone: 'success' | 'error' | 'info' | 'warning'; text: string }")

# Also fix SettingToggle
content = content.replace("onChange: (checked: boolean) => void;\n}) {", "onChange: (checked: boolean) => void;\n  disabled?: boolean;\n}) {")
content = content.replace("<button\n      type=\"button\"", "<button\n      type=\"button\"\n      disabled={disabled}")

with open('Frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
