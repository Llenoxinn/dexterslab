export type SpringAxis = { position: number; velocity: number };

/** A small damped spring for decorative pointer motion, independent of React rendering. */
export function advanceSpring(axis: SpringAxis, target: number, seconds: number): boolean {
  const dt = Math.min(Math.max(seconds, 0), 1 / 30);
  // Substeps keep the response stable on slower displays and after a busy frame.
  const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
  const step = dt / steps;
  for (let i = 0; i < steps; i++) {
    axis.velocity += ((target - axis.position) * 100 - axis.velocity * 10) * step;
    axis.position += axis.velocity * step;
  }
  if (Math.abs(target - axis.position) < .0005 && Math.abs(axis.velocity) < .001) {
    axis.position = target;
    axis.velocity = 0;
    return false;
  }
  return true;
}
