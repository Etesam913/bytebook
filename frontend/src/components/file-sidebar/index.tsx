import { useUpdateProjectSettingsMutation } from '@hooks/project-settings';
import {
  getVisibleSidebarOrder,
  mergeSidebarOrder,
} from '@utils/sidebar-panels';

import {
  type MotionValue,
  Reorder,
  motion,
  useMotionTemplate,
  useMotionValue,
} from 'motion/react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useRef, useState } from 'react';
import { getDefaultButtonVariants } from '@/animations';
import {
  DEFAULT_SIDEBAR_FLEX_WEIGHTS,
  fileSidebarOpenStateAtom,
  isFileMaximizedAtom,
  isFullscreenAtom,
  MIN_FLEX_WEIGHT,
  projectSettingsAtom,
  projectSettingsLoadedAtom,
  SIDEBAR_PANEL_KEYS,
  type SidebarFlexWeights,
  type SidebarPanelKey,
} from '@/atoms';
import { MotionIconButton } from '@components/buttons/index';
import { BottomItems } from './bottom-items.tsx';
import { MyFilesAccordion } from './my-files-accordion/index.tsx';
import { MyTagsAccordion } from './my-tags-accordion/index.tsx';
import { PinnedAccordion } from './pinned-accordion.tsx';
import { RecentAccordion } from './recent-accordion.tsx';
import { Spacer } from './spacer.tsx';
import { CircleArrowLeft } from '@/icons/circle-arrow-left';
import { CircleArrowRight } from '@/icons/circle-arrow-right';
import { MyKernelsAccordion } from './my-kernels-accordion/index.tsx';
import { MySavedSearchesAccordion } from './my-saved-searches-accordion/index.tsx';
import { Tooltip } from '@components/tooltip/index';
import { cn } from '@utils/string-formatting';
import { useWailsEvent } from '@hooks/events';
import { isEventInCurrentWindow, SIDEBAR_FILES_OPEN } from '@utils/events';

const SIDEBAR_ACCORDIONS = {
  files: MyFilesAccordion,
  pinned: PinnedAccordion,
  recent: RecentAccordion,
  kernels: MyKernelsAccordion,
  tags: MyTagsAccordion,
  savedSearches: MySavedSearchesAccordion,
};

export type FlexWeightMVs = Record<SidebarPanelKey, MotionValue<number>>;

function loadStoredWeights(): SidebarFlexWeights {
  try {
    const raw = localStorage.getItem('sidebarFlexWeights');
    if (!raw) return { ...DEFAULT_SIDEBAR_FLEX_WEIGHTS };
    const parsed = JSON.parse(raw) as Partial<SidebarFlexWeights>;
    const result = { ...DEFAULT_SIDEBAR_FLEX_WEIGHTS };
    for (const key of SIDEBAR_PANEL_KEYS) {
      const val = parsed[key];
      if (typeof val === 'number' && val >= MIN_FLEX_WEIGHT) {
        result[key] = val;
      }
    }
    return result;
  } catch {
    return { ...DEFAULT_SIDEBAR_FLEX_WEIGHTS };
  }
}

