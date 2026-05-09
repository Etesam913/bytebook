import { FontFamilyRow } from './appearance/font-family-row';
import { ThemeRow } from './appearance/theme-row';

export function GeneralPage() {
  return (
    <>
      <ThemeRow isFirst />
      <FontFamilyRow setting="ui" />
    </>
  );
}
