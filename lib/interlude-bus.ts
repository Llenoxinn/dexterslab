/**
 * The interlude headline is simulated in components/lab-interlude.tsx and, when WebGL is up,
 * rendered as clay blocks by components/lab-3d-canvas.tsx. This module is the hand-off between
 * them: no React state, just typed arrays written once per frame and read once per frame.
 */
export type InterludePixels = {
  /** Number of live pixels in the arrays below. */
  count: number;
  /** Viewport (client) position of each pixel's top-left corner, in CSS px. */
  x: Float32Array;
  y: Float32Array;
  /** Which line of the headline each pixel belongs to (0 or 1): picks its colour. */
  row: Uint8Array;
  /** 0..1 neon highlight (landing flash, refresh scanline). */
  tint: Float32Array;
  /** 0..1 opacity while flying in. */
  alpha: Float32Array;
  /** Cell size in CSS px. */
  cell: number;
  /** performance.now() of the last write; stale data is ignored. */
  at: number;
};

export const interludeBus: {
  pixels: InterludePixels | null;
  /** Set by the 3D scene while it draws the headline as clay, so the 2D canvas stays blank. */
  clay: boolean;
  /** Viewport positions of exploded lab pieces, so the first assembly starts from the debris. */
  debris: Array<[number, number]>;
  /** performance.now() when the first assembly began, and when its last block lands: the 3D scene
   *  dives part of the debris into the words over that window. 0 = not assembling. */
  assembleAt: number;
  landAt: number;
} = { pixels: null, clay: false, debris: [], assembleAt: 0, landAt: 0 };

export function ensurePixelBuffers(count: number): InterludePixels {
  const current = interludeBus.pixels;
  if (current && current.x.length >= count) {
    current.count = count;
    return current;
  }
  const size = Math.max(count, 256);
  interludeBus.pixels = {
    count,
    x: new Float32Array(size),
    y: new Float32Array(size),
    row: new Uint8Array(size),
    tint: new Float32Array(size),
    alpha: new Float32Array(size),
    cell: current?.cell ?? 6,
    at: 0,
  };
  return interludeBus.pixels;
}
