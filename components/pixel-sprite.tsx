import type { SVGProps } from "react";
import { pixelPath } from "@/lib/pixel";

// A multi-colour pixel drawing: one path per colour key in `palette`.
export function PixelSprite({
  rows,
  palette,
  ...props
}: { rows: readonly string[]; palette: Record<string, string> } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox={`0 0 ${rows[0].length} ${rows.length}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {Object.entries(palette).map(([key, color]) => (
        <path key={key} d={pixelPath(rows, key)} style={{ fill: color }} />
      ))}
    </svg>
  );
}
