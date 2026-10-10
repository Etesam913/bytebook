import { useSetAtom } from 'jotai';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Dispatch, SetStateAction, useEffect } from 'react';
import type { KernelInstanceSnapshot } from '@bindings/kernel_manager/models';
import {
  EnsureKernel,
  IsPathAValidVirtualEnvironment,
  ListKernels,
  ShutdownKernel,
  ShutdownKernelsByLanguage,
} from '@bindings/services/codeservice';
import { kernelInstancesAtom } from '@/atoms';
import {
  isValidKernelLanguage,
  KernelHeartbeatStatus,
  KernelInstanceData,
  KernelStatus,
  LANGUAGES,
  LanguagesWithKernels,
  ProjectSettings,
} from '@/types';
import { logger } from '@utils/logging';
import { DEFAULT_SONNER_OPTIONS } from '@utils/general';
import {
  getBackendResponseData,
  requireBackendResponseData,
} from '@utils/query';
import { queryKeys } from '@utils/query-keys';
import {
  KERNEL_INSTANCE_CREATED,
  KERNEL_INSTANCE_SHUTDOWN,
  KERNEL_INSTANCE_STATUS,
  KERNEL_INSTANCE_HEARTBEAT,
  KERNEL_INSTANCE_LAUNCH_ERROR,
  KERNEL_INSTANCE_EXITED,
} from '@bindings/util/event-names';
import { useWailsEvent } from '@hooks/events';
import { useUpdateProjectSettingsMutation } from '@hooks/project-settings';

function isKernelHeartbeatStatus(
  status: unknown
): status is KernelHeartbeatStatus {
  return status === 'success' || status === 'failure' || status === 'idle';
}

export function isKernelStatus(status: unknown): status is KernelStatus {
  return status === 'busy' || status === 'idle' || status === 'starting';
}

// Returns null for languages the app does not run kernels for.
function toKernelInstanceData(
  snapshot: KernelInstanceSnapshot,
  status: KernelStatus
): KernelInstanceData | null {
  if (!isValidKernelLanguage(snapshot.language)) return null;
  return {
    id: snapshot.id,
    language: snapshot.language,
    noteId: snapshot.noteId,
    status,
    heartbeat: isKernelHeartbeatStatus(snapshot.heartbeat)
      ? snapshot.heartbeat
      : 'idle',
    errorMessage: null,
    lastActivityAt: snapshot.lastActivityAt,
  };
}

/**
 * Hydrates kernelInstancesAtom with kernels that were already alive before the
 * current React tree subscribed to kernel:instance:* events.
 */
export function useKernelInstancesQuery() {
  const setInstances = useSetAtom(kernelInstancesAtom);

  const { data: instances } = useQuery({
    queryKey: queryKeys.kernelInstances(),
    staleTime: Infinity,
    queryFn: async () => {
      const snapshots = await requireBackendResponseData(ListKernels());

      return snapshots.reduce<Record<string, KernelInstanceData>>(
        (acc, snapshot) => {
          const instance = toKernelInstanceData(
            snapshot,
            snapshot.activeExecutions > 0 ? 'busy' : 'idle'
          );
          if (instance) acc[snapshot.id] = instance;
          return acc;
        },
        {}
      );
    },
  });

  useEffect(() => {
    if (!instances) return;
    setInstances(instances);
  }, [instances, setInstances]);
}

/**
 * Wires every kernel:instance:* event into kernelInstancesAtom.
 * This is app-level state, so it should be mounted once from App.
 */
