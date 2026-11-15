/** A small, deliberately pixel-shaped word, assembled from the actual lab props. */
const GLYPHS: Record<string, readonly string[]> = {
  H: ["101", "101", "111", "101", "101"],
  E: ["111", "100", "110", "100", "111"],
  L: ["100", "100", "100", "100", "111"],
  O: ["111", "101", "101", "101", "111"],
};

export const CONTACT_WORD = "HELLO";
export const CONTACT_WORD_COLUMNS = CONTACT_WORD.length * 4 - 1;
const wordPoints = (word: string) => [...word].flatMap((letter, index) =>
  GLYPHS[letter].flatMap((row, y) => [...row].flatMap((cell, x) =>
    cell === "1" ? [{ x: index * 4 + x - (word.length * 4 - 2) / 2, y: 2 - y }] : [],
  )),
);
export const CONTACT_WORD_POINTS = wordPoints(CONTACT_WORD);
export const CONTACT_SPIRAL_SECONDS = 4.5;

/** Independent onsets over ten seconds; only a few props are ever converting together. */
export function pingConversion(seconds: number, slot: number, count: number): number {
  const order = (slot * 37) % Math.max(1, count);
  const start = CONTACT_SPIRAL_SECONDS + order / Math.max(1, count - 1) * 10;
  const progress = Math.max(0, Math.min(1, (seconds - start) / .7));
  return progress * progress * (3 - 2 * progress);
}

/** Extra PING words that fill the free space around the box, beyond the props' spiral. */
export const PING_FIELD_COUNT = 96;

/** The field words pop in one at a time, starting just after the props begin to convert. */
export function pingFieldPop(seconds: number, index: number, count = PING_FIELD_COUNT): number {
  const order = (index * 53) % Math.max(1, count);
  const start = CONTACT_SPIRAL_SECONDS + 1.5 + order / Math.max(1, count - 1) * 9;
  const progress = Math.max(0, Math.min(1, (seconds - start) / .45));
  return progress * progress * (3 - 2 * progress);
}

/** Once the screen is full of PING, the whole screen asks, then answers itself. */
export const PING_FINALE = { ask: CONTACT_SPIRAL_SECONDS + 14, cool: CONTACT_SPIRAL_SECONDS + 16.6, end: CONTACT_SPIRAL_SECONDS + 18.4 };
export function pingFinale(seconds: number): "" | "ask" | "cool" {
  if (seconds >= PING_FINALE.ask && seconds < PING_FINALE.cool) return "ask";
  if (seconds >= PING_FINALE.cool && seconds < PING_FINALE.end) return "cool";
  return "";
}

/** Mutable frame data shared with the journey; motion stays outside React's render loop. */
export type ContactChoreography = {
  message: number;
  links: number;
  linksElapsed?: number;
  wordX: number;
  wordY: number;
  cellX: number;
  cellY: number;
  cellSize: number;
  orbitX: number;
  orbitY: number;
  orbitRadiusX: number;
  orbitRadiusY: number;
  social: number;
  energy: number;
};
