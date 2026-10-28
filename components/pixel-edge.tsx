// Pixel-stepped teeth leading the paper sheet. A fixed 4px pixel keeps it crisp at any
// width: the tile repeats instead of stretching.
const PX = 4;
const TILE_H = 8;
const HEIGHTS = [3, 4, 5, 6, 8, 6, 5, 4, 3, 4, 5, 7, 5, 3, 2, 2, 3, 5, 6, 7, 6, 4, 3, 3, 4, 6, 8, 7, 5, 4, 3, 2];

const top = HEIGHTS.map((h, x) => `M${x * PX} ${(TILE_H - h) * PX}h${PX}v${PX}h-${PX}z`).join("");
const body = HEIGHTS.map((h, x) => `M${x * PX} ${(TILE_H - h + 1) * PX}h${PX}v${(h - 1) * PX}h-${PX}z`).join("");

export function PixelEdge() {
  return (
    <svg className="pixel-edge" aria-hidden="true" focusable="false" shapeRendering="crispEdges">
      <defs>
        <pattern id="pixel-teeth" width={HEIGHTS.length * PX} height={TILE_H * PX} patternUnits="userSpaceOnUse">
          <path className="fill-paper" d={body} />
          <path className="fill-lavender" d={top} />
        </pattern>
      </defs>
      <rect width="100%" height={TILE_H * PX} fill="url(#pixel-teeth)" />
    </svg>
  );
}
