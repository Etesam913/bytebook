import { SettingsButton } from '../buttons/settings';

export function BottomItems() {
  return (
    <section className="pt-1.5 pb-2.5 flex flex-col gap-1 pl-2 pr-1 border-t border-zinc-200 dark:border-zinc-700">
      <SettingsButton />
    </section>
  );
}
