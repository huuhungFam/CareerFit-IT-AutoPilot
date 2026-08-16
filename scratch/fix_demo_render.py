import sys

path = 'Frontend/src/App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

anchor = "{!isLoading && !error && role === 'candidate' ? <>\n"
insertion = "{!isLoading && !error ? <DemoModeSettings onUpdate={() => queryClient.invalidateQueries({ queryKey: ['settings', role] })} /> : null}\n      "

if anchor in content:
    content = content.replace(anchor, insertion + anchor)
else:
    print("Anchor not found!")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
