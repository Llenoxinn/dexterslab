import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/**
 * Furniture and clutter that make the clay diorama feel lived-in: a central worktable, blocky
 * accent chairs, a bookshelf, a reading corner, plants, a robot arm and a rug.
 *
 * Colours here don't matter much: the clay pass repaints everything white, except materials
 * flagged with `userData.accent`, which turn DOS blue.
 */
export function addLabProps(root: THREE.Group) {
  const props = new THREE.Group();
  props.name = "lab-props";
  root.add(props);

  const clay = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const accent = new THREE.MeshStandardMaterial({ color: 0x2323d2 });
  accent.userData.accent = true;
  const glass = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false });

  const geos = new Map<string, THREE.BufferGeometry>();
  const cached = (key: string, make: () => THREE.BufferGeometry) => {
    let g = geos.get(key);
    if (!g) geos.set(key, (g = make()));
    return g;
  };
  const box = (w: number, h: number, d: number) =>
    cached(`b:${w}:${h}:${d}`, () => new RoundedBoxGeometry(w, h, d, 2, Math.min(0.04, Math.min(w, h, d) * 0.25)));
  const cyl = (rt: number, rb: number, h: number, seg = 24) => cached(`c:${rt}:${rb}:${h}:${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg));

  const put = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = !mat.transparent;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const group = (parent: THREE.Object3D, x: number, y: number, z: number, rotY = 0) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rotY;
    parent.add(g);
    return g;
  };

  // Seeded, so the clutter is the same on every visit.
  let seed = 23;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  // ---------- Rug and floor seams ----------
  put(props, box(5.6, 0.03, 3.4), clay, 0.6, 0.015, 3.6);

  // ---------- Central worktable ----------
  const table = group(props, 0.6, 0, 3.6, 0.04);
  put(table, box(3.6, 0.1, 1.5), clay, 0, 1.0, 0);
  for (const [x, z] of [[-1.65, -0.6], [1.65, -0.6], [-1.65, 0.6], [1.65, 0.6]]) put(table, box(0.09, 0.95, 0.09), clay, x, 0.475, z);
  put(table, box(3.3, 0.05, 0.05), clay, 0, 0.3, -0.6);
  put(table, box(3.3, 0.05, 0.05), clay, 0, 0.3, 0.6);

  // Microscope.
  const scope = group(table, -1.1, 1.05, -0.1, 0.5);
  scope.userData.unit = true; // travels as one intact object in the scroll journey
  put(scope, box(0.42, 0.06, 0.5), clay, 0, 0.03, 0);
  const arm = put(scope, box(0.1, 0.62, 0.12), clay, 0, 0.36, -0.16);
  arm.rotation.x = 0.18;
  put(scope, box(0.3, 0.03, 0.3), clay, 0, 0.3, 0.04);
  const eyepiece = put(scope, cyl(0.055, 0.065, 0.42), accent, 0, 0.66, 0.0);
  eyepiece.rotation.x = -0.45;
  put(scope, cyl(0.03, 0.03, 0.14), clay, 0, 0.42, 0.06);

  // Laptop.
  const laptop = group(table, 0.15, 1.05, 0.05, -0.25);
  laptop.userData.unit = true; // travels as one intact object in the scroll journey
  put(laptop, box(0.72, 0.03, 0.5), clay, 0, 0.015, 0);
  const lid = put(laptop, box(0.72, 0.48, 0.025), clay, 0, 0.24, -0.25);
  lid.rotation.x = -0.28;
  lid.position.z = -0.29;

  // Beakers, flasks and a pipette stand.
  for (let i = 0; i < 5; i++) {
    const r = 0.06 + rand() * 0.05;
    const h = 0.16 + rand() * 0.18;
    put(table, cyl(r, r, h), glass, 0.9 + i * 0.17, 1.05 + h / 2, -0.35 + rand() * 0.25);
  }
  const flask = new THREE.LatheGeometry(
    [[0.01, 0], [0.18, 0], [0.19, 0.04], [0.06, 0.28], [0.05, 0.42], [0.07, 0.44]].map(([x, y]) => new THREE.Vector2(x, y)),
    24,
  );
  put(table, flask, glass, 1.45, 1.05, 0.25);
  put(table, cyl(0.12, 0.12, 0.012), accent, 1.45, 1.06, 0.25);

  // Notebook stack and a mug.
  for (let i = 0; i < 4; i++) {
    const book = put(table, box(0.42, 0.045, 0.3), i === 2 ? accent : clay, -0.45, 1.075 + i * 0.048, 0.35);
    book.rotation.y = (rand() - 0.5) * 0.35;
  }
  put(table, cyl(0.06, 0.055, 0.13), clay, -0.1, 1.115, 0.45);

  // Petri dishes.
  for (let i = 0; i < 3; i++) put(table, cyl(0.12, 0.12, 0.025), glass, 0.6 + i * 0.27, 1.065, 0.45);

  // ---------- Blocky accent chairs (our version of the reference's bright chairs) ----------
  const chair = (x: number, z: number, rotY: number) => {
    const c = group(props, x, 0, z, rotY);
    c.userData.unit = true; // travels as one intact object in the scroll journey
    put(c, box(0.62, 0.09, 0.6), accent, 0, 0.5, 0);
    put(c, box(0.62, 0.68, 0.09), accent, 0, 0.88, -0.26);
    // A cantilever frame instead of four legs: two closed side loops.
    for (const sx of [-0.28, 0.28]) {
      put(c, box(0.07, 0.07, 0.64), accent, sx, 0.035, 0);
      put(c, box(0.07, 0.5, 0.07), accent, sx, 0.26, 0.28);
      put(c, box(0.07, 0.5, 0.07), accent, sx, 0.26, -0.28);
    }
    return c;
  };
  chair(-0.3, 4.75, Math.PI + 0.25);
  chair(1.7, 4.8, Math.PI - 0.2);
  chair(2.95, 3.4, -Math.PI / 2 + 0.15);

  // ---------- Bookshelf on the left wall ----------
  const shelf = group(props, -6.72, 0, 4.7, Math.PI / 2);
  shelf.userData.unit = true; // travels as one intact object in the scroll journey
  put(shelf, box(2.6, 3.2, 0.06), clay, 0, 1.6, -0.24);
  for (const x of [-1.27, 1.27]) put(shelf, box(0.06, 3.2, 0.5), clay, x, 1.6, 0);
  for (let row = 0; row < 5; row++) {
    const y = 0.05 + row * 0.78;
    put(shelf, box(2.6, 0.05, 0.5), clay, 0, y, 0);
    if (row === 4) break;
    let x = -1.18;
    while (x < 1.1) {
      const w = 0.05 + rand() * 0.07;
      const h = 0.42 + rand() * 0.24;
      if (rand() < 0.12) {
        x += 0.18; // a gap, so the row doesn't read as a solid block
        continue;
      }
      const b = put(shelf, box(w, h, 0.32), rand() < 0.12 ? accent : clay, x + w / 2, y + 0.03 + h / 2, 0.02);
      if (rand() < 0.15) b.rotation.z = 0.18;
      x += w + 0.012;
    }
  }

  // ---------- Reading corner: lounge chair and a floor lamp ----------
  const lounge = group(props, -4.9, 0, 5.6, 0.55);
  lounge.userData.unit = true; // travels as one intact object in the scroll journey
  put(lounge, box(1.15, 0.36, 1.0), clay, 0, 0.3, 0);
  put(lounge, box(1.15, 0.9, 0.24), clay, 0, 0.75, -0.42);
  for (const sx of [-0.52, 0.52]) put(lounge, box(0.18, 0.62, 1.0), clay, sx, 0.4, 0);
  put(lounge, box(0.9, 0.12, 0.72), clay, 0, 0.53, 0.08);

  const lamp = group(props, -6.0, 0, 6.3, 0.9);
  lamp.userData.unit = true; // travels as one intact object in the scroll journey
  put(lamp, cyl(0.24, 0.26, 0.04), clay, 0, 0.02, 0);
  put(lamp, cyl(0.02, 0.02, 2.2), clay, 0, 1.1, 0);
  const lampArm = put(lamp, cyl(0.018, 0.018, 0.9), clay, 0, 2.3, 0.3);
  lampArm.rotation.x = 1.0;
  const shade = put(lamp, cyl(0.1, 0.26, 0.3, 24), accent, 0, 2.38, 0.72);
  shade.rotation.x = 0.5;

  // ---------- Plants (a monstera and a snake plant) ----------
  const leaf = cached("leaf", () => {
    const g = new THREE.SphereGeometry(0.28, 14, 8);
    g.scale(1, 0.08, 0.62);
    return g;
  });
  const plant = (x: number, z: number, scale: number) => {
    const p = group(props, x, 0, z);
    p.userData.unit = true; // travels as one intact object in the scroll journey
    p.scale.setScalar(scale);
    put(p, cyl(0.28, 0.22, 0.55), clay, 0, 0.275, 0);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + rand() * 0.4;
      const stemH = 0.7 + rand() * 0.7;
      const stem = new THREE.Group();
      stem.position.set(0, 0.5, 0);
      stem.rotation.set(0, a, 0.35 + rand() * 0.35);
      p.add(stem);
      put(stem, cyl(0.012, 0.016, stemH, 6), clay, 0, stemH / 2, 0);
      const l = put(stem, leaf, clay, 0.12, stemH, 0);
      l.rotation.set(0.2, 0, -0.5 - rand() * 0.4);
    }
    return p;
  };
  plant(12.2, 8.3, 1.3);
  plant(7.4, -3.3, 1.0);
  plant(-6.2, 2.9, 0.95);
  const snake = group(props, 3.3, 0, -3.5);
  snake.userData.unit = true; // travels as one intact object in the scroll journey
  put(snake, cyl(0.2, 0.17, 0.42), clay, 0, 0.21, 0);
  for (let i = 0; i < 7; i++) {
    const blade = put(snake, cached("blade", () => { const g = new THREE.SphereGeometry(0.06, 8, 10); g.scale(1, 9, 0.3); return g; }), clay, (rand() - 0.5) * 0.18, 0.75, (rand() - 0.5) * 0.18);
    blade.rotation.set((rand() - 0.5) * 0.3, rand() * Math.PI, (rand() - 0.5) * 0.3);
  }

  // ---------- Robot arm on a plinth, front right ----------
  const robot = group(props, 11.2, 0, 6.4, -0.9);
  robot.userData.unit = true; // travels as one intact object in the scroll journey
  put(robot, box(1.0, 0.7, 1.0), clay, 0, 0.35, 0);
  put(robot, cyl(0.32, 0.36, 0.2), clay, 0, 0.8, 0);
  const shoulder = group(robot, 0, 0.92, 0, 0.4);
  put(shoulder, new THREE.SphereGeometry(0.17, 20, 14), accent, 0, 0, 0);
  const upper = group(shoulder, 0, 0, 0);
  upper.rotation.z = -0.45;
  put(upper, box(0.18, 1.2, 0.2), clay, 0, 0.6, 0);
  const elbow = group(upper, 0, 1.2, 0);
  put(elbow, new THREE.SphereGeometry(0.14, 20, 14), accent, 0, 0, 0);
  elbow.rotation.z = 1.5;
  put(elbow, box(0.15, 0.95, 0.16), clay, 0, 0.47, 0);
  const wrist = group(elbow, 0, 0.95, 0);
  wrist.rotation.z = 0.6;
  put(wrist, cyl(0.08, 0.08, 0.14), accent, 0, 0.05, 0);
  for (const sx of [-0.07, 0.07]) put(wrist, box(0.035, 0.22, 0.09), clay, sx, 0.22, 0);

  // ---------- Wall clock and pin board on the back wall ----------
  const clock = put(props, cyl(0.42, 0.42, 0.06, 40), clay, -5.6, 5.3, -3.95);
  clock.rotation.x = Math.PI / 2;
  const hand = put(props, box(0.04, 0.3, 0.02), accent, -5.6, 5.4, -3.9);
  hand.rotation.z = 0.9;
  put(props, box(1.8, 1.1, 0.05), clay, 5.4, 4.6, -3.96);
  for (let i = 0; i < 6; i++) {
    const note = put(props, box(0.32, 0.32, 0.02), i === 1 ? accent : clay, 4.75 + (i % 3) * 0.6, 4.85 - Math.floor(i / 3) * 0.5, -3.92);
    note.rotation.z = (rand() - 0.5) * 0.2;
  }

  // ---------- East wing: a second workstation, whiteboard wall and a 3D printer ----------
  const desk2 = group(props, 9.9, 0, -3.25);
  put(desk2, box(3.8, 0.1, 1.2), clay, 0, 1.0, 0);
  for (const x of [-1.8, 1.8]) put(desk2, box(0.1, 0.95, 1.1), clay, x, 0.475, 0);
  put(desk2, box(0.9, 0.75, 1.05), clay, 1.2, 0.5, 0);
  for (const [x, ry] of [[-0.6, 0.18], [0.45, -0.18]] as const) {
    const mon = group(desk2, x, 1.05, -0.2, ry);
    mon.userData.unit = true; // travels as one intact object in the scroll journey
    put(mon, box(0.3, 0.03, 0.22), clay, 0, 0.015, 0);
    put(mon, box(0.06, 0.38, 0.05), clay, 0, 0.21, -0.05);
    put(mon, box(1.0, 0.6, 0.05), clay, 0, 0.62, 0);
    put(mon, box(0.92, 0.52, 0.01), accent, 0, 0.62, 0.03);
  }
  put(desk2, box(0.7, 0.03, 0.22), clay, -0.1, 1.065, 0.3);
  chair(9.7, -1.9, 0.2);

  const board = group(props, 9.9, 0, -3.93);
  put(board, box(3.6, 1.7, 0.05), clay, 0, 3.6, 0);
  put(board, box(3.6, 0.06, 0.14), clay, 0, 2.72, 0.05);
  // Scribbles: a flowchart in DOS blue.
  for (const [x, y, w, h] of [[-1.2, 4.0, 0.5, 0.3], [-0.2, 4.0, 0.5, 0.3], [0.8, 4.0, 0.5, 0.3], [-0.2, 3.3, 0.5, 0.3], [-0.7, 4.0, 0.5, 0.025], [0.3, 4.0, 0.5, 0.025], [-0.2, 3.65, 0.025, 0.4]] as const) {
    put(board, box(w, h, 0.012), accent, x, y, 0.03);
  }

  const printer = group(props, 12.3, 0, -1.4, -Math.PI / 2);
  printer.userData.unit = true; // travels as one intact object in the scroll journey
  put(printer, box(1.2, 0.9, 0.8), clay, 0, 0.45, 0);
  put(printer, box(0.9, 0.06, 0.7), clay, 0, 0.93, 0);
  for (const [x, z] of [[-0.42, -0.3], [0.42, -0.3], [-0.42, 0.3], [0.42, 0.3]]) put(printer, box(0.05, 0.9, 0.05), clay, x, 1.4, z);
  put(printer, box(0.92, 0.05, 0.05), clay, 0, 1.85, -0.3);
  put(printer, box(0.92, 0.05, 0.05), clay, 0, 1.85, 0.3);
  put(printer, box(0.12, 0.16, 0.6), accent, 0.1, 1.55, 0);
  put(printer, cyl(0.12, 0.14, 0.3), clay, 0, 1.11, 0.05);

  // Crates of spare parts against the back wall.
  for (const [x, y, z, s] of [[12.3, 0.35, -3.4, 0.7], [11.5, 0.3, -3.5, 0.6], [12.25, 0.98, -3.4, 0.56]] as const) {
    put(props, box(s, s, s), clay, x, y, z).rotation.y = rand() * 0.4;
  }

  // ---------- Front lounge: a low table on a rug, with beanbags ----------
  put(props, box(4.2, 0.03, 2.8), clay, 6.4, 0.015, 6.6);
  put(props, box(1.6, 0.08, 0.9), clay, 6.4, 0.42, 6.6);
  for (const [x, z] of [[5.8, 6.3], [7.0, 6.9]] as const) put(props, box(0.07, 0.4, 0.07), clay, x, 0.2, z);
  const bean = cached("bean", () => { const g = new THREE.SphereGeometry(0.55, 24, 16); g.scale(1, 0.62, 1); return g; });
  for (const [x, z, mat] of [[4.9, 6.9, clay], [7.9, 6.1, accent], [6.6, 7.9, clay]] as const) put(props, bean, mat, x, 0.32, z);
  put(props, cyl(0.06, 0.055, 0.13), clay, 6.1, 0.53, 6.5);
  put(props, box(0.5, 0.05, 0.36), accent, 6.7, 0.485, 6.7).rotation.y = 0.3;

  return { robot: { shoulder, elbow, wrist } };
}
