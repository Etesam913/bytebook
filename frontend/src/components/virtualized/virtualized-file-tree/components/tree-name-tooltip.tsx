import { useEffect, useEffectEvent, useState } from 'react';
import type { FileTree } from '@pierre/trees';
import { TooltipTrigger } from 'react-aria-components/Tooltip';
import { TooltipContent } from '@components/tooltip';

const OPEN_DELAY_MS = 1500;

type HoveredRow = { anchor: HTMLElement; name: string; path: string };

function isRow(node: EventTarget | undefined): node is HTMLElement {
  return node instanceof HTMLElement && node.dataset.type === 'item';
}

function getRowInfo(row: HTMLElement): HoveredRow | null {
  const name = row.getAttribute('aria-label');
  const path = row.dataset.itemPath;
  const anchor = row.querySelector<HTMLElement>(
    '[data-item-section="content"]'
  );
  if (
    !name ||
    !path ||
    !anchor ||
    row.querySelector('[data-item-rename-input]')
  )
    return null;
  return { anchor, name, path };
}

export function TreeNameTooltip({ model }: { model: FileTree }) {
  const [hovered, setHovered] = useState<HoveredRow | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  // Closed by an interaction; stays closed until the pointer reaches another row.
  const [dismissedPath, setDismissedPath] = useState<string | null>(null);

  const dismiss = useEffectEvent(() => {
    setDismissedPath(hovered?.path ?? null);
    setIsOpen(false);
  });
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === 'Escape') dismiss();
  });

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    let row: HTMLElement | null = null;
    let observedRoot: ShadowRoot | null = null;
    const observer = new MutationObserver(() => sync());
    function sync() {
      // Pierre attaches the shadow root in a later layout effect, so resolve
      // it on demand instead of at mount.
      const root = model.getFileTreeContainer()?.shadowRoot;
      if (!root) return;
      if (observedRoot !== root) {
        observedRoot = root;
        // Rows are recycled by virtualization, renamed, or swapped for an input.
        observer.disconnect();
        observer.observe(root, {
          subtree: true,
          childList: true,
          attributes: true,
          attributeFilter: ['aria-label', 'data-item-dragging'],
        });
        // Scroll stays inside the shadow root and moves rows under a still
        // pointer, so close rather than follow.
        root.addEventListener('scroll', dismiss, { signal, capture: true });
      }
      const next =
        row?.isConnected && !root.querySelector('[data-item-dragging]')
          ? getRowInfo(row)
          : null;
      setHovered((prev) =>
        prev?.anchor === next?.anchor && prev?.name === next?.name ? prev : next
      );
      if (!next) setIsOpen(false);
      setDismissedPath((prev) => (next?.path === prev ? prev : null));
    }
    // pointerover is retargeted between shadow-DOM rows. pointermove keeps
    // exposing the current row through composedPath(), including after mount.
    const onPointer = (event: PointerEvent) => {
      if (event.buttons !== 0) return;
      if (event.type === 'pointerout') {
        if (event.relatedTarget) return;
        row = null;
      } else {
        const host = model.getFileTreeContainer();
        const path = event.composedPath();
        row = host && path.includes(host) ? (path.find(isRow) ?? null) : null;
      }
      sync();
    };
    document.addEventListener('pointermove', onPointer, {
      signal,
      capture: true,
    });
    document.addEventListener('pointerout', onPointer, {
      signal,
      capture: true,
    });
    return () => {
      controller.abort();
      observer.disconnect();
    };
  }, [model]);

  useEffect(() => {
    if (!hovered || hovered.path === dismissedPath) return;
    const timer = setTimeout(() => setIsOpen(true), OPEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [hovered, dismissedPath]);

  useEffect(() => {
    const controller = new AbortController();
    const options = { signal: controller.signal, capture: true };
    document.addEventListener('pointerdown', dismiss, options);
    document.addEventListener('contextmenu', dismiss, options);
    document.addEventListener('keydown', onKeyDown, options);
    window.addEventListener('blur', dismiss, options);
    return () => controller.abort();
  }, []);

  if (!isOpen || !hovered) return null;
  // The standalone Tooltip crashes without a trigger state context, so a
  // controlled trigger supplies it; the anchor is overridden per row.
  return (
    <TooltipTrigger isOpen>
      <TooltipContent
        triggerRef={{ current: hovered.anchor }}
        placement="right"
        className="pointer-events-none [&:not([data-entering]):not([data-exiting])]:opacity-90"
      >
        {hovered.name}
      </TooltipContent>
    </TooltipTrigger>
  );
}