export function FileSidebar({ width }: { width: MotionValue<number> }) {
  const isFullscreen = useAtomValue(isFullscreenAtom);
  const panelContainerRef = useRef<HTMLElement | null>(null);
  const scaledWidth = useMotionTemplate`calc(${width}px * var(--ui-scale))`;

  const openState = useAtomValue(fileSidebarOpenStateAtom);
  const setOpenState = useSetAtom(fileSidebarOpenStateAtom);
  const setIsFileMaximized = useSetAtom(isFileMaximizedAtom);
  const projectSettings = useAtomValue(projectSettingsAtom);
  const setProjectSettings = useSetAtom(projectSettingsAtom);
  const { mutate: updateSettings, isPending } =
    useUpdateProjectSettingsMutation();
  const settingsLoaded = useAtomValue(projectSettingsLoadedAtom);
  const isSaving = isPending || !settingsLoaded;
  const [draftOrder, setDraftOrder] = useState<SidebarPanelKey[] | null>(null);
  const draftOrderRef = useRef<SidebarPanelKey[] | null>(null);
  const order = draftOrder ?? projectSettings.appearance.sidebarOrder;
  // Mount panels in their saved positions instead of animating from the default order.
  const visibleOrder = settingsLoaded
    ? getVisibleSidebarOrder(
        order,
        projectSettings.appearance.sidebarVisibility
      )
    : [];

  // Preview the move locally; the ref keeps the latest order available when dragging ends.
  function reorder(nextVisibleOrder: SidebarPanelKey[]) {
    const nextOrder = mergeSidebarOrder(order, nextVisibleOrder);
    draftOrderRef.current = nextOrder;
    setDraftOrder(nextOrder);
  }

  // Save once per completed move, then clear the preview to show confirmed settings.
  function finishDrag() {
    const sidebarOrder = draftOrderRef.current;
    if (!sidebarOrder || isSaving) return;
    updateSettings(
      {
        newProjectSettings: {
          ...projectSettings,
          appearance: { ...projectSettings.appearance, sidebarOrder },
        },
      },
      {
        onSuccess: () =>
          setProjectSettings((previous) => ({
            ...previous,
            appearance: { ...previous.appearance, sidebarOrder },
          })),
        onSettled: () => {
          draftOrderRef.current = null;
          setDraftOrder(null);
        },
      }
    );
  }

  // Keyboard moves swap visible neighbors and use the same save path as dragging.
  function movePanel(key: SidebarPanelKey, direction: number) {
    if (isSaving) return;
    const index = visibleOrder.indexOf(key);
    const target = index + direction;
    if (target < 0 || target >= visibleOrder.length) return;
    const next = [...visibleOrder];
    [next[index], next[target]] = [next[target], next[index]];
    reorder(next);
    finishDrag();
  }

  const storedWeightsRef = useRef<SidebarFlexWeights>(loadStoredWeights());
  const sw = storedWeightsRef.current;

  const flexWeightMVs: FlexWeightMVs = {
    files: useMotionValue(openState.files ? sw.files : 0),
    pinned: useMotionValue(openState.pinned ? sw.pinned : 0),
    recent: useMotionValue(openState.recent ? sw.recent : 0),
    kernels: useMotionValue(openState.kernels ? sw.kernels : 0),
    tags: useMotionValue(openState.tags ? sw.tags : 0),
    savedSearches: useMotionValue(
      openState.savedSearches ? sw.savedSearches : 0
    ),
  };

  useWailsEvent(SIDEBAR_FILES_OPEN, (data) => {
    void (async () => {
      if (!(await isEventInCurrentWindow(data))) return;
      setIsFileMaximized(false);
      setOpenState((prev) => ({ ...prev, files: true }));
    })();
  });

  return (
    <>
      <motion.aside
        aria-label="File navigation sidebar"
        style={{ width: scaledWidth }}
        className="text-md flex h-full flex-col shrink-0"
        data-testid="file-sidebar"
      >
        <header
          className={cn(
            'pr-2.5 flex gap-1 items-center justify-end w-full pl-[92px] h-(--app-header-height) shrink-0',
            isFullscreen && 'pl-[8px]'
          )}
        >
          <span>
            <Tooltip content="Go back" shortcut="⌘[">
              <MotionIconButton
                {...getDefaultButtonVariants()}
                onPress={() => window.history.back()}
                data-testid="go-back-button"
                aria-label="Go back"
              >
                <CircleArrowLeft width="1.125rem" height="1.125rem" />
              </MotionIconButton>
            </Tooltip>
            <Tooltip content="Go forward" shortcut="⌘]">
              <MotionIconButton
                {...getDefaultButtonVariants()}
                onPress={() => window.history.forward()}
                data-testid="go-forward-button"
                aria-label="Go forward"
              >
                <CircleArrowRight width="1.125rem" height="1.125rem" />
              </MotionIconButton>
            </Tooltip>
          </span>
        </header>
        <Reorder.Group
          as="section"
          axis="y"
          values={visibleOrder}
          onReorder={reorder}
          ref={panelContainerRef}
          className="flex flex-1 flex-col min-h-0 pb-1"
        >
          {visibleOrder.map((key) => {
            const Accordion = SIDEBAR_ACCORDIONS[key];
            return (
              <Accordion
                key={key}
                reorderOptions={{
                  visibleOrder,
                  isSaving,
                  onReorderEnd: finishDrag,
                  onMovePanel: movePanel,
                }}
                containerRef={panelContainerRef}
                flexWeightMVs={flexWeightMVs}
                storedWeightsRef={storedWeightsRef}
              />
            );
          })}
        </Reorder.Group>
        <BottomItems />
      </motion.aside>
      <Spacer width={width} />
    </>
  );
}
