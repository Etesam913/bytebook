import { describe, expect, it } from 'bun:test';
import {
  buildBaseTagCounts,
  createTagCountsKey,
  mergeTagCounts,
} from './tag-counts';

describe('buildBaseTagCounts', () => {
  it.each([
    { notes: undefined, expected: [] },
    {
      notes: { a: ['work', 'shared'], b: ['shared'], c: undefined },
      expected: [
        ['work', 1],
        ['shared', 2],
      ],
    },
  ])('counts tags across selected notes', ({ notes, expected }) => {
    expect([...buildBaseTagCounts(notes)]).toEqual(
      Array.from(
        expected as readonly (readonly [string, number])[],
        ([tag, count]): [string, number] => [tag, count]
      )
    );
  });
});

describe('tag count overrides', () => {
  it('uses a stable key regardless of insertion order', () => {
    expect(
      createTagCountsKey(
        new Map([
          ['b', 1],
          ['a', 2],
        ])
      )
    ).toBe(
      createTagCountsKey(
        new Map([
          ['a', 2],
          ['b', 1],
        ])
      )
    );
  });

  it('layers overrides without changing the base counts', () => {
    const base = new Map([
      ['shared', 2],
      ['work', 1],
    ]);
    const result = mergeTagCounts(
      base,
      new Map([
        ['work', 0],
        ['new', 2],
      ])
    );
    expect([...result]).toEqual([
      ['shared', 2],
      ['work', 0],
      ['new', 2],
    ]);
    expect(base.get('work')).toBe(1);
  });
});
