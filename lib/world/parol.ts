import * as THREE from "three";
import type { Painter } from "@/lib/world/paint";

/**
 * A parol built the way one is made: a bamboo frame in the shape of a five-point star, papered over so
 * each point is a shallow pyramid, lit from inside, with a hoop of bulbs and two paper tails.
 */

type V3 = [number, number, number];
const HALF_PI = Math.PI / 2;

/** The star's outline: ten points, outer and inner in turn, first point straight up. */
export function starOutline(outer: number, inner: number): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = HALF_PI + (i * Math.PI) / 5;
    points.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }
  return points;
}

/**
 * A faceted star: each of the ten rim edges meets a raised centre on the front and on the back, so the
 * points are pyramids with a ridge down the middle. Colour runs from `core` at the centre to `rim` at
 * the edge, and every other facet is a shade darker: lit from inside, the ridges show as a bevel.
 */
export function starGeometry(outer: number, inner: number, depth: number, rim: number, core: number) {
  const rimPoints = starOutline(outer, inner);
  const positions: number[] = [];
  const colors: number[] = [];
  const cRim = new THREE.Color(rim);
  const cCore = new THREE.Color(core);
  const push = (p: V3, c: THREE.Color, k: number) => {
    positions.push(...p);
    colors.push(c.r * k, c.g * k, c.b * k);
  };
  for (const side of [1, -1]) {
    for (let i = 0; i < 10; i += 1) {
      const a = rimPoints[i];
      const b = rimPoints[(i + 1) % 10];
      const shade = i % 2 === 0 ? 1 : 0.72;
      const apex: V3 = [0, 0, depth * side];
      const first: V3 = [a[0], a[1], 0];
      const second: V3 = [b[0], b[1], 0];
      push(apex, cCore, 1);
      if (side > 0) {
        push(first, cRim, shade);
        push(second, cRim, shade);
      } else {
        push(second, cRim, shade);
        push(first, cRim, shade);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** A paper strip hanging from `from`: a chain of thin slats that sways out and back, banded in two colours. */
function tail(p: Painter, from: V3, size: number, lean: number, a: number, b: number) {
  const segments = 9;
  const length = size * 2.4;
  let [x, y] = from;
  const z = from[2];
  for (let k = 0; k < segments; k += 1) {
    const u = k / segments;
    const step = length / segments;
    const angle = lean * Math.sin(u * Math.PI * 1.2) * 0.55;
    const width = size * (0.2 - u * 0.12);
    const cx = x + Math.sin(angle) * step * 0.5;
    const cy = y - Math.cos(angle) * step * 0.5;
    p.box(width, step * 1.04, size * 0.025, k % 2 === 0 ? a : b, { at: [cx, cy, z], rot: [0, 0, angle], bucket: "glow" });
    x += Math.sin(angle) * step;
    y -= Math.cos(angle) * step;
  }
  // A tassel at the end: a knot and a little fringe.
  p.ball(size * 0.07, b, { at: [x, y, z], bucket: "glow" }, 8);
  for (let i = -2; i <= 2; i += 1) p.box(size * 0.018, size * 0.28, size * 0.018, a, { at: [x + i * size * 0.03, y - size * 0.16, z], rot: [0, 0, i * 0.12], bucket: "glow" });
}

export type ParolColors = { paper: number; trim: number; core?: number; bulbs?: number[] };

/** A whole parol at `at`, facing +z, `size` metres from centre to the top point. */
export function parol(p: Painter, at: V3, size: number, colors: ParolColors, turn = 0) {
  const { paper, trim } = colors;
  const core = colors.core ?? 0xfff4d6;
  const bulbs = colors.bulbs ?? [0xfff0a8, trim];
  const bamboo = 0x6e4a26;
  const inner = size * 0.46;
  const depth = size * 0.3;
  p.push(at, turn);
  p.add(starGeometry(size, inner, depth, paper, core), paper, { bucket: "glow", keep: true });
  const outline = starOutline(size, inner);
  // The bamboo frame along the outline, front and back, and the sticks that hold the two faces apart.
  p.rods(outline.map(([x, y]) => [x, y, size * 0.012]), size * 0.022, bamboo, { bucket: "matte" }, true);
  for (let i = 0; i < 10; i += 2) {
    const [x, y] = outline[i];
    p.rods([[x * 0.98, y * 0.98, 0], [0, 0, depth * 0.98]], size * 0.014, bamboo, { bucket: "matte" });
  }
  // Capiz rosette on the front face: five shells along the ridges, five smaller ones between them.
  for (let i = 0; i < 10; i += 1) {
    const [ox, oy] = outline[i];
    const big = i % 2 === 0;
    const reach = big ? 0.3 : 0.42;
    const zSurface = depth * (1 - reach) + size * 0.03;
    p.add(new THREE.CircleGeometry(size * (big ? 0.075 : 0.05), 12), big ? trim : core, {
      at: [ox * reach, oy * reach, zSurface],
      bucket: "glow",
    });
  }
  p.ball(size * 0.08, trim, { at: [0, 0, depth], bucket: "glow" }, 10);
  // The hoop, with bulbs that chase around it.
  const hoop = size * 1.14;
  p.ring(hoop, size * 0.024, bamboo, { bucket: "matte" }, 40);
  for (let i = 0; i < 14; i += 1) {
    const angle = (i / 14) * Math.PI * 2;
    p.ball(size * 0.05, bulbs[i % bulbs.length], { at: [Math.cos(angle) * hoop, Math.sin(angle) * hoop, size * 0.03], bucket: "blink", phase: (i / 14) * 0.5 }, 6);
  }
  // Tails from the two lower points, swaying apart.
  const [lx, ly] = outline[4];
  const [rx, ry] = outline[6];
  tail(p, [lx * 0.9, ly * 0.9, 0], size, -0.5, paper, trim);
  tail(p, [rx * 0.9, ry * 0.9, 0], size, 0.5, paper, trim);
  // The hanging cord.
  p.cyl(size * 0.012, size * 0.012, 6, 0x0a1246, { at: [0, hoop + 3, 0], ramp: 0 }, 4);
  p.pop();
}
