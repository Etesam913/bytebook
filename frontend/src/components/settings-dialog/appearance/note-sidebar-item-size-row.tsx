import { useAtomValue } from 'jotai/react';
import { useLocation } from 'wouter';
import { navigate } from 'wouter/use-browser-location';
import { isDarkModeOnAtom, projectSettingsAtom } from '../../../atoms';
import { useUpdateProjectSettingsMutation } from '../../../hooks/project-settings';
import { useSearchParamsEntries } from '../../../utils/routing';
import { SettingsRow } from '../settings-row';
import { SettingImage } from '.';
import cardSidebarItemDark from '../../../assets/images/card-sidebar-item-dark-mode.webp';
import cardSidebarItemLight from '../../../assets/images/card-sidebar-item-light-mode.webp';
import listSidebarItemDark from '../../../assets/images/list-sidebar-item-dark-mode.webp';
import listSidebarItemLight from '../../../assets/images/list-sidebar-item-light-mode.webp';
import { routeUrls } from '../../../utils/routes';

export function NoteSidebarItemSizeRow() {
  const { mutate: updateProjectSettings } = useUpdateProjectSettingsMutation();
  const projectSettings = useAtomValue(projectSettingsAtom);
  const [location] = useLocation();
  const searchParams: { ext?: string } = useSearchParamsEntries();
  const isDarkModeOn = useAtomValue(isDarkModeOnAtom);

  return (
    <SettingsRow
      title="Note Sidebar Item Type"
      description="Change the note sidebar item size type"
    >
      <div className="flex gap-3 items-start">
        <SettingImage
          isActive={projectSettings.appearance.noteSidebarItemSize === 'card'}
          onClick={() => {
            navigate(routeUrls.noteWithFocus(location, searchParams.ext || ''));
            updateProjectSettings({
              newProjectSettings: {
                ...projectSettings,
                appearance: {
                  ...projectSettings.appearance,
                  noteSidebarItemSize: 'card',
                },
              },
            });
          }}
          imgAlt="Card sidebar item type"
          imgSrc={isDarkModeOn ? cardSidebarItemDark : cardSidebarItemLight}
          label="Card"
        />

        <SettingImage
          isActive={projectSettings.appearance.noteSidebarItemSize === 'list'}
          onClick={() => {
            navigate(routeUrls.noteWithFocus(location, searchParams.ext || ''));
            updateProjectSettings({
              newProjectSettings: {
                ...projectSettings,
                appearance: {
                  ...projectSettings.appearance,
                  noteSidebarItemSize: 'list',
                },
              },
            });
          }}
          imgAlt="List sidebar item type"
          imgSrc={isDarkModeOn ? listSidebarItemDark : listSidebarItemLight}
          label="List"
        />
      </div>
    </SettingsRow>
  );
}
