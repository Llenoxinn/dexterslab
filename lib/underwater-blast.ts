import * as THREE from "three";

/*
 * The BOOM under the lake: what the water does when the lobby blows apart. Everything is scrubbed by
 * blast progress `b` (0 → 1, from scroll), with only a small time wobble on top, so the same scroll
 * gives the same frame forwards and backwards. The motion runs in the vertex shaders, from attributes
 * seeded once; the CPU only sets three uniforms a frame.
 *
 * - shockwave: a thin shell of compressed water racing out from the heart, seen by its bright rim
 * - bubbles:   600 points; most burst from the heart, a third stream off the debris paths (things
 *              that have been under water outgas as they tumble; nothing drips down here)
 * - silt:      800 soft motes kicked up off the floor that billow out and settle, so the lobby
 *              dissolves into murk instead of being cut
 * - flash:     returned to the caller, which lifts its existing lights (no new light: a light added
 *              to the scene would recompile every material in the lab)
 *
 * GLSL comments are block comments only.
 */

const BUBBLES = 600;
const SILT = 800;

const BUBBLE_VERTEX = /* glsl */ `
uniform float uB, uTime, uClear, uScale;
attribute vec3 aKick;
attribute vec4 aParams; /* size, rise, emit, phase */
varying float vAlpha;
void main() {
  float age = max(uB - aParams.z, 0.);
  vec3 p = position + aKick * (1. - exp(-5. * age));
  p.y += aParams.y * age * 14.;
  float w = min(age * 6., 1.);
  p.x += sin(uTime * 2.3 + aParams.w + p.y * 1.7) * .12 * w;
  p.z += cos(uTime * 1.9 + aParams.w * 1.3 + p.y * 1.3) * .12 * w;
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aParams.x * uScale / -mv.z;
  vAlpha = (uB > aParams.z ? 1. : 0.) * smoothstep(0., .03, age) * (1. - smoothstep(.55, 1., age)) * (1. - uClear);
}`;

const BUBBLE_FRAGMENT = /* glsl */ `
varying float vAlpha;
void main() {
  vec2 q = gl_PointCoord * 2. - 1.;
  float d = length(q);
  if (d > 1. || vAlpha < .002) discard;
  /* silver rim (total internal reflection at grazing angles), clear middle, one highlight */
  float rim = smoothstep(.62, .92, d) * (1. - smoothstep(.92, 1., d));
  float hl = 1. - smoothstep(0., .22, length(q - vec2(-.34, .36)));
  float a = (rim * .85 + .06 + hl * .9) * vAlpha;
  gl_FragColor = vec4(mix(vec3(.62, .78, .95), vec3(1.), hl + rim * .4), a);
}`;

const SILT_VERTEX = /* glsl */ `
uniform float uB, uTime, uClear, uScale;
attribute vec3 aOut;
attribute vec4 aParams; /* size, lift, settle, phase */
varying float vAlpha;
void main() {
  float b = max(uB, 0.);
  vec3 p = position + aOut * (1. - exp(-3. * b));
  p.y += aParams.y * (1. - exp(-4. * b)) - aParams.z * b * b;
  p.x += sin(uTime * .3 + aParams.w) * .25 * b;
  p.z += cos(uTime * .25 + aParams.w * 1.7) * .25 * b;
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aParams.x * uScale / -mv.z * (1. + b);
  vAlpha = smoothstep(0., .08, b) * (1. - uClear);
}`;

const SILT_FRAGMENT = /* glsl */ `
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord * 2. - 1.);
  if (d > 1. || vAlpha < .002) discard;
  gl_FragColor = vec4(.42, .38, .32, (1. - d * d) * .07 * vAlpha);
}`;

