import * as THREE from "three";

export const STUDIO_SUN_DIRECTION = new THREE.Vector3(-6, 8, -9).normalize();
export const STUDIO_BACK_WINDOW = { x: 6.35, y: 4.475, z: -4.15, width: 6, height: 3.55 } as const;

export function studioSunPatch() {
  const window = STUDIO_BACK_WINDOW;
  return new THREE.Vector3(window.x, window.y, window.z).addScaledVector(STUDIO_SUN_DIRECTION, -window.y / STUDIO_SUN_DIRECTION.y);
}

/** Real openings in the cutaway walls let the directional sun cast window-shaped shadows. */
export function createStudioWindows(root: THREE.Group, wall: THREE.Material, sideWall: THREE.Material) {
  const frame = new THREE.MeshStandardMaterial({ color: 0xf3f3f5, roughness: 0.6 });
  const sky = new THREE.MeshBasicMaterial({ color: 0xeaf2ff, side: THREE.DoubleSide });
  const windows: THREE.Group[] = [];
  function elevation(width: number, depth: number, material: THREE.Material, x: number, z: number, rotation: number, openingX: number) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotation;
    root.add(group);
    const w = STUDIO_BACK_WINDOW.width;
    const bottom = 2.7;
    const top = 6.25;
    const put = (sx: number, sy: number, sz: number, px: number, py: number, pz: number, mat = material) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
      mesh.position.set(px, py, pz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    };
    put(width, bottom, depth, 0, bottom / 2, 0);
    put(width, 7 - top, depth, 0, (7 + top) / 2, 0);
    const left = openingX - w / 2 + width / 2;
    const right = width / 2 - openingX - w / 2;
    put(left, top - bottom, depth, -width / 2 + left / 2, (bottom + top) / 2, 0);
    put(right, top - bottom, depth, width / 2 - right / 2, (bottom + top) / 2, 0);
    for (const edge of [-1, 1]) {
      put(0.16, top - bottom + 0.2, 0.35, openingX + edge * w / 2, (bottom + top) / 2, 0.08, frame);
      put(w + 0.22, 0.16, 0.35, openingX, edge < 0 ? bottom : top, 0.08, frame);
    }
    put(w + 0.5, 0.14, 0.65, openingX, bottom - 0.1, 0.2, frame);
    for (const offset of [-1, 1]) put(0.085, top - bottom, 0.16, openingX + offset, (bottom + top) / 2, 0.08, frame);
    // Visible louvres cast the same stripes the visitor sees on the floor.
    for (let i = 0; i < 8; i++) {
      const slat = put(w, 0.07, 0.28, openingX, bottom + 0.35 + i * 0.4, 0.1, frame);
      slat.rotation.x = -0.35;
    }
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, top - bottom), sky);
    pane.position.set(openingX, (bottom + top) / 2, -0.18);
    pane.castShadow = false;
    group.add(pane);
    windows.push(group);
  }
  elevation(20.3, 0.3, wall, 2.85, -4.15, 0, 3.5);
  elevation(13.5, 0.3, sideWall, -7.15, 2.45, Math.PI / 2, -0.8);
  return { windows, sky };
}
