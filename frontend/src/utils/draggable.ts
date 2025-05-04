export const BYTEBOOK_DRAG_DATA_FORMAT = 'bytebook/files';

function stopSelect(e: Event) {
  e.preventDefault();
}

export function createGhostElementFromHtmlElement(
  element: HTMLElement,
  classNames = ['dragging', 'drag-grid']
): HTMLElement {
  const ghostElement = element.cloneNode(true) as HTMLElement;
  ghostElement.classList.add(...classNames);
  // Remove the selected classes
  ghostElement.classList.remove('bg-(--accent-color)!');
  console.log(ghostElement);
  return ghostElement;
}

export function dragItem(
  onDragCallback: (e: MouseEvent) => void,
  onDragEndCallback?: (e: MouseEvent) => void
) {
  function mouseMove(e: MouseEvent) {
    if (e.target) {
      onDragCallback(e);
    }
  }

  function cleanUpDocumentEvents(e: MouseEvent) {
    document.removeEventListener('mousemove', mouseMove);
    document.removeEventListener('mouseup', cleanUpDocumentEvents);
    document.removeEventListener('selectstart', stopSelect);
    onDragEndCallback?.(e);
  }
  document.addEventListener('selectstart', stopSelect);
  document.body.style.userSelect = 'none';
  document.addEventListener('mousemove', mouseMove);
  document.addEventListener('mouseup', cleanUpDocumentEvents);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const throttle = <T extends (...args: any[]) => any>(
  fn: T,
  wait = 300
): ((...args: Parameters<T>) => ReturnType<T>) => {
  let inThrottle: boolean;
  let lastFn: ReturnType<typeof setTimeout>;
  let lastTime: number;

  return function (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this: any,
    ...args: Parameters<T>
  ): ReturnType<T> | undefined {
    if (!inThrottle) {
      const result = fn.apply(this, args);
      lastTime = Date.now();
      inThrottle = true;
      return result;
    }
    clearTimeout(lastFn);
    lastFn = setTimeout(
      () => {
        if (Date.now() - lastTime >= wait) {
          const result = fn.apply(this, args);
          lastTime = Date.now();
          return result;
        }
      },
      Math.max(wait - (Date.now() - lastTime), 0)
    );
  } as (...args: Parameters<T>) => ReturnType<T>;
};
