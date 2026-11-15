import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/*
 * The lobby under the lake: the room you pass through before the lab. A clay hall with a curved back
 * wall ribbed in steel, and one plinth for each group of the toolkit (the prerequisites), each with a
 * clay or steel emblem on top; the page beside it names the groups in the same order. Built from the
 * lab's own materials (the clay ramp, DOS blue, brushed steel) so it reads as the same world one level
 * down, with marine snow drifting through the light.
 */

export type LobbyMaterials = {
  /** The clay ramp, light to dark, and the DOS-blue accent. */
  clay: THREE.Material[];
  accent: THREE.Material;
  steel: THREE.Material;
};

/** One emblem per toolkit group: simple clay forms, distinct in silhouette. */
function emblem(index: number, m: LobbyMaterials): THREE.Object3D {
  const g = new THREE.Group();
  switch (index % 5) {
    case 0: // Languages: a knot, many forms of one thread
      g.add(new THREE.Mesh(new THREE.TorusKnotGeometry(0.32, 0.1, 96, 12), m.accent));
      break;
    case 1: { // Web: a faceted globe
      g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), m.clay[0]));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.025, 8, 48), m.steel);
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
    case 3: { // Tools: a steel spanner ring and handle
      const head = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.07, 10, 32, Math.PI * 1.6), m.steel);
      head.rotation.z = Math.PI * 0.2;
      head.position.y = 0.2;
      const handle = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.7, 0.07, 2, 0.03), m.steel);
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

export function createLobby(options: {
  center: THREE.Vector3;
  groups: readonly string[];
  materials: LobbyMaterials;
}) {
  const { center, groups, materials: m } = options;
  const lobby = new THREE.Group();
  lobby.name = "lobby";
  lobby.position.copy(center);
  const spinners: THREE.Object3D[] = [];

  // Floor: a round clay slab with a darker inset ring.
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(10, 10.3, 0.5, 64), m.clay[2]);
  floor.position.y = -0.25;
  const inset = new THREE.Mesh(new THREE.TorusGeometry(6.2, 0.06, 8, 96), m.clay[3]);
  inset.rotation.x = Math.PI / 2;
  inset.position.y = 0.01;
  lobby.add(floor, inset);

  // Back wall: a half cylinder, open toward the camera, ribbed in brushed steel.
  // Its own copy of the clay step: the shared one must stay single-sided for the lab.
  const wallMaterial = m.clay[1].clone();
  wallMaterial.side = THREE.DoubleSide;
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(9.6, 9.6, 6, 64, 1, true, Math.PI / 2, Math.PI), wallMaterial);
  wall.position.y = 3;
  lobby.add(wall);
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI / 2 + (i / 10) * Math.PI;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.16, 6.2, 0.16), m.steel);
    rib.position.set(Math.sin(a) * 9.45, 3.1, Math.cos(a) * 9.45);
    lobby.add(rib);
  }
  const lintel = new THREE.Mesh(new THREE.TorusGeometry(9.45, 0.12, 8, 64, Math.PI), m.steel);
  lintel.rotation.set(Math.PI / 2, 0, Math.PI);
  lintel.position.y = 6.1;
  lobby.add(lintel);

  // The toolkit: one plinth per group on an arc facing the open side.
  const count = groups.length;
  groups.forEach((name, i) => {
    const a = (i / Math.max(1, count - 1) - 0.5) * 1.9;
    const plinth = new THREE.Group();
    plinth.position.set(Math.sin(a) * 5.6, 0, -Math.cos(a) * 5.6 + 1.2);
    plinth.rotation.y = -a;
    const body = new THREE.Mesh(new RoundedBoxGeometry(1.5, 1.7, 1.5, 3, 0.08), m.clay[0]);
    body.position.y = 0.85;
    const cap = new THREE.Mesh(new RoundedBoxGeometry(1.7, 0.14, 1.7, 2, 0.05), m.clay[3]);
    cap.position.y = 1.77;
    plinth.name = name;
    const mark = emblem(i, m);
    mark.position.y = 2.45;
    spinners.push(mark);
    plinth.add(body, cap, mark);
    lobby.add(plinth);
  });

  // Marine snow: motes drifting slowly through the beams, so the water reads as a volume.
  const SNOW = 420;
  const snowPositions = new Float32Array(SNOW * 3);
  let seed = 5;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
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

  return {
    group: lobby,
    /** Emblems turn slowly, each at its own rate. */
    tick(time: number) {
      snow.rotation.y = time * 0.012;
      snow.position.y = Math.sin(time * 0.15) * 0.25;
      spinners.forEach((s, i) => {
        s.rotation.y = time * (0.25 + i * 0.04) + i;
        s.position.y = 2.45 + Math.sin(time * 0.8 + i) * 0.06;
      });
    },
    dispose() {
      wallMaterial.dispose();
      snowGeometry.dispose();
      snowMaterial.dispose();
      lobby.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
        }
      });
    },
  };
}
