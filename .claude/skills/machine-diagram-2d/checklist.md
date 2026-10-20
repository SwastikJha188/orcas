# Review checklist (2D) — run after every render

Open your PNG next to the source image. Answer each line yes / no. Fix every
"no", render again.

## Matches the source

1. Every equipment item in the inventory is drawn, in the same left-to-right
   and top-to-bottom order as the image.
2. Relative sizes match the image: the biggest item is the biggest, tall
   things are tall, motors are smaller than what they drive.
3. Every connection in the image (pipe, duct, chute, belt) is drawn and joins
   the right two items, touching their edges (no gaps, no lines crossing
   through bodies unless the image shows that).
4. Flow arrows point the same way as the image (downstream).
5. Every measurement point in the image has an instrument and a pad on the
   part it measures.
6. Labels name each item (use the image's names, uppercase).

## Looks like the ULTRON style

7. Graphite bodies with mid-grey outlines; nothing flat-white, nothing
   coloured except brass contents / material flows and blue / red-brown flow
   arrows.
8. Everything that stands on the floor sits exactly on the ground line; tall
   items on frames or legs, never floating.
9. Pipes and ducts run horizontal / vertical with right-angle bends.
10. Shafts line up: motor, coupling, gearbox and driven machine on one centreline.
11. Detail is present: bolts on flanges and covers, seams on shells, feet and
    baseplates under machines, handrails on high platforms, ladders to them,
    supports under long pipes. The drawing does not look like plain boxes.
12. The drawing fills the sheet (85–95 % of the width) with even margins;
    no big empty corner.
13. Labels do not overlap each other or any body; they are small (9–11).
14. No text other than equipment labels. No title, legend, notes, grid,
    frame or background.

## Technical

15. Report has no `errors`; each `warnings` entry is fixed or explained.
16. Light theme render (`--theme light`) looks right too: nothing vanishes.
17. The file exports `sheet` with `ready: true`, `pads` for every point, and
    `callouts` for every pad.
