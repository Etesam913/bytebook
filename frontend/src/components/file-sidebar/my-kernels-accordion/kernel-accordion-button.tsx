import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { cn } from '../../../utils/string-formatting';
import { navigate } from 'wouter/use-browser-location';
import {
  contextMenuDataAtom,
  kernelInstancesByLanguageAtom,
  sidebarSelectionAtom,
} from '../../../atoms';
import {
  handleContextMenuSelection,
  type SetSelectionUpdater,
} from '../../../utils/selection';
import PowerOff from '../../../icons/power-off';
import { ShutdownKernelsByLanguage } from '../../../../bindings/github.com/etesam913/bytebook/internal/services/codeservice';
import type { Languages, LanguagesWithKernels } from '../../../types';
import { routeUrls } from '../../../utils/routes';
import { getKernelIcon } from './index';

export function KernelAccordionButton({
  kernelName,
  kernelNameFromUrl,
  instanceCount,
}: {
  kernelName: Languages;
  kernelNameFromUrl: string | undefined;
  instanceCount: number;
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
  const byLanguage = useAtomValue(kernelInstancesByLanguageAtom);
  const setContextMenuData = useSetAtom(contextMenuDataAtom);

  const hasRunningInstances =
    instanceCount > 0 ||
    (byLanguage[kernelName as LanguagesWithKernels]?.length ?? 0) > 0;

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
          x: e.clientX,
          y: e.clientY,
          isShowing: true,
          targetId: null,
          items: hasRunningInstances
            ? [
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
              ]
            : [],
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
    </button>
  );
}
