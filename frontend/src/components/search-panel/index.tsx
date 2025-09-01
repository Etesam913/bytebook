import { useAtom } from 'jotai';
import { searchPanelDataAtom } from '../../atoms';
import { SearchPanelForm } from './search-panel-form';

export function SearchPanel() {
  const [searchPanelData, setSearchPanelData] = useAtom(searchPanelDataAtom);

  return <>{searchPanelData.isOpen && <SearchPanelForm />}</>;
}
