import { describe, it, expect } from 'vitest';
import {
  SOUNDS, soundForBlock, blockMaterial, DIG_SOUND_INTERVAL,
} from '../src/core/soundDefs.js';
import { BLOCK, BLOCK_INFO } from '../src/core/blocks.js';

describe('sound definitions', () => {
  it('have sane synth parameters', () => {
    for (const [name, def] of Object.entries(SOUNDS)) {
      expect(['tone', 'noise'], name).toContain(def.type);
      expect(def.freq, name).toBeGreaterThanOrEqual(20);
      expect(def.freq, name).toBeLessThanOrEqual(8000);
      expect(def.duration, name).toBeGreaterThan(0);
      expect(def.duration, name).toBeLessThanOrEqual(2);
      expect(def.volume, name).toBeGreaterThan(0);
      expect(def.volume, name).toBeLessThanOrEqual(1);
      if (def.slideTo) expect(def.slideTo, name).toBeGreaterThan(0);
    }
  });

  it('cover every UI/game event used by the code', () => {
    for (const name of ['jump', 'land', 'craft', 'click', 'hit', 'mob_death']) {
      expect(SOUNDS[name], name).toBeDefined();
    }
  });

  it('define dig/break/place variants for every material', () => {
    for (const material of ['soft', 'wood', 'stone', 'leaf']) {
      for (const kind of ['dig', 'break', 'place']) {
        expect(SOUNDS[`${kind}_${material}`], `${kind}_${material}`).toBeDefined();
      }
    }
  });

  it('keeps the dig tick interval positive and below a second', () => {
    expect(DIG_SOUND_INTERVAL).toBeGreaterThan(0);
    expect(DIG_SOUND_INTERVAL).toBeLessThan(1);
  });
});

describe('blockMaterial / soundForBlock', () => {
  it('maps tool classes to materials', () => {
    expect(blockMaterial(BLOCK.DIRT)).toBe('soft');
    expect(blockMaterial(BLOCK.SAND)).toBe('soft');
    expect(blockMaterial(BLOCK.WOOD)).toBe('wood');
    expect(blockMaterial(BLOCK.PLANK)).toBe('wood');
    expect(blockMaterial(BLOCK.STONE)).toBe('stone');
    expect(blockMaterial(BLOCK.BRICK)).toBe('stone');
    expect(blockMaterial(BLOCK.LEAVES)).toBe('leaf');
  });

  it('resolves to an existing sound for every breakable block', () => {
    for (const [id, info] of Object.entries(BLOCK_INFO)) {
      if (info.hardness === Infinity) continue;
      for (const kind of ['dig', 'break', 'place']) {
        const name = soundForBlock(Number(id), kind);
        expect(SOUNDS[name], `${info.name} ${kind}`).toBeDefined();
      }
    }
  });
});
