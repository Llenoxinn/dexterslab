import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * The gouache kit. Every shape is painted once, at build time, with a soft light-to-dark ramp in its
 * vertex colours, then merged by material into a handful of meshes. The lab is thousands of shapes
 * but only a few draw calls, which is what lets it be huge on a small GPU.
 *
 * Buckets: `matte` (walls, wood, cloth), `gloss` (machines: a soft highlight), `glow` (screens and
 * bulbs, unlit), `blink` (indicator lamps that switch on and off, each on its own beat), `beam` (light
 * cones and pools, additive) and `glass` (see-through tubes).
 */
export type Bucket = "matte" | "gloss" | "glow" | "blink" | "beam" | "glass";

/** Seconds since the lab started; every animated material reads it. */
export const clock = { value: 0 };

export type Place = {
  at?: [number, number, number];
  rot?: [number, number, number];
  scale?: [number, number, number];
  bucket?: Bucket;
  /** How strong the painted light-to-dark ramp is (0 = flat). */
  ramp?: number;
  /** Colour at the bottom of a beam or the rim of a pool; defaults to black (invisible when additive). */
  fade?: number;
  /** Keep the geometry's own `color` attribute instead of painting a ramp (for shapes shaded by hand). */
  keep?: boolean;
  /** Where in its cycle a `blink` lamp starts (0-1); random when left out. */
  phase?: number;
  /**
   * Radius of the soft light this shape throws into the haze, in metres. Blinking lamps get one sized
   * to the lamp unless this is 0; anything else only when asked.
   */
  halo?: number;
  /** Colour of the halo, when it should differ from the shape (a parol's warm core behind coloured paper). */
  haloColor?: number;
};

/** Pixels per metre at one metre from the camera, for sizing halo sprites; set by the renderer on resize. */
export const haloScale = { value: 800 };
/** 0 = every lamp in the hall dark, 1 = full power. The opening sequence ramps it. */
export const power = { value: 1 };
/** The indicator LEDs run on their own circuit: in the opening they glow before the lamps come on. */
export const ledPower = { value: 1 };

type Halo = { x: number; y: number; z: number; color: number; radius: number; phase: number };

const SHADOW = new THREE.Color(0x0a1246);
const BUCKETS: Bucket[] = ["matte", "gloss", "glow", "blink", "beam", "glass"];

export class Painter {
  private parts: Record<Bucket, THREE.BufferGeometry[]> = { matte: [], gloss: [], glow: [], blink: [], beam: [], glass: [] };
  private halos: Halo[] = [];
  private v = new THREE.Vector3();
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
    const phase = bucket === "blink" ? place.phase ?? Math.random() : -1;
    if (bucket === "blink") {
      geometry.setAttribute("aBlink", new THREE.BufferAttribute(new Float32Array(geometry.getAttribute("position").count).fill(phase), 1));
    }
    this.e.set(...(place.rot ?? [0, 0, 0]));
    this.m.compose(
      new THREE.Vector3(...(place.at ?? [0, 0, 0])),
      this.q.setFromEuler(this.e),
      new THREE.Vector3(...(place.scale ?? [1, 1, 1])),
    );
    let radius = place.halo ?? -1;
    if (radius < 0 && bucket === "blink") {
      geometry.computeBoundingSphere();
      const scale = place.scale ? Math.max(...place.scale) : 1;
      radius = Math.min(1.4, Math.max(0.3, geometry.boundingSphere!.radius * scale * 2.6));
    }
    if (radius > 0) {
      // The halo sits where the shape's centre lands in the world.
      geometry.computeBoundingBox();
      geometry.boundingBox!.getCenter(this.v).applyMatrix4(this.m).applyMatrix4(this.stack[this.stack.length - 1]);
      const s = this.stack[this.stack.length - 1].getMaxScaleOnAxis();
      this.halos.push({ x: this.v.x, y: this.v.y, z: this.v.z, color: place.haloColor ?? color, radius: radius * s, phase });
    }
    if (place.keep && geometry.getAttribute("color")) {
      geometry.applyMatrix4(this.m.premultiply(this.stack[this.stack.length - 1]));
      this.parts[bucket].push(geometry);
      return;
    }
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

