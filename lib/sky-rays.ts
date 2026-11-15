import * as THREE from "three";

/*
 * Sky rays (after the 3d-sky-rays mechanism): light appears to travel through the window, cut by
 * the real louvres and frames.
 *
 *  1. Mask: the scene is drawn black (writing depth), then only the sky panes are drawn white with
 *     depth testing, so every louvre, mullion and wall in front of the sky stays black.
 *  2. March: each ray-buffer pixel walks towards the sun's screen position, summing mask samples
 *     with a decaying weight, divided by the weight sum so the sample count never changes exposure.
 *  3. Composite: added onto the frame, warm and restrained. Skipped when the sun is behind the
 *     camera or far off screen, and faded as it approaches the edge (no clamped edge bands).
 *
 * Everything runs at a quarter of the drawing buffer: shafts are soft by nature.
 */

const SAMPLES = 32;
const RAY_LAYER = 6;

const fullscreen = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>, blending: THREE.Blending = THREE.NoBlending) =>
  new THREE.ShaderMaterial({
    uniforms,
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader,
    blending,
    depthTest: false,
    depthWrite: false,
    transparent: blending !== THREE.NoBlending,
    toneMapped: false,
  });

/**
 * `sun` is the lighting direction (towards the sun). The streaks need a source near the frame, and
 * the real sun stands far above it, so the rays radiate from `source`: a point a short way behind the
 * window along the same direction. That is the one deliberate offset from the lighting sun.
 */
export function createSkyRays(renderer: THREE.WebGLRenderer, { sun, sky, source: anchor }: { sun: THREE.Vector3; sky: THREE.Object3D[]; source: THREE.Vector3 }) {
  for (const pane of sky) pane.layers.enable(RAY_LAYER);
  const mask = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: true });
  const rays = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
  const black = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });

  const march = fullscreen(
    /* glsl */ `
    #define SAMPLES ${SAMPLES}
    uniform sampler2D tMask;
    uniform vec2 uSun;
    uniform float uAspect;
    varying vec2 vUv;
    /* Stable per-pixel jitter breaks up the sample bands without shimmering. */
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 step = (vUv - uSun) * 0.92 / float(SAMPLES);
      vec2 uv = vUv - step * hash(gl_FragCoord.xy);
      float sum = 0.0, weightSum = 0.0, weight = 1.0;
      for (int i = 0; i < SAMPLES; i++) {
        uv -= step;
        if (all(greaterThanEqual(uv, vec2(0.0))) && all(lessThanEqual(uv, vec2(1.0))))
          sum += texture2D(tMask, uv).r * weight;
        weightSum += weight;
        weight *= 0.955;
      }
      /* Aspect-correct radial falloff from the source. */
      vec2 d = (vUv - uSun) * vec2(uAspect, 1.0);
      float falloff = 1.0 - smoothstep(0.15, 1.35, length(d));
      gl_FragColor = vec4(vec3(sum / max(weightSum, 1e-4) * falloff), 1.0);
    }`,
    { tMask: { value: mask.texture }, uSun: { value: new THREE.Vector2() }, uAspect: { value: 1 } },
  );
  const composite = fullscreen(
    /* glsl */ `
    uniform sampler2D tRays;
    uniform vec3 uTint;
    uniform float uStrength;
    varying vec2 vUv;
    void main() { gl_FragColor = vec4(uTint * texture2D(tRays, vUv).r * uStrength, 1.0); }`,
    { tRays: { value: rays.texture }, uTint: { value: new THREE.Color(1, 0.9, 0.74) }, uStrength: { value: 0 } },
    THREE.AdditiveBlending,
  );
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  quad.frustumCulled = false;
  const quadScene = new THREE.Scene();
  quadScene.add(quad);
  const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const source = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const clear = new THREE.Color();
  const lastView = new THREE.Matrix4();
  let age = 0;

  return {
    setSize(drawingWidth: number, drawingHeight: number) {
      age = 0;
      const w = Math.max(1, Math.round(drawingWidth / 4));
      const h = Math.max(1, Math.round(drawingHeight / 4));
      mask.setSize(w, h);
      rays.setSize(w, h);
    },
    /** Draws the rays onto the frame already on screen. `strength` 0 skips the work entirely. */
    render(scene: THREE.Scene, camera: THREE.PerspectiveCamera, strength: number, hide: (THREE.Object3D | null | undefined)[] = []) {
      if (strength < 0.01) return;
      camera.getWorldDirection(forward);
      if (forward.dot(sun) <= 0.02) return; // the sun is behind the camera
      source.copy(anchor).project(camera);
      // Fade as the sun nears and leaves the frame; a small overscan keeps a just-off-screen sun.
      const off = Math.max(Math.abs(source.x), Math.abs(source.y));
      const fade = 1 - THREE.MathUtils.smoothstep(off, 1.05, 1.7);
      if (fade * strength < 0.01) return;
      composite.uniforms.uStrength.value = strength * fade;
      // Shafts are soft and the idle drift is tiny: rebuild the mask and march every third frame,
      // or at once on a real camera move. The composite below still runs every frame.
      const moved = !lastView.elements.every((v, i) => Math.abs(v - camera.matrixWorld.elements[i]) < 4e-3);
      if (!moved && ++age % 3 !== 1) { // offset from the lake mirror (every third frame, at 0)
        const target = renderer.getRenderTarget();
        const autoClear = renderer.autoClear;
        renderer.autoClear = false;
        quad.material = composite;
        renderer.setRenderTarget(target);
        renderer.render(quadScene, quadCamera);
        renderer.autoClear = autoClear;
        return;
      }
      lastView.copy(camera.matrixWorld);
      march.uniforms.uSun.value.set(source.x * 0.5 + 0.5, source.y * 0.5 + 0.5);
      march.uniforms.uAspect.value = camera.aspect;

      const previousTarget = renderer.getRenderTarget();
      const previousAutoClear = renderer.autoClear;
      const previousAlpha = renderer.getClearAlpha();
      renderer.getClearColor(clear);
      const background = scene.background;
      const override = scene.overrideMaterial;
      const layers = camera.layers.mask;

      scene.background = null;
      // Haze planes and overlays would become solid black occluders in the mask.
      const hidden = hide.filter((o): o is THREE.Object3D => !!o?.visible);
      for (const o of hidden) o.visible = false;
      renderer.setRenderTarget(mask);
      renderer.setClearColor(0x000000, 1);
      renderer.clear();
      renderer.autoClear = false;
      scene.overrideMaterial = black;
      renderer.render(scene, camera);
      camera.layers.set(RAY_LAYER);
      scene.overrideMaterial = white;
      renderer.render(scene, camera);
      camera.layers.mask = layers;
      scene.overrideMaterial = override;
      scene.background = background;
      for (const o of hidden) o.visible = true;

      quad.material = march;
      renderer.setRenderTarget(rays);
      renderer.render(quadScene, quadCamera);
      quad.material = composite;
      renderer.setRenderTarget(previousTarget);
      renderer.render(quadScene, quadCamera);

      renderer.autoClear = previousAutoClear;
      renderer.setClearColor(clear, previousAlpha);
    },
    dispose() {
      mask.dispose();
      rays.dispose();
      black.dispose();
      white.dispose();
      march.dispose();
      composite.dispose();
      quad.geometry.dispose();
    },
  };
}
