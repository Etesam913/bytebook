declare global {
  interface Window {
    __BYTEBOOK_E2E__?: boolean;
  }
}

export function isE2ETestEnvironment(): boolean {
  return typeof window !== 'undefined' && window.__BYTEBOOK_E2E__ === true;
}
