import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/*
 * Falling leaves (after the 3d-falling-leaves mechanism), modelled in the lab's clay and steel.
 *
 *  - One real leaf: a pointed blade folded along its midrib and bent along its length, with a stem,
 *    so it thins to a line when it turns edge-on. The back face is paler.
 *  - Closed-form motion from persistent seeds: no per-frame randomness, no integration to catch up
 *    after a hidden tab. The sideways slip follows the tumble (fastest when edge-on):
 *    offset = -(slip / omega) * cos(phase + omega * t), so d(offset)/dt = slip * sin(angle).
 *  - They fall around the room (never inside it, so the lab stays readable), grow in at the top,
 *    and settle into the lake at the bottom, where they shrink away before recycling with a new seed.
 */

const LEAF_LENGTH = 0.42;

function leafGeometry() {
  const half = LEAF_LENGTH / 2;
  const shape = new THREE.Shape();
  shape.moveTo(0, -half);
  shape.bezierCurveTo(0.17, -half * 0.55, 0.15, half * 0.45, 0, half);
  shape.bezierCurveTo(-0.15, half * 0.45, -0.17, -half * 0.55, 0, -half);
  const blade = new THREE.ShapeGeometry(shape, 10);
  const pos = blade.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    // Fold along the midrib and bend along the length: the leaf has a spine and a curve.
    pos.setZ(i, Math.abs(x) * 0.55 + (y / half) * (y / half) * 0.045);
  }
  blade.deleteAttribute("uv");
  const stem = new THREE.CylinderGeometry(0.008, 0.012, 0.11, 5, 1);
  stem.deleteAttribute("uv");
  stem.translate(0, -half - 0.045, 0.01);
  const merged = mergeGeometries([blade.toNonIndexed(), stem.toNonIndexed()])!;
  merged.computeVertexNormals();
  merged.rotateX(-Math.PI / 2); // lie flat: length along z, face up
  blade.dispose();
  stem.dispose();
  return merged;
}

type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number };

const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export function createClayLeaves(options: {
  clay: THREE.Material;
  steel: THREE.Material;
  /** Where leaves may fall (x, z), and the room footprint they keep out of. */
  area: Bounds;
  room: Bounds;
  top: number;
  water: number;
  clayCount?: number;
  steelCount?: number;
}) {
  const { area, room, top, water, clayCount = 64, steelCount = 10 } = options;
  const geometry = leafGeometry();
  const group = new THREE.Group();
  group.name = "clay-leaves";

  // Paler, slightly cooler back face: a leaf is never the same colour on both sides.
  const paleBack = (material: THREE.Material) => {
    const m = material.clone();
    m.side = THREE.DoubleSide;
    const before = m.onBeforeCompile.bind(m);
    m.onBeforeCompile = (shader, r) => {
      before(shader, r);
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        "#include <color_fragment>\nif (!gl_FrontFacing) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), 0.28);",
      );
    };
    const key = m.customProgramCacheKey.bind(m);
    m.customProgramCacheKey = () => `${key()}-leaf-back`;
    return m;
  };

  const sets = [
    { mesh: new THREE.InstancedMesh(geometry, paleBack(options.clay), clayCount), count: clayCount, salt: 0 },
    { mesh: new THREE.InstancedMesh(geometry, paleBack(options.steel), steelCount), count: steelCount, salt: 1000 },
  ];
  // Clay leaves: mostly white clay, one in four in the lab's DOS blue.
  const white = new THREE.Color(0xf3f3f5);
  const blue = new THREE.Color(0x2323d2);
  for (let i = 0; i < clayCount; i++) sets[0].mesh.setColorAt(i, hash(i * 7.3) < 0.25 ? blue : white);
  for (const { mesh } of sets) {
    mesh.frustumCulled = false;
    mesh.castShadow = false; // a scatter of small shadows on the water reads as dirt, not leaves
    mesh.receiveShadow = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(mesh);
  }

  const height = top - water;
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const euler = new THREE.Euler(0, 0, 0, "YXZ");
  const scale = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  const flat = new THREE.Quaternion();
  const flatEuler = new THREE.Euler();

  /** A spawn point for this leaf's current fall, outside the room. */
  const spawn = (seed: number, out: THREE.Vector3) => {
    out.x = area.minX + hash(seed) * (area.maxX - area.minX);
    out.z = area.minZ + hash(seed + 0.5) * (area.maxZ - area.minZ);
    if (out.x > room.minX && out.x < room.maxX && out.z > room.minZ && out.z < room.maxZ) {
      // Push it out through the open front of the cutaway.
      out.z = room.maxZ + 0.6 + hash(seed + 0.9) * 3;
    }
    return out;
  };

  return {
    group,
    /** `amount` 0..1 fades the whole fall in and out (it belongs to the assembled room). */
    update(time: number, amount: number, wind: THREE.Vector2) {
      group.visible = amount > 0.01;
      if (!group.visible) return;
      for (const { mesh, count, salt } of sets) {
        for (let i = 0; i < count; i++) {
          const id = i + salt;
          const fall = 0.32 + hash(id * 1.7) * 0.28; // units per second
          const travelled = time * fall + hash(id * 3.1) * height;
          const cycle = Math.floor(travelled / height);
          const along = travelled - cycle * height; // 0 at the top
          const seed = id * 13.37 + cycle * 7.77; // a new path every fall, stable within it
          spawn(seed, position);

          const omega = 1.1 + hash(id * 5.3) * 1.6; // tumble rate, bounded away from zero
          const phase = hash(id * 2.9) * Math.PI * 2;
          const angle = phase + omega * time;
          const slip = 0.35 + hash(id * 4.4) * 0.45;
          const heading = hash(seed * 1.3) * Math.PI * 2;
          const side = -(slip / omega) * Math.cos(angle);
          const seconds = along / fall;
          position.x += Math.cos(heading) * side + wind.x * seconds;
          position.z += Math.sin(heading) * side + wind.y * seconds;
          position.y = top - along;

          // Tumble through face, edge and back; a slower roll and a turn so no two share a rhythm.
          euler.set(Math.sin(angle) * 1.25, heading + time * (0.3 + hash(id * 6.1) * 0.4), Math.cos(angle * 0.5 + phase) * 0.6);
          quaternion.setFromEuler(euler);
          // Grow in near the top; settle and shrink away as it reaches the water.
          const enter = THREE.MathUtils.smoothstep(along, 0, 0.8);
          const settle = THREE.MathUtils.smoothstep(position.y, water + 0.05, water + 0.6);
          const size = (0.7 + hash(id * 8.8) * 0.55) * enter * settle * amount;
          if (position.y < water + 0.6) {
            // Lie down on the surface as it lands.
            quaternion.slerp(flat.setFromEuler(flatEuler.set(0, heading, 0)), 1 - settle);
          }
          scale.setScalar(Math.max(1e-4, size));
          mesh.setMatrixAt(i, matrix.compose(position, quaternion, scale));
        }
        mesh.instanceMatrix.needsUpdate = true;
      }
    },
    dispose() {
      geometry.dispose();
      for (const { mesh } of sets) {
        (mesh.material as THREE.Material).dispose();
        mesh.dispose();
      }
    },
  };
}
