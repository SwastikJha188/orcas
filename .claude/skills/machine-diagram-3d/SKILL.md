---
name: machine-diagram-3d
description: Make an ULTRON 3D machine model / twin from an image of any machine, process line or factory. Use when the user asks for a 3D model, 3D twin or "make this in 3D" from an image. The 3D model comes from the same spec as the 2D drawing — this skill sends you to machine-diagram-2d.
---

# 3D machine model from an image

The 3D model is made together with the 2D drawing, from one JSON spec.
Follow the **machine-diagram-2d** skill (`.claude/skills/machine-diagram-2d/SKILL.md`)
exactly. Its draw command writes `<name>.ts` (the 3D model, `export const
model`) and `<name>-3d.png` (four views of it) next to the 2D files.

- Do not write a 3D model by hand and never edit the generated `.ts`: change
  the spec and run `draw.mjs` again.
- Optional, for true size: add `"scale": { "item": "<id>", "metres": <height> }`
  to the spec when the image or a document gives a real height of one item
  (e.g. the silo is 24 m). Without it, sizes come from typical machine heights.
- In the 3D views, check that every machine of the image is there and that
  stacked machines sit on each other. Fix problems in the spec.
