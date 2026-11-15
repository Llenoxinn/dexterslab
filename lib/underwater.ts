import * as THREE from "three";

/*
 * Under the lake (after the 3d-underwater-god-rays mechanism, ported from its shipped module).
 *
 * One drifting swell field, sampled across the sun direction, is integrated along every view ray:
 * the shafts are parallel columns in the world, so they converge on the sun and slide past the
 * lobby as the camera moves (painted in screen space they would stay locked to the lens). The same
 * field draws the surface seen from below. The march runs at a third of the drawing buffer into a
 * HalfFloat target; the composite adds the surface underside and the upsampled shafts over the frame.
 *
 * Constants are the module's shipped values; only the colours move to the site's blues.
 */

const LIGHT_GLSL = /* glsl */ `
uniform float uSurfaceY, uShaftScale;
float swell(vec2 p, float t) {
  p += .62 * vec2(sin(p.y * .57 + t * .21), sin(p.x * .49 - t * .17));
  return (sin(dot(p, vec2(.86, .51)) + t * .29)
        + sin(dot(p, vec2(-.42, .91)) * 1.23 - t * .24)
        + sin(dot(p, vec2(.13, -.99)) * .87 + t * .19)
        + sin(dot(p, vec2(-.97, -.24)) * 1.41 - t * .15)) * .25;
}
vec2 acrossSun(vec3 p) {
  vec3 ex = normalize(cross(uSunDirection, vec3(0., 1., 0.))), ey = cross(ex, uSunDirection);
  return vec2(dot(p, ex), dot(p, ey)) * uShaftScale;
}
/* Sparse peaks, not ridges: a ridge web averages into flat haze along a ray. */
float shaftFocus(vec3 p, float t) {
  float depth = max((uSurfaceY - p.y) / max(uSunDirection.y, .2), 0.);
  float focus = smoothstep(-.05, 1., swell(acrossSun(p), t));
  return focus * focus * exp(-depth * .012);
}
float shaftWeb(vec3 p, float t) { return pow(1. - abs(swell(acrossSun(p) * 2.6 + vec2(3.1, 7.7), t * 1.35)), 5.); }
float shaftLight(vec3 p, float t) { return shaftFocus(p, t) * (.45 + .9 * shaftWeb(p, t)); }
`;

const VERTEX = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }";

