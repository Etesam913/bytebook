import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BrowserContext } from '@playwright/test';

// Minimal Playwright-side shim that lets us fake any generated Wails binding
// by intercepting the runtime RPC call and short-circuiting it with data.

type BindingIdentifier = {
  /**
   * Path inside the generated `bindings` directory, e.g.
   * `github.com/etesam913/bytebook/internal/services/folderservice.js`.
   */
  file: string;
  /** Exported function name inside the binding file, e.g. `GetFolders`. */
  method: string;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bindingsRoot = path.resolve(__dirname, '../../../bindings');
// Cache the method ids we scrape from the generated bindings so multiple tests
// can reuse them without re-reading disk.
const methodIdCache = new Map<string, number>();
// Track which BrowserContexts already have the fetch shim injected to avoid
// patching the same context more than once.
const patchedContexts = new WeakSet<BrowserContext>();

export async function mockBinding(
  context: BrowserContext,
  identifier: BindingIdentifier,
  response: unknown
) {
  await ensureFetchIsPatched(context);
  const methodId = getMethodId(identifier);

  // Register the mock payload on the window before any app code runs.
  await context.addInitScript(
    ({ methodId, response }) => {
      (
        window as typeof window & {
          __BYTEBOOK_REGISTER_WAILS_MOCK__?: (
            methodId: number,
            payload: unknown
          ) => void;
        }
      ).__BYTEBOOK_REGISTER_WAILS_MOCK__?.(methodId, response);
    },
    { methodId, response }
  );
}

/**
 * Retrieves the method ID for a given binding function by parsing the generated binding file.
 * Looks for the numeric method ID used in `$Call.ByID(<number>)` to keep tests resilient to regeneration.
 * Caches the IDs for repeated access. Throws if the file or method cannot be found.
 *
 * @param {BindingIdentifier} param0 - An object containing the binding file and exported method name.
 * @returns {number} The numeric method ID used for Wails RPC calls.
 */
function getMethodId({ file, method }: BindingIdentifier): number {
  const normalizedFile = file.endsWith('.js') ? file : `${file}.js`;
  const cacheKey = `${normalizedFile}::${method}`;

  if (methodIdCache.has(cacheKey)) {
    return methodIdCache.get(cacheKey)!;
  }

  const filePath = path.resolve(bindingsRoot, normalizedFile);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Binding file not found: ${filePath}`);
  }

  // The generated bindings always call into Wails via `$Call.ByID(<number>)`.
  // Parsing that number keeps our tests resilient to regeneration.
  const contents = fs.readFileSync(filePath, 'utf-8');
  const regex = new RegExp(
    `export\\s+function\\s+${method}\\s*\\([^]*?\\$Call\\.ByID\\((\\d+)`,
    'm'
  );
  const match = contents.match(regex);

  if (!match?.[1]) {
    throw new Error(
      `Unable to find method id for ${method} in ${normalizedFile}`
    );
  }

  const methodId = Number(match[1]);
  methodIdCache.set(cacheKey, methodId);
  return methodId;
}
/**
 * Ensures that the Playwright browser context has a patched fetch method
 * which intercepts Wails backend calls and responds with mocked payloads
 * registered by the test runner. This allows for fast, deterministic
 * end-to-end tests with stubbed backend responses.
 */
async function ensureFetchIsPatched(context: BrowserContext) {
  if (patchedContexts.has(context)) return;
  patchedContexts.add(context);

  await context.addInitScript(() => {
    const globalWindow = window as typeof window & {
      __BYTEBOOK_REGISTER_WAILS_MOCK__?: (
        methodId: number,
        payload: unknown
      ) => void;
      __BYTEBOOK_WAILS_MOCKS__?: Map<number, unknown>;
      _wails?: {
        callResultHandler?: (id: string, data: string, isJSON: boolean) => void;
      };
    };

    if (globalWindow.__BYTEBOOK_REGISTER_WAILS_MOCK__) {
      return;
    }

    const mockStore = new Map<number, unknown>();
    globalWindow.__BYTEBOOK_WAILS_MOCKS__ = mockStore;
    globalWindow.__BYTEBOOK_REGISTER_WAILS_MOCK__ = (methodId, payload) => {
      mockStore.set(methodId, payload);
    };

    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (typeof requestUrl === 'string') {
        try {
          const url = new URL(requestUrl, window.location.origin);

          const isRuntimeCall =
            url.pathname === '/wails/runtime' &&
            url.searchParams.get('object') === '0' &&
            url.searchParams.get('method') === '0';

          if (isRuntimeCall) {
            const encodedArgs = url.searchParams.get('args');

            if (encodedArgs) {
              const callArgs = JSON.parse(encodedArgs);
              const methodId = callArgs['methodID'];
              const mockResponse = mockStore.get(methodId);

              if (mockResponse) {
                // Wails resolves calls through `window._wails.callResultHandler`,
                // so we trigger it manually with our payload and skip the network.
                queueMicrotask(() => {
                  globalWindow._wails?.callResultHandler?.(
                    callArgs['call-id'],
                    JSON.stringify(mockResponse ?? {}),
                    true
                  );
                });

                return new Response('', { status: 200 });
              }
            }
          }
        } catch {
          // If parsing fails, fall back to the original fetch.
        }
      }

      return originalFetch(input as RequestInfo, init);
    };
  });
}