  /** A straight-sided rod through the points: bamboo frames and wire, where a smooth curve would round the corners. */
  rods(points: Array<[number, number, number]>, radius: number, color: number, place?: Place, closed = false) {
    const path = new THREE.CurvePath<THREE.Vector3>();
    const v = points.map((q) => new THREE.Vector3(...q));
    for (let i = 0; i < v.length - (closed ? 0 : 1); i += 1) path.add(new THREE.LineCurve3(v[i], v[(i + 1) % v.length]));
    this.add(new THREE.TubeGeometry(path, v.length * 6, radius, 5, closed), color, { ramp: 0, ...place });
  }

  /** Light with no shape of its own: the glow inside a parol, the pool under a bulb. */
  light(at: [number, number, number], radius: number, color: number, phase = -1) {
    this.v.set(...at).applyMatrix4(this.stack[this.stack.length - 1]);
    const s = this.stack[this.stack.length - 1].getMaxScaleOnAxis();
    this.halos.push({ x: this.v.x, y: this.v.y, z: this.v.z, color, radius: radius * s, phase });
  }

  /** Merge each bucket into one mesh. Returns the meshes that exist; the caller owns disposal. */
  build(materials: Record<Bucket, THREE.Material>) {
    const group = new THREE.Group();
    if (this.halos.length) {
      group.add(haloPoints(this.halos));
      this.halos = [];
    }
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

/**
 * One tileable sheet of watercolour paper, painted once on a canvas. R is the tooth: thousands of short
 * pale and dark fibres laid in every direction. G is the wash: soft blotches where the paint pooled and
 * dried darker or lifted lighter. Drawn wrapped, so the tile has no seam.
 */
function paperTile(size = 512) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const tooth = document.createElement("canvas");
  tooth.width = tooth.height = size;
  const t = tooth.getContext("2d")!;
  const wash = document.createElement("canvas");
  wash.width = wash.height = size;
  const w = wash.getContext("2d")!;
  let seed = 7;
  const r = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const wrapped = (draw: (dx: number, dy: number) => void) => {
    for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) draw(dx, dy);
  };
  t.fillStyle = "rgb(128 128 128)";
  t.fillRect(0, 0, size, size);
  t.lineCap = "round";
  for (let i = 0; i < 5200; i += 1) {
    const x = r() * size;
    const y = r() * size;
    const a = r() * Math.PI;
    const len = 3 + r() * r() * 26;
    const bend = (r() - 0.5) * len * 0.5;
    const light = r() < 0.5;
    t.strokeStyle = light ? `rgb(255 255 255 / ${0.05 + r() * 0.11})` : `rgb(0 0 0 / ${0.05 + r() * 0.1})`;
    t.lineWidth = 0.5 + r() * 1.1;
    wrapped((dx, dy) => {
      t.beginPath();
      t.moveTo(x + dx, y + dy);
      t.quadraticCurveTo(x + dx + Math.cos(a) * len * 0.5 - Math.sin(a) * bend, y + dy + Math.sin(a) * len * 0.5 + Math.cos(a) * bend, x + dx + Math.cos(a) * len, y + dy + Math.sin(a) * len);
      t.stroke();
    });
  }
  // Pits in the sheet, where pigment settles.
  for (let i = 0; i < 1400; i += 1) {
    const x = r() * size;
    const y = r() * size;
    t.fillStyle = `rgb(0 0 0 / ${0.08 + r() * 0.16})`;
    wrapped((dx, dy) => t.fillRect(x + dx, y + dy, 1 + r(), 1 + r()));
  }
  w.fillStyle = "rgb(128 128 128)";
  w.fillRect(0, 0, size, size);
  for (let i = 0; i < 90; i += 1) {
    const x = r() * size;
    const y = r() * size;
    const radius = 18 + r() * 90;
    const dark = r() < 0.5;
    wrapped((dx, dy) => {
      const g = w.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, radius);
      // A pooled wash dries with a darker rim: the hard edge watercolour is known for.
      g.addColorStop(0, dark ? "rgb(0 0 0 / 0.1)" : "rgb(255 255 255 / 0.1)");
      g.addColorStop(0.82, dark ? "rgb(0 0 0 / 0.14)" : "rgb(255 255 255 / 0.06)");
      g.addColorStop(1, "rgb(0 0 0 / 0)");
      w.fillStyle = g;
      w.fillRect(x + dx - radius, y + dy - radius, radius * 2, radius * 2);
    });
  }
  const out = ctx.createImageData(size, size);
  const a = t.getImageData(0, 0, size, size).data;
  const b = w.getImageData(0, 0, size, size).data;
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = a[i];
    out.data[i + 1] = b[i];
    out.data[i + 2] = 128;
    out.data[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(out.data, size, size);
  texture.flipY = false;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

/** The paper every painted surface is laid on; made on first use and shared. */
export const paper = { value: null as THREE.Texture | null };

/**
 * Gouache on paper, added to a stock lit material so lights, fog and shadows stay stock. The wash is
 * fixed to the surfaces (world space, sampled from three sides), so the paint stays put as the camera
 * moves; the tooth sits in the picture plane, like the sheet under a painting.
 */
export function gouache<T extends THREE.Material>(material: T): T {
  paper.value ??= paperTile();
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uPaper = paper;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vGWorld;\nvarying vec3 vGNormal;")
      .replace(
        "#include <worldpos_vertex>",
        "#include <worldpos_vertex>\nvGWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvGNormal = normalize(mat3(modelMatrix) * objectNormal);",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform sampler2D uPaper;\nvarying vec3 vGWorld;\nvarying vec3 vGNormal;")
      .replace(
        "#include <opaque_fragment>",
        /* glsl */ `
      {
        float gLum = dot(outgoingLight, vec3(0.299, 0.587, 0.114));
        float gShade = 1.0 - smoothstep(0.015, 0.42, gLum);
        vec3 gw = pow(abs(vGNormal), vec3(4.0));
        gw /= (gw.x + gw.y + gw.z);
        vec3 gp = vGWorld * 0.085;
        float gWash = texture2D(uPaper, gp.zy).g * gw.x + texture2D(uPaper, gp.xz + 0.37).g * gw.y + texture2D(uPaper, gp.xy + 0.71).g * gw.z;
        float gTooth = texture2D(uPaper, gl_FragCoord.xy / 384.0).r;
        /* The wash mottles every surface a little; the tooth gathers in the dark passages and almost leaves the lit ones. */
        outgoingLight *= 1.0 + (gWash - 0.5) * 1.35;
        outgoingLight *= 1.0 + (gTooth - 0.5) * (0.35 + 1.1 * gShade);
        outgoingLight = mix(outgoingLight, outgoingLight * vec3(0.74, 0.92, 1.3), gShade * 0.4);
      }
      #include <opaque_fragment>`,
      );
  };
  material.customProgramCacheKey = () => "gouache-paper";
  return material;
}

/** Indicator lamps: each one switches on and off at its own speed, with a soft edge so it reads as a bulb. */
function blinking() {
  const material = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = clock;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aBlink;\nvarying float vBlink;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvBlink = aBlink;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;\nvarying float vBlink;")
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float bk = fract(uTime * (0.22 + fract(vBlink * 7.31) * 0.85) + vBlink);
        diffuseColor.rgb *= mix(0.22, 1.2, smoothstep(0.0, 0.05, bk) * (1.0 - smoothstep(0.58, 0.64, bk)));`,
      );
  };
  material.customProgramCacheKey = () => "blink";
  return material;
}

/** A phosphor screen: graticule, two traces and scanlines, drawn per pixel so it stays sharp up close. */
export function scopeMaterial(tint = 0x6ff0d8, seed = 0) {
  return new THREE.ShaderMaterial({
    toneMapped: false,
    uniforms: { uTime: clock, uTint: { value: new THREE.Color(tint) }, uSeed: { value: seed } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      uniform float uTime;
      uniform vec3 uTint;
      uniform float uSeed;
      void main() {
        vec2 uv = vUv;
        vec2 g = abs(fract(uv * vec2(8.0, 6.0)) - 0.5);
        float grid = 1.0 - smoothstep(0.0, 0.035, min(g.x, g.y));
        float t = uTime + uSeed * 3.7;
        float y1 = 0.5 + 0.24 * sin(uv.x * (9.0 + uSeed) + t * 2.1) * (0.65 + 0.35 * sin(t * 0.6));
        float y2 = 0.5 + 0.1 * sin(uv.x * 29.0 - t * 3.3) + 0.07 * sin(uv.x * 6.0 + t * 1.3);
        float l1 = 1.0 - smoothstep(0.004, 0.02, abs(uv.y - y1));
        float l2 = 1.0 - smoothstep(0.003, 0.012, abs(uv.y - y2));
        float sweep = smoothstep(0.08, 0.0, abs(fract(t * 0.35) - uv.x)) * 0.25;
        float scan = 0.86 + 0.14 * sin(uv.y * 260.0);
        float vig = smoothstep(0.78, 0.22, length(uv - 0.5));
        vec3 col = vec3(0.03, 0.12, 0.15) + uTint * (0.16 * grid + 1.3 * l1 + sweep) + vec3(1.0, 0.86, 0.5) * l2 * 0.75;
        gl_FragColor = vec4(col * scan * (0.5 + 0.5 * vig), 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

let haloMaterial: THREE.ShaderMaterial | null = null;

/**
 * Halos: one camera-facing sprite per lamp, a tight hot core in a wide soft bloom, added onto the
 * frame. Drawn as one Points mesh, so a hall full of glowing bulbs costs a single draw call instead of
 * a bloom pass over the whole screen. Blinking lamps blink their halo on the same beat (same maths as
 * `blinking()`), and everything fades into the haze with distance like the room's fog.
 */
function haloPoints(halos: Halo[]) {
  const n = halos.length;
  const position = new Float32Array(n * 3);
  const color = new Float32Array(n * 3);
  const size = new Float32Array(n);
  const blink = new Float32Array(n);
  const c = new THREE.Color();
  halos.forEach((h, i) => {
    position.set([h.x, h.y, h.z], i * 3);
    c.set(h.color);
    color.set([c.r, c.g, c.b], i * 3);
    size[i] = h.radius;
    blink[i] = h.phase;
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(color, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  geometry.setAttribute("aBlink", new THREE.BufferAttribute(blink, 1));
  haloMaterial ??= new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: { uTime: clock, uScale: haloScale, uPower: power, uLeds: ledPower },
    vertexShader: /* glsl */ `
      attribute vec3 color;
      attribute float aSize;
      attribute float aBlink;
      uniform float uTime;
      uniform float uScale;
      uniform float uPower;
      uniform float uLeds;
      varying vec3 vColor;
      varying float vCore;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float dist = length(mv.xyz);
        // Pull the sprite toward the camera by its radius so the lamp's own body cannot hide the hot core.
        mv.xyz *= max(0.0, dist - aSize * 0.6) / max(dist, 1e-3);
        float on = 1.0;
        if (aBlink >= 0.0) {
          float bk = fract(uTime * (0.22 + fract(aBlink * 7.31) * 0.85) + aBlink);
          on = mix(0.1, 1.0, smoothstep(0.0, 0.05, bk) * (1.0 - smoothstep(0.58, 0.64, bk)));
        } else {
          // Steady lamps still breathe a little, the way a filament does.
          on = 0.9 + 0.1 * sin(uTime * (1.3 + fract(position.x * 0.37) * 1.7) + position.z);
        }
        float haze = exp(-pow(dist * 0.0072, 2.0) * 0.8);
        vColor = color * on * haze * (aBlink >= 0.0 ? uLeds : uPower);
        vCore = on;
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(2.0 * aSize * uScale / max(0.5, -mv.z), 0.0, 900.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vCore;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        if (d > 1.0) discard;
        float bloom = exp(-d * d * 4.5) * (1.0 - d);
        float core = exp(-d * d * 60.0) * vCore;
        // The bloom carries the lamp's colour; the core burns toward white.
        vec3 col = vColor * bloom * 0.55 + mix(vColor, vec3(1.0), 0.6) * core * 0.9;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const points = new THREE.Points(geometry, haloMaterial);
  points.name = "halo";
  points.renderOrder = 4;
  points.frustumCulled = false;
  return points;
}

export function createMaterials(): Record<Bucket, THREE.Material> {
  return {
    blink: blinking(),
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
