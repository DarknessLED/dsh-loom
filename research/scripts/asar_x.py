import json, struct, sys, os
P = r"C:\Software\DeepSeek Harness\resources\app.asar"
f = open(P,'rb')
sz1, sz2, sz3, jlen = struct.unpack('<IIII', f.read(16))
f.seek(16); d = json.loads(f.read(jlen)); base = 8 + sz2
def walk(node, prefix, out):
    for k,v in node.get('files',{}).items():
        path = prefix + '/' + k
        if 'files' in v: walk(v, path, out)
        else: out.append((path, v.get('size',0), v.get('offset')))
out=[]; walk(d,'',out)
idx = {path:(size,off) for path,size,off in out}
cmd = sys.argv[1]
if cmd == 'ls':
    for path,size,off in out:
        if sys.argv[2] in path: print(f"{size}\t{path}")
elif cmd == 'cat':
    key = sys.argv[2]
    if not key.startswith('/'): key = '/' + key
    size,off = idx[key]; off=int(off); f.seek(base+off); sys.stdout.write(f.read(size).decode('utf-8','replace'))
elif cmd == 'get':
    key = sys.argv[2]
    if not key.startswith('/'): key = '/' + key
    size,off = idx[key]; off=int(off)
    dest = sys.argv[3].lstrip('/')
    os.makedirs(os.path.dirname(dest) or '.', exist_ok=True)
    f.seek(base+off); open(dest,'wb').write(f.read(size)); print("wrote",dest,size)
