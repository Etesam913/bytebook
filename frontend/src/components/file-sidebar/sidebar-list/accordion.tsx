import { type ReactNode, useRef } from 'react';
import { SidebarList, type SidebarListProps } from './index';
import { useAutoScrollDuringDrag } from '@hooks/draggable';

export function SidebarListAccordion<T>({
  isLoading,
  loadingElement,
  isError,
  errorElement,
  data,
  emptyElement,
  ...props
}: SidebarListProps<T> & {
  emptyElement?: ReactNode;
  isLoading?: boolean;
  loadingElement?: ReactNode;
  isError?: boolean;
  errorElement?: ReactNode;
}) {
  const isEmpty = !data || data.length === 0;
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  useAutoScrollDuringDrag(scrollContainerRef, { threshold: 60, speed: 20 });

  return (
    <>
      {isError && errorElement}
      {!isError && isLoading && loadingElement}
      {!isError && !isLoading && isEmpty && <div>{emptyElement}</div>}
      {!isError && !isLoading && !isEmpty && (
        <div className="flex flex-1 flex-col min-h-0 overflow-hidden [scrollbar-width:none]">
          <SidebarList
            {...props}
            data={data}
            scrollContainerRef={scrollContainerRef}
          />
        </div>
      )}
    </>
  );
}
