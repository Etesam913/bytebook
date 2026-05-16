import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  TableOfContentsPlugin as LexicalTableOfContentsPlugin,
  type TableOfContentsEntry,
} from '@lexical/react/LexicalTableOfContentsPlugin';
import { ListBox, ListBoxItem } from 'react-aria-components/ListBox';
import { cn } from '../../../utils/string-formatting';

function getPadding(level: string) {
  switch (level) {
    case '1':
      return 'pl-1';
    case '2':
      return 'pl-5';
    case '3':
      return 'pl-9';
    case '4':
      return 'pl-[3.25rem]';
    case '5':
      return 'pl-[4.25rem]';
    case '6':
      return 'pl-[5.25rem]';
    default:
      return 'pl-0';
  }
}

function TableOfContentsElement({
  content,
}: {
  content: TableOfContentsEntry[];
}) {
  const [editor] = useLexicalComposerContext();

  return (
    <section className="border border-zinc-200 dark:border-zinc-600 rounded-md px-3 pb-2 pt-1 mb-3 text-base/10">
      <h3>Table of Contents</h3>
      {content.length > 0 ? (
        <ListBox
          aria-label="Table of contents"
          selectionMode="none"
          onAction={(key) => {
            editor.read(() => {
              const element = editor.getElementByKey(String(key));
              if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
              }
            });
          }}
          className="outline-none"
        >
          {content.map(([key, title, tag]) => {
            const level = tag[tag.length - 1];
            return (
              <ListBoxItem
                id={key}
                key={key}
                textValue={title}
                className={cn(
                  getPadding(level),
                  'toc-list-item flex app-link text-left outline-none rounded-sm data-[focus-visible]:ring-2 data-[focus-visible]:ring-(--accent-color) cursor-pointer'
                )}
              >
                {title}
              </ListBoxItem>
            );
          })}
        </ListBox>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          No headings found. Add headings to your document to generate a table
          of contents.
        </p>
      )}
    </section>
  );
}

export function TableOfContentsPlugin() {
  return (
    <LexicalTableOfContentsPlugin>
      {(tableOfContentsArray) => {
        return (
          <TableOfContentsElement
            content={tableOfContentsArray.filter(
              ([, title]) => title.trim().length > 0
            )}
          />
        );
      }}
    </LexicalTableOfContentsPlugin>
  );
}
