import '../../../../test/setup';
import { describe, it, expect } from 'bun:test';
import { Point, Rect } from './geometry';

describe('Point', () => {
  it('exposes the constructor coordinates via getters', () => {
    const p = new Point(3, 7);
    expect(p.x).toBe(3);
    expect(p.y).toBe(7);
  });

  describe('equals', () => {
    it('returns true for identical coordinates', () => {
      expect(new Point(1, 2).equals(new Point(1, 2))).toBe(true);
    });

    it('returns false when either coordinate differs', () => {
      expect(new Point(1, 2).equals(new Point(1, 3))).toBe(false);
      expect(new Point(1, 2).equals(new Point(0, 2))).toBe(false);
    });
  });

  describe('deltas', () => {
    it('calcDeltaXTo returns signed x difference (this - other)', () => {
      expect(new Point(10, 0).calcDeltaXTo(new Point(3, 0))).toBe(7);
      expect(new Point(3, 0).calcDeltaXTo(new Point(10, 0))).toBe(-7);
    });

    it('calcDeltaYTo returns signed y difference (this - other)', () => {
      expect(new Point(0, 10).calcDeltaYTo(new Point(0, 3))).toBe(7);
      expect(new Point(0, 3).calcDeltaYTo(new Point(0, 10))).toBe(-7);
    });
  });

  describe('distances', () => {
    it('calcHorizontalDistanceTo returns the absolute x difference', () => {
      expect(new Point(3, 0).calcHorizontalDistanceTo(new Point(10, 0))).toBe(
        7
      );
      expect(new Point(10, 0).calcHorizontalDistanceTo(new Point(3, 0))).toBe(
        7
      );
    });

    it('calcVerticalDistance returns the absolute y difference', () => {
      expect(new Point(0, 3).calcVerticalDistance(new Point(0, 10))).toBe(7);
      expect(new Point(0, 10).calcVerticalDistance(new Point(0, 3))).toBe(7);
    });

    it('calcDistanceTo returns euclidean distance (3-4-5 triangle)', () => {
      expect(new Point(0, 0).calcDistanceTo(new Point(3, 4))).toBe(5);
      expect(new Point(3, 4).calcDistanceTo(new Point(0, 0))).toBe(5);
    });

    it('calcDistanceTo returns 0 for the same point', () => {
      expect(new Point(2, 2).calcDistanceTo(new Point(2, 2))).toBe(0);
    });
  });
});

