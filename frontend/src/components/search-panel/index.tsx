import { useAtom } from 'jotai';
import { searchPanelDataAtom } from '../../atoms';
import { Shade } from '../dialog/shade';
import { SearchPanelForm } from './search-panel-form';

export function SearchPanel() {
  const [searchPanelData, setSearchPanelData] = useAtom(searchPanelDataAtom);

  return (
    <>
      {searchPanelData.isOpen && (
        <>
          <Shade
            onClick={() =>
              setSearchPanelData((prev) => ({ ...prev, isOpen: false }))
            }
            className="bg-transparent"
          />
          <SearchPanelForm />
        </>
      )}
    </>
  );
}
