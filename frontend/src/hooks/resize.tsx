import { useAtom, useSetAtom } from 'jotai/react';
import { useWailsEvent, WailsEvent } from './events';
import { logger } from '../utils/logging';
import { atom } from 'jotai';
import { isFullscreenAtom } from '../atoms';
import { useEffect } from 'react';

const MIN_ZOOM = 0.75;
const DEFAULT_ZOOM = 1;
const MAX_ZOOM = 1.25;
const ZOOM_STEP = 0.1;

const ZOOM_STORAGE_KEY = 'currentZoom';

const initializeZoom = (): number => {
  try {
    const stored = localStorage.getItem(ZOOM_STORAGE_KEY);
    if (stored) {
      const parsed = parseFloat(stored);
      if (!isNaN(parsed) && parsed >= MIN_ZOOM && parsed <= MAX_ZOOM) {
        return parsed;
      }
    }
  } catch {
    // Ignore localStorage errors
  }
  return DEFAULT_ZOOM;
};

export const currentZoomAtom = atom(
  initializeZoom(),
  (_, set, newZoom: number) => {
    // Clamp the value to valid range
    const clampedZoom = Math.min(Math.max(newZoom, MIN_ZOOM), MAX_ZOOM);
    localStorage.setItem(ZOOM_STORAGE_KEY, clampedZoom.toString());
    set(currentZoomAtom, clampedZoom);
  }
);

/**
 * React hook that listens for Wails "zoom:in", "zoom:out", and "zoom:reset" events
 * and adjusts the document body's zoom level accordingly.
 *
 * - "zoom:in" increases zoom by ZOOM_STEP up to MAX_ZOOM.
 * - "zoom:out" decreases zoom by ZOOM_STEP down to MIN_ZOOM.
 * - "zoom:reset" resets zoom to DEFAULT_ZOOM.
 *
 * Usage: Call this hook once in your app's root component to enable
 * menu-driven zoom in/out functionality.
 */
export function useZoom() {
  const [currentZoom, setCurrentZoom] = useAtom(currentZoomAtom);

  // Apply the stored zoom level on initial mount
  useEffect(() => {
    document.body.style.zoom = currentZoom.toString();
  }, []);

  useWailsEvent('zoom:in', () => {
    const newZoom = Math.min(currentZoom + ZOOM_STEP, MAX_ZOOM);
    setCurrentZoom(newZoom);
    document.body.style.zoom = newZoom.toString();
  });

  useWailsEvent('zoom:out', () => {
    const newZoom = Math.max(currentZoom - ZOOM_STEP, MIN_ZOOM);
    setCurrentZoom(newZoom);
    document.body.style.zoom = newZoom.toString();
  });

  useWailsEvent('zoom:reset', () => {
    setCurrentZoom(DEFAULT_ZOOM);
    document.body.style.zoom = DEFAULT_ZOOM.toString();
  });
}

/**
 * Hook to listen for fullscreen events from the backend and update the atom
 */
export function useFullscreen() {
  const setIsFullscreen = useSetAtom(isFullscreenAtom);

  useWailsEvent('window:fullscreen', (event: WailsEvent) => {
    const isFullscreen = event.data as boolean;
    logger.event('window:fullscreen', isFullscreen);
    setIsFullscreen(isFullscreen);
  });
}

/**
 * Hook to listen for window reload events from the backend menu
 * and trigger a page reload.
 */
export function useWindowReload() {
  useWailsEvent('window:reload', () => {
    // Only refresh the window that currently has focus
    if (document.hasFocus()) {
      window.location.reload();
    }
  });
}

// export function useResizeState(): ResizeState {
//   const [isResizing, setIsResizing] = useState(false);

//   return {
//     isResizing,
//     setIsResizing,
//   };
// }
