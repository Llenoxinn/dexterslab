import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { rustedSteelMaterial, wetClayMaterial } from "./lab-materials";

/*
 * The lobby under the lake: the room you pass through before the lab. A clay hall with a curved back
 * wall ribbed in steel, and one plinth for each group of the toolkit (the prerequisites), each with a
 * clay or steel emblem on top; the page beside it names the groups in the same order. It has been
 * under water a long time: the clay is soaked dark and glossy with silt settled on it, the steel has
 * rusted. It is built from pieces (wall panels, rib lengths, plinth blocks) so the BOOM can blow it
 * apart under water, scrubbed by scroll: `tick(time, b)` with b = 0 whole, 1 blown out and sinking.
 */

export type LobbyMaterials = {
  /** The clay ramp, light to dark, and the DOS-blue accent: their colours seed the wet clay. */
  clay: THREE.Material[];
  accent: THREE.Material;
  /** The environment the wet surfaces reflect. */
  env: THREE.Texture;
};

/**
 * Where a piece has been thrown at blast progress `b`: out along `dir` against the water's drag (most
 * of the travel happens early), then settling by `sink` as it loses its push. Zero for b ≤ 0.
 */
export function blastOffset(b: number, dir: THREE.Vector3, sink: number, out: THREE.Vector3): THREE.Vector3 {
  if (b <= 0) return out.set(0, 0, 0);
  out.copy(dir).multiplyScalar(1 - Math.exp(-4 * b));
  out.y -= sink * b * b;
  return out;
}

type Kit = { clay: THREE.MeshPhysicalMaterial[]; accent: THREE.MeshPhysicalMaterial; rust: THREE.MeshPhysicalMaterial; green: THREE.MeshPhysicalMaterial };

/** One emblem per toolkit group: simple forms, distinct in silhouette. */
function emblem(index: number, m: Kit): THREE.Object3D {
  const g = new THREE.Group();
  switch (index % 5) {
    case 0: // Languages: a knot, many forms of one thread
      g.add(new THREE.Mesh(new THREE.TorusKnotGeometry(0.32, 0.1, 96, 12), m.accent));
      break;
    case 1: { // Web: a faceted globe
      g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), m.clay[0]));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.025, 8, 48), m.green);
      ring.rotation.x = Math.PI / 2.4;
      g.add(ring);
      break;
    }
    case 2: // Back end: a stack of server blocks
      for (let i = 0; i < 3; i++) {
        const block = new THREE.Mesh(new RoundedBoxGeometry(0.8, 0.2, 0.55, 2, 0.04), i === 1 ? m.accent : m.clay[1]);
        block.position.y = -0.24 + i * 0.25;
        g.add(block);
      }
      break;
    case 3: { // Tools: a spanner ring and handle
      const head = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.07, 10, 32, Math.PI * 1.6), m.green);
      head.rotation.z = Math.PI * 0.2;
      head.position.y = 0.2;
      const handle = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.7, 0.07, 2, 0.03), m.green);
      handle.position.y = -0.22;
      g.add(head, handle);
      break;
    }
    default: { // Design: a pen nib
      const nib = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.8, 4), m.clay[0]);
      nib.rotation.y = Math.PI / 4;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 24), m.accent);
      band.position.y = -0.22;
      g.add(nib, band);
    }
  }
  return g;
}

type Piece = {
  obj: THREE.Object3D;
  homePos: THREE.Vector3;
  homeQuat: THREE.Quaternion;
  dir: THREE.Vector3;
  spin: THREE.Vector3;
  sink: number;
  /** Emblems keep turning on their own; index into the spin rates, or -1. */
  emblem: number;
};

const colourOf = (m: THREE.Material) => ((m as THREE.MeshStandardMaterial).color ?? new THREE.Color(0xcccccc));