const SHOCK_VERTEX = /* glsl */ `
varying vec3 vN; varying vec3 vV;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

const SHOCK_FRAGMENT = /* glsl */ `
uniform float uAlpha;
varying vec3 vN; varying vec3 vV;
void main() {
  float f = pow(1. - abs(dot(normalize(vN), normalize(vV))), 4.);
  gl_FragColor = vec4(vec3(.75, .88, 1.) * f * uAlpha, 1.);
}`;

export function createUnderwaterBlast(options: {
  /** The heart of the blast, world space. */
  center: THREE.Vector3;
  /** The lobby's floor, world y. */
  floorY: number;
  /** Where debris piece `i` is at progress `b` (world), and how many pieces there are. */
  debrisAt: (i: number, b: number, out: THREE.Vector3) => THREE.Vector3;
  pieceCount: number;
}) {
  const { center, floorY, debrisAt, pieceCount } = options;
  const group = new THREE.Group();
  group.name = "underwater-blast";
  group.visible = false;
  let seed = 29;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const shared = {
    uB: { value: 0 },
    uTime: { value: 0 },
    uClear: { value: 0 },
    uScale: { value: 600 },
  };

  // Bubbles.
  const bPos = new Float32Array(BUBBLES * 3);
  const bKick = new Float32Array(BUBBLES * 3);
  const bParams = new Float32Array(BUBBLES * 4);
  const at = new THREE.Vector3();
  for (let i = 0; i < BUBBLES; i++) {
    const fromDebris = i % 3 === 0 && pieceCount > 0;
    const emit = fromDebris ? 0.04 + rand() * 0.6 : rand() * 0.08;
    if (fromDebris) debrisAt(Math.floor(rand() * pieceCount), emit, at);
    else at.copy(center).add(new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(0.8));
    bPos.set([at.x, at.y, at.z], i * 3);
    const kick = new THREE.Vector3(rand() - 0.5, rand() * 0.6, rand() - 0.5).normalize().multiplyScalar(fromDebris ? 0.3 : 2 + rand() * 6);
    bKick.set([kick.x, kick.y, kick.z], i * 3);
    // Mostly small; a few big wobbling ones.
    const r = rand();
    bParams.set([0.04 + r * r * r * 0.22, 0.5 + rand() * 0.8, emit, rand() * 6.28], i * 4);
  }
  const bubbleGeometry = new THREE.BufferGeometry();
  bubbleGeometry.setAttribute("position", new THREE.BufferAttribute(bPos, 3));
  bubbleGeometry.setAttribute("aKick", new THREE.BufferAttribute(bKick, 3));
  bubbleGeometry.setAttribute("aParams", new THREE.BufferAttribute(bParams, 4));
  const bubbleMaterial = new THREE.ShaderMaterial({
    uniforms: shared,
    vertexShader: BUBBLE_VERTEX,
    fragmentShader: BUBBLE_FRAGMENT,
    transparent: true,
    depthWrite: false,
  });
  const bubbles = new THREE.Points(bubbleGeometry, bubbleMaterial);
  bubbles.frustumCulled = false;
  bubbles.renderOrder = 3;

  // Silt, kicked up from a ring of floor around the plinths.
  const sPos = new Float32Array(SILT * 3);
  const sOut = new Float32Array(SILT * 3);
  const sParams = new Float32Array(SILT * 4);
  for (let i = 0; i < SILT; i++) {
    const a = rand() * Math.PI * 2;
    const r = 1 + Math.sqrt(rand()) * 8;
    const x = center.x + Math.sin(a) * r;
    const z = center.z + Math.cos(a) * r * 0.8;
    sPos.set([x, floorY + rand() * 0.4, z], i * 3);
    const out = 2 + rand() * 5;
    sOut.set([Math.sin(a) * out, 0, Math.cos(a) * out], i * 3);
    sParams.set([0.35 + rand() * 0.9, 0.4 + rand() * 2.2, 0.3 + rand() * 0.8, rand() * 6.28], i * 4);
  }
  const siltGeometry = new THREE.BufferGeometry();
  siltGeometry.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
  siltGeometry.setAttribute("aOut", new THREE.BufferAttribute(sOut, 3));
  siltGeometry.setAttribute("aParams", new THREE.BufferAttribute(sParams, 4));
  const siltMaterial = new THREE.ShaderMaterial({
    uniforms: shared,
    vertexShader: SILT_VERTEX,
    fragmentShader: SILT_FRAGMENT,
    transparent: true,
    depthWrite: false,
  });
  const silt = new THREE.Points(siltGeometry, siltMaterial);
  silt.frustumCulled = false;
  silt.renderOrder = 2;

  // Shockwave shell.
  const shockMaterial = new THREE.ShaderMaterial({
    uniforms: { uAlpha: { value: 0 } },
    vertexShader: SHOCK_VERTEX,
    fragmentShader: SHOCK_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const shock = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 3), shockMaterial);
  shock.position.copy(center);
  shock.renderOrder = 4;

  group.add(silt, bubbles, shock);

  return {
    group,
    /** Point sizes are in world units; this maps them to pixels for the current view. */
    setViewport(drawingHeight: number, fovDegrees: number) {
      shared.uScale.value = drawingHeight / (2 * Math.tan(THREE.MathUtils.degToRad(fovDegrees) / 2));
    },
    /** Returns the flash (0..1) the caller adds to its lights. */
    update(b: number, time: number, clear: number): number {
      group.visible = b > 0 && clear < 1;
      shared.uB.value = b;
      shared.uTime.value = time;
      shared.uClear.value = clear;
      const wave = b / 0.25;
      shock.visible = wave > 0 && wave < 1;
      if (shock.visible) {
        shock.scale.setScalar(0.5 + 40 * b * (1 - 0.35 * wave));
        shockMaterial.uniforms.uAlpha.value = (1 - wave) * (1 - wave) * 1.4;
      }
      return b > 0 ? Math.exp(-b * 18) : 0;
    },
    dispose() {
      bubbleGeometry.dispose();
      bubbleMaterial.dispose();
      siltGeometry.dispose();
      siltMaterial.dispose();
      shock.geometry.dispose();
      shockMaterial.dispose();
    },
  };
}
