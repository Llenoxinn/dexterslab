import * as THREE from "three";

/**
 * Cartoon-lab set dressing for the hero, after the classic "secret lab" look:
 * stage spotlights with visible beams, curly cables dangling from the ceiling, and a teleporter pad.
 * Everything shares the lab's renderer, clock and disposal (the hero disposes every mesh it finds).
 */

const beamVertex = /* glsl */ `
  varying float vAlong;
  varying float vFacing;
  void main() {
    vAlong = uv.y;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * normal);
    vFacing = abs(dot(n, normalize(-mv.xyz)));
    gl_Position = projectionMatrix * mv;
  }
`;
const beamFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uStrength;
  varying float vAlong;
  varying float vFacing;
  void main() {
    float body = pow(vFacing, 1.6);
    float fall = 0.25 + 0.75 * pow(vAlong, 1.4);
    gl_FragColor = vec4(uColor, uStrength * body * fall);
  }
`;

function starShape(outer: number, inner: number) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? inner : outer;
    if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  shape.closePath();
  return shape;
}

export function createCartoonLab(root: THREE.Group, palette: { deep: THREE.Material; paper: THREE.Material; neon: THREE.Material }) {
  const set = new THREE.Group();
  set.name = "cartoon-lab";
  root.add(set);

  /* ── Stage spotlights ─────────────────────────────────────────────── */
  const canMat = new THREE.MeshStandardMaterial({ color: 0x1b2266, roughness: 0.5, metalness: 0.4 });
  const lensMat = new THREE.MeshBasicMaterial({ color: 0xfff1c4, toneMapped: false });
  const beams: Array<{
    rig: THREE.Group;
    cone: THREE.Mesh;
    light: THREE.SpotLight;
    origin: THREE.Vector3;
    base: THREE.Vector3;
    sweep: [number, number];
    phase: number;
  }> = [];
  const down = new THREE.Vector3(0, -1, 0);
  const aim = new THREE.Vector3();
  const target = new THREE.Vector3();

  for (const [origin, base, sweep, phase] of [
    [new THREE.Vector3(-0.4, 6.4, -1.0), new THREE.Vector3(0.9, 1.0, -3.0), [0.45, 0.25], 0],
    [new THREE.Vector3(-3.6, 6.4, 2.4), new THREE.Vector3(-2.4, 0.7, 0.8), [0.35, 0.3], 2.1],
    [new THREE.Vector3(3.2, 6.4, 2.6), new THREE.Vector3(4.6, 0.5, 0.3), [0.4, 0.3], 4.2],
  ] as const) {
    const rig = new THREE.Group();
    rig.position.copy(origin);
    set.add(rig);
    // A chunky theatre can on a yoke, like the lab's stage lights.
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 0.5, 20), canMat);
    can.position.y = 0.05;
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.25, 20), lensMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.y = -0.205;
    rig.add(can, lens);

    const coneGeo = new THREE.ConeGeometry(1, 1, 36, 1, true);
    coneGeo.translate(0, -0.5, 0); // apex at the lamp, opening downwards
    const cone = new THREE.Mesh(
      coneGeo,
      new THREE.ShaderMaterial({
        vertexShader: beamVertex,
        fragmentShader: beamFragment,
        uniforms: { uColor: { value: new THREE.Color(0xffd979) }, uStrength: { value: 0.3 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    );
    cone.renderOrder = 2;
    set.add(cone);

    const light = new THREE.SpotLight(0xffdc8a, 80, 16, 0.26, 0.5, 1.3);
    light.position.copy(origin);
    set.add(light, light.target);
    beams.push({ rig, cone, light, origin: origin.clone(), base: base.clone(), sweep: [...sweep] as [number, number], phase });
  }

  const aimBeams = (t: number) => {
    for (const beam of beams) {
      target.set(
        beam.base.x + Math.sin(t * 0.32 + beam.phase) * beam.sweep[0],
        beam.base.y,
        beam.base.z + Math.cos(t * 0.27 + beam.phase) * beam.sweep[1],
      );
      aim.subVectors(target, beam.origin);
      const length = aim.length() + 0.6; // reach the floor beneath the target
      aim.normalize();
      beam.rig.quaternion.setFromUnitVectors(down, aim);
      beam.cone.position.copy(beam.origin);
      beam.cone.quaternion.copy(beam.rig.quaternion);
      const radius = Math.tan(0.24) * length;
      beam.cone.scale.set(radius, length, radius);
      beam.light.target.position.copy(target);
    }
  };
  aimBeams(0);

  /* ── Curly cables dangling from the ceiling ───────────────────────── */
  const cables: THREE.Group[] = [];
  for (const [x, z, drop, color, turns] of [
    [-5.4, -2.2, 2.0, 0x7cf0dc, 7],
    [-1.2, -3.2, 1.4, 0xff8fc7, 6],
    [2.6, -3.4, 1.7, 0x7cf0dc, 8],
    [6.0, -0.6, 2.2, 0xb9a6ff, 7],
  ] as const) {
    const hang = new THREE.Group();
    hang.position.set(x, 7.2, z);
    set.add(hang);
    const points: THREE.Vector3[] = [];
    const steps = turns * 14;
    for (let i = 0; i <= steps; i++) {
      const s = i / steps;
      const a = s * turns * Math.PI * 2;
      const r = 0.09 + 0.03 * Math.sin(s * Math.PI);
      points.push(new THREE.Vector3(Math.cos(a) * r + Math.sin(s * Math.PI) * 0.35, -s * (2.4 + drop), Math.sin(a) * r));
    }
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), steps * 3, 0.022, 6, false),
      new THREE.MeshStandardMaterial({ color, roughness: 0.4, emissive: color, emissiveIntensity: 0.12 }),
    );
    hang.add(mesh);
    const plug = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.18, 12), palette.deep);
    plug.position.copy(points[points.length - 1]).add(new THREE.Vector3(0, -0.06, 0));
    hang.add(plug);
    hang.userData.phase = x;
    cables.push(hang);
  }

  /* ── Teleporter pad with rising rings and a floating holo parol ───── */
  const pad = new THREE.Group();
  pad.name = "teleporter-pad";
  pad.position.set(0.6, 0, 0.35);
  set.add(pad);
  const padBase = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.16, 40), palette.deep);
  padBase.position.y = 0.08;
  padBase.receiveShadow = true;
  const padTop = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.04, 40), palette.paper);
  padTop.position.y = 0.18;
  const padRing = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 10, 48), palette.neon);
  padRing.rotation.x = Math.PI / 2;
  padRing.position.y = 0.205;
  pad.add(padBase, padTop, padRing);
  const ringGeo = new THREE.TorusGeometry(0.55, 0.02, 8, 48);
  const rings = Array.from({ length: 3 }, (_, i) => {
    const ring = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({ color: 0x7cf0dc, transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.userData.phase = i / 3;
    pad.add(ring);
    return ring;
  });
  const holo = new THREE.Mesh(
    new THREE.ExtrudeGeometry(starShape(0.32, 0.14), { depth: 0.05, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 1 }),
    new THREE.MeshBasicMaterial({ color: 0xffd979, transparent: true, opacity: 0.85, toneMapped: false }),
  );
  holo.geometry.center();
  holo.position.y = 1.15;
  pad.add(holo);

  return {
    set,
    tick(time: number) {
      const t = Number.isFinite(time) ? time : 0;
      aimBeams(t);
      for (const hang of cables) {
        const p = hang.userData.phase as number;
        hang.rotation.z = Math.sin(t * 0.7 + p) * 0.035;
        hang.rotation.x = Math.cos(t * 0.55 + p) * 0.025;
      }
      for (const ring of rings) {
        const c = (t * 0.45 + (ring.userData.phase as number)) % 1;
        ring.position.y = 0.22 + c * 1.5;
        ring.scale.setScalar(1 - c * 0.35);
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.65 * (1 - c);
      }
      holo.rotation.y = t * 0.9;
      holo.position.y = 1.15 + Math.sin(t * 1.6) * 0.06;
    },
  };
}