export function createLobby(options: {
  center: THREE.Vector3;
  groups: readonly string[];
  materials: LobbyMaterials;
}) {
  const { center, groups, materials } = options;
  const lobby = new THREE.Group();
  lobby.name = "lobby";
  lobby.position.copy(center);

  const kit: Kit = {
    clay: materials.clay.map((c) => wetClayMaterial(materials.env, colourOf(c))),
    accent: wetClayMaterial(materials.env, colourOf(materials.accent)),
    rust: rustedSteelMaterial(materials.env),
    green: rustedSteelMaterial(materials.env, { verdigris: true }),
  };
  const wallMaterial = wetClayMaterial(materials.env, colourOf(materials.clay[1]));
  wallMaterial.side = THREE.DoubleSide;

  // The floor stays put: the blast throws everything that stands on it.
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(10, 10.3, 0.5, 64), kit.clay[2]);
  floor.position.y = -0.25;
  const inset = new THREE.Mesh(new THREE.TorusGeometry(6.2, 0.06, 8, 96), kit.clay[3]);
  inset.rotation.x = Math.PI / 2;
  inset.position.y = 0.01;
  lobby.add(floor, inset);

  // Everything breakable is collected in `loose`, then flattened into the lobby's own space.
  const loose: Array<{ obj: THREE.Object3D; emblem: number }> = [];

  // Back wall: a half cylinder, open toward the camera, laid as 10 × 3 curved panels with hairline joints.
  const COLS = 10;
  const ROWS = 3;
  const joint = 0.004;
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      const start = Math.PI / 2 + (c / COLS) * Math.PI + joint;
      const panel = new THREE.Mesh(new THREE.CylinderGeometry(9.6, 9.6, 2 - 0.02, 6, 1, true, start, Math.PI / COLS - joint * 2), wallMaterial);
      panel.position.y = 1 + r * 2;
      lobby.add(panel);
      loose.push({ obj: panel, emblem: -1 });
    }
  }
  // Ribs, each three rusted lengths, and the lintel in four arcs.
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI / 2 + (i / 10) * Math.PI;
    for (let k = 0; k < 3; k++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.05, 0.16), kit.rust);
      rib.position.set(Math.sin(a) * 9.45, 1.05 + k * 2.07, Math.cos(a) * 9.45);
      lobby.add(rib);
      loose.push({ obj: rib, emblem: -1 });
    }
  }
  for (let k = 0; k < 4; k++) {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(9.45, 0.12, 8, 16, Math.PI / 4), kit.rust);
    arc.rotation.set(Math.PI / 2, 0, Math.PI + (k * Math.PI) / 4);
    arc.position.y = 6.1;
    lobby.add(arc);
    loose.push({ obj: arc, emblem: -1 });
  }

  // The toolkit: one plinth per group on an arc facing the open side, each a 2 × 2 × 2 stack of blocks.
  const count = groups.length;
  const block = new RoundedBoxGeometry(0.74, 0.84, 0.74, 2, 0.05);
  groups.forEach((name, i) => {
    const a = (i / Math.max(1, count - 1) - 0.5) * 1.9;
    const plinth = new THREE.Group();
    plinth.name = name;
    plinth.position.set(Math.sin(a) * 5.6, 0, -Math.cos(a) * 5.6 + 1.2);
    plinth.rotation.y = -a;
    lobby.add(plinth);
    for (let x = 0; x < 2; x++) for (let y = 0; y < 2; y++) for (let z = 0; z < 2; z++) {
      const b = new THREE.Mesh(block, kit.clay[0]);
      b.position.set(x * 0.76 - 0.38, 0.43 + y * 0.86, z * 0.76 - 0.38);
      plinth.add(b);
      loose.push({ obj: b, emblem: -1 });
    }
    const cap = new THREE.Mesh(new RoundedBoxGeometry(1.7, 0.14, 1.7, 2, 0.05), kit.clay[3]);
    cap.position.y = 1.79;
    const mark = emblem(i, kit);
    mark.position.y = 2.45;
    plinth.add(cap, mark);
    loose.push({ obj: cap, emblem: -1 }, { obj: mark, emblem: i });
  });

  // Flatten every piece into the lobby's space and give it a seeded throw from the heart of the arc.
  lobby.updateMatrixWorld(true);
  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const blastPoint = new THREE.Vector3(0, 1.2, -2.6);
  const pieces: Piece[] = loose.map(({ obj, emblem: e }) => {
    lobby.attach(obj);
    const away = obj.position.clone().sub(blastPoint);
    const reach = 1.5 + rand() * 3.5 + 8 / (1 + away.length());
    const dir = away.normalize().multiplyScalar(reach);
    dir.y += 0.5 + rand() * 2;
    if (dir.z > 0) dir.z *= 0.2; // toward the lens: keep it from swallowing the frame
    return {
      obj,
      homePos: obj.position.clone(),
      homeQuat: obj.quaternion.clone(),
      dir,
      spin: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(5),
      sink: 1 + rand() * 2.5,
      emblem: e,
    };
  });

  // Marine snow: motes drifting slowly through the beams, so the water reads as a volume.
  const SNOW = 420;
  const snowPositions = new Float32Array(SNOW * 3);
  for (let i = 0; i < SNOW; i++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * 11;
    snowPositions.set([Math.sin(a) * r, rand() * 9, Math.cos(a) * r + 2], i * 3);
  }
  const snowGeometry = new THREE.BufferGeometry();
  snowGeometry.setAttribute("position", new THREE.BufferAttribute(snowPositions, 3));
  const snowMaterial = new THREE.PointsMaterial({ color: 0xc9cfef, size: 0.05, transparent: true, opacity: 0.55, depthWrite: false });
  const snow = new THREE.Points(snowGeometry, snowMaterial);
  snow.frustumCulled = false;
  lobby.add(snow);

  lobby.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = false; // the lobby lives under the lake; the sun's shadow map never reaches it
      o.receiveShadow = false;
    }
  });
  lobby.visible = false;

  const offset = new THREE.Vector3();
  const euler = new THREE.Euler();
  const tumble = new THREE.Quaternion();
  const turn = new THREE.Quaternion();
  const UP = new THREE.Vector3(0, 1, 0);

  return {
    group: lobby,
    /** Number of breakable pieces. */
    pieceCount: pieces.length,
    /** Where piece `i` is (world space) at blast progress `b`: the blast seeds bubbles along these paths. */
    debrisAt(i: number, b: number, out: THREE.Vector3) {
      const p = pieces[i % pieces.length];
      return out.copy(p.homePos).add(blastOffset(b, p.dir, p.sink, offset)).add(lobby.position);
    },
    /** Emblems turn slowly, each at its own rate; `b` throws every piece (0 = whole). */
    tick(time: number, b = 0) {
      snow.rotation.y = time * 0.012;
      snow.position.y = Math.sin(time * 0.15) * 0.25;
      const thrown = Math.max(0, b);
      const roll = 1 - Math.exp(-3 * thrown) + thrown * 0.3;
      for (const p of pieces) {
        p.obj.position.copy(p.homePos).add(blastOffset(thrown, p.dir, p.sink, offset));
        p.obj.quaternion.copy(p.homeQuat);
        if (p.emblem >= 0) {
          turn.setFromAxisAngle(UP, time * (0.25 + p.emblem * 0.04) + p.emblem);
          p.obj.quaternion.multiply(turn);
          if (thrown === 0) p.obj.position.y += Math.sin(time * 0.8 + p.emblem) * 0.06;
        }
        if (thrown > 0) {
          tumble.setFromEuler(euler.set(p.spin.x * roll, p.spin.y * roll, p.spin.z * roll));
          p.obj.quaternion.premultiply(tumble);
        }
      }
    },
    dispose() {
      snowGeometry.dispose();
      snowMaterial.dispose();
      block.dispose();
      wallMaterial.dispose();
      for (const m of [...kit.clay, kit.accent, kit.rust, kit.green]) m.dispose();
      lobby.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
    },
  };
}
