import { useSetAtom } from 'jotai';
import { Button } from 'react-aria-components/Button';
import { cn } from '@utils/string-formatting';
import { navigate } from 'wouter/use-browser-location';
import { contextMenuDataAtom } from '@/atoms';
import { PowerOff } from '@/icons/power-off';
import { ShutdownKernelsByLanguage } from '@bindings/services/codeservice';
import type { LanguagesWithKernels } from '@/types';
import { routeUrls } from '@utils/routes';
import { getKernelIcon } from './index';

export function KernelAccordionButton({
  kernelName,
  kernelNameFromUrl,
  instanceCount,
}: {
  kernelName: LanguagesWithKernels;
  kernelNameFromUrl: string | undefined;
  instanceCount: number;
}) {
  const isActive = decodeURIComponent(kernelNameFromUrl ?? '') === kernelName;
  const setContextMenuData = useSetAtom(contextMenuDataAtom);

  const hasRunningInstances = instanceCount > 0;

  return (
    <Button
      className={cn(
        'list-sidebar-item text-sm transition-none',
        isActive && 'bg-zinc-150 dark:bg-zinc-700'
      )}
      onPress={() => {
        navigate(routeUrls.kernel(kernelName));
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        if (!hasRunningInstances) return;
        setContextMenuData({
          x: e.clientX,
          y: e.clientY,
          isShowing: true,
          targetId: null,
          items: [
            {
              label: (
                <span className="flex items-center gap-1.5">
                  <PowerOff height="0.75rem" width="0.75rem" />
                  Stop All {kernelName} Kernels
                </span>
              ),
              value: 'stop-all',
              onChange: () => {
                void ShutdownKernelsByLanguage(kernelName);
              },
            },
          ],
        });
      }}
    >
      <div className="flex items-center gap-2">
        {getKernelIcon(kernelName, '1.125rem')}
        {hasRunningInstances && (
          <span className="rounded-full bg-green-500 dark:bg-green-600 h-2 w-2" />
        )}
      </div>
      <p className="whitespace-nowrap text-ellipsis overflow-hidden capitalize">
        {kernelName}
        {instanceCount > 0 && (
          <span className="ml-1 text-xs text-zinc-500 dark:text-zinc-400">
            ×{instanceCount}
          </span>
        )}
      </p>
    </Button>
  );
}
