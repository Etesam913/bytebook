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
}

type ContainsPointReturn = {
  result: boolean;
  reason: {
    isOnTopSide: boolean;
    isOnBottomSide: boolean;
    isOnLeftSide: boolean;
    isOnRightSide: boolean;
  };
};

/**
 * Axis-aligned rectangle with point containment used while
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

  public contains({ x, y }: Point): ContainsPointReturn {
    const isOnTopSide = y < this._top;
    const isOnBottomSide = y > this._bottom;
    const isOnLeftSide = x < this._left;
    const isOnRightSide = x > this._right;
    return {
      result:
        !isOnTopSide && !isOnBottomSide && !isOnLeftSide && !isOnRightSide,
      reason: { isOnTopSide, isOnBottomSide, isOnLeftSide, isOnRightSide },
    };
  }

  public generateNewRect({
    left = this.left,
    top = this.top,
    right = this.right,
    bottom = this.bottom,
  }): Rect {
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

  static fromDOM(dom: HTMLElement): Rect {
    const { top, width, left, height } = dom.getBoundingClientRect();
    return Rect.fromLWTH(left, width, top, height);
  }
}
