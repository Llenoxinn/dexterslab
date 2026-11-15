import * as THREE from "three";

/*
 * The lab stands in a still lake (after the 3d-ultra-realistic-water mechanism, scaled down from an
 * open sea to a pond around a diorama):
 *
 *  - The surface is a flat plane; its normal is shaded per pixel from the analytic derivatives of a
 *    small Gerstner-style sum, so ripples stay sharp however coarse the mesh is.
 *  - Every wave fades out once its wavelength falls below the pixel footprint, so the far water
 *    settles into calm sheen instead of boiling into moiré.
 *  - Reflection is Schlick with water's F0 (0.02) over a half-resolution planar mirror of the room,
 *    nudged by the ripple normal. The sun leaves an HDR glitter path for the tone mapper to clip.
 *  - The lake has no shoreline: it dissolves into the page colour, like the clay model's table.
 */

export type LakeOptions = {
  /** Water level (world y). The floor slab spans -0.4..0, so the room stands in the shallows. */
  level: number;
  /** Room footprint centre and half extents on the water (x, z). */
  room: { x: number; z: number; halfW: number; halfD: number };
  /** Unit vector towards the sun. */
  sun: THREE.Vector3;
};

const WAVES = 7;

export function createLake(renderer: THREE.WebGLRenderer, { level, room, sun }: LakeOptions) {
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
  const mirror = new THREE.PerspectiveCamera();
  const clip = new THREE.Plane(new THREE.Vector3(0, 1, 0), -level + 0.04);
  const bias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
  const forward = new THREE.Vector3();
  const up = new THREE.Vector3();

  // Ripples: wavelength shrinks 0.64x a step, headings spread around the breeze (world units ≈ metres).
  const spectrum = Array.from({ length: WAVES }, (_, i) => {
    const length = 3.4 * Math.pow(0.64, i);
    const heading = 0.6 + [0, 0.4, -0.3, 0.66, -0.54, 0.21, -0.86][i];
    return new THREE.Vector4(Math.cos(heading), Math.sin(heading), length, 0.022 * Math.pow(0.72, i));
  });

  const uniforms = {
    uTime: { value: 0 },
    uReflection: { value: target.texture },
    uMirror: { value: new THREE.Matrix4() },
    uSun: { value: sun.clone().normalize() },
    uRoom: { value: new THREE.Vector4(room.x, room.z, room.halfW, room.halfD) },
    uWaves: { value: spectrum },
    uFade: { value: 1 },
    uDark: { value: 0 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      uniform mat4 uMirror;
      varying vec3 vWorld;
      varying vec4 vMirror;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        vMirror = uMirror * world;
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: /* glsl */ `
      #define WAVES ${WAVES}
      uniform float uTime;
      uniform sampler2D uReflection;
      uniform vec3 uSun;
      uniform vec4 uRoom;
      uniform vec4 uWaves[WAVES];
      uniform float uFade;
      uniform float uDark;
      varying vec3 vWorld;
      varying vec4 vMirror;

      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }

      void main() {
        vec2 p = vWorld.xz;
        /* Pixel footprint: below ~1/3 of a wavelength a ripple can no longer be resolved. */
        float footprint = 2.0 * (fwidth(p.x) + fwidth(p.y));
        vec2 slope = vec2(0.0);
        for (int i = 0; i < WAVES; i++) {
          vec4 w = uWaves[i];
          float k = 6.2831853 / w.z;
          float omega = sqrt(9.81 * k) * 0.55;
          float fade = 1.0 - smoothstep(0.18 * w.z, 0.5 * w.z, footprint);
          float phase = k * dot(w.xy, p) - omega * uTime;
          slope += w.xy * (w.w * k * cos(phase) * fade);
        }
        vec3 N = normalize(vec3(-slope.x, 1.0, -slope.y));

        /* Distance from the slab: shallow and lit at the room, deep further out. */
        vec2 q = abs(p - uRoom.xy) - uRoom.zw;
        float edge = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);

        vec3 V = normalize(cameraPosition - vWorld);
        float cosT = max(dot(N, V), 0.0);
        float fresnel = 0.02 + 0.98 * pow(1.0 - cosT, 5.0);

        float dist = length(cameraPosition - vWorld);
        vec2 uv = vMirror.xy / vMirror.w + N.xz * vec2(0.06, 0.03) * clamp(30.0 / dist, 0.2, 1.0);
        vec3 mirrored = texture2D(uReflection, uv).rgb;

        /* Body: the page's lavender in the shallows, DOS blue in the deep. Linear colours. */
        vec3 shallow = mix(vec3(0.20, 0.24, 0.80), vec3(0.04, 0.05, 0.20), uDark);
        vec3 deep = mix(vec3(0.02, 0.022, 0.36), vec3(0.006, 0.008, 0.08), uDark);
        vec3 body = mix(shallow, deep, smoothstep(0.0, 6.0, edge));
        /* Sunlight scattering up through the ripple faces that lean towards the sun. */
        body += vec3(0.05, 0.12, 0.35) * max(dot(N.xz, normalize(uSun.xz)), 0.0) * 6.0 * (1.0 - smoothstep(0.0, 10.0, edge));

        /* A still lake mirrors strongly at the camera's angle; the clay world wants the room legible
           in the water, so the reflection gets a floor above the physical Fresnel. */
        float mirrorWeight = clamp(fresnel + 0.42, 0.0, 1.0);
        vec3 colour = mix(body, mirrored, mirrorWeight);

        /* Glitter: an HDR sun path, broken by the ripples. */
        vec3 R = reflect(-V, N);
        float rl = max(dot(R, uSun), 0.0);
        colour += vec3(4.2, 3.4, 2.4) * (pow(rl, 90.0) * 0.6 + pow(rl, 1400.0) * 14.0) * (1.0 - 0.7 * uDark);

        /* Contact: the slab darkens the water hugging it, and a lacy wet line laps at the edge. */
        colour *= mix(0.55, 1.0, smoothstep(0.0, 0.9, edge));
        float lap = noise(p * 7.0 + vec2(uTime * 0.35, -uTime * 0.2)) * 0.6 + noise(p * 19.0 - uTime * 0.5) * 0.4;
        float foam = smoothstep(0.6, 0.78, lap + (1.0 - smoothstep(0.0, 0.18, edge)) * 0.4) * (1.0 - smoothstep(0.04, 0.24, edge));
        colour = mix(colour, vec3(0.95, 0.96, 1.0) * (1.0 - 0.6 * uDark), foam * 0.55);

        /* No shore: the lake dissolves into the page. */
        float alpha = (1.0 - smoothstep(5.0, 19.0, edge)) * uFade;
        gl_FragColor = vec4(colour, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), material);
  mesh.name = "lake";
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(room.x, level, room.z);
  mesh.renderOrder = -1; // under the transparent glassware, over the cleared page
  mesh.frustumCulled = false;

  const hidden: THREE.Object3D[] = [];
  const lastView = new THREE.Matrix4();
  let frame = 0;

  return {
    mesh,
    uniforms,
    setSize(drawingWidth: number, drawingHeight: number) {
      // The ripples break the mirror up anyway; a third of the resolution is indistinguishable.
      target.setSize(Math.max(1, Math.round(drawingWidth * 0.35)), Math.max(1, Math.round(drawingHeight * 0.35)));
      frame = 0;
    },
    /** Mirror the scene through the water plane into the reflection target. Call before the main pass. */
    renderReflection(scene: THREE.Scene, camera: THREE.PerspectiveCamera, alsoHide: (THREE.Object3D | null | undefined)[] = []) {
      // A still camera re-mirrors every other frame; any camera move re-mirrors at once.
      const moved = !lastView.equals(camera.matrixWorld);
      if (!moved && frame++ % 2 === 1) return;
      lastView.copy(camera.matrixWorld);
      mirror.position.set(camera.position.x, 2 * level - camera.position.y, camera.position.z);
      forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
      forward.y = -forward.y;
      up.set(0, 1, 0).applyQuaternion(camera.quaternion);
      up.y = -up.y;
      mirror.up.copy(up);
      mirror.lookAt(forward.add(mirror.position));
      mirror.fov = camera.fov;
      mirror.aspect = camera.aspect;
      mirror.near = camera.near;
      mirror.far = camera.far;
      mirror.updateProjectionMatrix();
      mirror.updateMatrixWorld();
      uniforms.uMirror.value.copy(bias).multiply(mirror.projectionMatrix).multiply(mirror.matrixWorldInverse);

      hidden.length = 0;
      for (const o of [mesh, ...alsoHide]) if (o?.visible) { o.visible = false; hidden.push(o); }
      const previous = renderer.getRenderTarget();
      renderer.clippingPlanes = [clip];
      renderer.setRenderTarget(target);
      renderer.render(scene, mirror);
      renderer.clippingPlanes = [];
      renderer.setRenderTarget(previous);
      for (const o of hidden) o.visible = true;
    },
    dispose() {
      target.dispose();
      mesh.geometry.dispose();
      material.dispose();
    },
  };
}
