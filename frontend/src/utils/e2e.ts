declare global {
  interface Window {
    __BYTEBOOK_E2E__?: boolean;
  }
}

// Returns true when the app is running under the end-to-end test harness.
export function isE2ETestEnvironment(): boolean {
  return typeof window !== 'undefined' && window.__BYTEBOOK_E2E__ === true;
}
