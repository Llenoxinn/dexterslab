import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/*
 * Computer hardware for the lab: a build bench in the front of the cutaway with an open PC tower
 * (motherboard, tower cooler, GPU, RAM), a keyboard, loose RAM sticks, an M.2 drive, a CPU and a
 * Raspberry Pi, plus a Wi-Fi router on the lounge table.
 *
 * Metal has one job in the lab: frames, legs and hardware. Materials are tagged, not final: the clay
 * pass repaints plain ones on the clay ramp, keeps `accent` in DOS blue, and the canvas swaps
 * `userData.metal` for real steel ("steel"), polished steel ("polished") or gold contacts ("gold").
 * Every item is one `unit`, so it travels whole through the scroll journey.
 */

const tagged = (metal: "steel" | "polished" | "gold") => {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff });
  m.userData.metal = metal;
  return m;
};

export function addHardware(root: THREE.Group) {
  const hardware = new THREE.Group();
  hardware.name = "cs-hardware";
  root.add(hardware);

  const clay = new THREE.MeshStandardMaterial({ color: 0xf2f2f6 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x4a4b58 }); // chips, fans: the ramp's dark step
  const accent = new THREE.MeshStandardMaterial({ color: 0x2323d2 });
  accent.userData.accent = true; // circuit boards read as the lab's DOS blue
  const steel = tagged("steel");
  const polished = tagged("polished");
  const gold = tagged("gold");

  const geos = new Map<string, THREE.BufferGeometry>();
  const box = (w: number, h: number, d: number, r = 0.012) => {
    const key = `${w}:${h}:${d}:${r}`;
    let g = geos.get(key);
    if (!g) geos.set(key, (g = new RoundedBoxGeometry(w, h, d, 2, Math.min(r, Math.min(w, h, d) * 0.45))));
    return g;
  };
  const disc = (r: number, h: number) => {
    const key = `d:${r}:${h}`;
    let g = geos.get(key);
    if (!g) geos.set(key, (g = new THREE.CylinderGeometry(r, r, h, 28)));
    return g;
  };
  const put = (parent: THREE.Object3D, g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, shadow = true) => {
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const unit = (parent: THREE.Object3D, x: number, y: number, z: number, rotY = 0) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rotY;
    g.userData.unit = true;
    parent.add(g);
    return g;
  };

  /** A DDR stick: blue board, a row of dark chips, a gold contact edge along the bottom. */
  const ramStick = (parent: THREE.Object3D, x: number, y: number, z: number, upright: boolean) => {
    const s = new THREE.Group();
    s.position.set(x, y, z);
    if (!upright) s.rotation.x = -Math.PI / 2;
    put(s, box(0.42, 0.13, 0.012, 0.004), accent, 0, 0, 0, false);
    for (let i = 0; i < 4; i++) put(s, box(0.07, 0.06, 0.012, 0.003), dark, -0.15 + i * 0.1, 0.015, 0.011, false);
    put(s, box(0.4, 0.022, 0.014, 0.002), gold, 0, -0.065, 0, false);
    parent.add(s);
    return s;
  };

  // ---------- The build bench, front of the cutaway ----------
  const bench = unit(hardware, -1.8, 0, 7.6, 0.08);
  put(bench, box(2.8, 0.08, 1.0, 0.02), clay, 0, 0.86, 0);
  for (const [x, z] of [[-1.3, -0.42], [1.3, -0.42], [-1.3, 0.42], [1.3, 0.42]]) put(bench, box(0.06, 0.82, 0.06), steel, x, 0.41, z);
  put(bench, box(2.6, 0.04, 0.04), steel, 0, 0.22, -0.42);
  put(bench, box(2.6, 0.04, 0.04), steel, 0, 0.22, 0.42);
  put(bench, box(2.5, 0.03, 0.85, 0.01), clay, 0, 0.24, 0); // lower shelf

  // Open PC tower: a white case with the side off, the steel tray and the build visible inside.
  const tower = unit(hardware, -2.65, 0.9, 7.5, 0.35);
  const W = 0.46, H = 0.98, D = 0.9;
  put(tower, box(0.03, H, D), steel, -W / 2, H / 2, 0); // back panel (motherboard tray)
  put(tower, box(W, 0.03, D), clay, 0, 0.015, 0); // floor
  put(tower, box(W, 0.03, D), clay, 0, H - 0.015, 0); // roof
  put(tower, box(W, H, 0.03), clay, 0, H / 2, D / 2 - 0.015); // front
  put(tower, box(W, H, 0.03), clay, 0, H / 2, -D / 2 + 0.015); // rear
  put(tower, box(0.012, 0.74, 0.62, 0.004), accent, -W / 2 + 0.03, 0.55, 0.02, false); // motherboard
  // Tower cooler: a stack of polished fins with a fan strapped on.
  const cooler = new THREE.Group();
  cooler.position.set(-W / 2 + 0.14, 0.68, 0.06);
  for (let i = 0; i < 9; i++) put(cooler, box(0.18, 0.012, 0.16, 0.003), polished, 0, -0.1 + i * 0.026, 0, false);
  const fan = put(cooler, disc(0.085, 0.025), dark, 0.1, 0.005, 0, false);
  fan.rotation.z = Math.PI / 2;
  tower.add(cooler);
  for (const dz of [0.24, 0.27]) ramStick(tower, -W / 2 + 0.08, 0.7, dz, true).rotation.y = Math.PI / 2;
  // GPU: a long shroud with twin fans and a steel backplate, sitting in the lower slot.
  const gpu = new THREE.Group();
  gpu.position.set(-W / 2 + 0.16, 0.36, -0.02);
  put(gpu, box(0.13, 0.11, 0.66, 0.02), clay, 0, 0, 0);
  put(gpu, box(0.012, 0.11, 0.66, 0.004), steel, -0.07, 0, 0, false);
  for (const z of [-0.16, 0.16]) {
    const f = put(gpu, disc(0.085, 0.02), dark, 0.07, 0, z, false);
    f.rotation.z = Math.PI / 2;
  }
  tower.add(gpu);

  // Keyboard: a steel plate with four rows of clay keys and a DOS-blue Enter.
  const keyboard = unit(hardware, -1.55, 0.9, 7.5, 0.06);
  put(keyboard, box(0.98, 0.035, 0.34, 0.01), steel, 0, 0.018, 0);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 13; col++) {
      const enter = row === 1 && col === 12;
      put(keyboard, box(0.062, 0.03, 0.062, 0.012), enter ? accent : clay, -0.42 + col * 0.07, 0.05, -0.11 + row * 0.072, false);
    }
  }
  put(keyboard, box(0.42, 0.03, 0.062, 0.012), clay, 0, 0.05, 0.178, false); // space bar

  // Laid out on the bench: two RAM sticks, an M.2 drive, a CPU and a Raspberry Pi.
  const parts = unit(hardware, -0.55, 0.9, 7.55, -0.1);
  ramStick(parts, -0.05, 0.012, -0.2, false);
  ramStick(parts, -0.05, 0.012, -0.05, false).rotation.z = 0.12;
  const m2 = new THREE.Group();
  m2.position.set(0.5, 0.008, -0.2);
  m2.rotation.y = 0.4;
  put(m2, box(0.3, 0.008, 0.07, 0.002), accent, 0, 0, 0, false);
  put(m2, box(0.09, 0.012, 0.05, 0.003), dark, -0.04, 0.008, 0, false);
  put(m2, box(0.025, 0.01, 0.06, 0.002), gold, -0.14, 0.002, 0, false);
  parts.add(m2);
  const cpu = new THREE.Group();
  cpu.position.set(0.45, 0.01, 0.12);
  put(cpu, box(0.16, 0.014, 0.16, 0.004), accent, 0, 0, 0, false);
  put(cpu, box(0.12, 0.016, 0.12, 0.006), polished, 0, 0.014, 0, false); // the heat spreader
  parts.add(cpu);
  const pi = new THREE.Group();
  pi.position.set(0.1, 0.012, 0.18);
  pi.rotation.y = -0.3;
  put(pi, box(0.26, 0.014, 0.17, 0.006), accent, 0, 0, 0, false);
  put(pi, box(0.07, 0.03, 0.06, 0.004), steel, 0.08, 0.02, -0.03, false); // USB block
  put(pi, box(0.06, 0.03, 0.05, 0.004), steel, 0.08, 0.02, 0.045, false); // Ethernet jack
  put(pi, box(0.05, 0.012, 0.05, 0.003), dark, -0.04, 0.012, 0.0, false); // SoC
  parts.add(pi);

  // ---------- Wi-Fi router on the lounge's low table ----------
  const router = unit(hardware, 6.9, 0.47, 6.35, -0.4);
  put(router, box(0.42, 0.06, 0.28, 0.02), dark, 0, 0.03, 0);
  for (const x of [-0.17, 0, 0.17]) {
    const antenna = put(router, box(0.025, 0.26, 0.025, 0.012), steel, x, 0.19, -0.12, false);
    antenna.rotation.x = -0.18;
  }
  for (let i = 0; i < 4; i++) put(router, box(0.018, 0.006, 0.006, 0.002), accent, -0.09 + i * 0.06, 0.063, 0.14, false); // status lights

  return hardware;
}
