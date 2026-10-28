// Turns a pixel map into one SVG path made of horizontal runs of `ink` cells:
// the blocky construction Notion's /dev icons use.
export function pixelPath(rows: readonly string[], ink = "#"): string {
  let d = "";
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (row[x] !== ink) {
        x++;
        continue;
      }
      let end = x;
      while (row[end] === ink) end++;
      d += `M${x} ${y}h${end - x}v1h${x - end}z`;
      x = end;
    }
  });
  return d;
}

// Builds a symmetric map from its left half.
export const mirror = (half: readonly string[]) => half.map((row) => row + [...row].reverse().join(""));
