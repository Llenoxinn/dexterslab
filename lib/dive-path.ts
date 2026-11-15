import * as THREE from "three";

/*
 * The dive: native scroll is the conductor, one value `s` is the story.
 *
 *   0  the hero rig (orbit, zoom, stations all still work)
 *   1  looking down at the lake in front of the room: the interlude headline floats on the water
 *   2  under the surface, in the lobby; the camera stays here for the BOOM, which happens under water
 *
 * Exact scroll gives the chapter; the camera eases between authored poses. The same scroll position
 * always gives the same pose, forwards, backwards and after a jump.
 */

export type DiveAnchors = {
  /** Page scroll (px) where the camera starts tilting down, and where it is over the water. */
  diveStart: number;
  diveEnd: number;
  /** Where it leaves the headline and where it reaches the lobby. */
  descendStart: number;
  descendEnd: number;
  /** The lobby's tail: where the blast starts and where it has played out and the water has cleared. */
  blastStart: number;
  blastEnd: number;
};

const smooth = (t: number) => t * t * (3 - 2 * t);
const span = (y: number, a: number, b: number) => (b <= a ? (y >= b ? 1 : 0) : Math.min(1, Math.max(0, (y - a) / (b - a))));

/** Scroll position → story value `s` in [0, 2]. */
export function diveStage(y: number, a: DiveAnchors): number {
  if (y < a.diveEnd) return smooth(span(y, a.diveStart, a.diveEnd));
  if (y < a.descendStart) return 1;
  return 1 + smooth(span(y, a.descendStart, a.descendEnd));
}

/** Scroll position → blast progress in [0, 1], linear (the caller eases it). */
export const blastProgress = (y: number, a: DiveAnchors) => span(y, a.blastStart, a.blastEnd);

/** How far the water has cleared to the page, over the last third of the blast. */
export const clearAmount = (b: number) => smooth(Math.min(1, Math.max(0, (b - 0.65) / 0.35)));

export type Pose = { position: THREE.Vector3; target: THREE.Vector3 };

const bezier = (a: THREE.Vector3, c: THREE.Vector3, b: THREE.Vector3, t: number, out: THREE.Vector3) => {
  const u = 1 - t;
  return out.set(
    u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    u * u * a.y + 2 * u * t * c.y + t * t * b.y,
    u * u * a.z + 2 * u * t * c.z + t * t * b.z,
  );
};
const control = new THREE.Vector3();

/**
 * The camera at `s`. Through the surface (1→2) the path bends so the lens crosses the water
 * near-vertically, never skimming along it.
 */
export function divePose(s: number, rig: Pose, water: Pose, lobby: Pose, level: number, out: Pose): Pose {
  if (s <= 0) {
    out.position.copy(rig.position);
    out.target.copy(rig.target);
  } else if (s <= 1) {
    out.position.lerpVectors(rig.position, water.position, s);
    out.target.lerpVectors(rig.target, water.target, s);
  } else {
    const t = Math.min(1, s - 1);
    control.set(water.target.x, level, (water.target.z + lobby.position.z) / 2);
    bezier(water.position, control, lobby.position, t, out.position);
    out.target.lerpVectors(water.target, lobby.target, t);
  }
  return out;
}

/** 0 above the surface, 1 once the lens is fully under it (a short blend across the waterline). */
export const underwaterAmount = (cameraY: number, level: number) => Math.min(1, Math.max(0, (level + 0.15 - cameraY) / 0.5));
