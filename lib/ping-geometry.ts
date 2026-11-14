import { FontLoader, type FontData } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import fontData from "../assets/helvetiker_bold.typeface.json" with { type: "json" };

/** Real beveled typography, lit by the same scene and shared by all orbiting replacements. */
export function createPingGeometry() {
  const font = new FontLoader().parse(fontData as FontData);
  const geometry = new TextGeometry("PING", {
    font, size: .43, depth: .11, curveSegments: 4,
    bevelEnabled: true, bevelSegments: 2, bevelThickness: .012, bevelSize: .009,
  });
  geometry.center();
  geometry.computeBoundingSphere();
  return geometry;
}
