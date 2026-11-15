import * as THREE from "three";

/**
 * Draw-call batching that leaves the scene graph alone.
 *
 * The lab is ~900 small meshes, and on integrated GPUs the CPU cost of submitting them (not the
 * pixels) was the frame: ~18 ms for one pass, and the shadow pass pays it again. Here every opaque
 * mesh that shares a material with others becomes an instance in one BatchedMesh per material.
 * The original mesh stays where it was as a proxy on a layer no camera renders: the journey, the
 * lab's animations and raycasts keep moving and hitting it, and `sync()` copies its world matrix
 * and effective visibility into the batch each frame.
 */
export const PROXY_LAYER = 5;

type Entry = { mesh: THREE.Mesh; batch: THREE.BatchedMesh; id: number };

const signature = (g: THREE.BufferGeometry) =>
  `${Object.keys(g.attributes).sort().join(",")}|${g.index ? "i" : "n"}`;

export function batchScene(root: THREE.Object3D, parent: THREE.Object3D, exclude?: (mesh: THREE.Mesh) => boolean) {
  const groups = new Map<string, THREE.Mesh[]>();
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || o instanceof THREE.InstancedMesh || o instanceof THREE.BatchedMesh) return;
    if (o instanceof THREE.SkinnedMesh || Array.isArray(o.material)) return;
    const g = o.geometry;
    if (o.material.transparent || Object.keys(g.morphAttributes).length || exclude?.(o)) return;
    const key = `${o.material.uuid}|${o.castShadow}|${o.receiveShadow}|${signature(g)}`;
    const list = groups.get(key);
    if (list) list.push(o);
    else groups.set(key, [o]);
  });

  const entries: Entry[] = [];
  const batches: THREE.BatchedMesh[] = [];
  for (const meshes of groups.values()) {
    if (meshes.length < 2) continue;
    const unique = [...new Set(meshes.map((m) => m.geometry))];
    let vertices = 0;
    let indices = 0;
    for (const g of unique) {
      vertices += g.attributes.position.count;
      indices += g.index?.count ?? 0;
    }
    const first = meshes[0];
    const batch = new THREE.BatchedMesh(meshes.length, vertices, indices, first.material as THREE.Material);
    batch.name = "lab-batch";
    batch.castShadow = first.castShadow;
    batch.receiveShadow = first.receiveShadow;
    // Pieces fly far from home during the journey; cull per instance, never the batch as a whole.
    batch.frustumCulled = false;
    batch.perObjectFrustumCulled = true;
    batch.sortObjects = false;
    const ids = new Map(unique.map((g) => [g, batch.addGeometry(g)]));
    for (const mesh of meshes) {
      entries.push({ mesh, batch, id: batch.addInstance(ids.get(mesh.geometry)!) });
      mesh.layers.set(PROXY_LAYER);
    }
    parent.add(batch);
    batches.push(batch);
  }

  const shown = (o: THREE.Object3D | null): boolean => {
    for (let n = o; n; n = n.parent) if (!n.visible) return false;
    return true;
  };

  return {
    /** Draw calls saved: proxies replaced minus the batches that replaced them. */
    saved: entries.length - batches.length,
    /** Call after the scene's world matrices are current and before rendering. */
    sync() {
      for (const { mesh, batch, id } of entries) {
        const visible = shown(mesh);
        batch.setVisibleAt(id, visible);
        if (visible) batch.setMatrixAt(id, mesh.matrixWorld);
      }
    },
    dispose() {
      for (const b of batches) {
        b.removeFromParent();
        b.dispose();
      }
      for (const { mesh } of entries) mesh.layers.set(0);
    },
  };
}
