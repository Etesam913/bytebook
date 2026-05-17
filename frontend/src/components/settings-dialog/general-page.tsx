import { FontFamilyRow } from './appearance/font-family-row';
import { SidebarSectionsRow } from './appearance/sidebar-sections-row';
import { ThemeRow } from './appearance/theme-row';

export function GeneralPage() {
  return (
    <>
      <ThemeRow isFirst />
      <FontFamilyRow setting="ui" />
      <SidebarSectionsRow />
    </>
  );
}
