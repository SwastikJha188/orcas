# Pyro-line fault library (OSW-PE-FLT-PYR-01)

Turns the fault library PDF into migration `backend/src/db/migrations/032_fault_library.sql`
(tables `fault_library`, `fault_library_inputs`, `rule_faults`).

```bash
pdftotext -layout OSW-PE-FLT-PYR-01_ULTRON_Fault_Library_Rev01.pdf flt.txt && tr -d '\f' < flt.txt > flt2.txt
python3 -I parse.py flt2.txt raw.json                                             # 302 sheets × 11 fields, catalogue, retired list
python3 -I structure.py raw.json ../../backend/src/db/fixtures/measurements.json faults.json
python3 -I gen-sql.py faults.json rule-links.json ../../backend/src/db/fixtures out.sql
```

- `structure.py` splits fields (PRIMARY / SUPPORT inputs, WHAT / WHERE / WHY / IMPACT, DEVELOPING / ALERT / DANGER,
  CHECK) and expands tag ranges such as `POS-FSL-01…06`. Every tag must exist as a pyro measurement.
- `rule-links.json` is curated: which library entries each pyro rule implements, main entry first.
- A new revision goes in a new migration (copy the generated SQL; it upserts), then `npm run db:migrate` and
  `npm run db:export-fixture`.
