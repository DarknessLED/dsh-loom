import json, sqlite3
j = json.load(open('research/wave6/w6-stopping.json', encoding='utf-8'))
KINDS = {'claim','concept','project','source','question','failure','number','analysis'}
RELS = {'supports','contradicts','refines','requires','supersedes','applies-to',
        'derived-from','measures','fails-at','same-as'}
assert len(j['nodes']) <= 30, 'too many nodes'
ids = [n['id'] for n in j['nodes']]
assert len(ids) == len(set(ids)), 'dup ids'
for n in j['nodes']:
    assert set(n) == {'id','kind','title','body','source','confidence','topic','tags'}, n['id']
    assert n['kind'] in KINDS, n['id']
    assert len(n['body']) >= 200, n['id']
    assert len(n['title']) >= 12, n['id']
    assert isinstance(n['tags'], list) and n['tags'], n['id']
    assert 0 <= n['confidence'] <= 1, n['id']
    assert 'Test in our ledger' in n['body'], n['id']
live = {r[0] for r in sqlite3.connect('research/kg/store.sqlite')
        .execute("select id from node where status='live'")}
known = set(ids) | live
for e in j['edges']:
    assert set(e) == {'from','rel','to','note'}, e
    assert e['rel'] in RELS, e
    assert e['from'] != e['to'], e
    assert e['from'] in known and e['to'] in known, e
for g in j['gaps']:
    assert isinstance(g, str) and len(g) > 40
print('ALL CHECKS PASS:', len(j['nodes']), 'nodes,', len(j['edges']), 'edges,', len(j['gaps']), 'gaps')
