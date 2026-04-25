import './test/setup';
import { describe, it, expect } from 'bun:test';
import { getDefaultButtonVariants, easingFunctions } from './animations';

describe('getDefaultButtonVariants', () => {
  it('returns an empty object when disabled', () => {
    expect(getDefaultButtonVariants({ disabled: true })).toEqual({});
  });

  it('returns the default scales when no params are provided', () => {
    expect(getDefaultButtonVariants()).toEqual({
      whileHover: { scale: 1.075 },
      whileTap: { scale: 0.965 },
      whileFocus: { scale: 1.075 },
    });
  });

  it('returns the default scales when an empty object is passed', () => {
    expect(getDefaultButtonVariants({})).toEqual({
      whileHover: { scale: 1.075 },
      whileTap: { scale: 0.965 },
      whileFocus: { scale: 1.075 },
    });
  });

  it('applies overrides while preserving the rest of the defaults', () => {
    expect(
      getDefaultButtonVariants({ whileHover: 1.2, whileTap: 0.9 })
    ).toEqual({
      whileHover: { scale: 1.2 },
      whileTap: { scale: 0.9 },
      whileFocus: { scale: 1.075 },
    });
  });

  it('disabled wins over scale overrides', () => {
    expect(getDefaultButtonVariants({ disabled: true, whileHover: 2 })).toEqual(
      {}
    );
  });
});

describe('easingFunctions', () => {
  it('exposes the standard cubic-bezier presets', () => {
    expect(easingFunctions['ease-in-quad']).toEqual([0.55, 0.085, 0.68, 0.53]);
    expect(easingFunctions['ease-out-cubic']).toEqual([0.215, 0.61, 0.355, 1]);
    expect(easingFunctions['ease-in-out-expo']).toEqual([1, 0, 0, 1]);
  });

  it('every preset is a 4-tuple of numbers', () => {
    for (const [name, value] of Object.entries(easingFunctions)) {
      expect(Array.isArray(value), `${name} should be an array`).toBe(true);
      expect(value, `${name} should have 4 elements`).toHaveLength(4);
      for (const n of value as number[]) {
        expect(typeof n).toBe('number');
      }
    }
  });
});
