/**
 * Geometry primitives used by block lookup during drag operations.
 * Kept internal to the `drag/` folder — consumers go through `block-lookup.ts`.
 */

export class Point {
  private readonly _x: number;
  private readonly _y: number;

  constructor(x: number, y: number) {
    this._x = x;
    this._y = y;
  }

  get x(): number {
    return this._x;
  }

  get y(): number {
    return this._y;
  }

  public equals({ x, y }: Point): boolean {
    return this.x === x && this.y === y;
  }

  public calcDeltaXTo({ x }: Point): number {
    return this.x - x;
  }

  public calcDeltaYTo({ y }: Point): number {
    return this.y - y;
  }

  public calcHorizontalDistanceTo(point: Point): number {
    return Math.abs(this.calcDeltaXTo(point));
  }

  public calcVerticalDistance(point: Point): number {
    return Math.abs(this.calcDeltaYTo(point));
  }

  public calcDistanceTo(point: Point): number {
    return Math.sqrt(
      this.calcDeltaXTo(point) ** 2 + this.calcDeltaYTo(point) ** 2
    );
  }
}

export function isPoint(x: unknown): x is Point {
  return x instanceof Point;
}

export type ContainsPointReturn = {
  result: boolean;
  reason: {
    isOnTopSide: boolean;
    isOnBottomSide: boolean;
    isOnLeftSide: boolean;
    isOnRightSide: boolean;
  };
};

/**
 * Axis-aligned rectangle with containment / intersection helpers used while
 * searching for the block element closest to a pointer.
 */
export class Rect {
  private readonly _left: number;
  private readonly _top: number;
  private readonly _right: number;
  private readonly _bottom: number;

  constructor({
    left,
    top,
    right,
    bottom,
  }: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  }) {
    const [physicTop, physicBottom] =
      top <= bottom ? [top, bottom] : [bottom, top];

    const [physicLeft, physicRight] =
      left <= right ? [left, right] : [right, left];

    this._top = physicTop;
    this._right = physicRight;
    this._left = physicLeft;
    this._bottom = physicBottom;
  }

  get top(): number {
    return this._top;
  }

  get right(): number {
    return this._right;
  }

  get bottom(): number {
    return this._bottom;
  }

  get left(): number {
    return this._left;
  }

  get width(): number {
    return Math.abs(this._left - this._right);
  }

  get height(): number {
    return Math.abs(this._bottom - this._top);
  }

  public equals({ top, left, bottom, right }: Rect): boolean {
    return (
      top === this._top &&
      bottom === this._bottom &&
      left === this._left &&
      right === this._right
    );
  }

  public contains({ x, y }: Point): ContainsPointReturn;
  public contains({ top, left, bottom, right }: Rect): boolean;
  public contains(target: Point | Rect): boolean | ContainsPointReturn {
    if (isPoint(target)) {
      const { x, y } = target;

      const isOnTopSide = y < this._top;
      const isOnBottomSide = y > this._bottom;
      const isOnLeftSide = x < this._left;
      const isOnRightSide = x > this._right;

      const result =
        !isOnTopSide && !isOnBottomSide && !isOnLeftSide && !isOnRightSide;

      return {
        reason: {
          isOnBottomSide,
          isOnLeftSide,
          isOnRightSide,
          isOnTopSide,
        },
        result,
      };
    }
    const { top, left, bottom, right } = target;

    return (
      top >= this._top &&
      top <= this._bottom &&
      bottom >= this._top &&
      bottom <= this._bottom &&
      left >= this._left &&
      left <= this._right &&
      right >= this._left &&
      right <= this._right
    );
  }

  public intersectsWith(rect: Rect): boolean {
    const { left: x1, top: y1, width: w1, height: h1 } = rect;
    const { left: x2, top: y2, width: w2, height: h2 } = this;
    const maxX = x1 + w1 >= x2 + w2 ? x1 + w1 : x2 + w2;
    const maxY = y1 + h1 >= y2 + h2 ? y1 + h1 : y2 + h2;
    const minX = x1 <= x2 ? x1 : x2;
    const minY = y1 <= y2 ? y1 : y2;
    return maxX - minX <= w1 + w2 && maxY - minY <= h1 + h2;
  }

  public generateNewRect({
    left = this.left,
    top = this.top,
    right = this.right,
    bottom = this.bottom,
  }): Rect {
    return new Rect({ left, top, right, bottom });
  }

  static fromLTRB(
    left: number,
    top: number,
    right: number,
    bottom: number
  ): Rect {
    return new Rect({ left, top, right, bottom });
  }

  static fromLWTH(
    left: number,
    width: number,
    top: number,
    height: number
  ): Rect {
    return new Rect({ left, top, right: left + width, bottom: top + height });
  }

  static fromPoints(startPoint: Point, endPoint: Point): Rect {
    const { y: top, x: left } = startPoint;
    const { y: bottom, x: right } = endPoint;
    return Rect.fromLTRB(left, top, right, bottom);
  }

  static fromDOM(dom: HTMLElement): Rect {
    const { top, width, left, height } = dom.getBoundingClientRect();
    return Rect.fromLWTH(left, width, top, height);
  }
}
