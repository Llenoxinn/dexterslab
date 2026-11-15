/**
 * Render quality for the WebGL scenes: one ladder of tiers (pixel ratio, MSAA, AO resolution) and a
 * governor that steps down after sustained slow frames and back up with hysteresis.
 *
 * Memory is the reason MSAA depends on the ratio. A HalfFloat RGBA target costs 8 bytes a sample; at
 * DPR 2 on a 1080p screen, 4x MSAA is ~265 MB per composer buffer, and the composer keeps two. At a
 * ratio of 1.5 or more the image is already supersampled, so the samples buy almost nothing.
 */

export type QualityTier = {
  /** Drawing-buffer pixels per CSS pixel. */
  ratio: number;
  /** MSAA samples on the composer targets. */
  samples: number;
  /** Ambient-occlusion resolution relative to the drawing buffer; 0 switches AO off. */
  ao: number;
};

/** Supersampled images need no MSAA; small, shared-memory GPUs get 2 samples instead of 4. */
export const msaaFor = (ratio: number, roomy = true) => (ratio >= 1.5 ? 0 : roomy ? 4 : 2);

/** Best first. `cap` is the highest ratio the device may use (2 on roomy devices, 1.5 otherwise). */
export function qualityTiers(devicePixelRatio: number, cap: number): QualityTier[] {
  const roomy = cap >= 2;
  const top = Math.max(1, Math.min(devicePixelRatio || 1, cap));
  const ladder: [number, number][] = [
    [top, 0.5],
    [Math.min(top, 1.5), 0.5],
    [1, 0.5],
    [1, 0],
    [0.75, 0],
  ];
  const tiers: QualityTier[] = [];
  for (const [ratio, ao] of ladder) {
    const last = tiers[tiers.length - 1];
    if (last && last.ratio === ratio && last.ao === ao) continue;
    tiers.push({ ratio, samples: msaaFor(ratio, roomy), ao });
  }
  return tiers;
}

export type GovernorOptions = {
  /** Frames per measurement window. */
  window?: number;
  /** Windows ignored at start (shader compiles and the entrance animation are not the steady state). */
  warmup?: number;
  /** A window whose median frame interval exceeds this steps down (ms). ~24 ms is under 42 fps. */
  slowMs?: number;
  /** Windows at or under this (ms) count towards stepping back up. 18 ms allows for 60 Hz vsync. */
  fastMs?: number;
  /** Good windows in a row before stepping up. */
  upAfter?: number;
  /** Tier to begin at; the governor never climbs above it (a device already known to struggle). */
  start?: number;
};

/**
 * Feed it the interval between rendered frames; it answers with the tier index to use.
 * A tier that has had to be left twice is never re-entered, so the scene cannot oscillate.
 */
export function createGovernor(tierCount: number, options: GovernorOptions = {}) {
  const { window = 45, warmup = 2, slowMs = 24, fastMs = 18, upAfter = 6, start = 0 } = options;
  const samples: number[] = [];
  const leftCount = new Array<number>(tierCount).fill(0);
  let index = Math.max(0, Math.min(tierCount - 1, start));
  let ceiling = index;
  let windows = 0;
  let goodStreak = 0;

  return {
    get index() {
      return index;
    },
    /** Returns the tier index after this frame. Intervals over 250 ms (tab switch, a hitch) are ignored. */
    sample(intervalMs: number) {
      if (!(intervalMs > 0) || intervalMs > 250) return index;
      samples.push(intervalMs);
      if (samples.length < window) return index;
      const sorted = samples.splice(0).sort((a, b) => a - b);
      const median = sorted[sorted.length >> 1];
      windows += 1;
      if (windows <= warmup) return index;
      if (median > slowMs && index < tierCount - 1) {
        leftCount[index] += 1;
        if (leftCount[index] >= 2) ceiling = Math.max(ceiling, index + 1);
        index += 1;
        goodStreak = 0;
      } else if (median <= fastMs) {
        goodStreak += 1;
        if (goodStreak >= upAfter && index > ceiling) {
          index -= 1;
          goodStreak = 0;
        }
      } else goodStreak = 0;
      return index;
    },
    /** A hard failure (context loss, allocation error): drop a tier and stay at or below it. */
    fail() {
      ceiling = Math.min(tierCount - 1, Math.max(ceiling, index + 1));
      index = ceiling;
      samples.length = 0;
      goodStreak = 0;
      return index;
    },
  };
}
