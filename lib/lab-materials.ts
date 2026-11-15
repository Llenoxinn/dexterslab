import * as THREE from "three";

/*
 * Real materials for the clay lab: steel that reads as metal, and notebook paper that reads as paper.
 *
 * Metal has no colour of its own; it looks like metal only when a dark room holds a few very bright,
 * hard-edged things to reflect, and the surface bends those reflections with roughness that varies
 * across it. So the steel gets its own small studio (bright cards on near-black), F0 in `color`, and
 * a roughness field instead of a constant.
 */

/** Studio of HDR cards on a dark ground, prefiltered once. Only metal samples it (`material.envMap`). */
export function studioEnvironment(
  renderer: THREE.WebGLRenderer,
  /** How lit the room around the cards is (linear). Dark for close-up contrast; light for a white room. */
  { ambient = 0.045, floor = 0.18 }: { ambient?: number; floor?: number } = {},
): THREE.Texture {
  const room = new THREE.Scene();
  room.background = new THREE.Color().setRGB(ambient, ambient * 1.05, ambient * 1.2, THREE.LinearSRGBColorSpace);
  const card = (w: number, h: number, rgb: [number, number, number], at: [number, number, number], parent: THREE.Object3D = room) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(...rgb, THREE.LinearSRGBColorSpace), side: THREE.DoubleSide, toneMapped: false }),
    );
    mesh.position.set(...at);
    if (parent === room) mesh.lookAt(0, 0, 0);
    parent.add(mesh);
  };
  // The studio window, 4 x 3 panes with bars wide enough to survive the prefilter blur.
  const panes = new THREE.Group();
  panes.position.set(-5, 4.2, 4.8);
  panes.lookAt(0, 0, 0);
  room.add(panes);
  for (let col = 0; col < 4; col++)
    for (let row = 0; row < 3; row++) card(1.08, 1.2, [3.8, 3.55, 3.05], [(col - 1.5) * 1.3, (row - 1) * 1.47, 0], panes);
  card(3.0, 5.4, [0.52, 0.68, 0.9], [6, 1.6, 2]); // cool side card
  card(2.0, 4.6, [1.5, 1.22, 0.88], [2.5, 2.2, -5.5]); // warm back card
  card(7.5, 2.2, [0.52, 0.55, 0.6], [0, 6, 0]); // top card
  card(9, 9, [floor, floor * 0.95, floor * 1.1], [0, -4, 0]); // floor bounce, the clay room below
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(room, 0.006).texture;
  pmrem.dispose();
  room.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    }
  });
  return env;
}

export type MetalFinish = "polished" | "brushed";

const NOISE = /* glsl */ `
  float mHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float mNoise(vec3 x) {
    vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(mHash(i), mHash(i + vec3(1,0,0)), f.x), mix(mHash(i + vec3(0,1,0)), mHash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(mHash(i + vec3(0,0,1)), mHash(i + vec3(1,0,1)), f.x), mix(mHash(i + vec3(0,1,1)), mHash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }`;

/**
 * Steel with a varying finish. `polished`: fingerprint smears, two angles of fine scratches and grain
 * over a low base. `brushed`: streaks along local Y. Every term fades below its pixel footprint so the
 * finish never shimmers at distance; it simply settles to the base roughness.
 */
export function steelMaterial(
  env: THREE.Texture,
  finish: MetalFinish,
  /** Linear F0 of the metal: steel by default; gold is 1.00, 0.71, 0.29. */
  f0: [number, number, number] = [0.56, 0.57, 0.58],
): THREE.MeshStandardMaterial {
  const polished = finish === "polished";
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setRGB(...f0, THREE.LinearSRGBColorSpace),
    metalness: 1,
    roughness: polished ? 0.09 : 0.26,
    envMap: env,
    envMapIntensity: polished ? 1 : 0.72,
  });
  material.userData.metal = true;
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vMetalP;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvMetalP = position;");
    const finishGlsl = polished
      ? `
        float smear = smoothstep(0.45, 0.85, mNoise(mp * 3.1) * 0.65 + mNoise(mp * 7.3) * 0.35);
        float s1 = mNoise(vec3(mp.x * 9.0 + mp.y * 240.0, mp.z * 9.0, mp.y * 3.0));
        float s2 = mNoise(vec3(mp.x * 200.0 - mp.z * 60.0, mp.y * 9.0, mp.z * 3.0));
        float scratch = smoothstep(0.86, 0.95, max(s1, s2)) * (1.0 - smoothstep(0.15, 0.8, fw * 240.0));
        float grain = (mNoise(mp * 900.0) - 0.5) * (1.0 - smoothstep(0.15, 0.8, fw * 900.0));
        roughnessFactor = clamp(roughnessFactor + smear * 0.11 + scratch * 0.24 + grain * 0.05, 0.045, 0.6);`
      : `
        float streak = mNoise(vec3(mp.x * 520.0, mp.y * 4.0, mp.z * 520.0)) * (1.0 - smoothstep(0.15, 0.8, fw * 520.0));
        float fine = mNoise(vec3(mp.x * 1500.0, mp.y * 6.0, mp.z * 1500.0)) * (1.0 - smoothstep(0.15, 0.8, fw * 1500.0));
        float smear = smoothstep(0.4, 0.9, mNoise(mp * 2.3));
        roughnessFactor = clamp(roughnessFactor + (streak - 0.5) * 0.22 + (fine - 0.5) * 0.12 + smear * 0.14, 0.1, 0.75);`;
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\nvarying vec3 vMetalP;\n${NOISE}`)
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
        {
          vec3 mp = vMetalP;
          float fw = max(length(dFdx(mp)), length(dFdy(mp)));
          ${finishGlsl}
        }`,
      );
  };
  material.customProgramCacheKey = () => `lab-steel-${finish}`; // F0 is a uniform: one program per finish
  return material;
}

