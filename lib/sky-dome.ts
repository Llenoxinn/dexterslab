import * as THREE from "three";

/*
 * The sky around the lab (after the 3d-sky-background mechanism): an inward-facing dome whose colour
 * comes from the view direction alone. A warm pale horizon rises through a muted lavender band into a
 * cooler zenith; below the horizon it settles into the same haze the lake dissolves into, so there is
 * no hard edge. The sun term shares the one sun direction the light, rays and lake glitter use: a
 * broad warm halo plus a small, soft core (never a white blob).
 *
 * The dome follows the camera's position (no parallax) and keeps world orientation. `uFade` lets it
 * drain away with the room, back to the page colour behind it.
 */
export function createSkyDome(sun: THREE.Vector3) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uSun: { value: sun.clone().normalize() },
      uFade: { value: 1 },
      uDark: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 world = modelMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * viewMatrix * world;
        gl_Position.z = gl_Position.w * 0.9999; /* always behind the scene */
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSun;
      uniform float uFade;
      uniform float uDark;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        /* Day: linear colours. Night: the same bands, a whole value range lower. */
        vec3 horizon = mix(vec3(0.94, 0.86, 0.76), vec3(0.06, 0.06, 0.2), uDark);
        vec3 band = mix(vec3(0.66, 0.66, 0.9), vec3(0.025, 0.028, 0.12), uDark);
        vec3 zenith = mix(vec3(0.42, 0.47, 0.92), vec3(0.008, 0.01, 0.05), uDark);
        vec3 haze = mix(vec3(0.83, 0.82, 0.9), vec3(0.03, 0.035, 0.12), uDark);
        vec3 sky = mix(horizon, band, smoothstep(0.0, 0.22, h));
        sky = mix(sky, zenith, smoothstep(0.22, 0.85, h));
        sky = mix(haze, sky, smoothstep(-0.04, 0.03, h));
        float s = max(dot(d, normalize(uSun)), 0.0);
        sky += vec3(1.0, 0.82, 0.6) * (pow(s, 6.0) * 0.32 + pow(s, 120.0) * 0.9) * (1.0 - 0.85 * uDark);
        gl_FragColor = vec4(sky, uFade);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide,
    depthWrite: false,
    transparent: true,
    fog: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(150, 48, 24), material);
  mesh.name = "sky-dome";
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  return {
    mesh,
    uniforms: material.uniforms as { uSun: THREE.IUniform<THREE.Vector3>; uFade: THREE.IUniform<number>; uDark: THREE.IUniform<number> },
    /** Keep the dome centred on the viewer. */
    follow(camera: THREE.Camera) {
      mesh.position.copy(camera.position);
    },
    dispose() {
      mesh.geometry.dispose();
      material.dispose();
    },
  };
}
