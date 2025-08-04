import { getDefaultButtonVariants } from '../../animations';
import { CircleArrowLeft } from '../../icons/circle-arrow-left';
import { MotionIconButton } from '../buttons';
import { Input } from '../input';
import { lastSearchQueryAtom } from '../../hooks/search';
import { useAtom } from 'jotai';

export function SearchPage() {
  const [lastSearchQuery, setLastSearchQuery] = useAtom(lastSearchQueryAtom);
  return (
    <section className="py-2.75 px-2 flex-1 h-screen text-base flex flex-col font-code">
      <div className="flex items-center gap-2 w-full pl-20 pr-2">
        <MotionIconButton
          {...getDefaultButtonVariants()}
          onClick={() => window.history.back()}
        >
          <CircleArrowLeft height={20} width={20} />
        </MotionIconButton>
        <Input
          inputProps={{
            placeholder: 'Search',
            className: 'w-full text-sm',
            autoCapitalize: 'off',
            autoComplete: 'off',
            autoCorrect: 'off',
            spellCheck: false,
            autoFocus: true,
            value: lastSearchQuery,
            onFocus: (e) => e.target.select(),
            onChange: (e) => setLastSearchQuery(e.target.value),
          }}
          labelProps={{}}
        />
      </div>
      <div className="w-full flex-1 flex justify-center items-center">
        <div className="text-sm">
          <h2 className="text-2xl py-3 text-center">Search examples</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li>
              Type <b>"The red tiger"</b> to search for files that contain the
              phrase "The red tiger"
            </li>
            <li>
              Use <b>f:apple</b> to search for files that start with apple
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}
