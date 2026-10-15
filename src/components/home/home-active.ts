/**
 * Home stays mounted behind the other workspace tabs (its 3D scene is costly
 * to rebuild), so its global key listeners must stand down while it is hidden.
 * A plain flag rather than context: it is read inside react-three-fiber
 * canvases, which run their own reconciler.
 */
export const homeActive = { current: true };
