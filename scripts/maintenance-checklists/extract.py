import pdfplumber, sys, json, re
src, out = sys.argv[1], sys.argv[2]
p = pdfplumber.open(src)
sec = sub = None
sections = []  # {num, code, title, intro, groups:[{num,title,rows:[]}]}
rows_total = 0
for pg in p.pages:
    lines = pg.extract_text_lines()
    tables = pg.find_tables()
    events = []
    for l in lines:
        t = l['text'].strip()
        m = re.match(r'^(\d+)\s+([A-Z0-9][A-Z0-9 ,/&()\-–.]+)$', t)
        if m and l['chars'][0]['size'] > 13 and int(m.group(1)) >= 2:
            events.append((l['top'], 'sec', m.group(1), m.group(2)))
            continue
        m = re.match(r'^(\d+)\.(\d+)\s+(.+)$', t)
        if m and l['chars'][0]['size'] > 11:
            events.append((l['top'], 'sub', m.group(1)+'.'+m.group(2), m.group(3)))
    for tb in tables:
        events.append((tb.bbox[1], 'tab', tb, None))
    events.sort(key=lambda e: e[0])
    for top, kind, a, b in events:
        if kind == 'sec':
            sec = {'num': a, 'heading': b, 'groups': []}; sections.append(sec); sub = None
            # intro paragraph = line after heading
            idx = [i for i,l in enumerate(lines) if abs(l['top']-top)<1][0]
            intro = []
            for l in lines[idx+1:]:
                if l['text'].startswith('INSPECTION RECORD'): break
                intro.append(l['text'])
            sec['intro'] = ' '.join(intro)
        elif kind == 'sub':
            if sec is None: continue
            sub = {'num': a, 'title': b, 'rows': []}; sec['groups'].append(sub)
        else:
            if sub is None: continue
            t = a.extract()
            if not t or not t[0] or t[0][0] != 'TASK ID': continue
            for r in t[1:]:
                if not r[0]:  # continuation row
                    prev = sub['rows'][-1] if sub['rows'] else None
                    if prev:
                        for k in range(1,7):
                            if r[k]: prev['cells'][k] += '\n'+r[k]
                    continue
                sub['rows'].append({'cells': r})
                rows_total += 1
json.dump(sections, open(out,'w'), ensure_ascii=False, indent=1)
print('rows', rows_total)
for s in sections: print(s['num'], s['heading'], sum(len(g['rows']) for g in s['groups']), len(s['groups']))
