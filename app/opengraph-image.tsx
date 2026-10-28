import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { pixelPath } from "@/lib/pixel";
import { COIL } from "@/lib/pixel-art";

export const alt = "dexterslab: experiment in progress. The lab of Dexter Juevesano.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The hero's bench in miniature: two coils and a fixed arc, on a 201×30 pixel grid.
const COIL_PAPER = pixelPath(COIL, "P");
const COIL_LAVENDER = pixelPath(COIL, "L");
const ARC =
  "M16 9L30 4L42 13L55 6L70 15L84 3L98 11L112 5L126 14L140 7L154 12L168 4L184 9";

export default async function OpengraphImage() {
  const pixel = await readFile(join(process.cwd(), "assets/PixelifySans-Bold.ttf"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          background: "#1313ba",
          color: "#f6f6fc",
          fontFamily: "Pixelify",
        }}
      >
        <div style={{ display: "flex", fontSize: 32 }}>dexterslab</div>
        <div
          style={{ display: "flex", flexDirection: "column", fontSize: 116, lineHeight: 1.05, textShadow: "6px 6px 0 #6666fd" }}
        >
          <span>Experiment in</span>
          <span>progress.</span>
        </div>
        <svg width="1072" height="160" viewBox="0 0 201 30">
          <path d={ARC} fill="none" stroke="#6666fd" strokeWidth="3" />
          <path d={ARC} fill="none" stroke="#f6f6fc" strokeWidth="1" />
          <g transform="translate(0 7)">
            <path d={COIL_PAPER} fill="#f6f6fc" />
            <path d={COIL_LAVENDER} fill="#cbcbef" />
          </g>
          <g transform="translate(185 7)">
            <path d={COIL_PAPER} fill="#f6f6fc" />
            <path d={COIL_LAVENDER} fill="#cbcbef" />
          </g>
          <rect x="0" y="29.5" width="201" height="0.5" fill="#cbcbef" />
        </svg>
      </div>
    ),
    { ...size, fonts: [{ name: "Pixelify", data: pixel, style: "normal", weight: 700 }] },
  );
}
