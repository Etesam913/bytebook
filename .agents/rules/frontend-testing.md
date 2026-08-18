---
trigger: glob
globs: frontend/src/**/*.test.ts, frontend/src/**/*.test.tsx, frontend/tests/**/*.ts
paths:
  - 'frontend/src/**/*.test.{ts,tsx}'
  - 'frontend/tests/**/*.ts'
---

# Frontend testing

Write tests that protect user-visible behavior and stable public contracts. A test should fail when behavior regresses, not when an implementation is reorganized.

## Arrange, Act, Assert

Use **Arrange–Act–Assert (AAA)** as the default shape of every test:

1. **Arrange** only the state and dependencies required by the scenario.
2. **Act** once through the public API or a realistic user interaction.
3. **Assert** the observable result and any contractually important side effects.

Keep the phases in that order and separate phases with blank lines. Do not write explicit `// Arrange`, `// Act`, or `// Assert` comments — keep the structure implicit through clean line spacing. Do not interleave assertions with setup or hide the primary action inside a helper named like setup.

```ts
import { describe, expect, it } from 'bun:test';
import { replaceLastPathSegment } from './path';

describe('replaceLastPathSegment', () => {
  it('preserves the trailing slash when renaming a folder', () => {
    const originalPath = 'notes/old/';

    const result = replaceLastPathSegment(originalPath, 'new');

    expect(result).toBe('notes/new/');
  });
});
```

An assertion needed to prove the arrangement is valid may appear before the act—for example, confirming a switch starts unchecked—but keep the final outcome assertions after the act.

## Choose the narrowest useful test

- Use a **unit test** for pure functions, parsing, paths, transformations, geometry, validation, and small DOM/event utilities. Unit tests use `bun:test`.
- Use an **E2E test** when behavior depends on rendered React UI, routing, focus, keyboard or pointer interaction, Lexical, React Query, Wails bindings, or Wails events. E2E tests use Playwright with the mocked Wails runtime.
- Prefer several fast unit tests for a decision-heavy helper plus one E2E test for the critical user flow. Do not repeat every edge case at both levels.
- When fixing a bug, first add the smallest test that reproduces it. Verify that it fails for the original bug and passes after the fix.
- Test through the public surface. Avoid assertions against private variables, hook implementation details, Tailwind classes, React component structure, or exact render counts.

## What to cover

For each behavior, cover the smallest representative set that establishes the contract:

- the normal case;
- meaningful boundaries such as empty input, the first or last item, and minimum or maximum values;
- invalid or malformed input when production code promises a fallback;
- important state transitions, including success and failure paths;
- regressions that have previously occurred.

Do not mechanically test every permutation. Use table-driven cases with `it.each` when several inputs exercise the same rule, and separate tests when failures should communicate distinct behaviors.

```ts
import { describe, expect, it } from 'bun:test';
import { safeDecodeURIComponent } from './path';

describe('safeDecodeURIComponent', () => {
  it.each([
    { input: 'hello%20world', expected: 'hello world' },
    { input: 'plain text', expected: 'plain text' },
    { input: '50%', expected: '50%' },
  ])('returns $expected for $input', ({ input, expected }) => {
    const result = safeDecodeURIComponent(input);

    expect(result).toBe(expected);
  });
});
```

## Unit tests with Bun

### Location and structure

- Colocate unit tests with the source as `<module>.test.ts` or `<module>.test.tsx`.
- Import test APIs from `bun:test`, never Vitest or Jest.
- Use one `describe` per exported function or cohesive public behavior. Nest `describe` blocks only when distinct states become easier to scan.
- Use sentence-style names that state the observable result and condition: `it('returns the original value when decoding fails')`.
- For parameterized / table-driven testing across multiple inputs, use `it.each` instead of manual `for..of` loops.
- Keep each test focused on one act and one behavior. Multiple assertions are appropriate when they describe different parts of the same outcome.
- Put shared arrangement in `beforeEach` only when it genuinely improves readability. Keep scenario-specific arrangement in the test.

### DOM setup

- Bun does not provide a browser DOM. When a test reads `window` or `document`, or imports a module that does so, import `src/test/setup.ts` as the **first import**, using the correct relative path.
- The source module can be statically imported after the setup import unless module mocks must be installed first.
- Clean up DOM state created by a test. Remove appended nodes, reset `document.body`, and restore modified globals so results do not depend on test order.
- Prefer real DOM events and observable effects over calling private event helpers directly.

```ts
import '../test/setup';
import { afterEach, describe, expect, it, spyOn } from 'bun:test';
import { disableBackspaceNavigation } from './routing';

describe('disableBackspaceNavigation', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('lets an input handle backspace normally', () => {
    disableBackspaceNavigation();
    const input = document.createElement('input');
    document.body.append(input);
    input.focus();
    const event = new KeyboardEvent('keydown', { key: 'Backspace' });
    const preventDefault = spyOn(event, 'preventDefault');

    document.dispatchEvent(event);

    expect(preventDefault).not.toHaveBeenCalled();
  });
});
```

