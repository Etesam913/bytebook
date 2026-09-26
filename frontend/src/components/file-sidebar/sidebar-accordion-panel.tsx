import { AccordionButton } from '@components/accordion/accordion-button';
import type { SidebarReorderOptions } from '@/types';
import {
  type ComponentProps,
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
} from 'react';
import { animate, Reorder, useDragControls } from 'motion/react';
import { cn } from '@utils/string-formatting';
import { easingFunctions } from '@/animations';
import type { SidebarFlexWeights, SidebarPanelKey } from '@/atoms';
import { PanelResizeHandle } from './panel-resize-handle';
import type { FlexWeightMVs } from './index';

export function SidebarAccordionPanel({
  isOpen,
  panelKey,
  containerRef,
  trigger,
  children,
  flexWeightMVs,
  storedWeightsRef,
  reorderOptions,
}: {
  isOpen: boolean;
  panelKey: SidebarPanelKey;
  containerRef: RefObject<HTMLElement | null>;
  trigger: Pick<
    ComponentProps<typeof AccordionButton>,
    'icon' | 'title' | 'onPress'
  > & {
    'data-testid'?: string;
  };
  reorderOptions: SidebarReorderOptions;
  children: ReactNode;
  flexWeightMVs: FlexWeightMVs;
  storedWeightsRef: RefObject<SidebarFlexWeights>;
}) {
  const didDragRef = useRef(false);
  const dragControls = useDragControls();
  const flexGrowMV = flexWeightMVs[panelKey];

  useEffect(() => {
    const target = isOpen ? storedWeightsRef.current[panelKey] : 0;
    animate(flexGrowMV, target, {
      ease: easingFunctions['ease-out-cubic'],
    });
  }, [isOpen, panelKey, flexGrowMV, storedWeightsRef]);

  return (
    <Reorder.Item
      as="section"
      value={panelKey}
      dragListener={false}
      dragControls={dragControls}
      // Flex-weight animations change panel sizes outside React. Bump this before
      // dragging so reorder bounds reflect current heights, including closed panels.
      layoutDependency={reorderOptions.layoutVersion}
      onDragStart={() => {
        didDragRef.current = true;
      }}
      onDragEnd={reorderOptions.onReorderEnd}
      data-sidebar-panel={panelKey}
      className={cn(
        'relative flex flex-col min-w-0 overflow-hidden text-sm',
        isOpen ? 'min-h-0' : ''
      )}
      style={{
        flexGrow: flexGrowMV,
        flexShrink: isOpen ? 1 : 0,
        flexBasis: 'auto',
      }}
    >
      <PanelResizeHandle
        panelKey={panelKey}
        visibleOrder={reorderOptions.visibleOrder}
        containerRef={containerRef}
        flexWeightMVs={flexWeightMVs}
        storedWeightsRef={storedWeightsRef}
      />
      <div className="[&>button]:gap-1.5 [&>button]:px-2.5 [&>button]:py-0.75 [&>button]:text-sm [&>button]:leading-snug">
        <AccordionButton
          {...trigger}
          isOpen={isOpen}
          className="touch-none cursor-grab active:cursor-grabbing"
          onPointerDown={(event) => {
            didDragRef.current = false;
            if (!reorderOptions.isSaving && event.button === 0) {
              // Flex-weight animations and resizing can leave cached reorder
              // bounds stale. Measure every panel before the pointer starts moving.
              reorderOptions.onPrepareReorder();
              // Allow small pointer movements during a click before starting a drag.
              dragControls.start(event, { distanceThreshold: 6 });
            }
          }}
          onPress={() => {
            // Releasing a drag must not also toggle the accordion.
            if (!didDragRef.current) trigger.onPress();
          }}
          onKeyDown={(event) => {
            didDragRef.current = false;
            if (
              !event.altKey ||
              (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')
            )
              return;
            event.preventDefault();
            reorderOptions.onMovePanel(
              panelKey,
              event.key === 'ArrowUp' ? -1 : 1
            );
          }}
          aria-description="Drag to reorder, or press Alt and the up or down arrow key"
        />
      </div>
      {children && (
        <div className="flex flex-1 basis-0 min-h-0 min-w-0 flex-col overflow-hidden text-sm">
          {children}
        </div>
      )}
    </Reorder.Item>
  );
}
