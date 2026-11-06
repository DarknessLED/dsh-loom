import io
import re

p = r'C:\Projects\RSI\research\dsh-plugin-api.md'
s = io.open(p, encoding='utf-8').read()
lines = s.split('\n')
out = [ln for ln in lines if ln.strip() != '---']
s2 = '\n'.join(out)
s2 = re.sub(r'\n{3,}', '\n\n', s2)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s2)
print(len(s2.splitlines()))
