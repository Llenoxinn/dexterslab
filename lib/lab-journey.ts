import * as THREE from "three";

/**
 * The lab's scroll journey. The page has one fixed 3D layer behind every section, and the same
 * meshes are re-arranged as you scroll:
 *
 *   room → burst → swirl → trail → scatter → orbit → frame
 *
 * - room:    the assembled diorama (with the load-in, pieces fly into place)
 * - burst:   it shatters in place
 * - swirl:   the debris circles the interlude line in two counter-turning rings, always moving
 * - trail:   the props queue up in one tidy column down the right edge (About)
 * - scatter: two tidy columns, one on each edge (Experience, Projects, GitHub)
 * - orbit:   the same two columns hold through Research and Achievements
 * - frame:   the props line up in a tidy border around the Contact section
 *
 * Every formation is a world-space position, rotation and scale per mesh. Each frame the page
 * scroll picks two neighbouring formations and a blend between them.
 */

export const STAGES = ["room", "burst", "swirl", "trail", "scatter", "orbit", "frame"] as const;
export type Stage = (typeof STAGES)[number];

/** Load-in length: the room is set out left to right, and the last prop lands just before this. */
export const ASSEMBLE_SECONDS = 3.8;
/** How strongly the 3D layer shows behind each part of the page (the copy has to stay readable). */
export const STAGE_OPACITY: Record<Stage, number> = { room: 1, burst: 1, swirl: 1, trail: 0.85, scatter: 0.85, orbit: 0.85, frame: 0.9 };

type Piece = {
  /** A single mesh, or a whole object (chair, computer, plant…) flagged with `userData.unit`. */
  obj: THREE.Object3D;
  unit: boolean;
  shell: boolean;
  /** Bounding radius in world units, at home. */
  size: number;
  homePos: THREE.Vector3;
  homeQuat: THREE.Quaternion;
  homeScale: THREE.Vector3;
  /** Burst offset in world space. */
  dir: THREE.Vector3;
  spin: THREE.Vector3;
  phase: number;
  /** Load-in: seconds before the piece is set down. */
  delay: number;
  /** 0..1, decides which formations the piece takes part in (most of them are sparse). */
  pick: number;
  /** Index into the Contact frame's slots, or -1 when the piece sits that formation out. */
  slot: number;
  /** Place in the interlude rings, or -1. */
  ring: number;
};

type ShellMat = { mesh: THREE.Mesh; mat: THREE.Material };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

