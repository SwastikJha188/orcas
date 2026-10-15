import json, re, sys
UNIT_TITLES = {
 'GEN': 'General components, valves, flanges and safety hardware',
 'FSL-01': 'Raw-meal feed silo and extraction', 'KFS-01': 'Kiln feed and dosing',
 'PHC-01': 'Six-stage preheater and ID fan', 'EXH-IF': 'Main exhaust gas treatment (ESP and bag filter)',
 'KLN-01': 'Rotary kiln, drives and auxiliaries', 'BRN-01': 'Main burner and fine-coal system',
 'CLR-01': 'Clinker cooler, fans and grate drive', 'HMR-01': 'Clinker hammer crusher', 'CSL-01': 'Clinker transport and silo',
}
def join(lines):
    out = ''
    for l in lines:
        l = l.strip()
        if not l: continue
        if not out: out = l
        elif re.search(r'[A-Za-z]-$', out) and not re.search(r'[A-Z]{2,}-$', out): out += l
        else: out += ' ' + l
    return re.sub(r'\s+', ' ', out).strip()
def unit_of(heading):
    if heading.startswith('GENERAL'): return 'GEN'
    if heading.startswith('CONDITIONAL EXHAUST'): return 'EXH-IF'
    m = re.match(r'^([A-Z]{3}-(?:\d\d|IF))\s', heading)
    return m.group(1) if m else None
LABEL = re.compile(r'^(LOCATION|LIVE CHECK|FIELD CHECK|PLANNED TEST|[A-Z][A-Z /]{2,}):\s*(.*)$')
def parts(cell):
    res = []
    for l in cell.split('\n'):
        m = LABEL.match(l.strip())
        if m: res.append([m.group(1), [m.group(2)]])
        elif res: res[-1][1].append(l)
        else: res.append([None, [l]])
    return [{'label': lab.title() if lab else None, 'text': join(t)} for lab, t in res]
def split_last(cell):
    ls = [l.strip() for l in cell.split('\n') if l.strip()]
    return join(ls[:-1]), ls[-1]
def build(src, kind):
    units = []
    for s in json.load(open(src)):
        code = unit_of(s['heading'])
        if not code or not s['groups']: continue
        u = {'code': code, 'title': UNIT_TITLES[code], 'groups': []}
        if kind == 'sensor' and code == 'EXH-IF': u['conditional'] = True
        for g in s['groups']:
            tasks = []
            for r in g['rows']:
                c = r['cells']
                freq, owner = split_last(c[4]); mode, scope = split_last(c[5])
                t = {'id': c[0].strip()}
                if kind == 'sensor':
                    ls = [l.strip() for l in c[1].split('\n') if l.strip()]
                    if ls[0].startswith('UNASSIGNED D5 TAG'):
                        rest = ls[0][len('UNASSIGNED D5 TAG'):].strip()
                        ls = ([rest] if rest else []) + ls[1:] + ['CONDITIONAL']
                        ls.insert(0, None)
                    else:
                        t['tag'] = ls[0]
                    pri = ls[-1] if ls[-1] in ('REQUIRED','OPTIONAL','CONDITIONAL','UNASSIGNED') else None
                    t['component'] = join(ls[1:-1] if pri else ls[1:])
                    m = re.search(r';\s*(REQUIRED|OPTIONAL)$', t['component'])
                    if m and not pri: pri = m.group(1); t['component'] = t['component'][:m.start()]
                    if pri: t['priority'] = pri.title()
                    t['check'] = parts(c[2])
                else:
                    t['component'] = join(c[1].split('\n'))
                    t['check'] = [{'label': None, 'text': join(c[2].split('\n'))}]
                t.update({'pass': join(c[3].split('\n')), 'freq': freq, 'owner': owner, 'mode': mode, 'scope': scope})
                tasks.append(t)
            u['groups'].append({'num': g['num'], 'title': g['title'].strip(), 'tasks': tasks})
        units.append(u)
    return units
eq = build('mnt.json', 'equipment'); se = build('smt.json', 'sensor')
def count(us): return sum(len(g['tasks']) for u in us for g in u['groups'])
print(count(eq), count(se))
import collections
print(collections.Counter(t['freq'] for u in se for g in u['groups'] for t in g['tasks']))
print(collections.Counter(t['mode'] for u in se for g in u['groups'] for t in g['tasks']))
print(collections.Counter(p['label'] for u in se for g in u['groups'] for t in g['tasks'] for p in t['check']))
print(collections.Counter(t.get('priority') for u in se for g in u['groups'] for t in g['tasks']))
print(json.dumps(se[-1]['groups'][0]['tasks'][0], indent=1))
print(json.dumps(eq[5]['groups'][5]['tasks'][0], indent=1))
hdr = '''// GENERATED from the OSWARteck pyro-line maintenance checklists — do not edit by hand.
//   Equipment: OSW-PE-MNT-PYR-01 Rev. 05 (539 tasks)
//   Sensors:   OSW-PE-SMT-PYR-01 Rev. 04 (352 tasks)
// Text is verbatim from the PDFs (table rows re-joined across line breaks).
import type { ChecklistUnit } from "@/types/maintenance";

'''
body = 'export const EQUIPMENT_UNITS: ChecklistUnit[] = ' + json.dumps(eq, ensure_ascii=False, indent=1) + ';\n\nexport const SENSOR_UNITS: ChecklistUnit[] = ' + json.dumps(se, ensure_ascii=False, indent=1) + ';\n'
open(sys.argv[1], 'w').write(hdr + body)
