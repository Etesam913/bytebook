import { atom } from 'jotai';
import type { RefObject } from 'react';
import { BaseSelection, LexicalEditor } from 'lexical';

// Drag and drop atoms
export const draggedElementAtom = atom<HTMLElement | null>(null);
export const draggableBlockElementAtom = atom<HTMLElement | null>(null);

// Editor core atoms
export const editorAtom = atom<LexicalEditor | null>(null);
export const noteSelectionAtom = atom<BaseSelection | null>(null);

// Note container and observer atoms
export const noteContainerRefAtom = atom<RefObject<HTMLElement | null> | null>(
  null
);
export const noteIntersectionObserverAtom = atom<IntersectionObserver | null>(
  null
);

// Note file tracking atoms
export const noteSeenFileNodeKeysAtom = atom<Set<string>>(new Set([]));

// Previous markdown tracking atom
export const previousMarkdownAtom = atom<string>('');
