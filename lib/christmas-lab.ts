import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/** Seasonal props share the lab's renderer, clock, and disposal lifecycle. */
export function createChristmasDecor(root: THREE.Group, core: THREE.Group, terminal: THREE.Group) {
  const decor = new THREE.Group();
  decor.name = "christmas-decor";
  root.add(decor);
  const material = (color: number, glow = false) => new THREE.MeshStandardMaterial({
    color, roughness: glow ? 0.35 : 0.7, metalness: glow ? 0.18 : 0,
    emissive: glow ? color : 0x000000, emissiveIntensity: glow ? 0.65 : 0,
  });
  const pine = material(0x235c4b);
  const tips = material(0x34745b);
  const red = material(0xb33b4c);
  const gold = material(0xe8b96e);
  const cream = material(0xf4ead6);
  const blue = material(0x769fb5);
  const wire = material(0x24433c);
  const bulbs = [material(0xffc985, true), material(0xf48276, true), material(0x8acbbb, true)];
  const sphere = new THREE.SphereGeometry(1, 14, 10);
  const mesh = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const object = new THREE.Mesh(geometry, mat);
    object.position.set(x, y, z);
    parent.add(object);
    return object;
  };
  const ball = (parent: THREE.Object3D, mat: THREE.Material, radius: number, x: number, y: number, z: number) => {
    const object = mesh(parent, sphere, mat, x, y, z);
    object.scale.setScalar(radius);
    return object;
  };
  const box = (parent: THREE.Object3D, mat: THREE.Material, size: [number, number, number], x: number, y: number, z: number) =>
    mesh(parent, new RoundedBoxGeometry(...size, 2, Math.min(...size) * 0.14), mat, x, y, z);
  const cable = (parent: THREE.Object3D, points: THREE.Vector3[], radius = 0.018) =>
    mesh(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), Math.max(24, points.length * 3), radius, 6, false), wire, 0, 0, 0);

  // A real, softly rounded tree grows out of the lab's specimen platform.
  const tree = new THREE.Group();
  tree.name = "christmas-tree";
  tree.position.y = 0.72;
  core.add(tree);
  mesh(tree, new THREE.CylinderGeometry(0.11, 0.14, 0.45, 20), gold, 0, 0.22, 0);
  for (const [radius, height, y] of [[0.88, 1.4, 0.99], [0.69, 1.25, 1.54], [0.49, 1.06, 2.06], [0.3, 0.85, 2.5]]) {
    const tier = mesh(tree, new THREE.ConeGeometry(radius, height, 48), y > 2 ? tips : pine, 0, y, 0);
    tier.castShadow = true;
  }
  const spiral: THREE.Vector3[] = [];
  for (let index = 0; index < 74; index++) {
    const y = 0.43 + index * 0.031;
    const angle = index * 0.32;
    const radius = 0.92 * (1 - y / 3.4);
    spiral.push(new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius));
    if (index % 3 === 0) ball(tree, bulbs[index % bulbs.length], 0.035, Math.cos(angle) * radius, y, Math.sin(angle) * radius);
  }
  cable(tree, spiral, 0.012);
  const ornaments: THREE.Mesh[] = [];
  for (let index = 0; index < 19; index++) {
    const y = 0.6 + (index % 6) * 0.33;
    const angle = index * 2.4;
    const radius = 0.88 * (1 - y / 3.4);
    ornaments.push(ball(tree, index % 2 ? red : gold, 0.065, Math.cos(angle) * radius, y, Math.sin(angle) * radius));
  }
  // Star-lantern shape and paper colours shared by the parol garland.
  const lanternShape = new THREE.Shape();
  for (let point = 0; point < 10; point++) {
    const angle = Math.PI / 2 + point * Math.PI / 5;
    const radius = point % 2 ? 0.055 : 0.13;
    if (point === 0) lanternShape.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    else lanternShape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  lanternShape.closePath();
  const parolColors = [0xf2661c, 0x2fbf68, 0xf5c518, 0xece6da, 0xe8384b, 0x35cbbd].map((color) => new THREE.Color(color));
  const starShape = new THREE.Shape();
  for (let point = 0; point < 10; point++) {
    const angle = Math.PI / 2 + point * Math.PI / 5;
    const radius = point % 2 ? 0.12 : 0.26;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (point === 0) starShape.moveTo(x, y); else starShape.lineTo(x, y);
  }
  starShape.closePath();
  const star = mesh(tree, new THREE.ExtrudeGeometry(starShape, { depth: 0.055, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2, steps: 1 }), bulbs[0], 0, 3.03, 0);
  star.name = "tree-star";

  const gifts: Array<{ parcel: THREE.Group; lid: THREE.Group; opened: boolean; lift: number; surprise: THREE.Mesh }> = [];
  const gift = (parent: THREE.Object3D, x: number, z: number, size: number, mat: THREE.Material) => {
    const parcel = new THREE.Group();
    parcel.name = "wrapped-gift";
    parcel.userData.gift = true;
    parcel.position.set(x, size * 0.44, z);
    parcel.rotation.y = x * 0.4;
    parent.add(parcel);
    const depth = size * 0.8;
    box(parcel, mat, [size, size * 0.85, depth], 0, 0, 0);
    const lid = new THREE.Group();
    lid.position.set(0, size * 0.44, -depth / 2);
    parcel.add(lid);
    box(lid, mat, [size * 1.06, size * 0.11, depth * 1.06], 0, 0, depth / 2);
    box(parcel, cream, [size * 0.15, size * 0.86, depth * 1.01], 0, 0, 0);
    box(parcel, gold, [size * 1.01, size * 0.86, size * 0.13], 0, 0, 0);
    box(lid, cream, [size * 0.15, size * 0.12, depth * 1.08], 0, 0.012, depth / 2);
    box(lid, gold, [size * 1.08, size * 0.12, size * 0.13], 0, 0.014, depth / 2);
    for (const side of [-1, 1]) {
      const path = new THREE.CubicBezierCurve3(
        new THREE.Vector3(0, size * 0.09, depth / 2),
        new THREE.Vector3(side * size * 0.58, size * 0.16, depth / 2 - size * 0.12),
        new THREE.Vector3(side * size * 0.52, size * 0.52, depth / 2 + size * 0.12),
        new THREE.Vector3(0, size * 0.12, depth / 2),
      );
      const ribbonShape = new THREE.Shape();
      const width = size * 0.065;
      ribbonShape.moveTo(-width, -0.004); ribbonShape.lineTo(width, -0.004);
      ribbonShape.lineTo(width, 0.004); ribbonShape.lineTo(-width, 0.004); ribbonShape.closePath();
      mesh(lid, new THREE.ExtrudeGeometry(ribbonShape, { steps: 28, bevelEnabled: false, extrudePath: path }), gold, 0, 0, 0);
    }
    box(lid, gold, [size * 0.18, size * 0.13, size * 0.16], 0, size * 0.12, depth / 2);
    const tag = box(lid, cream, [size * 0.18, 0.015, size * 0.23], size * 0.27, size * 0.075, depth / 2 + size * 0.16);
    tag.rotation.y = 0.38;
    const surprise = mesh(parcel, new THREE.IcosahedronGeometry(size * 0.18, 0), bulbs[0], 0, size * 0.25, 0);
    surprise.name = "gift-surprise";
    surprise.visible = false;
    gifts.push({ parcel, lid, opened: false, lift: 0, surprise });
    return parcel;
  };
  gift(decor, -3.35, 1.48, 0.67, red);
  gift(decor, -1.4, 1.46, 0.52, blue);
  gift(decor, -2.5, 1.95, 0.4, pine);
  gift(decor, 5.9, 2.6, 0.8, red);

  // A capiz window: molave frame, the left half slid open onto a Christmas night, the right half pearly capiz.
  const windowFrame = new THREE.Group();
  windowFrame.name = "laboratory-window";
  windowFrame.position.set(-2.25, 3.05, -3.81);
  decor.add(windowFrame);
  const night = new THREE.MeshBasicMaterial({ color: 0x0e1a3a });
  const molave = material(0x3e2415);
  box(windowFrame, night, [3.15, 2.05, 0.045], 0, 0, -0.055);
  for (const side of [-1, 1]) {
    box(windowFrame, molave, [0.12, 2.25, 0.18], side * 1.64, 0, 0.035);
    box(windowFrame, molave, [3.38, 0.12, 0.18], 0, side * 1.07, 0.035);
  }
  box(windowFrame, molave, [0.07, 2.08, 0.14], 0, 0, 0.04);
  box(windowFrame, molave, [3.55, 0.12, 0.4], 0, -1.14, 0.13);
  const capiz = new THREE.MeshStandardMaterial({
    color: 0xf3ead6, emissive: 0x9fb4ff, emissiveIntensity: 0.28, roughness: 0.35, transparent: true, opacity: 0.82,
  });
  const capizPane = new THREE.PlaneGeometry(0.165, 0.165);
  const capizPanel = new THREE.Group();
  capizPanel.name = "capiz-panel";
  capizPanel.position.set(0.82, 0, 0.09);
  windowFrame.add(capizPanel);
  box(capizPanel, molave, [1.6, 2.04, 0.03], 0, 0, -0.02);
  const panes = new THREE.InstancedMesh(capizPane, capiz, 80);
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 8; col++) panes.setMatrixAt(row * 8 + col, new THREE.Matrix4().makeTranslation(-0.665 + col * 0.19, -0.855 + row * 0.19, 0));
  }
  capizPanel.add(panes);
  ball(windowFrame, bulbs[0], 0.19, -0.92, 0.61, -0.015);
  ball(windowFrame, night, 0.18, -0.84, 0.66, 0.05);
  for (let index = 0; index < 20; index++) {
    const x = Math.sin(index * 9.7) * 1.43;
    const y = 0.14 + ((index * 17) % 13) * 0.062;
    ball(windowFrame, cream, index % 4 === 0 ? 0.013 : 0.008, x, y, -0.015);
  }
  for (let index = 0; index < 7; index++) {
    const x = -1.4 + index * 0.45;
    const height = 0.25 + (index % 3) * 0.14;
    box(windowFrame, blue, [0.34, height, 0.025], x, -0.98 + height / 2, -0.01);
    box(windowFrame, bulbs[0], [0.055, 0.07, 0.012], x - 0.06, -0.9 + height / 2, 0.015);
  }

  // A garland of little star lanterns, like the parol arches strung over Filipino streets at Christmas.
  const garland: THREE.Group[] = [];
  const garlandGeometry = new THREE.ExtrudeGeometry(lanternShape, { depth: 0.04, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.02, bevelSegments: 1 });
  const garlandMaterials = parolColors.map((color) => new THREE.MeshBasicMaterial({ color, toneMapped: false }));
  for (let span = 0; span < 3; span++) {
    const points: THREE.Vector3[] = [];
    for (let index = 0; index <= 16; index++) {
      const fraction = index / 16;
      const x = -6.6 + span * 4.4 + fraction * 4.4;
      const y = 4.9 - Math.sin(fraction * Math.PI) * 0.65;
      points.push(new THREE.Vector3(x, y, -3.72));
      if (index % 2 === 1) {
        const hanger = new THREE.Group();
        hanger.position.set(x, y, -3.68);
        hanger.userData.phase = span * 3 + index;
        decor.add(hanger);
        mesh(hanger, new THREE.CylinderGeometry(0.006, 0.006, 0.16, 4), wire, 0, -0.08, 0);
        const lantern = mesh(hanger, garlandGeometry, garlandMaterials[(index + span * 2) % garlandMaterials.length], 0, -0.29, 0);
        lantern.scale.setScalar(1.15);
        garland.push(hanger);
      }
    }
    cable(decor, points);
  }

  const wreath = new THREE.Group();
  wreath.name = "christmas-wreath";
  wreath.position.set(-2.2, 3.65, -3.81);
  decor.add(wreath);
  mesh(wreath, new THREE.TorusGeometry(0.43, 0.115, 12, 40), pine, 0, 0, 0);
  for (let index = 0; index < 9; index++) {
    const angle = index * Math.PI * 2 / 9;
    ball(wreath, index % 3 ? red : gold, 0.045, Math.cos(angle) * 0.43, Math.sin(angle) * 0.43, 0.12);
  }
  const ribbon = box(wreath, red, [0.28, 0.12, 0.1], 0, -0.39, 0.14); ribbon.rotation.z = 0.2;

  // Parols: luminous star panels, raised bamboo-like frames, and hanging tails.
  const parols: THREE.Group[] = [];
  const chases: Array<{ mesh: THREE.InstancedMesh; colors: THREE.Color[] }> = [];
  const chaseBulb = new THREE.SphereGeometry(0.032, 8, 6);
  for (const [x, y, scale, palette] of [
    [-5.2, 3.95, 0.9, [0xffb020, 0xff3d6e]],
    [0.0, 4.25, 1.1, [0xffe066, 0x3fe0d0]],
    [5.5, 4.35, 0.9, [0xff7a2e, 0x4ade80]],
  ] as const) {
    const lantern = new THREE.Group();
    lantern.name = "parol-lantern";
    lantern.position.set(x, y, -3.64);
    lantern.scale.setScalar(scale);
    decor.add(lantern);
    parols.push(lantern);
    mesh(lantern, new THREE.CylinderGeometry(0.012, 0.012, 4, 6), wire, 0, 2.55, 0);
    const outline: THREE.Vector3[] = [];
    for (let point = 0; point < 10; point++) {
      const angle = Math.PI / 2 + point * Math.PI / 5;
      const radius = point % 2 ? 0.26 : 0.64;
      outline.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.055));
    }
    for (let point = 0; point < 10; point++) {
      const a = outline[point];
      const b = outline[(point + 1) % 10];
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, a.x, a.y, 0, b.x, b.y, 0], 3));
      geometry.computeVertexNormals();
      mesh(lantern, geometry, new THREE.MeshBasicMaterial({ color: palette[point % 2], side: THREE.DoubleSide, toneMapped: false }), 0, 0, 0);
      cable(lantern, [new THREE.Vector3(0, 0, 0.065), a.clone()], 0.016).material = gold;
    }
    cable(lantern, [...outline, outline[0].clone()], 0.022).material = cream;
    mesh(lantern, new THREE.TorusGeometry(0.73, 0.022, 8, 64), gold, 0, 0, -0.01);
    // Capiz-style petals between the star's points and a ring of chasing bulbs around the hoop.
    const petalMaterial = new THREE.MeshBasicMaterial({ color: palette[1], toneMapped: false, transparent: true, opacity: 0.85 });
    for (let point = 0; point < 5; point++) {
      const angle = Math.PI / 2 + Math.PI / 5 + point * (Math.PI * 2) / 5;
      const petal = mesh(lantern, sphere, petalMaterial, Math.cos(angle) * 0.47, Math.sin(angle) * 0.47, 0.03);
      petal.scale.set(0.13, 0.07, 0.02);
      petal.rotation.z = angle;
    }
    const chase = new THREE.InstancedMesh(chaseBulb, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), 24);
    chase.name = "parol-chase-lights";
    for (let bulb = 0; bulb < 24; bulb++) {
      const angle = (bulb / 24) * Math.PI * 2;
      chase.setMatrixAt(bulb, new THREE.Matrix4().compose(
        new THREE.Vector3(Math.cos(angle) * 0.73, Math.sin(angle) * 0.73, 0.03),
        new THREE.Quaternion(),
        new THREE.Vector3(1, 1, 1),
      ));
      chase.setColorAt(bulb, new THREE.Color(palette[bulb % 2]));
    }
    lantern.add(chase);
    chases.push({ mesh: chase, colors: [new THREE.Color(palette[0]), new THREE.Color(palette[1]), new THREE.Color(0x30304a)] });
    ball(lantern, bulbs[0], 0.1, 0, 0, 0.07);
    for (const side of [-1, 1]) {
      const tail = new THREE.Group();
      tail.position.set(side * 0.3, -0.5, 0);
      tail.rotation.z = side * 0.14;
      lantern.add(tail);
      for (let strip = 0; strip < 3; strip++) {
        box(tail, strip === 1 ? gold : cream, [0.045, 0.47 - strip * 0.035, 0.016], (strip - 1) * 0.065, -0.26, 0);
      }
    }
  }

  const hat = new THREE.Group();
  hat.name = "terminal-santa-hat";
  hat.position.set(-0.5, 2.17, -0.1);
  hat.rotation.z = -0.16;
  terminal.add(hat);
  mesh(hat, new THREE.TorusGeometry(0.32, 0.075, 12, 40), cream, 0, 0, 0).rotation.x = Math.PI / 2;
  const hatTop = mesh(hat, new THREE.ConeGeometry(0.31, 0.61, 36), red, 0.05, 0.28, 0);
  hatTop.rotation.z = -0.2;
  ball(hat, cream, 0.09, 0.11, 0.59, 0);

  // A snow experiment in the tank, batched into one draw call.
  const snowGeometry = new THREE.SphereGeometry(0.024, 6, 4);
  const snow = new THREE.InstancedMesh(snowGeometry, cream, 42);
  snow.name = "specimen-snow";
  snow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  snow.frustumCulled = false;
  decor.add(snow);
  const matrix = new THREE.Matrix4();
  const snowSeeds = Array.from({ length: snow.count }, (_, index) => ({
    angle: index * 2.39996, radius: 0.17 + (index % 7) * 0.075, phase: index / snow.count,
  }));
  const steam = new THREE.Group();
  steam.name = "mug-steam";
  steam.position.set(2, 1.35, -3.05);
  terminal.parent?.add(steam);
  const steamMaterial = new THREE.MeshBasicMaterial({ color: 0xf2e3cd, transparent: true, opacity: 0.14, depthWrite: false });
  const steamPuffs = Array.from({ length: 3 }, (_, index) => ball(steam, steamMaterial, 0.045, 0, index * 0.12, 0));

  let previousTime = 0;
  return {
    decor,
    activate(object: THREE.Object3D, instant = false) {
      let current: THREE.Object3D | null = object;
      while (current && !current.userData.gift) current = current.parent;
      const target = gifts.find((entry) => entry.parcel === current);
      if (!target) return false;
      target.opened = !target.opened;
      if (instant) target.lift = target.opened ? 1 : 0;
      return true;
    },
    tick(time: number) {
      const t = Number.isFinite(time) ? Math.max(0, time) : 0;
      const delta = Math.min(0.1, Math.max(0, t - previousTime));
      previousTime = t;
      for (const entry of gifts) {
        entry.lift += ((entry.opened ? 1 : 0) - entry.lift) * (1 - Math.exp(-delta * 9));
        entry.lid.rotation.x = -entry.lift * 1.12;
        entry.surprise.visible = entry.lift > 0.16;
        entry.surprise.position.y = 0.25 + entry.lift * 0.46;
        entry.surprise.rotation.y = t * 0.4;
      }
      tree.rotation.z = Math.sin(t * 0.45) * 0.009;
      star.rotation.y = Math.sin(t * 0.65) * 0.22;
      parols.forEach((parol, index) => { parol.rotation.z = Math.sin(t * 0.45 + index * 1.7) * 0.025; });
      // A slow chase (about two steps a second, far below flashing thresholds) runs around each parol hoop.
      const step = Math.floor(t * 2);
      for (const { mesh: lights, colors } of chases) {
        for (let bulb = 0; bulb < lights.count; bulb++) lights.setColorAt(bulb, (bulb + step) % 4 === 0 ? colors[2] : colors[bulb % 2]);
        if (lights.instanceColor) lights.instanceColor.needsUpdate = true;
      }
      garland.forEach((hanger) => { hanger.rotation.z = Math.sin(t * 0.9 + (hanger.userData.phase as number)) * 0.08; });
      bulbs.forEach((bulb, index) => { bulb.emissiveIntensity = 0.7 + Math.sin(t * 0.8 + index * 1.7) * 0.14; });
      ornaments.forEach((ornament, index) => { ornament.rotation.z = Math.sin(t * 0.8 + index) * 0.08; });
      snowSeeds.forEach((seed, index) => {
        const y = 0.68 + (1 - (t * 0.1 + seed.phase) % 1) * 2.18;
        matrix.makeTranslation(4.6 + Math.cos(seed.angle + t * 0.12) * seed.radius, y, 0.3 + Math.sin(seed.angle + t * 0.12) * seed.radius);
        snow.setMatrixAt(index, matrix);
      });
      snow.instanceMatrix.needsUpdate = true;
      steamPuffs.forEach((puff, index) => {
        const phase = (t * 0.25 + index / 3) % 1;
        puff.position.set(Math.sin(phase * 4 + index) * 0.035, phase * 0.45, 0);
        puff.scale.setScalar(0.045 * (0.65 + phase * 1.1));
      });
    },
  };
}
