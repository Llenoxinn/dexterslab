import type { SVGProps } from "react";
import { pixelPath } from "@/lib/pixel";
import { ARROW_UP, BEAKER, BOLT, CHEVRON, ENVELOPE, FLASK, MAGNIFIER, TESLA, TUBES } from "@/lib/pixel-art";

type IconProps = SVGProps<SVGSVGElement>;

function pixelIcon(rows: readonly string[]) {
  const d = pixelPath(rows);
  const viewBox = `0 0 ${rows[0].length} ${rows.length}`;
  return function PixelIcon(props: IconProps) {
    return (
      <svg
        viewBox={viewBox}
        fill="currentColor"
        shapeRendering="crispEdges"
        aria-hidden="true"
        focusable="false"
        {...props}
      >
        <path d={d} />
      </svg>
    );
  };
}

export const FlaskIcon = pixelIcon(FLASK);
export const BeakerIcon = pixelIcon(BEAKER);
export const TubesIcon = pixelIcon(TUBES);
export const TeslaIcon = pixelIcon(TESLA);
export const BoltIcon = pixelIcon(BOLT);
export const EnvelopeIcon = pixelIcon(ENVELOPE);
export const MagnifierIcon = pixelIcon(MAGNIFIER);
export const ArrowUpIcon = pixelIcon(ARROW_UP);
export const ChevronIcon = pixelIcon(CHEVRON);

// Brand marks stay official (not pixelated), per their usage guidelines.
function brandMark(viewBox: string, d: string) {
  return function BrandMark(props: IconProps) {
    return (
      <svg viewBox={viewBox} fill="currentColor" aria-hidden="true" focusable="false" {...props}>
        <path d={d} />
      </svg>
    );
  };
}

export const GitHubMark = brandMark(
  "0 0 24 24",
  "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
);

export const LinkedInMark = brandMark(
  "0 0 128 128",
  "M116 3H12a8.91 8.91 0 00-9 8.8v104.42a8.91 8.91 0 009 8.78h104a8.93 8.93 0 009-8.81V11.77A8.93 8.93 0 00116 3zM39.17 107H21.06V48.73h18.11zm-9-66.21a10.5 10.5 0 1110.49-10.5 10.5 10.5 0 01-10.54 10.48zM107 107H88.89V78.65c0-6.75-.12-15.44-9.41-15.44s-10.87 7.36-10.87 15V107H50.53V48.73h17.36v8h.24c2.42-4.58 8.32-9.41 17.13-9.41C103.6 47.28 107 59.35 107 75z",
);

export const FacebookMark = brandMark(
  "0 0 24 24",
  "M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z",
);
