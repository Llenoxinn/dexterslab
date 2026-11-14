import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CONTACT_PING_POINTS } from "./contact-choreography";

/** A single reusable, extruded pixel word, shared by the orbiting PING replacements. */
export function createPingGeometry() {
  const pixels = CONTACT_PING_POINTS.map(({ x, y }) =>
    new THREE.BoxGeometry(.085, .085, .055).translate(x * .1, y * .1, 0));
  const geometry = mergeGeometries(pixels);
  pixels.forEach((pixel) => pixel.dispose());
  geometry.computeBoundingSphere();
  return geometry;
}
