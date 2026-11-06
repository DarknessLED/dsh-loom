import json, struct, sys
p = r"C:\Software\DeepSeek Harness\resources\app.asar"
f = open(p,'rb')
hdr = f.read(16)
# asar: 4 bytes header size (pickle), 4 bytes, 4 bytes, 4 bytes json size
sz1, sz2, sz3, jlen = struct.unpack('<IIII', hdr)
f.seek(16)
j = f.read(jlen)
d = json.loads(j)
base = 8 + sz1  # header total offset
def walk(node, prefix, out):
    for k,v in node.get('files',{}).items():
        path = prefix + '/' + k
        if 'files' in v:
            walk(v, path, out)
        else:
            out.append((path, v.get('size',0), v.get('offset')))
out=[]
walk(d,'',out)
print("base",base,"count",len(out))
pat = sys.argv[1] if len(sys.argv)>1 else ''
for path,size,off in out:
    if pat in path:
        print(f"{size}\t{path}")
