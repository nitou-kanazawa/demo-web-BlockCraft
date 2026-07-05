// Pure math helpers shared across the game. Kept free of DOM / three.js
// dependencies so they can be unit-tested in Node.

/** Clamp value into [min, max]. */
export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

/**
 * Floored modulo: result always has the sign of the divisor.
 * Needed for mapping world coordinates into chunk-local coordinates,
 * where JS `%` returns negative values for negative operands.
 */
export function mod(n, m) {
  return ((n % m) + m) % m;
}

/** Linear interpolation between a and b by t in [0, 1]. */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Smoothstep fade curve (6t^5 - 15t^4 + 10t^3), used by noise. */
export function smootherstep(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}