### Mocks and isolation

- Prefer dependency injection or a small real value over mocking. Mock only boundaries such as the Wails runtime, browser APIs, or notifications.
- Declare reusable mock functions at module scope and reset their calls and implementations in `beforeEach`.
- `mock.module()` is global across the Bun test process. Its replacement must cover every export that transitive imports in the suite may access.
- Install `mock.module()` replacements before importing the module under test. Use a dynamic `await import(...)` after the mocks are registered.
- Use `spyOn` when retaining the real object is useful. Restore spies or reset their behavior so another test cannot inherit them.
- Assert meaningful arguments and effects. Avoid overspecifying incidental call order unless order is part of the contract.

```ts
import '../../../test/setup';
import { beforeEach, describe, expect, it, mock } from 'bun:test';

const openUrl = mock<(url: string) => Promise<void>>(() => Promise.resolve());

void mock.module('@wailsio/runtime', () => ({
  Browser: { OpenURL: openUrl },
  // Include all other runtime namespaces required by transitive imports.
}));

const { handleATagClick } = await import('./link');

describe('handleATagClick', () => {
  beforeEach(() => {
    openUrl.mockReset();
    openUrl.mockImplementation(() => Promise.resolve());
  });

  it('opens an HTTPS link through the Wails browser API', () => {
    const anchor = document.createElement('a');
    anchor.href = 'https://example.com/docs';

    handleATagClick(anchor);

    expect(openUrl).toHaveBeenCalledWith('https://example.com/docs');
  });
});
```

### Determinism and assertions

- Tests must not depend on timezone, locale, wall clock, random data, network access, filesystem state outside a fixture, or execution order.
- If time itself is not under test, derive values relative to one captured `now` or inject the time source. When controlling system time, use `setSystemTime()` from `bun:test` and restore it in `afterEach`.
- Await promises and observable async results. Do not let rejected promises or background work escape the test.
- Prefer exact assertions (`toBe`, `toEqual`) for the core result. Use partial assertions (`toMatchObject`) only when unrelated fields are intentionally outside the contract.
- Avoid snapshots for small structured values; explicit assertions produce clearer failures and force deliberate contract changes.
- Never weaken or delete an assertion merely to make a failure pass. Confirm whether production behavior or the expectation is wrong.

## E2E tests with Playwright

E2E specs live under `frontend/tests/e2e/specs/`. Group them by feature, using nested directories for larger areas such as the editor (`frontend/tests/e2e/specs/editor/`). The suite runs Chromium against Vite (`http://localhost:5173`) and replaces Wails RPC (`/wails/runtime` HTTP interceptor) and events in the browser context; it does not require the desktop shell or a live Go backend.

### AAA in browser flows

Keep setup and mock registration in the Arrange phase, perform one cohesive user action in Act, then verify visible state and important backend interactions in Assert. A multi-step workflow may contain smaller AAA cycles, but each step should finish asserting its outcome before the next step begins.

```ts
test('opens a folder from the sidebar', async ({ page }) => {
  await page.goto('/');
  const sidebar = page.getByTestId('file-sidebar');

  // @pierre/trees renders row labels as truncation fragments, so locate the row by accessible treeitem role
  await sidebar.getByRole('treeitem', { name: 'Economics Notes' }).click();

  await expect(page).toHaveURL(/\/notes\/Economics%20Notes$/);
});
```

### Arrange backend behavior before navigation

- Register every Wails binding needed during startup in `test.beforeEach`, before the first `page.goto(...)`.
- Use `SERVICE_FILES` from `tests/e2e/utils/service-files.ts`; do not repeat generated binding paths in specs.
- Reuse response builders or constants from `tests/e2e/utils/mock-responses.ts`. Responses must match the `BackendResponse` shape expected by the frontend.
- `mockBinding(context, binding, response)` installs an initial response for future pages in that browser context.
- `updateMockBindingResponse(page, binding, response)` changes a response after the page loads, such as after a mutation or user action.
- Use `getMockBindingCalls(page, binding)` to assert RPC arguments. Since UI effects may be debounced or asynchronous, read calls inside `expect.poll(...)`.

```ts
import { expect, test } from '@playwright/test';
import { getMockBindingCalls, mockBinding } from '../utils/mock-binding';
import { MOCK_PROJECT_SETTINGS_RESPONSE } from '../utils/mock-responses';
import { SERVICE_FILES } from '../utils/service-files';

const updateSettings = {
  file: SERVICE_FILES.SETTINGS_SERVICE,
  method: 'UpdateProjectSettings',
};

test.beforeEach(async ({ context }) => {
  await mockBinding(
    context,
    { file: SERVICE_FILES.SETTINGS_SERVICE, method: 'GetProjectSettings' },
    MOCK_PROJECT_SETTINGS_RESPONSE
  );
  await mockBinding(context, updateSettings, {
    success: true,
    message: '',
    data: MOCK_PROJECT_SETTINGS_RESPONSE.data,
  });
});

test('saves the editor line height', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();
  const input = page.getByRole('spinbutton', { name: 'Editor line height' });

  await input.fill('2.4');
  await input.blur();

  await expect
    .poll(async () => {
      const calls = await getMockBindingCalls(page, updateSettings);
      return calls.at(-1)?.[0];
    })
    .toMatchObject({ appearance: { editorLineHeight: 2.4 } });
});
```

