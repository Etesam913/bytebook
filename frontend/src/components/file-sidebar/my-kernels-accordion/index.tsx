import { useAtom, useAtomValue } from 'jotai';
import type { RefObject } from 'react';
import { useRoute } from 'wouter';
import { VirtualizedListAccordion } from '../../virtualized/virtualized-list/accordion';
import { AccordionButton } from '../../accordion/accordion-button';
import { isValidKernelLanguage, languagesWithKernelsSet } from '../../../types';
import {
  routeUrls,
  type KernelWithFilesRouteParams,
} from '../../../utils/routes';
import { KernelAccordionButton } from './kernel-accordion-button';
import {
  fileSidebarOpenStateAtom,
  kernelInstancesByLanguageAtom,
} from '../../../atoms';
import { SquareTerminal } from '../../../icons/square-terminal';
import { PythonLogo } from '../../../icons/python-logo';
import { GolangLogo } from '../../../icons/golang-logo';
import { JavascriptLogo } from '../../../icons/javascript-logo';
import { JavaLogo } from '../../../icons/java-logo';
import { Languages, LanguagesWithKernels } from '../../../types';
import { SidebarAccordionPanel } from '../sidebar-accordion-panel';
import type { SidebarFlexWeights } from '../../../atoms';
import type { FlexWeightMVs } from '../index';

export function getKernelIcon(kernel: Languages, size: string = '1.125rem') {
  const className = 'will-change-transform';
  switch (kernel) {
    case 'python':
      return <PythonLogo height={size} width={size} className={className} />;
    case 'go':
      return <GolangLogo height={size} width={size} className={className} />;
    case 'javascript':
      return (
        <JavascriptLogo height={size} width={size} className={className} />
      );
    case 'java':
      return <JavaLogo height={size} width={size} className={className} />;
    case 'text': {
      const smallerSize = `calc(${size} - 0.125rem)`;
      return (
        <SquareTerminal
          height={smallerSize}
          width={smallerSize}
          className={className}
        />
      );
    }
  }
}

export function MyKernelsAccordion({
  containerRef,
  flexWeightMVs,
  storedWeightsRef,
}: {
  containerRef: RefObject<HTMLElement | null>;
  flexWeightMVs: FlexWeightMVs;
  storedWeightsRef: RefObject<SidebarFlexWeights>;
}) {
  const [openState, setOpenState] = useAtom(fileSidebarOpenStateAtom);
  const isOpen = openState.kernels;
  const [, params] = useRoute<KernelWithFilesRouteParams>(
    routeUrls.patterns.KERNELS_WITH_FILES
  );
  const kernelNameFromUrl = params?.kernelName;
  const byLanguage = useAtomValue(kernelInstancesByLanguageAtom);

  return (
    <SidebarAccordionPanel
      isOpen={isOpen}
      panelKey="kernels"
      containerRef={containerRef}
      flexWeightMVs={flexWeightMVs}
      storedWeightsRef={storedWeightsRef}
      trigger={
        <AccordionButton
          data-testid="kernels-accordion"
          isOpen={isOpen}
          onClick={() =>
            setOpenState((prev) => ({
              ...prev,
              kernels: !prev.kernels,
            }))
          }
          icon={
            <SquareTerminal
              width="1.25rem"
              height="1.25rem"
              className="will-change-transform"
            />
          }
          title={'Kernels'}
        />
      }
    >
      <VirtualizedListAccordion<Languages>
        layoutId="kernels-sidebar"
        emptyElement={null}
        contentType="kernel"
        dataItemToString={(kernelName) => kernelName}
        dataItemToKey={(kernelName) => kernelName}
        selectionOptions={{
          dataItemToSelectionRangeEntry: (kernelName) => kernelName,
        }}
        isItemActive={(kernelName) => kernelName === kernelNameFromUrl}
        renderItem={({ dataItem: kernelName }) => {
          if (!isValidKernelLanguage(kernelName)) {
            return <></>;
          }
          return (
            <KernelAccordionButton
              kernelName={kernelName}
              kernelNameFromUrl={kernelNameFromUrl}
              instanceCount={
                byLanguage[kernelName as LanguagesWithKernels]?.length ?? 0
              }
            />
          );
        }}
        data={[...languagesWithKernelsSet]}
      />
    </SidebarAccordionPanel>
  );
}