export function useKernelInstanceEvents() {
  const setInstances = useSetAtom(kernelInstancesAtom);

  function removeInstance(instanceId: string) {
    setInstances((prev) => {
      const next = { ...prev };
      delete next[instanceId];
      return next;
    });
  }

  useWailsEvent(KERNEL_INSTANCE_CREATED, (body) => {
    logger.event(KERNEL_INSTANCE_CREATED);
    const instance = toKernelInstanceData(body.data, 'starting');
    if (!instance) return;
    setInstances((prev) => ({ ...prev, [instance.id]: instance }));
  });

  useWailsEvent(KERNEL_INSTANCE_STATUS, (body) => {
    logger.event(KERNEL_INSTANCE_STATUS);
    const data = body.data;
    if (!isKernelStatus(data.status)) return;
    const status = data.status;
    setInstances((prev) => {
      const existing = prev[data.id];
      if (!existing) return prev;
      return {
        ...prev,
        [data.id]: {
          ...existing,
          status,
          lastActivityAt: Date.now(),
        },
      };
    });
  });

  useWailsEvent(KERNEL_INSTANCE_HEARTBEAT, (body) => {
    logger.event(KERNEL_INSTANCE_HEARTBEAT);
    const data = body.data;
    if (!isKernelHeartbeatStatus(data.status)) return;
    const heartbeat = data.status;
    setInstances((prev) => {
      const existing = prev[data.id];
      if (!existing) return prev;
      return { ...prev, [data.id]: { ...existing, heartbeat } };
    });
  });

  useWailsEvent(KERNEL_INSTANCE_SHUTDOWN, (body) => {
    logger.event(KERNEL_INSTANCE_SHUTDOWN);
    removeInstance(body.data.id);
  });

  useWailsEvent(KERNEL_INSTANCE_EXITED, (body) => {
    logger.event(KERNEL_INSTANCE_EXITED);
    removeInstance(body.data.id);
  });

  useWailsEvent(KERNEL_INSTANCE_LAUNCH_ERROR, (body) => {
    logger.event(KERNEL_INSTANCE_LAUNCH_ERROR);
    const data = body.data;
    toast.error(data.errorMessage, DEFAULT_SONNER_OPTIONS);
    setInstances((prev) => {
      const existing = prev[data.id];
      if (!existing) return prev;
      return {
        ...prev,
        [data.id]: { ...existing, errorMessage: data.errorMessage },
      };
    });
  });
}

/**
 * Shut down a single kernel instance by id.
 */
export function useShutdownKernelMutation() {
  return useMutation({
    mutationFn: async ({
      kernelInstanceId,
      restart,
    }: {
      kernelInstanceId: string;
      restart: boolean;
    }) => {
      await getBackendResponseData(ShutdownKernel(kernelInstanceId, restart));
    },
  });
}

/**
 * Ensure a kernel exists for (noteId, language) without sending an execute_request.
 * Used by the bottom-bar "turn on kernel" button.
 */
export function useEnsureKernelMutation() {
  return useMutation({
    mutationFn: async ({
      noteId,
      language,
    }: {
      noteId: string;
      language: LanguagesWithKernels;
    }) => {
      const data = await getBackendResponseData(EnsureKernel(noteId, language));
      return data?.kernelInstanceId ?? null;
    },
  });
}

/**
 * Hook that updates Python venv settings and shuts down all active python kernels
 * so they pick up the new interpreter on next launch.
 */
type pythonVenvMutationParams = {
  formData: FormData;
  setErrorText: Dispatch<SetStateAction<string>>;
};

export function usePythonVenvSubmitMutation(projectSettings: ProjectSettings) {
  const { mutateAsync: updateProjectSettings } =
    useUpdateProjectSettingsMutation();

  return useMutation({
    mutationFn: async (variables: pythonVenvMutationParams) => {
      const { formData } = variables;
      const selectedVenvPath = formData.get('venv-path-option');
      const customVenvPathValue = formData.get('custom-venv-path-value');
      if (typeof selectedVenvPath !== 'string' || !selectedVenvPath) {
        throw new Error('No virtual environment path provided');
      }

      const check = await IsPathAValidVirtualEnvironment(selectedVenvPath);
      if (!check.success) {
        throw new Error(check.message);
      }
      let newCustomVenvPaths = projectSettings.code.customPythonVenvPaths;
      if (
        typeof customVenvPathValue === 'string' &&
        customVenvPathValue !== '' &&
        selectedVenvPath === customVenvPathValue
      ) {
        newCustomVenvPaths = [
          ...new Set([
            ...projectSettings.code.customPythonVenvPaths,
            selectedVenvPath,
          ]),
        ];
      }
      await updateProjectSettings({
        newProjectSettings: {
          ...projectSettings,
          code: {
            ...projectSettings.code,
            pythonVenvPath: selectedVenvPath,
            customPythonVenvPaths: newCustomVenvPaths,
          },
        },
      });

      // Tear down every existing python kernel; they will be recreated on next execute.
      await ShutdownKernelsByLanguage(LANGUAGES.PYTHON);
      return true;
    },
    onError: (error, variables) => {
      const { setErrorText } = variables;
      if (error instanceof Error) {
        setErrorText(error.message);
      } else {
        setErrorText('An unknown error occurred');
      }
    },
  });
}