/*
 * Paper: a fibre field (warped, rotating strands over formation clouds) baked once into a data
 * texture. Channels: R height for the bump, G formation (thin where bright). The turning leaf uses the
 * formation to let sunlight through, and shows the ink of its other side when it lifts.
 */
export function paperFibreTexture(size = 1024): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is unavailable.");
  // Seeded so the paper is the same sheet on every visit.
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  // Formation: soft clouds of denser and thinner pulp.
  ctx.fillStyle = "rgb(128,128,0)";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 260; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 20 + rand() * 90;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const v = rand() < 0.5 ? 0 : 255;
    g.addColorStop(0, `rgba(${v},${v},0,0.09)`);
    g.addColorStop(1, `rgba(${v},${v},0,0)`);
    ctx.fillStyle = g;
    for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) {
      ctx.save();
      ctx.translate(dx, dy);
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.restore();
    }
  }
  // Fibres: short strands whose direction drifts smoothly across the sheet (never a crosshatch).
  ctx.lineCap = "round";
  const angleAt = (x: number, y: number) =>
    Math.sin(x * 0.006 + Math.cos(y * 0.004) * 1.7) * 0.75 + Math.cos(y * 0.007 - x * 0.002) * 0.75;
  for (let i = 0; i < 9000; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const a = angleAt(x, y) + (rand() - 0.5) * 0.9;
    const len = 6 + rand() * 26;
    const light = rand() < 0.62;
    ctx.strokeStyle = light ? `rgba(255,${150 + rand() * 60},0,${0.12 + rand() * 0.2})` : `rgba(0,${70 + rand() * 40},0,${0.08 + rand() * 0.14})`;
    ctx.lineWidth = 0.6 + rand() * 1.1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a + 0.3) * len * 0.5, y + Math.sin(a + 0.3) * len * 0.5, x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace; // numerical data, not colour
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * A printed page as paper: the fibre field bumps the surface, mottles the albedo (cloudier and
 * thinner pulp, pale strands) and a faint warm toast ages the edges, fading to nothing inside.
 * `extra` lets the turning leaf add its own terms to the same shader.
 */
export function paperSurface(
  material: THREE.MeshStandardMaterial,
  fibre: THREE.Texture,
  extra?: { uniforms: Record<string, THREE.IUniform>; shader: (s: THREE.WebGLProgramParametersWithUniforms) => void; key: string },
) {
  material.bumpMap = fibre;
  material.bumpScale = 0.9;
  material.roughness = 0.93;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uPaperFibre = { value: fibre };
    if (extra) Object.assign(shader.uniforms, extra.uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform sampler2D uPaperFibre;")
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        #ifdef USE_MAP
        {
          /* The page is 1.72 x 2.36: stretch V so the fibres stay round, not tall. */
          vec4 pf = texture2D(uPaperFibre, vMapUv * vec2(1.0, 1.37));
          diffuseColor.rgb *= 0.965 + (pf.g - 0.5) * 0.08 + (pf.r - 0.5) * 0.05;
          vec2 e = min(vMapUv, 1.0 - vMapUv);
          float toast = 1.0 - smoothstep(0.0, 0.035, min(e.x, e.y));
          diffuseColor.rgb *= mix(vec3(1.0), vec3(0.93, 0.88, 0.78), toast * 0.55);
        }
        #endif`,
      );
    extra?.shader(shader);
  };
  material.customProgramCacheKey = () => `lab-paper${extra ? `-${extra.key}` : ""}`;
}

/**
 * The turning leaf: `lift` (0..1) is how far it stands off the block. Raised paper catches the sun
 * from behind, thinner where the formation is thin, and the ink on its other face shows through.
 */
export function paperLeaf(material: THREE.MeshStandardMaterial, fibre: THREE.Texture) {
  const uniforms = {
    uLift: { value: 0 },
    uOther: { value: null as THREE.Texture | null },
    uFibre: { value: fibre },
  };
  paperSurface(material, fibre, {
    uniforms,
    key: "leaf",
    shader: (shader) => {
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform float uLift;\nuniform sampler2D uOther;\nuniform sampler2D uFibre;")
        .replace(
          "#include <emissivemap_fragment>",
          `#include <emissivemap_fragment>
          #ifdef USE_MAP
          float leafForm = texture2D(uFibre, vMapUv).g;
          /* Show-through: the other face, mirrored across the leaf, is a faint grey ghost under the ink. */
          vec3 otherInk = texture2D(uOther, vec2(1.0 - vMapUv.x, vMapUv.y)).rgb;
          float ghost = clamp(1.0 - dot(otherInk, vec3(0.333)), 0.0, 1.0) * uLift * (0.18 + (leafForm - 0.5) * 0.2);
          diffuseColor.rgb *= 1.0 - ghost;
          #else
          float leafForm = 0.5;
          #endif
          /* Transmitted sun: thin pulp glows warm, fibre bundles and ink hold light back. */
          float tr = clamp(0.74 + (0.5 - leafForm) * 0.85, 0.0, 1.2);
          totalEmissiveRadiance += vec3(1.0, 0.93, 0.8) * tr * uLift * 0.22 * (0.35 + 0.65 * dot(diffuseColor.rgb, vec3(0.333)));`,
        );
    },
  });
  return uniforms;
}
