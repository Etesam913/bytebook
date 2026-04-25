import '@testing-library/jest-dom';
import { JSDOM } from 'jsdom';

// Create a lightweight DOM for the Bun test environment.
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost',
});

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
const domWindow = dom.window as unknown as typeof globalThis;

Object.assign(globalThis, {
  window: domWindow,
  document: domWindow.document,
  navigator: domWindow.navigator,
  KeyboardEvent: domWindow.KeyboardEvent,
  MouseEvent: domWindow.MouseEvent,
  HTMLElement: domWindow.HTMLElement,
  HTMLAnchorElement: domWindow.HTMLAnchorElement,
  Node: domWindow.Node,
});

// Align the computed style helper with the JSDOM window.
globalThis.getComputedStyle = domWindow.getComputedStyle.bind(domWindow);
