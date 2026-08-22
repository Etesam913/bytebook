import {
  type MotionValue,
  motion,
  useMotionTemplate,
  useMotionValue,
} from 'motion/react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useRef } from 'react';
import { getDefaultButtonVariants } from '@/animations';
import {
  DEFAULT_SIDEBAR_FLEX_WEIGHTS,
  fileSidebarOpenStateAtom,
  isFileMaximizedAtom,
  isFullscreenAtom,
  MIN_FLEX_WEIGHT,
  projectSettingsAtom,
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
  const sidebarVisibility =
    useAtomValue(projectSettingsAtom).appearance.sidebarVisibility;
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
            'pr-2.5 flex gap-1 flex items-center justify-end w-full pl-[92px] h-[48px] mt-[4px]',
            isFullscreen && 'pl-[8px]'
          )}
        >
          <span>
            <Tooltip content="Go back">
              <MotionIconButton
                {...getDefaultButtonVariants()}
                onClick={() => window.history.back()}
                data-testid="go-back-button"
                aria-label="Go back"
              >
                <CircleArrowLeft width="1.125rem" height="1.125rem" />
              </MotionIconButton>
            </Tooltip>
            <Tooltip content="Go forward">
              <MotionIconButton
                {...getDefaultButtonVariants()}
                onClick={() => window.history.forward()}
                data-testid="go-forward-button"
                aria-label="Go forward"
              >
                <CircleArrowRight width="1.125rem" height="1.125rem" />
              </MotionIconButton>
            </Tooltip>
          </span>
        </header>
        <section
          ref={panelContainerRef}
          className="flex flex-1 flex-col min-h-0 pt-1.5 pb-1"
        >
          <MyFilesAccordion
            containerRef={panelContainerRef}
            flexWeightMVs={flexWeightMVs}
            storedWeightsRef={storedWeightsRef}
          />
          {!sidebarVisibility.hidePinned && (
            <PinnedAccordion
              containerRef={panelContainerRef}
              flexWeightMVs={flexWeightMVs}
              storedWeightsRef={storedWeightsRef}
            />
          )}
          {!sidebarVisibility.hideRecent && (
            <RecentAccordion
              containerRef={panelContainerRef}
              flexWeightMVs={flexWeightMVs}
              storedWeightsRef={storedWeightsRef}
            />
          )}
          {!sidebarVisibility.hideKernels && (
            <MyKernelsAccordion
              containerRef={panelContainerRef}
              flexWeightMVs={flexWeightMVs}
              storedWeightsRef={storedWeightsRef}
            />
          )}
          {!sidebarVisibility.hideTags && (
            <MyTagsAccordion
              containerRef={panelContainerRef}
              flexWeightMVs={flexWeightMVs}
              storedWeightsRef={storedWeightsRef}
            />
          )}
          {!sidebarVisibility.hideSavedSearches && (
            <MySavedSearchesAccordion
              containerRef={panelContainerRef}
              flexWeightMVs={flexWeightMVs}
              storedWeightsRef={storedWeightsRef}
            />
          )}
        </section>
        <BottomItems />
      </motion.aside>
      <Spacer width={width} />
    </>
  );
}
