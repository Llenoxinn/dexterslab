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
