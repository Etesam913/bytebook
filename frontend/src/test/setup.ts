import '@testing-library/jest-dom';
import { JSDOM } from 'jsdom';

// Create a lightweight DOM for the Bun test environment.
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost',
});

const { window } = dom;

Object.assign(globalThis, {
  window,
  document: window.document,
  navigator: window.navigator,
  KeyboardEvent: window.KeyboardEvent,
  HTMLElement: window.HTMLElement,
  HTMLAnchorElement: window.HTMLAnchorElement,
  Node: window.Node,
});

// Align the computed style helper with the JSDOM window.
globalThis.getComputedStyle = window.getComputedStyle.bind(window);
