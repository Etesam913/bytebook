import { Input } from '../../components/input';

export function EditTagDialogChildren() {
  return (
    <fieldset className="text-sm flex flex-col gap-2">
      <p>Select tags to add or remove from the selected notes</p>
      <Input labelProps={{}} inputProps={{ className: 'w-full' }} />
    </fieldset>
  );
}
