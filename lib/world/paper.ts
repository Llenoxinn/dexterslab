import * as THREE from "three";

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