const MARCH = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec3 uSunDirection, uCameraPosition, uShaftColor;
uniform mat4 uCameraWorld, uInverseProjection;
uniform float uTime, uShaftGain;
${LIGHT_GLSL}
void main() {
  vec4 viewRay = uInverseProjection * vec4(vUv * 2. - 1., 1., 1.);
  vec3 ray = normalize((uCameraWorld * vec4(viewRay.xyz, 0.)).xyz);
  /* Stable per-pixel phase: no banding, no frame-to-frame shimmer. */
  float jitter = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715))));
  const float NEAR = 4., FAR = 54.;
  float total = 0., weights = 0.;
  for (int i = 0; i < 26; i++) {
    float f = (float(i) + jitter) / 26.;
    float t = NEAR + (FAR - NEAR) * f * f;
    vec3 p = uCameraPosition + ray * t;
    if (p.y > uSurfaceY) break;
    float w = exp(-t * .06) * (.08 + f);
    total += shaftLight(p, uTime) * w;
    weights += w;
  }
  total /= max(weights, .0001);
  float mu = max(dot(ray, uSunDirection), 0.);
  total = mix(total, .16, pow(mu, 28.));
  float phase = .7 + 1.1 * pow(mu, 5.) + .9 * pow(mu, 40.);
  float below = mix(.45, 1., smoothstep(-.45, .35, ray.y));
  gl_FragColor = vec4(uShaftColor * total * phase * below * uShaftGain, 1.);
}`;

const COMPOSITE = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec3 uSunDirection, uCameraPosition, uSurfaceTint;
uniform mat4 uCameraWorld, uInverseProjection;
uniform float uTime, uAmount;
uniform sampler2D uShafts;
uniform vec2 uShaftTexel;
${LIGHT_GLSL}
vec2 surfaceRipple(vec2 p, float t) {
  vec2 a = vec2(.83, .56), b = vec2(-.51, .86), c = vec2(.11, -.99);
  return a * cos(dot(p, a) * 2.1 + t * .9) * .50 + b * cos(dot(p, b) * 2.9 - t * 1.1) * .34 + c * cos(dot(p, c) * 3.8 + t * 1.3) * .22
       + vec2(cos(p.y * .61 + t * .3), cos(p.x * .55 - t * .25)) * .35;
}
/* The underside of the surface: a dark mirror broken by facets that open toward the sun. */
vec3 surfaceUnderside(vec3 ray) {
  if (ray.y <= .015) return vec3(0.);
  float d = (uSurfaceY - uCameraPosition.y) / ray.y;
  vec2 s = uCameraPosition.xz + ray.xz * d;
  vec2 slope = surfaceRipple(s * .9, uTime);
  float detail = 1. - smoothstep(.35, 1.6, length(fwidth(s)) * .9);
  float fog = exp(-d * .028);
  float facet = dot(slope, normalize(uSunDirection.xz + vec2(.0001)));
  vec2 w = s * 1.15;
  float network = pow(1. - abs(swell(w, uTime * 1.6)), 8.) * .75 + pow(1. - abs(swell(w * 1.9 + vec2(4.3, 1.9), uTime * 2.1)), 10.) * .55;
  float glow = pow(max(dot(ray, uSunDirection), 0.), 5.);
  float sheet = (smoothstep(.3, 1.05, facet) * .6 + network) * detail + pow(1. - abs(swell(s * .33, uTime * 1.4)), 6.) * .3;
  return uSurfaceTint * sheet * fog * (.18 + .82 * glow) * smoothstep(.015, .10, ray.y);
}
void main() {
  vec4 viewRay = uInverseProjection * vec4(vUv * 2. - 1., 1., 1.);
  vec3 ray = normalize((uCameraWorld * vec4(viewRay.xyz, 0.)).xyz);
  vec2 o = uShaftTexel * .5;
  vec3 shafts = (texture2D(uShafts, vUv + o).rgb + texture2D(uShafts, vUv - o).rgb
               + texture2D(uShafts, vUv + vec2(o.x, -o.y)).rgb + texture2D(uShafts, vUv - vec2(o.x, -o.y)).rgb) * .25;
  gl_FragColor = vec4((surfaceUnderside(ray) + shafts) * uAmount, 1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function createUnderwater(renderer: THREE.WebGLRenderer, options: { surfaceY: number; sun: THREE.Vector3 }) {
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
  const shared = {
    uSunDirection: { value: options.sun.clone().normalize() },
    uCameraPosition: { value: new THREE.Vector3() },
    uCameraWorld: { value: new THREE.Matrix4() },
    uInverseProjection: { value: new THREE.Matrix4() },
    uTime: { value: 0 },
    uSurfaceY: { value: options.surfaceY },
    uShaftScale: { value: 1.3 },
  };
  const march = new THREE.ShaderMaterial({
    uniforms: { ...shared, uShaftColor: { value: new THREE.Color(0.2, 0.3, 0.62) }, uShaftGain: { value: 3.6 } },
    vertexShader: VERTEX,
    fragmentShader: MARCH,
    depthTest: false,
    depthWrite: false,
  });
  const composite = new THREE.ShaderMaterial({
    uniforms: {
      ...shared,
      uSurfaceTint: { value: new THREE.Color(0.11, 0.17, 0.36) },
      uShafts: { value: target.texture },
      uShaftTexel: { value: new THREE.Vector2(1, 1) },
      uAmount: { value: 0 },
    },
    vertexShader: VERTEX,
    fragmentShader: COMPOSITE,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), march);
  quad.frustumCulled = false;
  const quadScene = new THREE.Scene();
  quadScene.add(quad);
  const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  return {
    setSize(drawingWidth: number, drawingHeight: number) {
      const w = Math.max(1, Math.ceil(drawingWidth * 0.35));
      const h = Math.max(1, Math.ceil(drawingHeight * 0.35));
      target.setSize(w, h);
      composite.uniforms.uShaftTexel.value.set(1 / w, 1 / h);
    },
    /** Adds the shafts and the surface underside over the frame on screen. `amount` 0 skips all work. */
    render(camera: THREE.PerspectiveCamera, time: number, amount: number) {
      if (amount < 0.01) return;
      shared.uTime.value = time;
      shared.uCameraPosition.value.copy(camera.position);
      shared.uCameraWorld.value.copy(camera.matrixWorld);
      shared.uInverseProjection.value.copy(camera.projectionMatrixInverse);
      composite.uniforms.uAmount.value = amount;
      const previous = renderer.getRenderTarget();
      const autoClear = renderer.autoClear;
      quad.material = march;
      renderer.setRenderTarget(target);
      renderer.autoClear = true;
      renderer.render(quadScene, quadCamera);
      quad.material = composite;
      renderer.setRenderTarget(previous);
      renderer.autoClear = false;
      renderer.render(quadScene, quadCamera);
      renderer.autoClear = autoClear;
    },
    dispose() {
      target.dispose();
      march.dispose();
      composite.dispose();
      quad.geometry.dispose();
    },
  };
}
