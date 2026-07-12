import { BLOCK_INFO } from './blocks.js';

// Sound effect definitions: pure data consumed by audio/soundPlayer.js.
// type 'tone'  -> oscillator with exponential decay
// type 'noise' -> band-pass filtered white noise burst
// freq in Hz, duration in seconds, volume in [0,1], jitter = random detune
// ratio, slideTo = optional frequency ramp target.

// Block "materials" for dig/break/place variants, derived from the block's
// tool class: shovel ground is soft, axe blocks are woody, pickaxe blocks
// are stony, everything else rustles like leaves.
const MATERIAL_BY_TOOL = {
  shovel: 'soft',
  axe: 'wood',
  pickaxe: 'stone',
};

export function blockMaterial(blockId) {
  const info = BLOCK_INFO[blockId];
  return MATERIAL_BY_TOOL[info?.toolClass] ?? 'leaf';
}

/** Sound name for a block interaction: kind = 'dig' | 'break' | 'place'. */
export function soundForBlock(blockId, kind) {
  return `${kind}_${blockMaterial(blockId)}`;
}

const MATERIAL_NOISE = {
  soft: { freq: 320, q: 0.8 },
  wood: { freq: 720, q: 2.5 },
  stone: { freq: 1500, q: 1.2 },
  leaf: { freq: 3200, q: 0.7 },
};

function digBreakPlace(material, { freq, q }) {
  return {
    [`dig_${material}`]: { type: 'noise', freq, q, duration: 0.09, volume: 0.35, jitter: 0.25 },
    [`break_${material}`]: { type: 'noise', freq: freq * 0.8, q, duration: 0.22, volume: 0.6, jitter: 0.2 },
    [`place_${material}`]: { type: 'noise', freq: freq * 1.1, q, duration: 0.12, volume: 0.45, jitter: 0.2 },
  };
}

export const SOUNDS = {
  ...digBreakPlace('soft', MATERIAL_NOISE.soft),
  ...digBreakPlace('wood', MATERIAL_NOISE.wood),
  ...digBreakPlace('stone', MATERIAL_NOISE.stone),
  ...digBreakPlace('leaf', MATERIAL_NOISE.leaf),
  jump: { type: 'tone', freq: 300, slideTo: 480, duration: 0.12, volume: 0.25, jitter: 0.05 },
  land: { type: 'noise', freq: 240, q: 0.9, duration: 0.1, volume: 0.3, jitter: 0.2 },
  craft: { type: 'tone', freq: 620, slideTo: 930, duration: 0.16, volume: 0.35, jitter: 0.03 },
  click: { type: 'tone', freq: 900, duration: 0.05, volume: 0.2, jitter: 0.1 },
  hit: { type: 'noise', freq: 500, q: 1.5, duration: 0.12, volume: 0.5, jitter: 0.25 },
  mob_death: { type: 'tone', freq: 420, slideTo: 140, duration: 0.4, volume: 0.45, jitter: 0.05 },
};

/** Interval between mining tick sounds, seconds. */
export const DIG_SOUND_INTERVAL = 0.25;