export function createJourney(root: THREE.Object3D, opts: { center: THREE.Vector3; toCamera: THREE.Vector3 }) {
  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  const pieces: Piece[] = [];
  const shellMats: ShellMat[] = [];
  root.updateMatrixWorld(true);
  const tmp = new THREE.Vector3();
  const sc = new THREE.Vector3();

  const box = new THREE.Box3();
  const sphere = new THREE.Sphere();
  // Recognizable objects stay whole; everything else comes apart mesh by mesh.
  const visit = (o: THREE.Object3D) => {
    if (o.userData.unit) return register(o, true);
    if (o instanceof THREE.Mesh) return register(o, false);
    for (const child of o.children) visit(child);
  };
  const register = (o: THREE.Object3D, unit: boolean) => {
    let size: number;
    if (o instanceof THREE.Mesh) {
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      o.getWorldScale(sc);
      size = (o.geometry.boundingSphere?.radius ?? 0) * Math.max(sc.x, sc.y, sc.z);
    } else {
      size = box.setFromObject(o).getBoundingSphere(sphere).radius;
    }
    const shell = !unit && size > 3;
    o.getWorldPosition(tmp);

    let dir: THREE.Vector3;
    let spin: THREE.Vector3;
    if (shell) {
      dir = new THREE.Vector3((tmp.x - opts.center.x) * 0.25, -2.5 - rand() * 1.5, -1.5 - rand());
      spin = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(0.35);
      const mesh = o as THREE.Mesh;
      const mat = (mesh.material as THREE.Material).clone();
      mesh.material = mat;
      shellMats.push({ mesh, mat });
    } else {
      dir = tmp.clone().sub(opts.center);
      dir.y = Math.abs(dir.y) + 2 + rand() * 4;
      dir.x += (rand() - 0.5) * 6;
      dir.z += (rand() - 0.5) * 6;
      dir.normalize();
      // Never fly into the lens.
      const facing = dir.dot(opts.toCamera);
      if (facing > 0) dir.addScaledVector(opts.toCamera, -facing * 1.4).normalize();
      dir.multiplyScalar(4 + rand() * 10);
      spin = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(4);
    }

    pieces.push({
      obj: o,
      unit,
      shell,
      size,
      homePos: o.position.clone(),
      homeQuat: o.quaternion.clone(),
      homeScale: o.scale.clone(),
      dir,
      spin,
      phase: rand() * Math.PI * 2,
      // Build order on load: the room is laid out in a sweep from left to right. Everything that
      // stands on the same patch of floor arrives together, lower parts first, so a desk is set
      // down and then its things are placed on it.
      delay: shell
        ? 0
        : 0.55 +
          clamp((Math.round(tmp.x / 1.6) * 1.6 + 7.3) / 20.3, 0, 1) * 2.1 +
          (Math.abs(Math.round(tmp.z / 1.6)) % 3) * 0.12 +
          clamp(tmp.y / 5, 0, 1) * 0.4,
      pick: rand(),
      slot: -1,
      ring: -1,
    });
  };
  visit(root);

  // Contact frame: a border of slots around the screen edges. The chunkiest props take them.
  const slots: Array<[number, number]> = [];
  for (const nx of [-0.9, -0.76, -0.62, 0.62, 0.76, 0.9]) {
    for (let r = 0; r < 8; r++) slots.push([nx, -0.84 + r * 0.24]);
  }
  for (let c = 0; c < 7; c++) {
    slots.push([-0.45 + c * 0.15, 0.86]);
    slots.push([-0.45 + c * 0.15, -0.86]);
  }
  const candidates = pieces
    .filter((p) => !p.shell && p.size > 0.12 && p.size < (p.unit ? 2.8 : 1.8))
    // Whole objects get first pick of the places, then the chunkiest loose parts.
    .sort((a, b) => Number(b.unit) - Number(a.unit) || b.size - a.size)
    .slice(0, slots.length);
  // Shuffle so neighbouring slots don't all hold the same kind of thing.
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  candidates.forEach((p, i) => { p.slot = i; });

  // Interlude rings: evenly spaced places for the mid-sized pieces, alternating between two rings.
  const RING_COUNT = 72;
  const ringPieces = pieces
    .filter((p) => !p.shell && p.size > 0.1 && p.size < (p.unit ? 2.8 : 1.6))
    .sort((a, b) => Number(b.unit) - Number(a.unit) || a.phase - b.phase)
    .slice(0, RING_COUNT)
    // Spread the whole objects around the rings instead of bunching them at the start.
    .sort((a, b) => a.phase - b.phase);
  ringPieces.forEach((p, i) => { p.ring = i; });

  // ---------- Scratch objects (no allocation per frame) ----------
  const ray = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  const roomPos = new THREE.Vector3();
  const roomQuat = new THREE.Quaternion();
  const roomScale = new THREE.Vector3();
  const aPos = new THREE.Vector3();
  const bPos = new THREE.Vector3();
  const aQuat = new THREE.Quaternion();
  const bQuat = new THREE.Quaternion();
  const aScale = new THREE.Vector3();
  const bScale = new THREE.Vector3();
  const euler = new THREE.Euler();
  const world = new THREE.Matrix4();
  const parentInv = new THREE.Matrix4();
  const parentCache = new Map<THREE.Object3D, THREE.Matrix4>();

  /** A point `dist` units from the camera, through normalized screen coords (-1..1). */
  const screenPoint = (camera: THREE.PerspectiveCamera, nx: number, ny: number, dist: number, out: THREE.Vector3) => {
    ray.set(nx, ny, 0.5).unproject(camera).sub(camPos).normalize();
    return out.copy(camPos).addScaledVector(ray, dist);
  };

  type Ctx = {
    camera: THREE.PerspectiveCamera;
    time: number;
    scroll: number;
    orbitCenter: THREE.Vector3;
    /** Where the page content ends, in normalized screen x (0..1). The columns live outside it. */
    contentEdge: number;
    /** Pointer in normalized screen coords, or null when it is away. */
    pointer: { x: number; y: number } | null;
  };
  /** 0..1: how close a screen point is to the pointer. Pieces near it swell, like a dock. */
  const near = (c: Ctx, nx: number, ny: number) => {
    if (!c.pointer) return 0;
    const d = Math.hypot((nx - c.pointer.x) * c.camera.aspect, ny - c.pointer.y);
    const f = Math.max(0, 1 - d / 0.42);
    return f * f * (3 - 2 * f);
  };
  const orbitCenter = new THREE.Vector3();

  /** Writes stage `s` for piece `p` into (pos, quat, scale). */
  const formation = (s: Stage, p: Piece, c: Ctx, pos: THREE.Vector3, quat: THREE.Quaternion, scale: THREE.Vector3) => {
    const t = c.time;
    switch (s) {
      case "room":
        pos.copy(roomPos);
        quat.copy(roomQuat);
        scale.copy(roomScale);
        return;
      case "burst":
        pos.copy(roomPos).add(p.dir);
        euler.set(p.spin.x, p.spin.y, p.spin.z);
        quat.setFromEuler(euler).premultiply(roomQuat);
        scale.copy(roomScale);
        return;
      case "swirl": {
        if (p.ring < 0) {
          pos.copy(roomPos).add(p.dir);
          quat.copy(roomQuat);
          scale.setScalar(0);
          return;
        }
        // Two ellipses around the headline, turning in opposite directions. Time drives them,
        // so the formation keeps moving while the page is still.
        const outer = p.ring % 2 === 0;
        // The rings turn on their own and also with the scroll, so they never sit still.
        const turn = t * 0.2 + c.scroll * 0.0011;
        const a = (Math.floor(p.ring / 2) / (ringPieces.length / 2)) * Math.PI * 2 + (outer ? turn : -turn * 1.3);
        // Both rings clear the headline: they pass above and below it, and beside it at the ends.
        const rx = outer ? 0.93 : 0.8;
        const ry = (outer ? 0.86 : 0.7) + Math.sin(t * 0.6 + p.phase) * 0.012;
        const sx = Math.cos(a) * rx;
        const sy = Math.sin(a) * ry + 0.02;
        const hover = near(c, sx, sy);
        screenPoint(c.camera, sx, sy, outer ? 32 : 28, pos);
        // Whole objects turn slowly and stay readable; loose parts tumble.
        if (p.unit) euler.set(0.3, p.phase + t * 0.4, Math.sin(t * 0.5 + p.phase) * 0.15);
        else euler.set(p.phase + t * 0.35, p.phase * 2 + t * 0.28, a);
        quat.setFromEuler(euler);
        scale.copy(roomScale).multiplyScalar(clamp((p.unit ? 1.0 : 0.5) / Math.max(0.05, p.size), 0.3, 2.4) * (1 + hover * 0.6));
        return;
      }
      case "trail":
      case "scatter":
      case "orbit": {
        // Organized, out of the way: the chosen props queue up in evenly spaced columns at the page
        // edges and move along them as you scroll. One column behind About, both edges after that.
        const both = s !== "trail";
        // Twelve props per column, so they sit apart instead of overlapping.
        const perColumn = 12;
        if (p.slot < 0 || p.slot >= (both ? perColumn * 2 : perColumn)) {
          pos.copy(roomPos).add(p.dir);
          quat.copy(roomQuat);
          scale.setScalar(0);
          return;
        }
        const right = both ? p.slot % 2 === 0 : true;
        // The queue creeps along by itself and runs faster with the scroll.
        const u = ((both ? Math.floor(p.slot / 2) : p.slot) / perColumn + c.scroll * 0.00016 + t * 0.012) % 1;
        // The column runs down the middle of the gutter beside the content, never behind the copy.
        // Narrow gutters push it to the very edge and shrink the pieces to fit.
        const column = clamp((1 + c.contentEdge) / 2, 0.8, 0.975);
        const fit = clamp((1 - c.contentEdge) / 0.2, 0.4, 1);
        const nx = (right ? column : -column) + Math.sin(u * Math.PI * 4 + p.phase + t * 0.8) * 0.006 * fit;
        const ny = 1.12 - u * 2.24;
        const hover = near(c, nx, ny);
        screenPoint(c.camera, nx, ny, 30, pos);
        euler.set(0.35, p.phase + c.scroll * 0.0012 + t * 0.35 + hover * 1.4, 0.08);
        quat.setFromEuler(euler);
        scale.copy(roomScale).multiplyScalar(clamp((p.unit ? 0.85 : 0.5) / Math.max(0.05, p.size), 0.3, 2.6) * fit * (1 + hover * 0.7));
        return;
      }
      case "frame": {
        if (p.slot < 0) {
          pos.copy(c.orbitCenter);
          quat.copy(roomQuat);
          scale.setScalar(0);
          return;
        }
        const [nx, ny] = slots[p.slot];
        screenPoint(c.camera, nx + Math.sin(t * 0.5 + p.phase) * 0.004, ny + Math.cos(t * 0.4 + p.phase) * 0.006, 26, pos);
        euler.set(0.35, p.phase + Math.sin(t * 0.3 + p.phase) * 0.15, 0.08);
        quat.setFromEuler(euler);
        // Normalize sizes so the border reads as an even row of objects.
        const target = p.unit ? 0.95 : 0.6;
        scale.copy(roomScale).multiplyScalar(clamp(target / Math.max(0.05, p.size), 0.35, 3));
        return;
      }
    }
    // Shell pieces outside the room and orbit: fall away (they are faded out anyway).
    pos.copy(roomPos).add(p.dir);
    quat.copy(roomQuat);
    scale.copy(roomScale);
  };

  const shellOpacity: Record<Stage, number> = { room: 1, burst: 0, swirl: 0, trail: 0, scatter: 0, orbit: 0, frame: 0 };
  let active = false;

  return {
    pieces,
    /** Put every piece back at its home transform; the lab's own tick animates from there. */
    reset() {
      for (const p of pieces) {
        p.obj.position.copy(p.homePos);
        p.obj.quaternion.copy(p.homeQuat);
        p.obj.scale.copy(p.homeScale);
        p.obj.visible = true;
      }
    },
    /**
     * @param from/to/mix  the two formations to blend and how far between them (0..1)
     * @param built        seconds since the load-in started (Infinity when it's done or skipped)
     * @returns the shell opacity, so the caller can show the sun shaft only with the room
     */
    apply(input: Omit<Ctx, "orbitCenter"> & { from: Stage; to: Stage; mix: number; built: number }) {
      const c = { ...input, orbitCenter };
      const assembling = c.built < ASSEMBLE_SECONDS;
      const still = c.from === "room" && c.mix <= 0.0001 && !assembling;
      if (still) {
        if (active) {
          active = false;
          for (const s of shellMats) setShell(s, 1);
        }
        return 1;
      }
      active = true;
      c.camera.getWorldPosition(camPos);
      screenPoint(c.camera, 0, 0.02, 30, orbitCenter);
      root.updateMatrixWorld(true);
      parentCache.clear();
      const m = smooth(clamp(c.mix, 0, 1));

      for (const p of pieces) {
        p.obj.matrixWorld.decompose(roomPos, roomQuat, roomScale);
        formation(c.from, p, c, aPos, aQuat, aScale);
        formation(c.to, p, c, bPos, bQuat, bScale);
        // Pieces don't all move at once: each leaves in turn (in queue order where there is one),
        // so the burst peels off into the columns one piece after another.
        let mp = m;
        if (!p.shell) {
          const order = p.slot >= 0 ? p.slot / slots.length : p.phase / (Math.PI * 2);
          mp = smooth(clamp(clamp(c.mix, 0, 1) * 1.6 - order * 0.6, 0, 1));
        }
        aPos.lerp(bPos, mp);
        // A slight swing outward mid-flight turns the straight line into an arc.
        if (mp > 0 && mp < 1 && !p.shell) aPos.addScaledVector(ray.copy(aPos).sub(camPos).normalize(), -Math.sin(mp * Math.PI) * 3);
        aQuat.slerp(bQuat, mp);
        aScale.lerp(bScale, mp);

        if (assembling && !p.shell) {
          // Load-in: each piece appears a little above its spot and is set down, no tumbling.
          const t = clamp((c.built - p.delay) / 0.6, 0, 1);
          const drop = Math.pow(1 - t, 3);
          aPos.y += drop * 2.2;
          // A small overshoot as it lands, like something being pressed into place.
          const pop = t <= 0 ? 0 : t < 0.7 ? (t / 0.7) * 1.06 : 1.06 - ((t - 0.7) / 0.3) * 0.06;
          aScale.multiplyScalar(pop);
        }

        // World target → the mesh's local space under its (static) parent.
        const parent = p.obj.parent!;
        let inv = parentCache.get(parent);
        if (!inv) {
          inv = parentInv.copy(parent.matrixWorld).invert().clone();
          parentCache.set(parent, inv);
        }
        world.compose(aPos, aQuat, aScale).premultiply(inv);
        world.decompose(p.obj.position, p.obj.quaternion, p.obj.scale);
        p.obj.visible = aScale.x > 0.004;
      }

      let opacity = shellOpacity[c.from] + (shellOpacity[c.to] - shellOpacity[c.from]) * m;
      if (assembling) opacity = Math.min(opacity, clamp(c.built / 0.5, 0, 1));
      for (const s of shellMats) setShell(s, opacity);
      return opacity;
    },
  };
}

function setShell({ mesh, mat }: ShellMat, opacity: number) {
  const fading = opacity < 0.999;
  if (mat.transparent !== fading) {
    mat.transparent = fading;
    mat.needsUpdate = true;
  }
  mat.opacity = opacity;
  mat.depthWrite = !fading;
  mesh.visible = mesh.visible && opacity > 0.01;
}
