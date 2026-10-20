# Review checklist (3D) — run after every render

Open your PNG next to the source image. Answer each line yes / no. Fix every
"no", render again.

## Matches the source

1. Front elevation shows every item of the image in the same left-to-right
   order, with the same relative heights and widths.
2. Sizes are believable in metres (handrails ~1 m, motors smaller than what
   they drive, doors ~2 m). The report's `builtSize` matches `size`.
3. Every connection (pipe, duct, chute, conveyor) joins the right two items:
   it ends on the item's surface or nozzle, not in the air and not buried deep inside.
4. Every measurement point has a transmitter on the part it measures.
5. Sub-assemblies (`parts` in the report) match the main items of the image.

## Looks like the ULTRON style

6. Graphite bodies with grey rim lines, brushed-metal shafts and flanges,
   concrete plinths, dark openings; brass only for process material.
7. Everything stands on the floor or on a structure — nothing floats, nothing
   sinks below y = 0, no two items intersect unless one is mounted on the other.
8. Pipes run straight with right-angle bends; low runs on posts, high runs on
   brackets off the structure — no floor poles taller than ~4 m, no pipe
   ending in mid-air. Chutes and pipes are steel, not brass.
9. Every deck above 1.5 m has a handrail and a way up (ladder / stair).
10. Detail is present: bolts on flanges and covers, panels on boxes, stiffener
    rings on tall shells, nozzles, feet, skids, plinths. From the
    three-quarter views it reads as a real installed machine, not a set of
    plain boxes and cylinders.
11. Plan view: a tidy layout, equipment in rows, sensible clearances
    (≥ 0.8 m walkway around machines).
12. Materials are varied (report `materials`): not almost everything `model`.

## Technical

13. Report has no `errors`; each `warnings` entry is fixed or explained.
14. Light theme render (`--theme light`) looks right.
15. File exports `model` with `id`, `name`, `size`, `build`; no materials,
    colours, lights or scene code inside.
