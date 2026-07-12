import { clamp, lerp } from './math.js';

// Day/night cycle. Pure logic: time -> sun direction, light levels and sky
// color; main.js applies these to the three.js lights and fog each frame.
//
// timeOfDay t is in [0, 1): 0 = sunrise (06:00), 0.25 = noon, 0.5 = sunset,
// 0.75 = midnight.

export const DAY_LENGTH = 240; // real seconds per in-game day

export function advanceTime(t, dt) {
  return (t + dt / DAY_LENGTH) % 1;
}

/** Sine of the sun's elevation: 1 at noon, 0 at sunrise/sunset, -1 at midnight. */
export function sunElevation(t) {
  return Math.sin(t * Math.PI * 2);
}

/** Unit direction from the origin toward the sun (east = +x, up = +y). */
export function sunDirection(t) {
  const a = t * Math.PI * 2;
  const x = Math.cos(a);
  const y = Math.sin(a);
  const z = 0.35; // fixed southward tilt so shadows never go dead vertical
  const len = Math.hypot(x, y, z);
  return { x: x / len, y: y / len, z: z / len };
}

/**
 * Overall light factor in [0, 1]: 1 in full day, 0 at deep night, with a
 * smooth twilight band while the sun crosses the horizon.
 */
export function daylight(t) {
  return clamp((sunElevation(t) + 0.15) / 0.4, 0, 1);
}

const DAY_SKY = [0x87 / 255, 0xce / 255, 0xeb / 255];
const NIGHT_SKY = [0x0b / 255, 0x10 / 255, 0x24 / 255];
const GLOW = [1.0, 0.55, 0.32]; // sunrise / sunset tint

/**
 * Sky (and fog) color as [r, g, b] in [0, 1]. Blends night -> day with the
 * daylight factor and pushes toward orange while the sun is near the horizon.
 */
export function skyColor(t) {
  const d = daylight(t);
  const e = sunElevation(t);
  // Strongest orange while the sun sits on the horizon; d*(2-d) boosts the
  // glow through twilight (like sqrt) but with a bounded slope at d=0 so
  // the color stays frame-to-frame continuous.
  const glowAmount = clamp(1 - Math.abs(e) / 0.25, 0, 1) * 0.7 * d * (2 - d);
  return NIGHT_SKY.map((n, i) => {
    const base = lerp(n, DAY_SKY[i], d);
    return clamp(lerp(base, GLOW[i], glowAmount), 0, 1);
  });
}

/** Intensities for the directional sun and the hemisphere light. */
export function lightLevels(t) {
  const d = daylight(t);
  return {
    sun: 1.15 * d,
    hemisphere: 0.18 + 0.6 * d, // never fully black at night
  };
}

/** "HH:MM" clock string (t=0 -> 06:00, t=0.25 -> 12:00). */
export function formatClock(t) {
  const minutes = Math.floor(((t + 0.25) % 1) * 24 * 60);
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mm = String(minutes % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}
