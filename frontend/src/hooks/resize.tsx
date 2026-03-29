import { useSetAtom } from 'jotai/react';
import { useWailsEvent, WailsEvent } from './events';
import {
  ZOOM_IN,
  ZOOM_OUT,
  ZOOM_RESET,
  FULLSCREEN,
  WINDOW_RELOAD,
} from '../utils/events';
import { logger } from '../utils/logging';
import { isFullscreenAtom } from '../atoms';
import { useEffect, useRef } from 'react';

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

function applyUiScale(zoom: number) {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.style.setProperty('--ui-scale', zoom.toString());

  if (typeof window !== 'undefined') {
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
    });
  }
}

function clampZoom(zoom: number) {
  return Math.min(Math.max(zoom, MIN_ZOOM), MAX_ZOOM);
}

function persistZoom(zoom: number) {
  try {
    localStorage.setItem(ZOOM_STORAGE_KEY, zoom.toString());
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * React hook that listens for Wails "zoom:in", "zoom:out", and "zoom:reset" events
 * and sets the CSS `--ui-scale` custom property (see `index.css`).
 *
 * - "zoom:in" increases zoom by ZOOM_STEP up to MAX_ZOOM.
 * - "zoom:out" decreases zoom by ZOOM_STEP down to MIN_ZOOM.
 * - "zoom:reset" resets zoom to DEFAULT_ZOOM.
 *
 * Usage: Call this hook once in your app's root component to enable
 * menu-driven zoom in/out functionality.
 */
export function useZoom() {
  const zoomRef = useRef(initializeZoom());

  useEffect(() => {
    applyUiScale(zoomRef.current);
  }, []);

  const applyAndPersist = (nextZoom: number) => {
    const clamped = clampZoom(nextZoom);
    zoomRef.current = clamped;
    persistZoom(clamped);
    applyUiScale(clamped);
  };

  useWailsEvent(ZOOM_IN, () => {
    applyAndPersist(zoomRef.current + ZOOM_STEP);
  });
  useWailsEvent(ZOOM_OUT, () => {
    applyAndPersist(zoomRef.current - ZOOM_STEP);
  });
  useWailsEvent(ZOOM_RESET, () => {
    applyAndPersist(DEFAULT_ZOOM);
  });
}

/**
 * Hook to listen for fullscreen events from the backend and update the atom
 */
export function useFullscreen() {
  const setIsFullscreen = useSetAtom(isFullscreenAtom);

  useWailsEvent(FULLSCREEN, (event: WailsEvent) => {
    const isFullscreen = event.data as boolean;
    logger.event(FULLSCREEN, isFullscreen);
    setIsFullscreen(isFullscreen);
  });
}

/**
 * Hook to listen for window reload events from the backend menu
 * and trigger a page reload.
 */
export function useWindowReload() {
  useWailsEvent(WINDOW_RELOAD, () => {
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
