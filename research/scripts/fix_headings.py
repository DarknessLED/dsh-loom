import io
import re

p = r'C:\Projects\RSI\research\dsh-plugin-api.md'
lines = io.open(p, encoding='utf-8').read().split('\n')
out = []
for ln in lines:
    if ln.startswith('#') and out and out[-1].strip() != '':
        out.append('')
    if ln.strip() == '' and out and out[-1].strip() == '':
        continue
    out.append(ln)
s = '\n'.join(out).rstrip('\n') + '\n'
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print(len(s.splitlines()))
