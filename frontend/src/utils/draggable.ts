function stopSelect(e: Event) {
  e.preventDefault();
}

// Attaches document-level mousemove/mouseup listeners to drive a drag interaction, invoking the given callbacks.
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

/**
 * Elements with this data attribute are stripped from the cloned drag ghost.
 * Use it on accent outlines, selection highlights, floating tooltips, popovers,
 * etc. that should not appear in the drag image.
 */
export const DRAG_GHOST_EXCLUDE_ATTR = 'data-drag-ghost-exclude';

// Clones an HTML element into a styled drag ghost, stripping selection highlights and excluded children.
export function createGhostElementFromHtmlElement({
  element,
  classNames = ['dragging', 'drag-grid'],
  useNoteContainer = false,
}: {
  element: HTMLElement;
  classNames?: string[];
  useNoteContainer?: boolean;
}): HTMLElement {
  const ghostElement = element.cloneNode(true) as HTMLElement;
  ghostElement.classList.add(...classNames);
  // Strip selected-state classes from the root and any descendants so the
  // accent outline / fill doesn't bleed into the drag image.
  const SELECTED_CLASSES = [
    'bg-(--accent-color)!',
    'border-(--accent-color)!',
    'cm-background-selected',
  ];
  ghostElement.classList.remove(...SELECTED_CLASSES);
  for (const cls of SELECTED_CLASSES) {
    for (const el of Array.from(ghostElement.getElementsByClassName(cls))) {
      el.classList.remove(cls);
    }
  }

  for (const excluded of ghostElement.querySelectorAll(
    `[${DRAG_GHOST_EXCLUDE_ATTR}]`
  )) {
    excluded.remove();
  }
  if (ghostElement.hasAttribute(DRAG_GHOST_EXCLUDE_ATTR)) {
    ghostElement.removeAttribute(DRAG_GHOST_EXCLUDE_ATTR);
  }

  if (useNoteContainer) {
    const noteContainer = document.getElementById('note-container');
    if (noteContainer) {
      ghostElement.style.fontFamily = noteContainer.style.fontFamily;
    }
  }
  return ghostElement;
}

// Throttles a function so it fires immediately then at most once per wait interval, trailing calls are coalesced.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const throttle = <T extends (...args: any[]) => any>(
  fn: T,
  wait = 300
): ((...args: Parameters<T>) => ReturnType<T>) => {
  let inThrottle: boolean;
  let lastFn: ReturnType<typeof setTimeout>;
  let lastTime: number;

  return function (
    this: unknown,
    ...args: Parameters<T>
  ): ReturnType<T> | undefined {
    if (!inThrottle) {
      const result: ReturnType<T> = fn.apply(this, args) as ReturnType<T>;
      lastTime = Date.now();
      inThrottle = true;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return result;
    }
    clearTimeout(lastFn);
    lastFn = setTimeout(
      () => {
        if (Date.now() - lastTime >= wait) {
          fn.apply(this, args);
          lastTime = Date.now();
        }
      },
      Math.max(wait - (Date.now() - lastTime), 0)
    );
  } as (...args: Parameters<T>) => ReturnType<T>;
};
