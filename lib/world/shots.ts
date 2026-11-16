/**
 * The camera's shots through the big lab. Each one belongs to a window in the page (the hero, or a gap
 * between two sections): scrolling through that window moves the camera from `from` to `to`.
 * Plain data and maths only, so it can be tested without a browser.
 */
export type Vec3 = [number, number, number];
export type Pose = { pos: Vec3; look: Vec3 };
export type ShotId = "console" | "tubes" | "platform" | "cabinet" | "projector" | "banderitas" | "outbox";
export type Shot = { from: Pose; to: Pose; /** Where the key light and its shadows are centred. */ focus: Vec3 };

export const SHOTS: Record<ShotId, Shot> = {
  console: { from: { pos: [0, 2, 8.6], look: [0, 4.4, -60] }, to: { pos: [-1, 3.6, 2.5], look: [-3, 8, -80] }, focus: [0, 0, -8] },
  tubes: { from: { pos: [-1, 7, -36], look: [17, 7, -58] }, to: { pos: [6.5, 3.6, -50.5], look: [17, 4.4, -58.5] }, focus: [14, 0, -56] },
  platform: { from: { pos: [0, 12, -60], look: [0, 4, -92] }, to: { pos: [-6, 4.2, -75], look: [0, 3.6, -92] }, focus: [0, 0, -90] },
  cabinet: { from: { pos: [4, 8, -106], look: [-15, 3, -126] }, to: { pos: [-5, 3.4, -117.5], look: [-15, 2.8, -126] }, focus: [-13, 0, -124] },
  projector: { from: { pos: [-6, 8, -132], look: [13, 4.5, -152] }, to: { pos: [2.5, 3.6, -145], look: [14, 4.8, -153] }, focus: [11, 0, -150] },
  banderitas: { from: { pos: [0, 3, -154], look: [0, 12, -180] }, to: { pos: [0, 6.5, -166], look: [0, 13.5, -190] }, focus: [0, 0, -176] },
  outbox: { from: { pos: [0, 10, -184], look: [0, 9, -228] }, to: { pos: [-2.5, 3.6, -200], look: [3, 6.5, -228] }, focus: [0, 0, -212] },
};

const smooth = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** The pose at scroll progress `p` (0 as the window enters, 1 as it leaves). Clamped and eased. */
export function shotPose(id: ShotId, p: number, out: Pose = { pos: [0, 0, 0], look: [0, 0, 0] }): Pose {
  const shot = SHOTS[id];
  const t = smooth(Math.min(1, Math.max(0, p)));
  for (let i = 0; i < 3; i += 1) {
    out.pos[i] = mix(shot.from.pos[i], shot.to.pos[i], t);
    out.look[i] = mix(shot.from.look[i], shot.to.look[i], t);
  }
  return out;
}

/** Progress through a window: 0 when its top reaches the bottom of the screen, 1 when its bottom leaves the top. */
export function windowProgress(top: number, height: number, viewport: number) {
  const span = viewport + height;
  return span > 0 ? Math.min(1, Math.max(0, (viewport - top) / span)) : 0;
}
