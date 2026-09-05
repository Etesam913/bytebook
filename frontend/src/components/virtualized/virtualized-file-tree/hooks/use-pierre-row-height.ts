import { useEffect } from 'react';
import type { FileTree } from '@pierre/trees';

export function usePierreRowHeight(model: FileTree) {
  useEffect(() => {
    const root = document.documentElement;
    const updateHeight = () => {
      const scale = Number(
        getComputedStyle(root).getPropertyValue('--ui-scale')
      );
      // Update the virtualizer as well as CSS so scrolling and sticky rows agree.
      model.setItemHeight(30 * scale);
    };
    updateHeight();
    const observer = new MutationObserver(updateHeight);
    observer.observe(root, { attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, [model]);
}