describe('Rect', () => {
  describe('constructor', () => {
    it('exposes ltrb getters', () => {
      const r = Rect.fromLTRB(10, 20, 30, 40);
      expect(r.left).toBe(10);
      expect(r.top).toBe(20);
      expect(r.right).toBe(30);
      expect(r.bottom).toBe(40);
    });

    it('normalizes when top > bottom or left > right', () => {
      const r = new Rect({ left: 30, top: 40, right: 10, bottom: 20 });
      expect(r.left).toBe(10);
      expect(r.right).toBe(30);
      expect(r.top).toBe(20);
      expect(r.bottom).toBe(40);
    });

    it('width and height are absolute differences', () => {
      const r = Rect.fromLTRB(10, 20, 30, 50);
      expect(r.width).toBe(20);
      expect(r.height).toBe(30);
    });
  });

  describe('equals', () => {
    it('returns true when all four edges match', () => {
      expect(
        Rect.fromLTRB(0, 0, 10, 10).equals(Rect.fromLTRB(0, 0, 10, 10))
      ).toBe(true);
    });

    it('returns false when any edge differs', () => {
      expect(
        Rect.fromLTRB(0, 0, 10, 10).equals(Rect.fromLTRB(0, 0, 10, 11))
      ).toBe(false);
    });
  });

  describe('contains(Point)', () => {
    const r = Rect.fromLTRB(10, 20, 30, 40); // left=10, top=20, right=30, bottom=40

    it('returns result=true and all sides false for a point inside', () => {
      expect(r.contains(new Point(20, 30))).toEqual({
        result: true,
        reason: {
          isOnTopSide: false,
          isOnBottomSide: false,
          isOnLeftSide: false,
          isOnRightSide: false,
        },
      });
    });

    it('flags isOnTopSide for y above top', () => {
      const out = r.contains(new Point(20, 10));
      expect(out.result).toBe(false);
      expect(out.reason.isOnTopSide).toBe(true);
    });

    it('flags isOnBottomSide for y below bottom', () => {
      const out = r.contains(new Point(20, 50));
      expect(out.result).toBe(false);
      expect(out.reason.isOnBottomSide).toBe(true);
    });

    it('flags isOnLeftSide for x left of left edge', () => {
      const out = r.contains(new Point(0, 30));
      expect(out.result).toBe(false);
      expect(out.reason.isOnLeftSide).toBe(true);
    });

    it('flags isOnRightSide for x right of right edge', () => {
      const out = r.contains(new Point(40, 30));
      expect(out.result).toBe(false);
      expect(out.reason.isOnRightSide).toBe(true);
    });

    it('treats edges as inside (inclusive boundary)', () => {
      expect(r.contains(new Point(10, 20)).result).toBe(true); // top-left corner
      expect(r.contains(new Point(30, 40)).result).toBe(true); // bottom-right corner
    });
  });

  describe('contains(Rect)', () => {
    const outer = Rect.fromLTRB(0, 0, 100, 100);

    it('returns true when target is fully inside', () => {
      expect(outer.contains(Rect.fromLTRB(10, 10, 20, 20))).toBe(true);
    });

    it('returns true for an identical rect (inclusive)', () => {
      expect(outer.contains(Rect.fromLTRB(0, 0, 100, 100))).toBe(true);
    });

    it('returns false when target extends past any edge', () => {
      expect(outer.contains(Rect.fromLTRB(-1, 0, 50, 50))).toBe(false);
      expect(outer.contains(Rect.fromLTRB(0, -1, 50, 50))).toBe(false);
      expect(outer.contains(Rect.fromLTRB(50, 50, 101, 100))).toBe(false);
      expect(outer.contains(Rect.fromLTRB(50, 50, 100, 101))).toBe(false);
    });
  });

  describe('intersectsWith', () => {
    it('returns true for overlapping rects', () => {
      const a = Rect.fromLTRB(0, 0, 10, 10);
      const b = Rect.fromLTRB(5, 5, 15, 15);
      expect(a.intersectsWith(b)).toBe(true);
      expect(b.intersectsWith(a)).toBe(true);
    });

    it('returns true for edge-touching rects', () => {
      const a = Rect.fromLTRB(0, 0, 10, 10);
      const b = Rect.fromLTRB(10, 0, 20, 10);
      expect(a.intersectsWith(b)).toBe(true);
    });

    it('returns false for fully disjoint rects', () => {
      const a = Rect.fromLTRB(0, 0, 10, 10);
      const b = Rect.fromLTRB(20, 20, 30, 30);
      expect(a.intersectsWith(b)).toBe(false);
    });

    it('returns true when one rect contains the other', () => {
      const outer = Rect.fromLTRB(0, 0, 100, 100);
      const inner = Rect.fromLTRB(10, 10, 20, 20);
      expect(outer.intersectsWith(inner)).toBe(true);
      expect(inner.intersectsWith(outer)).toBe(true);
    });
  });

  describe('generateNewRect', () => {
    const base = Rect.fromLTRB(10, 20, 30, 40);

    it('returns a copy when no overrides are given', () => {
      const copy = base.generateNewRect({});
      expect(copy.equals(base)).toBe(true);
      expect(copy).not.toBe(base);
    });

    it('applies partial overrides while keeping the rest', () => {
      const moved = base.generateNewRect({ left: 0, right: 50 });
      expect(moved.left).toBe(0);
      expect(moved.right).toBe(50);
      expect(moved.top).toBe(20);
      expect(moved.bottom).toBe(40);
    });
  });

  describe('static factories', () => {
    it('fromLTRB constructs from edge coordinates', () => {
      const r = Rect.fromLTRB(1, 2, 3, 4);
      expect(r.left).toBe(1);
      expect(r.top).toBe(2);
      expect(r.right).toBe(3);
      expect(r.bottom).toBe(4);
    });

    it('fromLWTH constructs from left/width/top/height', () => {
      const r = Rect.fromLWTH(10, 20, 30, 40);
      expect(r.left).toBe(10);
      expect(r.right).toBe(30);
      expect(r.top).toBe(30);
      expect(r.bottom).toBe(70);
      expect(r.width).toBe(20);
      expect(r.height).toBe(40);
    });

    it('fromPoints uses start as top-left and end as bottom-right', () => {
      const r = Rect.fromPoints(new Point(1, 2), new Point(10, 20));
      expect(r.left).toBe(1);
      expect(r.top).toBe(2);
      expect(r.right).toBe(10);
      expect(r.bottom).toBe(20);
    });

    it('fromPoints normalizes when end is above/left of start', () => {
      const r = Rect.fromPoints(new Point(10, 20), new Point(1, 2));
      // Constructor normalizes — physical edges should be the smaller/larger pair.
      expect(r.left).toBe(1);
      expect(r.top).toBe(2);
      expect(r.right).toBe(10);
      expect(r.bottom).toBe(20);
    });
  });
});
