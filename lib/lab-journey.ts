import * as THREE from "three";
import { CONTACT_WORD_POINTS, pingConversion, type ContactChoreography } from "./contact-choreography";
import { createPingGeometry } from "./ping-geometry";

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
export const ASSEMBLE_SECONDS = 4.6;
/** How strongly the 3D layer shows behind each part of the page (the copy has to stay readable). */
export const STAGE_OPACITY: Record<Stage, number> = { room: 1, burst: 1, swirl: 1, trail: 0.85, scatter: 0.85, orbit: 0.85, frame: 0.9 };

type Piece = {
  /** A single mesh, or a whole object (chair, computer, plant…) flagged with `userData.unit`. */
  obj: THREE.Object3D;
  unit: boolean;
  shell: boolean;
  /** Bounding radius in world units, at home. */
  size: number;
  center: THREE.Vector3;
  homePos: THREE.Vector3;
  homeQuat: THREE.Quaternion;
  homeScale: THREE.Vector3;
  /** Burst offset in world space. */
  dir: THREE.Vector3;
  spin: THREE.Vector3;
  phase: number;
  /** Load-in: seconds before the piece is set down. */
  delay: number;
  buildRole: "floor" | "wall" | "prop";
  baseOffset: number;
  /** 0..1, decides which formations the piece takes part in (most of them are sparse). */
  pick: number;
  /** Index into the Contact frame's slots, or -1 when the piece sits that formation out. */
  slot: number;
  /** Index into the Contact "HELLO" word points, or -1. */
  wordSlot: number;
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
    box.setFromObject(o);
    const baseOffset = tmp.y - box.min.y;
    const buildRole = o.userData.buildRole === "floor" ? "floor" : o.userData.buildRole === "wall" || shell ? "wall" : "prop";

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
      center: o.worldToLocal(box.setFromObject(o).getCenter(new THREE.Vector3())),
      homePos: o.position.clone(),
      homeQuat: o.quaternion.clone(),
      homeScale: o.scale.clone(),
      dir,
      spin,
      phase: rand() * Math.PI * 2,
      buildRole,
      baseOffset,
      // Foundation first, then walls from their bottom edge, then furniture and its contents.
      delay: buildRole === "floor" ? 0 : buildRole === "wall"
        ? .45 + clamp((tmp.x + 7.3) / 20.3, 0, 1) * .3
        : 1.3 + clamp(tmp.y / 5, 0, 1) * 1.25 + clamp((tmp.x + 7.3) / 20.3, 0, 1) * .65 + rand() * .18,
      pick: rand(),
      slot: -1,
      wordSlot: -1,
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
    // After the burst, only whole, recognizable bio/tech/lab objects travel through the page—no loose sticks or trim.
    .filter((p) => p.unit && !p.shell && p.size > 0.12 && p.size < 2.8)
    .sort((a, b) => b.size - a.size)
    .slice(0, slots.length);
  // Shuffle so neighbouring slots don't all hold the same kind of thing.
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  candidates.forEach((p, i) => { p.slot = i; });
  const wordCandidates = pieces
    .filter((p) => !p.shell && p.size > 0.08 && p.size < (p.unit ? 2.8 : 1.8))
    .sort((a, b) => Number(b.unit) - Number(a.unit) || b.size - a.size)
    .slice(0, Math.max(slots.length, CONTACT_WORD_POINTS.length));
  wordCandidates.forEach((p, i) => { p.wordSlot = i; });
  const pingRoot = new THREE.Group();
  pingRoot.name = "contact-ping-words";
  const pingGeometry = createPingGeometry();
  const pingWords = candidates.map(() => {
    const material = new THREE.MeshStandardMaterial({ color: 0x2323d2, roughness: .36, metalness: .12, transparent: true, opacity: 0, depthWrite: false });
    const mesh = new THREE.Mesh(pingGeometry, material);
    mesh.visible = false;
    pingRoot.add(mesh);
    return mesh;
  });
  // Kept outside the travelling lab, so replacements don't become journey pieces themselves.
  root.parent?.add(pingRoot);

  // Interlude rings: evenly spaced places for whole bio/tech props, alternating between two rings.
  const RING_COUNT = 72;
  const ringPieces = pieces
    .filter((p) => p.unit && !p.shell && p.size > 0.1 && p.size < 2.8)
    .sort((a, b) => a.phase - b.phase)
    .slice(0, RING_COUNT);
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
  const parentCache = new Map<THREE.Object3D, { inverse: THREE.Matrix4; frame: number }>();
  let frameNumber = 0;
  const contactPos = new THREE.Vector3();
  const contactScale = new THREE.Vector3();
  const contactQuat = new THREE.Quaternion();
  const contactRotation = new THREE.Quaternion();
  const centerOffset = new THREE.Vector3();

  /** A point `dist` units from the camera, through normalized screen coords (-1..1). */
  const screenPoint = (camera: THREE.PerspectiveCamera, nx: number, ny: number, dist: number, out: THREE.Vector3) => {
    ray.set(nx, ny, 0.5).unproject(camera).sub(camPos).normalize();
    return out.copy(camPos).addScaledVector(ray, dist);
  };

  type Ctx = {
    camera: THREE.PerspectiveCamera;
    time: number;
    scroll: number;
    interlude?: number;
    orbitCenter: THREE.Vector3;
    /** Where the page content ends, in normalized screen x (0..1). The columns live outside it. */
    contentEdge: number;
    /** Pointer in normalized screen coords, or null when it is away. */
    pointer: { x: number; y: number } | null;
    contact?: ContactChoreography;
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
        const beat = c.interlude ?? 0;
        const release = smooth(clamp((beat - .48) / .22, 0, 1));
        const gather = smooth(clamp((beat - .73) / .2, 0, 1));
        const expansion = 1 + release * .45 - gather * .34;
        const turn = t * 0.14 + c.scroll * 0.00065 + release * .8;
        const a = (Math.floor(p.ring / 2) / (ringPieces.length / 2)) * Math.PI * 2 + (outer ? turn : -turn * 1.3);
        // Both rings clear the headline: they pass above and below it, and beside it at the ends.
        const rx = (outer ? 1.02 : .89) * expansion;
        const ry = ((outer ? .97 : .82) + Math.sin(t * .6 + p.phase) * .012) * expansion;
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
        // Evenly distribute whole props per column without overlapping.
        const perColumn = Math.min(12, Math.max(1, Math.floor(candidates.length / (both ? 2 : 1))));
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
        // A shallow helix gives the journey depth without crossing the reading column.
        const depth = Math.sin(u * Math.PI * 2 + t * 0.16);
        let nx = (right ? column : -column) + Math.sin(u * Math.PI * 4 + p.phase + t * 0.8) * 0.012 * fit;
        const ny = 1.12 - u * 2.24;
        const hover = near(c, nx, ny);
        nx += (right ? 1 : -1) * hover * 0.025 * fit;
        screenPoint(c.camera, nx, ny, 30 + depth * 1.5, pos);
        euler.set(0.35, p.phase + c.scroll * 0.0012 + t * 0.35 + hover * 1.4, 0.08);
        quat.setFromEuler(euler);
        scale.copy(roomScale).multiplyScalar(clamp((p.unit ? 0.85 : 0.5) / Math.max(0.05, p.size), 0.3, 2.6) * fit * (1 + hover * 0.7));
        return;
      }
      case "frame": {
        const contact = c.contact;
        const formingWord = Boolean(contact && contact.message > 0.0001);
        if (p.slot < 0 && !(formingWord && p.wordSlot >= 0)) {
          pos.copy(c.orbitCenter);
          quat.copy(roomQuat);
          scale.setScalar(0);
          return;
        }
        const [nx, ny] = p.slot >= 0
          ? slots[Math.floor((p.slot / Math.max(1, candidates.length)) * slots.length)]
          : [0, 0];
        const hover = near(c, nx, ny);
        const portrait = c.camera.aspect < 0.85;
        if (p.slot >= 0) {
          // On phones the border hugs the edges, leaving room for the form.
          const frameX = portrait && Math.abs(nx) > 0.6 ? Math.sign(nx) * (0.9 + (p.slot % 3) * 0.04) : nx;
          screenPoint(c.camera, frameX + Math.sin(t * 0.5 + p.phase) * 0.008, ny + Math.cos(t * 0.4 + p.phase) * 0.01, 26 - hover * 1.5, pos);
          euler.set(0.35 + hover * 0.2, p.phase + Math.sin(t * 0.3 + p.phase) * 0.15 + hover * 0.45, 0.08);
          quat.setFromEuler(euler);
          // Normalize sizes so the border reads as an even row of objects.
          const target = (p.unit ? 0.95 : 0.6) * (portrait ? 0.38 : 1) * (1 + hover * 0.18);
          scale.copy(roomScale).multiplyScalar(clamp(target / Math.max(0.05, p.size), 0.08, 3));
          pos.sub(centerOffset.copy(p.center).multiply(scale).applyQuaternion(quat));
        } else {
          pos.copy(c.orbitCenter);
          quat.copy(roomQuat);
          scale.setScalar(0);
        }

        if (!contact || contact.message + contact.links < 0.0001) return;
        if (contact.message > 0.0001 && p.wordSlot >= 0) {
          const point = CONTACT_WORD_POINTS[p.wordSlot];
          // Spare props become a short underline, so every object has a destination.
          const spareCount = Math.max(1, wordCandidates.length - CONTACT_WORD_POINTS.length);
          const x = point?.x ?? ((p.wordSlot - CONTACT_WORD_POINTS.length + 0.5) / spareCount - 0.5) * 14;
          const y = point?.y ?? -3.5;
          screenPoint(c.camera, contact.wordX + x * contact.cellX, contact.wordY + y * contact.cellY, 26, contactPos);
          // Face the camera with a little depth. The lettering stays readable while typing.
          euler.set(0.14 * Math.sin(p.phase), 0.22 * Math.cos(p.phase), 0.07 * Math.sin(p.phase));
          contactQuat.copy(c.camera.quaternion).multiply(contactRotation.setFromEuler(euler));
          contactScale.copy(roomScale).multiplyScalar(contact.cellSize * (point ? 0.58 : 0.28) / Math.max(0.05, p.size));
          contactPos.sub(centerOffset.copy(p.center).multiply(contactScale).applyQuaternion(contactQuat));
          pos.lerp(contactPos, contact.message);
          quat.slerp(contactQuat, contact.message);
          scale.lerp(contactScale, contact.message);
        }
        if (contact.links > 0.0001) {
          // Four groups of satellites: a focused social channel pulls its group forward.
          const channel = p.slot % 4;
          const selected = contact.energy * (1 - Math.min(1, Math.abs(channel - contact.social)));
          const ring = p.slot % 2;
          const speed = .3 + (Math.sin(p.phase * 7) + 1) * .16;
          const disturbance = Math.sin(t * 1.1 + p.phase) * .18 + Math.sin(t * .47 + p.phase * 3) * .22;
          const a = p.phase + (p.slot / candidates.length) * Math.PI * 6 + t * (ring ? -speed : speed) + disturbance;
          // Uneven spiral bands live beyond a protected ellipse around the text and cards.
          const wobble = (1 + Math.sin(t * .7 + p.phase)) * .075 + (1 + Math.cos(t * 1.3 + p.phase * 3)) * .025;
          const rx = contact.orbitRadiusX + ring * 0.065 + wobble;
          const ry = contact.orbitRadiusY + ring * 0.04 + wobble;
          const sx = contact.orbitX + Math.cos(a) * rx;
          const sy = contact.orbitY + Math.sin(a) * ry;
          const proximity = near(c, sx, sy);
          screenPoint(c.camera, sx, sy, 28 - selected * 4 - proximity * 2, contactPos);
          euler.set(p.phase + t * 0.45, p.phase + t * 0.6 + selected * 0.9, Math.cos(a) * 0.5);
          contactQuat.setFromEuler(euler);
          const size = (p.unit ? 0.64 : 0.38) * (portrait ? 0.42 : 1) * (1 + selected * 0.65 + proximity * 0.3);
          contactScale.copy(roomScale).multiplyScalar(size / Math.max(0.05, p.size));
          contactPos.sub(centerOffset.copy(p.center).multiply(contactScale).applyQuaternion(contactQuat));
          // Weighted blend keeps rapid message ↔ links toggles continuous.
          const weight = contact.links;
          pos.lerp(contactPos, weight);
          quat.slerp(contactQuat, weight);
          scale.lerp(contactScale, weight);
        }
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
      pingWords.forEach((word) => { word.visible = false; });
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
      frameNumber++;
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

        if (assembling) {
          const t = clamp((c.built - p.delay) / (p.buildRole === "prop" ? .95 : 1.25), 0, 1);
          const rise = 1 - Math.pow(1 - t, 4);
          if (p.buildRole === "floor") {
            aPos.y -= (1 - rise) * .45;
            aScale.x *= .92 + rise * .08;
            aScale.z *= .92 + rise * .08;
          } else if (p.buildRole === "wall") {
            // Preserve the bottom edge in world space as each wall grows upward.
            aPos.y -= p.baseOffset * (1 - rise);
            aScale.y *= Math.max(.001, rise);
          } else {
            aPos.y -= (1 - rise) * Math.min(1.8, Math.max(.4, p.baseOffset + .4));
            aScale.multiplyScalar(.94 + rise * .06);
          }
          if (t <= 0) aScale.setScalar(0);
        }

        // World target → the mesh's local space under its (static) parent.
        if (p.slot >= 0 && c.contact) {
          const stageWeight = c.from === "frame" ? 1 : c.to === "frame" ? m : 0;
          const individual = pingConversion(c.contact.linksElapsed ?? 0, p.slot, candidates.length);
          const amount = individual * c.contact.links * stageWeight;
          const word = pingWords[p.slot];
          word.visible = amount > .001;
          if (word.visible) {
            // Each word inherits its prop's moving centre; it never travels toward a common word.
            word.position.copy(aPos).add(centerOffset.copy(p.center).multiply(aScale).applyQuaternion(aQuat));
            word.quaternion.copy(c.camera.quaternion);
            word.rotateY(Math.sin(c.time * .65 + p.phase) * .55);
            word.rotateX(Math.cos(c.time * .4 + p.phase) * .18);
            word.rotateZ(Math.sin(c.time * .5 + p.phase) * .3);
            word.scale.setScalar((c.camera.aspect < .85 ? .28 : .7) * (.85 + amount * .15));
            word.material.opacity = amount;
            aScale.multiplyScalar(1 - amount);
          }
        }
        const parent = p.obj.parent!;
        let cached = parentCache.get(parent);
        if (!cached) {
          cached = { inverse: new THREE.Matrix4(), frame: -1 };
          parentCache.set(parent, cached);
        }
        if (cached.frame !== frameNumber) {
          cached.inverse.copy(parent.matrixWorld).invert();
          cached.frame = frameNumber;
        }
        world.compose(aPos, aQuat, aScale).premultiply(cached.inverse);
        world.decompose(p.obj.position, p.obj.quaternion, p.obj.scale);
        p.obj.visible = aScale.x > 0.004;
      }

      let opacity = shellOpacity[c.from] + (shellOpacity[c.to] - shellOpacity[c.from]) * m;
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
