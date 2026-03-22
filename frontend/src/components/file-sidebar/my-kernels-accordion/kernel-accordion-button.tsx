import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { cn } from '../../../utils/string-formatting';
import { navigate } from 'wouter/use-browser-location';
import {
  contextMenuDataAtom,
  kernelsDataAtom,
  sidebarSelectionAtom,
} from '../../../atoms';
import {
  handleContextMenuSelection,
  type SetSelectionUpdater,
} from '../../../utils/selection';
import PowerOff from '../../../icons/power-off';
import { Play } from '../../../icons/circle-play';
import {
  useShutdownKernelMutation,
  useTurnOnKernelMutation,
} from '../../../hooks/code';
import type { Languages, LanguagesWithKernels } from '../../../types';
import { currentZoomAtom } from '../../../hooks/resize';
import { routeUrls } from '../../../utils/routes';
import { getKernelIcon } from './index';
import { KernelHeartbeat } from './kernel-heartbeat';

export function KernelAccordionButton({
  kernelName,
  kernelNameFromUrl,
}: {
  kernelName: Languages;
  kernelNameFromUrl: string | undefined;
}) {
  const [sidebarSelection, setSidebarSelection] = useAtom(sidebarSelectionAtom);
  const selectionRange = sidebarSelection.selections;
  const setSelectionRange: SetSelectionUpdater = (updater) => {
    setSidebarSelection((prev) => ({
      ...prev,
      selections: updater(prev.selections),
    }));
  };
  const isActive = decodeURIComponent(kernelNameFromUrl ?? '') === kernelName;
  const isSelected = selectionRange.has(`kernel:${kernelName}`);
  const kernelsData = useAtomValue(kernelsDataAtom);
  const kernelData = kernelsData[kernelName as LanguagesWithKernels];
  const { status, heartbeat } = kernelData;
  const setContextMenuData = useSetAtom(contextMenuDataAtom);
  const { mutate: shutdownKernel } = useShutdownKernelMutation(kernelName);
  const { mutate: turnOnKernel } = useTurnOnKernelMutation({
    language: kernelName,
  });
  const currentZoom = useAtomValue(currentZoomAtom);

  const isKernelRunning = heartbeat === 'success';

  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => e.preventDefault()}
      className={cn(
        'list-sidebar-item text-sm transition-none',
        isActive && 'bg-zinc-150 dark:bg-zinc-700',
        isSelected && 'bg-(--accent-color)! text-white'
      )}
      onClick={(e) => {
        if (e.metaKey || e.shiftKey) return;
        navigate(routeUrls.kernel(kernelName));
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        handleContextMenuSelection({
          setSelectionRange,
          itemType: 'kernel',
          itemName: kernelName,
          onlyOne: true,
        });
        setContextMenuData({
          x: e.clientX / currentZoom,
          y: e.clientY / currentZoom,
          isShowing: true,
          items: [
            {
              label: (
                <span className="flex items-center gap-1.5">
                  {isKernelRunning ? (
                    <PowerOff height={12} width={12} />
                  ) : (
                    <Play height={18} width={18} />
                  )}
                  {isKernelRunning ? 'Stop Kernel' : 'Start Kernel'}
                </span>
              ),
              value: isKernelRunning ? 'stop-kernel' : 'start-kernel',
              onChange: () => {
                if (isKernelRunning) {
                  shutdownKernel(false);
                } else {
                  turnOnKernel({});
                }
              },
            },
          ],
        });
      }}
    >
      <div className="flex items-center gap-2">
        {getKernelIcon(kernelName, 18)}
        <KernelHeartbeat
          status={status}
          heartbeat={heartbeat}
          isBlinking={false}
          className="h-2.25 w-2.25"
        />
      </div>
      <p className="whitespace-nowrap text-ellipsis overflow-hidden capitalize">
        {kernelName}
      </p>
    </button>
  );
}
