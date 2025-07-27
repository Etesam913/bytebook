import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  TableOfContentsPlugin as LexicalTableOfContentsPlugin,
  type TableOfContentsEntry,
} from '@lexical/react/LexicalTableOfContentsPlugin';
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

  const contentElements = content.map(([key, title, tag]) => {
    const level = tag[tag.length - 1];
    return (
      <li className={cn(getPadding(level), 'toc-list-item flex')} key={key}>
        <button
          type="button"
          className="link text-left "
          onClick={() => {
            editor.read(() => {
              const element = editor.getElementByKey(key);
              if (element) {
                element.scrollIntoView({
                  behavior: 'smooth',
                });
              }
            });
          }}
        >
          {title}
        </button>
      </li>
    );
  });

  return (
    <section className="border border-zinc-200 dark:border-zinc-600 rounded-md px-3 pb-2 pt-1 mb-3 text-base/10">
      <h3>Table of Contents</h3>
      {contentElements.length > 0 ? (
        <ul>{contentElements}</ul>
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
