import sys

with open('Frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_str = "<DemoModeSettings onUpdate={() => queryClient.invalidateQueries({ queryKey: ['settings', role] })} />"
new_str = "<DemoModeSettings data={data} role={role} onUpdate={() => queryClient.invalidateQueries({ queryKey: ['settings', role] })} />"

content = content.replace(old_str, new_str)

with open('Frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
