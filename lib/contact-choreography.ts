/** A small, deliberately pixel-shaped word, assembled from the actual lab props. */
const GLYPHS: Record<string, readonly string[]> = {
  H: ["101", "101", "111", "101", "101"],
  E: ["111", "100", "110", "100", "111"],
  L: ["100", "100", "100", "100", "111"],
  O: ["111", "101", "101", "101", "111"],
  P: ["111", "101", "111", "100", "100"],
  I: ["111", "010", "010", "010", "111"],
  N: ["101", "111", "111", "111", "101"],
  G: ["111", "100", "101", "101", "111"],
};

export const CONTACT_WORD = "HELLO";
export const CONTACT_WORD_COLUMNS = CONTACT_WORD.length * 4 - 1;
const wordPoints = (word: string) => [...word].flatMap((letter, index) =>
  GLYPHS[letter].flatMap((row, y) => [...row].flatMap((cell, x) =>
    cell === "1" ? [{ x: index * 4 + x - (word.length * 4 - 2) / 2, y: 2 - y }] : [],
  )),
);
export const CONTACT_WORD_POINTS = wordPoints(CONTACT_WORD);
export const CONTACT_PING_POINTS = wordPoints("PING");
export const CONTACT_SPIRAL_SECONDS = 4.5;

/** Mutable frame data shared with the journey; motion stays outside React's render loop. */
export type ContactChoreography = {
  message: number;
  links: number;
  linksWord?: number;
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
