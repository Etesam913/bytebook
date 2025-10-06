import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { cn } from '../../../utils/string-formatting';
import { navigate } from 'wouter/use-browser-location';
import {
  contextMenuDataAtom,
  kernelsDataAtom,
  selectionRangeAtom,
} from '../../../atoms';
import { handleContextMenuSelection } from '../../../utils/selection';
import { KernelHeartbeat } from '../../kernel-info';
import PowerOff from '../../../icons/power-off';
import { Play } from '../../../icons/circle-play';
import {
  useShutdownKernelMutation,
  useTurnOnKernelMutation,
} from '../../../hooks/code';
import { Languages } from '../../../types';
import { currentZoomAtom } from '../../../hooks/resize';
import { routeUrls } from '../../../utils/routes';
import { getKernelIcon } from './index';

export function KernelAccordionButton({
  kernelName,
  kernelNameFromUrl,
}: {
  kernelName: Languages;
  kernelNameFromUrl: string | undefined;
}) {
  const [selectionRange, setSelectionRange] = useAtom(selectionRangeAtom);
  const isActive = decodeURIComponent(kernelNameFromUrl ?? '') === kernelName;
  const isSelected = selectionRange.has(`kernel:${kernelName}`);
  const kernelsData = useAtomValue(kernelsDataAtom);
  const { status, heartbeat } = kernelsData[kernelName];
  const setContextMenuData = useSetAtom(contextMenuDataAtom);
  const { mutate: shutdownKernel } = useShutdownKernelMutation(kernelName);
  const { mutate: turnOnKernel } = useTurnOnKernelMutation();
  const currentZoom = useAtomValue(currentZoomAtom);

  const isKernelRunning = heartbeat === 'success';

  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => e.preventDefault()}
      className={cn(
        'list-sidebar-item',
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
                  turnOnKernel(kernelName);
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
