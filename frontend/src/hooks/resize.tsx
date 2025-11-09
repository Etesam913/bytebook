import { useAtom, useSetAtom } from 'jotai/react';
import { useState } from 'react';
import type { ResizeState } from '../types';
import { useWailsEvent, WailsEvent } from './events';
import { atom } from 'jotai';
import { isFullscreenAtom } from '../atoms';

const MIN_ZOOM = 0.75;
export const currentZoomAtom = atom(1);
const MAX_ZOOM = 1.25;
const ZOOM_STEP = 0.1;

/**
 * React hook that listens for Wails "zoom:in" and "zoom:out" events
 * and adjusts the document body's zoom level accordingly.
 *
 * - "zoom:in" increases zoom by ZOOM_STEP up to MAX_ZOOM.
 * - "zoom:out" decreases zoom by ZOOM_STEP down to MIN_ZOOM.
 *
 * Usage: Call this hook once in your app's root component to enable
 * menu-driven zoom in/out functionality.
 */
export function useZoom() {
  const [currentZoom, setCurrentZoom] = useAtom(currentZoomAtom);

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
}

/**
 * Hook to listen for fullscreen events from the backend and update the atom
 */
export function useFullscreen() {
  const setIsFullscreen = useSetAtom(isFullscreenAtom);

  useWailsEvent('window:fullscreen', (event: WailsEvent) => {
    const isFullscreen = event.data as boolean;
    console.info('window:fullscreen', isFullscreen);
    setIsFullscreen(isFullscreen);
  });
}

export function useResizeState(): ResizeState {
  const [isResizing, setIsResizing] = useState(false);

  return {
    isResizing,
    setIsResizing,
  };
}
