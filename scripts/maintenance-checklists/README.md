Regenerates `src/server/maintenance/checklists.generated.ts` from the two OSWARteck PDFs (needs `pdfplumber`):

    python3 extract.py <OSW-PE-MNT-PYR-01 ….pdf> mnt.json
    python3 extract.py <OSW-PE-SMT-PYR-01 ….pdf> smt.json
    python3 gen.py ../../src/server/maintenance/checklists.generated.ts

Run from this folder. Expect "539 352" (equipment / sensor task counts).
