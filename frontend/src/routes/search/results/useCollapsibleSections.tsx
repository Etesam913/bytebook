import { useState } from 'react';

export function useCollapsibleSections(defaultOpen: Record<string, boolean>) {
  const [openSections, setOpenSections] = useState(defaultOpen);

  function toggleSection(section: string) {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }
  return { openSections, toggleSection };
}
