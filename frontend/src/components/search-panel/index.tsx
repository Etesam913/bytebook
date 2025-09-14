import { useAtomValue } from 'jotai';
import { searchPanelDataAtom } from '../../atoms';
import { SearchPanelForm } from './search-panel-form';

export function SearchPanel() {
  const searchPanelData = useAtomValue(searchPanelDataAtom);

  return <>{searchPanelData.isOpen && <SearchPanelForm />}</>;
}
