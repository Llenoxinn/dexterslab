import { mirror } from "@/lib/pixel";

// Every pixel drawing on the site. "#" is a filled cell; the coil uses
// "P" (paper) and "L" (lavender) for its two tones.

// Erlenmeyer flask with a bubble rising through the liquid.
export const FLASK = mirror([
  "........",
  ".....###",
  "......#.",
  "......#.",
  "......#.",
  ".....#..",
  ".....#..",
  "....#..#",
  "....#...",
  "...#.###",
  "...#####",
  "..######",
  "..######",
  ".#######",
  ".#######",
  "........",
]);

export const BEAKER = [
  "................",
  ".##############.",
  "..#..........#..",
  "..#......###.#..",
  "..#..........#..",
  "..#......###.#..",
  "..#..........#..",
  "..#..........#..",
  "..#.########.#..",
  "..############..",
  "..############..",
  "..############..",
  "..############..",
  "..############..",
  "...##########...",
  "................",
];

export const TUBES = [
  "................",
  ".###..###..###..",
  ".#.#..#.#..#.#..",
  ".#.#..#.#..#.#..",
  ".#.#..#.#..###..",
  ".#.#..###..###..",
  "################",
  ".###..###..###..",
  ".###..###..###..",
  ".###..###..###..",
  "..#....#....#...",
  "................",
  ".#............#.",
  ".#............#.",
  "################",
  "................",
];

// Small Tesla coil for icons: sparking toroid, wound coil, base.
export const TESLA = [
  "..#..........#..",
  "...#.######.#...",
  "..############..",
  "..############..",
  "...##########...",
  "......####......",
  "......#..#......",
  "......####......",
  "......#..#......",
  "......####......",
  "......#..#......",
  "......####......",
  "....########....",
  "...##########...",
  "..############..",
  "................",
];

// Large two-tone Tesla coil for the lab scene. The arc leaves the toroid at row 2.
export const COIL = [
  "....PPPPPPPP....",
  "..PPPPPPPPPPPP..",
  ".PPPPPPPPPPPPPP.",
  ".LLLLLLLLLLLLLL.",
  "..LLLLLLLLLLLL..",
  ".......LL.......",
  "......PPPP......",
  "......L..L......",
  "......PPPP......",
  "......L..L......",
  "......PPPP......",
  "......L..L......",
  "......PPPP......",
  "......L..L......",
  "......PPPP......",
  "......L..L......",
  "......PPPP......",
  "....LLLLLLLL....",
  "....L......L....",
  "....LLLLLLLL....",
  "...PPPPPPPPPP...",
  "..PPPPPPPPPPPP..",
  "..PPPPPPPPPPPP..",
];

// The runner: an original pixel scientist. Neon hair with tufts and trousers, goggles
// pushed up on the forehead (deep frames, paper lenses), lavender skin, a paper lab coat
// with a neon tie and a pen in the pocket, paper shoes.
const HEAD = [
  ".....N..NN......",
  "....NNNNNNNN....",
  "...NNNNNNNNNN...",
  "..NNDPPDDPPDNN..",
  "..NNDPPDDPPDNN..",
  "..NLLLLLLLLLLN..",
  "..NLLDLLLLDLLN..",
  "...LLLLLLLLLL...",
  "....LLLDDLLL....",
];
// Crash: X eyes and an open mouth.
const HEAD_HIT = [
  ...HEAD.slice(0, 5),
  "..NLDLDLLDLDLN..",
  "..NLLDLLLLDLLN..",
  "...LDLDLLDLDL...",
  "....LLDDDDLL....",
];
const COAT = [
  "...PPPLNNLPPP...",
  "..PPPPPLNNLPPPP.",
  ".LPPPPPPNNPPPPPL",
  ".LPNPPPPPPPPPPPL",
  "..PPPPPPPPPPPP..",
  "..PPPPPPPPPPPP..",
];
const STRIDE = ["...NN....NN.....", "..NN......NN....", ".PPP......PPP..."];
const PASS = ["....NN..NN......", ".....NNNN.......", "....PPPPPP......"];

export const DEXTER_RUN_A = [...HEAD, ...COAT, ...STRIDE];
export const DEXTER_RUN_B = [...HEAD, ...COAT, ...PASS];
export const DEXTER_JUMP = [...HEAD, ...COAT, "....NNNNNNN.....", "...PP.....PP....", "................"];
export const DEXTER_HIT = [...HEAD_HIT, ...COAT, ...PASS];

// Ducking: the head leans forward over a squashed coat.
const DUCK_HEAD = HEAD.map((row) => `..${row.slice(0, 14)}`);
const DUCK_BODY = [".PPPPPPPPPPPPPL.", ".PPPPPPPPPPPPP.."];
export const DEXTER_DUCK_A = [...DUCK_HEAD, ...DUCK_BODY, "..NN..NN..PP...."];
export const DEXTER_DUCK_B = [...DUCK_HEAD, ...DUCK_BODY, "...NN..NN..PP..."];

// Waving, for the contact section: the right hand swings between two positions.
export const DEXTER_WAVE_A = [
  ...HEAD,
  "...PPPLNNLPPP.LL",
  "..PPPPPLNNLPPPPL",
  ".LPPPPPPNNPPPPP.",
  ".LPNPPPPPPPPPPP.",
  ...COAT.slice(4),
  ...PASS,
];
export const DEXTER_WAVE_B = [
  ...HEAD.slice(0, 8),
  "....LLLDDLLL..LL",
  "...PPPLNNLPPP.L.",
  "..PPPPPLNNLPPPPL",
  ".LPPPPPPNNPPPPP.",
  ".LPNPPPPPPPPPPP.",
  ...COAT.slice(4),
  ...PASS,
];

