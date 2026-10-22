import '@/test/setup';
import { describe, it, expect } from 'bun:test';
import { Point, Rect } from './geometry';

describe('Point', () => {
  it('exposes the constructor coordinates via getters', () => {
    const p = new Point(3, 7);
    expect(p.x).toBe(3);
    expect(p.y).toBe(7);
  });
});

describe('Rect', () => {
  describe('constructor', () => {
    it('exposes ltrb getters', () => {
      const r = new Rect({ left: 10, top: 20, right: 30, bottom: 40 });
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
  });

  describe('contains(Point)', () => {
    const r = new Rect({ left: 10, top: 20, right: 30, bottom: 40 }); // left=10, top=20, right=30, bottom=40

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

  describe('generateNewRect', () => {
    const base = new Rect({ left: 10, top: 20, right: 30, bottom: 40 });

    it('returns a copy when no overrides are given', () => {
      const copy = base.generateNewRect({});
      expect(copy).toEqual(base);
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
    it('fromLWTH constructs from left/width/top/height', () => {
      const r = Rect.fromLWTH(10, 20, 30, 40);
      expect(r.left).toBe(10);
      expect(r.right).toBe(30);
      expect(r.top).toBe(30);
      expect(r.bottom).toBe(70);
    });
  });
});
