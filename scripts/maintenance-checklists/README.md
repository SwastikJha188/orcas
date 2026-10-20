Extracts the task rows from the two OSWARteck checklist PDFs (needs `pdfplumber`):

    python3 extract.py <OSW-PE-MNT-PYR-01 ….pdf> mnt.json
    python3 extract.py <OSW-PE-SMT-PYR-01 ….pdf> smt.json

Run from this folder. Expect "539 352" (equipment / sensor task counts).

The checklists live in the database (migration 014: `maintenance_documents`,
`maintenance_units`, `maintenance_groups`, `maintenance_tasks`,
`maintenance_task_steps`, `machine_maintenance_units`, and the vocabulary
tables). A new document revision is loaded into those tables, then the
reference fixture is re-exported (`scripts/db-export-fixture.mjs`). `gen.py`
still writes the old TypeScript form and is kept only to inspect a revision.