// Game hazards, two-tone: lavender glass, neon liquid with paper bubbles and ticks.
export const GAME_BEAKER = [
  "LLLLLLLLLLLL",
  ".L........L.",
  ".L.....PP.L.",
  ".L........L.",
  ".L.....PP.L.",
  ".LNNNNNNNNL.",
  ".LNPNNNNNNL.",
  ".LNNNNNPNNL.",
  ".LNNNNNNNNL.",
  ".LNNPNNNNNL.",
  ".LNNNNNNNNL.",
  "..LLLLLLLL..",
];
export const GAME_FLASK = [
  "....LLLL....",
  "....L..L....",
  "....L..L....",
  "....L..L....",
  "...L....L...",
  "...L....L...",
  "..L..PP..L..",
  "..LNNNNNNL..",
  ".LNNNPNNNNL.",
  ".LNNNNNNPNL.",
  "LNNPNNNNNNNL",
  "LNNNNNNNNNNL",
  "LLLLLLLLLLLL",
];
export const GAME_TUBES = [
  ".LLL.LLL.LLL..",
  ".L.L.L.L.L.L..",
  ".L.L.L.L.LNL..",
  ".L.L.LNL.LNL..",
  "PPPPPPPPPPPPPP",
  ".LNL.LNL.LNL..",
  ".LNL.LNL.LNL..",
  ".LNL.LNL.LNL..",
  "..N...N...N...",
  "..............",
  ".P..........P.",
  "PPPPPPPPPPPPPP",
];
// Tesla coil, sparks jumping between two positions.
const TESLA_BODY = [
  "..PPPPPPPP..",
  ".PPPPPPPPPP.",
  "..LLLLLLLL..",
  ".....LL.....",
  "....PPPP....",
  "....L..L....",
  "....PPPP....",
  "....L..L....",
  "....PPPP....",
  "....L..L....",
  "....PPPP....",
  "...LLLLLL...",
  "..PPPPPPPP..",
  ".PPPPPPPPPP.",
];
export const GAME_TESLA_A = ["N..........N", ".N.PPPPPP.N.", ...TESLA_BODY];
export const GAME_TESLA_B = [".N........N.", "N..PPPPPP..N", ...TESLA_BODY];

// Toxic fumes: a neon cloud with pale bubbles, two frames. Neon keeps it apart
// from the harmless lavender steam overhead.
export const FUMES_A = [
  "...NN..NNN....",
  ".NNNNNNNNNNN..",
  "NNPNNNNPNNNNN.",
  "NNNNNPNNNNNPNN",
  ".NNNNNNNNPNNNN",
  "..NNNPNNNNNNN.",
  "...NNNNN.NN...",
  "....N.........",
];
export const FUMES_B = [
  "....NNN..NN...",
  "..NNNNNNNNNNN.",
  ".NNNNPNNNNPNNN",
  "NNPNNNNNPNNNNN",
  "NNNNNNPNNNNNN.",
  ".NNNNNNNNNPN..",
  "..NN.NNNNN....",
  "..........N...",
];

// A runaway lab drone: spinning rotors, neon lights.
export const DRONE_A = [
  "PPPP......PPPP",
  "..L........L..",
  "..LLLLLLLLLL..",
  ".LLNNLLLLNNLL.",
  ".LLLLLLLLLLLL.",
  "...LL....LL...",
  "..L........L..",
];
export const DRONE_B = ["..PP......PP..", ...DRONE_A.slice(1)];

// A loose plasma orb, two crackle frames.
export const ORB_A = ["..N..N..", "...NN...", ".NNPPNN.", "NNPPPPNN", "NNPPPPNN", ".NNPPNN.", "...NN...", "..N..N.."];
export const ORB_B = ["N......N", ".N.NN.N.", "..NPPN..", ".NPPPPN.", ".NPPPPN.", "..NPPN..", ".N.NN.N.", "N......N"];

// A puff of lab steam drifting overhead.
export const STEAM = [
  ".....LLLL.......",
  "...LLLLLLLL.....",
  ".LLLLLLLLLLLLL..",
  "LLLLLLLLLLLLLLLL",
];

export const ARROW_UP = [
  "...##...",
  "..####..",
  ".######.",
  "########",
  "...##...",
  "...##...",
  "...##...",
  "...##...",
];

export const BOLT = [
  ".....###..",
  "....###...",
  "...###....",
  "..#######.",
  ".....###..",
  "....###...",
  "...###....",
  "..##......",
  ".#........",
  "..........",
];

export const ENVELOPE = [
  "################",
  "##............##",
  "#.#..........#.#",
  "#..#........#..#",
  "#...#......#...#",
  "#....#....#....#",
  "#.....####.....#",
  "#..............#",
  "#..............#",
  "#..............#",
  "#..............#",
  "################",
];

export const MAGNIFIER = [
  "....######......",
  "...#......#.....",
  "..#........#....",
  "..#........#....",
  "..#........#....",
  "..#........#....",
  "...#......#.....",
  "....######......",
  "..........##....",
  "...........##...",
  "............##..",
  ".............##.",
  "..............##",
];