### Wails events

- Call `setupWailsEvents(context)` in `beforeEach` before navigation when a flow consumes or emits Wails events.
- Use `emitWailsEvent(page, name, data)` to simulate a backend event after the app registers its listeners.
- Use exact event names from `internal/util/events.go`; it remains the source of truth.
- When a mutation normally causes a backend event, model both halves explicitly: update the relevant binding response during Arrange, perform the user action, emit the event as part of Act, then assert the refreshed UI.

```ts
test.beforeEach(async ({ context }) => {
  await setupWailsEvents(context);
  // Register startup bindings here.
});

test('refreshes tags after the index changes', async ({ page }) => {
  await page.goto('/notes/example.md');
  await updateMockBindingResponse(page, getTagsBinding, updatedTagsResponse);

  await emitWailsEvent(page, 'tags:index_update', {});

  await expect(page.getByRole('option', { name: 'development' })).toBeVisible();
});
```

### Locators and interaction patterns

- **Priority**: Accessible role and name (`getByRole`), label (`getByLabel`), placeholder or visible text (`getByPlaceholder`, `getByText`), then `data-testid` (`getByTestId`) for elements without a stable accessible identity.
- **Tree and file navigation**: The sidebar tree (`@pierre/trees`) fragments row text across sub-elements. Always locate tree items by role: `sidebar.getByRole('treeitem', { name: 'Folder Name' })`.
- **Editor surface**: Locate the main editor container with `page.locator('#content-editable-editor')` or `#note-container`.
- **Selection & formatting**: Select text in the editor via `.click({ clickCount: 3 })` (triple-click line/paragraph) before asserting on floating toolbar actions (`page.getByTestId('floating-toolbar')`).
- **User actions**: Interact as a user would with `click`, `fill`, `press`, keyboard shortcuts, focus, and blur. Do not use `page.evaluate` to bypass the UI except for behavior unavailable through Playwright, such as the Wails shim or inspecting a CSS custom property.
- **Web-first assertions**: Use Playwright's web-first assertions (`await expect(locator).toBeVisible()`, `await expect(page).toHaveURL(...)`); they automatically retry while UI settles.
- **No fixed sleeps**: Never add fixed sleeps (`page.waitForTimeout`) to stabilize a spec. Wait for observable state, a binding call with `expect.poll`, or a specific event.
- **URL matching**: Assert encoded routes deliberately. Use exact URLs for fixed navigation and narrowly scoped regular expressions (e.g. `/\/notes\/Economics%20Notes$/`) when path suffixes or URL encoding require it.

### Test organization and isolation

- Put common arrangement in `test.beforeEach`; each Playwright test receives a fresh page and browser context, so tests must not depend on another test's mutations.
- Extract a helper when it represents a meaningful user action or repeated assertion, such as `openSettingsTab` or `expectLastSettingsUpdate`. Keep scenario-specific steps in the test so its AAA flow remains readable.
- Keep shared mock data immutable. Create a new object for scenario-specific changes rather than mutating an imported response used by parallel tests.
- The suite is fully parallel. Module-level mutable state must be read-only, safely cached, or scoped by browser context/page.
- Keep tests independent and retry-safe. A retry must not rely on state left by the first attempt.

## Running and verifying tests

Run commands from `frontend/` unless noted otherwise:

```bash
# One unit test file while iterating
bun test src/utils/path.test.ts

# All unit tests
bun run test:unit

# One E2E spec while iterating
bunx playwright test -c tests/e2e/playwright.config.ts tests/e2e/specs/navigation.spec.ts

# Interactive Playwright UI / Debugger
bunx playwright test -c tests/e2e/playwright.config.ts --ui
bunx playwright test -c tests/e2e/playwright.config.ts --debug

# All E2E tests (regenerates bindings and runs against Vite)
bun run test:e2e:ci

# Formatting, lint, types, dependency checks, and unit tests (repo root)
bun check:fe
```

> [!IMPORTANT]
> The E2E mock harness parses generated **`.js` binding files** to discover Wails method IDs. Run `bun run e2e:prepare` after adding, removing, renaming, or regenerating backend service methods. Do not pass a `-ts` flag; the harness requires JavaScript bindings.

Before handing off a change:

1. Run the narrowest affected test while iterating.
2. Run all tests in the affected layer.
3. Run `bun check:fe` from the repository root for frontend changes.
4. If a failure is unrelated or environment-dependent, report the exact command and failure; do not silently skip it.
