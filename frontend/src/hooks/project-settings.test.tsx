import '../test/setup';
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  spyOn,
} from 'bun:test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import * as settingsService from '@bindings/services/settingsservice';
import { Events } from '@wailsio/runtime';
import { SETTINGS_UPDATE } from '@bindings/util/event-names';
import { DEFAULT_PROJECT_SETTINGS } from '@utils/project-settings';
import { ProjectSettingsJson } from '@bindings/config/models';
import {
  useProjectSettingsQuery,
  useProjectSettingsSync,
  useUpdateProjectSettingsMutation,
} from './project-settings';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function settingsResponse(lineHeight: number) {
  return {
    success: true,
    message: '',
    data: new ProjectSettingsJson({
      ...DEFAULT_PROJECT_SETTINGS,
      pinnedNotes: [],
      appearance: {
        ...DEFAULT_PROJECT_SETTINGS.appearance,
        editorLineHeight: lineHeight,
      },
    }),
  };
}

let save: ReturnType<typeof useUpdateProjectSettingsMutation>['mutateAsync'];
let current: ReturnType<typeof useProjectSettingsQuery>;

function SettingsReader() {
  const {
    data: {
      appearance: { editorLineHeight },
    },
  } = useProjectSettingsQuery();
  return <output>{editorLineHeight}</output>;
}

function SettingsHarness() {
  useProjectSettingsSync();
  const settings = useProjectSettingsQuery();
  const { mutateAsync } = useUpdateProjectSettingsMutation();
  useEffect(() => {
    current = settings;
    save = mutateAsync;
  });
  return <SettingsReader />;
}

async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('project settings synchronization', () => {
  let mount: HTMLDivElement;
  let root: Root;
  let client: QueryClient;
  const listeners = new Map<string, (event: never) => void>();
  const getSettings = spyOn(settingsService, 'GetProjectSettings');
  const updateSettings = spyOn(settingsService, 'UpdateProjectSettings');
  const onEvent = spyOn(Events, 'On');

  beforeEach(async () => {
    getSettings.mockImplementation(
      () =>
        Promise.resolve(settingsResponse(2)) as ReturnType<
          typeof settingsService.GetProjectSettings
        >
    );
    updateSettings.mockImplementation(
      () =>
        Promise.resolve(settingsResponse(2.3)) as ReturnType<
          typeof settingsService.UpdateProjectSettings
        >
    );
    onEvent.mockImplementation((name, callback) => {
      listeners.set(name, callback as (event: never) => void);
      return () => {
        listeners.delete(name);
      };
    });
    mount = document.createElement('div');
    document.body.append(mount);
    root = createRoot(mount);
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    act(() =>
      root.render(
        <QueryClientProvider client={client}>
          <SettingsHarness />
        </QueryClientProvider>
      )
    );
    await flush();
  });

  afterEach(() => {
    void act(() => root.unmount());
    client.clear();
    mount.remove();
    listeners.clear();
    getSettings.mockClear();
    updateSettings.mockClear();
    document.documentElement.removeAttribute('style');
  });

  afterAll(() => {
    getSettings.mockRestore();
    updateSettings.mockRestore();
    onEvent.mockRestore();
  });

  it('publishes the saved response to the reader without an event', async () => {
    await act(async () => {
      await save({
        newProjectSettings: {
          ...current.data,
          appearance: { ...current.data.appearance, editorLineHeight: 2.4 },
        },
      });
    });
    await flush();

    expect(mount.querySelector('output')?.textContent).toBe('2.3');
    expect(
      document.documentElement.style.getPropertyValue('--editor-line-height')
    ).toBe('2.3');
  });

  it('restores settings and appearance after a rejected save', async () => {
    updateSettings.mockImplementation(
      () =>
        Promise.resolve({
          success: false,
          message: 'Could not save',
        }) as ReturnType<typeof settingsService.UpdateProjectSettings>
    );

    let saveError: unknown;
    await act(async () => {
      try {
        await save({
          newProjectSettings: {
            ...current.data,
            appearance: { ...current.data.appearance, editorLineHeight: 2.4 },
          },
        });
      } catch (error) {
        saveError = error;
      }
    });
    await flush();

    expect(saveError).toMatchObject({ message: 'Could not save' });
    expect(current.data.appearance.editorLineHeight).toBe(2);
    expect(
      document.documentElement.style.getPropertyValue('--editor-line-height')
    ).toBe('2');
  });

  it('publishes settings events from another window to the reader and appearance', async () => {
    act(() =>
      listeners.get(SETTINGS_UPDATE)?.({
        data: settingsResponse(2.7).data,
      } as never)
    );
    await flush();

    expect(mount.querySelector('output')?.textContent).toBe('2.7');
    expect(
      document.documentElement.style.getPropertyValue('--editor-line-height')
    ).toBe('2.7');
  });
});
