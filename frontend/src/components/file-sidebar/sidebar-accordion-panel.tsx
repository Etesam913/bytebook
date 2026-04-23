import { type ReactNode, type RefObject, useEffect } from 'react';
import { animate, motion } from 'motion/react';
import { cn } from '../../utils/string-formatting';
import { easingFunctions } from '../../animations';
import type { SidebarFlexWeights, SidebarPanelKey } from '../../atoms';
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
}: {
  isOpen: boolean;
  panelKey: SidebarPanelKey;
  containerRef: RefObject<HTMLElement | null>;
  trigger: ReactNode;
  children: ReactNode;
  flexWeightMVs: FlexWeightMVs;
  storedWeightsRef: RefObject<SidebarFlexWeights>;
}) {
  const flexGrowMV = flexWeightMVs[panelKey];

  useEffect(() => {
    const target = isOpen ? storedWeightsRef.current[panelKey] : 0;
    animate(flexGrowMV, target, {
      ease: easingFunctions['ease-out-cubic'],
    });
  }, [isOpen, panelKey, flexGrowMV, storedWeightsRef]);

  return (
    <motion.section
      className={cn(
        'flex flex-col min-w-0 overflow-hidden text-sm',
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
        containerRef={containerRef}
        flexWeightMVs={flexWeightMVs}
        storedWeightsRef={storedWeightsRef}
      />
      <div className="[&>button]:gap-1.5 [&>button]:px-2.5 [&>button]:py-0.75 [&>button]:text-sm [&>button]:leading-snug">
        {trigger}
      </div>
      {children && (
        <div className="flex flex-1 basis-0 min-h-0 min-w-0 flex-col overflow-hidden text-sm">
          {children}
        </div>
      )}
    </motion.section>
  );
}
