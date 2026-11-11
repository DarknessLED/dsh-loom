import json, sys

p = 'research/wave6/w6-attention.json'
j = json.load(open(p, encoding='utf-8'))
KINDS = {'claim','concept','project','source','question','failure','number','analysis'}
RELS = {'supports','contradicts','refines','requires','supersedes','applies-to','derived-from','measures','fails-at','same-as'}

ids = [n['id'] for n in j['nodes']]
print('nodes', len(j['nodes']), 'edges', len(j['edges']), 'gaps', len(j['gaps']))
assert len(j['nodes']) <= 30, 'too many nodes'
dups = {i for i in ids if ids.count(i) > 1}
print('dup ids', dups)
problems = []
for n in j['nodes']:
    for k in ('id','kind','title','body','source','confidence','topic','tags'):
        if k not in n: problems.append(f"missing {k} in {n['id']}")
    if n['kind'] not in KINDS: problems.append(f"bad kind {n['kind']} in {n['id']}")
    if len(n['body']) < 200: problems.append(f"short body {len(n['body'])} in {n['id']}")
    if not isinstance(n.get('tags'), list) or not n['tags']: problems.append(f"bad tags {n['id']}")
    if not (0 <= n['confidence'] <= 1): problems.append(f"bad confidence {n['id']}")
    if len(n['title']) < 12: problems.append(f"short title {n['id']}")
idset = set(ids)
for e in j['edges']:
    for k in ('from','rel','to','note'):
        if k not in e: problems.append(f"edge missing {k}: {e}")
    if e['rel'] not in RELS: problems.append(f"bad rel {e['rel']}")
    for side in ('from','to'):
        if e[side] not in idset: problems.append(f"dangling {side} {e[side]}")
print('edge count per node min', min(sum(1 for e in j['edges'] if e['from']==i or e['to']==i) for i in ids))
print('PROBLEMS', len(problems))
for x in problems: print(' -', x)
lens = sorted(len(n['body']) for n in j['nodes'])
print('body len min/median/max', lens[0], lens[len(lens)//2], lens[-1])
