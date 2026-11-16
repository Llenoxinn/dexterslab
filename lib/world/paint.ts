import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * The gouache kit. Every shape is painted once, at build time, with a soft light-to-dark ramp in its
 * vertex colours, then merged by material into a handful of meshes. The lab is thousands of shapes
 * but only a few draw calls, which is what lets it be huge on a small GPU.
 *
 * Buckets: `matte` (walls, wood, cloth), `gloss` (machines: a soft highlight), `glow` (screens and
 * bulbs, unlit), `beam` (light cones and pools, additive) and `glass` (see-through tubes).
 */
export type Bucket = "matte" | "gloss" | "glow" | "beam" | "glass";

export type Place = {
  at?: [number, number, number];
  rot?: [number, number, number];
  scale?: [number, number, number];
  bucket?: Bucket;
  /** How strong the painted light-to-dark ramp is (0 = flat). */
  ramp?: number;
  /** Colour at the bottom of a beam or the rim of a pool; defaults to black (invisible when additive). */
  fade?: number;
};

const SHADOW = new THREE.Color(0x0a1246);
const BUCKETS: Bucket[] = ["matte", "gloss", "glow", "beam", "glass"];

export class Painter {
  private parts: Record<Bucket, THREE.BufferGeometry[]> = { matte: [], gloss: [], glow: [], beam: [], glass: [] };
  private stack: THREE.Matrix4[] = [new THREE.Matrix4()];
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private c = new THREE.Color();
  private c2 = new THREE.Color();

  /** Everything added until the matching `pop()` is placed relative to this spot. */
  push(at: [number, number, number], rotY = 0, scale = 1) {
    const local = new THREE.Matrix4().compose(
      new THREE.Vector3(...at),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY, 0)),
      new THREE.Vector3(scale, scale, scale),
    );
    this.stack.push(this.stack[this.stack.length - 1].clone().multiply(local));
  }

  pop() {
    if (this.stack.length > 1) this.stack.pop();
  }

  add(source: THREE.BufferGeometry, color: number, place: Place = {}) {
    const bucket = place.bucket ?? "matte";
    const geometry = source.index ? source.toNonIndexed() : source;
    if (geometry !== source) source.dispose();
    geometry.deleteAttribute("uv");
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const height = Math.max(1e-4, box.max.y - box.min.y);
    const position = geometry.getAttribute("position");
    const colors = new Float32Array(position.count * 3);
    const base = this.c.set(color);
    const lit = bucket === "matte" || bucket === "gloss" || bucket === "glass";
    const ramp = place.ramp ?? (lit ? 0.3 : 0);
    const fade = place.fade !== undefined ? this.c2.set(place.fade) : null;
    for (let i = 0; i < position.count; i += 1) {
      const t = (position.getY(i) - box.min.y) / height;
      let r = base.r;
      let g = base.g;
      let b = base.b;
      if (bucket === "beam") {
        // Additive light: full colour where it leaves the lamp, nothing where it lands.
        const k = t * t;
        r = (fade ? fade.r : 0) * (1 - k) + r * k;
        g = (fade ? fade.g : 0) * (1 - k) + g * k;
        b = (fade ? fade.b : 0) * (1 - k) + b * k;
      } else if (ramp > 0) {
        // Gouache: the top catches light, the foot sinks toward the room's deep blue.
        const light = 1 - ramp + t * ramp * 1.35;
        const sink = (1 - t) * ramp * 0.55;
        r = (r * (1 - sink) + SHADOW.r * sink) * light;
        g = (g * (1 - sink) + SHADOW.g * sink) * light;
        b = (b * (1 - sink) + SHADOW.b * sink) * light;
      }
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    this.e.set(...(place.rot ?? [0, 0, 0]));
    this.m.compose(
      new THREE.Vector3(...(place.at ?? [0, 0, 0])),
      this.q.setFromEuler(this.e),
      new THREE.Vector3(...(place.scale ?? [1, 1, 1])),
    );
    geometry.applyMatrix4(this.m.premultiply(this.stack[this.stack.length - 1]));
    this.parts[bucket].push(geometry);
  }

  box(w: number, h: number, d: number, color: number, place?: Place) {
    this.add(new THREE.BoxGeometry(w, h, d), color, place);
  }

  /** A box with soft corners: the chunky, friendly edge every machine in the lab has. */
  soft(w: number, h: number, d: number, color: number, place?: Place, radius = Math.min(w, h, d) * 0.18) {
    this.add(new RoundedBoxGeometry(w, h, d, 2, radius), color, place);
  }

  cyl(rTop: number, rBottom: number, h: number, color: number, place?: Place, segments = 14, open = false) {
    this.add(new THREE.CylinderGeometry(rTop, rBottom, h, segments, 1, open), color, place);
  }

  ball(r: number, color: number, place?: Place, segments = 12) {
    this.add(new THREE.SphereGeometry(r, segments, Math.max(6, Math.round(segments * 0.7))), color, place);
  }

  ring(r: number, tube: number, color: number, place?: Place, segments = 24) {
    this.add(new THREE.TorusGeometry(r, tube, 8, segments), color, place);
  }

  /** A cable or pipe through the given points. */
  tube(points: Array<[number, number, number]>, radius: number, color: number, place?: Place, segments = 28) {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    this.add(new THREE.TubeGeometry(curve, segments, radius, 6), color, { ramp: 0.12, ...place });
  }

  /** Merge each bucket into one mesh. Returns the meshes that exist; the caller owns disposal. */
  build(materials: Record<Bucket, THREE.Material>) {
    const group = new THREE.Group();
    for (const bucket of BUCKETS) {
      const list = this.parts[bucket];
      if (!list.length) continue;
      const merged = mergeGeometries(list, false);
      for (const g of list) g.dispose();
      this.parts[bucket] = [];
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, materials[bucket]);
      const solid = bucket === "matte" || bucket === "gloss";
      mesh.castShadow = solid;
      mesh.receiveShadow = solid;
      mesh.renderOrder = bucket === "beam" ? 3 : bucket === "glass" ? 2 : 0;
      mesh.name = bucket;
      group.add(mesh);
    }
    return group;
  }
}

/** Paper grain and cool shadows, added to a stock lit material so lights, fog and shadows stay stock. */
export function gouache<T extends THREE.Material>(material: T): T {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      /* glsl */ `
      {
        float gLum = dot(outgoingLight, vec3(0.299, 0.587, 0.114));
        float gShade = 1.0 - smoothstep(0.015, 0.42, gLum);
        vec2 gq = gl_FragCoord.xy;
        float gFine = fract(sin(dot(floor(gq / 1.5), vec2(12.9898, 78.233))) * 43758.5453);
        float gBroad = fract(sin(dot(floor(gq / 5.0) + 7.0, vec2(39.346, 11.135))) * 24634.6345);
        /* Grain gathers in the dark passages of the paint and almost leaves the lit ones. */
        outgoingLight *= 1.0 - (gFine * 0.65 + gBroad * 0.35) * (0.07 + 0.36 * gShade);
        outgoingLight = mix(outgoingLight, outgoingLight * vec3(0.74, 0.92, 1.3), gShade * 0.4);
      }
      #include <opaque_fragment>`,
    );
  };
  material.customProgramCacheKey = () => "gouache";
  return material;
}

export function createMaterials(): Record<Bucket, THREE.Material> {
  return {
    matte: gouache(new THREE.MeshLambertMaterial({ vertexColors: true })),
    gloss: gouache(new THREE.MeshPhongMaterial({ vertexColors: true, specular: 0x4a66a8, shininess: 34 })),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, fog: true }),
    beam: new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
      fog: false,
    }),
    glass: new THREE.MeshPhongMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.26,
      depthWrite: false,
      specular: 0xbfe9ee,
      shininess: 70,
      side: THREE.DoubleSide,
    }),
  };
}
